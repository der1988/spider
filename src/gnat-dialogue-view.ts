import {roomHeight,roomWidth} from './window-hunt';
import type {Point} from './spider';
import {dialogueFade,speakerNames,type CastState,type DialogueLine,type Speaker} from './gnat-dialogue';

const portraits:Record<Speaker,readonly [string,string][]>={
  spider:[
    ['#9eb77b','M4 5h8v1h2v6h-2v2H4v-2H2V6h2z'],
    ['#263a2d','M1 10h2v3H1zm12 0h2v3h-2zM6 8h1v2H6zm3 0h1v2H9z'],
    ['#f9e99d','M4 7h2v2H4zm6 0h2v2h-2z'],
  ],
  hunter:[
    ['#ae7751','M3 3h10v2h2v7h-3v2H4v-2H1V5h2z'],
    ['#ffce8c','M3 6h2v1h2v2H5V8H3zm8 0h2v2h-2v1H9V7h2zM5 11h2v3H5zm4 0h2v3H9z'],
  ],
  midge:[
    ['#a6cba1','M1 3h5v2h2v4H4V7H1zm9 0h5v4h-3v2H8V5h2z'],
    ['#6d884f','M5 7h6v7H5z'],
    ['#f1f9d7','M5 8h2v3H5zm4 0h2v3H9z'],
  ],
  dart:[
    ['#a4d2db','M1 4h6v3H4v2H1zm8 0h6v5h-3V7H9z'],
    ['#6e9e96','M4 7h8v4h-2v2H6v-2H4z'],
    ['#ecf9ef','M5 7h2v2H5zm4 0h2v2H9z'],
  ],
  pip:[
    ['#caabd7','M2 4h4v2h4V4h4v5h-3v1H5V9H2z'],
    ['#9d779e','M4 7h8v6h-2v1H6v-1H4z'],
    ['#fae4ce','M5 8h2v3H5zm4 0h2v3H9z'],
  ],
};

function portrait(speaker:Speaker) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 16 16');
  svg.setAttribute('shape-rendering','crispEdges');
  svg.setAttribute('aria-hidden','true');
  for (const [fill,shape] of portraits[speaker]) {
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('fill',fill);
    path.setAttribute('d',shape);
    svg.append(path);
  }
  return svg;
}

export function bindGnatDialogueView() {
  const panel=document.querySelector<HTMLElement>('#gnat-conversation')!;
  const castList=document.querySelector<HTMLUListElement>('#gnat-cast')!;
  const caption=document.querySelector<HTMLElement>('#gnat-caption')!;
  const canvas=document.querySelector<HTMLCanvasElement>('#world')!;
  let active:DialogueLine|undefined;
  let origin:Point={x:0,y:0},shown:Point={x:0,y:0};
  let viewportWidth=0,viewportHeight=0;
  const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
  const speakers=['spider','midge','dart','pip','hunter'] as const;
  const tiles=speakers.map(speaker=>{
    const tile=document.createElement('li');
    tile.dataset.speaker=speaker;
    const icon=document.createElement('span');
    icon.className='gnat-cast-icon';
    icon.append(portrait(speaker));
    const name=document.createElement('span');
    name.textContent=speakerNames[speaker];
    tile.append(icon,name);
    castList.append(tile);
    return tile;
  });

  return function render(cast:Record<Speaker,CastState>|undefined,line:DialogueLine|undefined,
    positions:Partial<Record<Speaker,Point>>,camera:Point,elapsed:number,
    afterReading:number,enabled:boolean,reduced:boolean) {
    panel.hidden=!cast;
    const speaker=line && positions[line.speaker];
    const visible=!!cast && enabled && !!line && !!speaker && afterReading<dialogueFade;
    caption.hidden=!visible;
    if (visible && line && speaker) {
      const width=canvas.clientWidth,height=canvas.clientHeight;
      const scale=Math.min(width/roomWidth,height/roomHeight);
      const sceneWidth=roomWidth*scale,sceneHeight=roomHeight*scale;
      const left=(width-sceneWidth)/2,top=(height-sceneHeight)/2;
      const inset=6;
      const fresh=line!==active || width!==viewportWidth || height!==viewportHeight;
      if (line!==active) {
        caption.textContent=line.text;
        caption.dataset.speaker=line.speaker;
        caption.setAttribute('aria-label',speakerNames[line.speaker]+': '+line.text);
      }
      if (fresh) {
        caption.style.setProperty('--caption-width',Math.floor(sceneWidth*.64)+'px');
        viewportWidth=width;
        viewportHeight=height;
      }
      const w=caption.offsetWidth,h=caption.offsetHeight;
      const bound=(p:Point)=>({
        x:clamp(p.x,left+inset,left+sceneWidth-w-inset),
        y:clamp(p.y,top+inset,top+sceneHeight-h-inset),
      });
      const project=(p:Point)=>({x:left+(p.x-camera.x)*scale,y:top+(p.y-camera.y)*scale});
      const actor=project(speaker);
      const gap=Math.max(16,20*scale);
      const obstacles=Object.values(positions).filter(p=>p!==undefined).map(project);
      const overlaps=(p:Point)=>obstacles.filter(body=>
        body.x>p.x-gap*.55 && body.x<p.x+w+gap*.55 &&
        body.y>p.y-gap*.6 && body.y<p.y+h+gap*.6).length;
      const candidates=[
        {x:actor.x-w/2,y:actor.y-gap-h},{x:actor.x-w/2,y:actor.y+gap},
        {x:actor.x+gap,y:actor.y-h/2},{x:actor.x-gap-w,y:actor.y-h/2},
      ];
      let target=bound(candidates[0]),best=Infinity;
      candidates.forEach((candidate,index)=>{
        const point=bound(candidate);
        const score=overlaps(point)*250+Math.abs(candidate.y-point.y)+Math.abs(candidate.x-point.x)*.22+
          index*8+(fresh ? 0 : Math.hypot(point.x-shown.x,point.y-shown.y)*.15);
        if (score<best) {best=score;target=point;}
      });
      if (fresh) {
        origin=shown=target;
      } else if (!reduced) {
        const distance=Math.hypot(target.x-origin.x,target.y-origin.y);
        const pull=Math.min(.48,.13+Math.max(0,distance-120)/420);
        const favored=bound({x:origin.x+(target.x-origin.x)*pull,y:origin.y+(target.y-origin.y)*pull});
        const destination=overlaps(favored) ? target : favored;
        const step=Math.min(.05,elapsed);
        const blend=1-Math.exp(-step/ .92);
        const dx=(destination.x-shown.x)*blend,dy=(destination.y-shown.y)*blend;
        const speedLimit=Math.min(1,30*step/(Math.hypot(dx,dy)||1));
        shown=bound({x:shown.x+dx*speedLimit,y:shown.y+dy*speedLimit});
      }
      caption.style.transform=`translate(${shown.x.toFixed(2)}px,${shown.y.toFixed(2)}px)`;
      caption.style.opacity=String(afterReading<0 || reduced ? 1 : clamp(1-afterReading/dialogueFade,0,1));
    }
    active=visible ? line : undefined;
    if (!cast) return;
    speakers.forEach((speaker,i)=>{
      const tile=tiles[i];
      const state=cast[speaker];
      if (tile.dataset.state!==state) {
        tile.dataset.state=state;
        tile.setAttribute('aria-label',`${speakerNames[speaker]}, ${state}`);
      }
      const speaking=state==='active' && visible && line?.speaker===speaker;
      if (tile.dataset.speaking!==String(speaking)) tile.dataset.speaking=String(speaking);
    });
  };
}
