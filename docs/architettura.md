# Architettura e sviluppo

Il modello riceve timestamp espliciti. Questo permette di testare senza aspettare la schiusa dopo 10 secondi, l'adolescenza dopo 12 ore e l'età adulta dopo 48 ore. I bisogni cambiano al minuto e l'età avanza con il tempo reale. Al ritorno si simulano al massimo 12 ore di decadimento. La forma adulta dipende dalla media dei bisogni durante la crescita. Il ciclo ha 16 ore di veglia e 8 di sonno. Il riposo manuale dura 30 minuti e usa la stessa simulazione del sonno notturno.

Il Canvas disegna sprite originali e riceve soltanto lo stato visivo. La UI collega il modello ai controlli e a localStorage. Il salvataggio JSON include una versione e una copia di recupero. Il worker conserva HTML, risorse compilate, manifest e icone nella stessa cache di versione.

Il coordinatore ha diviso la milestone in simulazione, rendering, interfaccia/PWA e verifica. Gli agenti Gameplay e Pixel Art hanno concordato i dati da passare al Canvas e lavorato su file distinti. QA ha usato timestamp fissi per verificare le meccaniche e un browser per verificare il comportamento integrato. Questa divisione permette di rivedere le meccaniche senza aspettare il rendering, poi controllare i punti di collegamento nel build completo. AGENTS.md rende riutilizzabili i confini e i controlli nelle sessioni successive.
