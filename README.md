# Tamago

Una creatura virtuale originale su un piccolo display LCD. Aspetta la schiusa, poi nutrila, gioca con lei e tienila pulita. Apri **Bisogni** per vedere tutti gli indicatori. Puoi toccare direttamente un'azione o usare **Seleziona**, **Conferma** e **Indietro**. Durante il sonno puoi cambiare la luce. **Cura** è utile quando la creatura si ammala.

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

In sviluppo aggiungi `?rapido` per far avanzare il tempo a 360× con un salvataggio separato. Un adulto richiede circa otto minuti in questa modalità. Il service worker è attivo nel build di produzione. Per verificarlo in locale usa il server di preview, attendi l'attivazione del worker, poi passa offline e ricarica.

## Vercel e iPhone 13

1. Pubblica i commit nel repository GitHub e importalo in Vercel con il piano Hobby, se idoneo. Il preset Vite usa `npm run build` e la cartella `dist`.
2. Apri l'URL HTTPS del deploy in Safari. Attendi il primo caricamento con connessione attiva.
3. Dal menu di condivisione scegli **Aggiungi alla schermata Home**. Se presente, abilita **Apri come app web**, quindi tocca **Aggiungi**.
4. Apri Tamago dalla schermata Home mentre sei ancora online per inizializzare il salvataggio e la cache nell'app installata. Poi puoi giocare offline sullo stesso dispositivo.

I progressi sono locali al browser o all'app installata. La cancellazione dei dati del sito può rimuoverli. Safari e l'app installata possono avere contenitori distinti.

Le decisioni sulla simulazione, il salvataggio e il lavoro con Codex sono in [docs/architettura.md](docs/architettura.md).
