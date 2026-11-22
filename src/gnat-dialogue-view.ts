import {roomHeight,roomWidth} from './window-hunt';
import type {Point} from './spider';
import {dialogueFade,speakerNames,type DialogueLine,type Speaker} from './gnat-dialogue';

export function bindGnatDialogueView() {
  const caption=document.querySelector<HTMLElement>('#gnat-caption')!;
  const canvas=document.querySelector<HTMLCanvasElement>('#world')!;
  let active:DialogueLine|undefined;
  let origin:Point={x:0,y:0},shown:Point={x:0,y:0};
  let viewportWidth=0,viewportHeight=0;
  const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
  return function render(openWorld:boolean|undefined,line:DialogueLine|undefined,
    positions:Partial<Record<Speaker,Point>>,camera:Point,elapsed:number,
    afterReading:number,enabled:boolean,reduced:boolean) {
    const speaker=line && positions[line.speaker];
    const visible=!!openWorld && enabled && !!line && !!speaker && afterReading<dialogueFade;
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
  };
}
