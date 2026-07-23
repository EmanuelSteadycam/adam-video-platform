export const config = { maxDuration: 15 };

const TEMI = ['Alcool', 'Azzardo', 'Digitale', 'Sostanze', 'Tabacco', 'Sessualità'];
const NATURE = ['Cortometraggio', 'Film', 'Info', 'Sequenze', 'Spot commerciale', 'Spot sociale', 'Videoclip', 'Web e social'];
const SCUOLA_VALUES = ['Scuole', 'Altri'];
const MAX_QUERY_LEN = 200;
const MIN_DURATION_SECS = 10;
const MAX_DURATION_SECS = 5400;

function clampInt(n, min, max) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, v));
}

function sanitizeWordList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(k => typeof k === 'string' && k.trim().length > 1)
    .map(k => k.trim().slice(0, 40))
    .slice(0, 5);
}

function sanitize(parsed) {
  const out = { tema: null, natura: null, scuola: null, durationMax: null, keywords: [], excludeKeywords: [] };
  if (parsed && TEMI.includes(parsed.tema)) out.tema = parsed.tema;
  if (parsed && NATURE.includes(parsed.natura)) out.natura = parsed.natura;
  if (parsed && SCUOLA_VALUES.includes(parsed.scuola)) out.scuola = parsed.scuola;
  if (parsed && parsed.durationMax != null) {
    const d = clampInt(parsed.durationMax, MIN_DURATION_SECS, MAX_DURATION_SECS);
    if (d) out.durationMax = d;
  }
  out.keywords = sanitizeWordList(parsed?.keywords);
  out.excludeKeywords = sanitizeWordList(parsed?.excludeKeywords);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata.' });

  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query mancante.' });
  }
  const q = query.trim().slice(0, MAX_QUERY_LEN);

  const prompt = `Sei un motore di interpretazione per la ricerca video di ADAM, un archivio educativo su dipendenze e comportamenti a rischio (temi: Alcool, Azzardo, Digitale, Sostanze, Tabacco, Sessualità), usato da educatori sociali.

Analizza questa query scritta in linguaggio naturale e restituisci SOLO un oggetto JSON (nessun testo prima o dopo, nessun markdown, nessun blocco di codice) con questi campi:

{
  "tema": uno tra ${JSON.stringify(TEMI)} se la query menziona chiaramente quel tema, altrimenti null,
  "natura": uno tra ${JSON.stringify(NATURE)} SOLO se la query contiene una parola o espressione che discrimina esplicitamente quella categoria da tutte le altre — cioè che permetterebbe a un umano di scegliere con sicurezza QUELLA voce e non un'altra della lista. Altrimenti null.
    ATTENZIONE: la parola "spot" da sola NON è sufficiente — è ambigua tra "Spot commerciale" e "Spot sociale" (e non implica nessun'altra categoria) e va lasciata a null a meno che la query non aggiunga un termine che disambigua (es. "sociale"/"prevenzione"/"campagna sociale"/"istituzionale" → Spot sociale; "pubblicitario"/"commerciale"/"réclame"/"un marchio"/"un prodotto" → Spot commerciale). Non dedurre MAI la natura più "probabile" o "tipica" per l'archivio, e non usare il contenuto o il tono del video per indovinarla se la query non la nomina esplicitamente: in caso di dubbio, restituisci sempre null.
  "scuola": "Scuole" se la query chiede esplicitamente video realizzati da scuole/studenti, "Altri" se chiede il contrario, altrimenti null,
  "durationMax": numero intero di secondi se la query chiede video brevi/corti o con un limite di durata (es. "sotto i 5 minuti" = 300, "brevi" = 180, "cortissimi" = 60), altrimenti null,
  "keywords": array di massimo 5 parole o brevi espressioni in italiano (senza articoli/preposizioni) che potrebbero comparire letteralmente nel titolo o nella descrizione di un video pertinente — es. per "video sul gioco d'azzardo per adolescenti" → ["azzardo", "gioco", "adolescenti", "ragazzi"],
  "excludeKeywords": array di massimo 5 parole o brevi espressioni che indicano cosa il video NON deve contenere — usa questo campo (e NON "keywords") ogni volta che la query esprime un'esclusione o una negazione con parole come "senza", "no", "evitando", "tranne", "escludendo". Es. per "spot sull'alcool senza adolescenti" → keywords: ["alcool", "spot"], excludeKeywords: ["adolescenti", "ragazzi", "ragazzo", "ragazza", "minorenni"]. Se la query non esprime nessuna esclusione, restituisci un array vuoto []
}

IMPORTANTE: "keywords" ed "excludeKeywords" sono insiemi opposti — la stessa parola non deve mai comparire in entrambi. Se la query contiene una negazione esplicita su un concetto, quel concetto va SOLO in "excludeKeywords", mai in "keywords" (anche sotto forma di sinonimo).

Valuta ogni campo IN MODO INDIPENDENTE dagli altri — "tema" e "natura" restano null tutte le volte che non c'è un'informazione esplicita e discriminante per quel campo specifico, ma questo NON significa che anche "keywords" debba essere vuoto: "keywords" va comunque popolato con le parole di contenuto della query (sostantivi, oggetti, concetti — non articoli/preposizioni) ogni volta che la query ne contiene almeno una, anche se tema/natura/scuola/durationMax restano tutti null. Esempio: per "spot sul WC" → tema: null, natura: null (vedi sopra: "spot" da solo non basta), ma keywords: ["WC", "bagno", "toilette"] (le parole di contenuto ci sono, vanno comunque estratte). "keywords" resta vuoto SOLO se la query non contiene nessuna parola di contenuto specifica (es. "mostrami un video", "qualcosa di interessante", "cerca qualcosa").

Query: "${q}"`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      return res.status(502).json({ error: `Errore Claude: ${err.error?.message || anthropicRes.status}` });
    }

    const result = await anthropicRes.json();
    const text = result.content?.[0]?.text?.trim() || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(502).json({ error: 'Risposta non interpretabile.' });

    let parsed;
    try { parsed = JSON.parse(match[0]); } catch { return res.status(502).json({ error: 'JSON non valido.' }); }

    return res.status(200).json(sanitize(parsed));
  } catch (e) {
    const timedOut = e.name === 'AbortError';
    return res.status(timedOut ? 504 : 500).json({ error: timedOut ? 'Timeout nella richiesta a Claude.' : (e.message || 'Errore interno.') });
  } finally {
    clearTimeout(timeout);
  }
}
