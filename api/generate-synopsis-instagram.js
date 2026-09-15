// Sinossi automatica Instagram da link, via Apify (Instagram Reel Scraper).
// Storicamente SOLO testo (caption+trascrizione, NIENTE fotogrammi): un test del
// 2026-08-11 con `includeDownloadedVideo: true` è rimasto bloccato 4+ minuti fino al
// timeout dell'Actor su un singolo reel, senza errore (log run FdqbJemwyQ0kkEX1F).
// Ritestato dal vivo il 2026-09-15 sullo stesso video: oggi completa in ~93 secondi,
// niente più blocco — quindi ora si usa la STESSA pipeline ffmpeg+Groq+Claude di
// TikTok/MODO1 (api/_lib/videoSynopsis.js), frame reali invece di solo testo.
//
// Il video scaricato è SOLO transitorio (elaborato in /tmp, poi cancellato) — MAI
// salvato su storage persistente né servito da ADAM: il player nel sito resta
// l'iframe ufficiale instagram.com/reel/{id}/embed/, per non esporre l'ASL committente
// a rischi di copyright legati alla ridistribuzione di contenuti altrui.

import { writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateSynopsisFromFile } from './_lib/videoSynopsis.js';

export const config = { maxDuration: 300 };

const INSTAGRAM_ACTOR = 'apify~instagram-reel-scraper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.APIFY_TOKEN) return res.status(500).json({ error: 'APIFY_TOKEN non configurato.' });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY non configurata.' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  const { youtubeUrl, title = '', tema = '' } = req.body || {};
  if (!youtubeUrl) return res.status(400).json({ error: 'url mancante.' });

  const token = process.env.APIFY_TOKEN;
  const ts = Date.now();
  const videoPath = join(tmpdir(), `adam-instagram-${ts}.mp4`);

  try {
    // 1. Apify scarica il video reale + trascrizione (store privato per default — il
    // token resta solo qui, mai esposto al browser)
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${INSTAGRAM_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=280`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: [youtubeUrl], resultsLimit: 1, includeTranscript: true, includeDownloadedVideo: true }),
      }
    );
    const items = await apifyRes.json();
    if (!apifyRes.ok) {
      return res.status(502).json({ error: `Apify ha risposto ${apifyRes.status}.` });
    }
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) {
      return res.status(502).json({ error: 'Instagram non ha restituito risultati (video privato, rimosso, o URL non valido).' });
    }

    const caption = (item.caption || '').trim();
    const apifyTranscript = (item.transcript || '').trim();

    // 2. Scarica l'mp4 in locale, solo per elaborazione — MAI persistito altrove.
    // Preferito `downloadedVideo` (artefatto Apify, store privato, serve il token),
    // fallback su `videoUrl` (link diretto CDN Instagram, nessun token necessario).
    const rawVideoUrl = item.downloadedVideo || item.videoUrl;
    if (!rawVideoUrl) {
      return res.status(502).json({ error: 'Apify non ha fornito un video scaricabile per questo link.' });
    }
    const isApifyStore = rawVideoUrl.includes('api.apify.com');
    const fetchUrl = isApifyStore ? `${rawVideoUrl}${rawVideoUrl.includes('?') ? '&' : '?'}token=${token}` : rawVideoUrl;
    const videoRes = await fetch(fetchUrl);
    if (!videoRes.ok) {
      return res.status(502).json({ error: `Download del video Instagram fallito (HTTP ${videoRes.status}).` });
    }
    const contentLength = videoRes.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 400 * 1024 * 1024) {
      return res.status(500).json({ error: `Video troppo grande (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB). Massimo 400MB.` });
    }
    writeFileSync(videoPath, Buffer.from(await videoRes.arrayBuffer()));

    // 3. Stessa pipeline ffmpeg+Groq+Claude di TikTok/MODO1 — se Apify ha già dato una
    // trascrizione la passiamo direttamente (salta Whisper), altrimenti la pipeline la
    // estrae dall'audio del file scaricato
    const result = await generateSynopsisFromFile(videoPath, title || caption, tema, { transcript: apifyTranscript });

    // Nomi campo allineati a api/generate-synopsis.js (ytTitle/ytDuration/ytFormat) —
    // il frontend (handleGenerateSynopsis) si aspetta questi nomi per l'auto-fill.
    return res.status(200).json({
      synopsis: result.synopsis,
      transcript: result.transcript,
      warnings: result.warnings,
      framesExtracted: result.framesExtracted,
      ytTitle: caption || null,
      ytDuration: result.duration,
      ytFormat: 'verticale',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Errore imprevisto nella generazione della sinossi Instagram.' });
  } finally {
    try { rmSync(videoPath, { force: true }); } catch {}
  }
}
