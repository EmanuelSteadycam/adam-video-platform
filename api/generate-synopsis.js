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

async function fetchTranscript(videoId) {
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

async function fetchStoryboardUrls(videoId) {
  const workerUrl = process.env.CF_STORYBOARD_WORKER_URL;
  if (!workerUrl) return [];
  try {
    const res = await fetch(`${workerUrl}?v=${videoId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.urls) ? data.urls : [];
  } catch { return []; }
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
    ['0', '1', '2', '3'].map(n => downloadBase64(`https://img.youtube.com/vi/${videoId}/${n}.jpg`))
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

  const [oembedResult, transcriptResult, storyboardResult, descriptionResult] = await Promise.allSettled([
    fetchOEmbed(videoId),
    manualTranscript ? Promise.resolve(null) : fetchTranscript(videoId),
    fetchStoryboardUrls(videoId),
    fetchYoutubeDescription(videoId),
  ]);

  const oembed = oembedResult.value ?? null;
  const transcript = manualTranscript || transcriptResult.value || null;
  const storyboardUrls = storyboardResult.value ?? [];
  const ytDescription = descriptionResult.value ?? null;

  // scarica sprite sheet storyboard; fallback a 4 thumbnail standard
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
      prompt += `\n\nIMMAGINI (${images.length} fotogrammi): inizio, 25%, 50%, 75% della durata del video.`;
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
