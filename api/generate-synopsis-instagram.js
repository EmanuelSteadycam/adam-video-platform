// Sinossi automatica Instagram da link, via Apify (Instagram Reel Scraper).
// A differenza di TikTok/YouTube, NON scarica il video né estrae fotogrammi — deciso
// dopo un test reale in cui il download video via Apify è rimasto bloccato per 4+ minuti
// fino al timeout dell'Actor su un singolo reel, senza errore (log run
// FdqbJemwyQ0kkEX1F). La trascrizione da sola arrivava invece in pochi secondi.
// Claude scrive quindi la sinossi solo da caption + trascrizione testuale — più veloce
// e affidabile, con il compromesso di non "vedere" il video (nessun dettaglio visivo
// non menzionato a voce o in didascalia).

export const config = { maxDuration: 60 };

const INSTAGRAM_ACTOR = 'apify~instagram-reel-scraper';

function buildPrompt(title, tema, caption, transcript) {
  let prompt = `Devi scrivere la descrizione di un video`;
  if (title) prompt += ` intitolato "${title}"`;
  if (tema) prompt += ` (tema: ${tema})`;

  prompt += `\n\nCONTESTO: questi video fanno parte di un archivio educativo professionale su dipendenze, sessualità e comportamenti a rischio, usato da educatori e operatori sociali. Le descrizioni devono essere accurate e dirette, anche quando i contenuti riguardano comportamenti sessuali espliciti o pratiche a rischio — la precisione è necessaria per scopi educativi.

REGOLE:
- Hai a disposizione SOLO la didascalia del post e la trascrizione audio, NON hai visto le immagini del video: basati esclusivamente su questo testo, senza inventare o presumere dettagli visivi non menzionati
- Descrivi i comportamenti e i contenuti in modo diretto e obiettivo, senza eufemismi
- Nota SEMPRE slogan, claim, call-to-action o nomi di brand/organizzazioni menzionati nel testo
- NON aggiungere valutazioni estetiche o morali
- NON suggerire utilizzi didattici o pedagogici
- NON usare grassetto, corsivo o markdown`;

  if (caption) prompt += `\n\nDIDASCALIA DEL POST:\n${caption}`;

  const isUsableTranscript = transcript && transcript.length > 40 && transcript.split(' ').length > 8;
  if (isUsableTranscript) {
    const truncated = transcript.length > 4000 ? transcript.slice(0, 4000) + '...' : transcript;
    prompt += `\n\nTRASCRIZIONE AUDIO:\n${truncated}`;
  }

  prompt += `\n\nScrivi in italiano, testo semplice senza formattazione, in due parti consecutive (senza intestazioni):
Prima parte (2-3 frasi): riassumi cosa viene detto o descritto nel video in base al testo disponibile.
Seconda parte (1-2 frasi): spiega quale comportamento o tema viene trattato e qual è il messaggio che il video trasmette — includi slogan o call-to-action se presenti nel testo.`;

  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.APIFY_TOKEN) return res.status(500).json({ error: 'APIFY_TOKEN non configurato.' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  const { youtubeUrl, title = '', tema = '' } = req.body || {};
  if (!youtubeUrl) return res.status(400).json({ error: 'url mancante.' });

  const token = process.env.APIFY_TOKEN;

  try {
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${INSTAGRAM_ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=55`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: [youtubeUrl], resultsLimit: 1, includeTranscript: true, includeDownloadedVideo: false }),
      }
    );
    const items = await apifyRes.json();
    if (!apifyRes.ok) {
      return res.status(502).json({ error: `Apify ha risposto ${apifyRes.status}.` });
    }
    const item = Array.isArray(items) ? items[0] : null;
    if (!item) {
      return res.status(502).json({ error: 'Instagram non ha restituito risultati (video privato, rimosso, o URL non valido).' });
    }

    const caption = (item.caption || '').trim();
    const transcript = (item.transcript || '').trim();
    const warnings = [];
    if (!transcript) warnings.push('Trascrizione non disponibile: sinossi basata solo sulla didascalia del post.');

    const prompt = buildPrompt(title || caption, tema, caption, transcript);

    const retryDelays = [0, 8000, 15000, 20000];
    let anthropicRes;
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (retryDelays[attempt] > 0) await new Promise(r => setTimeout(r, retryDelays[attempt]));
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 600,
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
        }),
      });
      if (anthropicRes.status !== 529) break;
    }
    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      return res.status(500).json({ error: `Errore Claude: ${err.error?.message || anthropicRes.status}` });
    }
    const synopsis = (await anthropicRes.json()).content[0].text.trim();

    return res.status(200).json({
      synopsis,
      transcript: transcript || null,
      warnings,
      ytTitle: caption || null,
      ytDuration: item.videoDuration ? `${Math.floor(item.videoDuration / 60)}:${String(Math.round(item.videoDuration % 60)).padStart(2, '0')}` : null,
      ytFormat: 'verticale',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Errore imprevisto nella generazione della sinossi Instagram.' });
  }
}
