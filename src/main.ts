import './style.css';
import {DEFAULT_TUNING,type Point} from './spider';
import {anchorCrawlerRope,castCrawler,closeCrawlerRopes,createCrawler,jumpCrawler,tickCrawler} from './crawler';
import {capStrands,createHunt,platforms,spawn,tickHunt,WEB_SECONDS} from './hunt';
import {fixSilk,leaveSilk,WEB_KEY} from './threads';
import {renderHunt} from './hunt-render';
import {readLeftStick,samplePlayStation,silkMotion} from './pad-controls';
import {Soundscape} from './soundscape';
import {Soundtrack} from './soundtrack';
import {beatAt, huntStart, loadTiming, lyricAt, openingShot} from './song-cues';
import {difficultyChanges,type HuntMode} from './difficulty';
import {bindLeaderboard} from './leaderboard';
import {createFlyEscape,ESCAPE_PRESSES,finishFlyEscape,FLY_SECONDS,stepFlyEscape,type FlyEscape} from './fly-escape';
import {renderFlyEscape,type FlyEscapeFrame} from './fly-escape-render';
import {flyCues,flyDoubtAt,flyDuration,flyFinalStart,flyMenuStart,flyRoomEffect} from './fly-song-timing';
import {infiniteHuntStart} from './infinite-timing';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const context = get<HTMLCanvasElement>('world').getContext('2d',{alpha:false})!;
const message = get('message');
const timeLabel = get('time');
const clock = get('clock');
const clockMeter = get('clock-meter');
const roundLabel = get('round-time');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const scoreLabel = get('score');
const launch = get('launch');
const defeat = get('loop-defeat');
const defeatScore = get('defeat-score');
const startStatus = get('start-status');
const shell = get('shell');
const lyric = get('lyric');
const endingCode = get('ending-code');
try {
  localStorage.removeItem(WEB_KEY);
} catch { /* Storage may be unavailable. */ }
const audio = new Soundscape();
function fetchTrack(name: string) {
  const url=document.querySelector<HTMLMetaElement>('meta[name="'+name+'"]')!.content;
  return fetch(url).then(response=>response.ok ? response.arrayBuffer() : undefined).catch(()=>undefined);
}
const timing = loadTiming();
const huntStartsAt = huntStart(timing);
const song = new Soundtrack([
  fetchTrack('tamago-soundtrack'),fetchTrack('tamago-upgrade'),fetchTrack('tamago-room'),
],timing.loopStart,fetchTrack('tamago-fly'),fetchTrack('tamago-loop'));
const leaderboard = bindLeaderboard();
let contextAudio: AudioContext|undefined;
let mode: HuntMode|undefined;
let padDirection = 0;
let opening = true;
let paused = false;
let escape: FlyEscape|undefined;
let spaceHeld = false;

function bindChoices(left: string,right: string,chooseLeft: ()=>void,chooseRight: ()=>void) {
  const buttons=[get<HTMLButtonElement>(left),get<HTMLButtonElement>(right)] as const;
  let selected: 0|1=0;
  function select(index: 0|1,focus=false) {
    selected=index;
    buttons.forEach((button,i)=>button.dataset.selected=String(i===index));
    if (focus) buttons[index].focus({preventScroll:true});
  }
  buttons[0].onclick=()=>{ select(0); chooseLeft(); };
  buttons[1].onclick=()=>{ select(1); chooseRight(); };
  buttons[0].onfocus=()=>select(0);
  buttons[1].onfocus=()=>select(1);
  return {select,confirm:()=>buttons[selected].click()};
}

const menuChoices=bindChoices('story','loop',()=>requestMode('story'),()=>requestMode('loop'));
const defeatChoices=bindChoices('main-menu','retry',showMenu,retryLoop);

function activeChoices() {
  if (shell.dataset.screen==='start') return menuChoices;
  if (!defeat.hidden) return defeatChoices;
}

function requestMode(next: HuntMode) {
  if (shell.dataset.screen!=='start') return;
  contextAudio=audio.audioContext();
  audio.unlock();
  if (mode===next && song.waiting) return;
  startStatus.textContent='Loading soundtrack…';
  startIntro(next);
}
window.addEventListener('pointerdown',()=>{ if (song.waiting) audio.unlock(); });

function clearFlyScene() {
  escape=undefined;
  flyCross=false;
  delete shell.dataset.flyPhase;
  delete shell.dataset.flyShot;
  delete shell.dataset.reforming;
  shell.style.removeProperty('--fly-end');
  shell.style.removeProperty('--menu-form');
  endingCode.textContent='';
}

function startIntro(next: HuntMode) {
  mode=next;
  opening=true;
  paused=false;
  clearFlyScene();
  resetHunt();
  clock.dataset.phase='ready';
  captions('');
  song.play(next,contextAudio);
  syncPause();
}

function showMenu() {
  const priorMode=mode;
  song.reset();
  mode=undefined;
  paused=false;
  remainder=0;
  clearFlyScene();
  defeat.hidden=true;
  shell.dataset.screen='start';
  launch.inert=false;
  menuChoices.select(priorMode==='loop' ? 1 : 0,true);
  startStatus.textContent='';
  captions('');
  say('');
}

function showDefeat() {
  say('');
  defeatScore.textContent=String(hunt.score);
  defeat.hidden=false;
  defeatChoices.select(1,true);
}

function retryLoop() {
  if (defeat.hidden) return;
  defeat.hidden=true;
  resetHunt();
}

function syncPause() {
  const frozen = paused || document.hidden;
  song.setPaused(frozen);
  audio.setPaused(frozen);
  remainder = 0;
  clock.dataset.paused=String(paused);
  if (!frozen) audio.unlock();
}
function togglePause() {
  if (!song.started || !defeat.hidden) return;
  paused = !paused;
  syncPause();
}
function beginFly() {
  escape=createFlyEscape(spider,hunt.fly.p);
  flyCross=false;
  shell.dataset.flyPhase='intro';
  paused=false;
  song.play('fly',contextAudio);
  syncPause();
  say('');
}

window.addEventListener('keydown',event => {
  if (song.waiting) audio.unlock();
  const choices=activeChoices();
  if (choices && /^Arrow(Left|Right|Up|Down)$/.test(event.code)) {
    event.preventDefault();
    choices.select(event.code==='ArrowLeft' || event.code==='ArrowUp' ? 0 : 1,true);
  }
  if (event.code==='Escape' && !event.repeat && !leaderboard.open) togglePause();
  if (event.code!=='Space') return;
  const freshPress=!spaceHeld && !event.repeat;
  spaceHeld=true;
  if (mode!=='story' || !song.started || opening || leaderboard.open || hunt.phase==='over') return;
  event.preventDefault();
  if (!freshPress || escape || song.position.track!=='room') return;
  beginFly();
});
window.addEventListener('keyup',event => {
  if (event.code==='Space') spaceHeld=false;
});
window.addEventListener('blur',()=>{ spaceHeld=false; });
document.addEventListener('visibilitychange',syncPause);

let hunt = createHunt();
let difficultyNotice: {text:string; until:number}|undefined;
let spider = createCrawler(spawn,platforms);
let aimDirection: Point = {x:.56,y:-.828};
let previous: ReturnType<typeof samplePlayStation>['shoulders']|undefined;
let activePad: number|undefined;
let supportsPads = typeof navigator.getGamepads==='function';
let down = false;
let lastFrame=0;
let remainder=0;
function say(text: string) { if(message.textContent!==text) message.textContent=text; }
const worldAim = () => ({x:spider.x+aimDirection.x*70,y:spider.y+aimDirection.y*70});

function resetHunt() {
  hunt=createHunt(undefined,mode);
  difficultyNotice=undefined;
  spider=createCrawler(spawn,platforms);
  aimDirection={x:.56,y:-.828};
  previous=undefined;
  down=false;
  remainder=0;
  updateHud(hunt.time,hunt.difficulty.duration);
  clock.dataset.reset='false';
  clockMeter.style.setProperty('--remaining','1');
  say('');
}

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
  say(evicted ? 'New web placed. The oldest web is fading.' : 'Web placed.');
}

function step(dt: number,m: Point) {
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
    say('Fly caught.');
  } else if(result==='new') {
    const base = 'New fly · '+hunt.difficulty.duration+' seconds.';
    const changes = difficultyChanges(hunt.score);
    if (changes.length) {
      difficultyNotice = {text:base+' The fly is '+changes.join(', ')+'.',until:hunt.clock+3};
      say(difficultyNotice.text);
    } else say(base);
  }
  if (difficultyNotice && hunt.clock>=difficultyNotice.until) {
    if (message.textContent===difficultyNotice.text) say('');
    difficultyNotice=undefined;
  }
  return result==='over';
}

function updateHud(seconds: number,budget: number) {
  const labels=[[timeLabel,seconds+' s'],[roundLabel,budget+' s'],[scoreLabel,String(hunt.score)]] as const;
  for (const [element,text] of labels) if (element.textContent!==text) element.textContent=text;
}

function captions(text: string,prompt=false) {
  if (lyric.textContent!==text) lyric.textContent=text;
  if (lyric.dataset.prompt!==String(prompt)) lyric.dataset.prompt=String(prompt);
}

const clamp01 = (value: number)=>Math.max(0,Math.min(1,value));
const neutralStick: Point={x:0,y:0};
let flyCross=false;
function flyFrame(game: FlyEscape,time: number,elapsed: number,move: Point,crossPressed: boolean) {
  const finale=time>=flyFinalStart;
  const playing=time>=flyCues.play;
  const phase=finale ? 'final' : playing ? 'play' : 'intro';
  if (shell.dataset.flyPhase!==phase) {
    shell.dataset.flyPhase=phase;
    say('');
  }

  if (finale && !game.ending) finishFlyEscape(game);
  if (playing && !paused && !document.hidden) {
    flyCross ||= crossPressed;
    remainder+=Math.min(elapsed,time-flyCues.play);
    const behavior=time>=flyCues.pass ? 'yield' : time>=flyCues.clearShot ? 'aim' : 'hunt';
    const gesture=behavior==='yield' ? flyDoubtAt(time) : undefined;
    while (remainder>=1/120) {
      remainder-=1/120;
      const event=stepFlyEscape(game,{move,cross:flyCross},1/120,behavior,gesture);
      flyCross=false;
      if (event==='light') {
        say('Light collected · 10 seconds.');
        audio.play('catch');
      } else if (event==='trap') {
        audio.play('attach');
      } else if (event==='escape') {
        say('');
      } else if (event==='timeout') {
        audio.play('miss');
        startIntro('story');
        return;
      } else if (event==='web') {
        audio.play('launch');
      }
    }
  }

  if (game.trapped && !finale) say('Caught in a web · × '+game.trapped.presses+'/'+ESCAPE_PRESSES);

  const shot: FlyEscapeFrame['shot'] = playing || time<flyCues.spider ? undefined :
    time>=flyCues.room ? 'room' : time>=flyCues.you ? 'you' :
    time>=flyCues.fly ? 'fly' : time>=flyCues.take ? 'take' : 'spider';
  if (shell.dataset.flyShot!==(shot??'')) shell.dataset.flyShot=shot??'';
  const beat=reduceMotion.matches ? 0 : beatAt({track:'fly',time});
  const ending=finale ? clamp01((time-flyFinalStart)/20) : undefined;
  const {shrink,details}=flyRoomEffect(time);
  renderFlyEscape(context,game,{
    time,beat,shot,intro:!playing,shotProgress:clamp01((time-flyCues.room)/.9),shrink,details,ending,reducedMotion:reduceMotion.matches,
  });

  const displayTime=Math.ceil(game.time);
  updateHud(displayTime,FLY_SECONDS);
  clock.dataset.phase=phase==='intro' ? 'ready' : displayTime<=5 ? 'urgent' : 'running';
  clock.dataset.reset=String(!finale && game.flashUntil>game.clock);
  clock.style.setProperty('--pulse',beat.toFixed(2));
  clockMeter.style.setProperty('--remaining',(game.time/FLY_SECONDS).toFixed(3));
  captions(lyricAt({track:'fly',time},timing));

  if (ending!==undefined) {
    shell.style.setProperty('--fly-end',ending.toFixed(3));
    const code='clock.timeLeft = '+displayTime+';\n'+'catches = '+hunt.score+';\nscene = '+(time<flyMenuStart ? 'room' : 'menu')+';';
    if (endingCode.textContent!==code) endingCode.textContent=code;
    if (time>=flyMenuStart) {
      shell.dataset.reforming='true';
      const formation=clamp01((time-flyMenuStart)/(flyDuration-flyMenuStart));
      shell.style.setProperty('--menu-form',formation.toFixed(3));
    }
  }
}

let crossHeld=false;
let optionsHeld=false;
function navigationDirection(gamepad: Gamepad) {
  const {x,y}=readLeftStick(gamepad);
  const axis=Math.abs(x)>=Math.abs(y) ? x : y;
  const negative=gamepad.buttons[14]?.pressed || gamepad.buttons[12]?.pressed;
  const positive=gamepad.buttons[15]?.pressed || gamepad.buttons[13]?.pressed;
  return negative ? -1 : positive ? 1 : Math.abs(axis)>.60 ? Math.sign(axis) : 0;
}

function frame(time: number) {
  const elapsed=Math.min(.05,(time-(lastFrame||time))/1000);
  lastFrame=time;
  const gamepad=pad();
  let input: ReturnType<typeof samplePlayStation>|undefined;
  let crossPressed=false;
  const boardWasOpen=leaderboard.open;
  const navigation=activeChoices();
  if (!navigation && !escape && mode==='story') leaderboard.handlePad(gamepad);
  if (gamepad) {
    const cross=!!gamepad.buttons[0]?.pressed;
    const options=!!gamepad.buttons[9]?.pressed;
    if (activePad!==gamepad.index) {
      activePad=gamepad.index;
      previous=undefined;
      if (!navigation) crossHeld=cross;
      optionsHeld=options;
    }
    crossPressed=cross && !crossHeld;
    crossHeld=cross;
    const direction=navigationDirection(gamepad);
    if (navigation && direction && direction!==padDirection) navigation.select(direction<0 ? 0 : 1,true);
    padDirection=direction;
    if (navigation && crossPressed) navigation.confirm();
    if (!navigation && !escape) {
      input=samplePlayStation(gamepad,previous);
      previous=input.shoulders;
    }
    if (options && !optionsHeld && !navigation && !leaderboard.open) togglePause();
    optionsHeld=options;
  } else {
    previous=undefined;
    activePad=undefined;
    down=false;
    crossHeld=false;
    padDirection=0;
  }

  song.connect(contextAudio);
  const menu=shell.dataset.screen==='start';
  if (!song.started) {
    if (menu && song.waiting) startStatus.textContent=contextAudio?.state==='running' ? 'Loading soundtrack…' :
      'Click or press a keyboard key to enable audio.';
    requestAnimationFrame(frame);
    return;
  }
  if (menu) {
    shell.dataset.screen='game';
    launch.inert=true;
    startStatus.textContent='';
    say(song.failed ? 'Soundtrack unavailable. The intro will play with subtitles.' : '');
  }
  const position = song.position;
  if (escape && position.track==='fly') {
    if (position.time>=flyDuration) showMenu();
    else flyFrame(escape,position.time,elapsed,gamepad ? readLeftStick(gamepad) : neutralStick,crossPressed);
    requestAnimationFrame(frame);
    return;
  }
  let huntElapsed=elapsed;
  const introTrack=mode==='loop' ? 'loop' : 'first';
  const startsAt=mode==='loop' ? infiniteHuntStart : huntStartsAt;
  if (opening && song.started && position.track===introTrack && position.time>=startsAt) {
    opening=false;
    huntElapsed=Math.min(elapsed,position.time-startsAt);
    say('');
  }

  if (!opening && !paused && !navigation && !boardWasOpen && !leaderboard.open && !document.hidden && hunt.phase!=='over') {
    if (input?.aim) aimDirection=input.aim;
    if (input?.jump && jumpCrawler(spider)) audio.play('jump');
    if (input?.fire) shootSilk();
    remainder+=huntElapsed;
    const movement=input?.movement??neutralStick;
    while (remainder>=1/120) {
      remainder-=1/120;
      if (!step(1/120,movement)) continue;
      remainder=0;
      audio.play('miss');
      if (mode==='story') {
        startIntro('story');
        requestAnimationFrame(frame);
        return;
      }
      showDefeat();
      break;
    }
  }

  const caption=song.started ? lyricAt(position,timing) : '';
  captions(caption,position.track==='room' && /^Press Space\b/i.test(caption));
  const seconds=Math.ceil(hunt.time);
  updateHud(seconds,hunt.difficulty.duration);
  const beat = reduceMotion.matches ? 0 : beatAt(position);
  const pulse = beat.toFixed(2);
  if (clock.style.getPropertyValue('--pulse')!==pulse) clock.style.setProperty('--pulse',pulse);
  const phase = opening ? 'ready' : hunt.phase==='caught' ? 'running' :
    seconds<=5 ? 'urgent' : hunt.time<(mode==='loop' ? 10 : 20) ? 'low' : 'running';
  if (clock.dataset.phase!==phase) clock.dataset.phase=phase;
  const remaining = (hunt.time/hunt.difficulty.duration).toFixed(3);
  if (clockMeter.style.getPropertyValue('--remaining')!==remaining) clockMeter.style.setProperty('--remaining',remaining);
  renderHunt(context,hunt,spider,aimDirection,{
    time:position.time, beat, shot:opening && song.started ? openingShot(position.time,timing,introTrack) : undefined,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if(import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
