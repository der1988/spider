# Tamago · La caccia

Caccia strategica a schermata fissa. Collega un DualShock 4 o DualSense, apri il gioco nel browser e premi un tasto. Fai clic nella pagina se il browser richiede un gesto per attivare l’audio.

- **Stick sinistro** per muoverti e dondolare. Con un filo attivo, spingi su per risalire e giù per staccarti.
- **Stick destro** per mirare e **R1** per lanciare. Aggancia una piattaforma e staccati vicino a una seconda superficie per fissare un filo.
- **L1** per saltare. Rilascialo presto per un saltello o tienilo durante la salita per un salto più alto. Puoi regolare l’altezza massima dal menu **Salto**.
- Osserva i due corridoi ai lati della piattaforma centrale. Prova a chiudere due passaggi, oppure aspetta a fissare il filo finché la mosca è già in manovra. Avvicinandoti la fai accelerare e cercare un varco. Il filo tratteggiato è il prossimo a sparire quando ne aggiungi un settimo.
- Ogni cattura vale un punto e dà 60 secondi per la mosca successiva. Le tele restano mentre continui la partita. Allo scadere, premi **×** per ripartire con l’arena pulita.

## Sviluppo

Con Node.js 24, esegui `npm ci` e `npm run dev`. Per i controlli esegui `npm run lint`, `npm test` e `npm run build`. La build Vite usa `dist` e conserva il supporto offline dopo il primo caricamento.

[Note su fisica, mosca e timer](docs/architettura.md)
