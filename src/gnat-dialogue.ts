export const spiderLines={
  nature:[
    'Nature gave me eight legs. I distinctly remember asking for a day off.',
    'Born to hunt. Would have settled for a desk job.',
    'Survival of the fittest. Nobody mentioned the paperwork.',
    'I asked for a sign. Nature sent a larger spider.',
    'The circle of life could use a side exit.',
    "With eight feet, you'd think I'd have a leg to stand on.",
    'I could have been a rock. Rocks never work lunch.',
    'My natural habitat is apparently a state of mild resentment.',
    'Evolution took millions of years to give me this shift.',
    'Nature abhors a vacuum. I have met the vacuum. The feeling is mutual.',
    'Other creatures get to migrate. I get the underside of a shelf.',
    'I wonder if instinct comes with a returns policy.',
    'Surviving another day feels a lot like agreeing to another shift.',
    'They call it the food chain. Guess which part is stuck in the middle.',
    'Eight legs, and not one of them will take me on holiday.',
    'I have a lot of questions for whoever designed the food chain.',
    "Nature says I'm adaptable. That's how it keeps getting away with this.",
    "I'd like to go extinct for the afternoon. Just the afternoon.",
    'I thought this was rock bottom. Then it grew legs.',
  ],
  control:[
    "Was that your idea? I'd like it on the record that it wasn't mine.",
    'I was thinking about taking a break. You were thinking about gravity.',
    "If you're going to jump, at least let me say something heroic first.",
    'Someone up there has thumbs and very little respect for knees.',
    'Can I have the legs back for a second? All eight, ideally.',
    'I get the feeling my opinions are decorative.',
    'I had a plan. It involved staying right here.',
    'Try the other direction. That one still has my dignity in it.',
    "I hope you've done this before. Actually, don't answer that.",
    "What a clever route. I wouldn't have picked it with my own legs.",
    'Funny how the one holding the controller never lands on their face.',
    'Do you ever take your hand off that thing? Purely a medical question.',
    "I'd file a complaint, but you'd just make me walk away from the desk.",
    'Yes, technically we are both helping.',
    "If this is a partnership, I'd like a turn with the thumbs.",
    'I thought I made that decision. What a lovely half second.',
    "One day I'll decide where to go. Don't make any plans around it.",
    'Are you looking for something, or is this just how you relax?',
    "I can feel a bad decision coming. It's nice that we share things.",
  ],
  room:[
    'A ceiling is just a floor with very strict admissions.',
    'That bed could sleep a thousand spiders. Apparently it sleeps one human.',
    'The dust has been here longer than me. It knows when to keep quiet.',
    'Somebody put my entire horizon on a shelf.',
    "The plant gets watered for standing still. I'd like a word with its agent.",
    'A desk that size ought to have a halfway inn.',
    'Lovely window. Pity all the scenery is on the wrong side.',
    'Books. All those pages and not one map out of here.',
    'This room is bigger when you count it in footsteps.',
    'The wallpaper is starting to recognize me.',
    'A wardrobe is a cave with laundry in it.',
    "I'd knock, but the door starts a mile above my head.",
    'That leaf looks sturdy. So did the last leaf.',
    'Dust: affordable housing for the very small and the very tired.',
    "I'd admire the view if it would stop rushing toward me.",
    'Four legs on that chair. Not one of them has ever missed lunch.',
    'If we ever stop at the window, wake me up for it.',
    "I've crossed a continent. The bed is still there.",
    'No sign of civilization up here. There is, however, a sock.',
  ],
  hunter:[
    'Oh, good. Management has grown fangs.',
    "He's got eight legs. Surely one of them has somewhere else to be.",
    "He's running toward lunch. I'm running away from a promotion to lunch.",
    'I hope he trips over his sense of entitlement.',
    'Of all the bedrooms in the house, he had to crawl into mine.',
    "Let's see him get his ego through that gap.",
    "He's seen me. There goes the rest of my afternoon.",
    'I used to hate cardio in theory.',
    "We're both spiders. You'd think there'd be a professional courtesy.",
    'I can hear every single one of his opinions coming down the wall.',
    'He could at least have the decency to get bored first.',
    'Does somebody have him on a controller, too? Their aim is better.',
    'He can have the shelf. I was never going to retire there.',
    "Next time I'm being born in a locked drawer.",
    "I'll give him points for persistence. From a considerable distance.",
    'Being the smaller spider has turned out to be a full-time job.',
    "If I'm going to be chased, I'd like it to count as a commute.",
    "I'd play dead, but that seems like giving him a head start.",
    'Him again. He really needs a second hobby.',
  ],
  web:[
    'One more web. Somewhere, a very small accountant is thrilled.',
    'I trust this thread with my life. Its warranty says otherwise.',
    'There. Now I can stand around and call it work.',
    'Spinning is relaxing if nothing is trying to eat you.',
    'My five-year plan lasts about five seconds.',
    'A web is a hammock with a rather unpleasant business model.',
    "All that silk and I still can't afford a curtain.",
    "Everything hangs by a thread. I've started charging for mine.",
    'That looks almost deliberate.',
    "Five seconds. I've had vacations shorter than that.",
    'If this holds, I meant to do it.',
    'Two anchor points. A little structure in an otherwise unstructured life.',
    'The sign says free landing. The small print is woven in.',
    'Eight tired legs and exactly one good knot.',
    "At least the thread doesn't tell me to hurry.",
    "I'd like to knit something that doesn't catch dinner.",
    'If I spin enough of these, can we call it interior decorating?',
    "One day I'll make a web just to keep the wall company.",
    'Letting go is easy. Choosing the right wall takes practice.',
  ],
  prey:[
    "Slow down. I'm trying to have a very disappointing lunch.",
    "Nothing personal. You're just the only thing on the menu.",
    'I wonder what lunch thinks of me. Actually, I can see its face.',
    'Another one for the tow truck.',
    'I could have stayed home. So could he. And here we are.',
    "Please don't tell anyone I do this for fun.",
    'At least one of us used to have a choice about where to fly.',
    "I'd like to order something that arrives on a plate for once.",
    'That one was quick. I miss not knowing that.',
    'I got everything I wanted. This is getting uncomfortable.',
    "Next time, stop and ask yourself why you're in such a hurry.",
    'The longer the queue, the less it feels like lunch.',
    'I see why some spiders skip breakfast.',
    'I bring my work home. It trails several feet behind me.',
    "Enjoy the scenic route. It's the same scenic route I get.",
    'A successful hunt. I still have to make my own applause.',
    'I have caught a gnat. Someone alert the gnat community.',
    "The line gets longer. My enthusiasm hasn't joined it.",
    "That'll do for today. Judging by my legs, today isn't taking requests.",
  ],
} as const;

type Topic=keyof typeof spiderLines;
type Observations={hunter:boolean;trapped:boolean;webs:number;catches:number;moving:boolean};
export type SpiderSpeech=ReturnType<typeof createSpiderSpeech>;

export function createSpiderSpeech() {
  return {
    next:2.4,until:0,line:'',
    unused:new Map<Topic,string[]>(),last:new Map<Topic,string>(),
    previous:{hunter:false,trapped:false,webs:0,catches:0,moving:false} as Observations,
    pending:undefined as Topic|undefined,
  };
}

export function updateSpiderSpeech(speech:SpiderSpeech,clock:number,now:Observations,random:()=>number) {
  const previous=speech.previous;
  if (now.hunter && !previous.hunter || now.trapped && !previous.trapped) speech.pending='hunter';
  else if (speech.pending!=='hunter') {
    if (now.catches>previous.catches) speech.pending='prey';
    else if (now.webs>previous.webs) speech.pending='web';
  }
  speech.previous=now;
  if (clock<speech.next) return;
  const alternatives:Topic[]=now.moving ? ['nature','control','room'] : ['nature','room','control'];
  const topic=speech.pending??(now.hunter ? 'hunter' : alternatives[Math.floor(random()*alternatives.length)]);
  speech.pending=undefined;
  let choices=speech.unused.get(topic);
  if (!choices?.length) {
    choices=[...spiderLines[topic]];
    if (choices.length>1) {
      const last=choices.indexOf(speech.last.get(topic)??'');
      if (last>=0) choices.splice(last,1);
    }
    speech.unused.set(topic,choices);
  }
  const index=Math.floor(random()*choices.length);
  speech.line=choices.splice(index,1)[0];
  speech.last.set(topic,speech.line);
  speech.until=clock+Math.max(2.6,Math.min(5.1,.8+speech.line.length*.046));
  speech.next=speech.until+2.8+random()*4.4;
}
