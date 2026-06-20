const Anthropic = require('@anthropic-ai/sdk');
const { YoutubeTranscript } = require('youtube-transcript');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractVideoId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

// Thumbnail standard YouTube — sempre accessibili, nessuna auth richiesta
// 0.jpg = thumbnail principale, 1/2/3.jpg = frame a ~25/50/75% del video
async function fetchThumbnails(videoId) {
  const urls = ['0', '1', '2', '3'].map(n => `https://img.youtube.com/vi/${videoId}/${n}.jpg`);
  const images = await Promise.all(
    urls.map(async url => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        return Buffer.from(buf).toString('base64');
      } catch {
        return null;
      }
    })
  );
  return images.filter(Boolean);
}

async function fetchTranscript(videoId) {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items?.length) return items.map(i => i.text).join(' ').slice(0, 8000);
  } catch (e) {
    console.log('[transcript] not available:', e.message?.slice(0, 100));
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { youtubeUrl, title, tema } = req.body ?? {};
  if (!youtubeUrl) return res.status(400).json({ error: 'URL YouTube mancante.' });

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube non valido.' });

  console.log(`[synopsis] videoId=${videoId}`);

  // Thumbnail e trascrizione in parallelo
  const [thumbnailsResult, transcriptResult] = await Promise.allSettled([
    fetchThumbnails(videoId),
    fetchTranscript(videoId),
  ]);

  const images = thumbnailsResult.value ?? [];
  const transcript = transcriptResult.value ?? null;

  console.log(`[synopsis] images=${images.length} transcript=${!!transcript}`);

  const warnings = [];
  if (!transcript) warnings.push('Trascrizione non disponibile: la sinossi è basata sull\'analisi visiva del video.');

  const content = [];

  for (const data of images) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
  }

  let prompt = `Sei un esperto di analisi video per ADAM, una piattaforma educativa italiana dedicata ai temi delle dipendenze (alcool, azzardo, digitale, sostanze, tabacco, sessualità).\n\nStai analizzando un video YouTube`;
  if (title) prompt += ` intitolato "${title}"`;
  if (tema) prompt += ` (tema ADAM: ${tema})`;
  prompt += '.';

  if (images.length) {
    prompt += `\n\nLe ${images.length} immagini mostrano fotogrammi del video a intervalli regolari (inizio, 25%, 50%, 75%). Analizzale per comprendere ambientazione, personaggi, atmosfera e stile visivo.`;
  }

  if (transcript) {
    prompt += `\n\nTRASCRIZIONE COMPLETA DEL VIDEO:\n${transcript}`;
  }

  prompt += `\n\nScrivi una sinossi in italiano di 3-5 righe che descriva:
- Il tema principale e il messaggio del video
- Il contesto visivo (luoghi, personaggi, stile)
- L'approccio narrativo (emotivo, informativo, narrativo, shock...)
- L'utilità didattica per un educatore che vuole usarlo in classe

Non iniziare con "Il video" o "Questo video". Scrivi in modo diretto e denso.
Rispondi SOLO con il testo della sinossi, senza titoli o note aggiuntive.`;

  content.push({ type: 'text', text: prompt });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content }],
    });
    console.log(`[synopsis] done usage=${JSON.stringify(message.usage)}`);
    return res.json({ synopsis: message.content[0].text.trim(), warnings });
  } catch (err) {
    console.error('[claude]', err.message);
    return res.status(500).json({ error: `Errore Claude: ${err.message}` });
  }
};
