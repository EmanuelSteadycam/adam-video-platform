import { createClient } from '@supabase/supabase-js';
import { put, list, del } from '@vercel/blob';

export const config = { maxDuration: 30 };

// Prefisso condiviso con api/semantic-search.js. Ogni rigenerazione scrive un pathname
// NUOVO (con timestamp), non sovrascrive quello precedente: gli URL pubblici di Vercel
// Blob passano da una CDN che ignora la query string ai fini della cache (verificato dal
// vivo: un parametro "?v=" per invalidare la cache non ha funzionato, la CDN continuava a
// servire il contenuto vecchio sullo stesso pathname). Un pathname mai usato prima è
// invece garantito fresco al primo fetch, perché la CDN non può averlo già in cache.
// Le versioni precedenti vengono eliminate subito dopo — non se ne accumula più di una.
export const CACHE_PREFIX = 'catalog-cache/';

// Rigenera il "pacchetto" precalcolato (titolo + sinossi + tema + natura di tutti i video)
// usato da api/semantic-search.js come contesto per Haiku, salvandolo su Vercel Blob.
// Chiamato: (a) con debounce dall'admin dopo ogni modifica al catalogo (vedi
// scheduleCatalogRebuild in src/App.jsx), (b) da un cron Vercel ogni ora (vercel.json)
// come rete di sicurezza. Nessuna chiamata a Claude qui — solo lettura da Supabase
// (tabella videos, già a lettura pubblica) + formattazione testo + scrittura su Blob,
// quindi anche se scatta più volte in sequenza il costo è trascurabile.
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Configurazione Supabase mancante.' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN non configurato.' });
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

  try {
    const { data: videos, error: fetchError } = await supabase
      .from('videos')
      .select('id, tema, natura, title, description');
    if (fetchError) return res.status(500).json({ error: `Errore lettura videos: ${fetchError.message}` });

    const catalogText = (videos || [])
      .map(v => `${v.id}|${v.tema || ''}|${v.natura || ''}|${(v.title || '').replace(/\|/g, '/')}|${(v.description || '').replace(/\n/g, ' ').replace(/\|/g, '/')}`)
      .join('\n');

    const myTimestamp = Date.now();
    const pathname = `${CACHE_PREFIX}${myTimestamp}.txt`;
    const blob = await put(pathname, catalogText, {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
      addRandomSuffix: false,
    });

    // Pulizia: elimina SOLO le versioni più VECCHIE della propria (timestamp nel pathname
    // minore del proprio), mai quelle di pari data o più recenti. Un rebuild concorrente
    // (es. due admin che salvano nello stesso istante) scrive un pathname diverso: con la
    // regola "elimina tutto tranne il mio" ciascuno dei due cancellava il blob appena
    // scritto dall'altro, azzerando completamente la cache (bug reale, riprodotto e
    // corretto). Con "elimina solo ciò che è più vecchio di me", chi ha il timestamp più
    // recente non cancella mai il lavoro di chi è arrivato dopo — nel caso peggiore resta
    // temporaneamente un blob vecchio in più, che verrà comunque ripulito al prossimo giro
    // (mai un azzeramento totale).
    try {
      const { blobs } = await list({ prefix: CACHE_PREFIX });
      const stale = blobs
        .filter(b => b.pathname !== pathname)
        .filter(b => {
          const match = b.pathname.match(/(\d+)\.txt$/);
          const ts = match ? parseInt(match[1], 10) : 0;
          return ts < myTimestamp;
        })
        .map(b => b.url);
      if (stale.length) await del(stale);
    } catch {
      // Non bloccante: se la pulizia fallisce, la prossima rigenerazione la ritenterà.
    }

    return res.status(200).json({ ok: true, videoCount: videos?.length || 0, url: blob.url });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Errore interno.' });
  }
}
