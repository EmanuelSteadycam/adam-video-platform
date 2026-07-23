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

## Esclusione strutturata per "natura" nella ricerca in linguaggio naturale

Emerso il 22 luglio 2026 durante lo stress-test della ricerca smart (`api/search-parse.js` +
`excludeKeywords` in `src/App.jsx`) con la query "video sul tabacco non per adulti e non
pubblicitari": il campo `natura` supporta solo una selezione singola (un valore o `null`), non
un'esclusione. Quando la query nega esplicitamente un formato (es. "non pubblicitari" →
concettualmente "natura diversa da Spot commerciale"), il modello non ha modo di esprimerlo nel
campo `natura` e lo riversa come testo libero dentro `excludeKeywords` (es. `["pubblicitari"]`).

**Stato**: funziona solo per coincidenza — il video viene escluso unicamente se quella parola
compare *letteralmente* in titolo/descrizione, non perché il suo campo `natura` corrisponda
davvero al formato da escludere. Non è una vera esclusione di categoria, è un match testuale
approssimato. Verificato dal vivo: query "video sull'azzardo non per adulti e non
pubblicitari" → 207 risultati (contro ~230 del solo tema Azzardo), quindi il testo `pubblicitari`
intercetta *qualcosa* ma senza garanzia di correttezza/copertura sul campo `natura` reale.

**Da valutare**: se in futuro emergono altre negazioni di formato ricorrenti, introdurre un
campo strutturato separato tipo `excludeNatura` (stesso enum di `natura`, ma come esclusione
vera contro il campo del video, non contro il testo) nello schema restituito da
`api/search-parse.js` e nella logica di `filteredVideos`.

## Ricerca semantica (api/semantic-search.js) — confusione categoria+brand nello stesso query

Emerso il 22 luglio 2026 durante il testing della ricerca semantica (stadio 2, che manda a
Haiku titolo+sinossi dei video candidati e chiede di restituire gli ID pertinenti leggendo il
significato reale del testo, non per parole chiave). Caso concreto: il tema Digitale contiene
sia smartphone reali (`Samsung Galaxy`, `Z Fold`, `Z Flip`, iPhone...) sia un video etichettato
"Samsung Gear" che in realtà è un visore VR, non uno smartphone.

**Stato**: query basate solo sulla categoria ("video sullo smartphone", "video su un telefono
cellulare") escludono correttamente "Samsung Gear" in modo affidabile — verificato 8/8 esecuzioni
su due formulazioni diverse. Ma query che menzionano ESPLICITAMENTE sia il brand che la categoria
insieme ("dispositivo Samsung smartphone") includono erroneamente "Samsung Gear" in 4 esecuzioni
su 5, anche dopo aver aggiunto al prompt un'istruzione esplicita di attenzione alla categoria del
prodotto (non solo al brand). Il nome del brand sembra "trascinare dentro" tutti i contenuti con
quel brand indipendentemente dalla categoria richiesta, anche quando l'istruzione dice il
contrario. Non è un bug di codice — è un limite di affidabilità del modello su query che
combinano brand + categoria quando quel brand copre più categorie di prodotto nell'archivio, e
resta anche dopo un tentativo di correzione via prompt.

**Da valutare**: se questo tipo di query (brand + categoria) risultasse frequente in produzione,
si potrebbe tentare un secondo giro di prompt engineering più mirato (few-shot example esplicito
nel prompt con un caso Samsung Gear/Galaxy), oppure accettare il limite e documentarlo per gli
utenti come caratteristica nota della ricerca "intelligente" (non deterministica al 100%).
