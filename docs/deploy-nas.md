# Deploy manuale di `nas-server` sul NAS

> **Nota sulla provenienza**: le informazioni su Docker/File Station/percorsi in questa pagina sono
> riportate dall'utente (verifica fatta direttamente sul NAS, fuori da questa sessione) — non sono
> state verificate da Claude, che non ha accesso a File Station né SSH sul NAS. Le uniche parti
> verificate direttamente da Claude in sessione sono i comandi `curl` di controllo in fondo alla pagina.

## Dove vive il codice

- Il server gira in un **container Docker**, non come processo Node nudo.
- Codice sorgente (`docker-compose.yml`, `Dockerfile`, `server.js`) nella cartella
  `docker/adam-nas-server` su File Station del NAS.
- Il container espone il servizio su:
  - `steadytube-nas.synology.me:3100` (esterno, DDNS — è il valore di `NAS_URL` in `.env`)
  - `192.168.1.89:3100` (LAN locale, stesso NAS)
- Il file `server.js` in questo repository (`nas-server/server.js`) è la sorgente di verità
  versionata — quello sul NAS va tenuto allineato manualmente (vedi procedura sotto).

## Perché serve una procedura manuale (non basta "Riavvia")

Il 17 luglio 2026 è stato diagnosticato che la route `/save-video` mancava sul server in
esecuzione sul NAS, pur essendo presente da tempo in questo repository (commit `7143a38`) — il
codice deployato era rimasto disallineato dal repository. Causa: aggiornare solo il file
`server.js` su File Station e poi premere "Costruzione" / "Riavvia" da Container Manager
**non forza un rebuild dell'immagine Docker se un'immagine con lo stesso tag esiste già in
cache** — Container Manager riusa l'immagine cache invece di ricostruirla con il file nuovo.

## Procedura di deploy corretta

1. **Carica manualmente** il file `server.js` aggiornato (da questo repo,
   `nas-server/server.js`) su File Station, nella cartella `docker/adam-nas-server`,
   **sovrascrivendo quello esistente** — *prima* di toccare il container.
2. Apri **Container Manager** sul NAS.
3. **Ferma ed elimina il container** esistente del progetto (non basta fermarlo: va rimosso).
4. **Elimina anche l'immagine** precedente associata (Container Manager → Immagine → elimina).
   Questo passaggio è quello che si dimentica più spesso ed è la causa del deploy "silenzioso"
   che non aggiorna nulla.
5. Ricostruisci l'immagine da `docker-compose.yml` (Container Manager → Progetto → Costruzione).
6. Avvia il nuovo container.
7. Esegui i controlli post-deploy sotto per confermare che la versione nuova sia davvero live.

## Verifica post-deploy

Sostituisci `$NAS_URL` e `$NAS_SECRET` con i valori da `.env` (`NAS_URL`, `NAS_SECRET`).

```bash
# 1. Health check — il container risponde?
curl -s http://$NAS_URL:3100/health
# atteso: {"status":"ok","time":"..."}

# 2. La route /save-video esiste? (body vuoto, verifica solo il routing, nessun download reale)
curl -s -i -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NAS_SECRET" \
  -d '{}' \
  http://$NAS_URL:3100/save-video
# atteso: 400 Bad Request con JSON tipo {"error":"Campi obbligatori: youtubeUrl, codice, tema, natura"}
# se invece torna 404 con body testuale "Not found" (senza Content-Type JSON):
# la route NON esiste ancora sul container -> il deploy non ha aggiornato il codice, ripeti la procedura sopra
```

Il secondo comando è il vero test: un `404` con corpo JSON strutturato indicherebbe comunque un
server aggiornato ma senza quella route; un `404`/testo semplice `Not found` **senza**
`Content-Type: application/json` è il sintomo esatto riscontrato il 17 luglio 2026 quando il
container eseguiva ancora la versione vecchia del codice.
