/**
 * Seed script — carica i 420 video da videosData.js su Supabase.
 * Usa la service role key per bypassare RLS.
 *
 * Come si usa:
 *   1. Aggiungere in .env:  SUPABASE_SERVICE_KEY=<service_role_key>
 *      (la trovi in Supabase Dashboard → Settings → API → service_role)
 *   2. node --env-file=.env scripts/seed-videos.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { videos } from '../src/videosData.js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('❌  Mancano VITE_SUPABASE_URL o SUPABASE_SERVICE_KEY nel file .env');
  process.exit(1);
}

const supabase = createClient(url, key);

const mapped = videos.map(v => ({
  id: v.id,
  title: v.title,
  youtube_url: v.youtubeUrl || null,
  thumbnail: v.thumbnail || null,
  duration: v.duration || '0:00',
  year: v.year || null,
  views: Math.floor(Math.random() * 50000) + 500,
  formato: v.format || 'orizzontale',
  tema: v.tema || null,
  natura: v.natura || null,
  prodotto_scuola: v.prodottoScuola || false,
  description: v.description || null,
  data_inserimento: v.dataInserimento || null,
}));

const BATCH = 50;
let inserted = 0;

for (let i = 0; i < mapped.length; i += BATCH) {
  const batch = mapped.slice(i, i + BATCH);
  const { error } = await supabase.from('videos').upsert(batch, { onConflict: 'id' });
  if (error) {
    console.error(`❌  Errore batch ${i}–${i + BATCH}:`, error.message);
  } else {
    inserted += batch.length;
    console.log(`✓  ${inserted}/${mapped.length}`);
  }
}

console.log('\n✅  Seed completato!');
