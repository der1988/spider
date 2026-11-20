# Spider and Fly

Caccia strategica a schermata fissa. Collega un DualShock 4 o DualSense e seleziona **Start** per sbloccare la musica nel browser. Il timer e i comandi si attivano appena finisce «Start the clock».

- **Stick sinistro** per correre sul pavimento, sulle pareti e sul soffitto o per dondolare. Sul filo attivo, spingi **su** per risalire e **giù** per staccarti. Con **su** puoi anche aggrapparti a un filo già fissato.
- **Stick destro** per mirare in ogni direzione. **R1** lancia verso il primo appiglio entro la portata. Pareti, soffitto, pavimento e piattaforme accettano la seta. Se sei su una superficie, il tiro tende subito una ragnatela. Salta prima di sparare per dondolare: il filo si fissa quando tocchi una superficie valida. In aria puoi lanciare un secondo filo per spostare il dondolio sul nuovo appiglio.
- **L1** salta alla pressione. Premi di nuovo in aria per il doppio salto; un nuovo appoggio lo ripristina. Da appeso, L1 ritira i fili di movimento e ti lancia.
- Osserva i corridoi ai lati della piattaforma centrale. Avvicinandoti, spingi la mosca a cambiare rotta. Tendi un filo tra due appigli mentre è in manovra. Il filo comincia a lampeggiare prima di sparire, dopo **10 secondi**.
- Il timer al centro dell’HUD e i dettagli dell’arena pulsano sul battito. La barra sotto il timer indica quanto tempo resta. Ogni mosca è un livello. Il primo è il Livello 1 e ogni cattura vale un punto. Dopo ogni cattura la prossima mosca entra con un secondo in meno, da **60 secondi** a un minimo di **10 secondi**, e le vecchie tele spariscono. Ogni 5 catture la mosca accelera, ogni 10 reagisce prima alle tele e ogni 20 percepisce il ragno da più lontano.

## Classifica

A fine partita inserisci cinque lettere da **A** a **Z**. Con il joypad usa la croce direzionale o lo stick sinistro. Su e giù cambiano lettera, sinistra e destra spostano il cursore, **×** avanza o conferma l’ultima lettera, **○** chiude o salta. Con la tastiera puoi digitare o incollare le lettere, usare le frecce e premere Invio per salvare. Dopo aver chiuso la finestra, premi **×** per ricominciare. Il pulsante **Leaderboard** o **△** apre i primi 50 punteggi.

Le catture maggiori vengono prima. A parità di catture precede il punteggio registrato prima. Se la connessione cade, puoi riprovare con gli stessi dati della partita. Dopo il primo caricamento da un sito, la caccia è disponibile offline. La classifica condivisa richiede la connessione e un server configurato.

## Configurare la classifica su Vercel

1. Crea o riutilizza un database PostgreSQL, per esempio Neon o Supabase. Esegui [`server/scores.sql`](server/scores.sql) nel suo editor SQL prima del primo deploy della 2.0.
2. Nelle variabili d’ambiente del progetto Vercel aggiungi **`DATABASE_URL`** con la stringa di connessione PostgreSQL del provider, preferibilmente pooled e con TLS. Il ruolo deve poter leggere e inserire in `tamago_scores`. Imposta la variabile per l’ambiente **Preview** e il branch **`versione-2`**. La funzione legge il valore sul server.
3. Crea o ridistribuisci il deploy Preview del branch. Verifica che **`/api/scores`** risponda con un elenco JSON. Usa l’URL di quella preview per giocare con la classifica condivisa.

In locale, applica lo stesso SQL a un database PostgreSQL e avvia `npm run scores` con `DATABASE_URL` nell’ambiente del processo. Vite inoltra le richieste della classifica a quel server sia con `npm run dev` sia con `npm run preview`.

## Colonna sonora

**The Fly Has A** accompagna l’introduzione e la caccia. La musica prosegue durante le catture e i nuovi tentativi. **Options** sul joypad e il pulsante **Pause** fermano insieme musica e partita. **Audio Off** silenzia il gioco conservando la sincronizzazione.

## Sviluppo

Con Node.js 24, esegui `npm ci` e `npm run dev`. Per i controlli esegui `npm run lint`, `npm test` e `npm run build`. La build Vite usa `dist` e conserva il supporto offline dopo il primo caricamento.

[Note su fisica, mosca e timer](docs/architettura.md)
