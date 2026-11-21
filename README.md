# Spider and Fly

Caccia strategica a schermata fissa. Collega un DualShock 4 o DualSense e scegli **Story** o **Infinite Loop** con la croce direzionale o lo stick sinistro. Conferma con **×** per avviare la musica. Puoi anche fare clic sul pulsante. Il timer parte appena finisce «Start the clock», anche se il controller è scollegato o lo stick è fermo. Da quel momento puoi usare i comandi.

- **Stick sinistro** per correre sul pavimento, sulle pareti e sul soffitto o per dondolare. Sul filo attivo, spingi **su** per risalire e **giù** per staccarti. Con **su** puoi anche aggrapparti a un filo già fissato.
- **Stick destro** per mirare in ogni direzione. **R1** lancia verso il primo appiglio entro la portata. Pareti, soffitto, pavimento e piattaforme accettano la seta. Se sei su una superficie, il tiro tende subito una ragnatela. Salta prima di sparare per dondolare: il filo si fissa quando tocchi una superficie valida. In aria puoi lanciare un secondo filo per spostare il dondolio sul nuovo appiglio.
- **L1** salta alla pressione. Premi di nuovo in aria per il doppio salto; un nuovo appoggio lo ripristina. Da appeso, L1 ritira i fili di movimento e ti lancia.
- Osserva i corridoi ai lati della piattaforma centrale. Avvicinandoti, spingi la mosca a cambiare rotta. Tendi un filo tra due appigli mentre è in manovra. Il filo comincia a lampeggiare prima di sparire, dopo **10 secondi**.
- Il timer al centro dell’HUD e i dettagli dell’arena pulsano sul battito. La barra sotto il timer indica quanto tempo resta. Ogni mosca è un livello. Il primo è il Livello 1 e ogni cattura vale un punto. In **Story**, dopo ogni cattura la prossima mosca entra con un secondo in meno, da **60 secondi** a un minimo di **10 secondi**. In **Infinite Loop** ogni mosca ha **20 secondi**. In entrambe le modalità le vecchie tele spariscono al cambio di mosca. Ogni 5 catture la mosca accelera, ogni 10 reagisce prima alle tele e ogni 20 percepisce il ragno da più lontano.

## Classifica

A fine partita in **Story** inserisci cinque lettere da **A** a **Z**. Con il joypad usa la croce direzionale o lo stick sinistro. Su e giù cambiano lettera, sinistra e destra spostano il cursore, **×** avanza o conferma l’ultima lettera, **○** chiude o salta. Con la tastiera puoi digitare o incollare le lettere, usare le frecce e premere Invio per salvare. Dopo aver chiuso la finestra, premi **×** per ricominciare. **△** apre i primi 50 punteggi.

Le catture maggiori vengono prima. A parità di catture precede il punteggio registrato prima. Se la connessione cade, puoi riprovare con gli stessi dati della partita. Dopo il primo caricamento da un sito, la caccia è disponibile offline. La classifica condivisa richiede la connessione e un server configurato.

## Configurare la classifica su Vercel

1. Crea o riutilizza un database PostgreSQL, per esempio Neon o Supabase. Esegui [`server/scores.sql`](server/scores.sql) nel suo editor SQL prima del primo deploy della 2.0.
2. Nelle variabili d’ambiente del progetto Vercel aggiungi **`DATABASE_URL`** con la stringa di connessione PostgreSQL del provider, preferibilmente pooled e con TLS. Il ruolo deve poter leggere e inserire in `tamago_scores`. Imposta la variabile per l’ambiente **Preview** e il branch **`versione-2`**. La funzione legge il valore sul server.
3. Crea o ridistribuisci il deploy Preview del branch. Verifica che **`/api/scores`** risponda con un elenco JSON. Usa l’URL di quella preview per giocare con la classifica condivisa.

In locale, applica lo stesso SQL a un database PostgreSQL e avvia `npm run scores` con `DATABASE_URL` nell’ambiente del processo. Vite inoltra le richieste della classifica a quel server sia con `npm run dev` sia con `npm run preview`.

## Colonna sonora

**The Fly Has A** accompagna l’introduzione e la caccia. A **240,330 s** parte **The Fly Has an Upgrade** dall’inizio. Dopo **119,580 s** parte **The Room Has a Space Bar**. Durante il terzo brano, una nuova pressione di **Space** passa a **The Fly Is You**. Il pulsante **Test Finale** in basso a destra avvia direttamente una prova della fase giocabile a **18,192 s**, con 10 secondi sul timer. Dopo la cutscene o da questa scorciatoia, lo stick sinistro controlla il volo della mosca. Il ragno insegue la mosca con salti frequenti e usa pareti e soffitto per avvicinarsi. All’inizio tende poche tele, poi aumenta la frequenza durante la caccia. La traccia tratteggiata anticipa dove tenderà la prossima tela. Cambia rotta prima che la fissi per sfuggire alla trappola. Attraversare una luce riporta il timer a 10 secondi. Le luci compaiono in punti casuali, distribuiti tra le varie zone della stanza. Premi e rilascia **×** otto volte per uscire da una tela. Allo scadere, **×** avvia un nuovo tentativo di dieci secondi sullo stesso brano. Negli ultimi 20 secondi il timer resta fermo fino alla fine della dissolvenza. L’arena e l’HUD diventano codice e si ricompongono nel menu delle modalità. Se il terzo brano arriva alla fine, la playlist torna al primo a **15,330 s**. La musica prosegue durante le catture e i nuovi tentativi. **Options** sul joypad o **Esc** sulla tastiera mettono in pausa musica e partita.

In **Infinite Loop** il brano omonimo sblocca il gioco a **10,572 s** dopo «Start the clock». La riproduzione torna da **139,530 s** a **15,330 s**, sul battito prima di «Left stick moves». Quando il tempo finisce, **×** azzera catture e difficoltà e riparte da **20 secondi** mentre il brano prosegue.

## Sviluppo

Con Node.js 24, esegui `npm ci` e `npm run dev`. Per i controlli esegui `npm run lint`, `npm test` e `npm run build`. La build Vite usa `dist` e conserva il supporto offline dopo il primo caricamento.

[Note su fisica, mosca e timer](docs/architettura.md)
