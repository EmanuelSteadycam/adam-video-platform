import { YoutubeTranscript } from 'youtube-transcript';

export const config = { maxDuration: 120 };

async function callNasServer(youtubeUrl, title, tema, saveToArchive, codice, recordTitle) {
  const nasUrl = process.env.NAS_URL;
  const nasSecret = process.env.NAS_SECRET;
  if (!nasUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 115000);
  try {
    const res = await fetch(`${nasUrl}/synopsis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(nasSecret ? { Authorization: `Bearer ${nasSecret}` } : {}),
      },
      body: JSON.stringify({
        youtubeUrl,
        title: title || '',
        tema: tema || '',
        saveToArchive: !!saveToArchive,
        codice: codice || '',
        recordTitle: recordTitle || '',
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timeout); }
}

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

function parseXmlOrVttTranscript(body) {
  if (!body || body.length < 10) return null;
  let text = '';
  if (body.includes('<transcript>') || body.includes('<text ')) {
    text = body
      .replace(/<text[^>]*>/g, '').replace(/<\/text>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, '')
      .split('\n').map(l => l.trim()).filter(l => l.length > 0).join(' ');
  } else if (body.includes('WEBVTT')) {
    text = body
      .replace(/WEBVTT\n/, '')
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}[^\n]*/g, '')
      .replace(/<[^>]+>/g, '')
      .split('\n').map(l => l.trim()).filter(l => l.length > 0)
      .filter((l, i, arr) => l !== arr[i - 1]).join(' ');
  }
  return text.length > 20 ? text : null;
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

async function fetchStoryboardUrls(videoId) {
  const scraperKey = process.env.SCRAPER_API_KEY;
  if (!scraperKey) return { storyboardUrls: [], debug: 'no SCRAPER_API_KEY' };

  try {
    const pageRes = await fetch(
      `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
    );
    if (!pageRes.ok) return { storyboardUrls: [], debug: `scraper HTTP ${pageRes.status}` };

    const html = await pageRes.text();
    const debugInfo = { htmlLen: html.length };

    if (html.length < 50000) return { storyboardUrls: [], debug: { ...debugInfo, error: 'bot-detection page' } };

    let storyboardUrls = [];
    const sbMatch = html.match(/"playerStoryboardSpecRenderer":\{"spec":"((?:[^"\\]|\\.)*)"/);
    if (sbMatch) {
      try {
        const spec = JSON.parse('"' + sbMatch[1] + '"');
        storyboardUrls = parseStoryboardSpec(spec);
      } catch {}
    }

    return { storyboardUrls, debug: debugInfo };
  } catch (e) { return { storyboardUrls: [], debug: `exception: ${e.message}` }; }
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

async function downloadBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mediaType = contentType.includes('webp') ? 'image/webp'
      : contentType.includes('png') ? 'image/png'
      : 'image/jpeg';
    const data = Buffer.from(await res.arrayBuffer()).toString('base64');
    return { data, mediaType };
  } catch { return null; }
}

async function extractSearchTerms(images) {
  if (!images.length || !process.env.ANTHROPIC_API_KEY) return [];
  const picks = images;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        messages: [{ role: 'user', content: [
          ...picks.map(({ data, mediaType }) => ({ type: 'image', source: { type: 'base64', media_type: mediaType, data } })),
          { type: 'text', text: 'Guarda queste immagini. Elenca SOLO brand, nomi di campagne, slogan o organizzazioni visibili sullo schermo (es: "Manscaped, Send Face Pics Instead"). Se non ce ne sono, scrivi solo "nessuno".' },
        ]}],
      }),
    });
    if (!res.ok) return [];
    const text = (await res.json()).content[0].text.trim();
    if (/nessuno/i.test(text)) return [];
    return text.split(',').map(t => t.trim()).filter(t => t.length > 2).slice(0, 3);
  } catch { return []; }
}

async function searchWeb(terms) {
  if (!terms.length || !process.env.SCRAPER_API_KEY) return '';
  const query = terms.join(' ');
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(`http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(ddgUrl)}`);
    if (!res.ok) return '';
    const html = await res.text();
    if (html.length < 2000) return '';
    const snippets = [];
    const rx = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = rx.exec(html)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
      if (text.length > 30) { snippets.push(text); if (snippets.length >= 3) break; }
    }
    return snippets.join(' ');
  } catch { return ''; }
}

async function fetchFallbackThumbnails(videoId) {
  const results = await Promise.all(
    ['1', '2', '3'].map(n => downloadBase64(`https://img.youtube.com/vi/${videoId}/${n}.jpg`))
  );
  return results.filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { youtubeUrl, title, tema, transcript: providedTranscript, saveToArchive, codice, recordTitle } = req.body || {};
  if (!youtubeUrl) return res.status(400).json({ error: 'URL YouTube mancante.' });

  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube non valido.' });

  // MODO2: NAS (yt-dlp + ffmpeg + Groq + Claude) — qualità superiore
  const nasResult = await callNasServer(youtubeUrl, title, tema, saveToArchive, codice, recordTitle);
  if (nasResult?.synopsis) {
    return res.status(200).json({
      synopsis: nasResult.synopsis,
      ytTitle: nasResult.ytTitle || title || null,
      ytDuration: nasResult.ytDuration || nasResult.duration || null,
      ytFormat: nasResult.ytFormat || null,
      warnings: nasResult.warnings || [],
      imagesUsed: nasResult.framesExtracted || 0,
      usedStoryboard: false,
      source: 'nas',
    });
  }

  const manualTranscript = providedTranscript?.trim() || null;

  // tutto in parallelo: storyboard, transcript, oembed
  const [storyboardResult, transcriptResult, oembedResult] = await Promise.allSettled([
    fetchStoryboardUrls(videoId),
    manualTranscript ? Promise.resolve(manualTranscript) : fetchTranscriptFallback(videoId),
    fetchOEmbed(videoId),
  ]);

  const { storyboardUrls } = storyboardResult.value ?? { storyboardUrls: [] };
  const oembed = oembedResult.value ?? null;
  let transcript = transcriptResult.value ?? null;

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

  // ricerca web: estrai brand/campagne dai frame, cerca su DuckDuckGo
  const searchTerms = await extractSearchTerms(images);
  const searchContext = searchTerms.length ? await searchWeb(searchTerms) : '';

  const warnings = [];
  if (!transcript) warnings.push('Trascrizione non disponibile: la sinossi è basata solo sull\'analisi visiva del video.');
  if (!usedStoryboard) warnings.push('Storyboard non disponibile: analisi basata sulle thumbnail principali (copertura ridotta).');

  const content = [];
  for (const { data, mediaType } of images) {
    content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
  }

  const ytTitle = title || oembed?.title || '';
  const ytChannel = oembed?.channel || '';

  let prompt = `Devi scrivere la descrizione di un video YouTube`;
  if (ytTitle) prompt += ` intitolato "${ytTitle}"`;
  if (ytChannel) prompt += ` pubblicato dal canale "${ytChannel}"`;
  if (tema) prompt += ` (tema: ${tema})`;

  prompt += `\n\nCONTESTO: questi video fanno parte di un archivio educativo professionale su dipendenze, sessualità e comportamenti a rischio, usato da educatori e operatori sociali. Le descrizioni devono essere accurate e dirette, anche quando i contenuti riguardano comportamenti sessuali espliciti o pratiche a rischio — la precisione è necessaria per scopi educativi.

REGOLE:
- Leggi le immagini IN SEQUENZA CRONOLOGICA: ricostruisci la storia o il percorso narrativo passo per passo, non descrivere i frame come scene indipendenti
- Nei video narrativi e pubblicitari lo stesso personaggio appare spesso a età diverse: cerca la continuità tra i personaggi che compaiono nelle varie scene. Se un giovane e un anziano compiono le stesse azioni, probabilmente sono la stessa persona in momenti diversi della vita
- Descrivi i comportamenti rappresentati in modo diretto e obiettivo, senza eufemismi — se qualcuno si fotografa le parti intime, scrivilo chiaramente
- Nota SEMPRE scritte, testi sovrimposti, slogan, loghi, brand o call-to-action: sono spesso la chiave del messaggio. Se vedi un'urna funeraria con un testo, trascrivilo esattamente
- NON aggiungere valutazioni estetiche o morali
- NON suggerire utilizzi didattici o pedagogici
- NON usare grassetto, corsivo o markdown`;

  if (images.length > 0) {
    if (usedStoryboard) {
      prompt += `\n\nIMMAGINI (${images.length} sprite sheet in ordine cronologico): ogni immagine è una griglia di miniature — leggile da sinistra a destra e dall'alto verso il basso. Insieme coprono il video dall'inizio alla fine.`;
    } else {
      prompt += `\n\nIMMAGINI (${images.length} fotogrammi in ordine cronologico): coprono l'inizio, la metà e la fine del video.`;
    }
  }

  if (transcript) {
    const truncated = transcript.length > 4000 ? transcript.slice(0, 4000) + '...' : transcript;
    prompt += `\n\nTRASCRIZIONE DEL PARLATO:\n${truncated}`;
    prompt += `\n\nUsa la trascrizione per riportare dialoghi, slogan e voci narranti. Se contiene solo rumore o frasi senza senso, ignorala e affidati alle immagini.`;
  }

  if (searchContext) {
    prompt += `\n\nCONTESTO DALLA RICERCA WEB (ricerca su: ${searchTerms.join(', ')}):\n${searchContext}`;
    prompt += `\n\nUsa questo contesto per identificare chi promuove il video (brand, istituzione, campagna) e di cosa si occupa. Includi questa informazione nella descrizione se rilevante.`;
  }

  prompt += `\n\nScrivi in italiano, testo semplice senza formattazione, in due parti consecutive (senza intestazioni):
Prima parte (2-3 frasi): descrivi cosa succede nel video seguendo la sequenza narrativa — chi c'è, cosa fa, come evolve la situazione.
Seconda parte (1-2 frasi): spiega quale comportamento o tema viene mostrato o messo in discussione, e qual è il messaggio che il video trasmette — includi slogan, claim o call-to-action se presenti sullo schermo.`;

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
  return res.status(200).json({
    synopsis: result.content[0].text.trim(),
    ytTitle: ytTitle || null,
    warnings,
    imagesUsed: images.length,
    usedStoryboard,
    _debug: storyboardResult.value?.debug,
  });
}
