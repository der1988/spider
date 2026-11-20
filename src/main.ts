import './style.css';
import type {Point} from './spider';
import {castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,tickCrawler} from './crawler';
import {capStrands,createHunt,LIMIT,platforms,spawn,tickHunt,WEB_SECONDS} from './hunt';
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
const intro = 'Osserva i due corridoi. Aggancia una piattaforma e staccati vicino a una seconda superficie per tendere un filo.';
const waiting = 'Collega il joypad PlayStation e premi un tasto.';
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
let spider = createCrawler(spawn,platforms);
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
  audio.play('launch');
  if (castCrawler(spider,platforms,worldAim())) {
    audio.play('attach',.06);
    if (spider.firstAnchor) say('Doppio filo. Dondoli sull’ultimo appiglio.');
  } else audio.play('miss',.06);
}
function step(dt: number,input: ReturnType<typeof samplePlayStation>) {
  const m=input.movement;
  const motion=silkMotion(m,down);
  down=motion.down;
  if (motion.detach && spider.rope) {
    const old=closeCrawlerRopes(spider);
    if (old) leaveSilk(hunt,old,155);
    audio.play('release');
  }
  const deadzone=.12;
  const axis=(n: number)=>Math.sign(n)*Math.max(0,(Math.abs(n)-deadzone)/(1-deadzone));
  const active=hunt.strands.filter(s=>(s.expiresAt??Infinity)>hunt.clock+dt);
  tickCrawler(spider,platforms,{x:axis(m.x),y:axis(m.y)},motion.reel,dt,active);
  const before=hunt.strands.length;
  if(fixSilk(hunt,spider,platforms)) {
    for (const strand of hunt.strands.slice(before)) strand.expiresAt=hunt.clock+WEB_SECONDS;
    const evicted=capStrands(hunt);
    audio.play('fix');
    say(evicted ? 'Nuovo filo: il più vecchio si dissolve.' : 'Filo fissato. Avvicinati alla mosca per spingerla verso la rete.');
  }
  const result=tickHunt(hunt,spider,dt);
  if(result==='catch') {
    audio.play('catch');
    say('Mosca catturata!');
  } else if(result==='new') {
    audio.resetMusic();
    say('Nuova mosca, 60 secondi e arena pulita.');
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
      spider=createCrawler(spawn,platforms);
      down=false;
      audio.resetMusic();
      say(intro);
    }
    crossHeld=cross;
    if(hunt.phase!=='over') {
      if(input.jump && jumpCrawler(spider)) audio.play('jump');
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
  renderHunt(context,hunt,spider,aimDirection);
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>audio.setPaused(document.hidden));
requestAnimationFrame(frame);
if(import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
