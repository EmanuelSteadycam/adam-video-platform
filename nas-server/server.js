'use strict';
const http = require('http');
const { execSync, spawn } = require('child_process');
const { readFileSync, mkdirSync, readdirSync, unlinkSync, existsSync, copyFileSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');

const PORT = process.env.PORT || 3100;
const NAS_SECRET = process.env.NAS_SECRET;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ARCHIVE_PATH = process.env.ARCHIVE_PATH || null;

const MAX_FRAMES = 100;
const N_FRAMES = 20;

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function sanitizeFilename(name) {
  return name.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 200);
}

// Fetch yt-dlp metadata without downloading
function getVideoInfo(youtubeUrl) {
  return new Promise((resolve) => {
    const proc = spawn('yt-dlp', ['-J', '--no-playlist', youtubeUrl]);
    let data = '';
    proc.stdout.on('data', d => { data += d; });
    proc.on('close', code => {
      if (code !== 0) return resolve(null);
      try { resolve(JSON.parse(data)); } catch { resolve(null); }
    });
    proc.on('error', () => resolve(null));
  });
}

// Download video with yt-dlp
function downloadVideo(youtubeUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', [
      '-o', outputPath,
      '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      youtubeUrl,
    ]);
    let errData = '';
    proc.stderr.on('data', d => { errData += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) reject(new Error('yt-dlp fallito: ' + errData.slice(-500)));
      else resolve();
    });
    proc.on('error', e => reject(e));
  });
}

async function processVideo(videoPath, title, tema) {
  const ts = Date.now();
  const audioPath = join(tmpdir(), `adam-audio-${ts}.mp3`);
  const framesDir = join(tmpdir(), `adam-frames-${ts}`);
  mkdirSync(framesDir, { recursive: true });

  try {
    // 1. Estrai audio → Groq Whisper
    execSync(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 7 -ac 1 -ar 16000 "${audioPath}" -y`,
      { timeout: 90000, stdio: 'pipe' }
    );

    const audioBuffer = readFileSync(audioPath);
    const fd = new FormData();
    fd.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
    fd.append('model', 'whisper-large-v3-turbo');
    fd.append('language', 'it');

    let transcript = '';
    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: fd,
    });
    if (whisperRes.ok) {
      transcript = (await whisperRes.json()).text?.trim() || '';
    } else {
      console.error('Whisper error:', whisperRes.status);
    }

    // 2. Ottieni durata e frame
    let duration = 120;
    try {
      const out = execSync(`ffmpeg -i "${videoPath}" 2>&1 || true`, { timeout: 10000 }).toString();
      const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
      if (m) duration = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
    } catch {}

    let frameFiles = [];
    try {
      execSync(
        `ffmpeg -i "${videoPath}" -vf "select='gt(scene,0.25)',scale=640:-1" -vsync vfr -q:v 4 "${framesDir}/scene%03d.jpg" -y`,
        { timeout: 60000, stdio: 'pipe' }
      );
      frameFiles = readdirSync(framesDir).filter(f => f.endsWith('.jpg')).sort();
    } catch {}

    if (frameFiles.length < 5) {
      for (const f of frameFiles) { try { unlinkSync(join(framesDir, f)); } catch {} }
      frameFiles = [];
      const n = Math.min(MAX_FRAMES, Math.max(N_FRAMES, Math.ceil(duration / 3)));
      const interval = Math.max(duration / n, 0.5).toFixed(2);
      execSync(
        `ffmpeg -i "${videoPath}" -vf "fps=1/${interval},scale=640:-1" -frames:v ${n} -q:v 4 "${framesDir}/frame%03d.jpg" -y`,
        { timeout: 60000, stdio: 'pipe' }
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

    // 3. Claude Sonnet sinossi
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

    prompt += `\n\nScrivi in italiano, testo semplice senza formattazione, in due parti consecutive (senza intestazioni):
Prima parte (2-3 frasi): descrivi cosa succede nel video seguendo la sequenza narrativa — chi c'è, cosa fa, come evolve la situazione.
Seconda parte (1-2 frasi): spiega quale comportamento o tema viene mostrato o messo in discussione, e qual è il messaggio che il video trasmette — includi slogan, claim o call-to-action se presenti sullo schermo.`;

    content.push({ type: 'text', text: prompt });

    const anthropicBody = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content }],
    });

    let anthropicRes;
    const retryDelays = [0, 8000, 15000, 20000];
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (retryDelays[attempt] > 0) await new Promise(r => setTimeout(r, retryDelays[attempt]));
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
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
    try { unlinkSync(audioPath); } catch {}
    try {
      for (const f of readdirSync(framesDir)) { try { unlinkSync(join(framesDir, f)); } catch {} }
    } catch {}
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  if (req.url !== '/synopsis' || req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Auth
  if (NAS_SECRET) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${NAS_SECRET}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Non autorizzato' }));
      return;
    }
  }

  // Parse body
  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body); } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'JSON non valido' }));
    return;
  }

  const { youtubeUrl, title, tema, saveToArchive, codice, recordTitle } = parsed;

  if (!youtubeUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'youtubeUrl mancante' }));
    return;
  }

  const ts = Date.now();
  const videoPath = join(tmpdir(), `adam-nas-${ts}.mp4`);

  try {
    // Metadata yt-dlp (titolo, dimensioni, durata)
    console.log(`[${ts}] Fetching metadata for ${youtubeUrl}`);
    const info = await getVideoInfo(youtubeUrl);
    const ytTitle = info?.title || title || '';
    const ytWidth = info?.width || 1920;
    const ytHeight = info?.height || 1080;
    const ytFormat = ytHeight > ytWidth ? 'verticale' : 'orizzontale';
    const ytDuration = info?.duration ? formatDuration(info.duration) : '';
    console.log(`[${ts}] Title: "${ytTitle}", format: ${ytFormat}, duration: ${ytDuration}`);

    // Download
    console.log(`[${ts}] Downloading...`);
    await downloadVideo(youtubeUrl, videoPath);
    console.log(`[${ts}] Download complete`);

    // Elaborazione (frame + audio + Claude)
    const result = await processVideo(videoPath, ytTitle || title || '', tema || '');
    console.log(`[${ts}] Processing complete — ${result.framesExtracted} frames`);

    // Salvataggio in archivio NAS
    if (saveToArchive && codice && ARCHIVE_PATH && existsSync(ARCHIVE_PATH)) {
      const finalTitle = sanitizeFilename(recordTitle || ytTitle || title || codice);
      const destFilename = `${codice}-${finalTitle}.mp4`;
      const destPath = join(ARCHIVE_PATH, destFilename);
      try {
        copyFileSync(videoPath, destPath);
        console.log(`[${ts}] Saved to archive: ${destPath}`);
      } catch (e) {
        console.error(`[${ts}] Archive save failed:`, e.message);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...result, ytTitle, ytFormat, ytDuration }));
  } catch (e) {
    console.error(`[${ts}] Error:`, e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  } finally {
    try { unlinkSync(videoPath); } catch {}
  }
});

server.listen(PORT, () => console.log(`ADAM NAS server on :${PORT}`));
