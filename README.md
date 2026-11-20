# Tamago

**Il sentiero di seta** è la prima area di Tamago, un gioco LCD in cui un piccolo ragno attraversa il sottobosco.

- Muoviti con **A/D** e salta con **J**. Punta un rametto con le **frecce** e premi e rilascia **Spazio** per agganciarti.
- Una volta appeso, usa **A/D** per darti slancio, **W** per risalire e **S** per staccarti mantenendo la velocità. Puoi lanciare un altro filo mentre sei in aria.
- Su telefono gioca in orizzontale. L’analogico sinistro muove il ragno. Quando sei appeso, spingilo di lato per darti slancio, in alto per risalire o decisamente in basso per staccarti. Inclina il destro per mirare e rilascialo per tirare. Il pulsante **Salto** è sopra lo stick destro.
- Con un gamepad riconosciuto dal browser, usa lo stick sinistro per muoverti e quello destro per mirare e tirare al ritorno al centro. Con lo stick sinistro, **su** fa risalire e **giù** stacca. Usa **A/×** per saltare. Puoi usare anche **LB/L1** e **B/○** per risalire e staccarti.
- Osserva le mosche al primo vuoto. Prova a tirare al rametto e a staccarti dal bordo di partenza per tendere il primo filo. Puoi anche dondolare fino alla sponda opposta e tendere un filo lungo quella rotta.
- Cammina su un filo fissato per recuperare una mosca e guadagnare **1 seta**. Torna sul bordo marcato di partenza e mira al rombo sulla foglia alta. Il lancio lungo consuma 1 seta solo se crea un ponte valido. Attraversalo per trovare il **seme d’ambra**. Puoi usare il ponte in entrambi i sensi. Fili, riserva e scoperte restano fino a fine partita. Ricarica o apri di nuovo la pagina per ripartire con il sottobosco vuoto.
- Attraversa il primo vuoto e cerca la rugiada sul percorso alto. Se cadi, riparti dall’ultimo punto sicuro. **Fisica** permette di regolare portata, accelerazione e risalita.

## Sviluppo

Servono Node.js 24 e npm.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

Il service worker è attivo nel build di produzione. Per verificarlo in locale usa il server di preview, attendi l'attivazione del worker, poi passa offline e ricarica. I punti sicuri della prima area valgono per la sessione di gioco.

## Vercel e iPhone 13

1. Pubblica i commit nel repository GitHub e importalo in Vercel con il piano Hobby, se idoneo. Il preset Vite usa `npm run build` e la cartella `dist`.
2. Apri l'URL HTTPS del deploy in Safari. Attendi il primo caricamento con connessione attiva.
3. Dal menu di condivisione scegli **Aggiungi alla schermata Home**. Se presente, abilita **Apri come app web**, quindi tocca **Aggiungi**.
4. Apri Tamago dalla schermata Home mentre sei ancora online per inizializzare la cache nell'app installata. Poi puoi giocare offline sullo stesso dispositivo.

La preferenza audio è locale al browser o all’app installata.

Le decisioni sulla simulazione, i comandi e il lavoro con Codex sono in [docs/architettura.md](docs/architettura.md).
