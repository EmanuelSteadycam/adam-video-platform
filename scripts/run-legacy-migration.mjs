import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync('/Users/emam1/Desktop/adam-video-platform/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const OLD_SCHEME_RE = /^HD(\d+)-(\d+)$/;

function findLegacyMatches(video, files) {
  const codice = (video.codice || video.id || '').trim();
  const m = codice.match(OLD_SCHEME_RE);
  if (!m) return [];
  const folderNum = m[1];
  const fileNum = parseInt(m[2], 10);
  return files.filter(f => {
    if (!f.startsWith('ADAM OLD/')) return false;
    const parts = f.split('/');
    const filename = parts[parts.length - 1];
    const parentFolder = parts[parts.length - 2] || '';
    if (!parentFolder.startsWith(folderNum)) return false;
    const fnMatch = filename.match(/^(\d+)\s/);
    return !!fnMatch && parseInt(fnMatch[1], 10) === fileNum;
  });
}

async function main() {
  const [videosRes, filesRes] = await Promise.all([
    fetch(`${env.VITE_SUPABASE_URL}/rest/v1/videos?select=id,codice,tema,temi,natura,title`, {
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
    }),
    fetch(`${env.NAS_URL}/list-files`, { method: 'POST', headers: { Authorization: `Bearer ${env.NAS_SECRET}` } }),
  ]);
  const videos = await videosRes.json();
  const filesData = await filesRes.json();
  let files = filesData.files || [];

  const moved = [];
  const skipped = [];

  for (const video of videos) {
    const codice = (video.codice || video.id || '').trim();
    // già nel nuovo schema: niente da fare
    if (files.some(f => f.split('/').pop().startsWith(`${codice}-`))) continue;
    const matches = findLegacyMatches(video, files);
    if (matches.length === 0) continue; // non è nel vecchio schema, o davvero mancante
    if (matches.length > 1) { skipped.push({ codice, reason: `ambiguo (${matches.length} candidati)` }); continue; }

    const temiArr = video.temi && video.temi.length ? video.temi : (video.tema ? [video.tema] : []);
    const tema = temiArr[0] || video.tema;
    if (!tema || !video.natura) { skipped.push({ codice, reason: 'tema o natura mancante sul record' }); continue; }

    try {
      const res = await fetch(`${env.NAS_URL}/migrate-legacy-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.NAS_SECRET}` },
        body: JSON.stringify({ oldRelativePath: matches[0], tema, natura: video.natura, codice, title: video.title }),
      });
      const data = await res.json();
      if (!res.ok) { skipped.push({ codice, reason: data.error || `HTTP ${res.status}` }); continue; }
      moved.push({ codice, from: matches[0], to: data.newPath });
      files = files.filter(f => f !== matches[0]).concat(data.newPath);
      process.stdout.write(`✓ ${codice} → ${data.newPath}\n`);
    } catch (e) {
      skipped.push({ codice, reason: e.message });
    }
  }

  console.log('\n--- RIEPILOGO ---');
  console.log(`Spostati: ${moved.length}`);
  console.log(`Saltati: ${skipped.length}`);
  if (skipped.length) {
    console.log('\nDettaglio saltati:');
    skipped.forEach(s => console.log(`  ${s.codice}: ${s.reason}`));
  }
}

main();
