import { YoutubeTranscript } from 'youtube-transcript';

export const config = { maxDuration: 60 };

function extractVideoId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

async function fetchOEmbed(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!res.ok) return null;
    const d = await res.json();
    return { title: d.title || '', channel: d.author_name || '' };
  } catch { return null; }
}

function parseVTT(vtt) {
  return vtt
    .replace(/WEBVTT\n/, '')
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}[^\n]*/g, '')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter((l, i, arr) => l !== arr[i - 1])
    .join(' ');
}

function parseStoryboardSpec(spec) {
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
  if (!valid.length) return [];

  const chosen = valid[valid.length - 1];
  const framesPerSheet = (chosen.cols || 1) * (chosen.rows || 1);
  const numSheets = Math.ceil(chosen.count / framesPerSheet);

  const MAX = 12;
  const indices = numSheets <= MAX
    ? Array.from({ length: numSheets }, (_, i) => i)
    : Array.from({ length: MAX }, (_, i) => Math.round(i * (numSheets - 1) / (MAX - 1)));

  return indices.map(i => {
    const filename = chosen.template.replace('$M', String(i));
    return baseUrl
      .replace('$L', String(chosen.level))
      .replace('$N', filename) + '&rs=' + chosen.rs;
  });
}

// Una sola chiamata ScraperAPI → transcript + storyboard URLs
async function fetchFromYouTubePage(videoId) {
  const scraperKey = process.env.SCRAPER_API_KEY;
  if (!scraperKey) return { transcript: null, storyboardUrls: [] };

  try {
    const pageRes = await fetch(
      `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
    );
    if (!pageRes.ok) return { transcript: null, storyboardUrls: [] };

    const html = await pageRes.text();

    // estrai transcript
    let transcript = null;
    const captionMatch = html.match(/"captionTracks":\s*(\[[\s\S]*?\])/);
    if (captionMatch) {
      try {
        const tracks = JSON.parse(captionMatch[1]);
        const track = tracks.find(t => t.languageCode === 'it') || tracks[0];
        if (track?.baseUrl) {
          const baseUrl = track.baseUrl.replace(/\\u0026/g, '&');
          const captionRes = await fetch(baseUrl + '&fmt=vtt');
          if (captionRes.ok) {
            const text = parseVTT(await captionRes.text());
            if (text.length > 20) transcript = text;
          }
        }
      } catch {}
    }

    // estrai storyboard URLs
    let storyboardUrls = [];
    const sbMatch = html.match(/"playerStoryboardSpecRenderer":\{"spec":"((?:[^"\\]|\\.)*)"/);
    if (sbMatch) {
      try {
        const spec = JSON.parse('"' + sbMatch[1] + '"');
        storyboardUrls = parseStoryboardSpec(spec);
      } catch {}
    }

    return { transcript, storyboardUrls };
  } catch { return { transcript: null, storyboardUrls: [] }; }
}

async function fetchTranscriptFallback(videoId) {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'it' });
    if (items?.length) return items.map(i => i.text).join(' ');
  } catch {}
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items?.length) return items.map(i => i.text).join(' ');
  } catch {}
  return null;
}

async function fetchYoutubeDescription(videoId) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0]?.snippet?.description || null;
  } catch { return null; }
}

async function downloadBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString('base64');
  } catch { return null; }
}

async function fetchFallbackThumbnails(videoId) {
  const results = await Promise.all(
    ['1', '2', '3'].map(n => downloadBase64(`https://img.youtube.com/vi/${videoId}/${n}.jpg`))
  );
  return results.filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { youtubeUrl, title, tema, transcript: providedTranscript } = req.body || {};
  if (!youtubeUrl) return res.status(400).json({ error: 'URL YouTube mancante.' });

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube non valido.' });

  const manualTranscript = providedTranscript?.trim() || null;

  const [pageResult, oembedResult, descriptionResult] = await Promise.allSettled([
    fetchFromYouTubePage(videoId),
    fetchOEmbed(videoId),
    fetchYoutubeDescription(videoId),
  ]);

  const { transcript: pageTranscript, storyboardUrls } = pageResult.value ?? { transcript: null, storyboardUrls: [] };
  const oembed = oembedResult.value ?? null;
  const ytDescription = descriptionResult.value ?? null;

  // transcript: manuale > ScraperAPI > youtube-transcript fallback
  let transcript = manualTranscript || pageTranscript;
  if (!transcript) transcript = await fetchTranscriptFallback(videoId);

  // immagini: storyboard sprite sheet > 3 thumbnail standard
  let images = [];
  let usedStoryboard = false;

  if (storyboardUrls.length > 0) {
    const downloaded = await Promise.all(storyboardUrls.map(downloadBase64));
    images = downloaded.filter(Boolean);
    usedStoryboard = images.length > 0;
  }
  if (!usedStoryboard) {
    images = await fetchFallbackThumbnails(videoId);
  }

  const warnings = [];
  if (!transcript) warnings.push('Trascrizione non disponibile: la sinossi è basata solo sull\'analisi visiva del video.');
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

  prompt += `\n\nREGOLE ASSOLUTE:
- Descrivi SOLO quello che è visibile nelle immagini e/o viene detto nella trascrizione
- NON interpretare, NON dedurre, NON giudicare
- NON dire cosa "vuole comunicare" il video o qual è il suo "messaggio"
- NON suggerire utilizzi didattici o pedagogici
- NON usare grassetto, corsivo o markdown
- NON aggiungere valutazioni estetiche o morali`;

  if (images.length > 0) {
    if (usedStoryboard) {
      prompt += `\n\nIMMAGINI (${images.length} sprite sheet): ogni immagine è una griglia di miniature che copre una porzione temporale del video — leggile da sinistra a destra e dall'alto verso il basso. Insieme coprono il video dall'inizio alla fine.`;
    } else {
      prompt += `\n\nIMMAGINI (${images.length} fotogrammi): circa 25%, 50% e 75% della durata del video — in ordine cronologico. NON dedurre cosa succede all'inizio o alla fine basandoti solo su queste immagini.`;
    }
  }

  if (transcript) {
    const truncated = transcript.length > 4000 ? transcript.slice(0, 4000) + '...' : transcript;
    prompt += `\n\nTRASCRIZIONE DEL PARLATO (fonte principale):\n${truncated}`;
    prompt += `\n\nUsa la trascrizione per riportare fedelmente cosa viene detto: dialoghi, voci, testi parlati. Le immagini completano con ciò che si vede.`;
  }

  if (ytDescription) {
    const truncated = ytDescription.length > 600 ? ytDescription.slice(0, 600) + '...' : ytDescription;
    prompt += `\n\nDESCRIZIONE YOUTUBE (contesto aggiuntivo):\n${truncated}`;
  }

  prompt += `\n\nScrivi in italiano, 2-4 frasi, testo semplice senza formattazione.`;
  prompt += transcript
    ? ` Integra quello che si vede con quello che viene detto. Riporta i contenuti del parlato in modo diretto e fedele.`
    : ` Descrivi solo i fatti visibili: chi si vede, dove, cosa fa.`;

  content.push({ type: 'text', text: prompt });

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    return res.status(500).json({ error: `Errore Claude: ${err.error?.message || anthropicRes.status}` });
  }

  const result = await anthropicRes.json();
  return res.status(200).json({ synopsis: result.content[0].text.trim(), warnings });
}
