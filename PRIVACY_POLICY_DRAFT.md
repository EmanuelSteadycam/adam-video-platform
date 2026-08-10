# Informativa sulla Privacy — ADAM (Archivio Digitale Addiction e Media)

> **Bozza di lavoro — non pubblicare così com'è.** Preparata per due scopi: (1) avere
> un testo pubblicabile su ADAM, (2) soddisfare il requisito di Meta (link a una
> Privacy Policy pubblica) per la richiesta di revisione "oEmbed Read". Non è
> consulenza legale — prima di pubblicarla va fatta rileggere/approvata dal DPO
> ASL CN2 (dati sotto), che dovrebbe già seguire le altre informative dell'ente
> (es. quella del progetto Steadycam). Restano pochi campi segnati
> **[DA COMPLETARE]**: soprattutto se ADAM debba avere un'informativa autonoma
> (come impostata qui) o essere ricondotta sotto l'informativa generale ASL CN2 con
> un semplice richiamo — è una scelta che spetta al DPO, non tecnica.

*Ultimo aggiornamento: [DA COMPLETARE — data di pubblicazione]*

---

## 1. Chi siamo

ADAM (Archivio Digitale Addiction e Media) è una piattaforma che raccoglie un
archivio di video (spot, cortometraggi, videoclip e altri formati) su temi legati
alle dipendenze — alcool, azzardo, digitale, sostanze, tabacco, sessualità — ad uso
di educatori sociali e operatori in contesti educativi. Gli utenti registrati
possono consultare l'archivio, creare playlist personali e segnalare nuovi video da
valutare per l'inserimento. ADAM è un progetto di ASL CN2 Alba-Bra, come il
progetto Steadycam.

**Titolare del trattamento:** ASL CN2 Alba-Bra (Azienda Sanitaria Locale CN2) —
Via Vida, 10 – 12051 Alba (CN) — PEC: aslcn2@legalmail.it — Tel: +39 0173.316.111.

**Responsabile della Protezione dei Dati (DPO):** Giuseppe Cannella — email:
dpo@aslcn2.it — tel: +39 0276398404 — cell: +39 3356894333.

**Gestione tecnica del sito:** MOTIVA SCS — Corso Michele Coppino n. 48/C-B, Alba
(CN) — cooperativa sociale a cui è affidata in appalto, tra le altre cose, la
gestione dei siti web del progetto, inclusa l'infrastruttura tecnica di ADAM.
MOTIVA SCS tratta i dati nell'ambito di questo affidamento in appalto.

Per richieste operative relative ad ADAM è possibile scrivere a
steadycam01@gmail.com. Per l'esercizio dei diritti GDPR resta comunque valido
il contatto del DPO indicato sopra.

---

## 2. Quali dati raccogliamo

### 2.1 Dati di registrazione e profilo
Per creare un account su ADAM chiediamo: **email**, **password** (mai conservata in
chiaro — la gestione dell'autenticazione è affidata al fornitore Supabase, che la
salva in forma cifrata), **nome** e **organizzazione/ente di appartenenza**
(quest'ultimo campo aiuta a capire il contesto d'uso della piattaforma).

### 2.2 Segnalazioni video
Quando un utente segnala un video (sezione "Partecipa"), raccogliamo: il link del
video, un titolo, il tema, una descrizione facoltativa, ed eventualmente
l'informazione che il video è stato prodotto da una scuola. La segnalazione resta
associata all'account che l'ha inviata, così l'utente può seguirne lo stato
(in attesa, approvata, rifiutata) nella propria area "I miei video".

### 2.3 Playlist
Gli utenti registrati possono creare playlist private di video già presenti in
archivio. Una playlist può essere condivisa tramite un link pubblico generato dalla
piattaforma; chiunque riceva quel link può vederne il contenuto senza dover
accedere con un account.

### 2.4 Dati tecnici
Come qualunque sito web, il nostro fornitore di hosting (Vercel) registra in modo
automatico dati tecnici delle richieste (es. indirizzo IP, tipo di browser, pagina
richiesta) per finalità di funzionamento, sicurezza e diagnosi di problemi tecnici.
Usiamo inoltre alcune informazioni salvate localmente sul dispositivo (vedi sezione
Cookie) per far funzionare correttamente la piattaforma (es. ricordare l'accesso,
non ripetere un avviso già visto).

**Non raccogliamo** dati di pagamento (ADAM non prevede acquisti), né effettuiamo
profilazione pubblicitaria o tracciamento a fini di marketing.

---

## 3. Perché usiamo questi dati (finalità e base giuridica)

| Dato | Finalità | Base giuridica |
|---|---|---|
| Email, password | Creazione e gestione dell'account, accesso sicuro | Esecuzione di un servizio richiesto dall'utente |
| Nome, organizzazione | Contestualizzare l'uso della piattaforma da parte di educatori/enti | Esecuzione di un servizio richiesto dall'utente |
| Segnalazioni video | Valutare e, se pertinenti, aggiungere video all'archivio | Esecuzione di un servizio richiesto dall'utente |
| Playlist | Consentire di organizzare e condividere selezioni di video | Esecuzione di un servizio richiesto dall'utente |
| Dati tecnici di navigazione | Sicurezza, funzionamento e diagnosi della piattaforma | Legittimo interesse del titolare |

Non utilizziamo i dati per finalità diverse da quelle sopra indicate, né li
vendiamo a terzi.

---

## 4. Con chi condividiamo i dati

La gestione tecnica di ADAM è affidata a MOTIVA SCS (vedi punto 1), che si
appoggia ad alcuni fornitori esterni per far funzionare la piattaforma, i quali
trattano i dati secondo le rispettive policy:

- **Supabase** — database, autenticazione e conservazione dei dati di account,
  segnalazioni e playlist. I dati sono ospitati nella regione UE **eu-west-1
  (Irlanda)**, quindi all'interno dello Spazio Economico Europeo.
- **Vercel** — hosting del sito e delle funzioni che lo fanno funzionare.
- **Anthropic (Claude)** e **Groq** — usati internamente dal team ADAM (non
  dagli utenti direttamente) per generare in automatico una bozza di descrizione
  dei video segnalati, a partire dal contenuto pubblico del video stesso — non
  dati personali dell'utente che lo ha segnalato.
- **YouTube, TikTok, Instagram** — quando si guarda un video all'interno di ADAM,
  il player è fornito direttamente da queste piattaforme (embed): la
  visualizzazione avviene quindi anche alle loro condizioni, e queste piattaforme
  possono impostare propri cookie o raccogliere dati secondo le rispettive
  informative privacy, che invitiamo a consultare.

Non condividiamo i dati di account con altri soggetti terzi al di fuori di quanto
sopra.

---

## 5. Cookie e dati locali sul dispositivo

ADAM utilizza cookie/local storage **tecnici**, necessari al funzionamento del
servizio (es. mantenere l'accesso effettuato, ricordare se un avviso è già stato
mostrato). Non utilizziamo cookie di profilazione o pubblicitari propri. Va tenuto
presente che i player video di terze parti incorporati (punto 4) possono impostare
i propri cookie secondo le rispettive policy, indipendenti da ADAM.

---

## 6. Per quanto tempo conserviamo i dati

I dati di account, segnalazioni e playlist vengono conservati finché l'account resta
attivo. Un utente può richiedere in qualsiasi momento la cancellazione del proprio
account e dei dati associati, scrivendo al DPO (dpo@aslcn2.it).
[DA COMPLETARE — se esistono tempi di conservazione più specifici o obblighi di
legge da rispettare, indicarli qui.]

---

## 7. I tuoi diritti

In quanto interessato, hai diritto di: accedere ai tuoi dati personali, chiederne
la rettifica o la cancellazione, limitarne il trattamento, opporti al trattamento,
e richiederne la portabilità, nei limiti previsti dalla normativa applicabile
(Regolamento UE 2016/679 — GDPR, per gli utenti nell'Unione Europea).
Per esercitare questi diritti scrivi al DPO (dpo@aslcn2.it). Hai inoltre diritto
di proporre reclamo all'Autorità Garante per la protezione dei dati personali.

---

## 8. Sicurezza

Adottiamo misure tecniche e organizzative ragionevoli per proteggere i dati
raccolti (es. password mai salvate in chiaro, accesso al database protetto da
regole di sicurezza a livello di riga). Nessun sistema è tuttavia sicuro al 100% —
in caso di violazione dei dati che comporti un rischio per gli utenti, agiremo
secondo quanto previsto dalla normativa applicabile.

---

## 9. Modifiche a questa informativa

Questa informativa può essere aggiornata nel tempo, ad esempio in caso di nuove
funzionalità della piattaforma. La data di ultimo aggiornamento è indicata in
cima alla pagina.

---

## 10. Contatti

Per qualsiasi domanda su questa informativa o sul trattamento dei tuoi dati:
DPO ASL CN2 Alba-Bra — dpo@aslcn2.it.
[DA COMPLETARE — eventuale email operativa dedicata al progetto ADAM, se si
preferisce non indirizzare le richieste quotidiane direttamente al DPO.]
