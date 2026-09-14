// Backfill "fase 3" del multitema — chiamato a comando (bottone "Verifica temi secondari"
// nel tab Archivio admin, accanto a "Verifica duplicati"), MAI automaticamente: propone,
// per i video con un solo tema reale (esclusi quelli già a 2 temi e quelli con tema
// "Altro", mutuamente esclusivo per decisione presa — vedi [[project_multi_tema]]), un
// possibile SECONDO tema quando la sinossi ne dà un indizio testuale forte. Filtro
// volutamente severo: nel dubbio non propone (l'utente ha segnalato il rischio di falsi
// positivi tipo "video sull'azzardo che nomina uno smartphone" letto come "anche
// Digitale"). L'admin conferma o scarta ogni candidato uno per uno — nessuna scrittura
// automatica nel DB, stesso principio di api/find-duplicate-videos.js.

import { list } from '@vercel/blob';
import { CACHE_PREFIX } from './rebuild-catalog-cache.js';

// Compito più pesante di find-duplicate-videos.js: lì il modello cerca relazioni tra righe,
// qui deve valutare OGNI video singolarmente contro 6 temi possibili. Un giro unico su
// tutti i ~456 candidati, testato dal vivo, ha impiegato 154-264s con l'API chiamata
// direttamente — ma end-to-end attraverso vercel dev (browser → funzione → Anthropic →
// browser) ha superato i 300s ed è arrivato in "HeadersTimeoutError" (un timeout del
// client HTTP, non del nostro AbortController — arriva come testo non-JSON, il fetch lato
// client lo mostra come "Unexpected token"). Anziché rincorrere un tetto sempre più alto,
// il catalogo pre-filtrato viene diviso in CHUNK di CHUNK_SIZE video: il chiamante (vedi
// handleFindSecondaryTemi in src/App.jsx) itera le chiamate in sequenza, una per chunk,
// così ogni singola richiesta resta ben sotto qualunque timeout pratico.
export const config = { maxDuration: 150 };

const CHUNK_SIZE = 120;
const MAX_CANDIDATES_PER_CHUNK = 40;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const TEMI_REALI = ['Alcool', 'Azzardo', 'Digitale', 'Sostanze', 'Tabacco', 'Sessualità'];

// Stessa logica di api/semantic-search.js e api/find-duplicate-videos.js — duplicata qui
// per coerenza con lo stile già presente nel progetto (piccola duplicazione preferita a un
// refactor cross-file, vedi commento in find-duplicate-videos.js).
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

  const fullCatalog = await loadCatalogCache();
  if (!fullCatalog) {
    return res.status(503).json({ error: 'Catalogo non ancora disponibile.' });
  }

  // Pre-filtro lato server: passiamo all'AI SOLO i video con esattamente un tema reale
  // (esclusi "Altro" e quelli già a 2+ temi) — riduce i token e impedisce all'AI di
  // proporre candidati fuori scope.
  const candidateLines = fullCatalog.split('\n').filter(line => {
    const parts = line.split('|');
    if (parts.length < 5) return false; // riga malformata, ignorata (difensivo)
    const temi = (parts[1] || '').split(',').filter(Boolean);
    return temi.length === 1 && TEMI_REALI.includes(temi[0]);
  });
  if (!candidateLines.length) return res.status(200).json({ candidates: [], totalChunks: 0, chunkIndex: 0 });

  // Un solo chunk per richiesta (vedi commento sopra) — il chiamante itera chunkIndex da 0
  // a totalChunks-1. totalChunks è ricalcolato ad ogni chiamata dallo stesso identico
  // pre-filtro, quindi resta stabile per tutta la durata di una scansione (a meno che nel
  // frattempo un altro admin non confermi/modifichi temi — caso raro, non gestito).
  const totalChunks = Math.max(1, Math.ceil(candidateLines.length / CHUNK_SIZE));
  const chunkIndex = Number.isInteger(req.body?.chunkIndex) ? req.body.chunkIndex : 0;
  const chunkLines = candidateLines.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
  if (!chunkLines.length) return res.status(200).json({ candidates: [], totalChunks, chunkIndex });

  // currentTemaById costruita SOLO dal chunk inviato al modello in QUESTA richiesta — un id
  // proposto per un video fuori da questo chunk (mai visto dal modello in questa chiamata)
  // viene scartato in validazione più sotto, non solo quelli fuori scope generale.
  const currentTemaById = new Map();
  chunkLines.forEach(line => {
    const parts = line.split('|');
    currentTemaById.set(parts[0], (parts[1] || '').split(',')[0]);
  });
  const catalog = chunkLines.join('\n');

  const systemText = `Sei un revisore che individua SECONDI TEMI plausibili in un archivio video educativo (ADAM) su dipendenze e comportamenti a rischio, usato da educatori sociali.

Di seguito il catalogo dei video candidati (ognuno ha oggi UN SOLO tema assegnato), uno per riga, nel formato:
ID|temaAttuale|natura|titolo|sinossi

${catalog}

I temi possibili sono: ${TEMI_REALI.join(', ')}.

Per ciascun video, leggi il SIGNIFICATO REALE della sinossi e valuta se tratta DAVVERO ANCHE un secondo tema, diverso da quello già assegnato — non solo lo nomina di passaggio o come dettaglio secondario. Esempio di caso da NON segnalare: un video sull'azzardo online che menziona uno smartphone solo come oggetto di scena non tratta "anche Digitale" — il tema digitale dovrebbe essere centrale nel contenuto (es. dipendenza da app/social/gioco online), non un dettaglio incidentale.

REGOLA CHIAVE: nel dubbio, NON segnalare. È molto meglio restituire pochi candidati solidi che molti deboli — questa lista verrà rivista uno per uno da un admin umano, quindi la precisione conta più della copertura.

Restituisci SOLO un array JSON (nessun testo prima o dopo, nessun markdown), ogni elemento con questa forma:
{"id": "ID", "temaSuggerito": "NomeTema", "motivo": "breve spiegazione in italiano, una frase, cita l'indizio testuale concreto nella sinossi"}
Massimo ${MAX_CANDIDATES_PER_CHUNK} candidati. Se nessun video ha un secondo tema con indizio forte, restituisci un array vuoto [].`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 140000);

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
        // Più alto che in find-duplicate-videos.js: qui il modello valuta ogni video
        // singolarmente (non solo relazioni tra righe), il thinking adattivo misurato dal
        // vivo arriva a 12-13k token — con un tetto più stretto rischia di esaurire tutto
        // il budget pensando e troncare l'output JSON finale (verificato: "Risposta non
        // interpretabile" al primo giro con max_tokens 16000).
        max_tokens: 32000,
        system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: 'Analizza il catalogo e restituisci i candidati come da istruzioni.' }],
      }),
      signal: controller.signal,
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      return res.status(502).json({ error: `Errore Claude: ${err.error?.message || anthropicRes.status}` });
    }

    const result = await anthropicRes.json();
    // Sonnet 5 ha il thinking adattivo attivo di default: il primo blocco di content è
    // spesso un blocco "thinking", non il testo — va cercato esplicitamente il blocco
    // type:"text" (vedi find-duplicate-videos.js).
    const textBlock = result.content?.find(b => b.type === 'text');
    // Il modello a volte avvolge l'array in un fence markdown (```json ... ```) nonostante
    // l'istruzione di non farlo — rimosso prima di cercare l'array, non solo confidato al
    // regex greedy sotto (che altrimenti includerebbe i backtick nel match).
    const text = (textBlock?.text || '').replace(/```[a-z]*\n?/gi, '').trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(502).json({ error: 'Risposta non interpretabile.' });

    let parsed;
    try { parsed = JSON.parse(match[0]); } catch { return res.status(502).json({ error: 'JSON non valido.' }); }
    if (!Array.isArray(parsed)) return res.status(502).json({ error: 'Formato risposta inatteso.' });

    // Validazione stretta: id deve essere tra i candidati pre-filtrati, temaSuggerito deve
    // essere un tema reale diverso da quello attuale — scarta silenziosamente tutto il
    // resto (allucinazioni, id fuori scope, tema uguale a quello già presente).
    const candidates = parsed
      .filter(c => c && typeof c.id === 'string' && ID_RE.test(c.id) && currentTemaById.has(c.id))
      .map(c => ({
        id: c.id,
        temaAttuale: currentTemaById.get(c.id),
        temaSuggerito: typeof c.temaSuggerito === 'string' ? c.temaSuggerito : '',
        motivo: typeof c.motivo === 'string' ? c.motivo.slice(0, 300) : '',
      }))
      .filter(c => TEMI_REALI.includes(c.temaSuggerito) && c.temaSuggerito !== c.temaAttuale)
      .slice(0, MAX_CANDIDATES_PER_CHUNK);

    return res.status(200).json({ candidates, totalChunks, chunkIndex, usage: result.usage || null });
  } catch (e) {
    const timedOut = e.name === 'AbortError';
    return res.status(timedOut ? 504 : 500).json({ error: timedOut ? 'Timeout nella richiesta a Claude.' : (e.message || 'Errore interno.') });
  } finally {
    clearTimeout(timeout);
  }
}
