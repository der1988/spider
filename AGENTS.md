# Spider vs Fly

- Lavora nel checkout esistente. Leggi README.md e docs/architettura.md prima di cambiare il gioco.
- Mantieni la fisica in src/spider.ts e la trama in src/threads.ts indipendenti dal DOM. Il renderer in src/hunt-render.ts riceve lo stato senza scrivere il salvataggio.
- Usa sprite e suoni originali. Mantieni l'interfaccia in italiano, utilizzabile da touch e tastiera.
- Pianifica per risultati verificabili. Se deleghi, assegna file distinti e fai rivedere l'integrazione a un agente che non li ha implementati.
- Prima di integrare esegui npm run lint, npm test e npm run build. Per modifiche alla PWA verifica anche il build servito da npm run preview, ricarica e offline.
- Aggiorna README e documentazione tecnica quando cambia il flusso di gioco o di verifica. Mantieni commit piccoli.
- Dopo ogni aggiornamento verificato, crea un commit e pubblicalo su GitHub sul branch main con un push normale. Verifica il commit remoto.
