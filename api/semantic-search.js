import { list } from '@vercel/blob';
import { CACHE_PREFIX } from './rebuild-catalog-cache.js';

export const config = { maxDuration: 25 };

const MAX_QUERY_LEN = 200;
const MAX_RESULT_IDS = 40;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

// Legge il pacchetto precalcolato da Vercel Blob (scritto da api/rebuild-catalog-cache.js)
// invece di costruire il catalogo ad ogni ricerca — è il "prepara una volta sola" richiesto:
// il testo di titolo+sinossi+tema+natura di tutti i video non viene mai ricostruito qui,
// solo letto.
//
// IMPORTANTE: gli URL pubblici di Vercel Blob passano da una CDN che ignora la query
// string ai fini della cache — un parametro "?v=timestamp" per invalidare non funziona,
// verificato dal vivo (la CDN ha continuato a servire il contenuto vecchio sullo stesso
// pathname anche con query diverse). Per questo ogni rigenerazione scrive un pathname
// NUOVO (vedi CACHE_PREFIX in rebuild-catalog-cache.js): qui si prende sempre il più
// recente via `list()`, che è garantito fresco perché nessuna CDN può averlo già in
// cache. Nessun blob trovato = cache non ancora esistente (primo avvio) o irraggiungibile
// — gestito sotto come cache mancante, non come crash.
async function loadCatalogCache() {
  try {
    const { blobs } = await list({ prefix: CACHE_PREFIX, limit: 20 });
    if (!blobs.length) return null;
    const latest = blobs.reduce((a, b) => (new Date(b.uploadedAt) > new Date(a.uploadedAt) ? b : a));
    const blobRes = await fetch(latest.url, { cache: 'no-store' });
    if (!blobRes.ok) return null;
    const text = await blobRes.text();
    return text.trim() ? text : null;
  } catch {
    return null;
  }
}

function filterCatalogByTemaNatura(catalogText, tema, natura) {
  if (!tema && !natura) return catalogText;
  return catalogText
    .split('\n')
    .filter(line => {
      const parts = line.split('|');
      const lineTema = parts[1] || '';
      const lineNatura = parts[2] || '';
      return (!tema || lineTema === tema) && (!natura || lineNatura === natura);
    })
    .join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  const { query, tema, natura } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query mancante.' });
  }
  const q = query.trim().slice(0, MAX_QUERY_LEN);

  // Cache non ancora esistente (primo avvio, prima di aver mai chiamato
  // api/rebuild-catalog-cache.js) o irraggiungibile: nessun crash, nessun errore visibile
  // all'utente — risposta pulita che il chiamante interpreta come "ricerca semantica non
  // disponibile" e ricade sul layer keyword+substring già attivo (vedi runSemanticSearch
  // in src/App.jsx).
  const fullCatalog = await loadCatalogCache();
  if (!fullCatalog) {
    return res.status(503).json({ error: 'Catalogo semantico non ancora disponibile.' });
  }

  const catalog = filterCatalogByTemaNatura(fullCatalog, tema || null, natura || null);
  if (!catalog) {
    // Il tema/natura richiesto non ha video nel pacchetto precalcolato: risultato
    // legittimamente vuoto, non un errore (evita anche una chiamata a Haiku inutile).
    return res.status(200).json({ ids: [] });
  }

  const systemText = `Sei un motore di ricerca semantica per ADAM, un archivio video educativo su dipendenze e comportamenti a rischio, usato da educatori sociali.

Di seguito il catalogo dei video candidati, uno per riga, nel formato:
ID|tema|natura|titolo|sinossi

${catalog}

Analizza la query dell'utente e leggi il SIGNIFICATO REALE di titolo e sinossi di ogni video — non limitarti a cercare le stesse parole della query: riconosci sinonimi, parafrasi e concetti equivalenti (es. "WC"/"gabinetto"/"water" sono lo stesso concetto; "adolescenti"/"ragazzi"/"minorenni" sono lo stesso concetto).

ATTENZIONE alla categoria/tipo di oggetto o prodotto, non solo al brand o al contesto generale: un marchio può produrre più categorie di dispositivi diverse (es. Samsung fa sia smartphone che visori VR) — se la query chiede una categoria specifica (es. "smartphone"), verifica che il video parli davvero di quella categoria e non di un prodotto diverso dello stesso marchio.

Restituisci SOLO un array JSON di ID dei video pertinenti alla query (nessun testo prima o dopo, nessun markdown), ordinati dal più al meno pertinente, massimo ${MAX_RESULT_IDS} elementi. Se nessun video è genuinamente pertinente restituisci un array vuoto [].`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: q }],
      }),
      signal: controller.signal,
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      return res.status(502).json({ error: `Errore Claude: ${err.error?.message || anthropicRes.status}` });
    }

    const result = await anthropicRes.json();
    const text = result.content?.[0]?.text?.trim() || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(502).json({ error: 'Risposta non interpretabile.' });

    let parsed;
    try { parsed = JSON.parse(match[0]); } catch { return res.status(502).json({ error: 'JSON non valido.' }); }
    if (!Array.isArray(parsed)) return res.status(502).json({ error: 'Formato risposta inatteso.' });

    const ids = parsed
      .filter(id => typeof id === 'string' && ID_RE.test(id))
      .slice(0, MAX_RESULT_IDS);

    return res.status(200).json({
      ids,
      usage: result.usage || null,
    });
  } catch (e) {
    const timedOut = e.name === 'AbortError';
    return res.status(timedOut ? 504 : 500).json({ error: timedOut ? 'Timeout nella richiesta a Claude.' : (e.message || 'Errore interno.') });
  } finally {
    clearTimeout(timeout);
  }
}
