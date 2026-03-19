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
| email | text | email (backfill da auth.users al login) |

**`video_submissions`** — segnalazioni video da utenti
| Colonna | Tipo | Note |
|---|---|---|
| id | uuid | PK auto |
| user_id | uuid (FK auth.users) | chi ha segnalato |
| youtube_url | text | |
| title | text | |
| tema | text | |
| natura | text | |
| year | int | |
| duration | text | |
| formato | text | |
| description | text | |
| prodotto_scuola | bool | |
| codice | text | solo per admin_draft |
| status | text | `'draft'` \| `'pending'` \| `'approved'` \| `'rejected'` \| `'admin_draft'` |
| submitted_at | timestamptz | |

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
- `loadProfile(userId, userEmail)` — backfilla `profiles.email` se mancante al login
- `handleRegister` usa `upsert` su `profiles` (non update) per gestire profili non ancora esistenti

### RLS Policies (tutte le policy da creare su Supabase)

```sql
-- profiles
CREATE POLICY "Authenticated read all profiles"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin update all profiles"
  ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin'));

-- video_submissions
CREATE POLICY "Users read own submissions"
  ON video_submissions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin read all submissions"
  ON video_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users update own drafts"
  ON video_submissions FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own drafts"
  ON video_submissions FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Admin delete submissions"
  ON video_submissions FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- playlists
CREATE POLICY "Admin delete playlists"
  ON playlists FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read shared playlists"
  ON playlists FOR SELECT USING (is_public = true);

-- Condivisione playlist (già eseguito)
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
```

### Check constraint su video_submissions.status
```sql
ALTER TABLE video_submissions DROP CONSTRAINT IF EXISTS video_submissions_status_check;
ALTER TABLE video_submissions ADD CONSTRAINT video_submissions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'draft', 'admin_draft'));

-- Colonna codice per bozze admin
ALTER TABLE video_submissions ADD COLUMN IF NOT EXISTS codice text;
```

### Colonna email su profiles
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
-- Backfill da auth.users
UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;
```

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
| Home | `'home'` | Hero + FiltersSection (non sticky) + griglia video |
| Scopri ADAM | `'about'` | AboutSection: Cosa/Come/Perché + Lottie logo |
| I Formati ADAM | `'formats'` | NatureCarousel + griglia filtrata per natura |
| I Più Visti | `'most-viewed'` | Top 20 per visualizzazioni |
| Nuovi Inseriti | `'recent'` | Ultimi 5 video per dataInserimento |
| Prodotti dalle Scuole | `'schools'` | Solo video con `prodottoScuola: true` |
| Lasciati Ispirare | `'inspire'` | Player random + shuffle + griglia |
| Partecipa | `'submit'` | Form segnalazione video — ex "Segnala Video" |
| I miei video | `'myvideos'` | Segnalazioni proprie dell'utente loggato |
| Admin | `'admin'` | Pannello admin (solo role='admin') |
| Playlist condivisa | `'shared-playlist'` | Vista pubblica di una playlist ricevuta via link |

---

## Componenti Principali

### `AuthModal`
- Login/registrazione via Supabase Auth (email + password)
- Dopo login: carica profilo da `profiles`, setta `userProfile`
- Nuovo utente → `upsert` in `profiles` con `role: 'user'`, `nome`, `organizzazione`, `email`

### `SubmitVideoSection`
- Form per segnalare un video YouTube all'admin
- Due azioni: **"Invia all'admin"** (`status: 'pending'`) e **"Salva bozza"** (`status: 'draft'`)
- "Salva bozza" → redirect automatico a `'myvideos'` via prop `onDraftSaved`
- Solo per utenti loggati

### `MyVideosSection`
- Sezione `activeSection === 'myvideos'` — visibile solo agli utenti loggati
- Query: `video_submissions` filtrata per `user_id = user.id`
- Raggruppa per status: **Bozze** / **In attesa** / **Approvati** / **Rifiutati**
- Azioni sulle bozze: Modifica (form inline) | Invia (→ pending) | Elimina (con confirm)
- Le segnalazioni in pending/approved/rejected sono read-only

### `AdminSection`
Pannello admin con **5 tab**. Riceve prop: `userProfile`, `onVideoApproved`, `allVideos`.

#### Tab "Aggiungi" (`activeTab === 'add'`) — **tab di default all'apertura**
- Form per inserire direttamente un video nell'archivio (senza passare da submissions)
- **Ordine campi**: Prodotto scuola + Codice ID | URL YouTube | Titolo | Tema (4 bottoni colorati) + Natura | Anno + Durata + Formato | Descrizione
- **Tutti i campi sono obbligatori** (url, titolo, codice, tema, natura, anno, durata, descrizione)
- Bottone **"Aggiungi ad ADAM"** (classe `.btn-aggiungi-adam`): sfondo giallo, hover = zoom leggero del testo
- Bottone **"Salva per dopo"**: salva in `video_submissions` con `status: 'admin_draft'` + redirect a tab "In attesa"
- `handleSaveForLater()` — inserisce in video_submissions con user_id, codice, admin_draft
- Insert diretto in tabella `videos` con `id = codice` per "Aggiungi ad ADAM"
- Chiama `onVideoApproved()` dopo salvataggio

#### Tab "In attesa" (`activeTab === 'pending'`)
- Lista `video_submissions` con `status IN ('pending', 'admin_draft')`
- Record `admin_draft` mostrano badge giallo **"Bozza Admin"** (visibili solo agli admin)
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

#### Tab "Utenti" (`activeTab === 'users'`)
- Lista tutti i profili da `profiles` (lazy load al primo accesso)
- Ogni riga: avatar iniziali | nome | email | organizzazione | badge ruolo | [✎ Modifica] [Cambia ruolo] [🗑 Elimina]
- **Modifica inline**: form con Nome, Email, Organizzazione → `profiles.update`
- **Cambia ruolo**: toggle `user` ↔ `admin` (disabilitato sull'utente corrente)
- **Elimina**: confirm inline → cancella submissions + playlists + profilo in cascata (l'utente in `auth.users` va rimosso manualmente dal Dashboard Supabase)
- Stato: `users`, `loadingUsers`, `usersLoaded`, `changingRoleId`, `deleteUserConfirmId`, `deletingUserId`, `editingUserId`, `editUserForms`, `savingUserId`

#### Tab "Archivio" (`activeTab === 'archive'`)
- Lista completa di tutti i video (`allVideos` prop, convertiti con `toArchiveFormat`)
- **Lazy load**: caricato al primo accesso al tab
- **Filtri**: ricerca testo + bottoni tema (Tutti/Alcool/Azzardo/Digitale/Sostanze con stile home) + `CustomSelect` natura + bottone "Prodotto dalle scuole"
- **Sort toggle**: pulsante ↕ alterna ordine cronologico crescente/decrescente (`archiveSortDesc`)
- **Selezione multipla**: checkbox gialle + "Seleziona tutti" + "Elimina selezionati (N)" con conferma
- Ogni riga: thumbnail | ID (giallo) | titolo + link YouTube | badges tema/natura/anno/scuola | [✎ Modifica] [🗑 Elimina]
- **Thumbnail**: costruita dinamicamente da `extractYouTubeId(youtube_url)` con fallback `hqdefault → mqdefault → default.jpg` (non dipende dal campo `thumbnail` del DB)
- **Lista senza max-height**: scorre con la pagina (rimosso `max-h-[560px]`)
- **Modifica inline**: stesso ordine del tab "+ Aggiungi" (Tipo+Codice | URL | Titolo | Tema+Natura | Anno+Durata+Formato | Descrizione | Data+Views) + [Annulla] [Salva] → Supabase `upsert`
- **Elimina**: conferma inline → delete da `videos` + aggiorna lista locale

#### Contatori tab — sempre visibili
Al mount di AdminSection (quando `userProfile.role === 'admin'`) vengono caricati in parallelo:
- `video_submissions` con `status IN ('pending', 'admin_draft')` → popola `submissions` per contatore "In attesa"
- `loadRejected()` → popola `rejectedSubs` per contatore "Rifiutati"
- `loadUsers()` → popola `users` per contatore "Utenti"
- Archivio: usa `allVideos.length` (già in memoria dall'app)

Questo garantisce che tutti i contatori siano visibili sui tab fin dall'apertura del pannello admin, senza aspettare il click sul tab.

#### `handleTabChange` — logica di caricamento lazy
- `pending` → `loadPending()` sempre (dati freschi ad ogni visita)
- `rejected` → `loadRejected()` sempre
- `archive` → `loadArchive()` solo se `!archiveLoaded`
- `users` → `loadUsers()` solo se `!usersLoaded`

#### Stato AdminSection
```js
const [activeTab, setActiveTab] = useState('add'); // default: tab Aggiungi
// Pending
const [submissions, setSubmissions] = useState([]);
const [loadingSubs, setLoadingSubs] = useState(true);
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
// Utenti
const [users, setUsers] = useState([]);
const [loadingUsers, setLoadingUsers] = useState(false);
const [usersLoaded, setUsersLoaded] = useState(false);
const [changingRoleId, setChangingRoleId] = useState(null);
const [deleteUserConfirmId, setDeleteUserConfirmId] = useState(null);
const [deletingUserId, setDeletingUserId] = useState(null);
const [editingUserId, setEditingUserId] = useState(null);
const [editUserForms, setEditUserForms] = useState({});
const [savingUserId, setSavingUserId] = useState(null);
```

### `HeroSection`
- Video YouTube autoplay muted in background (video casuale **filtrato**)
- Il video random esclude: `PLACEHOLDER_VIDEO_ID` (`IbHF-SOVYJU`), video senza YouTube ID valido, video con `duration === '0:00'`
- Logo animato Lottie in sovrimpressione
- Tagline verticale "ARCHIVIO / DIGITALE / ADDICTION E / MEDIA" con animazione `fadeSlideIn` staggered (initiali in giallo `#FFDA2A`)

### `InspireSection`
- `getRandomVideo()` applica lo stesso filtro di HeroSection: esclude placeholder, video senza ID valido, video con `duration === '0:00'`
- Se nessun video eligible, fa fallback all'intero array

### `FiltersSection`
- **NON sticky** in home — scorre con la pagina; il NatureCarousel è stato rimosso dalla home
- Struttura: parte base (ricerca + tema + chips) + pannello avanzato (separato, non sticky)
- Campo ricerca libera (titolo + description)
- Bottoni tema: Tutti / Alcool / Azzardo / Digitale / Sostanze
- Toggle "Filtri avanzati" con badge contatore — il pannello avanzato si apre sotto (scorre con pagina)
- Pannello avanzato: Formato (CustomSelect con label "Tutti"/"Sequenza"), Anno (CustomSelect), Prodotto dalle Scuole (toggle), DualRangeSlider durata
- Chips dismissibili per filtri attivi (visibili anche col pannello chiuso)
- Bottone "Azzera" quando c'è almeno un filtro attivo
- **accentColor**: giallo `#FFDA2A` se tema = Tutti, altrimenti colore del tema
- **Natura "Sequenza" vs "Sequenze"**: il dropdown mostra "Sequenza" (singolare) ma filtra per `'Sequenze'` (valore reale nel DB) — mapping interno in `filteredVideos`

### `NatureCarousel`
- Slider orizzontale con 8 card formato (immagini da `public/images/nature/`)
- Usato **solo** nella sezione "I Formati ADAM" (rimosso dalla home)
- Click su formato → filtra la griglia per natura; quando una natura è selezionata il titolo della sezione scompare (c'è già il chip nell'header)

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

### `AboutSection`
- Sezione `activeSection === 'about'` — "Scopri ADAM"
- Lottie logo (stesso di HeroSection) affiancato al titolo in cima
- Trittico: **01 COSA** / **02 COME** / **03 PERCHÉ** — numeri gialli `#FFDA2A`
- CTA in fondo: **Esplora l'archivio** (→ home + scroll a FiltersSection) | **Partecipa →** (→ submit)
- HeroSection ha bottone `Scopri ADAM` in basso a destra (`z-10` per stare sopra iframe YouTube)

### `SharedPlaylistView`
- Sezione `activeSection === 'shared-playlist'` — visibile via URL `?playlist=<token>`
- Carica la playlist pubblica via `share_token` da Supabase (no auth richiesta)
- Mostra griglia video card cliccabili (apre VideoModal)
- **Non loggato**: bottone "Riproduci (1 volta)" (one-shot, check `localStorage adam-shared-played-{token}`) + "Salva in ADAM" (→ login)
- **Loggato**: bottone "Riproduci" + "Salva nelle mie playlist" (giallo → crea copia, poi disabilitato con ✓)
- Quando salvata: badge pulsante sull'icona Playlist in header smette di lampeggiare

### Playlist — Condivisione
**Colonne aggiuntive su tabella `playlists` (già eseguite):**
```sql
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS share_token text UNIQUE;
ALTER TABLE playlists ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
CREATE POLICY "Public read shared playlists" ON playlists FOR SELECT USING (is_public = true);
```
**Funzioni in App:**
- `sharePlaylist(playlistId)` — genera UUID token, salva su Supabase, aggiorna stato locale, restituisce token
- `saveSharedPlaylist(name, videoIds)` — crea nuova playlist nel proprio account copiando nome e video
- `loadSharedPlaylist(token)` — query pubblica per `share_token`, setta `sharedPlaylistRaw` e `activeSection = 'shared-playlist'`
- URL detection al mount: `new URLSearchParams(window.location.search).get('playlist')`

**PlaylistSidebar — UI aggiornata:**
- Vista 1 (lista): ChevronRight giallo `#FFDA2A`, `size={20}`, primo bottone nella riga
- Vista 2 (playlist aperta): bottone "Condividi" full-width in fondo, sotto "Riproduci Playlist"
- Icona share piccola (`Share2`) nell'header accanto alla X resta in Vista 2
- Toast "Link copiato negli appunti" — posizionato in alto (`top-20`) se click dall'icona header, in basso (`bottom-6`) se click dal bottone in fondo
- `copiedShareSource: 'top' | 'bottom'` per gestire posizione toast

**Badge playlist in header:**
- Quando `sharedPlaylistRaw && user && activeSection === 'shared-playlist'`: badge giallo pulsante (`animate-pulse`) con count video received
- Smette di lampeggiare quando `sharedPlaylistSaved = true`

**PlaylistPlayer — comportamento chiusura:**
- Alla chiusura (sia locale che Supabase): `setShowPlaylist(true)` → riapre sidebar playlist sulla sezione attiva

### Playlist
- **PlaylistSidebar**: lista drag & drop con riordinamento, condivisione playlist
- **PlaylistPlayer**: fullscreen con controlli Prev/Next e autoplay — alla chiusura riapre la sidebar

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

- In home: **nascosta** (`opacity:0`) finché la `FiltersSection` è nel viewport; appare con transizione quando scorre fuori
- In tutte le altre sezioni: sempre visibile
- Rilevamento visibilità tramite **`IntersectionObserver`** su `filtersSectionRef` (threshold: `0.5` — appare quando metà della FiltersSection è uscita dal viewport)
- Click sul campo → dropdown con 4 bottoni tema
- **Chip tema**: sincronizzato bidirezionalmente con `filters.tema` — selezionando un tema dai bottoni FiltersSection in home, il chip appare anche nell'header (via `useEffect` su `filters.tema`)
- **Chip natura**: appare in "I Formati ADAM" quando una natura è selezionata dal carousel
- Il padding sinistro dell'input si adatta dinamicamente alla larghezza dei chip attivi (`tagWidth`, `naturaTagWidth`)
- **Pillole filtri avanzati**: quando FiltersSection è fuori viewport e ci sono filtri avanzati attivi (natura, anno, scuola, durata), appaiono come chip rimovibili sotto il campo search nell'header — con i nomi reali dei valori (es. "Cortometraggio", "2019", "Solo scuole")
- Tutti i chip usano `rounded-md`
- Auto-focus sull'input dopo selezione tema (`setTimeout 50ms`)

---

## Stato risultati vuoti

Quando `filteredVideos.length === 0`, mostra icona videocamera + "Nessun video trovato" con `py-12` (non `min-height: 60vh` sulla griglia — rimosso per evitare che il messaggio appaia troppo in basso).

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
- La sezione **WOW** è stata rimossa dal menu laterale
- Il **NatureCarousel è rimosso dalla home** — rimane solo in "I Formati ADAM"
- Lo **scroll automatico ai risultati** è stato rimosso (rimossi `scrollToResults`, `carouselRef`, `resultsRef`)
- La **FiltersSection non è più sticky** in home — scorre con la pagina
- I `views` sono randomizzati al caricamento (`addRandomViews`) — non sono dati reali
- Il campo **`codice`** è obbligatorio e non va mai lasciato vuoto — è il riferimento al file fisico locale
- La tabella **`videos`** su Supabase contiene gli stessi 420 record di `videosData.js` (migrati) più i nuovi approvati/inseriti dall'admin
- Il tab Archivio usa `allVideos` prop (già in memoria nell'app) — non fa query Supabase separata
- **Natura "Sequenza"**: nel dropdown filtri mostra "Sequenza" (singolare) ma il valore reale nel DB è `'Sequenze'` — la mappatura avviene in `filteredVideos`
