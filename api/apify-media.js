// TEST — proxy per i file (thumbnail/video) usati dal test Apify (TikTok/Instagram).
// Due motivi distinti per cui serve, entrambi verificati dal vivo:
// 1) i key-value store del TikTok Video Scraper sono privati per default (403
//    "insufficient-permissions" senza token) — per non esporre mai APIFY_TOKEN al
//    browser, i link api.apify.com passano da qui, che aggiunge il token solo lato
//    server e ristreama il file.
// 2) le immagini servite da Instagram/Facebook CDN (fbcdn.net/cdninstagram.com)
//    hanno l'header Cross-Origin-Resource-Policy: same-origin, che i browser
//    rispettano (curl no) bloccando il caricamento diretto come <img> da un
//    dominio esterno — passandole da qui il browser le vede come same-origin.
// Companion di api/apify-fetch.js — stesso ciclo di vita (da rimuovere insieme se
// si scarta la pista Apify).

export const config = { maxDuration: 60 };

const ALLOWED_HOSTS = [/^api\.apify\.com$/, /\.fbcdn\.net$/, /\.cdninstagram\.com$/];

export default async function handler(req, res) {
  const target = req.query?.u;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'parametro u mancante.' });

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: 'url non valido.' });
  }
  if (!ALLOWED_HOSTS.some((re) => re.test(parsed.hostname))) {
    return res.status(400).json({ error: `host non consentito: ${parsed.hostname}` });
  }

  // Il token serve solo per gli store Apify — le CDN Instagram/Facebook non lo vogliono
  // (e aggiungerlo romperebbe la firma già presente nella query string dell'URL originale).
  const token = process.env.APIFY_TOKEN;
  if (parsed.hostname === 'api.apify.com') {
    if (!token) return res.status(500).json({ error: 'APIFY_TOKEN non configurato nelle env var Vercel.' });
    parsed.searchParams.set('token', token);
  }

  try {
    const upstream = await fetch(parsed.toString());
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Apify ha risposto ${upstream.status} nel proxy media.` });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'errore imprevisto nel proxy media.' });
  }
}
