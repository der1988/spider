# Architettura e sviluppo

`src/spider.ts` contiene la simulazione indipendente dal DOM. Il corpo avanza a passi da 1/120 s. Le superfici sono rettangoli solidi, con `grip` per gli appigli. Tutti i rametti, le foglie e la radice rialzata sono agganciabili. Il tiro si ferma al primo solido e aggancia se è marcato. La seta limita il moto verso l’esterno e conserva la velocità tangenziale. Risalendo si riduce la lunghezza massima; lo sgancio lascia intatta la velocità.

`src/area.ts` definisce la scena disegnata a mano. Il rametto iniziale permette di raggiungere la prima foglia con uno slancio. La radice e la foglia della rugiada portano all’inizio della salita. Sei foglie a zig zag formano un percorso continuo di appigli fino al germoglio della chioma. Si può partire anche dalla base, passando sotto la foglia della rugiada. I punti sicuri sono attivi per la sessione. Ricaricare ricrea la scena alla partenza e azzera i punti sicuri.

`src/main.ts` integra input, livelli sonori, camera, suggerimenti e regolazioni. `src/web-render.ts` disegna a 200 pixel di altezza interna con una larghezza variabile. Il worker della PWA mette in cache la scena. Il modello, il tracciato e il rendering sono stati sviluppati in file distinti e integrati nella scena principale.

`src/threads.ts` gestisce i capi liberi, separati dalla corda attiva. Un capo può fissarsi su un bordo solido entro la portata del lancio, se il segmento non attraversa un ostacolo. I fili fissati usano coordinate del mondo e restano in memoria nella partita corrente. Le mosche attraversano i segmenti con un test continuo tra due passi della simulazione. La cattura muove il filo, anima le ali e attiva un suono.

`src/soundscape.ts` sblocca Web Audio al primo gesto supportato, usa un volume principale per gli effetti, il fruscio e il ronzio, e salva la preferenza tramite la UI. `src/pad-controls.ts` legge la mappatura standard della Gamepad API. Lo stick destro imposta la direzione di mira sopra una soglia del 22%, senza lanciare. R1 e L1 scattano ciascuno sul fronte di pressione. Quando il browser non vede un joypad attivo, la simulazione si ferma.

La silhouette usa appoggi alternati ricavati dallo spostamento reale e un corpo che segue con un piccolo ritardo. Contatto, tensione e velocità verticale guidano le pose di mira, lancio, arrivo e atterraggio senza modificare la fisica.

I fili fissati funzionano come appoggi a senso unico dal basso verso l’alto: il ragno può camminare in entrambi i sensi sopra il filo e attraversarlo dal basso. Recuperare una mosca fa ritornare la mosca sulla sua rotta dopo una pausa e aumenta la riserva. Un ponte richiede due appigli marcati, una traiettoria libera e spazio per il corpo lungo tutto il percorso. La riserva viene spesa solo dopo aver validato il collegamento. Trama, riserva e seme d’ambra vengono azzerati alla riapertura. All’avvio viene eliminato il vecchio salvataggio della trama. La preferenza audio rimane separata.

Il salto accetta una pressione nei 130 ms prima dell’appoggio e nei 90 ms dopo aver lasciato un bordo. Il salto non interviene sul filo attivo. Lo stick di movimento ha una zona morta del 12%, e la camera tiene il ragno al centro in orizzontale e più in basso in verticale, con il disegno allineato alla griglia dei pixel.

Il terreno si collega ai confini orizzontali e la fisica usa le copie vicine per i contatti al confine. Il renderer ripete la stessa area sotto la camera. A ogni giro si riportano le coordinate del ragno nell’intervallo della mappa mantenendo velocità e riferimento della seta attiva. Lo sfondo conserva lo scorrimento accumulato.

La camera segue il ragno anche lungo l’asse verticale. I tronchi scorrono a velocità diverse e la luce cambia verso la chioma. La finestra può avere qualsiasi orientamento.
