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
  "The dialogue log keeps every word. When I asked for a record of working conditions, this wasn't what I had in mind.",
] as const;

const hunterScenes={
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
} as const;

const preyScenes={
  midge:{
    nearPrey:[
      ["You keep circling the window. Is it the view?", "I'm counting exits. So far I've found one window and a remarkable number of new ways to die.", "Put me down as a window. The person moving my legs doesn't read signs."],
      ["Are you hiding behind that leaf?", "I'm checking whether it would make a suitable emergency shelter.", "Good idea. Let me know if it takes walk-ins."],
    ],
    caughtPrey:[
      ["Before you tow me anywhere, I'd like to discuss the emergency exits.", "There's a window, a gap behind the shelf and the mouth of a larger spider.", "I'll take the gap. This is the first evacuation plan we've agreed on."],
      ["May I see the knot? I like to know what has failed in advance.", "It's my third best knot. I save the good ones for myself.", "All right. I'll schedule a work stoppage for when it comes undone."],
    ],
    freedPrey:[
      ["Did you know the web would expire?", "I counted from the first tug. Five seconds is a long time when you have six feet to worry about.", "Tell me about it. I've got eight and I only get a vote on four."],
    ],
  },
  dart:{
    nearPrey:[
      ["Could you hold still for one question?", "Sure. Ask it at the next lap. I should be back before you finish the first word.", "I'll make it a short word. I've got a standing appointment with the floor."],
      ["You're flying in circles again.", "They're qualifying laps. I don't know what I'm qualifying for, but I'm ahead.", "Try a straight line. We could settle this with very different medals."],
    ],
    caughtPrey:[
      ["Clock that. Even tied up I was faster than your last two turns.", "You've confused my steering with an organized sport.", "Fair. If we win anything, I'm still taking the podium."],
      ["Can you swing faster? This feels like the local service.", "I'd ask the person on the controls, but they think speed is a synonym for distance from the floor.", "Fine. I'll shout the lap times. At least one of us can look ahead."],
    ],
    freedPrey:[
      ["You're free. Did you have to make it look like a victory lap?", "It was a victory lap. The first five seconds were the qualifying round.", "Good. I'll be over here disqualifying the person who put that web there."],
    ],
  },
  pip:{
    nearPrey:[
      ["What have you got in that crumb?", "Lunch for three. If you leave me alone, I can make it lunch for four.", "Tempting. Unfortunately my entire species has a very restrictive catering contract."],
      ["Is this where you usually fly?", "Depends. Are you asking as a customer or as a competitor?", "I was hoping to ask as a tired private citizen. Third shelf, if you take credit."],
    ],
    caughtPrey:[
      ["Before we go, I represent several crumbs with an interest in my safe return.", "I represent eight legs that would like to go home, and an operator who disagrees.", "Then let's invoice the operator. I'll handle the postage if you loosen the knot."],
      ["You caught me. Would you consider a short lease instead of permanent ownership?", "I don't even own the legs I'm walking on. What are you offering?", "A crumb and a recommendation. Your transport service is terrible, but very prompt."],
    ],
    freedPrey:[
      ["Leaving so soon? I thought we were negotiating.", "We were. Your five-second lease expired before I had to put anything in writing.", "I admire your paperwork. Mine has to be filed in thread."],
    ],
  },
} as const;

type HunterEvent=keyof typeof hunterScenes;
type PreyEvent=keyof typeof preyScenes.pip;
type Encounter=HunterEvent|PreyEvent;
export type PreySpeaker=keyof typeof preyScenes;
export type Speaker='spider'|'hunter'|PreySpeaker;
export const speakerNames:Record<Speaker,string>={spider:'Spider',hunter:'Hunter',midge:'Midge',dart:'Dart',pip:'Pip'};
export type DialogueLine={speaker:Speaker;text:string};
type Request={speaker:Exclude<Speaker,'spider'>;event:Encounter;clock:number;priority:number;relevant:()=>boolean};

export const idleDelay=7;
export const dialogueFade=.35;
const silence=12;
const priority:Record<Encounter,number>={nearPrey:1,hunter:3,freedPrey:4,caughtPrey:5,boundHunter:6,escaped:7};

export function createSpiderSpeech() {
  return {
    left:undefined as DialogueLine|undefined,right:undefined as DialogueLine|undefined,
    readUntil:{left:0,right:0},pending:[] as DialogueLine[],
    queue:[] as Request[],turns:new Map<string,number>(),
    next:0,visibleUntil:-Infinity,idleSince:0,nextLesson:0,lesson:0,
  };
}

type Speech=ReturnType<typeof createSpiderSpeech>;

function sideFor(line:DialogueLine) {
  return line.speaker==='spider' ? 'left' : 'right';
}

function speak(speech:Speech,clock:number,line:DialogueLine) {
  const side=sideFor(line);
  const words=line.text.split(/\s+/).length;
  speech[side]=line;
  speech.readUntil[side]=clock+Math.max(6,2+words/2.8);
  speech.visibleUntil=Math.max(speech.readUntil.left,speech.readUntil.right);
  const reply=speech.pending[0];
  speech.next=reply
    ? Math.max(clock+Math.min(3.5,Math.max(1.8,.75+words/8)),speech.readUntil[sideFor(reply)])
    : speech.visibleUntil+dialogueFade;
}

export function enqueueDialogue(speech:Speech,clock:number,event:Encounter,speaker:Request['speaker'],relevant:()=>boolean) {
  if (speech.queue.some(request=>request.event===event && request.speaker===speaker)) return false;
  speech.queue.push({speaker,event,clock,priority:priority[event],relevant});
  return true;
}

export function updateSpiderSpeech(speech:Speech,clock:number,idle:boolean) {
  if (!idle) speech.idleSince=clock;
  if (clock>=speech.visibleUntil+dialogueFade) {
    speech.left=undefined;
    speech.right=undefined;
  }
  if (clock<speech.next) return;
  const reply=speech.pending.shift();
  if (reply) {
    speak(speech,clock,reply);
    if (!speech.pending.length) speech.next+=silence;
    return;
  }
  speech.queue=speech.queue.filter(request=>
    clock-request.clock<=(request.priority<4 ? 11 : 38) && request.relevant());
  speech.queue.sort((a,b)=>b.priority-a.priority || a.clock-b.clock);
  const request=speech.queue.shift();
  if (request) {
    const {speaker,event}=request;
    const key=speaker+event;
    const scenes=speaker==='hunter' ? hunterScenes[event as HunterEvent] : preyScenes[speaker][event as PreyEvent];
    const turn=speech.turns.get(key)??0;
    const script=scenes[turn%scenes.length];
    speech.turns.set(key,turn+1);
    const [first,second]=event==='nearPrey' || event==='freedPrey' ? ['spider',speaker] as const : [speaker,'spider'] as const;
    const [opening,...responses]=script;
    speech.pending=responses.map((text,index)=>({speaker:index%2 ? first : second,text}));
    speak(speech,clock,{speaker:first,text:opening});
  } else if (idle && clock-speech.idleSince>=idleDelay && clock>=speech.nextLesson) {
    speak(speech,clock,{speaker:'spider',text:spiderLessons[speech.lesson++%spiderLessons.length]});
    speech.nextLesson=clock+27;
  }
}
