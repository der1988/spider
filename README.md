# Spider vs Fly

Caccia strategica a schermata fissa. Collega un DualShock 4 o DualSense e scorri **Story**, **Endless**, **Gnat Hunt**, **Practice**, **Settings** e **Top 10** con **↑/↓** sulla croce direzionale o con lo stick sinistro. Premi **×** per confermare. Puoi anche fare clic sul pulsante. Il timer parte appena finisce «Start the clock», anche se il controller è scollegato o lo stick è fermo. Da quel momento puoi usare i comandi.

- **Stick sinistro** per correre sul pavimento, sulle pareti e sul soffitto o per dondolare. Sul filo attivo, spingi **su** per risalire e **giù** per staccarti. Con **su** puoi anche aggrapparti a un filo già fissato.
- **Stick destro** per mirare in ogni direzione. **R1** lancia verso il primo appiglio entro la portata. Pareti, soffitto, pavimento e piattaforme accettano la seta. Se sei su una superficie, il tiro tende subito una ragnatela. Salta prima di sparare per dondolare: il filo si fissa quando tocchi una superficie valida. In aria puoi lanciare un secondo filo per spostare il dondolio sul nuovo appiglio.
- **L1** salta alla pressione. Premi di nuovo in aria per il doppio salto; un nuovo appoggio lo ripristina. Da appeso, L1 ritira i fili di movimento e ti lancia.
- Osserva i corridoi ai lati della piattaforma centrale. Avvicinandoti, spingi la mosca a cambiare rotta. Tendi un filo tra due appigli mentre è in manovra. Il filo comincia a lampeggiare prima di sparire, dopo **10 secondi**.
- Il timer al centro dell’HUD e i dettagli dell’arena pulsano sul battito. La barra sotto il timer indica quanto tempo resta. Ogni mosca è un livello. Il primo è il Livello 1 e ogni cattura vale un punto. In **Story**, dopo ogni cattura la prossima mosca entra con un secondo in meno, da **60 secondi** a un minimo di **10 secondi**. In **Endless** ogni mosca ha **20 secondi**. In entrambe le modalità le vecchie tele spariscono al cambio di mosca. Ogni 5 catture la mosca accelera, ogni 10 reagisce prima alle tele e ogni 20 percepisce il ragno da più lontano.

## Gnat Hunt e impostazioni

- **Gnat Hunt** si svolge fra tenda, davanzale e foglie, con bordi aperti. Se esci dall’inquadratura senza una corda attiva, il tentativo finisce. Se sei agganciato, il bordo indica la posizione del ragno e puoi risalire.
- Parti con cinque punti seta. Premi **R1** o **X** per agganciarti, tieni premuto per usare la corda gratis e spingi su o giù per risalire o scendere. Rilascia per fissare una trappola fra due appigli al costo di un punto. Mira a una delle cinque tele concesse e premi **□** o **V** per ritirarla e recuperare il punto.
- Premi **×** o **C** per un tiro diretto al costo di un punto. Ogni moscerino catturato restituisce un punto fino a cinque. Gli sciami alternano gruppi di comuni, veloci e prudenti che possono deviare. Premi **L1** o **Z** per un salto direzionale a impulso fisso.
- **Practice** è una stanza libera con gradoni, piattaforme sfalsate e un pozzo per allenarsi con gli stessi comandi di Stealth. Da **Options** o **Esc** puoi tornare al menu.
- **Endless** ruota fra tre disposizioni delle piattaforme ogni 10 catture, quando entra la mosca successiva.
- **Settings** è disponibile dal menu e dalla pausa. Puoi regolare musica ed effetti separatamente, ingrandire o nascondere i sottotitoli, ridurre il movimento e tenere premuto il tasto di fuga come alternativa ai tocchi ripetuti. Puoi usare la tastiera con WASD e frecce per movimento e mira, Z per saltare e X per sparare o liberarti.

## Finale di Story

Durante il terzo brano premi **Spazio** o **△** per cambiare prospettiva. Dopo «Start the clock», il volo della mosca inizia a **18,192 s** del quarto brano con **10 secondi** sul timer. Lo stick sinistro fa volare la mosca, le luci ripristinano i 10 secondi e otto nuove pressioni di **×** la liberano da una tela.

## Endless Top 10

Seleziona **Top 10** nel menu e conferma con **×**. Premi **○** per chiudere la classifica e tornare alla voce **Top 10**. Dopo una sconfitta puoi aprire la classifica con **△**. Il server registra ogni partita verificata e ordina i punteggi per catture, poi per ordine di registrazione. Se entri nella Top 10, inserisci da una a sei lettere A–Z. Con il controller, **↑/↓** cambiano la lettera, **←/→** spostano il cursore, **□** cancella, **×** conferma e **○** salta. Puoi anche digitare il nome con la tastiera. I risultati in attesa restano in IndexedDB. Se perdi la connessione, riapri **Top 10** e scegli **Try Again**.

### Deploy su Vercel

1. Esegui [`server/endless.sql`](server/endless.sql) su PostgreSQL. Per la classifica storica di Story, conserva anche [`server/scores.sql`](server/scores.sql). La migrazione Endless aggiunge una nuova tabella, con i risultati separati da quelli di Story.
2. Imposta **`DATABASE_URL`** nelle variabili server di Vercel per **Production** e per le preview che devono accedere alla classifica. Usa una connessione TLS del provider, preferibilmente pooled. Il ruolo deve poter leggere, inserire e aggiornare `tamago_endless_runs` e usare la sua sequenza `ordinal`. Per la classifica storica serve anche la lettura di `tamago_scores`.
3. Pubblica il branch **`main`** con Node.js 24. Sul dominio del deploy, **`GET /api/endless`** deve rispondere con un elenco JSON. In locale, avvia `npm run scores` con `DATABASE_URL`, poi `npm run dev`.

Il server ricostruisce la simulazione a 120 Hz partendo dal UUID e dagli input registrati. Rifiuta punteggi che differiscono dal replay, input fuori intervallo e replay che terminano prima o dopo la sconfitta. Il UUID e l’impronta del replay rendono idempotente un nuovo invio della stessa partita. L’ammissione viene ricontrollata nella transazione che pubblica il nome. La verifica è limitata a un’ora di simulazione per partita. I replay dimostrano che il risultato è ottenibile con gli input inviati. Script che producono input validi e giocatori che generano nuovi UUID restano possibili. Il client non espone credenziali.

## Colonna sonora

Il menu usa **Web Trap Loop** (`menusong.mp3`), con battiti misurati a circa 110 BPM. La giunzione va da **56,854 s** a **4,498 s**. Un’interazione abilita l’audio del menu. La conferma successiva con **×** avvia la modalità evidenziata.

**The Fly Has A** accompagna l’introduzione e la caccia. A **240,330 s** parte **The Fly Has an Upgrade** dall’inizio. Dopo **119,580 s** parte **The Room Has a Space Bar**. Durante il terzo brano, una nuova pressione di **Space** passa a **The Fly Is You**. Dopo la cutscene, lo stick sinistro controlla il volo della mosca. Il ragno insegue la mosca con salti frequenti e usa pareti e soffitto per avvicinarsi. All’inizio tende poche tele, poi aumenta la frequenza durante la caccia. La traccia tratteggiata anticipa dove tenderà la prossima tela. Cambia rotta prima che la fissi per sfuggire alla trappola. Attraversare una luce riporta il timer a 10 secondi. Le luci compaiono in punti casuali, distribuiti tra le varie zone della stanza. Premi e rilascia **×** otto volte per uscire da una tela. A ogni cambio di brano Story memorizza un checkpoint per il tentativo in corso. Se perdi, riparti dall’ultimo brano raggiunto. Nel quarto brano riprendi appena la mosca diventa giocabile. Negli ultimi 20 secondi il timer resta fermo fino alla fine della dissolvenza. L’arena e l’HUD diventano codice e si ricompongono nel menu delle modalità. Se il terzo brano arriva alla fine, la playlist torna al primo a **15,330 s**. La musica prosegue durante le catture. **Options** sul joypad o **Esc** sulla tastiera mettono in pausa musica e partita.

In **Endless** il brano Infinite Loop omonimo sblocca il gioco a **10,572 s** dopo «Start the clock». La riproduzione torna da **139,530 s** a **15,330 s**, sul battito prima di «Left stick moves». Quando il tempo finisce, la schermata mostra il totale delle catture. Scegli **Main Menu** per tornare alle modalità o **Retry** per azzerare catture e difficoltà e ripartire da **20 secondi** mentre il brano prosegue. Usa la croce direzionale o lo stick sinistro per scegliere e **×** per confermare.

## Sviluppo

Con Node.js 24, esegui `npm ci` e `npm run dev`. Per i controlli esegui `npm run lint`, `npm test` e `npm run build`. La build Vite usa `dist` e conserva il supporto offline dopo il primo caricamento.

[Note su fisica, mosca e timer](docs/architettura.md)
