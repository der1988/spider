type Insect=readonly [name:string,kind:number,line:string];
type Encounter={
  name:string;
  insects:readonly Insect[];
  reply:string;
  rivalLine?:string;
};

export const campaign=[
  {name:'Pip',insects:[['Pip',0,'I brake with my forehead.']],
    reply:'That explains the dents.'},
  {name:'Rush Hour',insects:[
    ['Zip',1,'At full speed, turns cost extra.'],
    ['Meter',0,'I bill the thing he hits.'],
  ],reply:'Put it on the wall’s tab.'},
  {name:'The Exit Rows',insects:[
    ['Veera',2,'I go left on the second blink.'],
    ['Crumb',1,'I charge on the first one.'],
  ],reply:'I’ll keep both eyes open.'},
  {name:'Second Storey',insects:[
    ['Peck',3,'I dive from the penthouse.'],
    ['Lint',2,'I take the service entrance.'],
    ['Hush',0,'I’m the bell. I hit you once.'],
  ],reply:'I’ll hang out the Do Not Disturb.'},
  {name:'The Runway Ends',insects:[
    ['Dash',4,'The runway ends at your face.'],
    ['Taxi',1,'I can get us there in one dash.'],
    ['Permit',3,'I’ve approved a steep approach.'],
  ],reply:'I’m moving the airport.'},
  {name:'The Fine Print',insects:[
    ['Fern',5,'I marked a detour around the silk.'],
    ['Staples',2,'I filed it under Fake Left.'],
    ['Tab',1,'I skipped straight to the impact.'],
  ],reply:'Please file that under Missed.'},
  {name:'The Roundabouts',insects:[
    ['Orbit',6,'I insist on one more lap.'],
    ['Kerb',4,'I only do straight roads.'],
    ['Penny',3,'Then I’ll drop in from above.'],
    ['Clove',5,'I’ve reserved every other exit.'],
  ],reply:'I’ll take the unreserved ceiling.'},
  {name:'The Low Notes',insects:[
    ['Dusty',7,'The low lane has better acoustics.'],
    ['Mica',6,'I’ll loop the chorus.'],
    ['Lift',3,'Then I’ll hit the high note.'],
    ['Tread',4,'I’m playing the drum. It’s you.'],
  ],reply:'I’m taking my drum home.'},
  {name:'Last Light',insects:[
    ['Glow',9,'I inspect nets from a distance.'],
    ['Nibs',8,'I prefer to slip out in person.'],
    ['Wick',5,'I’ve already found a side door.'],
    ['Vesper',6,'I’ll circle till it opens.'],
    ['Flint',4,'I can open it with my face.'],
  ],reply:'Have you tried the handle?'},
  {name:'Duke Wobbleknees',insects:[],
    rivalLine:'The web is a formal invitation.',
    reply:'I’ll be declining at speed.'},
] as const satisfies readonly Encounter[];

export const arcadeLevels=campaign.length;
export const heartsPerRun=3;
export const levelEntranceSeconds=.66;
type Line={speaker:number|'spidey'|'rival';words:string;until:number};

export function dialogueFor(level:number):Encounter {
  return campaign[level-1];
}

const scripts=campaign.map((encounter:Encounter)=>{
  let until=levelEntranceSeconds;
  const lines:Omit<Line,'until'>[]=encounter.insects.map(([, ,words],speaker)=>({speaker,words}));
  if (encounter.rivalLine) lines.push({speaker:'rival',words:encounter.rivalLine});
  lines.push({speaker:'spidey',words:encounter.reply});
  return lines.map(line=>{
    until+=Math.max(1.3,.7+.20*line.words.split(' ').length);
    return {...line,until};
  });
});

export function lineAt(level:number,elapsed:number) {
  if (elapsed>=levelEntranceSeconds) return scripts[level-1].find(line=>elapsed<line.until);
}
export function levelIntroDuration(level:number) {
  return scripts[level-1].at(-1)!.until;
}

export function insectMark(level:number,index:number) {
  const kind=dialogueFor(level).insects[index][1];
  return campaign.slice(0,level-1).reduce((sum,encounter)=>
    sum+encounter.insects.filter(([,type])=>type===kind).length,0);
}
