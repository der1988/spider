import './style.css';
import type {Point} from './spider';
import {advanceArena,arenaInput,arenaStep,createArena,type ArenaEvent} from './arena-run';
import {endlessArena,newEndlessId,recordReplay} from './endless-replay';
import {WEB_KEY} from './threads';
import {renderHunt} from './hunt-render';
import {readLeftStick,samplePlayStation} from './pad-controls';
import {Soundscape} from './soundscape';
import {Soundtrack} from './soundtrack';
import {beatAt, huntStart, loadTiming, lyricAt, openingShot} from './song-cues';
import {difficultyChanges,type HuntMode} from './difficulty';
import {bindLeaderboard} from './leaderboard';
import {bindEndlessBoard} from './endless-board';
import {createMenuRoom,renderMenuRoom,stepMenuRoom} from './menu-room';
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
const menuCanvas=get<HTMLCanvasElement>('menu-room');
const menuContext=menuCanvas.getContext('2d',{alpha:false})!;
let menuRoom=createMenuRoom();
new ResizeObserver(([entry])=>{
  const {width,height}=entry.contentRect;
  if (!width || !height) return;
  const scale=Math.max(Math.min(width,height)/204,Math.max(width,height)/540);
  const w=Math.round(width/scale), h=Math.round(height/scale);
  if (menuCanvas.width===w && menuCanvas.height===h) return;
  menuCanvas.width=w;
  menuCanvas.height=h;
  menuRoom=createMenuRoom(w,h);
}).observe(menuCanvas);
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
],timing.loopStart,fetchTrack('tamago-fly'),fetchTrack('tamago-loop'),fetchTrack('tamago-menu'));
const leaderboard = bindLeaderboard();
const endlessBoard=bindEndlessBoard();
const dialogOpen=()=>leaderboard.open || endlessBoard.open;
get('defeat-top').onclick=()=>void endlessBoard.view();
let contextAudio: AudioContext|undefined;
let mode: HuntMode|undefined;
let padDirection = 0;
let opening = true;
let paused = false;
let escape: FlyEscape|undefined;
let spaceHeld = false;

function bindChoices(items: readonly (readonly [string,()=>void])[],vertical=false) {
  const buttons=items.map(([id])=>get<HTMLButtonElement>(id));
  let selected=0;
  function select(index: number,focus=false) {
    selected=index;
    buttons.forEach((button,i)=>button.dataset.selected=String(i===index));
    if (focus) buttons[index].focus({preventScroll:true});
  }
  buttons.forEach((button,index)=>{
    button.onclick=()=>{ select(index); items[index][1](); };
    button.onfocus=()=>select(index);
  });
  function move(direction: number) {
    const index=vertical ? (selected+direction+buttons.length)%buttons.length : direction<0 ? 0 : buttons.length-1;
    select(index,true);
  }
  return {select,move,get selected(){return selected;},confirm:()=>buttons[selected].click()};
}

const topTenIndex=2;
const menuChoices=bindChoices([
  ['story',()=>requestMode('story')],
  ['loop',()=>requestMode('loop')],
  ['menu-top',()=>void endlessBoard.view()],
],true);
const defeatChoices=bindChoices([['main-menu',showMenu],['retry',retryLoop]]);
get<HTMLDialogElement>('endless-board').addEventListener('close',()=>{
  if (shell.dataset.screen==='start') menuChoices.select(topTenIndex,true);
});

function activeChoices() {
  if (dialogOpen()) return;
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
function enableMenuSound() {
  if (mode || shell.dataset.screen!=='start') return;
  contextAudio=audio.audioContext();
  audio.unlock();
  if (!song.started && !song.waiting) song.play('menu',contextAudio);
}
window.addEventListener('pointerdown',()=>{
  if (shell.dataset.screen==='start') enableMenuSound();
  else if (song.waiting) audio.unlock();
});

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
  mode=undefined;
  song.play('menu',contextAudio);
  paused=false;
  remainder=0;
  clearFlyScene();
  defeat.hidden=true;
  endlessBoard.clear();
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
  if (endlessRun) endlessBoard.finish({runId:endlessRun.id,catches:hunt.score,replay:endlessRun.record.encode()});
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
  if (!mode || !song.started || !defeat.hidden) return;
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
  if (shell.dataset.screen==='start') enableMenuSound();
  else if (song.waiting) audio.unlock();
  if (dialogOpen()) return;
  const choices=activeChoices();
  if (choices && (choices===menuChoices ? /^Arrow(Up|Down)$/ : /^Arrow(Left|Right|Up|Down)$/).test(event.code)) {
    event.preventDefault();
    choices.move(event.code==='ArrowLeft' || event.code==='ArrowUp' ? -1 : 1);
  }
  if (event.code==='Escape' && !event.repeat && !dialogOpen()) togglePause();
  if (event.code!=='Space') return;
  const freshPress=!spaceHeld && !event.repeat;
  spaceHeld=true;
  if (mode!=='story' || !song.started || opening || dialogOpen() || hunt.phase==='over') return;
  event.preventDefault();
  if (!freshPress || escape || song.position.track!=='room') return;
  beginFly();
});
window.addEventListener('keyup',event => {
  if (event.code==='Space') spaceHeld=false;
});
window.addEventListener('blur',()=>{ spaceHeld=false; });
document.addEventListener('visibilitychange',syncPause);

let arena=createArena('story');
let hunt=arena.hunt;
let spider=arena.spider;
let endlessRun:{id:string;record:ReturnType<typeof recordReplay>}|undefined;
let difficultyNotice: {text:string; until:number}|undefined;
let previous: ReturnType<typeof samplePlayStation>['shoulders']|undefined;
let activePad: number|undefined;
let supportsPads = typeof navigator.getGamepads==='function';
let pendingButtons=0;
let lastFrame=0;
let remainder=0;
function say(text: string) { if(message.textContent!==text) message.textContent=text; }

function resetHunt() {
  endlessBoard.clear();
  endlessRun=mode==='loop' ? {id:newEndlessId(),record:recordReplay()} : undefined;
  arena=endlessRun ? endlessArena(endlessRun.id) : createArena('story');
  hunt=arena.hunt;
  spider=arena.spider;
  difficultyNotice=undefined;
  previous=undefined;
  pendingButtons=0;
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

function arenaFeedback(result:ArenaEvent) {
  if (result==='attach' || result==='miss') {
    audio.play('launch');
    audio.play(result,.06);
  } else if (result==='jump' || result==='release') audio.play(result);
  else if (result==='double') say('Double tether. Swinging from the latest anchor.');
  else if (result==='fix' || result==='evict') {
    audio.play('fix');
    say(result==='evict' ? 'New web placed. The oldest web is fading.' : 'Web placed.');
  }
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
      renderMenuRoom(menuContext,menuRoom,beat);
      const formation=clamp01((time-flyMenuStart)/(flyDuration-flyMenuStart));
      shell.style.setProperty('--menu-form',formation.toFixed(3));
    }
  }
}

let crossHeld=false;
let optionsHeld=false;
function navigationDirection(gamepad: Gamepad,vertical: boolean) {
  const {x,y}=readLeftStick(gamepad);
  const axis=!vertical && Math.abs(x)>=Math.abs(y) ? x : y;
  const negative=gamepad.buttons[12]?.pressed || (!vertical && gamepad.buttons[14]?.pressed);
  const positive=gamepad.buttons[13]?.pressed || (!vertical && gamepad.buttons[15]?.pressed);
  return negative ? -1 : positive ? 1 : Math.abs(axis)>.60 ? Math.sign(axis) : 0;
}

function frame(time: number) {
  const elapsed=Math.min(.05,(time-(lastFrame||time))/1000);
  lastFrame=time;
  const gamepad=pad();
  let input: ReturnType<typeof samplePlayStation>|undefined;
  let crossPressed=false;
  const boardWasOpen=dialogOpen();
  const atMenu=shell.dataset.screen==='start';
  endlessBoard.handlePad(gamepad,time,(atMenu && menuChoices.selected===1) || !defeat.hidden);
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
    const direction=navigationDirection(gamepad,atMenu);
    if (navigation && !boardWasOpen && direction && direction!==padDirection) {
      navigation.move(direction);
      if (atMenu) enableMenuSound();
    }
    padDirection=direction;
    if (navigation && crossPressed && !boardWasOpen) {
      if (atMenu && !mode && !song.started && !song.waiting) enableMenuSound();
      else navigation.confirm();
    }
    if (!navigation && !escape) {
      input=samplePlayStation(gamepad,previous);
      previous=input.shoulders;
    }
    if (options && !optionsHeld && !navigation && !dialogOpen()) togglePause();
    optionsHeld=options;
  } else {
    previous=undefined;
    activePad=undefined;
    crossHeld=false;
    padDirection=0;
  }

  song.connect(contextAudio);
  const menu=shell.dataset.screen==='start';
  if (menu && (!mode || !song.started)) {
    const position=song.position;
    const beat=reduceMotion.matches || position.track!=='menu' ? 0 : beatAt(position);
    if (!document.hidden) stepMenuRoom(menuRoom,elapsed);
    launch.style.setProperty('--menu-pulse',beat.toFixed(2));
    renderMenuRoom(menuContext,menuRoom,beat);
    if (!mode) {
      startStatus.textContent=song.started ? '' : song.waiting && contextAudio?.state!=='running' ?
        'Click or press a keyboard key to enable sound.' : 'Press × or click to enable sound.';
      requestAnimationFrame(frame);
      return;
    }
  }
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

  if (!opening && !paused && !navigation && !boardWasOpen && !dialogOpen() && !document.hidden && hunt.phase!=='over') {
    if (input?.jump) pendingButtons|=1;
    if (input?.fire) pendingButtons|=2;
    remainder+=huntElapsed;
    const controls=arenaInput(input?.movement??neutralStick,input?.aim);
    while (remainder>=arenaStep) {
      remainder-=arenaStep;
      const command=[...controls] as typeof controls;
      command[4]=pendingButtons;
      pendingButtons=0;
      endlessRun?.record.add(command);
      if (advanceArena(arena,command,arenaFeedback)!=='over') continue;
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
  renderHunt(context,hunt,spider,arena.aim,{
    time:position.time, beat, shot:opening && song.started ? openingShot(position.time,timing,introTrack) : undefined,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if(import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
