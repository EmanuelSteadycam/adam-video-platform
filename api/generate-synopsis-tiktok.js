// MODO3 — sinossi automatica TikTok da link, via Apify (TikTok Video Scraper).
// Sostituisce il vecchio limite "TikTok richiede upload manuale" (yt-dlp sul NAS viene
// bloccato da TikTok con "requiring login for access", vedi [[project_tiktok_support]]):
// Apify scarica il video reale senza login-wall, poi la STESSA pipeline ffmpeg+Groq+
// Claude di MODO1 (api/_lib/videoSynopsis.js) genera la sinossi — stessa qualità.
// MODO1 (upload manuale) resta disponibile invariato come alternativa.

import { writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateSynopsisFromFile } from './_lib/videoSynopsis.js';

export const config = { maxDuration: 300 };

const TIKTOK_ACTOR = 'clockworks~tiktok-video-scraper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.APIFY_TOKEN) return res.status(500).json({ error: 'APIFY_TOKEN non configurato.' });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY non configurata.' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  const { youtubeUrl, title = '', tema = '' } = req.body || {};
  if (!youtubeUrl) return res.status(400).json({ error: 'url mancante.' });

  const token = process.env.APIFY_TOKEN;
  const ts = Date.now();
  const videoPath = join(tmpdir(), `adam-tiktok-${ts}.mp4`);

  try {
    // 1. Apify scarica il video reale (store privato per default — il token resta solo qui,
    // mai esposto al browser)
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${TIKTOK_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=270`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postURLs: [youtubeUrl],
          scrapeRelatedVideos: false,
          shouldDownloadVideos: true,
          shouldDownloadCovers: false,
          downloadSubtitlesOptions: 'NEVER_DOWNLOAD_SUBTITLES',
        }),
      }
    );
    const items = await apifyRes.json();
    if (!apifyRes.ok) {
      return res.status(502).json({ error: `Apify ha risposto ${apifyRes.status} — riprova o usa il caricamento manuale del file.` });
    }
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) {
      return res.status(502).json({ error: 'TikTok non ha restituito risultati (video privato, rimosso, o URL non valido).' });
    }

    const videoUrl = item.mediaUrls?.[0] || item.videoMeta?.downloadAddr;
    if (!videoUrl) {
      return res.status(502).json({ error: 'Apify non ha fornito un video scaricabile per questo link — prova il caricamento manuale del file.' });
    }

    // 2. Scarica l'mp4 in locale (token solo qui, come in api/apify-media.js)
    const videoRes = await fetch(`${videoUrl}${videoUrl.includes('?') ? '&' : '?'}token=${token}`);
    if (!videoRes.ok) {
      return res.status(502).json({ error: `Download del video TikTok fallito (HTTP ${videoRes.status}).` });
    }
    const contentLength = videoRes.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 400 * 1024 * 1024) {
      return res.status(500).json({ error: `Video troppo grande (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB). Massimo 400MB.` });
    }
    writeFileSync(videoPath, Buffer.from(await videoRes.arrayBuffer()));

    // 3. Stessa pipeline ffmpeg+Groq+Claude di MODO1 — nessun transcript pre-fornito,
    // Whisper gira normalmente sull'audio del file scaricato
    const caption = (item.text || '').trim();
    const result = await generateSynopsisFromFile(videoPath, title || caption, tema);

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
    return res.status(500).json({ error: e.message || 'Errore imprevisto nella generazione della sinossi TikTok.' });
  } finally {
    try { rmSync(videoPath, { force: true }); } catch {}
  }
}
