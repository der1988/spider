# Tamago

**Il sentiero di seta** è la prima area di Tamago, un gioco LCD in cui un piccolo ragno attraversa il sottobosco.

Collega un DualShock 4 o DualSense al PC, apri il gioco e premi un tasto sul controller. Se il browser blocca l’audio all’avvio, fai clic nella pagina una volta.

- **Stick sinistro** per muoverti e dondolare. Quando sei appeso, spingi su per risalire e giù per staccarti.
- **Stick destro** per mirare. **R1** lancia la seta nella direzione indicata, anche se hai già lasciato lo stick.
- **L1** salta. Il gioco si controlla con il joypad e si adatta alla finestra.
- Sopra la foglia della rugiada inizia la salita a zig zag. Da sotto le foglie, cerca l’estremità libera verso il prossimo appiglio. In cima trovi il **germoglio della chioma**. Ai bordi laterali il sentiero fa il giro e continua dal lato opposto.
- Al primo vuoto puoi tendere fili sulla rotta delle mosche. Cammina su un filo per recuperare una mosca e guadagnare seta per un ponte. Ricarica la pagina per iniziare una nuova partita.

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

## Pubblicazione

Il preset Vite per Vercel usa `npm run build` e la cartella `dist`. Dopo il primo caricamento via HTTPS, il service worker rende disponibile anche l’avvio offline. La preferenza audio resta salvata nel browser.

[Note su fisica e comandi](docs/architettura.md)
