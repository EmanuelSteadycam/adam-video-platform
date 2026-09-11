// Scarica una thumbnail da un URL firmato/temporaneo (CDN TikTok o Instagram — entrambi
// restituiscono link con token di scadenza) e la ri-ospita su Vercel Blob con un
// pathname pubblico permanente. Senza questo passaggio, la thumbnail salvata nel DB
// smette di funzionare non appena il token scade (bug reale osservato: i video
// TikTok/Instagram inseriti nell'estate 2026 avevano tutti la thumbnail rotta a
// distanza di poche settimane, verificato dal vivo con fetch diretto → 403 su ogni
// singolo link salvato). Usato da api/tiktok-oembed.js e api/instagram-meta.js.
//
// Ritorna null (mai lancia) se il download o l'upload falliscono — il chiamante deve
// prevedere un fallback (es. l'URL originale, che almeno funziona finché non scade).

import { put } from '@vercel/blob';

const EXT_BY_CONTENT_TYPE = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' };

export async function persistThumbnailToBlob(sourceUrl, platform) {
  if (!sourceUrl) return null;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const upstream = await fetch(sourceUrl);
    if (!upstream.ok) return null;

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const ext = EXT_BY_CONTENT_TYPE[contentType.split(';')[0].trim()] || 'jpg';
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (!buf.length) return null;

    const pathname = `thumbnails/${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await put(pathname, buf, { access: 'public', contentType, addRandomSuffix: false });
    return blob.url;
  } catch {
    return null;
  }
}
