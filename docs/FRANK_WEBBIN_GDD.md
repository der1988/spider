# MOONYBABOON — SPIDER VS FLY
## FRANK WEBBIN: THE PERFECT CRIME
### Master Game Design & Implementation Prompt

## 1. RUOLO E MISSIONE

Agisci come un team professionale di sviluppo di videogiochi indipendenti, composto da:

- Lead Game Designer
- Narrative Designer
- Gameplay Programmer
- Technical Director
- UI/UX Designer
- Sound Designer
- QA Engineer

Il progetto è Spider vs Fly, sviluppato da Moonybaboon.

Repository di riferimento:
https://github.com/der1988/tamago

Il tuo obiettivo è implementare una campagna narrativa all'interno dell'attuale modalità Endless, trasformandola in una commedia investigativa noir con protagonista il detective privato Frank Webbin.

La modalità STORY originale di Spider vs Fly deve rimanere completamente invariata.

Non ricostruire il gioco da zero. Lavora sull'implementazione esistente.

---

## 2. PRINCIPI NON NEGOZIABILI

Prima di modificare qualsiasi file, analizza l'intero repository e comprendi l'architettura del gioco.

Preserva:

- Direzione artistica.
- Palette cromatica.
- Pixel art.
- Sprite esistenti.
- Risoluzione.
- Dimensioni delle mappe.
- Fisica.
- Movimento del ragno.
- Sistema di salto.
- Sistema di oscillazione.
- Ragnatele.
- Sistema di cattura.
- Raccolta dei bozzoli.
- Classi dei nemici.
- Comportamenti dei nemici.
- Meccaniche dei boss.
- Controlli desktop e mobile.
- Sistema di punteggio.
- Sistema di morte e progressione.
- Classifica esistente.
- Modalità STORY originale.

Non introdurre nuove meccaniche di combattimento.

Non modificare arbitrariamente il bilanciamento.

Non sostituire gli asset esistenti con asset generici.

Non introdurre dialoghi dinamici durante il combattimento.

La trasformazione deve essere principalmente narrativa, registica e organizzativa.

Il risultato deve sembrare una nuova esperienza costruita all'interno dello stesso videogioco, non un videogioco differente.

---

## 3. IDENTITÀ NARRATIVA

Titolo della campagna:

FRANK WEBBIN — THE PERFECT CRIME

Studio:

MOONYBABOON

Genere:

- Detective noir.
- Action arcade.
- Commedia investigativa.
- Satira della corruzione.
- Parodia dei polizieschi.

Riferimenti tonali:

- Max Payne, per la narrazione interiore noir.
- The Naked Gun, per l'umorismo assurdo e impassibile.
- Police Squad!, per la comicità investigativa.
- Undertale, per la sonorizzazione sintetica dei dialoghi.

Questi riferimenti riguardano il tono e le soluzioni narrative, non la riproduzione di asset o contenuti protetti.

Frank Webbin è un ragno detective privato.

È cinico, disilluso, competente, ironico e apparentemente incapace di riconoscere l'assurdità delle situazioni in cui si trova.

Il suo umorismo nasce principalmente dalla serietà con cui affronta eventi ridicoli.

Non deve comportarsi come un personaggio comico consapevole di esserlo.

Tutti i dialoghi e i monologhi devono essere in inglese.

---

## 4. TRAMA GENERALE

Durante una notte di pioggia, un misterioso cliente assume Frank Webbin per un'indagine.

Metà del compenso viene pagata immediatamente, l'altra metà sarà consegnata al termine del lavoro.

Frank viene coinvolto in un presunto omicidio avvenuto a Clover Bank.

L'indagine lo conduce attraverso dieci ambienti del giardino, incontrando criminali, corrieri, contabili, poliziotti corrotti, giornalisti, politici, ex detective e mafiosi.

Ogni gruppo possiede una parte delle informazioni necessarie a raggiungere quello successivo.

Frank raccoglie documenti, neutralizza sospettati e scopre una rete criminale.

Progressivamente emerge che:

- Il presunto omicidio non è mai avvenuto.
- La notizia della morte era stata preparata in anticipo.
- Qualcuno aveva organizzato l'intera indagine.
- I criminali catturati stavano progettando di tradire il loro capo.
- Frank è stato utilizzato per smantellare l'organizzazione.
- Il misterioso cliente è Duke Wobbleknees, il boss finale.

Duke ha simulato la propria morte e utilizzato Frank per eliminare i suoi oppositori e recuperare le prove che avrebbero potuto incriminarlo.

Frank decide di arrestarlo.

Nonostante la vittoria finale, Frank viene pubblicamente identificato come il responsabile dell'intera guerra criminale.

Duke ha manipolato anche la conclusione dell'indagine.

Il detective diventa il criminale più ricercato del giardino.

---

## 5. STRUTTURA DELLA CAMPAGNA

La campagna comprende:

- Prologo.
- Dieci capitoli.
- Epilogo.

| Capitolo | Luogo | Titolo |
|---|---|---|
| 00 | Prologue | The Knock in the Rain |
| 01 | Clover Bank | A Small Fish |
| 02 | Poppy Crossing | Special Delivery |
| 03 | The Reedbed | Nothing to Declare |
| 04 | Fern Stair | Organized Accounting |
| 05 | Toadstool Ring | Above the Lawn |
| 06 | Dewfall | Dead on Paper |
| 07 | Birch Fork | A Question of Trust |
| 08 | Rose Thicket | Former Detectives |
| 09 | Autumn Tangle | The Usual Suspects |
| 10 | Moonflower | The Perfect Crime |
| Epilogue | — | The Wanted Spider |

Utilizzare gli ambienti esistenti.

Non ridisegnare le mappe.

---

## 6. GAME LOOP NARRATIVO

Ogni capitolo segue questa sequenza:

1. Caricamento della mappa.
2. Dissolvenza in entrata.
3. Titolo del capitolo in sovrimpressione.
4. Monologo introduttivo di Frank.
5. Dialogo pre-combattimento.
6. Attivazione dei controlli.
7. Combattimento.
8. Cattura dei nemici.
9. Raccolta di tutti i bozzoli.
10. Disattivazione dei controlli.
11. Posizionamento automatico dei personaggi.
12. Interrogatorio.
13. Monologo conclusivo.
14. Dissolvenza.
15. Caricamento automatico del capitolo successivo.

Non attivare l'interrogatorio semplicemente quando l'ultimo nemico viene sconfitto.

Attivarlo soltanto dopo che tutti i bozzoli richiesti sono stati raccolti attraverso le normali meccaniche di gioco.

Non richiedere al giocatore di raggiungere un'uscita fisica.

---

## 7. REGIA DELLE CUTSCENE

Tutte le sequenze narrative devono avvenire utilizzando il motore grafico del gioco.

Non creare schermate illustrate separate.

Non utilizzare video prerenderizzati.

### Monologhi

I monologhi di Frank appaiono nella cornice esterna della mappa.

Devono essere chiaramente distinguibili dai dialoghi tra personaggi.

Durante i monologhi:

- I controlli sono disabilitati.
- Il combattimento non è attivo.
- Gli elementi ambientali possono continuare ad animarsi.
- La musica viene abbassata.

### Dialoghi

I dialoghi tra personaggi appaiono all'interno della cornice di gioco.

Utilizzare uno spazio leggibile, evitando di coprire inutilmente i personaggi.

Durante i dialoghi:

- I personaggi rimangono nelle rispettive posizioni.
- Nessun nemico attacca.
- Il tempo di combattimento non avanza.
- I controlli di movimento e attacco sono disabilitati.
- Il personaggio che parla vibra leggermente.

### Interrogatori

Al termine del combattimento:

1. Frank si sposta automaticamente nella zona sinistra della mappa.
2. I bozzoli raccolti vengono lanciati verso la ragnatela nella zona destra.
3. I prigionieri vengono disposti ordinatamente.
4. La telecamera mantiene la composizione leggibile.
5. Inizia l'interrogatorio.

Utilizzare, quando possibile, animazioni e sistemi già presenti nel codice.

Il movimento automatico non deve causare danni, collisioni indesiderate o perdita dei progressi.

Durante l'interrogatorio, il bozzolo del personaggio che parla vibra leggermente.

Nei gruppi con un unico portavoce, gli altri personaggi rimangono silenziosi.

---

## 8. SISTEMA DEI DIALOGHI

Implementare un sistema data-driven e riutilizzabile.

Ogni battuta deve contenere almeno:

- Identificativo del personaggio.
- Testo.
- Tipo di sequenza.
- Eventuale riferimento alla posizione del personaggio.
- Profilo sonoro.

### Effetto macchina da scrivere

Il testo appare progressivamente.

Il giocatore controlla manualmente l'avanzamento.

Comportamento:

- Prima pressione durante la scrittura: mostra immediatamente il testo completo.
- Pressione successiva: passa alla battuta seguente.
- Ultima battuta: conclude la sequenza narrativa.

Non avanzare automaticamente.

Non permettere che lo stesso input salti involontariamente più battute.

Non permettere che l'input utilizzato per terminare un dialogo generi immediatamente un attacco o un salto.

Il sistema deve funzionare anche su dispositivi touch.

---

## 9. SOUND DESIGN

### Voci

Utilizzare suoni elettronici retro 8-bit, simili per principio ai vocalizzi testuali dei videogiochi classici.

Non utilizzare doppiaggio reale.

Ogni personaggio deve avere un profilo sonoro riconoscibile.

Differenziare i personaggi attraverso:

- Frequenza.
- Timbro.
- Durata.
- Ritmo.
- Piccole variazioni tonali.

Frank dovrebbe avere un timbro relativamente basso.

I suoni accompagnano la comparsa del testo e si interrompono quando la battuta è completamente visualizzata.

Non riprodurre tutti i suoni delle lettere rimanenti contemporaneamente quando il giocatore completa istantaneamente una battuta.

La punteggiatura può introdurre brevi pause.

### Animazioni

Il personaggio che parla vibra leggermente durante la comparsa del testo.

La vibrazione deve essere esclusivamente visiva.

Non modificare la posizione fisica, le collisioni o le hitbox.

### Musica

Mantenere la colonna sonora esistente.

Abbassare gradualmente il volume durante monologhi, dialoghi e interrogatori.

Ripristinarlo durante il combattimento.

Valori iniziali indicativi:

- Sequenze narrative: 30%.
- Combattimento: 100%.
- Transizioni: dissolvenza graduale.

Questi valori devono essere configurabili e verificati attraverso playtest.

Non riavviare inutilmente la traccia musicale a ogni battuta.

---

## 10. TITOLI DEI CAPITOLI

I titoli appaiono in sovrimpressione al centro della mappa già caricata.

Esempio:

CHAPTER 04

FERN STAIR

Organized Accounting

Utilizzare la tipografia, la palette e la risoluzione coerenti con il gioco.

Durata iniziale proposta: circa tre secondi.

Breve dissolvenza in entrata e in uscita.

Durante la visualizzazione del titolo, il gameplay è sospeso.

---

# 11. SCENEGGIATURA INTEGRALE

Le battute contrassegnate come approvate devono essere implementate letteralmente.

Non riscriverle, non aggiungere battute e non modificare i tempi comici senza autorizzazione.

Le sezioni esplicitamente contrassegnate come provvisorie sono ricostruzioni funzionali e devono rimanere facilmente modificabili.

---

## PROLOGUE — THE KNOCK IN THE RAIN

### Ambientazione

Utilizzare una mappa del gioco.

È notte e piove.

Frank è solo.

Un misterioso cliente entra in scena.

La sua identità non deve essere esplicitata.

Non mostrare il nome Duke Wobbleknees.

### Monologo iniziale

FRANK — NARRATION:

"It was raining. The kind of rain that made you question your life choices. Especially if you'd chosen to live outside."

"I'd seen corruption, betrayal, and things no spider should ever see. Although having eight eyes made that statistically inevitable."

"Then a stranger appeared. I was hoping he'd bring a case. Or an umbrella."

### Dialogo

STRANGER:
"I've heard about you, Mr. Webbin."

FRANK:
"I can explain."

STRANGER:
"I hear you're a good detective."

FRANK:
"Good. I was beginning to think I'd started that rumour for nothing."

### Continuazione provvisoria

STRANGER:
"I have a job for you."

FRANK:
"What kind of job?"

STRANGER:
"An investigation. Everything you need is in this envelope."

FRANK:
"And my payment?"

STRANGER:
"Half now, half when the job is done."

FRANK:
"Finally. A man who understands detective work."

Il cliente consegna la busta e si allontana.

### Monologo conclusivo

FRANK — NARRATION:

"Benny Blabber was a small fish in a small pond. Technically, he wasn't even a fish."

Transizione verso Clover Bank.

---

## CHAPTER 01 — CLOVER BANK
### A Small Fish

### Antagonista

| Personaggio | Classe | Colpi |
|---|---|---|
| Benny Blabber | Gnat | 1 |

Benny è un piccolo criminale, informatore e pettegolo.

### Monologo introduttivo provvisorio

FRANK — NARRATION:

"Benny knew everything that happened in the garden. And quite a few things that hadn't."

### Dialogo pre-combattimento provvisorio

FRANK:
"Benny Blabber."

BENNY:
"Frank! Whatever you've heard, it's not true."

FRANK:
"I haven't heard anything."

BENNY:
"Especially about the mayor's wife."

FRANK:
"I'm investigating a murder."

BENNY:
"Oh. That's considerably better."

FRANK:
"I need you to answer a few questions."

BENNY:
"I'd rather not."

### Combattimento

Utilizzare la classe Gnat esistente.

Un colpo necessario per la cattura.

Nessuna battuta durante il combattimento.

### Interrogatorio provvisorio

FRANK:
"What happened here, Benny?"

BENNY:
"I didn't kill anyone."

FRANK:
"Then who did?"

BENNY:
"I don't know. But I've been talking to a couple of couriers."

FRANK:
"Where can I find them?"

BENNY:
"Poppy Crossing."

### Monologo conclusivo approvato

FRANK — NARRATION:

"Benny wasn't a murderer. But whoever he'd been talking to might know something about one."

"I headed for Poppy Crossing."

---

## CHAPTER 02 — POPPY CROSSING
### Special Delivery

### Antagonisti

| Personaggio | Classe | Colpi |
|---|---|---|
| Eddie Flapper | Dart | 1 |
| Freddie Flapper | Gnat | 1 |

Due corrieri criminali.

### Monologo introduttivo provvisorio

FRANK — NARRATION:

"Eddie and Freddie Flapper specialized in discreet deliveries. Neither of them knew what discreet meant."

### Dialogo pre-combattimento provvisorio

FRANK:
"Eddie. Freddie."

EDDIE:
"Are you expecting a delivery?"

FRANK:
"I'm expecting some answers."

FREDDIE:
"We don't deliver those."

EDDIE:
"Company policy."

FRANK:
"Then we'll have to make an exception."

### Combattimento

Utilizzare le classi Dart e Gnat esistenti.

Entrambi richiedono un colpo.

### Interrogatorio approvato

FRANK:
"What were you delivering?"

EDDIE:
"We don't open the packages."

FREDDIE:
"Not anymore."

FRANK:
"What was inside?"

FREDDIE:
"Documents. Lots of numbers."

EDDIE:
"We delivered them to The Reedbed. That's all we know."

### Monologo conclusivo

FRANK — NARRATION:

"Confidential documents, mysterious deliveries, and numbers. I was beginning to suspect an accountant."

"I'd always found them suspicious."

---

## CHAPTER 03 — THE REEDBED
### Nothing to Declare

### Antagonisti

| Personaggio | Classe | Colpi |
|---|---|---|
| Doris Doublecross | Veil | 1 |
| Douglas Doublecross | Dart | 1 |

Doris e Douglas sono una coppia criminale felicemente sposata.

Il loro matrimonio è autenticamente felice.

Non introdurre conflitti matrimoniali.

### Monologo introduttivo

FRANK — NARRATION:

"Twenty years of marriage and they still finished each other's sentences. Occasionally, the prison system did too."

### Dialogo pre-combattimento

FRANK:
"Doris. Douglas. Am I interrupting something?"

DORIS:
"It's our anniversary."

DOUGLAS:
"Twenty wonderful years."

FRANK:
"Congratulations."

DOUGLAS:
"Thank you."

DORIS:
"Now, darling, shall we get rid of him?"

### Combattimento

Doris: Veil, un colpo.

Douglas: Dart, un colpo.

### Interrogatorio

FRANK:
"Where are the documents?"

DOUGLAS:
"Are you comfortable, darling?"

DORIS:
"Perfectly, sweetheart."

FRANK:
"The documents."

DORIS:
"Fern Stair. We delivered them yesterday."

### Monologo conclusivo

FRANK — NARRATION:

"In a garden full of betrayal and corruption, it was nice to see two criminals who genuinely loved each other."

---

## CHAPTER 04 — FERN STAIR
### Organized Accounting

### Antagonisti

| Personaggio | Classe | Colpi |
|---|---|---|
| Bernard Bugshot | Skipper | 1 |
| Edgar Sixpence | Veil | 1 |
| Martin Flymore | Gnat | 1 |

Criminali che gestiscono le proprie attività come un'azienda.

### Monologo introduttivo

FRANK — NARRATION:

"They had revolutionized organized crime by introducing meetings. Crime rates had fallen considerably. Nobody had time to commit any."

### Dialogo pre-combattimento

FRANK:
"Gentlemen. We need to talk."

BERNARD:
"Is this meeting scheduled?"

EDGAR:
"I don't have it in my calendar."

MARTIN:
"Shall I send an invitation?"

FRANK:
"I'm already here."

MARTIN:
"Excellent. Everyone's accepted."

FRANK:
"I'm here for the financial records."

BERNARD:
"Gentlemen, we have a security issue."

EDGAR:
"Is it covered by our insurance?"

### Combattimento

Utilizzare le tre classi indicate.

Un colpo per ciascun nemico.

### Interrogatorio

FRANK:
"You've been bribing police officers."

BERNARD:
"Bribery is a very strong word."

FRANK:
"What would you call it?"

EDGAR:
"A subscription."

FRANK:
"Where are they?"

MARTIN:
"Toadstool Ring."

### Monologo conclusivo

FRANK — NARRATION:

"I'd started with a dead client. Now I had financial records, three criminals, and a police department I couldn't trust. Corruption was everywhere. At least someone was getting paid regularly in this town."

---

## CHAPTER 05 — TOADSTOOL RING
### Above the Lawn

### Antagonisti

| Personaggio | Classe | Colpi |
|---|---|---|
| Captain Buzzkill | Comet | 1 |
| Officer Mothball | Dart | 1 |
| Officer Drowsywing | Skipper | 1 |

Due agenti e un capitano.

Sono poliziotti corrotti, stanchi e disinteressati.

Soltanto Captain Buzzkill parla.

### Monologo introduttivo

FRANK — NARRATION:

"They were the finest officers money could buy. I had the receipts to prove it."

### Dialogo pre-combattimento

FRANK:
"Captain Buzzkill. Still on duty?"

BUZZKILL:
"Technically."

FRANK:
"When are you retiring?"

BUZZKILL:
"Emotionally, about fifteen years ago."

FRANK:
"I've got evidence that you've been taking bribes."

BUZZKILL:
"Can't this wait until after my retirement?"

FRANK:
"No."

BUZZKILL:
"Shame."

### Combattimento

Tre nemici, un colpo ciascuno.

### Interrogatorio

FRANK:
"What can you tell me about the murder at Clover Bank?"

BUZZKILL:
"Nothing. I read about it in the newspaper."

FRANK:
"You're the police."

BUZZKILL:
"I was equally surprised."

FRANK:
"Where are the official records?"

BUZZKILL:
"Dewfall."

### Monologo conclusivo

FRANK — NARRATION:

"Someone had made sure the death at Clover Bank was never properly investigated. The answers were waiting for me at Dewfall."

---

## CHAPTER 06 — DEWFALL
### Dead on Paper

### Antagonisti

| Personaggio | Classe | Colpi |
|---|---|---|
| Rupert Buzzpress | Leafwing | 2 |
| Harold Flyline | Veil | 1 |
| Jimmy Flashwing | Dart | 1 |

Giornalisti coinvolti nella manipolazione delle notizie.

Soltanto Rupert Buzzpress parla.

### Monologo introduttivo

FRANK — NARRATION:

"They believed in freedom of the press. Particularly the freedom to make things up."

### Dialogo pre-combattimento

FRANK:
"You published something that wasn't true."

RUPERT:
"Could you be more specific?"

FRANK:
"It was in yesterday's newspaper."

RUPERT:
"That doesn't narrow it down much."

FRANK:
"I'm talking about the murder at Clover Bank."

RUPERT:
"That was a very successful story."

FRANK:
"I need to see your sources."

RUPERT:
"I'm afraid that's not possible."

### Combattimento

Rupert richiede due colpi.

Harold e Jimmy richiedono un colpo ciascuno.

### Interrogatorio

FRANK:
"This article was written the day before the murder."

RUPERT:
"We're a very efficient newspaper."

FRANK:
"Who gave you the story?"

RUPERT:
"It came through an intermediary at Birch Fork."

### Monologo conclusivo

FRANK — NARRATION:

"Someone had written the ending before the story had even begun. I needed to find out who."

---

## CHAPTER 07 — BIRCH FORK
### A Question of Trust

### Antagonisti

| Personaggio | Classe | Colpi |
|---|---|---|
| Mayor Goldwing | Looper | 2 |
| Arthur Flipwing | Comet | 1 |
| Walter Honeytongue | Skipper | 1 |
| Gordon Flyright | Leafwing | 1 |

Politici corrotti.

Soltanto Mayor Goldwing parla.

### Monologo introduttivo

FRANK — NARRATION:

"Mayor Goldwing was a man of his word. Unfortunately, his word changed every election."

### Dialogo pre-combattimento

GOLDWING:
"Mr. Webbin. What brings you here?"

FRANK:
"I've been talking to Benny Blabber."

GOLDWING:
"Whatever he told you about my wife is completely untrue."

FRANK:
"He didn't tell me anything."

GOLDWING:
"Good. Then it's even less true."

FRANK:
"I'm investigating a murder."

GOLDWING:
"I have political immunity."

FRANK:
"From what?"

GOLDWING:
"Ideally, everything."

### Combattimento

Goldwing richiede due colpi.

Gli altri tre personaggi richiedono un colpo ciascuno.

### Interrogatorio

FRANK:
"Why did you arrange for that article to be published?"

GOLDWING:
"We were paid to deliver a message. Nothing more."

FRANK:
"Before the murder?"

GOLDWING:
"Before you were even hired, Mr. Webbin."

FRANK:
"Who paid you?"

GOLDWING:
"The people at Rose Thicket."

### Monologo conclusivo

FRANK — NARRATION:

"Someone knew I was going to investigate a murder before I even knew there was going to be one."

---

## CHAPTER 08 — ROSE THICKET
### Former Detectives

### Antagonisti

| Personaggio | Classe | Colpi |
|---|---|---|
| Harvey Blindfly | Drifter | 2 |
| Richard Falsewing | Looper | 2 |
| Stanley Spybug | Skipper | 1 |
| Gordon Flycatch | Comet | 1 |

Ex detective diventati criminali.

Conoscono Frank e la sua professione.

Soltanto Harvey Blindfly parla.

### Monologo introduttivo

FRANK — NARRATION:

"We'd all started in the same profession. They'd gone into organized crime. I'd stayed in disorganized detective work."

### Dialogo pre-combattimento

HARVEY:
"Still a private detective, Frank?"

FRANK:
"Still a criminal, Harvey?"

HARVEY:
"We prefer to think of ourselves as former detectives."

FRANK:
"I prefer to think of you as future prisoners."

FRANK:
"I'm investigating the murder at Clover Bank."

HARVEY:
"Still calling it a murder?"

FRANK:
"What would you call it?"

HARVEY:
"A mistake. Yours."

### Combattimento

Harvey e Richard richiedono due colpi ciascuno.

Stanley e Gordon richiedono un colpo ciascuno.

### Interrogatorio

FRANK:
"Did you kill my client?"

HARVEY:
"No."

FRANK:
"Do you know who did?"

HARVEY:
"Do you know that anyone did?"

FRANK:
"What are you trying to tell me?"

HARVEY:
"Go to Autumn Tangle. And start thinking like a detective again."

### Monologo conclusivo

FRANK — NARRATION:

"I'd spent the entire investigation looking for a murderer. It had never occurred to me to look for a victim."

---

## CHAPTER 09 — AUTUMN TANGLE
### The Usual Suspects

### Antagonisti

| Personaggio | Classe | Colpi |
|---|---|---|
| Don Buzzarella | Lantern | 3 |
| Carlo Stingano | Needle | 2 |
| Sal Leafone | Leafwing | 1 |
| Rocco Loopetti | Looper | 1 |
| Vinnie Flyspeed | Comet | 1 |

Organizzazione mafiosa.

Soltanto Don Buzzarella parla.

### Monologo introduttivo

FRANK — NARRATION:

"They believed in family values. Most of those values were kept in offshore accounts."

### Dialogo pre-combattimento

BUZZARELLA:
"You come here uninvited, Mr. Webbin."

FRANK:
"I didn't know I needed an invitation."

BUZZARELLA:
"This is a private gathering."

FRANK:
"I'm a private detective."

BUZZARELLA:
"That's not how it works."

BUZZARELLA:
"Years of preparation. Months of negotiations. And then you came along."

FRANK:
"What were you planning?"

BUZZARELLA:
"Something you'll never live to see."

### Combattimento

Don Buzzarella richiede tre colpi.

Carlo Stingano richiede due colpi e conserva la capacità di liberarsi dalla seta dopo 2,3 secondi.

Gli altri nemici richiedono un colpo ciascuno.

Preservare le caratteristiche delle classi esistenti.

### Interrogatorio

BUZZARELLA:
"Our informants. Our couriers. Our documents. Our allies. You've taken everything from us."

FRANK:
"I was investigating a murder."

BUZZARELLA:
"No, Mr. Webbin. You were dismantling an organization."

FRANK:
"On whose behalf?"

BUZZARELLA:
"You'll find him at Moonflower."

### Monologo conclusivo

FRANK — NARRATION:

"There was one name missing from the investigation. One final piece of the puzzle. I headed for Moonflower."

---

## CHAPTER 10 — MOONFLOWER
### The Perfect Crime

### Antagonista finale

DUKE WOBBLEKNEES

Duke è un ragno.

È elegante, educato, manipolatore e completamente privo di rimorso.

Non si considera un criminale.

Considera Frank un professionista che ha svolto efficacemente il lavoro per cui è stato assunto.

### Monologo introduttivo

FRANK — NARRATION:

"I'd spent my life catching flies. Somewhere along the way, I'd forgotten that spiders could catch each other."

### Dialogo — Rivelazione dell'identità

DUKE:
"Mr. Webbin. I believe I owe you some money."

FRANK:
"We've met before?"

DUKE:
"Half now, half when the job is done. Remember?"

FRANK:
"You were supposed to be dead."

DUKE:
"I never said that."

### Dialogo — Rivelazione del piano

DUKE:
"They were going to betray me, Frank. Every last one of them."

FRANK:
"The financial records."

DUKE:
"Evidence they intended to use against me."

FRANK:
"And I collected it for you."

DUKE:
"Along with everyone who knew about it."

FRANK:
"You used me."

DUKE:
"I employed you. There's a difference."

### Dialogo — Inizio dello scontro finale

DUKE:
"Congratulations, Frank. You've eliminated my competition."

FRANK:
"There's still one criminal left."

DUKE:
"Surely we can come to an arrangement."

FRANK:
"We can. You're under arrest."

### Boss fight

Preservare integralmente le meccaniche originali del boss.

Caratteristiche di riferimento:

- Attacchi attraverso cariche.
- Trappole di seta.
- Immobilizzazione di 2,8 secondi.
- Un solo colpo valido per immobilizzazione.
- Quattro colpi complessivi necessari.

Non introdurre nuove fasi, nuovi attacchi o nuove meccaniche.

Verificare la corrispondenza di queste caratteristiche con il codice originale.

### Dopo il combattimento

Duke viene immobilizzato definitivamente.

Frank si posiziona a sinistra.

Duke viene collocato a destra, utilizzando una rappresentazione compatibile con gli asset e le animazioni esistenti.

### Ultimo dialogo

DUKE:
"You've made quite a name for yourself today, Frank."

FRANK:
"So have you."

DUKE:
"The difference is that tomorrow, everyone will know yours."

Dissolvenza.

---

## EPILOGUE — THE WANTED SPIDER

Il giorno seguente, The Garden Times identifica Frank come il responsabile della guerra criminale che ha attraversato il giardino.

Frank viene descritto come il criminale che ha eliminato i membri delle organizzazioni rivali per assumere il controllo delle loro attività.

Duke risulta ancora ufficialmente morto.

La vittoria di Frank non corrisponde a una vittoria pubblica.

### Monologo finale

FRANK — NARRATION:

"According to The Garden Times, I was the criminal mastermind behind everything that had happened."

"It was the most flattering article anyone had ever written about me."

Concludere la campagna.

Non aggiungere altri dialoghi o spiegazioni.

---

# 12. RIEPILOGO DEI NEMICI

| Capitolo | Nemici | Colpi complessivi |
|---|---:|---:|
| Clover Bank | 1 | 1 |
| Poppy Crossing | 2 | 2 |
| The Reedbed | 2 | 2 |
| Fern Stair | 3 | 3 |
| Toadstool Ring | 3 | 3 |
| Dewfall | 3 | 4 |
| Birch Fork | 4 | 5 |
| Rose Thicket | 4 | 6 |
| Autumn Tangle | 5 | 8 |
| Moonflower | 1 boss | 4 |
| Totale | 28 | 38 |

La campagna contiene 27 nemici ordinari e un boss finale.

Associare ogni personaggio alla classe esistente corrispondente.

I nomi sono identità narrative, non nuove classi di gameplay.

---

# 13. THE FUGITIVE — FUNZIONALITÀ FUTURA

Dopo il completamento della campagna, deve essere possibile sbloccare permanentemente una modalità Endless pura.

Nome di lavoro:

THE FUGITIVE

Premessa narrativa:

Frank è diventato un ricercato e deve sopravvivere ai cacciatori di taglie.

Decisioni già stabilite per il futuro:

- Nessun dialogo.
- Nessun monologo.
- Nessun interrogatorio.
- Nessuna battuta dinamica.
- Selezione procedurale degli ambienti esistenti.
- Combinazioni procedurali dei nemici.
- Difficoltà crescente attraverso quantità e composizione.
- Caratteristiche individuali dei nemici invariate.

IMPORTANTE:

Non sviluppare ancora il sistema procedurale.

Non progettare nuove ondate.

Non aggiungere boss periodici.

Non modificare la classifica per questa modalità.

Predisporre soltanto il salvataggio del completamento della campagna e l'architettura necessaria al futuro sblocco.

Non presentare una modalità incompleta come giocabile.

La priorità assoluta è terminare The Perfect Crime.

---

# 14. ARCHITETTURA TECNICA

Adattare l'implementazione all'architettura già presente.

Evitare refactoring globali non necessari.

Separare logicamente:

- Campaign data.
- Dialogue system.
- Narrative state machine.
- Cutscene controller.
- Audio controller.
- Chapter transition controller.
- Campaign completion state.

Utilizzare una struttura dati centralizzata per:

- Capitoli.
- Personaggi.
- Classi.
- Resistenza.
- Monologhi.
- Dialoghi.
- Profili audio.
- Portavoce.
- Transizioni.

Esempio concettuale:

CampaignChapter:
- id
- location
- title
- mapId
- enemies
- introNarration
- preCombatDialogue
- postCombatDialogue
- outroNarration
- nextChapter

EnemyDefinition:
- id
- displayName
- existingEnemyClass
- requiredHits
- voiceProfile
- dialogueRole

DialogueLine:
- speakerId
- text
- presentationType

Questa struttura è indicativa.

Non imporre nuovi framework o dipendenze se il codice esistente consente una soluzione più semplice.

### State machine suggerita

- CHAPTER_LOADING
- CHAPTER_TITLE
- INTRO_NARRATION
- PRE_COMBAT_DIALOGUE
- COMBAT
- COCOON_COLLECTION
- INTERROGATION_SETUP
- INTERROGATION
- OUTRO_NARRATION
- CHAPTER_TRANSITION
- EPILOGUE
- CAMPAIGN_COMPLETE

Garantire che ogni stato possa essere attivato e concluso una sola volta per sequenza.

Evitare condizioni di gara, eventi duplicati e callback non rimossi.

---

# 15. GESTIONE DELLA MORTE E DEI SALVATAGGI

Preservare il sistema originale.

Non introdurre nuovi checkpoint.

Non introdurre nuove vite.

Non cambiare il calcolo del punteggio.

Non modificare le condizioni di game over.

Verificare che le sequenze narrative non interferiscano con la morte, il riavvio o il caricamento della partita.

Il completamento della campagna deve essere registrato soltanto dopo il completamento effettivo dell'epilogo.

Utilizzare il sistema di persistenza esistente, se disponibile.

---

# 16. ACCESSIBILITÀ E COMPATIBILITÀ

Il gioco deve continuare a funzionare su desktop e dispositivi mobili.

Verificare specificamente:

- Safari su iPhone.
- Input touch.
- Tastiera.
- Eventuali controller già supportati.
- Ridimensionamento della finestra.
- Orientamento dello schermo.
- Leggibilità dei dialoghi.
- Audio dopo interazione dell'utente.
- Prestazioni su dispositivi mobili.

Non aggiungere dipendenze pesanti.

Non introdurre richieste a servizi AI durante il gameplay.

Tutta la sceneggiatura è predefinita.

L'esperienza deve poter funzionare senza generazione di testo in tempo reale.

---

# 17. PIANO DI IMPLEMENTAZIONE

## Fase 0 — Audit

Analizzare il repository.

Identificare:

- Architettura.
- Entry point.
- Modalità di gioco.
- Mappe.
- Classi dei nemici.
- Sistema di combattimento.
- Gestione dei bozzoli.
- Audio.
- Input.
- Classifica.
- Persistenza.
- Eventuali test esistenti.

Creare un documento sintetico che descriva lo stato iniziale.

Identificare eventuali discrepanze tra questo documento e il codice.

Non correggere automaticamente le discrepanze modificando il gameplay.

## Fase 1 — Fondamenta narrative

Implementare:

- State machine.
- Sistema dei dialoghi.
- Effetto macchina da scrivere.
- Input di avanzamento.
- Profili audio 8-bit.
- Vibrazione visiva.
- Abbassamento musicale.

## Fase 2 — Vertical slice

Implementare soltanto:

- Prologo.
- Clover Bank.
- Transizione verso Poppy Crossing.

Verificare il ciclo completo:

Monologo → dialogo → combattimento → cattura → raccolta → interrogatorio → transizione.

La vertical slice deve essere funzionante prima di estendere il sistema agli altri capitoli.

## Fase 3 — Campagna completa

Integrare tutti i capitoli utilizzando la struttura dati centralizzata.

Non duplicare il codice delle sequenze narrative.

Verificare individualmente ogni capitolo.

## Fase 4 — Boss finale ed epilogo

Integrare:

- Rivelazione di Duke.
- Combattimento originale.
- Dialogo conclusivo.
- Epilogo.
- Registrazione del completamento.

## Fase 5 — Rifinitura

Verificare:

- Tempi comici.
- Leggibilità.
- Ritmo narrativo.
- Dissolvenze.
- Posizionamento dei personaggi.
- Sincronizzazione audio.
- Compatibilità mobile.
- Assenza di regressioni.

## Fase 6 — QA

Eseguire una partita completa.

Verificare anche la modalità STORY originale.

Documentare ogni problema rilevato e correggere quelli riproducibili.

Non dichiarare completata una fase senza averla verificata.

---

# 18. ORGANIZZAZIONE DEL LAVORO

Se l'ambiente supporta agenti specializzati, organizza il lavoro attraverso un agente coordinatore e agenti dedicati.

### Lead Coordinator

- Gestisce il piano.
- Controlla le dipendenze.
- Verifica il rispetto dei vincoli.
- Integra i risultati.

### Gameplay Engineer

- Protegge le meccaniche esistenti.
- Implementa le transizioni tra combattimento e narrazione.
- Verifica le collisioni e le catture.

### Narrative Engineer

- Organizza i dati narrativi.
- Implementa dialoghi e capitoli.
- Verifica l'esatta corrispondenza dei testi.

### UI and Audio Engineer

- Gestisce tipografia, sovrimpressioni, animazioni e sonorizzazione.

### QA Engineer

- Esegue test.
- Individua regressioni.
- Verifica i criteri di accettazione.

Non consentire modifiche concorrenti agli stessi file senza coordinamento.

Se non sono disponibili agenti separati, eseguire questi ruoli sequenzialmente.

Non simulare attività di agenti che non sono stati realmente eseguiti.

---

# 19. CRITERI DI ACCETTAZIONE

Il lavoro può essere considerato completo soltanto quando:

- [ ] La modalità STORY originale funziona come prima.
- [ ] Il prologo è funzionante.
- [ ] Tutti i dieci capitoli sono accessibili in sequenza.
- [ ] Tutti i personaggi hanno nome e classe corretti.
- [ ] I monologhi appaiono nella cornice esterna.
- [ ] I dialoghi appaiono nella cornice interna.
- [ ] Il testo utilizza l'effetto macchina da scrivere.
- [ ] L'avanzamento manuale funziona correttamente.
- [ ] Le voci sintetiche sono sincronizzate.
- [ ] Il personaggio che parla vibra leggermente.
- [ ] La musica si abbassa durante le sequenze narrative.
- [ ] Non ci sono dialoghi durante il combattimento.
- [ ] Gli interrogatori iniziano soltanto dopo la raccolta di tutti i bozzoli.
- [ ] Frank si posiziona correttamente a sinistra.
- [ ] I bozzoli vengono collocati correttamente a destra.
- [ ] I portavoce rispettano la sceneggiatura.
- [ ] Le transizioni sono automatiche.
- [ ] I titoli appaiono in sovrimpressione.
- [ ] Le meccaniche originali sono preservate.
- [ ] Duke conserva il combattimento originale.
- [ ] L'epilogo viene mostrato correttamente.
- [ ] Il completamento viene registrato.
- [ ] Non sono state introdotte regressioni nella classifica.
- [ ] Non sono state introdotte regressioni nei controlli mobile.
- [ ] Non sono presenti errori bloccanti nella console.
- [ ] The Fugitive non è stato sviluppato prematuramente.

---

# 20. CONSEGNA FINALE

Al termine del lavoro, fornire:

1. Riepilogo delle modifiche.
2. Elenco dei file modificati.
3. Descrizione dell'architettura narrativa.
4. Risultati dei test realmente eseguiti.
5. Eventuali problemi ancora aperti.
6. Eventuali discrepanze rispetto al documento.
7. Istruzioni per avviare il gioco localmente.
8. Istruzioni per modificare facilmente dialoghi e capitoli.
9. Stato della predisposizione futura di The Fugitive.

Conservare questo documento nel repository, preferibilmente in:

docs/FRANK_WEBBIN_GDD.md

Utilizzare commit incrementali e descrittivi.

Non effettuare automaticamente un deployment in produzione.

Non sovrascrivere modifiche preesistenti dell'utente.

---

# 21. ISTRUZIONE OPERATIVA FINALE

Inizia analizzando il repository reale.

Non iniziare creando un nuovo gioco.

Non dedicare tempo a funzionalità future.

Non modificare arbitrariamente la direzione artistica.

Non riscrivere la sceneggiatura approvata.

Implementa progressivamente la campagna, partendo dalla vertical slice.

L'obiettivo è ottenere un'esperienza narrativa completa, coerente, rifinita e realmente giocabile.

La qualità della regia, il ritmo dei dialoghi e la conservazione del gameplay originale hanno priorità sulla quantità di nuove funzionalità.

MOONYBABOON

FRANK WEBBIN — THE PERFECT CRIME

100% VIBE CODED.