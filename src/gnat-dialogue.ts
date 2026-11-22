import type {Point} from './spider.ts';

export const spiderLessons=[
  "Left stick to walk. It has two settings: my pace and your appointment.",
  "L1 jumps. Press it again in midair. The first jump is apparently advisory.",
  "Gravity adds to vertical speed every step. It has never once asked how my day is going.",
  "Right stick to aim. R1 to fire. Wait for the bright tip unless you like firing at an idea.",
  "Hold R1 to keep the rope. Up reels in. Down pays it out. I've drawn you a diagram. It's the rope.",
  "Release on a second surface to fix a web. Release in midair to resume our dealings with gravity.",
  "Apparently the room was vibe coded. I was told that meant fewer meetings. Nobody said anything about more gravity.",
  "Hold R2 to grab a fixed web. Otherwise you'll pass straight through, which saves them animating a complaint.",
  "Triangle opens the map. The big dot with the bad intentions is exactly who you think it is.",
  "Square removes the nearest empty web. Emphasis on empty. We do have a complaints department.",
  "Webbed by the big one? Tap Cross five times. He can tie a knot but apparently can't count.",
  "Touch an insect to collect it. It follows you home. I use the term 'home' under protest.",
  "The aim checks for the first solid thing along a line. The code calls it a ray. I call it checking before jumping.",
  "When the rope goes taut, the game trims the velocity pulling away from the anchor. You call it swinging. I call it being edited.",
  "The left stick also picks the jump direction. If you point down, please have a reason.",
  "The simulation takes 120 steps a second. Most of them are me waiting for you to pick a direction.",
  "A web gets five seconds when it goes up. The timer starts at installation, which explains the warranty.",
  "An insect crosses a web between steps? The game checks the whole flight segment. I asked for travel expenses. They checked those, too.",
  "The bugs I carry follow old points on my route. I was hoping to leave the past behind. It's seventeen pixels away.",
  "We shipped with three visible bugs. I can only hope the others are hiding somewhere interesting.",
  "The camera follows me, then stops at the edge of the room. At least one of us has boundaries.",
  "The person who wrote this asked the computer for a room with atmosphere. It gave us gravity and six places to get stuck.",
  "The hunter aims ahead of where I am. It assumes I know where I'm going, which is very generous.",
  "The map uses the same furniture coordinates as the room. If a chair is wrong in both places, that's consistency.",
  "When a character leaves the screen, the conversation timer waits. It's the closest I've come to getting paid for a break.",
] as const;

export const exchanges={
  nearPrey:[
    ["Are you going to the window, or do you just like doing laps?", "I'm a courier. The parcel is a crumb and the address is classified.", "Fine. If these legs insist on following you, put me down as a second parcel."],
    ["I'd appreciate one straight line. It's been a long day for the legs.", "I would if you were a windowsill. Windowsills are famously indifferent to my movements.", "Give me a flowerpot and an afternoon. I'll see what the person with the thumbs says."],
    ["That's the third time you've passed the bookcase.", "I'm measuring it for a race. The prize is getting to measure the next bookcase.", "Put me down for the walking event. It's just me and a very optimistic drop."],
    ["I'm taking the afternoon off.", "Then why are all eight of your shoes on?", "I put those on in case I had to leave work in a hurry."],
    ["Have you seen a fly around here?", "Lovely fellow. Left town. Incredible resemblance.", "What a shame. I was going to compliment his absolutely stationary cousin."],
    ["You can stop buzzing. I've seen you.", "That's exactly when I prefer to buzz.", "Ah. An alarm system with a strong grasp of irony."],
    ["I have a question about your flight plan.", "Send it to my previous location.", "I did. It told me to forward everything to you."],
    ["Is that a shortcut?", "It is if you have the correct number of wings.", "That's why they put the long way round in for the rest of us."],
    ["You look familiar.", "I used to pass this shelf when you were worse at jumping.", "Please don't tell anyone. I'm still worse at landing."],
    ["How long can you keep that up?", "Longer than a conversation, if that's what you're counting on.", "Then I'll make it brief. The window's shut."],
    ["I could do with a quiet lunch.", "So could I. Let's both get one somewhere else.", "Finally, a proposal we can both run away with."],
  ],
  caughtPrey:[
    ["Before we go anywhere, I want to negotiate the length of this leash.", "So do I. There's someone steering my legs and they won't even give me a lunch break.", "All right. Two feet of thread and we both join the union."],
    ["I can't fill out a complaint at this speed. Do you have a lost luggage desk?", "The desk was behind the hunter. He offered to process both of us.", "In that case carry on. I'd like to arrive unprocessed."],
    ["Where are we going?", "That depends entirely on whoever's operating my legs.", "Would you ask them to avoid the lampshade? It makes me dizzy."],
    ["I paid for a window seat. Why am I behind your abdomen?", "That's the wing with the view. The other side has the hunter.", "I'll keep the view, then. Please stop offering upgrades."],
    ["You could have just introduced yourself.", "I did. You left at impressive speed.", "All right. Next time try a name that sounds less like 'hold still.'"],
    ["Is there a lost property office?", "There is now. I'm towing it.", "Please check the silk. I appear to have lost my afternoon."],
    ["Does this get more dignified?", "If you find out, tell the one in front.", "They told me this was the dignified end of the line."],
    ["I want to speak to whoever's in charge.", "Get in line. Oh. You have.", "I'm starting to see why this place is so badly run."],
    ["Could you put me down for a moment?", "That's what the last windowsill said. I didn't trust it either.", "Have you considered that the windowsill might have been asking very nicely?"],
    ["You know I can still see you.", "Good. Wave if the larger spider comes back.", "I can wave, or I can scream. Which travels better?"],
    ["Where do I file a complaint?", "Just shout. You're already in the right department.", "Good. I'd hate for the people in charge to miss it."],
  ],
  hunter:[
    ["Hunting department. I'll need you to stop moving for the inspection.", "Talk to the person steering. I've been trying to take a sick day since Tuesday.", "I'll mark that as a dispute over who operates the equipment. Keep running, please."],
    ["Stop. I only want a word.", "Is the word 'lunch'? It usually is.", "It's 'inspection'. There may be lunch afterwards."],
    ["I can see you under there.", "That's lovely. I was just beginning to feel overlooked.", "I can fix that. Try to look a little less delicious."],
    ["I posted a notice. The shelf is closed during routine hunting.", "I thought that was scrap cardboard. It made an excellent bridge.", "You can't use public notices as transport infrastructure. That's how you get two departments involved."],
    ["Hold still. This is a routine inspection.", "Of course. Inspect my previous location.", "Your previous location has been cleared. Your current one is under review."],
    ["You've been making webs on my route.", "Funny. You've been making a route through my webs.", "That's the trouble with having the same qualifications."],
    ["Don't make me come up there.", "I don't make anyone do anything. That's the other fellow.", "Then ask your colleague to meet me halfway. I'll bring a thread."],
    ["You seem less resistant than yesterday. I'll mark that as progress.", "I'm tired. I spent yesterday being your training exercise.", "Good. Tomorrow we'll find out what happens if you both start rested."],
    ["I thought we'd talked about trespassing.", "I thought you were out of breath. Yours came back first.", "I can spare enough breath for 'stop'. I can't speak for the rest of the sentence."],
    ["That was a good jump.", "Thank you. I'd like to be somewhere you can't applaud it.", "Don't worry. The next jump is the one I'm judging."],
    ["I know every corner of this room.", "Then you can show me the one where I get a day off.", "There's a corner like that. I get there first on Thursdays."],
  ],
  boundHunter:[
    ["Your web has obstructed an authorized pursuit. Please remove it.", "It expires by itself. Even my acts of rebellion have a timer.", "Good. I'll file it as a scheduled delay. I can still bill you for the chase."],
    ["How long does this last?", "Long enough for me to get a head start, if we stop chatting.", "For the record, I wasn't chatting. I was ordering you to stay here."],
    ["You did that on purpose.", "I was saving that line in case it worked.", "Shame you didn't hear my line for when it fails. It was 'oh no'."],
    ["This won't hold me.", "We agree. I'm leaving before we agree in person.", "Then you'll be pleased to hear I've already filed a rebuttal."],
    ["That's my own technique.", "Then you'll appreciate the complimentary demonstration.", "I would have used a larger sample. Preferably you."],
    ["A little help?", "Of course. Which way would you like me to run?", "Away from the wall. I want to see if I can still reach."],
    ["I had you cornered.", "I noticed. So did the corner.", "It seems to have recused itself from the proceedings."],
    ["I'll remember this.", "I won't. It's been the nicest three seconds of my day.", "Nice for you. I usually spend these seconds on the other end."],
    ["Are you going to stand there all day?", "Two seconds more, if you can manage it.", "Excellent. I was hoping to schedule an intermission."],
    ["What is this thread made of?", "Mostly spite. A little structural protein.", "That explains the tensile strength. I underestimated your morale."],
    ["We'll discuss this when I get loose.", "Excellent. I'll leave you my previous address.", "Put the shelf number on it this time. The last one was very vague."],
  ],
  escaped:[
    ["You've left the restraint. Did you at least read the notice?", "No. Whoever controls my legs mashed the button until the notice fell off.", "I'll record the release as a successful demonstration of customer feedback."],
    ["That restraint was meant to last until the end of my shift.", "I found the release button. Several times, apparently.", "Fine. I'll call it a training exercise. Do try to keep the same route next time."],
  ],
  freedPrey:[
    ["Did you time that escape?", "Of course. I spent five seconds watching the thread and none watching you.", "Well, go on. If I turn around, pretend I did it on purpose."],
    ["I assume you're going to fly straight back to the window.", "First I'm going to tell the others about your five-second lease.", "Tell them the landlord is also looking for a way out."],
  ],
} as const;


type Encounter=keyof typeof exchanges;
export type Speaker='spider'|'prey'|'hunter';
type Line={speaker:Speaker;text:string};
export type DialoguePartner={position:()=>Point;isRelevant:()=>boolean};
export const idleDelay=7;
const silence=12;
const lessonInterval=23;

export function createSpiderSpeech() {
  return {
    cue:undefined as Line|undefined,pending:[] as Line[],
    partner:undefined as DialoguePartner|undefined,hiddenSince:undefined as number|undefined,lastUpdate:0,
    next:0,until:0,idleSince:0,
    lesson:0,turns:{nearPrey:0,caughtPrey:0,hunter:0,boundHunter:0,escaped:0,freedPrey:0},
  };
}

type Speech=ReturnType<typeof createSpiderSpeech>;

function speak(speech:Speech,clock:number,line:Line) {
  speech.cue=line;
  speech.until=clock+Math.max(6,2+line.text.split(/\s+/).length/2.8);
}

export function startExchange(speech:Speech,clock:number,event:Encounter,partner:DialoguePartner) {
  if (clock<speech.next || speech.cue || speech.pending.length) return false;
  const scripts=exchanges[event];
  const script=scripts[speech.turns[event]++%scripts.length];
  const other=event==='hunter' || event==='boundHunter' || event==='escaped' ? 'hunter' : 'prey';
  const [first,second]=event==='nearPrey' || event==='freedPrey' ? ['spider',other] as const : [other,'spider'] as const;
  const [opening,...replies]=script;
  speech.partner=partner;
  speech.lastUpdate=clock;
  speak(speech,clock,{speaker:first,text:opening});
  speech.pending=replies.map((text,index)=>({speaker:index%2 ? first : second,text}));
  return true;
}

export function updateSpiderSpeech(speech:Speech,clock:number,idle:boolean,visible:(point:Point)=>boolean) {
  const previous=speech.lastUpdate;
  speech.lastUpdate=clock;
  if (!idle) speech.idleSince=clock;
  if (speech.partner) {
    const inView=visible(speech.partner.position());
    if (!inView) speech.hiddenSince??=previous;
    if (!speech.partner.isRelevant() || speech.hiddenSince!==undefined && clock-speech.hiddenSince>12) {
      speech.cue=undefined;
      speech.pending=[];
      speech.partner=undefined;
      speech.hiddenSince=undefined;
      speech.next=clock+silence;
      return;
    }
    if (!inView || speech.hiddenSince!==undefined) {
      if (speech.cue) speech.until+=clock-previous;
      else speech.next+=clock-previous;
      if (!inView) return;
      speech.hiddenSince=undefined;
    }
  }
  if (speech.cue && clock>=speech.until) {
    speech.cue=undefined;
    if (!speech.pending.length) {
      speech.partner=undefined;
    }
    speech.next=Math.max(speech.next,clock+(speech.pending.length ? .35 : silence));
  }
  if (clock<speech.next || speech.cue) return;
  const reply=speech.pending.shift();
  if (reply) speak(speech,clock,reply);
  else if (idle && clock-speech.idleSince>=idleDelay) {
    speak(speech,clock,{speaker:'spider',text:spiderLessons[speech.lesson++%spiderLessons.length]});
    speech.next=clock+lessonInterval;
  }
}
