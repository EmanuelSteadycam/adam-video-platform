// TEST — endpoint temporaneo per valutare Apify come alternativa a yt-dlp/NAS per
// TikTok (login-wall) e come via per supportare Instagram senza App Review Meta.
// Non ancora integrato nella pipeline sinossi definitiva (nessuna chiamata a Claude/Groq
// qui) — restituisce solo i dati grezzi scaricati da Apify per ispezione.
// Usato dal bottone "Test Apify" nella schermata Aggiungi della PWA (QuickAggiungiScreen).
//
// Richiede APIFY_TOKEN nelle env var Vercel (Settings → Environment Variables).

export const config = { maxDuration: 280 };

const TIKTOK_ACTOR = 'clockworks~tiktok-video-scraper';
const INSTAGRAM_ACTOR = 'apify~instagram-reel-scraper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = req.body?.url;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url mancante.' });

  const token = process.env.APIFY_TOKEN;
  if (!token) return res.status(500).json({ error: 'APIFY_TOKEN non configurato nelle env var Vercel.' });

  const isTikTok = /tiktok\.com/i.test(url);
  const isInstagram = /instagram\.com/i.test(url);
  if (!isTikTok && !isInstagram) {
    return res.status(400).json({ error: 'URL non riconosciuto — questo test supporta solo link TikTok o Instagram.' });
  }

  const actorId = isTikTok ? TIKTOK_ACTOR : INSTAGRAM_ACTOR;
  const input = isTikTok
    ? {
        postURLs: [url],
        scrapeRelatedVideos: false,
        shouldDownloadVideos: true,
        shouldDownloadCovers: true,
        downloadSubtitlesOptions: 'NEVER_DOWNLOAD_SUBTITLES',
      }
    : {
        username: [url],
        resultsLimit: 1,
        includeTranscript: true,
        includeDownloadedVideo: true,
      };

  try {
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=270`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );
    const items = await apifyRes.json();

    if (!apifyRes.ok) {
      return res.status(502).json({ error: `Apify ha risposto ${apifyRes.status}`, detail: items });
    }
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) {
      return res.status(502).json({ error: 'Apify non ha restituito nessun risultato (video privato, rimosso, o URL non valido).' });
    }

    // I link api.apify.com (key-value store) del TikTok Video Scraper sono privati
    // per default (403 senza token) — a differenza di quelli dell'Instagram Reel
    // Scraper, pubblici. Per non esporre mai il token al browser, ogni link
    // api.apify.com passa dal proxy /api/apify-media invece di essere restituito
    // così com'è (verificato dal vivo: senza questo passaggio la thumbnail TikTok
    // risultava un'icona rotta sul telefono).
    const viaProxy = (u) => (u && /^https:\/\/api\.apify\.com\//i.test(u) ? `/api/apify-media?u=${encodeURIComponent(u)}` : u || null);

    const platform = isTikTok ? 'tiktok' : 'instagram';
    const normalized = isTikTok
      ? {
          caption: item.text || '',
          thumbnailUrl: viaProxy(item.videoMeta?.coverUrl),
          videoUrl: viaProxy(item.mediaUrls?.[0] || item.videoMeta?.downloadAddr),
          transcript: null,
          durationSec: item.videoMeta?.duration ?? null,
        }
      : {
          caption: item.caption || '',
          thumbnailUrl: viaProxy(item.displayUrl),
          videoUrl: viaProxy(item.downloadedVideo || item.videoUrl),
          transcript: item.transcript || null,
          durationSec: item.videoDuration ?? null,
        };

    return res.status(200).json({ platform, ...normalized, raw: item });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Errore imprevisto nella chiamata ad Apify.' });
  }
}
