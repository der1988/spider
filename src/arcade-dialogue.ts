type Insect=readonly [name:string,kind:number,line:string];
type Encounter={
  name:string;
  insects:readonly Insect[];
  reply:string;
  rivalLine?:string;
};

export const campaign=[
  {name:'Pip',insects:[['Pip',0,'Walls are my emergency brakes.']],
    reply:'Send the wall a thank-you note.'},
  {name:'Rush Hour',insects:[
    ['Zip',1,'I’m hauling one urgent pollen.'],
    ['Meter',0,'It’s addressed to your forehead.'],
  ],reply:'Mark me down as a closed flower.'},
  {name:'The Exit Rows',insects:[
    ['Veera',2,'My left wing is a decoy wing.'],
    ['Crumb',1,'I’m the right wing’s alibi.'],
  ],reply:'I’ll question you separately.'},
  {name:'Second Storey',insects:[
    ['Peck',3,'I dive for airmail.'],
    ['Lint',2,'I sort letters by smell.'],
    ['Hush',0,'I deliver bills by headbutt.'],
  ],reply:'I knew that stamp was a mistake.'},
  {name:'The Runway Ends',insects:[
    ['Dash',4,'I can’t turn with a full crop.'],
    ['Taxi',1,'It’s full of borrowed nectar.'],
    ['Permit',3,'I insure the nectar, not him.'],
  ],reply:'I’ll put a lid on the policy.'},
  {name:'The Fine Print',insects:[
    ['Fern',5,'I follow the gaps in your web.'],
    ['Staples',2,'The gap on the left is a decoy.'],
    ['Tab',1,'I ate the key to the map.'],
  ],reply:'Then you’re my directions.'},
  {name:'The Roundabouts',insects:[
    ['Orbit',6,'This is my mating circle.'],
    ['Kerb',4,'I court in straight lines.'],
    ['Penny',3,'I propose from a height.'],
    ['Clove',5,'I’m screening the escape routes.'],
  ],reply:'I’m flattered by the perimeter.'},
  {name:'The Low Notes',insects:[
    ['Dusty',7,'I hum down in the root cellar.'],
    ['Mica',6,'My chorus goes around twice.'],
    ['Lift',3,'I sing soprano in a dive.'],
    ['Tread',4,'The drum is your abdomen.'],
  ],reply:'My abdomen has left the band.'},
  {name:'Last Light',insects:[
    ['Glow',9,'I appraise cobwebs by moonlight.'],
    ['Nibs',8,'I check for silk by escaping it.'],
    ['Wick',5,'I found the web’s service hatch.'],
    ['Vesper',6,'I circle to inflate the price.'],
    ['Flint',4,'I’m selling the knots individually.'],
  ],reply:'I’ll make you a bundle offer.'},
  {name:'Duke Wobbleknees',insects:[],
    rivalLine:'I inherited the rights to falling.',
    reply:'Gravity’s been subletting to me.'},
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
