// Scan "livello 2" duplicati — chiamato a comando (bottone "Verifica duplicati" nel tab
// Archivio admin), MAI automaticamente: passa l'intero catalogo a Claude e chiede di
// individuare gruppi di video che sembrano lo stesso contenuto (stesso spot ricaricato con
// un URL diverso, stesso video con titolo/codice diversi — il caso che il livello 1, il
// confronto esatto sull'ID del link, non può catturare). Uso occasionale per un giro di
// pulizia dell'archivio, non un controllo per-submission: vedi [[project_apify_integration]]
// per il ragionamento sui costi che ha portato a tenerlo separato e manuale.
//
// Giudizio euristico su testo (titolo+sinossi+tema+natura), non un confronto audio/video —
// va trattato come lista di candidati da controllare a occhio, mai come base per
// cancellazioni automatiche.

import { list } from '@vercel/blob';
import { CACHE_PREFIX } from './rebuild-catalog-cache.js';

// Il thinking adattivo di Sonnet 5 su un catalogo di ~184k token misurati reali (non i
// ~106k stimati a naso) impiega realisticamente 90-110s end-to-end (verificato dal vivo,
// più run) — maxDuration e timeout tenuti larghi apposta, non è un endpoint chiamato spesso.
export const config = { maxDuration: 180 };

const MAX_GROUPS = 60;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

// Stessa logica di api/semantic-search.js — duplicata qui (non estratta in un modulo
// condiviso) per coerenza con lo stile già presente nel progetto, che preferisce una
// piccola duplicazione a un refactor cross-file (es. viaProxy in instagram-meta.js e
// apify-fetch.js).
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  const catalog = await loadCatalogCache();
  if (!catalog) {
    return res.status(503).json({ error: 'Catalogo non ancora disponibile.' });
  }

  const systemText = `Sei un revisore che cerca DUPLICATI in un archivio video educativo (ADAM) su dipendenze e comportamenti a rischio.

Di seguito il catalogo completo, uno per riga, nel formato:
ID|tema|natura|titolo|sinossi

${catalog}

Individua gruppi di 2 o più ID che sembrano rappresentare LO STESSO VIDEO — non semplicemente lo stesso argomento o tema, ma proprio lo stesso contenuto (es. lo stesso spot pubblicitario ricaricato due volte con titoli leggermente diversi, o lo stesso video con codice/titolo riscritti). Confrontati sul significato reale di titolo e sinossi, non sulle stesse parole.

NON segnalare due video solo perché trattano lo stesso tema/argomento in modo simile (es. due spot diversi sull'azzardo entrambi ambientati in un bar NON sono duplicati). Nel dubbio, non segnalare — meglio pochi falsi positivi che tanti.

Restituisci SOLO un array JSON (nessun testo prima o dopo, nessun markdown), ogni elemento con questa forma:
{"ids": ["ID1", "ID2"], "motivo": "breve spiegazione in italiano, una frase"}
Massimo ${MAX_GROUPS} gruppi. Se non trovi nessun duplicato plausibile restituisci un array vuoto [].`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 170000);

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        // Alto perché il thinking adattivo (attivo di default su Sonnet 5) consuma dal
        // budget di max_tokens PRIMA di scrivere l'output — con un tetto troppo basso il
        // modello esaurisce tutto pensando e non arriva mai a produrre il JSON (verificato
        // dal vivo: stop_reason "max_tokens" con content = solo un blocco thinking vuoto).
        max_tokens: 16000,
        system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: 'Analizza il catalogo e restituisci i gruppi di duplicati come da istruzioni.' }],
      }),
      signal: controller.signal,
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      return res.status(502).json({ error: `Errore Claude: ${err.error?.message || anthropicRes.status}` });
    }

    const result = await anthropicRes.json();
    // Sonnet 5 ha il thinking adattivo attivo di default (a differenza di Haiku 4.5, usato
    // in semantic-search.js): il primo blocco di content è spesso un blocco "thinking" (vuoto,
    // display "omitted" di default), non il testo — va cercato esplicitamente il blocco
    // type:"text", non assunto come il primo elemento (verificato dal vivo: senza questo,
    // "Risposta non interpretabile" ad ogni chiamata).
    const textBlock = result.content?.find(b => b.type === 'text');
    const text = textBlock?.text?.trim() || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(502).json({ error: 'Risposta non interpretabile.' });

    let parsed;
    try { parsed = JSON.parse(match[0]); } catch { return res.status(502).json({ error: 'JSON non valido.' }); }
    if (!Array.isArray(parsed)) return res.status(502).json({ error: 'Formato risposta inatteso.' });

    const groups = parsed
      .filter(g => g && Array.isArray(g.ids) && g.ids.length >= 2)
      .map(g => ({
        ids: g.ids.filter(id => typeof id === 'string' && ID_RE.test(id)),
        motivo: typeof g.motivo === 'string' ? g.motivo.slice(0, 300) : '',
      }))
      .filter(g => g.ids.length >= 2)
      .slice(0, MAX_GROUPS);

    return res.status(200).json({ groups, usage: result.usage || null });
  } catch (e) {
    const timedOut = e.name === 'AbortError';
    return res.status(timedOut ? 504 : 500).json({ error: timedOut ? 'Timeout nella richiesta a Claude.' : (e.message || 'Errore interno.') });
  } finally {
    clearTimeout(timeout);
  }
}
