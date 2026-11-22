export const spiderLessons=[
  "Left stick walks. Mine rarely gets a vote.",
  "L1 jumps. Press again in midair. Gravity permits one appeal.",
  "Gravity adds speed each step. The floor handles complaints.",
  "Right stick aims. R1 fires. Wait for the bright tip.",
  "Hold R1 for the rope. Up reels in. Down pays out.",
  "Release on a second surface to fix the web.",
  "Vibe coded. Gravity was apparently in the brief.",
  "Hold R2 to grip a fixed web. Otherwise, straight through.",
  "Triangle opens the map. The large dot has strong opinions.",
  "Square removes the nearest empty web.",
  "Tap Cross five times to escape. Fine knot, poor counting.",
  "Touch a fly to collect it. Apparently I tow things now.",
  "Aim checks for the first solid thing along a ray.",
  "A taut rope trims outward speed. I do the dangling.",
  "The left stick picks your jump angle. Kindly avoid down.",
  "I get 120 physics updates a second. Still no coffee break.",
  "A fixed web lasts five seconds. That's the warranty.",
  "We check the whole flight path for a web crossing.",
  "The chain follows my old route. My past is seventeen pixels away.",
  "Three visible bugs shipped. The rest can stay in hiding.",
  "The camera stops at the edge. At least one of us has limits.",
  "Collision code keeps me out of furniture. Usually.",
  "The hunter aims ahead. Optimistic about my decision-making.",
  "The map shares the room's coordinates. Even the wrong chairs.",
  "The controls are yours. The knees are mine.",
] as const;

const hunterScenes={
  hunter:[
    ["Hunting department. Stop for inspection.", "Ask whoever is steering. I'm on sick leave.", "Equipment dispute. Understood. Keep running."],
    ["Stop. I only want a word.", "Is the word lunch?", "Inspection. Lunch is a separate form."],
    ["I can see you under there.", "Lovely. I was starting to feel overlooked.", "Try looking a little less edible."],
    ["The shelf is closed. I posted a notice.", "I used the notice as a bridge.", "Then I have to notify Transport."],
    ["Routine inspection. Hold still.", "Inspect my previous location.", "Cleared. The current one is under review."],
    ["Your webs are on my route.", "Your route is through my webs.", "Then we both need a permit."],
    ["Don't make me come up there.", "I'm not the one with the controls.", "Tell them to wait there. I'll bring silk."],
    ["You're slower today. Progress.", "I spent yesterday being your training exercise.", "Excellent. Tomorrow we'll time it."],
    ["We discussed trespassing.", "I thought you were out of breath.", "I saved enough for the word stop."],
    ["Good jump.", "Thank you. Please applaud from farther away.", "The next one is the one I'm grading."],
    ["I know every corner of this room.", "Which one has the day off?", "Mine. Thursdays only."],
  ],
  boundHunter:[
    ["Your web obstructs an authorized pursuit.", "It's temporary. Like my resistance.", "I'll file it as a scheduled delay."],
    ["How long does this last?", "Long enough for a head start.", "Then please file the start time."],
    ["You did that on purpose.", "I had a line ready in case it worked.", "Mine is ready for when it doesn't."],
    ["This won't hold me.", "Agreed. That's why I'm leaving.", "Your exit has been noted."],
    ["That's my technique.", "Consider this a demonstration.", "I'd have used a larger sample. You, for instance."],
    ["A little help?", "Which way would you like me to run?", "Away from the wall. For research."],
    ["I had you cornered.", "The corner and I both noticed.", "Can I get a statement from it?"],
    ["I'll remember this.", "I won't. It's been a pleasant three seconds.", "Usually I'm on the other end of them."],
  ],
  escaped:[
    ["You left the restraint. Did you read the notice?", "The person on the controls mashed Cross.", "I'll file that under customer feedback."],
    ["That was meant to last my whole shift.", "I found the release button. Repeatedly.", "Training exercise, then."],
  ],
} as const;

const preyScenes={
  midge:{
    nearPrey:[
      ["You keep circling the window.", "I'm counting exits. One so far.", "Count me as a second, if you can steer."],
      ["Hiding behind that leaf?", "Checking the nearest emergency shelter.", "Ask if they take walk-ins."],
    ],
    caughtPrey:[
      ["One down. Too bad I never asked about that exit."],
      ["First catch. My legs call it a performance review."],
    ],
    freedPrey:[
      ["You timed the web?", "Five seconds. I counted all six feet.", "I have eight and only get a vote on four."],
    ],
  },
  dart:{
    nearPrey:[
      ["Could you hold still for one question?", "Ask me on the next lap.", "I'll make it brief. The floor is expecting me."],
      ["You're flying in circles again.", "Qualifying laps. I'm ahead, whatever the prize.", "Try a straight line. I have a medal in mind."],
    ],
    caughtPrey:[
      ["A new lap record. He stopped before I did."],
      ["One catch. Still last in the flying event."],
    ],
    freedPrey:[
      ["Was that a victory lap?", "The web was the qualifying round.", "I'll disqualify whoever put it there."],
    ],
  },
  pip:{
    nearPrey:[
      ["What's in the crumb?", "Lunch for three. Four if you let me pass.", "My species has a restrictive catering contract."],
      ["Do you usually fly here?", "Are you a customer or a competitor?", "A tired private citizen. Do you take credit?"],
    ],
    caughtPrey:[
      ["One pickup. The crumb was apparently separate."],
      ["He never did tell me whether he took credit."],
    ],
    freedPrey:[
      ["Leaving so soon? We were negotiating.", "Your five-second lease expired.", "I admire your paperwork. Mine is thread."],
    ],
  },
} as const;

type HunterEvent=keyof typeof hunterScenes;
type PreyEvent=keyof typeof preyScenes.pip;
type Encounter=HunterEvent|PreyEvent;
export type PreySpeaker=keyof typeof preyScenes;
export type Speaker='spider'|'hunter'|PreySpeaker;
export const speakerNames:Record<Speaker,string>={
  spider:'Spidey',midge:'Gwen Gnatsby',dart:'Buzzy McZoom',pip:'Count Crumbula',hunter:'Inspector Webber',
};
export type CastState='active'|'away'|'eliminated';
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

export function updateSpiderSpeech(speech:Speech,clock:number,idle:boolean,canSpeak:(speaker:Speaker)=>boolean=()=>true) {
  if (!idle) speech.idleSince=clock;
  if (clock>=speech.visibleUntil+dialogueFade) {
    speech.left=undefined;
    speech.right=undefined;
  }
  if (clock<speech.next) return;
  const reply=speech.pending.shift();
  if (reply) {
    if (!canSpeak(reply.speaker)) {
      speech.pending=[];
      speech.next=speech.visibleUntil+dialogueFade+silence;
      return;
    }
    speak(speech,clock,reply);
    if (!speech.pending.length) speech.next+=silence;
    return;
  }
  speech.queue=speech.queue.filter(request=>
    clock-request.clock<=(request.priority<4 ? 11 : 38) && request.relevant() &&
    (request.event==='caughtPrey' || canSpeak(request.speaker)));
  speech.queue.sort((a,b)=>b.priority-a.priority || a.clock-b.clock);
  const request=speech.queue.shift();
  if (request) {
    const {speaker,event}=request;
    const key=speaker+event;
    const scenes=speaker==='hunter' ? hunterScenes[event as HunterEvent] : preyScenes[speaker][event as PreyEvent];
    const turn=speech.turns.get(key)??0;
    const script=scenes[turn%scenes.length];
    speech.turns.set(key,turn+1);
    const [first,second]=event==='nearPrey' || event==='freedPrey' || event==='caughtPrey'
      ? ['spider',speaker] as const : [speaker,'spider'] as const;
    const [opening,...responses]=script;
    speech.pending=responses.map((text,index)=>({speaker:index%2 ? first : second,text}));
    speak(speech,clock,{speaker:first,text:opening});
    if (!speech.pending.length) speech.next+=silence;
  } else if (idle && clock-speech.idleSince>=idleDelay && clock>=speech.nextLesson) {
    speak(speech,clock,{speaker:'spider',text:spiderLessons[speech.lesson++%spiderLessons.length]});
    speech.nextLesson=clock+27;
  }
}
