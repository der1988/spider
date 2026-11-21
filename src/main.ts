import './style.css';
import {DEFAULT_TUNING,type Point} from './spider';
import {anchorCrawlerRope,castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,tickCrawler} from './crawler';
import {capStrands,createHunt,LIMIT,platforms,spawn,tickHunt,WEB_SECONDS} from './hunt';
import {fixSilk,leaveSilk,WEB_KEY} from './threads';
import {renderHunt} from './hunt-render';
import {samplePlayStation,silkMotion} from './pad-controls';
import {Soundscape} from './soundscape';
import {Soundtrack} from './soundtrack';
import {beatAt, huntStart, loadTiming, lyricAt, openingShot} from './song-cues';
import {difficultyChanges} from './difficulty';
import {bindLeaderboard,newRunId} from './leaderboard';
import {createFlyEscape,finishFlyEscape,FLY_SECONDS,stepFlyEscape,type FlyEscape} from './fly-escape';
import {renderFlyEscape,type FlyEscapeFrame} from './fly-escape-render';
import {flyCues,flyDuration,flyFinalStart} from './fly-song-timing';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const context = get<HTMLCanvasElement>('world').getContext('2d',{alpha:false})!;
const message = get('message');
const levelLabel = get('level');
const timeLabel = get('time');
const clock = get('clock');
const clockMeter = get('clock-meter');
const roundLabel = get('round-time');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scoreLabel = get('score');
const strandsLabel = get('strands');
const sound = get<HTMLButtonElement>('sound');
const start = get<HTMLButtonElement>('start');
const startStatus = get('start-status');
const shell = get('shell');
const pause = get<HTMLButtonElement>('pause');
const lyric = get('lyric');
const endingCode = get('ending-code');
const flyControls = get('fly-controls');
const intro = 'Shoot from a surface to place a web. Jump before shooting to swing.';
const waiting = 'Connect your PlayStation controller and press a button.';
let audioOn = true;
try {
  audioOn = localStorage.getItem('tamago.audio')!=='off';
  localStorage.removeItem(WEB_KEY);
} catch { /* Storage may be unavailable. */ }
const audio = new Soundscape(audioOn);
function fetchTrack(name: string) {
  const url=document.querySelector<HTMLMetaElement>('meta[name="'+name+'"]')!.content;
  return fetch(url).then(response=>response.ok ? response.arrayBuffer() : undefined).catch(()=>undefined);
}
const timing = loadTiming();
const song = new Soundtrack([
  fetchTrack('tamago-soundtrack'),fetchTrack('tamago-upgrade'),fetchTrack('tamago-room'),
],timing.loopStart,fetchTrack('tamago-fly'));
const leaderboard = bindLeaderboard();
song.setMuted(!audioOn);
let contextAudio: AudioContext|undefined;
let requestedStart = false;
let opening = true;
let paused = false;
let escape: FlyEscape|undefined;
let spaceHeld = false;

function requestStart() {
  requestedStart = true;
  contextAudio = audio.audioContext();
  if (audioOn) audio.unlock();
  song.prepare(contextAudio);
}
start.onclick = requestStart;

function syncPause() {
  const frozen = paused || document.hidden || (escape!==undefined && song.position.time>=flyDuration);
  song.setPaused(frozen);
  audio.setPaused(frozen);
  remainder = 0;
  pause.textContent = paused ? 'Resume' : 'Pause';
  pause.setAttribute('aria-pressed',String(paused));
  if (!frozen && audioOn) audio.unlock();
}
function togglePause() {
  if (!song.started || (escape && song.position.time>=flyDuration)) return;
  paused = !paused;
  syncPause();
}
pause.onclick = togglePause;
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
  if (event.code==='Escape' && !event.repeat && !leaderboard.open) togglePause();
  if (event.code!=='Space') return;
  const freshPress=!spaceHeld && !event.repeat;
  spaceHeld=true;
  if (!song.started || opening || leaderboard.open || hunt.phase==='over') return;
  event.preventDefault();
  if (!freshPress || escape || song.position.track!=='room') return;
  escape=createFlyEscape(spider,hunt.fly.p);
  shell.dataset.flyPhase='intro';
  get('hunt-controls').hidden=true;
  get('show-board').hidden=true;
  flyControls.hidden=true;
  paused=false;
  syncPause();
  song.enterFly(contextAudio);
  say('');
});
window.addEventListener('keyup',event => {
  if (event.code==='Space') spaceHeld=false;
});
window.addEventListener('blur',()=>{ spaceHeld=false; });
document.addEventListener('visibilitychange',syncPause);

let hunt = createHunt();
let runId = newRunId();
let difficultyNotice: {text:string; until:number}|undefined;
let spider = createCrawler(spawn,platforms);
let aimDirection: Point = {x:.56,y:-.828};
let previous: ReturnType<typeof samplePlayStation>['shoulders']|undefined;
let activePad: number|undefined;
let supportsPads = typeof navigator.getGamepads==='function';
let down = false;
let lastFrame=0;
let remainder=0;
let lastSound=0;
const catchesText = (count: number) => count+(count===1 ? ' catch' : ' catches');
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
    else if (spider.firstAnchor) say('Double tether. Swinging from the latest anchor.');
  } else audio.play('miss',.06);
}
function finishWebs(before: number) {
  if (hunt.strands.length===before) return;
  for (const strand of hunt.strands.slice(before)) strand.expiresAt=hunt.clock+WEB_SECONDS;
  const evicted=capStrands(hunt);
  audio.play('fix');
  say(evicted ? 'New web placed. The oldest web is fading.' : 'Web placed. Get close to steer the fly toward it.');
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
    say('Level '+hunt.score+' · Fly caught!');
  } else if(result==='new') {
    const base = 'Level '+(hunt.score+1)+' · New fly, '+hunt.difficulty.duration+' seconds.';
    const changes = difficultyChanges(hunt.score);
    if (changes.length) {
      difficultyNotice = {text:base+' The fly is '+changes.join(', ')+'.',until:hunt.clock+3};
      say(difficultyNotice.text);
    } else say(base);
  } else if(result==='over') {
    say('Time ran out on level '+(hunt.score+1)+' · '+catchesText(hunt.score)+'. Press × to play again.');
    audio.play('miss');
    leaderboard.show({id:runId,catches:hunt.score});
  }
  if (difficultyNotice && hunt.clock>=difficultyNotice.until) {
    if (message.textContent===difficultyNotice.text) say(intro);
    difficultyNotice=undefined;
  }
  return result==='over';
}

function captions(text: string,prompt=false) {
  if (lyric.textContent!==text) lyric.textContent=text;
  if (lyric.dataset.prompt!==String(prompt)) lyric.dataset.prompt=String(prompt);
}

const flyIntro = 'Fly through lights to reset the clock.';
const clamp01 = (value: number)=>Math.max(0,Math.min(1,value));
let flyCross=false;
function flyFrame(game: FlyEscape,time: number,elapsed: number,input: ReturnType<typeof samplePlayStation>|undefined,retry: boolean) {
  const complete=time>=flyDuration;
  const finale=time>=flyFinalStart;
  const playing=time>=flyCues.play;
  const phase=complete ? 'complete' : finale ? 'final' : playing ? 'play' : 'intro';
  if (shell.dataset.flyPhase!==phase) {
    shell.dataset.flyPhase=phase;
    flyControls.hidden=phase!=='play';
    say(phase==='play' ? flyIntro : '');
    if (complete) {
      pause.disabled=true;
      audio.setPaused(true);
    }
  }

  if (finale && !game.ending) finishFlyEscape(game);
  if (playing && !complete && !paused && !document.hidden) {
    flyCross ||= retry;
    remainder+=Math.min(elapsed,time-flyCues.play);
    const behavior=time>=flyCues.pass ? 'yield' : time>=flyCues.clearShot ? 'aim' : 'hunt';
    while (remainder>=1/120) {
      remainder-=1/120;
      const event=stepFlyEscape(game,{move:input?.movement??{x:0,y:0},cross:flyCross},1/120,behavior);
      flyCross=false;
      if (event==='light') {
        say('Light collected · 10 seconds.');
        audio.play('catch');
      } else if (event==='trap') {
        say('Caught in a web · Tap × to break free.');
        audio.play('attach');
      } else if (event==='escape' || event==='retry') {
        say(flyIntro);
      } else if (event==='timeout') {
        say('Time ran out. Press × to try again.');
      } else if (event==='web') {
        audio.play('launch');
      }
    }
  }

  const shot: FlyEscapeFrame['shot'] = playing || time<flyCues.spider ? undefined :
    time>=flyCues.room ? 'room' : time>=flyCues.you ? 'you' :
    time>=flyCues.fly ? 'fly' : time>=flyCues.take ? 'take' : 'spider';
  if (shell.dataset.flyShot!==(shot??'')) shell.dataset.flyShot=shot??'';
  const beat=reduceMotion.matches ? 0 : beatAt({track:'fly',time});
  const ending=finale ? clamp01((time-flyFinalStart)/20) : undefined;
  const shrinkElapsed=time-flyCues.shrink;
  const shrink=clamp01(shrinkElapsed/.85)*clamp01((5.5-shrinkElapsed)/1.8);
  renderFlyEscape(context,game,{
    time,beat,shot,intro:!playing,shotProgress:clamp01((time-flyCues.room)/.9),shrink,ending,reducedMotion:reduceMotion.matches,
  });

  const displayTime=Math.ceil(game.time);
  const labels=[
    [levelLabel,'The fly is you'],[timeLabel,displayTime+' s'],[roundLabel,FLY_SECONDS+' s'],
    [scoreLabel,game.lights+(game.lights===1 ? ' light' : ' lights')],[strandsLabel,game.strands.length+' webs'],
  ] as const;
  for (const [element,text] of labels) if (element.textContent!==text) element.textContent=text;
  clock.dataset.phase=phase==='intro' ? 'ready' : displayTime<=5 ? 'urgent' : 'running';
  clock.dataset.reset=String(!finale && game.flashUntil>game.clock);
  clock.style.setProperty('--pulse',beat.toFixed(2));
  clockMeter.style.setProperty('--remaining',(game.time/FLY_SECONDS).toFixed(3));
  captions(complete ? '' : lyricAt({track:'fly',time},timing));

  if (ending!==undefined) {
    shell.style.setProperty('--fly-end',ending.toFixed(3));
    const code=ending<.58 ? 'clock.timeLeft = '+displayTime+';' : 'return room;';
    if (endingCode.textContent!==code) endingCode.textContent=code;
  }
}

let crossHeld=false;
let optionsHeld=false;
function frame(time: number) {
  const elapsed=Math.min(.05,(time-(lastFrame||time))/1000);
  lastFrame=time;
  const gamepad=pad();
  let input: ReturnType<typeof samplePlayStation>|undefined;
  let retry=false;
  const boardWasOpen=leaderboard.open;
  if (!escape) leaderboard.handlePad(gamepad,time);
  if (gamepad) {
    const cross=!!gamepad.buttons[0]?.pressed;
    const options=!!gamepad.buttons[9]?.pressed;
    if (!song.started && cross && (!crossHeld || activePad!==gamepad.index) && !boardWasOpen && !leaderboard.open) {
      requestStart();
    }
    if (activePad!==gamepad.index) {
      activePad=gamepad.index;
      previous=undefined;
      crossHeld=cross;
      optionsHeld=options;
      if (!escape && song.started && !opening) say(hunt.phase==='over' ? 'Press × to play again.' : intro);
    }
    input=samplePlayStation(gamepad,previous);
    previous=input.shoulders;
    retry=cross && !crossHeld;
    if (options && !optionsHeld && !leaderboard.open) togglePause();
    crossHeld=cross;
    optionsHeld=options;
  } else {
    if (!escape && activePad!==undefined && !opening && hunt.phase!=='over') say(waiting);
    previous=undefined;
    activePad=undefined;
    if (!escape) remainder=0;
    down=false;
  }

  if (requestedStart && !song.started) {
    if (!audioOn || song.failed || song.canPlay(contextAudio)) {
      song.start();
      shell.dataset.screen='game';
      pause.disabled=false;
      say(song.failed ? 'Soundtrack unavailable. The intro will play with subtitles.' : 'Intro');
    } else if (contextAudio?.state!=='running') {
      startStatus.textContent='Select Start to enable audio.';
    } else {
      startStatus.textContent='Loading soundtrack…';
    }
  }
  song.connect(contextAudio);
  const position = song.position;
  if (escape && position.track==='fly') {
    flyFrame(escape,position.time,elapsed,input,retry);
    if (position.time<flyDuration) requestAnimationFrame(frame);
    return;
  }
  if (opening && song.started && position.track==='first' && position.time>=huntStart(timing)) {
    opening=false;
    say(gamepad ? intro : waiting);
  }

  if (input && !opening && !paused && !boardWasOpen && !leaderboard.open && !document.hidden) {
    if (input.aim) aimDirection=input.aim;
    if (hunt.phase==='over' && retry) {
      hunt=createHunt();
      runId=newRunId();
      difficultyNotice=undefined;
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
    const d=input && !opening && !leaderboard.open && hunt.phase==='hunting' ?
      Math.hypot(spider.x-hunt.fly.p.x,spider.y-hunt.fly.p.y) : Infinity;
    audio.nearby(d,time);
  }
  const caption=song.started ? lyricAt(position,timing) : '';
  captions(caption,position.track==='room' && /^Press Space\b/i.test(caption));
  const seconds=Math.ceil(hunt.time);
  const level=hunt.score+Number(hunt.phase!=='caught');
  const labels = [[levelLabel,'Level '+level],[timeLabel,seconds+' s'],[roundLabel,hunt.difficulty.duration+' s'],[scoreLabel,catchesText(hunt.score)],
    [strandsLabel,hunt.strands.length+' / '+LIMIT+' webs']] as const;
  for (const [element,text] of labels) if (element.textContent!==text) element.textContent=text;
  const beat = reduceMotion.matches ? 0 : beatAt(position);
  const pulse = beat.toFixed(2);
  if (clock.style.getPropertyValue('--pulse')!==pulse) clock.style.setProperty('--pulse',pulse);
  const phase = opening ? 'ready' : hunt.phase==='caught' ? 'running' :
    seconds<=5 ? 'urgent' : hunt.time<20 ? 'low' : 'running';
  if (clock.dataset.phase!==phase) clock.dataset.phase=phase;
  const remaining = (hunt.time/hunt.difficulty.duration).toFixed(3);
  if (clockMeter.style.getPropertyValue('--remaining')!==remaining) clockMeter.style.setProperty('--remaining',remaining);
  renderHunt(context,hunt,spider,aimDirection,{
    time:position.time, beat, shot:opening && song.started ? openingShot(position.time,timing) : undefined,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if(import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
