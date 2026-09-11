/**
 * Migrazione una tantum — ripara le thumbnail TikTok/Instagram rotte per i video
 * inseriti nell'estate 2026 (prima del fix in api/tiktok-oembed.js e
 * api/instagram-meta.js): il link salvato all'epoca era l'URL firmato della CDN
 * originale, con token di scadenza — ormai tutti scaduti (verificato dal vivo,
 * 403 su ogni singolo link). Questo script rigenera ogni thumbnail chiamando gli
 * endpoint già corretti (che ri-ospitano su Vercel Blob) e aggiorna la riga in
 * Supabase col nuovo link permanente.
 *
 * Gli endpoint sono chiamati via HTTP (non in-process) perché instagram-meta.js
 * richiede APIFY_TOKEN, che Vercel non permette di leggere in chiaro da CLI
 * (`vercel env pull` lo marca "Sensitive" e non lo scarica) — passando dall'API
 * già deployata (che ha il token lato server) non serve gestirlo qui.
 *
 * Costo: TikTok è gratuito (oEmbed pubblico). Instagram richiede una chiamata
 * Apify (Instagram Reel Scraper) per record — piano free $5/mese di credito.
 *
 * Uso:
 *   node --env-file=.env scripts/fix-social-thumbnails.mjs <base-url>
 *   (es. <base-url> = https://adam-video-platform.vercel.app o un URL di preview)
 *
 * Richiede: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY (in .env).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const baseUrl = process.argv[2];

if (!supabaseUrl || !serviceKey) {
  console.error('❌  Mancano VITE_SUPABASE_URL o SUPABASE_SERVICE_KEY.');
  process.exit(1);
}
if (!baseUrl) {
  console.error('❌  Uso: node scripts/fix-social-thumbnails.mjs <base-url-deploy>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function fetchTikTokThumbnail(url) {
  const res = await fetch(`${baseUrl}/api/tiktok-oembed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`tiktok-oembed ${res.status}: ${data.error || ''}`);
  if (!data.thumbnailUrl) throw new Error('tiktok-oembed senza thumbnailUrl');
  return data.thumbnailUrl;
}

async function fetchInstagramThumbnail(url) {
  const res = await fetch(`${baseUrl}/api/instagram-meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`instagram-meta ${res.status}: ${data.error || ''}`);
  if (!data.thumbnailUrl) throw new Error('instagram-meta senza thumbnailUrl');
  return data.thumbnailUrl;
}

// Considera "da riparare" tutto ciò che non è già un link Vercel Blob nostro.
const needsFix = (thumbnail) => !thumbnail || !/\.public\.blob\.vercel-storage\.com\//.test(thumbnail);

async function main() {
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, youtube_url, thumbnail')
    .or('youtube_url.ilike.%tiktok%,youtube_url.ilike.%instagram%');

  if (error) {
    console.error('❌  Errore lettura Supabase:', error.message);
    process.exit(1);
  }

  const targets = videos.filter((v) => needsFix(v.thumbnail));
  console.log(`Trovati ${videos.length} video TikTok/Instagram, ${targets.length} da riparare.\n`);

  let ok = 0, fail = 0;
  for (const v of targets) {
    const isTikTok = /tiktok\.com/i.test(v.youtube_url);
    const platform = isTikTok ? 'tiktok' : 'instagram';
    try {
      const blobUrl = isTikTok
        ? await fetchTikTokThumbnail(v.youtube_url)
        : await fetchInstagramThumbnail(v.youtube_url);

      const { error: updateError } = await supabase.from('videos').update({ thumbnail: blobUrl }).eq('id', v.id);
      if (updateError) throw new Error(`update Supabase: ${updateError.message}`);

      console.log(`✓  ${v.id} (${platform}) → ${blobUrl}`);
      ok++;
    } catch (e) {
      console.error(`✗  ${v.id} (${platform}): ${e.message}`);
      fail++;
    }
  }

  console.log(`\nCompletato: ${ok} riparati, ${fail} falliti su ${targets.length}.`);
}

main();
