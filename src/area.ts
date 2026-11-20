import type {Point, Rect, WalkLine} from './spider.ts';

export interface Area {
  surfaces: Array<Rect & {kind:'earth'|'twig'|'leaf'|'root'}>;
  ramps: WalkLine[];
  discovery: Point;
  bridgeDiscovery: Point;
  spawn: Point;
  checkpoints: Point[];
  bounds: {left:number; right:number; bottom:number};
  finish: Point;
}

export const area: Area = {
  spawn: {x:39,y:143},
  bounds: {left:-144,right:576,bottom:240},
  ramps: [{from:{x:-117,y:166},to:{x:-65,y:151}}],
  checkpoints: [
    {x:129,y:156},
    {x:172,y:105},
    {x:285,y:158},
  ],
  discovery: {x:449,y:1},
  bridgeDiscovery: {x:308,y:55},
  finish: {x:483,y:158},
  surfaces: [
    // The rametto is the only support above the first gap.
    {x:-144,y:166,w:79,h:95,kind:'earth'},
    {x:-65,y:151,w:121,h:110,kind:'earth',bridge:true},
    {x:64,y:76,w:29,h:8,kind:'twig',grip:true},
    {x:101,y:164,w:52,h:8,kind:'leaf'},
    {x:106,y:172,w:46,h:89,kind:'earth'},

    // The next branch is left of the root face so the player can climb beside it.
    {x:130,y:61,w:28,h:8,kind:'twig',grip:true},
    {x:146,y:113,w:63,h:148,kind:'root'},
    {x:209,y:166,w:367,h:95,kind:'earth'},

    // The elevated landing is beyond a normal cast from the marked starting ledge.
    {x:274,y:67,w:58,h:8,kind:'leaf',bridge:true},

    // Optional high route: transfer from the first grip to the distant canopy.
    {x:232,y:43,w:28,h:8,kind:'twig',grip:true},
    {x:381,y:-34,w:36,h:8,kind:'twig',grip:true},
    {x:428,y:16,w:55,h:8,kind:'leaf'},
  ],
};

export const loopWidth = area.bounds.right-area.bounds.left;
export const loopShift = (x: number) => Math.floor((x-area.bounds.left)/loopWidth)*loopWidth;

export function visibleCopies(left: number, right: number) {
  const first = loopShift(left);
  const offsets: number[] = [];
  for (let offset=first; offset<=right-area.bounds.left; offset+=loopWidth) offsets.push(offset);
  return offsets;
}

// The neighboring sections supply solid ground when the spider straddles the join.
export const loopSurfaces = [-loopWidth,0,loopWidth].flatMap(offset =>
  area.surfaces.map(surface => ({...surface,x:surface.x+offset})));
