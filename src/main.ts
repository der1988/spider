import './style.css';
import {aimHit,createSpider,detach,queueJump,shoot,tickSpider,type Point} from './spider';
import {capStrands,createHunt,HEIGHT,LIMIT,solids,spawn,tickHunt,walkableSilk,WIDTH} from './hunt';
import {fixSilk,leaveSilk,WEB_KEY} from './threads';
import {renderHunt} from './hunt-render';
import {samplePlayStation,silkMotion} from './pad-controls';
import {Soundscape} from './soundscape';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const context = get<HTMLCanvasElement>('world').getContext('2d',{alpha:false})!;
const message = get('message');
const timeLabel = get('time');
const scoreLabel = get('score');
const strandsLabel = get('strands');
const sound = get<HTMLButtonElement>('sound');
const jump = get<HTMLInputElement>('jump');
const intro = 'Osserva i due corridoi. Aggancia una piattaforma e staccati vicino a una seconda superficie per tendere un filo.';
const waiting = 'Collega il joypad PlayStation e premi un tasto.';
const walls = solids.concat({x:-WIDTH,y:-10,w:3*WIDTH,h:10});
let audioOn = true;
try {
  audioOn = localStorage.getItem('tamago.audio')!=='off';
  localStorage.removeItem(WEB_KEY);
} catch { /* Storage may be unavailable. */ }
const audio = new Soundscape(audioOn);
function syncAudio() {
  sound.textContent = audioOn ? 'Audio On' : 'Audio Off';
  sound.setAttribute('aria-pressed',String(audioOn));
}
sound.onclick = () => {
  audioOn=!audioOn;
  try {localStorage.setItem('tamago.audio',audioOn ? 'on' : 'off');} catch { /* Session preference. */ }
  audio.setEnabled(audioOn);
  syncAudio();
};
syncAudio();
window.addEventListener('pointerdown',event => {
  if(event.target!==sound) audio.unlock();
},{capture:true});

let hunt = createHunt();
let floors = walkableSilk(hunt.strands);
let spider = createSpider(spawn);
let aimDirection: Point = {x:.56,y:-.828};
let previous: ReturnType<typeof samplePlayStation>['shoulders']|undefined;
let activePad: number|undefined;
let supportsPads = typeof navigator.getGamepads==='function';
let down = false;
let lastFrame=0;
let remainder=0;
let lastSound=0;
function say(text: string) { if(message.textContent!==text) message.textContent=text; }
const worldAim = () => ({x:spider.x+aimDirection.x*70,y:spider.y+aimDirection.y*70});

function pad() {
  if (!supportsPads || document.hidden) return;
  try {
    const pads=Array.from(navigator.getGamepads());
    return pads.find(p=>p && p.connected && p.mapping==='standard' && p.index===activePad) ??
      pads.find(p=>p?.connected && p.mapping==='standard');
  } catch {
    supportsPads=false;
  }
}

function shootSilk() {
  const old=spider.rope;
  audio.play('launch');
  if (shoot(spider,walls,worldAim())) {
    if(old) leaveSilk(hunt,old,155);
    audio.play('attach',.06);
  } else audio.play('miss',.06);
}
function step(dt: number,input: ReturnType<typeof samplePlayStation>) {
  const {movement:m,shoulders}=input;
  const motion=silkMotion(m,down);
  down=motion.down;
  if (motion.detach && spider.rope) {
    leaveSilk(hunt,spider.rope,155);
    detach(spider);
    audio.play('release');
  }
  const deadzone=.12;
  const move=Math.sign(m.x)*Math.max(0,(Math.abs(m.x)-deadzone)/(1-deadzone));
  if (tickSpider(spider,walls,{move,reel:motion.reel,jumpHeld:shoulders.l1},dt,{jumpSpeed:Number(jump.value)},floors)) audio.play('jump');
  const offset=Math.floor(spider.x/WIDTH)*WIDTH;
  if (offset) {
    spider.x-=offset;
    if (spider.rope) spider.rope.x-=offset;
    for(const end of hunt.loose) end.from.x-=offset;
  }
  if (spider.y>HEIGHT+30) {
    spider=createSpider(spawn);
    hunt.loose.length=0;
  }
  if(fixSilk(hunt,spider,walls)) {
    const evicted=capStrands(hunt);
    floors=walkableSilk(hunt.strands);
    audio.play('fix');
    say(evicted ? 'Nuovo filo: il più vecchio si dissolve.' : 'Filo fissato. Avvicinati alla mosca per spingerla verso la rete.');
  }
  const result=tickHunt(hunt,spider,dt);
  if(result==='catch') {
    audio.play('catch');
    say('Mosca catturata!');
  } else if(result==='new') {
    audio.resetMusic();
    say('Una nuova mosca entra. Le tele restano.');
  } else if(result==='over') {
    say('Tempo scaduto · '+hunt.score+' catture. Premi × per ricominciare.');
    audio.play('miss');
  }
  return result==='over';
}

let crossHeld=false;
function frame(time: number) {
  const elapsed=Math.min(.05,(time-(lastFrame||time))/1000);
  lastFrame=time;
  const gamepad=pad();
  if (gamepad) {
    const cross=!!gamepad.buttons[0]?.pressed;
    if(activePad!==gamepad.index) {
      activePad=gamepad.index;
      previous=undefined;
      crossHeld=cross;
      say(hunt.phase==='over' ? 'Premi × per ricominciare.' : intro);
    }
    const input=samplePlayStation(gamepad,previous);
    previous=input.shoulders;
    if(input.aim) aimDirection=input.aim;
    if(hunt.phase==='over' && cross && !crossHeld) {
      hunt=createHunt();
      floors=walkableSilk(hunt.strands);
      spider=createSpider(spawn);
      down=false;
      audio.resetMusic();
      say(intro);
    }
    crossHeld=cross;
    if(hunt.phase!=='over') {
      if(input.jump) queueJump(spider);
      if(input.fire) shootSilk();
      remainder+=elapsed;
      while(remainder>=1/120) {
        remainder-=1/120;
        if (step(1/120,input)) { remainder=0; break; }
      }
    }
    if(time-lastSound>65) {
      lastSound=time;
      const d=hunt.phase==='hunting' ? Math.hypot(spider.x-hunt.fly.p.x,spider.y-hunt.fly.p.y) : Infinity;
      audio.nearby(d,time);
      if(hunt.phase==='hunting') audio.music(hunt.time);
    }
  } else {
    if(activePad!==undefined) {
      say(waiting);
      audio.nearby(Infinity,time);
      spider.jumpBuffer=0;
    }
    previous=undefined;
    activePad=undefined;
    remainder=0;
    down=false;
  }
  const seconds=Math.ceil(hunt.time);
  const labels = [[timeLabel,seconds+' s'],[scoreLabel,hunt.score+(hunt.score===1 ? ' cattura' : ' catture')],
    [strandsLabel,hunt.strands.length+' / '+LIMIT+' fili']] as const;
  for (const [element,text] of labels) if (element.textContent!==text) element.textContent=text;
  timeLabel.dataset.urgent=String(seconds<=5 && hunt.phase!=='caught');
  renderHunt(context,hunt,spider,worldAim(),aimHit(spider,walls,worldAim()));
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>audio.setPaused(document.hidden));
requestAnimationFrame(frame);
if(import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
