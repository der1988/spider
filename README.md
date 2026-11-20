# Tamago · La caccia

Caccia strategica a schermata fissa. Collega un DualShock 4 o DualSense, apri il gioco nel browser e premi un tasto. Fai clic nella pagina se il browser richiede un gesto per attivare l’audio.

- **Stick sinistro** per muoverti e dondolare. Sul filo attivo, spingi **su** per risalire e **giù** per staccarti. Con **su** puoi anche aggrapparti a un filo già fissato.
- **Stick destro** per mirare in ogni direzione. **R1** lancia verso il primo appiglio entro la portata. Pareti, soffitto, pavimento e piattaforme accettano la seta.
- **L1** carica il salto, che parte al rilascio. Un tocco breve fa un saltello. Il menu **Salto** regola il limite.
- Osserva i corridoi ai lati della piattaforma centrale. Avvicinandoti, spingi la mosca a cambiare rotta. Tendi un filo tra due appigli mentre è in manovra. Il filo comincia a lampeggiare prima di sparire, dopo **10 secondi**.
- Ogni cattura vale un punto. Dopo il tremolio la prossima mosca entra con **60 secondi** e le vecchie tele spariscono. Allo scadere premi **×** per ricominciare.

## Sviluppo

Con Node.js 24, esegui `npm ci` e `npm run dev`. Per i controlli esegui `npm run lint`, `npm test` e `npm run build`. La build Vite usa `dist` e conserva il supporto offline dopo il primo caricamento.

[Note su fisica, mosca e timer](docs/architettura.md)
