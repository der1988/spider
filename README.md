# Tamago · La caccia

Caccia strategica a schermata fissa. Collega un DualShock 4 o DualSense e seleziona **Avvia** per sbloccare la musica nel browser. Il timer e i comandi si attivano appena finisce «Start the clock».

- **Stick sinistro** per correre sul pavimento, sulle pareti e sul soffitto o per dondolare. Sul filo attivo, spingi **su** per risalire e **giù** per staccarti. Con **su** puoi anche aggrapparti a un filo già fissato.
- **Stick destro** per mirare in ogni direzione. **R1** lancia verso il primo appiglio entro la portata. Pareti, soffitto, pavimento e piattaforme accettano la seta. Se sei su una superficie, il tiro tende subito una ragnatela. Salta prima di sparare per dondolare: il filo si fissa quando tocchi una superficie valida. In aria puoi lanciare un secondo filo per spostare il dondolio sul nuovo appiglio.
- **L1** salta alla pressione. Premi di nuovo in aria per il doppio salto; un nuovo appoggio lo ripristina. Da appeso, L1 ritira i fili di movimento e ti lancia.
- Osserva i corridoi ai lati della piattaforma centrale. Avvicinandoti, spingi la mosca a cambiare rotta. Tendi un filo tra due appigli mentre è in manovra. Il filo comincia a lampeggiare prima di sparire, dopo **10 secondi**.
- Il timer al centro dell’HUD e i dettagli dell’arena pulsano sul battito. La barra sotto il timer indica quanto tempo resta. Ogni mosca è un livello. Il primo è il Livello 1 e ogni cattura vale un punto. Dopo il tremolio la prossima mosca entra con **60 secondi** e le vecchie tele spariscono. Allo scadere premi **×** per ricominciare.

## Colonna sonora

**The Fly Has A** accompagna l’introduzione e la caccia. La musica prosegue durante le catture e i nuovi tentativi. **Options** sul joypad e il pulsante **Pausa** fermano insieme musica e partita. **Audio Off** silenzia il gioco conservando la sincronizzazione.

Con **Sincronizza**, scegli una riga, ascolta il brano e premi **Segna** quando comincia la frase. Il pannello passa alla riga successiva. **Vai alla riga** porta la riproduzione poco prima del tempo corrente. Segnando «Left stick moves» cambi anche l’inizio del loop. **Salva** conserva i tempi su quel browser. **Tempi originali** ripristina la sincronizzazione inclusa nel gioco dopo il salvataggio.

## Sviluppo

Con Node.js 24, esegui `npm ci` e `npm run dev`. Per i controlli esegui `npm run lint`, `npm test` e `npm run build`. La build Vite usa `dist` e conserva il supporto offline dopo il primo caricamento.

[Note su fisica, mosca e timer](docs/architettura.md)
