// Metadati leggeri per un link Instagram (reel/post) — mirror di api/tiktok-oembed.js,
// ma via Apify (Instagram Reel Scraper) perché Instagram non ha un oEmbed pubblico senza
// token app Meta con Business Verification + App Review (vedi
// [[project_privacy_policy_meta_review]] nella memoria). Chiamata volutamente la più
// leggera possibile (niente trascrizione, niente download video) — usata per l'anteprima
// thumbnail on-blur nei form e come rete di sicurezza al momento di inserimento/
// approvazione. Per la sinossi vera (trascrizione + Claude) vedi
// api/generate-synopsis-instagram.js.

export const config = { maxDuration: 60 };

import { persistThumbnailToBlob } from './_lib/persistThumbnail.js';

const INSTAGRAM_ACTOR = 'apify~instagram-reel-scraper';

// I link api.apify.com/fbcdn.net/cdninstagram.com richiedono il proxy /api/apify-media:
// gli store Apify sono privati per default (serve il token), le CDN Instagram/Facebook
// hanno l'header Cross-Origin-Resource-Policy: same-origin che blocca il caricamento
// diretto come <img> da un dominio esterno (verificato dal vivo in sessione).
const viaProxy = (u) => (u && /^https:\/\/([^/]+\.)?(apify\.com|fbcdn\.net|cdninstagram\.com)\//i.test(u) ? `/api/apify-media?u=${encodeURIComponent(u)}` : u || null);

export default async function handler(req, res) {
  const url = req.method === 'POST' ? req.body?.url : req.query?.url;
  if (!url) return res.status(400).json({ error: 'url mancante.' });

  const token = process.env.APIFY_TOKEN;
  if (!token) return res.status(500).json({ error: 'APIFY_TOKEN non configurato nelle env var Vercel.' });

  try {
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${INSTAGRAM_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=55`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: [url], resultsLimit: 1, includeTranscript: false, includeDownloadedVideo: false }),
      }
    );
    const items = await apifyRes.json();
    if (!apifyRes.ok) {
      return res.status(502).json({ error: `Apify ha risposto ${apifyRes.status}`, detail: items });
    }
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) {
      return res.status(404).json({ error: 'Video Instagram non trovato o non pubblico.' });
    }

    // La thumbnail Instagram (displayUrl) è firmata con scadenza — viene ri-ospitata su
    // Vercel Blob (fetch server-side diretto, nessun proxy necessario: il CORP header di
    // Instagram blocca solo il browser, non fetch server-to-server) così il link salvato
    // nel DB non si rompe dopo qualche settimana. Se il re-hosting fallisce, fallback sul
    // proxy /api/apify-media (funziona comunque finché il link originale non scade).
    const persistedThumbnail = await persistThumbnailToBlob(item.displayUrl, 'instagram');

    return res.status(200).json({
      title: item.caption || '',
      thumbnailUrl: persistedThumbnail || viaProxy(item.displayUrl),
      canonicalUrl: item.url || url,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
