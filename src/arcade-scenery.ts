import {SPIDER_HALF_HEIGHT,type Rect} from './spider.ts';

export const arcadeWidth=400,arcadeHeight=224,arcadeRim=8;
type Form='leaf'|'bloom'|'branch'|'reed'|'mushroom'|'stone';
export type Perch=Rect&{form:Form};
type Scene={
  name:string;base:string;ink:string;light:string;accent:string;
  skyline:Form;landing:Perch;perches:Perch[];
};
const at=(form:Form,x:number,y:number,w:number,h=8):Perch=>({form,x,y,w,h,grip:true});
const rivalPerch=at('branch',285,215,87,9);
const rivalScale=2;
const rivalFeet=7*rivalScale;

export const arcadeFrame=[
  at('branch',0,0,arcadeWidth,arcadeRim),
  at('branch',0,arcadeRim,arcadeRim,arcadeHeight-arcadeRim),
  at('branch',arcadeWidth-arcadeRim,arcadeRim,arcadeRim,arcadeHeight-arcadeRim),
];

// Each landing leads into a different route. The gaps beneath the stage stay open.
export const arcadeScenes:readonly Scene[]=[
  {name:'Clover Bank',base:'#b7ce98',ink:'#283c2d',light:'#f2efbc',accent:'#78934e',skyline:'leaf',landing:at('branch',27,217,53),perches:[
    at('leaf',135,102,80),at('leaf',69,64,57),at('leaf',287,146,62),
  ]},
  {name:'Poppy Crossing',base:'#dfbd9d',ink:'#503135',light:'#fff1c5',accent:'#bf6b65',skyline:'bloom',landing:at('leaf',20,211,73),perches:[
    at('bloom',117,127,55,10),at('bloom',251,71,76,10),at('leaf',312,181,57),
  ]},
  {name:'The Reedbed',base:'#a9c6b5',ink:'#263f43',light:'#e3f5cb',accent:'#628d79',skyline:'reed',landing:at('branch',59,209,45),perches:[
    at('reed',121,109,12,70),at('leaf',191,144,74),at('leaf',286,72,57),
  ]},
  {name:'Fern Stair',base:'#9bc2a6',ink:'#20483d',light:'#d9f6c9',accent:'#548f63',skyline:'leaf',landing:at('stone',24,215,76),perches:[
    at('leaf',95,161,49),at('leaf',177,109,53),at('leaf',275,57,65),
  ]},
  {name:'Toadstool Ring',base:'#c8afc0',ink:'#4a314b',light:'#ffe3cb',accent:'#a26a87',skyline:'mushroom',landing:at('branch',20,215,51),perches:[
    at('mushroom',53,128,70,11),at('mushroom',172,75,64,11),at('mushroom',284,146,73,11),
  ]},
  {name:'Dewfall',base:'#a1bacd',ink:'#2d405f',light:'#defff0',accent:'#6197ad',skyline:'reed',landing:at('branch',23,217,46),perches:[
    at('stone',74,179,30,36),at('leaf',149,107,72),at('leaf',273,152,61),
  ]},
  {name:'Birch Fork',base:'#c5c9a6',ink:'#43442d',light:'#fff3c3',accent:'#8c9163',skyline:'branch',landing:at('leaf',54,204,57),perches:[
    at('branch',87,96,60,10),at('branch',222,81,15,75),at('branch',286,139,62,10),
  ]},
  {name:'Rose Thicket',base:'#d1aaba',ink:'#53324c',light:'#ffe2ca',accent:'#a35d7d',skyline:'bloom',landing:at('branch',16,211,58),perches:[
    at('bloom',105,151,61,10),at('branch',194,68,11,67),at('bloom',264,108,69,10),
  ]},
  {name:'Autumn Tangle',base:'#dbb28c',ink:'#553a30',light:'#fff0b9',accent:'#b8774b',skyline:'branch',landing:at('stone',25,211,65),perches:[
    at('branch',107,119,65,10),at('leaf',215,160,61),at('branch',300,77,54,10),
  ]},
  {name:'Moonflower',base:'#a8aecb',ink:'#303956',light:'#f9f0d1',accent:'#7b7da8',skyline:'bloom',landing:at('branch',39,212,78),perches:[
    at('bloom',123,112,58,10),at('bloom',237,84,64,10),rivalPerch,
  ]},
];

export const arcadeRivalStage={
  perch:rivalPerch,
  scale:rivalScale,
  halfWidth:9*rivalScale,
  head:9*rivalScale,
  feet:rivalFeet,
  contactRadius:6*rivalScale,
  start:{x:rivalPerch.x+Math.floor(rivalPerch.w/2),y:rivalPerch.y-rivalFeet},
};

export const arcadeLayouts=arcadeScenes.map(({landing,perches})=>[...arcadeFrame,landing,...perches]);
export const arcadeSpawns=arcadeScenes.map(({landing})=>({
  x:landing.x+Math.floor(landing.w/2),y:landing.y-SPIDER_HALF_HEIGHT,
}));
