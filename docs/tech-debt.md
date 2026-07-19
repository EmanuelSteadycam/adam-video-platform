# Tech debt / backlog

Elementi segnalati ma non risolti, con il contesto di quando sono emersi.

## Generazione progressiva codice `HD-YYNNNN`

Formato desiderato: `HD-` + anno a 2 cifre + progressivo a 4 cifre (es. `HD-260001`), che
riparte da `HD-XX0001` al cambio anno.

**Stato**: nessun meccanismo di generazione atomica esiste — né oggi né in passato (verificato
il 17 luglio 2026 con ricerca esaustiva nel codice, nell'intera storia git su tutti i branch, e
query diretta sul database Supabase: unica funzione RPC presente è `increment_slot_bookings`,
non correlata). Il campo `codice` oggi è un `<input>` di testo compilato a mano dall'admin, con
protezione da duplicati solo reattiva (check contro l'array `allVideos` già in memoria lato
client + cattura dell'errore Postgres `23505` dopo un insert fallito) — non adatta a generare
in sicurezza un progressivo sotto concorrenza tra admin.

**Dati esistenti**: 421 record in `videos`, tutti con prefisso `HD` ma **nessuno** nel formato
`HD-YYNNNN` (zero risultati su query `codice=like.HD-*`) — nessuna collisione, nessuna
migrazione necessaria. I codici legacy (`HD####-NN`, migrati da `videosData.js`) usano un
numero a 4 cifre che è un riferimento di collezione/scaffale interno, non un anno — schema
semanticamente scollegato dal nuovo formato.

**Da fare**: progettare da zero un meccanismo atomico lato database — una Postgres sequence
nativa con reset condizionale sull'anno, oppure una funzione RPC con `SELECT ... FOR UPDATE`
su una riga di contatore — poi collegarlo al flusso di generazione sinossi in
`AdminSection` (`src/App.jsx`).

## Tabelle Supabase `display_bookings` / `display_slots` non documentate

Trovate il 17 luglio 2026 elencando le funzioni RPC esposte dal progetto Supabase (durante la
diagnosi del punto precedente): oltre alle tabelle note di ADAM (`profiles`, `videos`,
`video_submissions`, `playlists`), lo schema espone anche `display_bookings`, `display_slots`,
`posts`, `categories`, `media`, più una funzione RPC `increment_slot_bookings` — nessuna di
queste è menzionata in `CLAUDE.md` né referenziata da nessuna parte di questo codebase
(`src/App.jsx`, `api/*.js`, `nas-server/server.js`).

**Da chiarire**: sono residui di un'altra applicazione che condivide lo stesso progetto
Supabase, o una feature di ADAM mai documentata/completata? Se sono di un altro progetto,
varrebbe la pena capire se è previsto isolarle (schema/progetto Supabase separato) per evitare
ambiguità future in fase di esplorazione del database.
