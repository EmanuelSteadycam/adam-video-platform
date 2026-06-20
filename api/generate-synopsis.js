const Anthropic = require('@anthropic-ai/sdk');
const { YoutubeTranscript } = require('youtube-transcript');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractVideoId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

async function fetchTranscript(videoId) {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items?.length) return items.map(i => i.text).join(' ').slice(0, 8000);
  } catch (e) {
    console.log('[transcript] failed:', e.message);
  }
  return null;
}

// Proba i.ytimg.com direttamente — CDN pubblico, non bloccato come youtube.com
async function fetchStoryboardUrls(videoId) {
  for (const level of ['L3', 'L2', 'L1', 'L0']) {
    const baseUrl = `https://i.ytimg.com/sb/${videoId}/storyboard3_${level}/M`;
    const urls = Array.from({ length: 8 }, (_, i) => `${baseUrl}${i}.jpg`);
    const checks = await Promise.all(
      urls.map(url =>
        fetch(url, { method: 'HEAD' }).then(r => r.ok ? url : null).catch(() => null)
      )
    );
    const valid = checks.filter(Boolean);
    console.log(`[storyboard] ${level}: ${valid.length} sheets found`);
    if (valid.length > 0) {
      if (valid.length <= 4) return valid;
      const n = valid.length;
      return [valid[0], valid[Math.floor(n / 3)], valid[Math.floor(2 * n / 3)], valid[n - 1]];
    }
  }
  console.log('[storyboard] no sheets found for any level');
  return [];
}

async function downloadAsBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString('base64');
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { youtubeUrl, title, tema } = req.body ?? {};
  if (!youtubeUrl) return res.status(400).json({ error: 'URL YouTube mancante.' });

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube non valido.' });

  console.log(`[synopsis] videoId=${videoId} title="${title}" tema="${tema}"`);

  const [transcriptResult, storyboardResult] = await Promise.allSettled([
    fetchTranscript(videoId),
    fetchStoryboardUrls(videoId),
  ]);

  const transcript = transcriptResult.value ?? null;
  const sheetUrls = storyboardResult.value ?? [];

  console.log(`[synopsis] transcript=${!!transcript} sheets=${sheetUrls.length}`);

  // Scarica le immagini e le converte in base64 (Claude non dipende da URL esterni)
  const images = sheetUrls.length
    ? (await Promise.all(sheetUrls.map(downloadAsBase64))).filter(Boolean)
    : [];

  console.log(`[synopsis] images downloaded=${images.length}`);

  const warnings = [];
  if (!transcript) warnings.push("Trascrizione non disponibile: la sinossi è basata solo sull'analisi visiva.");
  if (!images.length) warnings.push('Frame visivi non disponibili: la sinossi è basata solo sulla trascrizione.');

  if (!transcript && !images.length) {
    return res.status(422).json({
      error: 'Impossibile generare la sinossi: né trascrizione né frame visivi sono disponibili per questo video.',
    });
  }

  const content = [];

  // Immagini come base64
  for (const data of images) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
  }

  let prompt = `Sei un esperto di analisi video per ADAM, una piattaforma educativa italiana dedicata ai temi delle dipendenze (alcool, azzardo, digitale, sostanze, tabacco, sessualità).\n\nStai analizzando un video YouTube`;
  if (title) prompt += ` intitolato "${title}"`;
  if (tema) prompt += ` (tema ADAM: ${tema})`;
  prompt += '.';

  if (images.length) {
    prompt += `\n\nLe ${images.length} immagini allegate sono griglie di miniature (storyboard YouTube) che coprono il video dall'inizio alla fine. Ogni griglia contiene decine di frame in sequenza temporale, da sinistra a destra e dall'alto verso il basso. Analizzale per comprendere ambientazione, personaggi, atmosfera e stile visivo.`;
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
    console.log(`[synopsis] done, usage=${JSON.stringify(message.usage)}`);
    return res.json({ synopsis: message.content[0].text.trim(), warnings });
  } catch (err) {
    console.error('[claude]', err.message);
    return res.status(500).json({ error: `Errore Claude: ${err.message}` });
  }
};
