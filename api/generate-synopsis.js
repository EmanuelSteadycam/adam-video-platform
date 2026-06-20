export const config = { runtime: 'edge', maxDuration: 25 };

function extractVideoId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function fetchOEmbed(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!res.ok) return null;
    const d = await res.json();
    return { title: d.title || '', channel: d.author_name || '' };
  } catch { return null; }
}

async function fetchStoryboardUrls(videoId) {
  try {
    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    }).then(r => r.text());

    const m = html.match(/"playerStoryboardSpecRenderer"\s*:\s*\{"spec"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (!m) return [];

    const spec = JSON.parse('"' + m[1] + '"');
    const parts = spec.split('|');
    const baseUrl = parts[0];

    const levels = parts.slice(1).map((p, idx) => {
      const f = p.split('#');
      const rs = (f[7] || '').startsWith('rs$') ? f[7].slice(3) : '';
      return { level: idx, count: parseInt(f[2]) || 0, cols: parseInt(f[3]) || 0, rows: parseInt(f[4]) || 0, template: f[6] || '', rs };
    });

    const valid = levels.filter(l => l.template.includes('$M') && l.rs && l.count > 0);
    if (!valid.length) return [];

    const chosen = valid[valid.length - 1];
    const numSheets = Math.ceil(chosen.count / (chosen.cols * chosen.rows));

    const urls = Array.from({ length: numSheets }, (_, i) => {
      const filename = chosen.template.replace('$M', String(i));
      return baseUrl.replace('$L', String(chosen.level)).replace('$N', filename) + '&rs=' + chosen.rs;
    });

    if (urls.length <= 5) return urls;
    const n = urls.length;
    return [0, 0.25, 0.5, 0.75, 1].map(f => urls[Math.min(Math.floor(f * n), n - 1)]);
  } catch { return []; }
}

async function fetchFallbackThumbnails(videoId) {
  const results = await Promise.all(
    ['0', '1', '2', '3'].map(async n => {
      try {
        const res = await fetch(`https://img.youtube.com/vi/${videoId}/${n}.jpg`);
        return res.ok ? arrayBufferToBase64(await res.arrayBuffer()) : null;
      } catch { return null; }
    })
  );
  return results.filter(Boolean);
}

async function downloadAsBase64(url) {
  try {
    const res = await fetch(url);
    return res.ok ? arrayBufferToBase64(await res.arrayBuffer()) : null;
  } catch { return null; }
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const { youtubeUrl, title, tema } = body;

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  if (!youtubeUrl) return json({ error: 'URL YouTube mancante.' }, 400);
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return json({ error: 'URL YouTube non valido.' }, 400);

  const [oembedResult, storyboardResult] = await Promise.allSettled([
    fetchOEmbed(videoId),
    fetchStoryboardUrls(videoId),
  ]);

  const oembed = oembedResult.value ?? null;
  const sheetUrls = storyboardResult.value ?? [];

  let images = [];
  let usedStoryboard = false;
  if (sheetUrls.length) {
    images = (await Promise.all(sheetUrls.map(downloadAsBase64))).filter(Boolean);
    usedStoryboard = images.length > 0;
  }
  if (!usedStoryboard) {
    images = await fetchFallbackThumbnails(videoId);
  }

  const warnings = [];
  if (!usedStoryboard) warnings.push('Storyboard non disponibile: analisi basata sulle thumbnail principali (copertura ridotta).');

  const content = [];
  for (const data of images) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
  }

  const ytTitle = title || oembed?.title || '';
  const ytChannel = oembed?.channel || '';

  let prompt = `Devi scrivere la descrizione di un video YouTube`;
  if (ytTitle) prompt += ` intitolato "${ytTitle}"`;
  if (ytChannel) prompt += ` pubblicato dal canale "${ytChannel}"`;
  if (tema) prompt += ` (tema: ${tema})`;
  prompt += `.\n\nREGOLE ASSOLUTE:
- Descrivi SOLO quello che è visibile nelle immagini
- NON interpretare, NON dedurre, NON giudicare
- NON dire cosa "vuole comunicare" il video o qual è il suo "messaggio"
- NON suggerire utilizzi didattici
- NON usare grassetto, corsivo o markdown
- NON aggiungere valutazioni estetiche`;

  const frameDesc = usedStoryboard
    ? `Le ${images.length} immagini sono sprite sheet (griglie di miniature) che coprono il video dall'inizio alla fine — ogni griglia mostra decine di frame in sequenza temporale, da sinistra a destra e dall'alto verso il basso.`
    : `Le ${images.length} immagini sono fotogrammi del video a intervalli regolari (inizio, 25%, 50%, 75%).`;
  prompt += `\n\nIMMAGINI: ${frameDesc} Descrivi cosa si vede: luoghi, persone, azioni.`;
  prompt += `\n\nScrivi in italiano, 2-4 frasi, testo semplice. Descrivi i fatti visibili: chi si vede, dove, cosa fa. Nient'altro.`;

  content.push({ type: 'text', text: prompt });

  // Chiamata diretta alle API Anthropic — nessuna dipendenza Node.js
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content }] }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    return json({ error: `Errore Claude: ${err.error?.message || anthropicRes.status}` }, 500);
  }

  const result = await anthropicRes.json();
  return json({ synopsis: result.content[0].text.trim(), warnings });
}
