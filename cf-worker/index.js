// Cloudflare Worker — estrae URL storyboard YouTube
// Deploy: Cloudflare Dashboard → Workers & Pages → Create Worker → incolla questo codice

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('v');

    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return json({ error: 'video ID non valido' }, 400);
    }

    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!res.ok) return json({ urls: [], error: `YouTube HTTP ${res.status}` });

      const html = await res.text();
      const m = html.match(/"playerStoryboardSpecRenderer"\s*:\s*\{"spec"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (!m) return json({ urls: [], error: 'storyboard spec non trovata nella pagina' });

      const spec = JSON.parse('"' + m[1] + '"');
      const parts = spec.split('|');
      const baseUrl = parts[0];

      const levels = parts.slice(1).map((p, idx) => {
        const f = p.split('#');
        const rs = (f[7] || '').startsWith('rs$') ? f[7].slice(3) : '';
        return {
          level: idx,
          count: parseInt(f[2]) || 0,
          cols: parseInt(f[3]) || 0,
          rows: parseInt(f[4]) || 0,
          template: f[6] || '',
          rs,
        };
      });

      const valid = levels.filter(l => l.template.includes('$M') && l.rs && l.count > 0);
      if (!valid.length) return json({ urls: [], error: 'nessun livello storyboard valido' });

      // livello di qualità più alta disponibile
      const chosen = valid[valid.length - 1];
      const framesPerSheet = (chosen.cols || 1) * (chosen.rows || 1);
      const numSheets = Math.ceil(chosen.count / framesPerSheet);

      // campiona fino a 12 sprite sheet distribuiti uniformemente
      const MAX = 12;
      const indices = numSheets <= MAX
        ? Array.from({ length: numSheets }, (_, i) => i)
        : Array.from({ length: MAX }, (_, i) => Math.round(i * (numSheets - 1) / (MAX - 1)));

      const urls = indices.map(i => {
        const filename = chosen.template.replace('$M', String(i));
        return baseUrl
          .replace('$L', String(chosen.level))
          .replace('$N', filename) + '&rs=' + chosen.rs;
      });

      return json({ urls, level: chosen.level, totalSheets: numSheets, framesPerSheet });
    } catch (err) {
      return json({ urls: [], error: err.message });
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
