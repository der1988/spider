import type {Point} from './spider.ts';

type ResidentId='mantis'|'springtail'|'quartermaster';
type Reward='food'|'jump'|'sale';
export type TownSites=Partial<Record<ResidentId,Point>>&{items?:readonly Point[]};
export type TownTarget={kind:'talk';id:ResidentId;position:Point}|{kind:'pickup';id:number;position:Point};

type Choice={label:string;response:string;reward?:Reward};
type Scene={resident:string;opening:string;options:Choice[]};
const floor=961.6;
const residents=[
  {id:'mantis',name:'Sister Sprig',position:{x:530,y:floor}},
  {id:'springtail',name:'Hops',position:{x:1180,y:floor}},
  {id:'quartermaster',name:'Tally',position:{x:1375,y:floor}},
] as const;

const greetings:Record<ResidentId,readonly [string,string,string]> = {
  mantis:[
    'I can wait until you finish talking to the ceiling.',
    'Any word from the ceiling?',
    'I brought my inside voice. It still has eight legs.',
  ],
  springtail:[
    'You landed on purpose. How did you do that?',
    'I have a follow-up question about falling.',
    'You make the floor look optional.',
  ],
  quartermaster:[
    'Does the queue start here, or is this all the queue?',
    'Has the queue progressed in my absence?',
    'I came to check on my application for lunch.',
  ],
};

export function createTown(random=Math.random,sites:TownSites={}) {
  const itemSites=sites.items??[{x:657+random()*38,y:floor},{x:1300+random()*33,y:floor},{x:1947+random()*24,y:floor}];
  return {
    residents:residents.map(resident=>({...resident,position:{...(sites[resident.id]??resident.position)}})),
    items:itemSites.map((position,id)=>({id,position:{...position},collected:false})),
    inventory:{pollen:0},
    rewards:{highJump:false,foodUntil:0},
    visits:{mantis:0,springtail:0,quartermaster:0},
    activeResident:undefined as ResidentId|undefined,
    dialogue:undefined as Scene|undefined,
  };
}

export type Town=ReturnType<typeof createTown>;

export function townTarget(town:Town,player:Point,project:(point:Point)=>Point=point=>point,
  reachable:(point:Point)=>boolean=()=>true):TownTarget|undefined {
  let result:TownTarget|undefined;
  let nearest=42;
  const nearby=(target:TownTarget)=>{
    const distance=Math.hypot(target.position.x-player.x,target.position.y-player.y);
    if (distance<nearest && reachable(target.position)) {nearest=distance;result=target;}
  };
  for (const resident of town.residents) {
    nearby({kind:'talk',id:resident.id,position:project(resident.position)});
  }
  for (const item of town.items) {
    if (!item.collected) nearby({kind:'pickup',id:item.id,position:project(item.position)});
  }
  return result;
}

function residentScene(town:Town,id:ResidentId,clock:number,value:number):Scene {
  const visit=town.visits[id];
  switch (id) {
    case 'mantis': {
      const hasPollen=town.inventory.pollen>0;
      return {
        resident:'Sister Sprig',
        opening:clock<town.rewards.foodUntil
          ? 'Your ration is still working. Kindly refrain from praying for a second dessert.'
          : visit===0 ? 'I pray for the flies to stop interrupting. You look like someone who could interrupt them first.'
            : hasPollen ? 'Is that pollen? I make a ration that helps silk set. This is between us and the ceiling.'
              : 'You again. Either the ceiling works slowly, or it has sent me the same answer twice.',
        options:[
          hasPollen
            ? {label:'Trade one pollen',response:'Silk ration. New webs last six seconds longer for the next 80 seconds.',reward:'food'}
            : {label:'Ask about silk food',response:'Bring me one pollen mote. I can put it to use without asking a supervisor.'},
          {label:'Ask about the prayer',response:visit===0
            ? 'I asked for quiet. I did not specify whether the flies should receive it voluntarily.'
            : 'Still quiet upstairs. Perhaps they have better insulation.'},
          {label:'Leave',response:'Go in peace. Quietly, if possible.'},
        ],
      };
    }
    case 'springtail':
      return {
        resident:'Hops',
        opening:town.rewards.highJump
          ? 'You remembered the launch. The landing is where I normally stop taking responsibility.'
          : visit===0 ? 'I teach jumping. The floor objects, but it has never managed to file a complaint.'
            : 'Back for the jump lesson? You are allowed to take the class from ground level.',
        options:[
          town.rewards.highJump
            ? {label:'Review the lesson',response:'L1 still jumps higher. Your legs keep the lesson for this run.'}
            : {label:'Learn the high jump',response:'Lift first, worry later. L1 now jumps higher for the rest of this run.',reward:'jump'},
          {label:'Ask about the big spiders',response:'They like food to queue. It keeps the problem at a convenient height.'},
          {label:'Leave',response:'See you on the way down.'},
        ],
      };
    case 'quartermaster':
      return {
        resident:'Tally',
        opening:value ? `Offer: ${value} coins. Common 4, rare 12. All sales final.`
          : 'Common flies pay four, rare ones twelve. Bring the merchandise.',
        options:[
          ...(value ? [{label:`Sell · ${value} coins`,response:'Paid in full. You kept a receipt, right?',reward:'sale' as const}] : []),
          {label:'Ask about rare prey',response:'Above the high shelves. They charge extra for stairs.'},
          {label:'Leave',response:'Take your time. I invoice by the fly.'},
        ],
      };
  }
}

export function interactTown(town:Town,target:TownTarget,clock:number,value=0) {
  if (target.kind==='pickup') {
    const item=town.items.find(candidate=>candidate.id===target.id);
    if (!item || item.collected) return 'Somebody got here first. I am willing to blame myself.';
    item.collected=true;
    town.inventory.pollen++;
    return town.items.filter(candidate=>candidate.collected).length===1
      ? 'Pollen. That smells like somebody else’s work.'
      : 'More pollen. At least one of us is collecting benefits.';
  }
  town.activeResident=target.id;
  town.dialogue=residentScene(town,target.id,clock,value);
  const lines=greetings[target.id];
  return lines[town.visits[target.id]++%lines.length];
}

export function chooseTownReply(town:Town,index:number,clock:number) {
  const choice=town.dialogue?.options[index];
  if (!choice) return;
  town.dialogue=undefined;
  if (choice.reward==='jump') town.rewards.highJump=true;
  if (choice.reward==='food' && town.inventory.pollen>0) {
    town.inventory.pollen--;
    town.rewards.foodUntil=clock+80;
  }
  return {text:choice.response,sell:choice.reward==='sale'};
}

export function closeTownDialogue(town:Town) {
  town.dialogue=undefined;
}

export const townJumpBonus=(town:Town)=>town.rewards.highJump ? 1.42 : 1;
export const townWebBonus=(town:Town,clock:number)=>clock<town.rewards.foodUntil ? 6 : 0;
