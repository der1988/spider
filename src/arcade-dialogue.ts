type Insect=readonly [name:string,kind:number];
type Encounter={
  name:string;
  insects:readonly Insect[];
  line:string;
  reply:string;
};

export const campaign=[
  {name:'Pip',insects:[['Pip',0]],
    line:'I’ve reserved the low lane for a slow lap.',reply:'Good. I’ve reserved the middle of it for some silk.'},
  {name:'Rush Hour',insects:[['Zip',1],['Meter',0]],
    line:'Zip takes the express lane. Meter stops at every leaf.',reply:'So the same ticket gets me two entirely different delays.'},
  {name:'The Exit Rows',insects:[['Veera',2],['Crumb',1]],
    line:'When you come near, I move out. Crumb charges for the empty seat.',reply:'I’ll set the trap where the usher can’t see it.'},
  {name:'Second Storey',insects:[['Peck',3],['Lint',2],['Hush',0]],
    line:'I go up when you get close. Lint and Hush cover the exits.',reply:'At last, a building with stairs that are actively against me.'},
  {name:'The Runway Ends',insects:[['Dash',4],['Taxi',1],['Permit',3]],
    line:'Turns are a fad. We’ve cancelled them on the runway.',reply:'I’ll hang the closing notice right across it.'},
  {name:'The Fine Print',insects:[['Fern',5],['Staples',2],['Tab',1]],
    line:'We saw your net in the contract. We’ve elected to go around.',reply:'I’ve started putting amendments at the end of the detour.'},
  {name:'The Roundabouts',insects:[['Orbit',6],['Kerb',4],['Penny',3],['Clove',5]],
    line:'Put a net across the middle and we’ll each take a different exit.',reply:'That explains why your reunion tour needs four separate venues.'},
  {name:'The Low Notes',insects:[['Dusty',7],['Mica',6],['Lift',3],['Tread',4]],
    line:'I descend. Lift ascends. We split the manager’s fee at the landing.',reply:'I’ll meet whichever one of you actually reads the floor plan.'},
  {name:'Last Light',insects:[['Glow',9],['Nibs',8],['Wick',5],['Vesper',6],['Flint',4]],
    line:'We’ve lit the detours. Nibs can slip a knot before the encore.',reply:'I’ll make the first verse count, then.'},
  {name:'Duke Wobbleknees',insects:[],
    line:'I have brought my own silk and a very formal approach.',reply:'Does the formal approach usually involve charging at the host?'},
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
  const {line,reply}=dialogueFor(level);
  return levelEntranceSeconds+deliverySeconds(line)+deliverySeconds(reply);
}

export function insectMark(level:number,index:number) {
  const kind=dialogueFor(level).insects[index][1];
  return campaign.slice(0,level-1).reduce((sum,encounter)=>
    sum+encounter.insects.filter(([,type])=>type===kind).length,0);
}
