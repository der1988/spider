import {SPIDER_HALF_HEIGHT,type Rect} from './spider.ts';

export const arcadeWidth=400,arcadeHeight=224;

type Form='leaf'|'bloom'|'branch'|'reed'|'mushroom'|'stone';
export type Perch=Rect&{form:Form;rise?:number};
type Scene={
  name:string;base:string;ink:string;light:string;accent:string;
  skyline:Form;landing:Perch;perches:Perch[];
};
const at=(form:Form,x:number,y:number,w:number,h=7,rise?:number):Perch=>({form,x,y,w,h,rise,grip:true});

export function perchParts(perch:Perch):Rect[] {
  const {x,y,w,h,form,rise=0}=perch;
  const part=(x:number,y:number,w:number,h:number):Rect=>({x,y,w,h,grip:true});
  if (rise) {
    // Staggered, overlapping bands make the incline physically climbable.
    const bands=5;
    return Array.from({length:bands},(_,i)=>{
      const left=Math.floor(w*i/bands),right=Math.floor(w*(i+1)/bands);
      const top=y+Math.round(rise*(i/(bands-1)-.5));
      const taper=Math.abs(i-2);
      return part(x+left,top,right-left,h+4-taper);
    });
  }
  if (form==='bloom' || form==='mushroom') {
    const shoulder=Math.round(w*.13);
    return [
      part(x+shoulder,y,w-2*shoulder,h+4),
      part(x,y+3,shoulder,h-3),
      part(x+w-shoulder,y+3,shoulder,h-3),
      part(x+2*shoulder,y-4,w-4*shoulder,4),
    ];
  }
  if (h>w) {
    return [part(x+2,y,w-4,h),part(x,y+Math.floor(h*.22),2,Math.floor(h*.46)),
      part(x+w-2,y+Math.floor(h*.42),2,Math.floor(h*.38))];
  }
  return [part(x,y,w,h),part(x+5,y+h,w-10,4),part(x+11,y+h+4,w-22,3)];
}

// The silhouettes double as physical perches. Leave open flight routes between their ends.
export const arcadeScenes:readonly Scene[]=[
  {name:'Clover Bank',base:'#b7ce98',ink:'#283c2d',light:'#f2efbc',accent:'#78934e',skyline:'leaf',landing:at('branch',27,217,53),perches:[
    at('branch',111,209,57,8),at('stone',184,215,67,9),at('branch',290,207,61,8),
    at('leaf',70,56,53),at('leaf',259,61,54,8,-12),at('leaf',135,102,80,8),at('leaf',286,147,41,8,14),at('reed',8,174,16,43),
  ]},
  {name:'Poppy Crossing',base:'#dfbd9d',ink:'#503135',light:'#fff1c5',accent:'#bf6b65',skyline:'bloom',landing:at('leaf',20,211,73),perches:[
    at('stone',144,214,51,9),at('branch',251,208,44,7),
    at('bloom',60,73,38),at('bloom',167,44,43,9),at('bloom',260,88,45),at('leaf',109,125,31,7,12),
    at('leaf',214,148,39),at('leaf',306,171,27,7,-12),at('reed',28,186,14,31),
  ]},
  {name:'The Reedbed',base:'#a9c6b5',ink:'#263f43',light:'#e3f5cb',accent:'#628d79',skyline:'reed',landing:at('branch',59,209,45),perches:[
    at('leaf',147,199,39,8,14),at('stone',240,203,45,9),
    at('reed',28,77,12,140),at('reed',113,146,11,71),at('reed',345,99,12,118),
    at('leaf',43,92,48),at('leaf',130,58,42),at('leaf',224,113,71,8,15),at('leaf',278,166,61,8,-14),
  ]},
  {name:'Fern Stair',base:'#9bc2a6',ink:'#20483d',light:'#d9f6c9',accent:'#548f63',skyline:'leaf',landing:at('stone',24,215,76),perches:[
    at('branch',166,204,57,8),at('leaf',276,182,43,8,-13),
    at('leaf',47,169,48),at('leaf',114,132,45,8,-13),at('leaf',169,98,35),at('leaf',216,65,38,7,-12),
    at('leaf',287,40,50),at('branch',279,129,69,9),at('leaf',343,175,39),
  ]},
  {name:'Toadstool Ring',base:'#c8afc0',ink:'#4a314b',light:'#ffe3cb',accent:'#a26a87',skyline:'mushroom',landing:at('branch',6,215,51),perches:[
    at('leaf',104,201,44,8,11),at('branch',310,201,51,7),
    at('mushroom',42,153,52,10),at('mushroom',127,84,54,10),at('mushroom',235,128,49,10),
    at('mushroom',308,74,52,10),at('reed',63,163,10,54),at('reed',260,138,9,79),at('stone',192,188,26,29),
  ]},
  {name:'Dewfall',base:'#a1bacd',ink:'#2d405f',light:'#defff0',accent:'#6197ad',skyline:'reed',landing:at('branch',27,217,42),perches:[
    at('leaf',250,203,49,8,-11),
    at('stone',74,179,30,38),at('stone',110,145,36,15),at('stone',163,114,29,13),at('stone',212,81,43,12),
    at('stone',281,55,42,13),at('leaf',283,147,44,8,14),at('stone',357,181,43,36),
  ]},
  {name:'Birch Fork',base:'#c5c9a6',ink:'#43442d',light:'#fff3c3',accent:'#8c9163',skyline:'branch',landing:at('leaf',54,204,57),perches:[
    at('stone',152,205,51,9),at('branch',233,197,44,8),
    at('branch',26,104,16,113),at('branch',42,113,58,9),at('branch',93,65,38,9),at('branch',155,45,64,9),
    at('branch',268,91,76,8),at('branch',345,91,14,126),at('leaf',210,147,38,8,-15),at('branch',280,178,59,9),
  ]},
  {name:'Rose Thicket',base:'#d1aaba',ink:'#53324c',light:'#ffe2ca',accent:'#a35d7d',skyline:'bloom',landing:at('branch',15,211,59),perches:[
    at('leaf',131,201,36,7,10),at('stone',325,208,48,8),
    at('bloom',51,111,42,9),at('bloom',157,66,38,10),at('bloom',274,52,49,10),at('bloom',319,153,42,10),
    at('branch',72,120,9,97),at('leaf',108,171,32,7,14),at('leaf',218,108,35,8,-16),at('leaf',239,180,35),
  ]},
  {name:'Autumn Tangle',base:'#dbb28c',ink:'#553a30',light:'#fff0b9',accent:'#b8774b',skyline:'branch',landing:at('stone',25,211,65),perches:[
    at('branch',196,206,58,8),at('leaf',319,201,38,8,-13),
    at('branch',26,91,66,9),at('leaf',68,162,34,7,-12),at('branch',128,126,47,10),at('leaf',159,48,31,7,12),
    at('branch',224,88,43,10),at('leaf',272,172,31,7,-14),at('branch',299,122,66,9),at('branch',365,122,13,95),
  ]},
  {name:'Moonflower',base:'#a8aecb',ink:'#303956',light:'#f9f0d1',accent:'#7b7da8',skyline:'bloom',landing:at('branch',39,212,78),perches:[
    at('branch',155,209,89,9),at('branch',283,215,85,9),
    at('bloom',39,103,80,10),at('bloom',157,63,86,10),at('bloom',269,101,91,10),
    at('leaf',87,151,50,8,-14),at('leaf',260,147,40,8,13),at('reed',22,174,14,43),at('reed',375,162,14,55),
  ]},
];

export const arcadeLayouts=arcadeScenes.map(({landing,perches})=>[landing,...perches].flatMap(perchParts));
export const arcadeSpawns=arcadeScenes.map(({landing})=>({
  x:landing.x+Math.floor(landing.w/2),y:landing.y-SPIDER_HALF_HEIGHT,
}));
