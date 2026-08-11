// TEST — proxy per i file (thumbnail/video) ospitati nei key-value store di Apify.
// Necessario perché gli store del TikTok Video Scraper sono privati per default
// (403 "insufficient-permissions" senza token) mentre quelli dell'Instagram Reel
// Scraper risultano pubblici — per non esporre mai APIFY_TOKEN al browser, ogni
// link api.apify.com restituito da /api/apify-fetch passa da qui, che aggiunge il
// token solo lato server e ristreama il file.
// Companion di api/apify-fetch.js — stesso ciclo di vita (da rimuovere insieme se
// si scarta la pista Apify).

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const target = req.query?.u;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'parametro u mancante.' });

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: 'url non valido.' });
  }
  if (parsed.hostname !== 'api.apify.com') {
    return res.status(400).json({ error: 'host non consentito — solo api.apify.com.' });
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) return res.status(500).json({ error: 'APIFY_TOKEN non configurato nelle env var Vercel.' });
  parsed.searchParams.set('token', token);

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
