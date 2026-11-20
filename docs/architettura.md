# Architettura e sviluppo

`src/spider.ts` contiene la simulazione indipendente dal DOM. Il corpo avanza a passi da 1/120 s. Le superfici sono rettangoli solidi, con `grip` per gli appigli. Il tiro si ferma al primo solido e aggancia se è marcato. La seta limita il moto verso l’esterno e conserva la velocità tangenziale. Risalendo si riduce la lunghezza massima; lo sgancio lascia intatta la velocità.

`src/area.ts` definisce la scena disegnata a mano. Il rametto iniziale permette di raggiungere la prima foglia con uno slancio. Una seconda salita porta sopra la radice, da cui si può scendere verso l’uscita o cercare la rugiada in alto con due agganci. I punti sicuri sono attivi per la sessione. Il mondo a sezioni e il salvataggio permanente del punto sicuro sono la fase successiva, da tarare dopo la prova della prima area.

`src/main.ts` integra input, livelli sonori, camera, suggerimenti e regolazioni. `src/web-render.ts` disegna a 200 pixel di altezza interna con una larghezza variabile. Il worker della PWA mette in cache la scena. Il modello, il tracciato e il rendering sono stati sviluppati in file distinti e integrati nella scena principale.

`src/threads.ts` gestisce i capi liberi, separati dalla corda attiva. Un capo può fissarsi su un bordo solido entro la portata del lancio, se il segmento non attraversa un ostacolo. I fili fissati usano coordinate del mondo e vengono salvati localmente. Le mosche attraversano i segmenti con un test continuo tra due passi della simulazione. La cattura muove il filo, anima le ali e attiva un suono.

`src/soundscape.ts` sblocca Web Audio al primo gesto supportato, usa un volume principale per gli effetti, il fruscio e il ronzio, e salva la preferenza tramite la UI. I due analogici hanno puntatori indipendenti, quindi movimento e mira convivono anche quando si spara.
