# ADAM — Archivio Digitale Addiction e Media

Piattaforma video per educatori sociali. Archivio di video (spot, cortometraggi, videoclip) su temi legati alle dipendenze (Alcool, Azzardo, Digitale, Sostanze), usati in contesti educativi.

---

## Stack Tecnico

- **React 18** con hooks (useState, useMemo, useRef, useEffect)
- **Vite** come bundler
- **Tailwind CSS** per lo styling
- **lucide-react** per le icone
- **lottie-react** per l'animazione del logo nell'hero
- **Supabase** per auth, database e storage
- Tutto il codice è in **un unico file**: `src/App.jsx`
- `src/videosData.js` usato solo come **fallback** se Supabase non risponde (420 video statici)
- CSS custom iniettato via `document.createElement('style')` all'inizio di App.jsx

---

## Struttura File

```
src/
  App.jsx          — tutto il codice React (componenti, stato, logica)
  videosData.js    — array di 420 oggetti video (fallback statico, fonte primaria è Supabase)
  supabase.js      — client Supabase (createClient con env vars)
  index.css        — stili base Tailwind
  main.jsx         — entry point React

public/
  logo-animation.json        — animazione Lottie del logo ADAM
  images/nature/             — immagini delle 8 tipologie di formato video
    cortometraggio.jpg, film.jpg, info.jpg, sequenza.jpg,
    spot-adv.jpg, spot-sociale.jpg, videoclip.jpg, web-social.jpg

.env                         — VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
scripts/                     — script di migrazione dati
```

---

## Supabase — Backend

### Variabili d'ambiente (`.env`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...   # solo per script seed, NON esposta al browser
```

### Tabelle

**`profiles`**
| Colonna | Tipo | Note |
|---|---|---|
| id | uuid (FK auth.users) | PK |
| role | text | `'user'` \| `'admin'` |
| nome | text | nome visualizzato |
| organizzazione | text | ente/scuola |

**`video_submissions`** — segnalazioni video da utenti
| Colonna | Tipo | Note |
|---|---|---|
| id | uuid | PK auto |
| user_id | uuid (FK profiles) | chi ha segnalato |
| youtube_url | text | |
| title | text | |
| tema | text | |
| natura | text | |
| anno | int | |
| durata | text | |
| formato | text | |
| descrizione | text | |
| prodotto_scuola | bool | |
| status | text | `'pending'` \| `'approved'` \| `'rejected'` |
| created_at | timestamptz | |

**`videos`** — tutti i video (420 migrati + nuovi approvati/inseriti dall'admin)
| Colonna | Tipo | Note |
|---|---|---|
| id | text | PK — corrisponde al `codice` fisico (es. "HD245") |
| codice | text | riferimento file fisico in archivio locale |
| title | text | |
| youtube_url | text | |
| thumbnail | text | URL thumbnail YouTube |
| duration | text | formato "M:SS" |
| year | int | |
| tema | text | |
| natura | text | |
| formato | text | `'orizzontale'` \| `'verticale'` |
| prodotto_scuola | bool | |
| description | text | |
| data_inserimento | text | formato "YYYY-MM-DD" |

### Campo `codice`
Il `codice` è il riferimento al file fisico nell'archivio locale (es. `"HD1931-01"`, `"HD245"`). È **obbligatorio** e funge da `id` primario in Supabase. Per i 420 video migrati da `videosData.js`, `codice = id` originale del record. Per i nuovi video approvati/inseriti dall'admin, l'admin inserisce il codice manualmente prima di approvare.

### Setup tabella `videos` (SQL da eseguire una volta)
```sql
create table videos (
  id text primary key,
  codice text,
  title text,
  youtube_url text,
  thumbnail text,
  duration text default '0:00',
  year int,
  views int default 0,
  formato text default 'orizzontale',
  tema text,
  natura text,
  prodotto_scuola boolean default false,
  description text,
  data_inserimento text
);
alter table videos enable row level security;
create policy "Public read" on videos for select using (true);
create policy "Admin write" on videos for all using (auth.role() = 'authenticated');

-- Dopo il seed, popola il campo codice:
UPDATE videos SET codice = id WHERE codice IS NULL;
```

### Seed dati (da eseguire una volta dopo aver creato la tabella)
```bash
node --env-file=.env scripts/seed-videos.mjs
```
Richiede `SUPABASE_SERVICE_KEY` nel `.env` (service_role key da Supabase Dashboard → Settings → API).

### Auth
- Email/password via Supabase Auth
- RLS attivo su tutte le tabelle
- Ruolo admin: `profiles.role = 'admin'`

---

## Struttura Dati Video (`videosData.js`)

Ogni video ha questi campi (formato camelCase — lato app React):

```js
{
  id: "HD1931-01",           // identificatore unico = codice fisico
  codice: "HD1931-01",       // riferimento file fisico (uguale a id per record statici)
  title: "Titolo video",
  youtubeUrl: "https://youtu.be/...",
  thumbnail: "https://img.youtube.com/vi/ID/maxresdefault.jpg",
  duration: "2:13",          // formato MM:SS (alcuni hanno "0:00" = non disponibili)
  year: 2017,
  views: 0,                  // incrementato casualmente da addRandomViews()
  format: "orizzontale",     // "orizzontale" | "verticale"
  tema: "Alcool",            // "Alcool" | "Azzardo" | "Digitale" | "Sostanze"
  natura: "Spot sociale",    // tipo di formato (vedi natura sottostante)
  prodottoScuola: false,     // true se realizzato da studenti
  description: "...",
  dataInserimento: "2025-04-20"
}
```

**Valori natura:** Cortometraggio, Film, Info, Sequenza, Spot commerciale, Spot sociale, Videoclip, Web e social

**IMPORTANTE — Video placeholder:** ~19 video puntano tutti allo stesso YouTube ID `IbHF-SOVYJU` (video non disponibile). Costante: `PLACEHOLDER_VIDEO_ID = 'IbHF-SOVYJU'`. Questi video hanno `duration: "0:11"`. Vanno esclusi dal filtro durata (ma non dall'archivio generale).

### Conversioni formato dati

**`mapDbVideo(v)`** — da Supabase (snake_case) a camelCase per l'app:
```js
const mapDbVideo = (v) => ({
  id: v.id,
  codice: v.codice || '',
  title: v.title,
  youtubeUrl: v.youtube_url,
  thumbnail: v.thumbnail || `https://img.youtube.com/vi/${extractYouTubeId(v.youtube_url)}/maxresdefault.jpg`,
  duration: v.duration || '0:00',
  year: v.year,
  format: v.formato || 'orizzontale',
  tema: v.tema,
  natura: v.natura,
  prodottoScuola: v.prodotto_scuola || false,
  description: v.description || '',
  dataInserimento: v.data_inserimento || '',
});
```

**`toArchiveFormat(v)`** — da camelCase a snake_case per AdminSection Archivio:
```js
const toArchiveFormat = (v) => ({
  id: v.id,
  codice: v.codice || v.id || '',
  youtube_url: v.youtubeUrl || '',
  thumbnail: v.thumbnail || '',
  title: v.title || '',
  tema: v.tema || '',
  natura: v.natura || '',
  formato: v.format || v.formato || 'orizzontale',
  year: v.year || '',
  duration: v.duration || '',
  prodotto_scuola: v.prodottoScuola ?? v.prodotto_scuola ?? false,
  description: v.description || '',
  data_inserimento: v.dataInserimento || v.data_inserimento || '',
});
```

---

## Sezioni del Sito (menu laterale)

| Sezione | `activeSection` | Descrizione |
|---|---|---|
| Home | `'home'` | Hero + FiltersSection sticky + NatureCarousel + griglia video |
| I Formati ADAM | `'formats'` | NatureCarousel + griglia filtrata per natura |
| I Più Visti | `'most-viewed'` | Top 20 per visualizzazioni |
| Nuovi Inseriti | `'recent'` | Ultimi 5 video per dataInserimento |
| Prodotti dalle Scuole | `'schools'` | Solo video con `prodottoScuola: true` |
| Lasciati Ispirare | `'inspire'` | Player random + shuffle + griglia |
| WOW | `'wow'` | (sezione futura, contenuto da definire) |
| Segnala Video | `'submit'` | Form segnalazione video (utenti loggati) |
| Admin | `'admin'` | Pannello admin (solo role='admin') |

---

## Componenti Principali

### `AuthModal`
- Login/registrazione via Supabase Auth (email + password)
- Dopo login: carica profilo da `profiles`, setta `userProfile`
- Nuovo utente → insert in `profiles` con `role: 'user'`

### `SubmitVideoSection`
- Form per segnalare un video YouTube all'admin
- Insert in `video_submissions` con `status: 'pending'`
- Solo per utenti loggati

### `AdminSection`
Pannello admin con **4 tab**. Riceve prop: `userProfile`, `onVideoApproved`, `allVideos`.

#### Tab "Aggiungi" (`activeTab === 'add'`)
- Form per inserire direttamente un video nell'archivio (senza passare da submissions)
- Campi: codice (obbligatorio), link YouTube, titolo, tema, natura, anno, durata, formato, descrizione, prodotto_scuola
- Insert diretto in tabella `videos` con `id = codice`
- Chiama `onVideoApproved()` dopo salvataggio

#### Tab "In attesa" (`activeTab === 'pending'`)
- Lista `video_submissions` con `status = 'pending'`
- Azioni per ogni segnalazione:
  - **Approva**: apre form inline per compilare/correggere i dati (incluso codice obbligatorio) → insert in `videos` + update `status = 'approved'`
  - **Rifiuta**: primo click → conferma inline "Confermi il rifiuto? [Sì] [No]" → update `status = 'rejected'`
- Stato: `rejectConfirmId` per gestire la conferma inline

#### Tab "Rifiutati" (`activeTab === 'rejected'`)
- Lista `video_submissions` con `status = 'rejected'`
- Selezione multipla (checkbox gialle) + "Seleziona tutti"
- **Elimina selezionati**: conferma inline → delete permanente da `video_submissions`
- **Ripristina**: update `status = 'pending'`, sposta in tab "In attesa"
- Stato: `rejectedSubs`, `selectedRejected` (Set), `deleteRejectedConfirm`

#### Tab "Archivio" (`activeTab === 'archive'`)
- Lista completa di tutti i video (`allVideos` prop, convertiti con `toArchiveFormat`)
- **Lazy load**: caricato al primo accesso al tab
- **Filtri**: ricerca testo + bottoni tema (Tutti/Alcool/Azzardo/Digitale/Sostanze con stile home) + `CustomSelect` natura + bottone "Prodotto dalle scuole"
- **Sort toggle**: pulsante ↕ alterna ordine cronologico crescente/decrescente (`archiveSortDesc`)
- **Selezione multipla**: checkbox gialle + "Seleziona tutti" + "Elimina selezionati (N)" con conferma
- Ogni riga: thumbnail 60×45 stretch | ID (giallo) | titolo + link YouTube | badges tema/natura/anno/scuola | [✎ Modifica] [🗑 Elimina]
- **Modifica inline**: form espandibile con tutti i campi + [Salva] [Annulla] → Supabase `upsert`
- **Elimina**: conferma inline → delete da `videos` + aggiorna lista locale
- Scrollbar gialla (`modal-scrollbar` + `--scrollbar-color: #FFDA2A`)

#### Stato AdminSection
```js
const [activeTab, setActiveTab] = useState('pending');
// Pending
const [submissions, setSubmissions] = useState([]);
const [loading, setLoading] = useState(true);
const [approvingId, setApprovingId] = useState(null);
const [editedSubmissions, setEditedSubmissions] = useState({});
const [rejectConfirmId, setRejectConfirmId] = useState(null);
// Rejected
const [rejectedSubs, setRejectedSubs] = useState([]);
const [loadingRejected, setLoadingRejected] = useState(false);
const [selectedRejected, setSelectedRejected] = useState(new Set());
const [deleteRejectedConfirm, setDeleteRejectedConfirm] = useState(false);
const [deletingRejected, setDeletingRejected] = useState(false);
// Archive
const [archiveVideos, setArchiveVideos] = useState([]);
const [archiveLoading, setArchiveLoading] = useState(false);
const [archiveLoaded, setArchiveLoaded] = useState(false);
const [archiveSearch, setArchiveSearch] = useState('');
const [archiveTema, setArchiveTema] = useState('');
const [archiveNatura, setArchiveNatura] = useState('');
const [archiveScuola, setArchiveScuola] = useState(false);
const [archiveSortDesc, setArchiveSortDesc] = useState(true);
const [editingVideoId, setEditingVideoId] = useState(null);
const [editVideoForms, setEditVideoForms] = useState({});
const [deleteConfirmId, setDeleteConfirmId] = useState(null);
const [savingVideoId, setSavingVideoId] = useState(null);
const [deletingVideoId, setDeletingVideoId] = useState(null);
const [selectedArchive, setSelectedArchive] = useState(new Set());
const [deleteArchiveConfirm, setDeleteArchiveConfirm] = useState(false);
const [deletingArchive, setDeletingArchive] = useState(false);
```

### `HeroSection`
- Video YouTube autoplay muted in background (video casuale)
- Logo animato Lottie in sovrimpressione
- Tagline verticale "ARCHIVIO / DIGITALE / ADDICTION E / MEDIA" con animazione `fadeSlideIn` staggered (initiali in giallo `#FFDA2A`)

### `FiltersSection`
- **Sticky** (`top: stickyTop`, `z-30`) — `stickyTop` è misurato dinamicamente con `offsetHeight` dell'header al mount e al resize (NON hardcoded)
- Struttura a doppio wrapper: outer div `bg-black sticky` + inner div `bg-zinc-900 rounded-xl overflow-hidden`
  - Il div esterno ha `data-filters-section` (usato da `scrollToResults` per misurare l'altezza)
  - La striscia colorata è il primo figlio del div interno, non un `borderTop` (evita che venga nascosta dall'header)
- Campo ricerca libera (titolo + description) — lo scroll ai risultati si attiva solo con **Invio** (`onSearchSubmit` prop), NON ad ogni carattere digitato
- Bottoni tema: Tutti / Alcool / Azzardo / Digitale / Sostanze — ogni click attiva lo scroll ai risultati
- Toggle "Filtri avanzati" con badge contatore
- Pannello avanzato: Formato (CustomSelect), Anno (CustomSelect), Prodotto dalle Scuole (toggle con icona School), DualRangeSlider durata
- Chips dismissibili per filtri attivi
- Bottone "Azzera" quando c'è almeno un filtro attivo
- **accentColor**: giallo `#FFDA2A` se tema = Tutti, altrimenti colore del tema

### `NatureCarousel`
- Slider orizzontale con 8 card formato (immagini da `public/images/nature/`)
- Click su formato → filtra la griglia video per natura

### `DualRangeSlider`
- Implementazione **custom con Pointer Events API** (NON usa `<input type="range">`)
- Due thumb gialli, traccia colorata tra i due
- Il thumb più vicino al click viene trascinato automaticamente
- Usa `draggingRef` e `valuesRef` per evitare stale closure

### `CustomSelect`
- Dropdown completamente custom (NO `<select>` nativo — non stilizzabile su macOS)
- Scrollbar scura via classe `modal-scrollbar` con CSS variable `--scrollbar-color: #52525b`
- Voce selezionata evidenziata con `accentColor`

### `VideoCard` + `VideoModal`
- Click su card → apre modal con player YouTube
- Bottone aggiungi/rimuovi playlist
- Tag tema colorato

### Playlist
- **PlaylistSidebar**: lista drag & drop con riordinamento
- **PlaylistPlayer**: fullscreen con controlli Prev/Next e autoplay

---

## Colori Tema

```js
const TEMA_COLORS = {
  'Alcool':   { solid: '#D97706', border: '#D97706', dim: 'rgba(217,119,6,0.15)' },
  'Azzardo':  { solid: '#BE123C', border: '#BE123C', dim: 'rgba(190,18,60,0.15)' },
  'Digitale': { solid: '#1e3a8a', border: '#3b82f6', dim: 'rgba(59,130,246,0.15)' },
  'Sostanze': { solid: '#065f46', border: '#10b981', dim: 'rgba(16,185,129,0.15)' },
};
```

Colore accent globale nei filtri: `TEMA_COLORS[activeTema]?.border ?? '#FFDA2A'`

---

## Durata e Snap Points

```js
const parseDuration = (dur) => { /* "2:13" → 133 (secondi) */ }
const formatDuration = (secs) => { /* 133 → "2m 13s", 600 → "10m" */ }
```

Regola `formatDuration`: se `m >= 10` o `s === 0` → mostra solo minuti (es. "10m", "88m").

**SNAP_POINTS**: valori discreti dello slider durata:
- 15s, 30s, 45s, 60s
- poi step da 30s fino a 10m
- poi step da 1m fino al massimo
- Il massimo (`DUR_MAX`) è **hardcoded a 5400s** (90 min — copre il massimo del dataset)

---

## Filtro Durata — Logica

Il filtro durata **esclude**:
- Video con `parseDuration === 0` (campo duration mancante)
- Video con ID `IbHF-SOVYJU` (placeholder non disponibile)

Quando il filtro durata è attivo, i risultati vengono **ordinati per durata crescente**.

---

## Header Search

- Visibile su tutte le sezioni, **opacity:0 / pointerEvents:none** solo in home (la FiltersSection ha già la ricerca)
- Click sul campo → dropdown con 4 bottoni tema
- Selezione tema → chip colorato dentro il campo + il tema rimane come tag
- Il padding sinistro dell'input si adatta dinamicamente alla larghezza del tag (`tagWidth` misurato via ref callback)
- Auto-focus sull'input dopo selezione tema (`setTimeout 50ms`)
- Chip rimovibile con X

---

## Scroll ai Risultati (Home)

Quando si applica un filtro in home, la pagina fa smooth scroll alla sezione "Esplora i Video" (`resultsRef` sul `<div ref={resultsRef}>`).

**Regole di attivazione:**
- Si attiva su cambio `filters` (tema, formato, anno, scuole, durata) — `useEffect([filters])`
- Si attiva su **Invio** nel campo di ricerca testuale (`onSearchSubmit` → `scrollToResults`)
- NON si attiva ad ogni carattere digitato (evita scroll continuo mentre si scrive)

**Calcolo posizione (`scrollToResults`):**
```js
const headerH = document.querySelector('header')?.offsetHeight ?? 72;
const filterH = document.querySelector('[data-filters-section]')?.offsetHeight ?? 160;
const offset = headerH + filterH + 8;
window.scrollTo({ top: elementTop - offset, behavior: 'smooth' });
```
Entrambe le altezze sono lette dal DOM in tempo reale — nessun valore hardcoded.

**Griglia risultati:** ha `min-height: 60vh` per evitare che la pagina si accorci troppo quando ci sono pochi risultati (altrimenti il browser fa auto-scroll verso l'alto).

---

## Caricamento Video (App)

```js
// Fonte primaria: Supabase. Fallback a videosData.js se Supabase non risponde.
const loadVideos = async () => {
  const { data } = await supabase.from('videos').select('*');
  if (data?.length) setDbVideos(data.map(mapDbVideo));
};
const allVideos = useMemo(() => dbVideos.length > 0 ? dbVideos : mockVideos, [dbVideos]);
```

- `HeroSection` e `InspireSection` ricevono `videos={allVideos}` come prop (scelgono video random al caricamento)
- `AdminSection` riceve `allVideos` come prop per il tab Archivio — non fa query Supabase diretta
- `DUR_MAX = 5400` (90 min) hardcoded — non più calcolato dai dati statici

---

## Comandi Dev

```bash
npm run dev      # avvia dev server (Vite)
npm run build    # build produzione
npm run preview  # preview build
```

---

## Note Importanti

- **NON separare i componenti in file distinti** a meno che non esplicitamente richiesto — tutto vive in App.jsx
- **NON usare `<select>` nativo** — su macOS non è stilizzabile, usare `CustomSelect`
- **NON usare `<input type="range">` doppio** per dual slider — il thumb sinistro non funziona per via degli z-index; usare l'implementazione con Pointer Events API
- **NON hardcodare l'altezza dell'header** — misurarla sempre con `document.querySelector('header')?.offsetHeight`; l'header non ha altezza fissa (usa `py-4` + contenuto)
- **NON usare `borderTop` sul div sticky** per la striscia colorata — viene nascosta dall'header (z-40 > z-30); usare un div figlio come primo elemento dentro il card
- La sezione **Sostanze** non ha video nell'archivio attuale
- I `views` sono randomizzati al caricamento (`addRandomViews`) — non sono dati reali
- Il campo **`codice`** è obbligatorio e non va mai lasciato vuoto — è il riferimento al file fisico locale
- La tabella **`videos`** su Supabase contiene gli stessi 420 record di `videosData.js` (migrati) più i nuovi approvati/inseriti dall'admin
- Il tab Archivio usa `allVideos` prop (già in memoria nell'app) — non fa query Supabase separata
