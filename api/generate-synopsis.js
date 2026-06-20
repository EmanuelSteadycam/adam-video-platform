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
    return items?.length ? items.map(i => i.text).join(' ').slice(0, 8000) : null;
  } catch {
    return null;
  }
}

async function fetchStoryboardUrls(videoId) {
  try {
    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    }).then(r => r.text());

    const specMatch = html.match(/"playerStoryboardSpecRenderer"\s*:\s*\{"spec"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (!specMatch) return [];

    // JSON.parse handles all escape sequences (\/, &, etc.)
    const spec = JSON.parse('"' + specMatch[1] + '"');

    // Levels are separated by '$https://'
    const levels = spec.split('$https://').map((l, i) => (i === 0 ? l : 'https://' + l));

    // URL template is the part before the first '|' in each level
    const templates = levels
      .map(l => l.split('|')[0])
      .filter(t => t.startsWith('https://') && t.includes('$M'));

    if (!templates.length) return [];

    // Use highest quality level (last entry has largest thumbnails)
    const template = templates[templates.length - 1];

    // Probe which sheets exist (up to 8 in parallel)
    const candidates = Array.from({ length: 8 }, (_, i) => template.replace('$M', String(i)));
    const checks = await Promise.all(
      candidates.map(url =>
        fetch(url, { method: 'HEAD' }).then(r => (r.ok ? url : null)).catch(() => null)
      )
    );
    const valid = checks.filter(Boolean);
    if (!valid.length) return [];

    // Sample up to 4 sheets spread evenly across the video
    if (valid.length <= 4) return valid;
    const n = valid.length;
    return [valid[0], valid[Math.floor(n / 3)], valid[Math.floor((2 * n) / 3)], valid[n - 1]];
  } catch (err) {
    console.error('[storyboard]', err.message);
    return [];
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { youtubeUrl, title, tema } = req.body ?? {};
  if (!youtubeUrl) return res.status(400).json({ error: 'URL YouTube mancante.' });

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube non valido.' });

  const [transcriptResult, storyboardResult] = await Promise.allSettled([
    fetchTranscript(videoId),
    fetchStoryboardUrls(videoId),
  ]);

  const transcript = transcriptResult.value ?? null;
  const sheetUrls = storyboardResult.value ?? [];

  const warnings = [];
  if (!transcript) warnings.push("Trascrizione non disponibile: la sinossi è basata solo sull'analisi visiva.");
  if (!sheetUrls.length) warnings.push('Frame visivi non disponibili: la sinossi è basata solo sulla trascrizione.');

  if (!transcript && !sheetUrls.length) {
    return res.status(422).json({
      error: 'Impossibile generare la sinossi: né trascrizione né frame visivi sono disponibili per questo video.',
    });
  }

  const content = [];

  // Storyboard sprite sheets as image URLs (Claude le recupera direttamente)
  for (const url of sheetUrls) {
    content.push({ type: 'image', source: { type: 'url', url } });
  }

  let prompt = `Sei un esperto di analisi video per ADAM, una piattaforma educativa italiana dedicata ai temi delle dipendenze (alcool, azzardo, digitale, sostanze, tabacco, sessualità).\n\nStai analizzando un video YouTube`;
  if (title) prompt += ` intitolato "${title}"`;
  if (tema) prompt += ` (tema ADAM: ${tema})`;
  prompt += '.';

  if (sheetUrls.length) {
    prompt += `\n\nLe ${sheetUrls.length} immagini allegate sono griglie di miniature (storyboard YouTube) che coprono il video dall'inizio alla fine. Ogni griglia contiene decine di frame in sequenza temporale, da sinistra a destra e dall'alto verso il basso. Analizzale per comprendere ambientazione, personaggi, atmosfera e stile visivo.`;
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

    return res.json({ synopsis: message.content[0].text.trim(), warnings });
  } catch (err) {
    console.error('[claude]', err.message);
    return res.status(500).json({ error: `Errore Claude: ${err.message}` });
  }
};
