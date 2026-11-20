# Architettura e sviluppo

`src/spider.ts` contiene la simulazione indipendente dal DOM. Il corpo avanza a passi da 1/120 s. Le superfici sono rettangoli solidi, con `grip` per gli appigli. Il tiro si ferma al primo solido e aggancia se è marcato. La seta limita il moto verso l’esterno e conserva la velocità tangenziale. Risalendo si riduce la lunghezza massima; lo sgancio lascia intatta la velocità.

`src/area.ts` definisce la scena disegnata a mano. Il rametto iniziale permette di raggiungere la prima foglia con uno slancio. Una seconda salita porta sopra la radice, da cui si può scendere verso l’uscita o cercare la rugiada in alto con due agganci. I punti sicuri sono attivi per la sessione. Il mondo a sezioni e il salvataggio permanente del punto sicuro sono la fase successiva, da tarare dopo la prova della prima area.

`src/main.ts` integra input, livelli sonori, camera, suggerimenti e regolazioni. `src/web-render.ts` disegna a 200 pixel di altezza interna con una larghezza variabile. Il worker della PWA mette in cache la scena. Il modello, il tracciato e il rendering sono stati sviluppati in file distinti e integrati nella scena principale.
