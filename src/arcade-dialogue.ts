type Insect=readonly [name:string,kind:number];
type Encounter={
  name:string;
  insects:readonly Insect[];
  line:string;
  reply:string;
  closing:string;
};

export const campaign=[
  {name:'Pip',insects:[['Pip',0]],
    line:'May I have your full attention for one pass?',
    reply:'I can spare the side of my head.',
    closing:'Perfect. I was aiming for that.'},
  {name:'Rush Hour',insects:[['Zip',1],['Meter',0]],
    line:'I need the whole lane to build up speed.',
    reply:'Who gave you a runway permit?',
    closing:'Meter. He’s billing me by the impact.'},
  {name:'The Exit Rows',insects:[['Veera',2],['Crumb',1]],
    line:'Crumb takes the front. I charge extra for the back.',
    reply:'What does a surprise from the side cost?',
    closing:'Oh. That one’s complimentary.'},
  {name:'Second Storey',insects:[['Peck',3],['Lint',2],['Hush',0]],
    line:'The penthouse offers complimentary dives.',
    reply:'Can I opt out at reception?',
    closing:'Certainly. Reception is directly below me.'},
  {name:'The Runway Ends',insects:[['Dash',4],['Taxi',1],['Permit',3]],
    line:'I’ve leased a straight line through the arena.',
    reply:'Did the lease mention my head?',
    closing:'Yes. It’s listed as a fixture.'},
  {name:'The Fine Print',insects:[['Fern',5],['Staples',2],['Tab',1]],
    line:'I drew a detour around your silk.',
    reply:'Did you bring a copy for me?',
    closing:'Yes. The arrow points behind you.'},
  {name:'The Roundabouts',insects:[['Orbit',6],['Kerb',4],['Penny',3],['Clove',5]],
    line:'We’ll circle you from four different directions.',
    reply:'That sounds difficult to rehearse.',
    closing:'It was. We hired four different directors.'},
  {name:'The Low Notes',insects:[['Dusty',7],['Mica',6],['Lift',3],['Tread',4]],
    line:'I’m practicing a dignified descent.',
    reply:'On your feet this time?',
    closing:'I was hoping to borrow yours.'},
  {name:'Last Light',insects:[['Glow',9],['Nibs',8],['Wick',5],['Vesper',6],['Flint',4]],
    line:'Wick lights a path. Nibs slips the knots.',
    reply:'What do you do?',
    closing:'I stand where you should have been looking.'},
  {name:'Duke Wobbleknees',insects:[],
    line:'A formal duel begins with a silk invitation.',
    reply:'How do I decline?',
    closing:'Run. It lends the charge a little ceremony.'},
] as const satisfies readonly Encounter[];

export const arcadeLevels=campaign.length;
export const heartsPerRun=3;
export const levelEntranceSeconds=.66;
export function dialogueFor(level:number):Encounter {
  return campaign[level-1];
}
export function deliverySeconds(line:string) {
  return Math.max(2.25,1.05+line.split(' ').length*.195);
}
export function levelIntroDuration(level:number) {
  const {line,reply,closing}=dialogueFor(level);
  return levelEntranceSeconds+deliverySeconds(line)+deliverySeconds(reply)+deliverySeconds(closing);
}

export function insectMark(level:number,index:number) {
  const kind=dialogueFor(level).insects[index][1];
  return campaign.slice(0,level-1).reduce((sum,encounter)=>
    sum+encounter.insects.filter(([,type])=>type===kind).length,0);
}
