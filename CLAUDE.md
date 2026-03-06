# ADAM — Archivio Digitale Addiction e Media

Piattaforma video per educatori sociali. Archivio di video (spot, cortometraggi, videoclip) su temi legati alle dipendenze (Alcool, Azzardo, Digitale, Sostanze), usati in contesti educativi.

---

## Stack Tecnico

- **React 18** con hooks (useState, useMemo, useRef, useEffect)
- **Vite** come bundler
- **Tailwind CSS** per lo styling
- **lucide-react** per le icone
- **lottie-react** per l'animazione del logo nell'hero
- Tutto il codice è in **un unico file**: `src/App.jsx`
- I dati video sono in `src/videosData.js` (420 video, generato automaticamente)
- CSS custom iniettato via `document.createElement('style')` all'inizio di App.jsx

---

## Struttura File

```
src/
  App.jsx          — tutto il codice React (componenti, stato, logica)
  videosData.js    — array di 420 oggetti video (generato automaticamente)
  index.css        — stili base Tailwind
  main.jsx         — entry point React

public/
  logo-animation.json        — animazione Lottie del logo ADAM
  images/nature/             — immagini delle 8 tipologie di formato video
    cortometraggio.jpg, film.jpg, info.jpg, sequenza.jpg,
    spot-adv.jpg, spot-sociale.jpg, videoclip.jpg, web-social.jpg
```

---

## Struttura Dati Video (`videosData.js`)

Ogni video ha questi campi:

```js
{
  id: "HD1931-01",           // identificatore unico
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

---

## Componenti Principali

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
- Il massimo (`DUR_MAX`) è calcolato dinamicamente dai dati

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
- Il progetto non ha backend — tutti i dati sono statici in `videosData.js`
