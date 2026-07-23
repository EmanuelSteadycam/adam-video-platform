---
name: handoff
description: Generate HANDOFF.md at the project root summarizing the current session in clear prose — what was done, exact current state, decisions and why, open blockers, and concrete next steps. Never invents details; marks anything uncertain explicitly. Use when the user types /handoff or asks to hand off, wrap up, or document the state of the current work session.
---

# /handoff

Quando questa skill viene invocata, scrivi (sovrascrivendo se già esiste) il file
`HANDOFF.md` nella root di questo progetto (`adam-video-platform/HANDOFF.md`).

## Regola vincolante: verifica, non ricordare a memoria

Prima di scrivere qualunque affermazione sullo stato del repo, controllala con comandi
reali — non fidarti solo del contesto conversazionale, che può essere stato riassunto o
compattato e aver perso dettagli. Esegui almeno:

- `git status --short` — file modificati/non tracciati in questo momento
- `git diff --stat` — entità reale delle modifiche non committate
- `git log --oneline -10` — commit recenti, per distinguere cosa è già salvato da cosa
  resta pending
- se la sessione ha toccato codice buildabile, `npm run build` (o il comando equivalente
  pertinente) per confermare se il progetto builda pulito in questo momento

Se il contesto della conversazione corrente menziona file, endpoint, bug, decisioni o
numeri (costi, latenze, conteggi) che non riesci a confermare guardando il repo/i comandi
in questo momento, scrivilo esplicitamente come "non verificato in questa generazione del
documento" o "riportato in conversazione ma da riconfermare" — non presentarlo con lo
stesso tono di un fatto accertato. Non riempire mai un vuoto di informazione con un
dettaglio plausibile inventato.

## Contenuto del documento

Scrivi in prosa chiara — frasi complete che spiegano il ragionamento, non un semplice
elenco puntato. È accettabile usare intestazioni per orientarsi, ma il contenuto sotto
ogni sezione deve essere discorsivo. Copri:

1. **Cosa è stato fatto** — racconta il lavoro della sessione come una narrazione: cosa si
   voleva ottenere, che percorso si è seguito, cosa ha funzionato al primo tentativo e cosa
   ha richiesto correzioni o ripensamenti, incluse eventuali inversioni di rotta (es. un
   approccio tentato e poi abbandonato per un altro, e perché).
2. **Stato attuale esatto** — file modificati/creati (verificati con git, non a memoria),
   se esistono commit fatti o se tutto è ancora pending, se il progetto builda, se ci sono
   servizi/processi in esecuzione rilevanti (dev server, tunnel, ecc.) che chi riprende il
   lavoro dovrebbe conoscere, e quali credenziali/variabili d'ambiente sono coinvolte.
3. **Decisioni prese e perché** — ogni scelta architetturale o di design non ovvia, con la
   motivazione reale ("si è scelto X invece di Y perché Z"), non solo l'esito.
4. **Blocchi o problemi aperti** — limiti noti, bug non risolti, dipendenze esterne non
   disponibili (es. credenziali mancanti, servizi non raggiungibili), comportamenti non
   deterministici osservati, o qualunque cosa richieda ancora attenzione prima di
   considerare il lavoro concluso.
5. **Prossimi passi concreti** — cosa fare dopo, in ordine di priorità se possibile.

## Se manca contesto

Se non hai visibilità sufficiente sulla sessione corrente per scrivere una sezione con
cognizione di causa (es. la skill viene invocata dopo che la conversazione è stata
compattata e mancano dettagli rilevanti), dillo esplicitamente in cima al documento invece
di inventare contenuti plausibili per riempire i vuoti. Meglio una sezione onestamente
incompleta che una ricostruzione inventata.

## Dopo aver scritto il file

Conferma all'utente in una risposta breve che `HANDOFF.md` è stato scritto/aggiornato,
segnalando esplicitamente se qualche sezione è rimasta incompleta o incerta per mancanza
di contesto verificabile.
