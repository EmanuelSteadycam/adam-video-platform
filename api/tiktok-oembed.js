// Proxy per l'oEmbed pubblico di TikTok (nessuna auth richiesta, a differenza di Instagram).
// Usato dal form admin per: auto-fill titolo, thumbnail esplicita (TikTok non ha un pattern
// di thumbnail prevedibile da ID come img.youtube.com), e risoluzione dei link corti
// (vm.tiktok.com/vt.tiktok.com) all'URL canonico con l'ID numerico del video.

function extractCanonicalUrl(html) {
  if (!html) return null;
  const citeMatch = html.match(/cite="([^"]+)"/);
  if (citeMatch) return citeMatch[1];
  const idMatch = html.match(/data-video-id="(\d+)"/);
  const authorMatch = html.match(/data-video-id="\d+"[^>]*>\s*<a[^>]*href="([^"]+)"/);
  if (idMatch && authorMatch) return authorMatch[1];
  return null;
}

export default async function handler(req, res) {
  const url = req.method === 'POST' ? req.body?.url : req.query?.url;
  if (!url) return res.status(400).json({ error: 'url mancante.' });

  try {
    const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!oembedRes.ok) {
      return res.status(oembedRes.status).json({ error: 'Video TikTok non trovato o non pubblico.' });
    }
    const data = await oembedRes.json();
    const canonicalUrl = extractCanonicalUrl(data.html) || url;

    return res.status(200).json({
      title: data.title || '',
      thumbnailUrl: data.thumbnail_url || null,
      canonicalUrl,
      authorName: data.author_name || '',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
