import './style.css';
import {createStealth,escapePresses,stepStealth,stealthHeight,stealthWidth,type StealthInput,type StealthRun} from './stealth';
import {renderStealth} from './stealth-render';
import {trackStarts} from './playlist';
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
const worldCanvas=get<HTMLCanvasElement>('world');
const context = worldCanvas.getContext('2d',{alpha:false})!;
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
const pausePanel=get<HTMLDialogElement>('pause-panel');
const settingsPanel=get<HTMLDialogElement>('settings-panel');
const dialogOpen=()=>leaderboard.open || endlessBoard.open || settingsPanel.open;
get('defeat-top').onclick=()=>void endlessBoard.view();
let contextAudio: AudioContext|undefined;
let mode: HuntMode|undefined;
let padDirection = 0;
let opening = true;
let paused = false;
let escape: FlyEscape|undefined;
let stealth: StealthRun|undefined;
let storyCheckpoint: {offset:number; arena:typeof arena}|undefined;
let escapeCheckpoint: FlyEscape|undefined;
const keyboard=new Set<string>();
let keyboardButtons=0;
let holdEscape=0;
let triangleHeld=false;
const canSwitchPerspective=()=>mode==='story' && !escape && !opening && !paused &&
  hunt.phase!=='over' && song.started && song.position.track==='room';
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

const topTenIndex=5;
const menuChoices=bindChoices([
  ['story',()=>requestMode('story')],
  ['loop',()=>requestMode('loop')],
  ['stealth-mode',startStealth],
  ['practice-mode',()=>startStealth(true)],
  ['settings-menu',openSettings],
  ['menu-top',()=>void endlessBoard.view()],
],true);
const pauseChoices=bindChoices([['resume',togglePause],['pause-settings',openSettings],['pause-menu',showMenu]],true);
const stealthDefeat=get<HTMLDialogElement>('stealth-defeat');
const stealthChoices=bindChoices([['stealth-menu',showMenu],['stealth-retry',startStealth]]);

const musicVolume=get<HTMLInputElement>('music-volume');
const effectsVolume=get<HTMLInputElement>('effects-volume');
const subtitleMode=get<HTMLSelectElement>('subtitle-mode');
const motionMode=get<HTMLInputElement>('motion-mode');
const escapeMode=get<HTMLInputElement>('escape-mode');
const keyboardMode=get<HTMLSelectElement>('keyboard-mode');
const settingsFields=[musicVolume,effectsVolume,subtitleMode,motionMode,escapeMode,keyboardMode,get<HTMLButtonElement>('settings-close')];
type Preferences={music:number;effects:number;subtitles:number;reduced:boolean;hold:boolean;keyboard:number};
const preferences:Preferences={music:100,effects:100,subtitles:0,reduced:false,hold:false,keyboard:0};
try {
  const saved=JSON.parse(localStorage.getItem('spider-v2-settings')??'{}') as Partial<Preferences>;
  if (Number.isFinite(saved.music)) preferences.music=Math.min(100,Math.max(0,saved.music!));
  if (Number.isFinite(saved.effects)) preferences.effects=Math.min(100,Math.max(0,saved.effects!));
  if (saved.subtitles===1 || saved.subtitles===2) preferences.subtitles=saved.subtitles;
  preferences.reduced=saved.reduced===true;
  preferences.hold=saved.hold===true;
  preferences.keyboard=saved.keyboard===1 ? 1 : 0;
} catch { /* Storage is optional. */ }
musicVolume.value=String(preferences.music);
effectsVolume.value=String(preferences.effects);
subtitleMode.selectedIndex=preferences.subtitles;
motionMode.checked=preferences.reduced;
escapeMode.checked=preferences.hold;
keyboardMode.selectedIndex=preferences.keyboard;
function applySettings() {
  song.setVolume(Number(musicVolume.value)/100);
  audio.setVolume(Number(effectsVolume.value)/100);
  shell.dataset.subtitles=['normal','large','off'][subtitleMode.selectedIndex];
}
applySettings();
const reduced=()=>motionMode.checked || reduceMotion.matches;
for (const field of settingsFields) field.oninput=()=>{
  applySettings();
  try {
    localStorage.setItem('spider-v2-settings',JSON.stringify({
      music:Number(musicVolume.value),effects:Number(effectsVolume.value),subtitles:subtitleMode.selectedIndex,
      reduced:motionMode.checked,hold:escapeMode.checked,keyboard:keyboardMode.selectedIndex,
    }));
  } catch { /* Storage is optional. */ }
};
let settingsReturn:HTMLElement|undefined;
function openSettings() {
  settingsReturn=document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  settingsPanel.showModal();
  musicVolume.focus();
}
get('settings-close').onclick=()=>settingsPanel.close();
settingsPanel.onclose=()=>settingsReturn?.focus();
pausePanel.oncancel=event=>{event.preventDefault();togglePause();};
stealthDefeat.oncancel=event=>{event.preventDefault();showMenu();};
function settingsPad(gamepad:Gamepad,cross:boolean,cancel:boolean,direction:number) {
  if (cancel) {settingsPanel.close();return;}
  const index=Math.max(0,settingsFields.findIndex(field=>field===document.activeElement));
  if (direction && direction!==padDirection) settingsFields[(index+direction+settingsFields.length)%settingsFields.length].focus();
  const field=settingsFields[index];
  if (cross && (field instanceof HTMLButtonElement || field instanceof HTMLInputElement && field.type==='checkbox')) field.click();
  const left=gamepad.buttons[14]?.pressed,right=gamepad.buttons[15]?.pressed;
  const horizontal=left ? -1 : right ? 1 : 0;
  if (horizontal && horizontal!==settingsHorizontal) {
    if (field instanceof HTMLSelectElement) field.selectedIndex=Math.max(0,Math.min(field.options.length-1,field.selectedIndex+horizontal));
    if (field instanceof HTMLInputElement && field.type==='range') {
      if (horizontal>0) field.stepUp();
      else field.stepDown();
    }
    field.dispatchEvent(new Event('input'));
  }
  settingsHorizontal=horizontal;
}
let settingsHorizontal=0;
let cancelHeld=false;

const defeatChoices=bindChoices([['main-menu',showMenu],['retry',retryLoop]]);
get<HTMLDialogElement>('endless-board').addEventListener('close',()=>{
  if (shell.dataset.screen==='start') menuChoices.select(topTenIndex,true);
});

function activeChoices() {
  if (dialogOpen()) return;
  if (pausePanel.open) return pauseChoices;
  if (stealthDefeat.open) return stealthChoices;
  if (shell.dataset.screen==='start') return menuChoices;
  if (!defeat.hidden) return defeatChoices;
}

function requestMode(next: HuntMode) {
  if (shell.dataset.screen!=='start') return;
  contextAudio=audio.audioContext();
  audio.unlock();
  if (mode===next && song.waiting) return;
  storyCheckpoint=undefined;
  escapeCheckpoint=undefined;
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

function startIntro(next: HuntMode,resume=false) {
  mode=next;
  opening=true;
  paused=false;
  clearFlyScene();
  resetHunt();
  const checkpoint=resume ? storyCheckpoint : undefined;
  if (checkpoint) {
    arena=structuredClone(checkpoint.arena);
    hunt=arena.hunt;
    spider=arena.spider;
    opening=false;
    // Give the resumed hunt a fresh round with the saved chapter's score and difficulty.
    updateHud(Math.ceil(hunt.time),hunt.difficulty.duration);
  }
  clock.dataset.phase=opening ? 'ready' : 'running';
  captions('');
  song.play(next,contextAudio,checkpoint?.offset);
  syncPause();
}

function showMenu() {
  const priorMode=mode;
  const practice=stealth?.practice;
  const wasStealth=!!stealth;
  stealth=undefined;
  storyCheckpoint=undefined;
  escapeCheckpoint=undefined;
  pausePanel.close();
  stealthDefeat.close();
  setStealthView();
  mode=undefined;
  song.play('menu',contextAudio);
  paused=false;
  remainder=0;
  clearFlyScene();
  defeat.hidden=true;
  endlessBoard.clear();
  shell.dataset.screen='start';
  launch.inert=false;
  menuChoices.select(practice ? 3 : wasStealth ? 2 : priorMode==='loop' ? 1 : 0,true);
  startStatus.textContent='';
  captions('');
  say('');
  syncPause();
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
  if (!(stealth || mode && song.started) || !defeat.hidden || stealthDefeat.open) return;
  paused = !paused;
  if (paused) {
    pausePanel.showModal();
    pauseChoices.select(0,true);
  } else pausePanel.close();
  syncPause();
}
function beginFly(resume=false) {
  escape=resume && escapeCheckpoint ? structuredClone(escapeCheckpoint) : createFlyEscape(spider,hunt.fly.p);
  if (!resume) escapeCheckpoint=structuredClone(escape);
  flyCross=false;
  holdEscape=0;
  shell.dataset.flyPhase='intro';
  paused=false;
  song.play('fly',contextAudio,resume ? flyCues.play : 0);
  syncPause();
  say('');
}

window.addEventListener('keydown',event => {
  if (settingsPanel.open) return;
  if (!pausePanel.open && shell.dataset.screen==='game' && !dialogOpen() && !stealthDefeat.open && defeat.hidden) {
    if (/^(Key[WASDZX]|Arrow(Up|Down|Left|Right))$/.test(event.code)) {
      keyboard.add(event.code);
      if (!event.repeat && event.code==='KeyZ') keyboardButtons|=1;
      if (!event.repeat && event.code==='KeyX') keyboardButtons|=2;
      event.preventDefault();
    }
  }
  if (shell.dataset.screen==='start') enableMenuSound();
  else if (song.waiting) audio.unlock();
  if (dialogOpen()) return;
  const choices=activeChoices();
  if (choices && ((choices===menuChoices || choices===pauseChoices) ? /^Arrow(Up|Down)$/ : /^Arrow(Left|Right|Up|Down)$/).test(event.code)) {
    event.preventDefault();
    choices.move(event.code==='ArrowLeft' || event.code==='ArrowUp' ? -1 : 1);
  }
  if (event.code==='Escape' && !event.repeat && !dialogOpen() && !stealthDefeat.open) {
    event.preventDefault();
    togglePause();
  }
  if (event.code!=='Space') return;
  const freshPress=!spaceHeld && !event.repeat;
  spaceHeld=true;
  if (mode!=='story' || !song.started || opening || dialogOpen() || hunt.phase==='over') return;
  event.preventDefault();
  if (!freshPress || !canSwitchPerspective()) return;
  beginFly();
});
window.addEventListener('keyup',event => {
  keyboard.delete(event.code);
  if (event.code==='Space') spaceHeld=false;
});
window.addEventListener('blur',()=>{ spaceHeld=false; keyboard.clear(); keyboardButtons=0; });
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
  endlessRun=mode==='loop' ? {id:newEndlessId(),record:recordReplay(true)} : undefined;
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
    if (mode==='loop' && hunt.score%10===0) say('Arena changed · '+hunt.score+' catches.');
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
    while (remainder>=1/120) {
      remainder-=1/120;
      const at=time-remainder;
      const behavior=at>=flyCues.pass ? 'yield' : at>=flyCues.clearShot ? 'aim' : 'hunt';
      const gesture=behavior==='yield' ? flyDoubtAt(at) : undefined;
      const event=stepFlyEscape(game,{move,cross:flyCross},1/120,behavior,gesture,at);
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
        beginFly(true);
        return;
      } else if (event==='attach') {
        audio.play('attach');
      } else if (event==='web' || event==='swing') {
        audio.play('launch');
        if (event==='swing') audio.play('attach',.08);
      }
    }
  }

  if (game.trapped && !finale) say('Caught in a web · × '+game.trapped.presses+'/'+ESCAPE_PRESSES);

  const shot: FlyEscapeFrame['shot'] = playing || time<flyCues.spider ? undefined :
    time>=flyCues.room ? 'room' : time>=flyCues.you ? 'you' :
    time>=flyCues.fly ? 'fly' : time>=flyCues.take ? 'take' : 'spider';
  if (shell.dataset.flyShot!==(shot??'')) shell.dataset.flyShot=shot??'';
  const beat=reduced() ? 0 : beatAt({track:'fly',time});
  const ending=finale ? clamp01((time-flyFinalStart)/20) : undefined;
  const {details}=flyRoomEffect(time);
  renderFlyEscape(context,game,{
    time,beat,shot,intro:!playing,shotProgress:clamp01((time-flyCues.room)/.9),details,ending,reducedMotion:reduced(),
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

function saveStoryCheckpoint(track:string) {
  const offset=track==='upgrade' ? trackStarts[1] : track==='room' ? trackStarts[2] : 0;
  if (!offset || offset<=(storyCheckpoint?.offset??0)) return;
  const snapshot=structuredClone(arena);
  snapshot.hunt.time=snapshot.hunt.difficulty.duration;
  snapshot.hunt.strands=[];
  snapshot.hunt.loose=[];
  snapshot.hunt.retired=undefined;
  snapshot.spider.rope=undefined;
  snapshot.spider.firstAnchor=undefined;
  snapshot.spider.thread=undefined;
  storyCheckpoint={offset,arena:snapshot};
}

function keyboardInput() {
  const axes=(a:string,b:string,c:string,d:string)=>({
    x:Number(keyboard.has(b))-Number(keyboard.has(a)),y:Number(keyboard.has(d))-Number(keyboard.has(c)),
  });
  const letters=axes('KeyA','KeyD','KeyW','KeyS');
  const arrows=axes('ArrowLeft','ArrowRight','ArrowUp','ArrowDown');
  const [move,aim]=keyboardMode.selectedIndex===0 ? [letters,arrows] : [arrows,letters];
  return {move,aim:aim.x || aim.y ? aim : undefined};
}

const stealthInfo=get('stealth-info');
function setStealthView() {
  if (stealth) shell.dataset.stealth=stealth.practice ? 'practice' : 'true';
  else delete shell.dataset.stealth;
  worldCanvas.width=stealth ? stealthWidth : 360;
  worldCanvas.height=stealth ? stealthHeight : 204;
  stealthInfo.hidden=!stealth;
  get('score-label').textContent=stealth ? 'Guards bound' : 'Catches';
  stealthInfo.textContent=stealth?.practice
    ? 'Hold L1 / Z to charge a jump · R1 / X to fire · Hold to swing · Up to reel'
    : 'Hold L1 / Z to charge a jump · R1 / X to fire · Hold to swing · Up to reel · Tap × / X to escape';
}

function startStealth(practice=false) {
  contextAudio=audio.audioContext();
  audio.unlock();
  song.stop();
  mode=undefined;
  stealthDefeat.close();
  clearFlyScene();
  stealth=createStealth(practice);
  setStealthView();
  shell.dataset.screen='game';
  launch.inert=true;
  paused=false;
  pendingButtons=0;
  keyboardButtons=0;
  captions('');
  say('');
  syncPause();
}

function playStealthFrame(run:StealthRun,input:StealthInput,elapsed:number) {
  if (!paused && !document.hidden && run.phase==='play') {
    remainder+=elapsed;
    while (remainder>=arenaStep && run.phase==='play') {
      remainder-=arenaStep;
      stepStealth(run,input,arenaStep,event=>{
        if (event==='seen' || event==='trap') audio.play('tension');
        else if (event==='escaped') audio.play('release');
        else audio.play(event);
      });
    }
  }
  if (run.practice) {
    renderStealth(context,run,reduced());
    return;
  }
  if (run.phase==='complete') {
    audio.play('discovery');
    showMenu();
    return;
  }
  const witness=run.guards.some(guard=>guard.witnessed && !guard.caught);
  const watching=run.guards.some(guard=>guard.alert>.08 && !guard.caught);
  const status=run.trapped ? 'Caught · Tap × / X · '+run.trapped.presses+'/'+escapePresses+' · '+Math.max(0,Math.ceil(run.trapped.until-run.clock))+' s' : witness ? 'Witness alerted · Bind it with silk before leaving' :
    watching ? 'Guards investigating · Move slowly or climb' : 'Stay unseen · Reach the exit pipe';
  if (message.textContent!==status) say(status);
  const neutralized=String(run.guards.filter(guard=>guard.caught).length)+'/'+run.guards.length;
  if (scoreLabel.textContent!==neutralized) scoreLabel.textContent=neutralized;
  renderStealth(context,run,reduced());
  if (run.phase==='over' && !stealthDefeat.open) {
    stealthDefeat.showModal();
    stealthChoices.select(1,true);
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
  if (!navigation && !escape && mode==='story' && !canSwitchPerspective()) leaderboard.handlePad(gamepad);
  if (gamepad) {
    const cross=!!gamepad.buttons[0]?.pressed;
    const options=!!gamepad.buttons[9]?.pressed;
    const triangle=!!gamepad.buttons[3]?.pressed;
    const cancel=!!gamepad.buttons[1]?.pressed;
    if (triangle && !triangleHeld && !navigation && !dialogOpen() && canSwitchPerspective()) beginFly();
    triangleHeld=triangle;
    if (activePad!==gamepad.index) {
      activePad=gamepad.index;
      previous=undefined;
      if (!navigation) crossHeld=cross;
      optionsHeld=options;
    }
    crossPressed=cross && !crossHeld;
    crossHeld=cross;
    const direction=navigationDirection(gamepad,atMenu || pausePanel.open || settingsPanel.open);
    if (settingsPanel.open) settingsPad(gamepad,crossPressed,cancel && !cancelHeld,direction);
    cancelHeld=cancel;
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
    if (options && !optionsHeld && (!navigation || pausePanel.open) && !dialogOpen()) togglePause();
    optionsHeld=options;
  } else {
    previous=undefined;
    activePad=undefined;
    crossHeld=false;
    triangleHeld=false;
    cancelHeld=false;
    padDirection=0;
  }

  const keys=keyboardInput();
  const actions=keyboardButtons;
  keyboardButtons=0;
  const move=keys.move.x || keys.move.y ? keys.move : gamepad ? readLeftStick(gamepad) : neutralStick;
  if (stealth) {
    playStealthFrame(stealth,{
      move,aim:keys.aim??input?.aim,jump:keyboard.has('KeyZ') || !!gamepad?.buttons[4]?.pressed,
      silk:keyboard.has('KeyX') || !!gamepad?.buttons[5]?.pressed,
      escape:keyboard.has('KeyX') || crossHeld,
    },elapsed);
    requestAnimationFrame(frame);
    return;
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
    else {
      const held=(crossHeld || keyboard.has('KeyX')) && escape.trapped && !paused && !document.hidden;
      holdEscape=held ? holdEscape+elapsed : 0;
      const repeat=escapeMode.checked && holdEscape>=.17;
      if (repeat) holdEscape=0;
      flyFrame(escape,position.time,elapsed,move,crossPressed || !!(actions&2) || repeat);
    }
    requestAnimationFrame(frame);
    return;
  }
  if (mode==='story') saveStoryCheckpoint(position.track);
  let huntElapsed=elapsed;
  const introTrack=mode==='loop' ? 'loop' : 'first';
  const startsAt=mode==='loop' ? infiniteHuntStart : huntStartsAt;
  if (opening && song.started && position.track===introTrack && position.time>=startsAt) {
    opening=false;
    huntElapsed=Math.min(elapsed,position.time-startsAt);
    say('');
  }

  if (!opening && !paused && !navigation && !boardWasOpen && !dialogOpen() && !document.hidden && hunt.phase!=='over') {
    if (input?.jump || actions&1) pendingButtons|=1;
    if (input?.fire || actions&2) pendingButtons|=2;
    remainder+=huntElapsed;
    const controls=arenaInput(move,keys.aim??input?.aim);
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
        startIntro('story',true);
        requestAnimationFrame(frame);
        return;
      }
      showDefeat();
      break;
    }
  }

  const rawCaption=song.started ? lyricAt(position,timing) : '';
  const caption=position.track==='room' && /^Press Space\b/i.test(rawCaption) ? rawCaption+' · △ on controller' : rawCaption;
  captions(caption,position.track==='room' && /^Press Space\b/i.test(caption));
  const seconds=Math.ceil(hunt.time);
  updateHud(seconds,hunt.difficulty.duration);
  const beat = reduced() ? 0 : beatAt(position);
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
