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

async function fetchFallbackThumbnails(videoId) {
  const results = await Promise.all(
    ['0', '1', '2', '3'].map(async n => {
      try {
        const res = await fetch(`https://img.youtube.com/vi/${videoId}/${n}.jpg`);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer()).toString('base64');
      } catch { return null; }
    })
  );
  return results.filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { youtubeUrl, title, tema } = req.body || {};
  if (!youtubeUrl) return res.status(400).json({ error: 'URL YouTube mancante.' });

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube non valido.' });

  const [oembedResult, transcriptResult, imagesResult, descriptionResult] = await Promise.allSettled([
    fetchOEmbed(videoId),
    fetchTranscript(videoId),
    fetchFallbackThumbnails(videoId),
    fetchYoutubeDescription(videoId),
  ]);

  const oembed = oembedResult.value ?? null;
  const transcript = transcriptResult.value ?? null;
  const images = imagesResult.value ?? [];
  const ytDescription = descriptionResult.value ?? null;

  const warnings = [];
  if (!transcript) warnings.push('Trascrizione non disponibile: la sinossi è basata solo sull\'analisi visiva del video.');

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
    prompt += `\n\nIMMAGINI: Le ${images.length} immagini sono fotogrammi del video (inizio, 25%, 50%, 75% della durata). Descrivono i luoghi, le persone e le azioni visibili.`;
  }

  if (transcript) {
    const truncated = transcript.length > 4000 ? transcript.slice(0, 4000) + '...' : transcript;
    prompt += `\n\nTRASCRIZIONE DEL PARLATO (fonte principale):\n${truncated}`;
    prompt += `\n\nUsa la trascrizione per descrivere cosa viene detto: dialoghi, voci, testi parlati. Le immagini completano con ciò che si vede.`;
  }

  if (ytDescription) {
    const truncated = ytDescription.length > 600 ? ytDescription.slice(0, 600) + '...' : ytDescription;
    prompt += `\n\nDESCRIZIONE YOUTUBE (contesto aggiuntivo):\n${truncated}`;
  }

  prompt += `\n\nScrivi in italiano, 2-4 frasi, testo semplice senza formattazione.`;
  if (transcript) {
    prompt += ` Integra quello che si vede con quello che viene detto. Riporta i contenuti del parlato in modo diretto e fedele.`;
  } else {
    prompt += ` Descrivi solo i fatti visibili: chi si vede, dove, cosa fa.`;
  }

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
