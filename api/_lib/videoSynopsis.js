// Core condiviso ffmpeg+Groq+Claude per generare la sinossi di un video a partire da un
// file già presente su disco. Estratto da api/transcribe.js (MODO1) perché usato anche da
// api/generate-synopsis-tiktok.js (MODO3: Apify scarica il video, questo modulo lo elabora
// — nessuna dipendenza da yt-dlp o da una URL, esattamente come già fa processVideo sul
// NAS in nas-server/server.js). api/transcribe.js e nas-server/server.js NON sono stati
// toccati/refactorizzati: restano con la propria copia, per non introdurre rischio su
// codice già in produzione.
import { execSync } from 'child_process';
import { readFileSync, mkdirSync, readdirSync, rmSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import ffmpegPath from 'ffmpeg-static';

const N_FRAMES = 20;

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getVideoDuration(videoPath) {
  try {
    const out = execSync(`"${ffmpegPath}" -i "${videoPath}" 2>&1 || true`, { timeout: 10000 }).toString();
    const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  } catch {}
  return 120;
}

export async function extractSearchTerms(images) {
  if (!images.length || !process.env.ANTHROPIC_API_KEY) return [];
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        messages: [{ role: 'user', content: [
          ...images,
          { type: 'text', text: 'Guarda queste immagini. Elenca SOLO brand, nomi di campagne, slogan o organizzazioni visibili sullo schermo (es: "Manscaped, Send Face Pics Instead"). Se non ce ne sono, scrivi solo "nessuno".' },
        ]}],
      }),
    });
    if (!res.ok) return [];
    const text = (await res.json()).content[0].text.trim();
    if (/nessuno/i.test(text)) return [];
    return text.split(',').map(t => t.trim()).filter(t => t.length > 2).slice(0, 3);
  } catch { return []; }
}

export async function searchWeb(terms) {
  if (!terms.length || !process.env.SCRAPER_API_KEY) return '';
  const query = terms.join(' ');
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(`http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(ddgUrl)}`);
    if (!res.ok) return '';
    const html = await res.text();
    if (html.length < 2000) return '';
    const snippets = [];
    const rx = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = rx.exec(html)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
      if (text.length > 30) { snippets.push(text); if (snippets.length >= 3) break; }
    }
    return snippets.join(' ');
  } catch { return ''; }
}

/**
 * Genera la sinossi di un video già scaricato su disco (nessuna dipendenza da yt-dlp/URL).
 * @param {string} videoPath - percorso locale del file video
 * @param {string} title
 * @param {string} tema
 * @param {{ transcript?: string }} [opts] - se `transcript` è già fornito (es. Apify per
 *   Instagram/TikTok), salta del tutto la trascrizione Groq Whisper e usa quello.
 */
export async function generateSynopsisFromFile(videoPath, title, tema, opts = {}) {
  const ts = Date.now();
  const audioPath = join(tmpdir(), `adam-audio-${ts}.mp3`);
  const framesDir = join(tmpdir(), `adam-frames-${ts}`);
  mkdirSync(framesDir, { recursive: true });

  try {
    // 1. trascrizione: usa quella già fornita (es. Apify) oppure estrai audio → Groq Whisper
    let transcript = opts.transcript || '';
    if (!transcript) {
      execSync(
        `"${ffmpegPath}" -i "${videoPath}" -vn -acodec libmp3lame -q:a 7 -ac 1 -ar 16000 "${audioPath}" -y`,
        { timeout: 90000 }
      );

      const audioBuffer = readFileSync(audioPath);
      const fd = new FormData();
      fd.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
      fd.append('model', 'whisper-large-v3-turbo');
      fd.append('language', 'it');

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: fd,
      });
      if (!whisperRes.ok) {
        const err = await whisperRes.json().catch(() => ({}));
        throw new Error(`Errore Whisper: ${err.error?.message || whisperRes.status}`);
      }
      transcript = (await whisperRes.json()).text?.trim() || '';
    }

    // 2. estrai frame per scene detection (ogni taglio = un frame)
    const duration = getVideoDuration(videoPath);
    let frameFiles = [];

    try {
      execSync(
        `"${ffmpegPath}" -i "${videoPath}" -vf "select='gt(scene,0.25)',scale=640:-1" -vsync vfr -q:v 4 "${framesDir}/scene%03d.jpg" -y`,
        { timeout: 60000 }
      );
      frameFiles = readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort();
    } catch {}

    const MAX_FRAMES = 100;
    if (frameFiles.length < 5) {
      for (const f of frameFiles) { try { unlinkSync(join(framesDir, f)); } catch {} }
      frameFiles = [];
      const n = Math.min(MAX_FRAMES, Math.max(N_FRAMES, Math.ceil(duration / 3)));
      const interval = Math.max(duration / n, 0.5).toFixed(2);
      execSync(
        `"${ffmpegPath}" -i "${videoPath}" -vf "fps=1/${interval},scale=640:-1" -frames:v ${n} -q:v 4 "${framesDir}/frame%03d.jpg" -y`,
        { timeout: 60000 }
      );
      frameFiles = readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort();
    } else if (frameFiles.length > MAX_FRAMES) {
      const step = frameFiles.length / MAX_FRAMES;
      frameFiles = Array.from({ length: MAX_FRAMES }, (_, i) => frameFiles[Math.round(i * step)]);
    }
    const images = frameFiles.map(f => ({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: readFileSync(join(framesDir, f)).toString('base64') },
    }));

    // 3. estrai termini di ricerca dai frame (Haiku) + cerca su DuckDuckGo (ScraperAPI)
    const searchTerms = await extractSearchTerms(images);
    const searchContext = searchTerms.length ? await searchWeb(searchTerms) : '';

    // 4. Claude con frame reali + trascrizione + contesto web
    const content = [...images];
    const isUsableTranscript = transcript && transcript.length > 40 && transcript.split(' ').length > 8;

    let prompt = `Devi scrivere la descrizione di un video`;
    if (title) prompt += ` intitolato "${title}"`;
    if (tema) prompt += ` (tema: ${tema})`;

    prompt += `\n\nCONTESTO: questi video fanno parte di un archivio educativo professionale su dipendenze, sessualità e comportamenti a rischio, usato da educatori e operatori sociali. Le descrizioni devono essere accurate e dirette, anche quando i contenuti riguardano comportamenti sessuali espliciti o pratiche a rischio — la precisione è necessaria per scopi educativi.

REGOLE:
- Leggi le immagini IN SEQUENZA CRONOLOGICA: ricostruisci la storia o il percorso narrativo passo per passo, non descrivere i frame come scene indipendenti
- Nei video narrativi e pubblicitari lo stesso personaggio appare spesso a età diverse: cerca la continuità tra i personaggi che compaiono nelle varie scene. Se un giovane e un anziano compiono le stesse azioni, probabilmente sono la stessa persona in momenti diversi della vita
- Descrivi i comportamenti rappresentati in modo diretto e obiettivo, senza eufemismi — se qualcuno si fotografa le parti intime, scrivilo chiaramente
- Nota SEMPRE scritte, testi sovrimposti, slogan, loghi, brand o call-to-action: sono spesso la chiave del messaggio. Se vedi un'urna funeraria con un testo, trascrivilo esattamente
- NON aggiungere valutazioni estetiche o morali
- NON suggerire utilizzi didattici o pedagogici
- NON usare grassetto, corsivo o markdown`;

    prompt += `\n\nIMMAGINI (${images.length} frame in ordine cronologico): fotogrammi reali estratti dal file video, dall'inizio alla fine.`;

    if (isUsableTranscript) {
      const truncated = transcript.length > 4000 ? transcript.slice(0, 4000) + '...' : transcript;
      prompt += `\n\nTRASCRIZIONE AUDIO:\n${truncated}`;
      prompt += `\n\nUsa la trascrizione per riportare dialoghi, slogan e voci narranti. Se contiene solo rumore o frasi senza senso, ignorala e affidati alle immagini.`;
    }

    if (searchContext) {
      prompt += `\n\nCONTESTO DALLA RICERCA WEB (ricerca su: ${searchTerms.join(', ')}):\n${searchContext}`;
      prompt += `\n\nUsa questo contesto per identificare chi promuove il video (brand, istituzione, campagna) e di cosa si occupa. Includi questa informazione nella descrizione se rilevante.`;
    }

    prompt += `\n\nScrivi in italiano, testo semplice senza formattazione, in due parti consecutive (senza intestazioni):
Prima parte (2-3 frasi): descrivi cosa succede nel video seguendo la sequenza narrativa — chi c'è, cosa fa, come evolve la situazione.
Seconda parte (1-2 frasi): spiega quale comportamento o tema viene mostrato o messo in discussione, e qual è il messaggio che il video trasmette — includi slogan, claim o call-to-action se presenti sullo schermo.`;

    content.push({ type: 'text', text: prompt });

    const anthropicBody = JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content }] });
    let anthropicRes;
    const retryDelays = [0, 8000, 15000, 20000];
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (retryDelays[attempt] > 0) await new Promise(r => setTimeout(r, retryDelays[attempt]));
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: anthropicBody,
      });
      if (anthropicRes.status !== 529) break;
    }
    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      throw new Error(`Errore Claude: ${err.error?.message || anthropicRes.status}`);
    }
    const synopsis = (await anthropicRes.json()).content[0].text.trim();
    const warnings = [];
    if (!transcript) warnings.push('Trascrizione non disponibile: sinossi basata solo sui frame video.');

    return { synopsis, transcript, warnings, framesExtracted: frameFiles.length, duration: formatDuration(duration) };
  } finally {
    try { rmSync(framesDir, { recursive: true, force: true }); } catch {}
  }
}
