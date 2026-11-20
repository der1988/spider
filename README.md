# Tamago

**Il sentiero di seta** è la prima area di Tamago, un gioco LCD in cui un piccolo ragno attraversa il sottobosco.

- Muoviti con **A/D**. Tieni premuto **Spazio**, punta un rametto con le **frecce** e rilascia **Spazio** per agganciarti.
- Una volta appeso, usa **A/D** per darti slancio, **W** per risalire e **S** per staccarti mantenendo la velocità. Puoi lanciare un altro filo mentre sei in aria.
- Su touch, trascina sul paesaggio e rilascia sul bersaglio per tirare. I pulsanti sul display controllano camminata, risalita e sgancio.
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
4. Apri Tamago dalla schermata Home mentre sei ancora online per inizializzare il salvataggio e la cache nell'app installata. Poi puoi giocare offline sullo stesso dispositivo.

La preferenza audio è locale al browser o all’app installata.

Le decisioni sulla simulazione, il salvataggio e il lavoro con Codex sono in [docs/architettura.md](docs/architettura.md).
