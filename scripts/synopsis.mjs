#!/usr/bin/env node
// Genera una sinossi per un video YouTube e la salva in synopsis-output.txt
// Uso: node --env-file=.env scripts/synopsis.mjs <youtube-url>

import { YoutubeTranscript } from 'youtube-transcript';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

const youtubeUrl = process.argv[2];
if (!youtubeUrl) {
  console.error('Uso: node --env-file=.env scripts/synopsis.mjs <youtube-url>');
  process.exit(1);
}

function extractVideoId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

const videoId = extractVideoId(youtubeUrl);
if (!videoId) {
  console.error('URL YouTube non valido.');
  process.exit(1);
}

console.log(`\nVideo ID: ${videoId}`);
console.log('Recupero dati...\n');

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

async function fetchOEmbed(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!res.ok) return null;
    const d = await res.json();
    return { title: d.title || '', channel: d.author_name || '' };
  } catch { return null; }
}

async function fetchThumbnailBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString('base64');
  } catch { return null; }
}

const [transcript, oembed, ...thumbResults] = await Promise.all([
  fetchTranscript(videoId),
  fetchOEmbed(videoId),
  ...['1', '2', '3'].map(n =>
    fetchThumbnailBase64(`https://img.youtube.com/vi/${videoId}/${n}.jpg`)
  ),
]);

const images = thumbResults.filter(Boolean);

console.log(`Trascrizione: ${transcript ? `✓ (${transcript.length} caratteri)` : '✗ non disponibile'}`);
console.log(`Thumbnail: ${images.length}/4`);
console.log(`Titolo: ${oembed?.title || '—'}`);
console.log('\nChiamo Claude...\n');

const content = [];
for (const data of images) {
  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
}

let prompt = `Devi scrivere la descrizione di un video YouTube`;
if (oembed?.title) prompt += ` intitolato "${oembed.title}"`;
if (oembed?.channel) prompt += ` pubblicato dal canale "${oembed.channel}"`;

prompt += `\n\nREGOLE ASSOLUTE:
- Descrivi SOLO quello che è visibile nelle immagini e/o viene detto nella trascrizione
- NON interpretare, NON dedurre, NON giudicare
- NON dire cosa "vuole comunicare" il video o qual è il suo "messaggio"
- NON suggerire utilizzi didattici o pedagogici
- NON usare grassetto, corsivo o markdown
- NON aggiungere valutazioni estetiche o morali`;

if (images.length > 0) {
  prompt += `\n\nIMMAGINI (${images.length} fotogrammi): circa 25%, 50% e 75% della durata del video — in ordine cronologico. NON dedurre cosa succede all'inizio o alla fine basandoti solo su queste immagini.`;
}

if (transcript) {
  const truncated = transcript.length > 4000 ? transcript.slice(0, 4000) + '...' : transcript;
  prompt += `\n\nTRASCRIZIONE DEL PARLATO (fonte principale):\n${truncated}`;
  prompt += `\n\nUsa la trascrizione per riportare fedelmente cosa viene detto: dialoghi, voci, testi parlati. Le immagini completano con ciò che si vede.`;
}

prompt += `\n\nScrivi in italiano, 2-4 frasi, testo semplice senza formattazione.`;
prompt += transcript
  ? ` Integra quello che si vede con quello che viene detto. Riporta i contenuti del parlato in modo diretto e fedele.`
  : ` Descrivi solo i fatti visibili: chi si vede, dove, cosa fa.`;

content.push({ type: 'text', text: prompt });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 600,
  messages: [{ role: 'user', content }],
});

const synopsis = message.content[0].text.trim();

const outputPath = 'synopsis-output.txt';
const outputContent = [
  `URL: ${youtubeUrl}`,
  `Titolo: ${oembed?.title || '—'}`,
  `Canale: ${oembed?.channel || '—'}`,
  `Trascrizione: ${transcript ? 'sì' : 'no (sinossi basata solo su immagini)'}`,
  '',
  'SINOSSI:',
  synopsis,
  '',
  `Generata il: ${new Date().toLocaleString('it-IT')}`,
].join('\n');

writeFileSync(outputPath, outputContent, 'utf8');
console.log('Sinossi generata:\n');
console.log(synopsis);
console.log(`\nSalvata in: ${outputPath}`);

try {
  execSync(`open "${outputPath}"`);
} catch {}
