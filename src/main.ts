import './style.css';
import {DEFAULT_TUNING,type Point} from './spider';
import {anchorCrawlerRope,castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,tickCrawler} from './crawler';
import {capStrands,createHunt,LIMIT,platforms,ROUND,spawn,tickHunt,WEB_SECONDS} from './hunt';
import {fixSilk,leaveSilk,WEB_KEY} from './threads';
import {renderHunt} from './hunt-render';
import {samplePlayStation,silkMotion} from './pad-controls';
import {Soundscape} from './soundscape';
import {Soundtrack} from './soundtrack';
import {beatAt, huntStart, loadTiming, lyricAt, openingShot} from './song-cues';
import {bindCalibration} from './song-calibration';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const context = get<HTMLCanvasElement>('world').getContext('2d',{alpha:false})!;
const message = get('message');
const levelLabel = get('level');
const timeLabel = get('time');
const clock = get('clock');
const clockMeter = get('clock-meter');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scoreLabel = get('score');
const strandsLabel = get('strands');
const sound = get<HTMLButtonElement>('sound');
const start = get<HTMLButtonElement>('start');
const pause = get<HTMLButtonElement>('pause');
const lyric = get('lyric');
const intro = 'Osserva i due corridoi. Spara da una superficie per tendere un filo. Salta prima di sparare per dondolare.';
const waiting = 'Collega il joypad PlayStation e premi un tasto.';
let audioOn = true;
try {
  audioOn = localStorage.getItem('tamago.audio')!=='off';
  localStorage.removeItem(WEB_KEY);
} catch { /* Storage may be unavailable. */ }
const audio = new Soundscape(audioOn);
const asset = document.querySelector<HTMLMetaElement>('meta[name=tamago-soundtrack]')!.content;
const musicBytes = fetch(asset).then(response => response.ok ? response.arrayBuffer() : undefined)
  .catch(() => undefined);
let timing = loadTiming();
const song = new Soundtrack(musicBytes,timing.loopStart);
const calibration = get<HTMLDialogElement>('calibration');
song.setMuted(!audioOn);
let contextAudio: AudioContext|undefined;
let requestedStart = false;
let opening = true;
let paused = false;

function requestStart() {
  requestedStart = true;
  contextAudio = audio.audioContext();
  if (audioOn) audio.unlock();
  song.prepare(contextAudio);
}
start.onclick = requestStart;

function syncPause() {
  const frozen = paused || calibration.open || document.hidden;
  song.setPaused(frozen);
  audio.setPaused(frozen);
  remainder = 0;
  pause.textContent = paused ? 'Riprendi' : 'Pausa';
  pause.setAttribute('aria-pressed',String(paused));
  if (!frozen && audioOn) audio.unlock();
}
function togglePause() {
  if (!song.started) return;
  paused = !paused;
  syncPause();
}
pause.onclick = togglePause;
bindCalibration(calibration,musicBytes,() => timing,next => {
  timing=next;
  song.setLoopStart(timing.loopStart);
},syncPause);
function syncAudio() {
  sound.textContent = audioOn ? 'Audio On' : 'Audio Off';
  sound.setAttribute('aria-pressed',String(audioOn));
}
sound.onclick = () => {
  audioOn=!audioOn;
  try {localStorage.setItem('tamago.audio',audioOn ? 'on' : 'off');} catch { /* Session preference. */ }
  audio.setEnabled(audioOn);
  song.setMuted(!audioOn);
  if (requestedStart) requestStart();
  syncAudio();
};
syncAudio();
window.addEventListener('keydown',event => {
  if (event.code==='Escape' && !event.repeat && !calibration.open) togglePause();
});
document.addEventListener('visibilitychange',syncPause);

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
    const before=hunt.strands.length;
    if (anchorCrawlerRope(spider,platforms,hunt.strands)) finishWebs(before);
    else if (spider.firstAnchor) say('Doppio filo. Dondoli sull’ultimo appiglio.');
  } else audio.play('miss',.06);
}
function finishWebs(before: number) {
  if (hunt.strands.length===before) return;
  for (const strand of hunt.strands.slice(before)) strand.expiresAt=hunt.clock+WEB_SECONDS;
  const evicted=capStrands(hunt);
  audio.play('fix');
  say(evicted ? 'Nuovo filo: il più vecchio si dissolve.' : 'Filo fissato. Avvicinati alla mosca per spingerla verso la rete.');
}

function step(dt: number,input: ReturnType<typeof samplePlayStation>) {
  const m=input.movement;
  const motion=silkMotion(m,down);
  down=motion.down;
  if (motion.detach && spider.rope) {
    const old=closeCrawlerRopes(spider);
    if (old) leaveSilk(hunt,old,DEFAULT_TUNING.range);
    audio.play('release');
  }
  const deadzone=.12;
  const axis=(n: number)=>Math.sign(n)*Math.max(0,(Math.abs(n)-deadzone)/(1-deadzone));
  const active=hunt.strands.filter(s=>(s.expiresAt??Infinity)>hunt.clock+dt);
  tickCrawler(spider,platforms,{x:axis(m.x),y:axis(m.y)},motion.reel,dt,active);
  const before=hunt.strands.length;
  anchorCrawlerRope(spider,platforms,hunt.strands);
  fixSilk(hunt,spider,platforms);
  finishWebs(before);
  const result=tickHunt(hunt,spider,dt);
  if(result==='catch') {
    audio.play('catch');
    say('Livello '+hunt.score+' · Mosca catturata!');
  } else if(result==='new') {
    say('Livello '+(hunt.score+1)+' · Nuova mosca, 60 secondi e arena pulita.');
  } else if(result==='over') {
    say('Tempo scaduto al livello '+(hunt.score+1)+' · '+hunt.score+' catture. Premi × per ricominciare.');
    audio.play('miss');
  }
  return result==='over';
}

let crossHeld=false;
let optionsHeld=false;
function frame(time: number) {
  const elapsed=Math.min(.05,(time-(lastFrame||time))/1000);
  lastFrame=time;
  const gamepad=pad();
  let input: ReturnType<typeof samplePlayStation>|undefined;
  let retry=false;
  if (gamepad) {
    const cross=!!gamepad.buttons[0]?.pressed;
    const options=!!gamepad.buttons[9]?.pressed;
    if (activePad!==gamepad.index) {
      activePad=gamepad.index;
      previous=undefined;
      crossHeld=cross;
      optionsHeld=options;
      if (!requestedStart) requestStart();
      if (song.started && !opening) say(hunt.phase==='over' ? 'Premi × per ricominciare.' : intro);
    }
    input=samplePlayStation(gamepad,previous);
    previous=input.shoulders;
    retry=cross && !crossHeld;
    if (options && !optionsHeld && !calibration.open) togglePause();
    crossHeld=cross;
    optionsHeld=options;
  } else {
    if (activePad!==undefined && !opening && hunt.phase!=='over') say(waiting);
    previous=undefined;
    activePad=undefined;
    remainder=0;
    down=false;
  }

  if (requestedStart && !song.started && !calibration.open) {
    if (!audioOn || song.failed || song.canPlay(contextAudio)) {
      song.start();
      start.hidden=true;
      pause.disabled=false;
      say(song.failed ? 'Brano non disponibile. L’introduzione continua con i sottotitoli.' : 'Introduzione');
    } else if (contextAudio?.state!=='running') {
      say('Seleziona Avvia per attivare la musica.');
    } else {
      say('Caricamento della colonna sonora…');
    }
  }
  song.connect(contextAudio);
  const position = song.time;
  if (opening && song.started && position>=huntStart(timing)) {
    opening=false;
    say(gamepad ? intro : waiting);
  }

  if (input && !opening && !paused && !calibration.open && !document.hidden) {
    if (input.aim) aimDirection=input.aim;
    if (hunt.phase==='over' && retry) {
      hunt=createHunt();
      spider=createCrawler(spawn,platforms);
      down=false;
      say(intro);
    }
    if (hunt.phase!=='over') {
      if (input.jump && jumpCrawler(spider)) audio.play('jump');
      if (input.fire) shootSilk();
      remainder+=elapsed;
      while (remainder>=1/120) {
        remainder-=1/120;
        if (step(1/120,input)) { remainder=0; break; }
      }
    }
  }

  if (time-lastSound>65) {
    lastSound=time;
    const d=input && !opening && hunt.phase==='hunting' ?
      Math.hypot(spider.x-hunt.fly.p.x,spider.y-hunt.fly.p.y) : Infinity;
    audio.nearby(d,time);
  }
  const caption=song.started ? lyricAt(position,timing) : '';
  if (lyric.textContent!==caption) lyric.textContent=caption;
  const seconds=Math.ceil(hunt.time);
  const level=hunt.score+Number(hunt.phase!=='caught');
  const labels = [[levelLabel,'Livello '+level],[timeLabel,seconds+' s'],[scoreLabel,hunt.score+(hunt.score===1 ? ' cattura' : ' catture')],
    [strandsLabel,hunt.strands.length+' / '+LIMIT+' fili']] as const;
  for (const [element,text] of labels) if (element.textContent!==text) element.textContent=text;
  const beat = reduceMotion.matches ? 0 : beatAt(position);
  const pulse = beat.toFixed(2);
  if (clock.style.getPropertyValue('--pulse')!==pulse) clock.style.setProperty('--pulse',pulse);
  const phase = opening ? 'ready' : hunt.phase==='caught' ? 'running' :
    seconds<=5 ? 'urgent' : hunt.time<20 ? 'low' : 'running';
  if (clock.dataset.phase!==phase) clock.dataset.phase=phase;
  const remaining = (hunt.time/ROUND).toFixed(3);
  if (clockMeter.style.getPropertyValue('--remaining')!==remaining) clockMeter.style.setProperty('--remaining',remaining);
  renderHunt(context,hunt,spider,aimDirection,{
    time:position, beat, shot:opening && song.started ? openingShot(position,timing) : undefined,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if(import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
