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
] as const;

export const exchanges={
  nearPrey:[
    ["Oh. Were you going somewhere?", "Yes. The appointment just became urgent."],
    ["Could you fly in a straight line for a minute?", "Could you become a windowsill for a minute?"],
    ["I take it that's your escape route.", "It was. Thank you for the feedback."],
    ["I'm taking the afternoon off.", "Then why are all eight of your shoes on?"],
    ["Have you seen a fly around here?", "Lovely fellow. Left town. Incredible resemblance."],
    ["You can stop buzzing. I've seen you.", "That's exactly when I prefer to buzz."],
    ["I have a question about your flight plan.", "Send it to my previous location."],
    ["Is that a shortcut?", "It is if you have the correct number of wings."],
    ["You look familiar.", "I used to pass this shelf when you were worse at jumping."],
    ["How long can you keep that up?", "Longer than a conversation, if that's what you're counting on."],
    ["I could do with a quiet lunch.", "So could I. Let's both get one somewhere else."],
  ],
  caughtPrey:[
    ["Is the tether really necessary?", "The last one said that and then demonstrated why it is."],
    ["Can you slow down? I'm luggage, not a kite.", "You should have said so while I was chasing you."],
    ["Where are we going?", "That depends entirely on whoever's operating my legs."],
    ["Do I get a window seat?", "You are the window seat. Don't lean out."],
    ["You could have just introduced yourself.", "I did. You left at impressive speed."],
    ["Is there a lost property office?", "There is now. I'm towing it."],
    ["Does this get more dignified?", "If you find out, tell the one in front."],
    ["I want to speak to whoever's in charge.", "Get in line. Oh. You have."],
    ["Could you put me down for a moment?", "That's what the last windowsill said. I didn't trust it either."],
    ["You know I can still see you.", "Good. Wave if the larger spider comes back."],
    ["Where do I file a complaint?", "Just shout. You're already in the right department."],
  ],
  hunter:[
    ["You're a long way from your shelf.", "I was hoping you'd say the same thing and keep going."],
    ["Stop. I only want a word.", "Is the word 'lunch'? It usually is."],
    ["I can see you under there.", "That's lovely. I was just beginning to feel overlooked."],
    ["This end of the room is mine.", "If you put up a sign, I'd have something to hide behind."],
    ["Hold still. This is a routine inspection.", "Of course. Inspect my previous location."],
    ["You've been making webs on my route.", "Funny. You've been making a route through my webs."],
    ["Don't make me come up there.", "I don't make anyone do anything. That's the other fellow."],
    ["You look tired.", "Thank you. I've been training by being chased."],
    ["I thought we'd talked about trespassing.", "I thought you were out of breath. Yours came back first."],
    ["That was a good jump.", "Thank you. I'd like to be somewhere you can't applaud it."],
    ["I know every corner of this room.", "Then you can show me the one where I get a day off."],
  ],
  boundHunter:[
    ["Could you undo this knot?", "I could. I'd rather see how you do on your own."],
    ["How long does this last?", "Long enough for me to get a head start, if we stop chatting."],
    ["You did that on purpose.", "I was saving that line in case it worked."],
    ["This won't hold me.", "We agree. I'm leaving before we agree in person."],
    ["That's my own technique.", "Then you'll appreciate the complimentary demonstration."],
    ["A little help?", "Of course. Which way would you like me to run?"],
    ["I had you cornered.", "I noticed. So did the corner."],
    ["I'll remember this.", "I won't. It's been the nicest three seconds of my day."],
    ["Are you going to stand there all day?", "Two seconds more, if you can manage it."],
    ["What is this thread made of?", "Mostly spite. A little structural protein."],
    ["We'll discuss this when I get loose.", "Excellent. I'll leave you my previous address."],
  ],
} as const;

type Encounter=keyof typeof exchanges;
export type Speaker={kind:'spider'}|{kind:'prey'|'hunter';position:()=>Point};
type Line={speaker:Speaker;text:string};
const spider:Speaker={kind:'spider'};
export const idleDelay=7;
const silence=12;
const lessonInterval=23;

export function createSpiderSpeech() {
  return {
    cue:undefined as Line|undefined,reply:undefined as Line|undefined,
    next:0,until:0,idleSince:0,teaching:false,
    lesson:0,turns:{nearPrey:0,caughtPrey:0,hunter:0,boundHunter:0},
  };
}

type Speech=ReturnType<typeof createSpiderSpeech>;

function speak(speech:Speech,clock:number,line:Line) {
  speech.cue=line;
  speech.until=clock+Math.max(1.7,line.text.length*.041);
}

export function startExchange(speech:Speech,clock:number,event:Encounter,other:Speaker) {
  if (clock<speech.next || speech.cue || speech.reply) return false;
  const scripts=exchanges[event];
  const [first,second]=scripts[speech.turns[event]++%scripts.length];
  const [firstSpeaker,secondSpeaker]=event==='nearPrey' ? [spider,other] : [other,spider];
  speak(speech,clock,{speaker:firstSpeaker,text:first});
  speech.reply={speaker:secondSpeaker,text:second};
  return true;
}

export function updateSpiderSpeech(speech:Speech,clock:number,idle:boolean) {
  if (!idle) {
    speech.idleSince=clock;
    if (speech.teaching) {
      speech.cue=undefined;
      speech.teaching=false;
    }
  }
  if (speech.cue && clock>=speech.until) {
    speech.cue=undefined;
    if (!speech.reply) speech.teaching=false;
    speech.next=Math.max(speech.next,clock+(speech.reply ? .35 : silence));
  }
  if (clock<speech.next || speech.cue) return;
  if (speech.reply) {
    speak(speech,clock,speech.reply);
    speech.reply=undefined;
  } else if (idle && clock-speech.idleSince>=idleDelay) {
    speech.teaching=true;
    speak(speech,clock,{speaker:spider,text:spiderLessons[speech.lesson++%spiderLessons.length]});
    speech.next=clock+lessonInterval;
  }
}
