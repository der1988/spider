# Architettura e sviluppo

`src/spider.ts` contiene la simulazione indipendente dal DOM. Il corpo avanza a passi da 1/120 s. Le superfici sono rettangoli solidi, con `grip` per gli appigli. Il tiro si ferma al primo solido e aggancia se è marcato. La seta limita il moto verso l’esterno e conserva la velocità tangenziale. Risalendo si riduce la lunghezza massima; lo sgancio lascia intatta la velocità.

`src/area.ts` definisce la scena disegnata a mano. Il rametto iniziale permette di raggiungere la prima foglia con uno slancio. Una seconda salita porta sopra la radice, da cui si può scendere verso l’uscita o cercare la rugiada in alto con due agganci. I punti sicuri sono attivi per la sessione. Ricaricare ricrea la scena alla partenza e azzera i punti sicuri.

`src/main.ts` integra input, livelli sonori, camera, suggerimenti e regolazioni. `src/web-render.ts` disegna a 200 pixel di altezza interna con una larghezza variabile. Il worker della PWA mette in cache la scena. Il modello, il tracciato e il rendering sono stati sviluppati in file distinti e integrati nella scena principale.

`src/threads.ts` gestisce i capi liberi, separati dalla corda attiva. Un capo può fissarsi su un bordo solido entro la portata del lancio, se il segmento non attraversa un ostacolo. I fili fissati usano coordinate del mondo e restano in memoria nella partita corrente. Le mosche attraversano i segmenti con un test continuo tra due passi della simulazione. La cattura muove il filo, anima le ali e attiva un suono.

`src/soundscape.ts` sblocca Web Audio al primo gesto supportato, usa un volume principale per gli effetti, il fruscio e il ronzio, e salva la preferenza tramite la UI. I due analogici touch hanno puntatori indipendenti; la Gamepad API legge gli stick dei controller con mappatura standard. `src/aim-gesture.ts` arma il tiro oltre il 32% della corsa, mantiene l’ultimo angolo valido e spara al 15%. Dopo il tiro richiede un breve ritorno stabile al centro per ignorare i rimbalzi.

La silhouette usa appoggi alternati ricavati dallo spostamento reale e un corpo che segue con un piccolo ritardo. Contatto, tensione e velocità verticale guidano le pose di mira, lancio, arrivo e atterraggio senza modificare la fisica.

I fili fissati funzionano come appoggi a senso unico dal basso verso l’alto: il ragno può camminare in entrambi i sensi sopra il filo e attraversarlo dal basso. Recuperare una mosca fa ritornare la mosca sulla sua rotta dopo una pausa e aumenta la riserva. Un ponte richiede due appigli marcati, una traiettoria libera e spazio per il corpo lungo tutto il percorso. La riserva viene spesa solo dopo aver validato il collegamento. Trama, riserva e seme d’ambra vengono azzerati alla riapertura. All’avvio viene eliminato il vecchio salvataggio della trama. La preferenza audio rimane separata.

Il salto accetta una pressione nei 130 ms prima dell’appoggio e nei 90 ms dopo aver lasciato un bordo. Il salto non interviene sul filo attivo. Lo stick di movimento ha una zona morta del 12%, e la camera segue con un breve smorzamento mantenendo il disegno allineato alla griglia dei pixel.
