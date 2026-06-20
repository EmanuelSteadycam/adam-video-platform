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
    console.log('[transcript] not available:', e.message?.slice(0, 80));
  }
  return null;
}

// Sprite sheet storyboard con URL firmate (sqp + rs) dalla spec YouTube
async function fetchStoryboardUrls(videoId) {
  try {
    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    }).then(r => r.text());

    const specMatch = html.match(/"playerStoryboardSpecRenderer"\s*:\s*\{"spec"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (!specMatch) { console.log('[storyboard] spec not found in page'); return []; }

    const spec = JSON.parse('"' + specMatch[1] + '"');
    const parts = spec.split('|');
    const baseUrlTemplate = parts[0]; // https://i.ytimg.com/sb/{id}/storyboard3_L$L/$N.jpg?sqp=SQP

    // Livelli: ogni parte dopo la prima è "width#height#count#cols#rows#interval#template#rs$SIG"
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

    // Usa il livello più alto con sprite multipli (template M$M)
    const valid = levels.filter(l => l.template.includes('$M') && l.rs && l.count > 0);
    if (!valid.length) { console.log('[storyboard] no usable levels'); return []; }

    const chosen = valid[valid.length - 1]; // livello più alto = frame più grandi
    const framesPerSheet = chosen.cols * chosen.rows;
    const numSheets = Math.ceil(chosen.count / framesPerSheet);

    console.log(`[storyboard] level=${chosen.level} ${chosen.cols}x${chosen.rows} sheets=${numSheets}`);

    // Costruisce gli URL firmati: sostituisce $L, $N, aggiunge &rs=
    const urls = [];
    for (let i = 0; i < numSheets; i++) {
      const filename = chosen.template.replace('$M', String(i));
      const url = baseUrlTemplate
        .replace('$L', String(chosen.level))
        .replace('$N', filename)
        + '&rs=' + chosen.rs;
      urls.push(url);
    }

    // Se più di 6 sheet, campiona in modo uniforme
    if (urls.length <= 6) return urls;
    const n = urls.length;
    const indices = [0, 0.2, 0.4, 0.6, 0.8, 1].map(f => Math.min(Math.floor(f * n), n - 1));
    return [...new Set(indices)].map(i => urls[i]);
  } catch (err) {
    console.log('[storyboard] error:', err.message?.slice(0, 80));
    return [];
  }
}

// Thumbnail standard come fallback garantito (sempre accessibili)
async function fetchFallbackThumbnails(videoId) {
  const urls = ['0', '1', '2', '3'].map(n => `https://img.youtube.com/vi/${videoId}/${n}.jpg`);
  const images = await Promise.all(
    urls.map(async url => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer()).toString('base64');
      } catch { return null; }
    })
  );
  return images.filter(Boolean);
}

async function downloadAsBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString('base64');
  } catch { return null; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { youtubeUrl, title, tema } = req.body ?? {};
  if (!youtubeUrl) return res.status(400).json({ error: 'URL YouTube mancante.' });

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube non valido.' });

  console.log(`[synopsis] videoId=${videoId}`);

  const [transcriptResult, storyboardResult] = await Promise.allSettled([
    fetchTranscript(videoId),
    fetchStoryboardUrls(videoId),
  ]);

  const transcript = transcriptResult.value ?? null;
  let sheetUrls = storyboardResult.value ?? [];

  // Fallback a thumbnail standard se storyboard non disponibile
  let images = [];
  let usedStoryboard = false;
  if (sheetUrls.length > 0) {
    images = (await Promise.all(sheetUrls.map(downloadAsBase64))).filter(Boolean);
    if (images.length > 0) usedStoryboard = true;
  }
  if (!usedStoryboard) {
    images = await fetchFallbackThumbnails(videoId);
    console.log(`[synopsis] using fallback thumbnails: ${images.length}`);
  }

  console.log(`[synopsis] storyboard=${usedStoryboard} images=${images.length} transcript=${!!transcript}`);

  const warnings = [];
  if (!transcript) warnings.push('Trascrizione non disponibile: la sinossi è basata sull\'analisi visiva del video.');
  if (!usedStoryboard) warnings.push('Storyboard non disponibile: analisi basata sulle thumbnail principali (copertura ridotta).');

  const content = [];
  for (const data of images) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
  }

  let prompt = `Devi scrivere la descrizione di un video YouTube`;
  if (title) prompt += ` intitolato "${title}"`;
  if (tema) prompt += ` (tema: ${tema})`;
  prompt += `.\n\nREGOLE ASSOLUTE — non derogabili:
- Descrivi SOLO quello che è effettivamente visibile nelle immagini o udibile nella trascrizione
- NON interpretare, NON dedurre, NON giudicare
- NON dire cosa "vuole comunicare" il video, qual è il suo "messaggio" o il suo "approccio"
- NON suggerire utilizzi didattici né dare consigli agli educatori
- NON usare grassetto, corsivo o altri formati markdown
- NON aggiungere valutazioni estetiche
- Se non hai la trascrizione, descrivi solo le immagini senza inventare dialoghi`;

  if (images.length) {
    const frameDesc = usedStoryboard
      ? `Le ${images.length} immagini sono sprite sheet (griglie di miniature) che coprono il video dall'inizio alla fine — ogni griglia contiene più frame in sequenza temporale, da sinistra a destra e dall'alto verso il basso.`
      : `Le ${images.length} immagini sono fotogrammi del video (inizio, 25%, 50%, 75%).`;
    prompt += `\n\nIMMAGINI: ${frameDesc} Descrivi cosa si vede: luoghi, persone, azioni visibili.`;
  }

  if (transcript) {
    prompt += `\n\nTRASCRIZIONE (quello che viene detto nel video):\n${transcript}`;
  } else {
    prompt += `\n\nNota: non è disponibile la trascrizione audio. Descrivi solo quello che è visibile nelle immagini.`;
  }

  prompt += `\n\nScrivi la descrizione in italiano, 2-4 frasi, testo semplice senza formattazione. Descrivi i fatti: chi si vede, dove, cosa fa o dice. Nient'altro.`;

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
