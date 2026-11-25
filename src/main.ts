import {frankChapters} from './frank-script';
import {createFrankStory,frankCompletionKey,frankLine,frankPhase,frankVoice,tickFrank,type FrankStory} from './frank-story';
import './style.css';
import {createOpenWorld,createWindowHunt,pantryTiers,preyTier,restartOpenWorld,stepWindowHunt,updateHuntZoom,roomHeight,roomWidth,breakFreePresses,type CornerInput,type WindowRun} from './window-hunt';
import {renderWindowHunt} from './window-hunt-render';
import {trackStarts} from './playlist';
import type {Point} from './spider';
import {advanceArena,arenaInput,arenaStep,releaseSilkButton,createArena,type ArenaEvent} from './arena-run';
import {advanceArcade,arcadeWebLimit,arcadeEscapeButton,arcadeHeight,arcadeWidth,createArcade,loadArcadeChapter,type ArcadeEvent,type ArcadeRun} from './arcade';
import {arcadeLevels,heartsPerRun} from './arcade-dialogue';
import {ArcadeMusic} from './arcade-music';
import {renderArcade} from './arcade-render';
import {WEB_KEY} from './threads';
import {renderHunt} from './hunt-render';
import {readLeftStick,samplePlayStation} from './pad-controls';
import {Soundscape} from './soundscape';
import {Soundtrack} from './soundtrack';
import {GnatMusic} from './gnat-music';
import {beatAt, huntStart, loadTiming, lyricAt, openingShot} from './song-cues';
import {difficultyChanges,type HuntMode} from './difficulty';
import {bindLeaderboard} from './leaderboard';
import {bindEndlessBoard} from './endless-board';
import {createMenuRoom,renderMenuRoom,stepMenuRoom} from './menu-room';
import {createFlyEscape,ESCAPE_PRESSES,finishFlyEscape,FLY_SECONDS,stepFlyEscape,type FlyEscape} from './fly-escape';
import {renderFlyEscape,type FlyEscapeFrame} from './fly-escape-render';
import {flyCues,flyDoubtAt,flyDuration,flyFinalStart,flyMenuStart,flyRoomEffect} from './fly-song-timing';

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
const startStatus = get('start-status');
const shell = get('shell');
const lyric = get('lyric');
const endingCode = get('ending-code');
try {
  localStorage.removeItem(WEB_KEY);
} catch { /* Storage may be unavailable. */ }
const audio = new Soundscape();
const gnatMusic=new GnatMusic();
const arcadeMusic=new ArcadeMusic();
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
let contextAudio: AudioContext|undefined;
let mode: HuntMode|undefined;
let padDirection = 0;
let opening = true;
let paused = false;
let escape: FlyEscape|undefined;
let windowHunt: WindowRun|undefined;
let arcade: ArcadeRun|undefined;
let frank:FrankStory|undefined;
let frankTouchPress=false;
let frankVoiceAt=0;
let frankTouchMove:Point={x:0,y:0};
let frankTouchAim:Point|undefined;
let frankTouchButtons=0;
let frankTouchSilk=false;

let roomMapOpen=false;
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
  ['window-hunt-mode',startWindowHunt],
  ['practice-mode',()=>startWindowHunt(true)],
  ['settings-menu',openSettings],
  ['menu-top',()=>void endlessBoard.view()],
],true);
const pauseChoices=bindChoices([['resume',togglePause],['pause-settings',openSettings],['pause-menu',showMenu]],true);
const windowDefeat=get<HTMLDialogElement>('window-hunt-defeat');
const windowChoices=bindChoices([['window-hunt-menu',showMenu],['window-hunt-retry',retryOpenWorld]]);

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
  const music=Number(musicVolume.value)/100;
  song.setVolume(music);
  gnatMusic.setVolume(music);
  arcadeMusic.setVolume(music);
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
windowDefeat.oncancel=event=>{event.preventDefault();showMenu();};
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
  if (windowDefeat.open) return windowChoices;
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
  if (next==='loop') startArcade();
  else {
    startStatus.textContent='Loading soundtrack…';
    startIntro();
  }
}
function enableMenuSound() {
  if (mode || shell.dataset.screen!=='start') return;
  contextAudio=audio.audioContext();
  audio.unlock();
  if (!song.started && !song.waiting) song.play('menu',contextAudio);
}
window.addEventListener('pointerdown',()=>{
  if (shell.dataset.screen==='start') enableMenuSound();
  else if (song.waiting || windowHunt || arcade) audio.unlock();
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

function startIntro(resume=false) {
  mode='story';
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
  song.play('story',contextAudio,checkpoint?.offset);
  syncPause();
}

function showMenu() {
  const priorMode=mode;
  const practice=windowHunt?.practice;
  const wasWindowHunt=!!windowHunt;
  windowHunt=undefined;
  arcade=undefined;
  frank=undefined;
  hideFrankPanels();
  arcadeMusic.stop();
  delete shell.dataset.arcade;
  gnatMusic.reset();
  roomMapOpen=false;
  storyCheckpoint=undefined;
  escapeCheckpoint=undefined;
  pausePanel.close();
  windowDefeat.close();
  setWindowView();
  mode=undefined;
  song.play('menu',contextAudio);
  paused=false;
  remainder=0;
  clearFlyScene();
  defeat.hidden=true;
  endlessBoard.clear();
  shell.dataset.screen='start';
  launch.inert=false;
  menuChoices.select(practice ? 3 : wasWindowHunt ? 2 : priorMode==='loop' ? 1 : 0,true);
  startStatus.textContent='';
  captions('');
  say('');
  syncPause();
}

function startArcade() {
  mode='loop';
  arcade=createArcade();
  frank=createFrankStory();
  frankVoiceAt=0;
  frankTouchPress=false;
  frankTouchMove={x:0,y:0};
  frankTouchAim=undefined;
  frankTouchButtons=0;
  frankTouchSilk=false;
  song.stop();
  arcadeMusic.stop();
  shell.dataset.arcade='true';
  shell.dataset.screen='game';
  launch.inert=true;
  worldCanvas.width=arcadeWidth;
  worldCanvas.height=arcadeHeight;
  context.imageSmoothingEnabled=false;
  defeat.hidden=true;
  paused=false;
  opening=false;
  clearFlyScene();
  captions('');
  keyboardButtons=0;
  pendingButtons=0;
  say('');
  syncPause();
}

function retryLoop() {
  if (arcade && !defeat.hidden) startArcade();
}

const arcadeSounds={
  launch:'launch',jump:'jump',attach:'attach',double:'attach',miss:'miss',release:'release',fix:'fix',evict:'fix',
  catch:'catch',entrance:'discovery',new:'discovery',over:'miss',recover:'discovery',boss:'tension',
  'boss-trap':'attach','boss-free':'release',snared:'tension','escape-step':'fix',escape:'release',
  'silk-hit':'attach',hit:'catch',win:'discovery',hurt:'heart',
} as const;

function arcadeFeedback(event:ArcadeEvent) {
  if ((event==='entrance' || event==='boss') && arcade) arcadeMusic.entrance(contextAudio,arcade.level);
  else audio.play(arcadeSounds[event]);
}

const frankTitle=get('frank-title'),frankDialogue=get('frank-dialogue'),frankNarration=get('frank-narration');
const frankTouch=get('frank-touch');
const coarsePointer=matchMedia('(pointer: coarse)');
function hideFrankPanels() {
  frankTitle.hidden=frankDialogue.hidden=frankNarration.hidden=frankTouch.hidden=true;
}
for (const panel of [frankDialogue,frankNarration]) panel.addEventListener('click',()=>{frankTouchPress=true;});
for (const control of frankTouch.querySelectorAll<HTMLButtonElement>('button')) {
  control.addEventListener('pointerdown',event=>{
    control.setPointerCapture(event.pointerId);
    if (control.dataset.move) {
      const [x,y]=control.dataset.move.split(',').map(Number);
      frankTouchMove={x,y};
    }
    const button=Number(control.dataset.action);
    if (button) frankTouchButtons|=button;
    if (button===2) frankTouchSilk=true;
  });
  control.addEventListener('lostpointercapture',()=>{
    if (control.dataset.move) frankTouchMove={x:0,y:0};
    if (control.dataset.action==='2') frankTouchSilk=false;
  });
}
function aimFrankTouch(event:PointerEvent) {
  if (event.pointerType!=='touch' || !arcade || frank?.phase!=='combat') return;
  const rect=worldCanvas.getBoundingClientRect();
  const x=(event.clientX-rect.left)*arcadeWidth/rect.width-arcade.movement.spider.x;
  const y=(event.clientY-rect.top)*arcadeHeight/rect.height-arcade.movement.spider.y;
  const length=Math.hypot(x,y);
  if (length>2) frankTouchAim={x:x/length,y:y/length};
}
worldCanvas.addEventListener('pointerdown',event=>{
  if (event.pointerType==='touch' && frank?.phase==='combat') worldCanvas.setPointerCapture(event.pointerId);
  aimFrankTouch(event);
});
worldCanvas.addEventListener('pointermove',aimFrankTouch);

function showFrankPanels(story:FrankStory,frozen:boolean) {
  const chapter=frankChapters[story.chapter],line=frankLine(story);
  frankTitle.hidden=story.phase!=='title' && story.phase!=='fade';
  if (!frankTitle.hidden) {
    frankTitle.textContent=story.phase==='fade' ? '' : story.chapter===0 ? 'FRANK WEBBIN — THE PERFECT CRIME\n'+chapter.title :
      story.chapter===11 ? 'EPILOGUE\n'+chapter.title : `CHAPTER ${String(story.chapter).padStart(2,'0')}\n${chapter.location.toUpperCase()}\n${chapter.title}`;
    frankTitle.style.opacity=String(story.phase==='fade' ? Math.min(1,story.elapsed/.5) :
      Math.max(0,Math.min(1,story.elapsed/.3,(3-story.elapsed)/.3)));
  }
  frankTouch.hidden=story.phase!=='combat' || !coarsePointer.matches || frozen;
  frankDialogue.hidden=!line || line.narration;
  frankNarration.hidden=!line || !line.narration;
  if (!line) return;
  const panel=line.narration ? frankNarration : frankDialogue;
  const name=line.speaker==='FRANK' ? 'Frank Webbin' : line.speaker==='STRANGER' ? 'Stranger' :
    chapter.enemies.find(enemy=>enemy.name.toUpperCase().split(' ').includes(line.speaker))?.name??'Duke Wobbleknees';
  const text=line.text.slice(0,Math.floor(story.reveal));
  const speaker=panel.querySelector('strong')!,copy=panel.querySelector('span')!;
  if (speaker.textContent!==name) speaker.textContent=name;
  if (copy.textContent!==text) copy.textContent=text;
}

function arcadeFrame(run:ArcadeRun,elapsed:number,move:Point,aim:Point|undefined,buttons:number,frozen:boolean) {
  const story=frank!;
  const combat=story.phase==='combat';
  if (!frozen && combat) {
    const input=arenaInput(frankTouchMove.x || frankTouchMove.y ? frankTouchMove : move,aim??frankTouchAim);
    pendingButtons|=buttons;
    remainder+=elapsed;
    while (remainder>=arenaStep) {
      remainder-=arenaStep;
      input[4]=pendingButtons;
      pendingButtons=0;
      advanceArcade(run,input,arcadeFeedback,true);
      if (run.intro) {
        // The original loss/retry path rebuilt level one.
        run.intro=undefined;
        run.phase='ready';
        Object.assign(story,createFrankStory());
        remainder=0;
        break;
      }
      if (run.phase==='won' || run.lives>0 && run.phase==='wave' && run.flies.length===0) {
        frankPhase(story,'setup');
        frankTouchMove={x:0,y:0};
        frankTouchSilk=false;
        frankTouchAim=undefined;
        remainder=0;
        break;
      }
    }
  } else if (!frozen) {
    pendingButtons=0;
    remainder=0;
    const chapter=story.chapter,phase=story.phase,old=story.reveal,line=frankLine(story);
    const press=frankTouchPress || !!(buttons&arcadeEscapeButton);
    tickFrank(story,elapsed,press);
    if (line && line===frankLine(story) && !press && Math.floor(old/2)<Math.floor(story.reveal/2) && story.reveal<line.text.length && performance.now()>=frankVoiceAt) {
      const char=line.text.charAt(Math.floor(story.reveal)-1);
      if (/\w/.test(char)) frankVoice(contextAudio,line.speaker,Number(effectsVolume.value)/100);
      frankVoiceAt=performance.now()+46;
    }
    if (chapter!==story.chapter && story.chapter<=arcadeLevels) loadArcadeChapter(run,story.chapter);
    if (phase!=='combat' && story.phase==='combat') {
      run.phase=run.boss ? 'boss' : 'wave';
      run.intro=undefined;
      pendingButtons=0;
    }
    if (phase!=='complete' && story.phase==='complete') {
      try {localStorage.setItem(frankCompletionKey,'true');} catch { /* Storage may be unavailable. */ }
    }
  }
  frankTouchPress=false;
  showFrankPanels(story,frozen);
  const finished=story.phase==='complete';
  arcadeMusic.sync(contextAudio,run.level,frozen && !finished || document.hidden || paused,story.phase!=='combat');
  const level=get('arcade-level'),label=`Level ${run.level} / ${arcadeLevels}`;
  if (level.textContent!==label) level.textContent=label;
  const nets=get('arcade-webs');
  const webCount=run.movement.hunt.strands.length;
  const webLabel=`Silk ${'◆'.repeat(webCount)}${'◇'.repeat(Math.max(0,arcadeWebLimit-webCount))}`;
  if (nets.textContent!==webLabel) {
    nets.textContent=webLabel;
    nets.setAttribute('aria-label',`Fixed silk ${webCount} of ${arcadeWebLimit}`);
  }
  const hearts=get('arcade-lives');
  if (hearts.dataset.lives!==String(run.lives)) {
    hearts.dataset.lives=String(run.lives);
    hearts.setAttribute('aria-label',`${run.lives} of ${heartsPerRun} hearts`);
    hearts.textContent='♥'.repeat(run.lives)+'♡'.repeat(heartsPerRun-run.lives);
  }
  const beat=reduced() ? 0 : arcadeMusic.pulse;
  if (finished && defeat.hidden) {
    get('defeat-title').textContent='The Wanted Spider';
    get('endless-status').textContent=`Level ${run.level} / ${arcadeLevels}`;
    defeat.hidden=false;
    defeatChoices.select(0,true);
  }
  renderArcade(context,run,beat,reduced(),story);
}

function syncPause() {
  const frozen = paused || document.hidden;
  song.setPaused(frozen);
  audio.setPaused(frozen);
  if (windowHunt) syncGnatMusic(windowHunt);
  remainder = 0;
  clock.dataset.paused=String(paused);
  if (!frozen) audio.unlock();
}
function togglePause() {
  if (!(arcade || windowHunt || mode && song.started) || !defeat.hidden || windowDefeat.open) return;
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
  if (event.code==='KeyM' && !event.repeat && windowHunt && !windowHunt.practice && !paused && windowHunt.phase==='play') {
    roomMapOpen=!roomMapOpen;
    remainder=0;
    event.preventDefault();
  }
  if (!pausePanel.open && shell.dataset.screen==='game' && !dialogOpen() && !windowDefeat.open && defeat.hidden) {
    if (arcade && frank?.phase!=='combat' && (event.code==='Enter' || event.code==='Space') && !event.repeat) {
      keyboardButtons|=arcadeEscapeButton;
      event.preventDefault();
      return;
    }
    if (/^(Key[WASDZXCGVQ]|Arrow(Up|Down|Left|Right))$/.test(event.code)) {
      keyboard.add(event.code);
      if (!event.repeat && event.code==='KeyZ') keyboardButtons|=1;
      if (!event.repeat && event.code==='KeyX') keyboardButtons|=arcade?.snare ? arcadeEscapeButton : 2;
      event.preventDefault();
    }
  }
  if (shell.dataset.screen==='start') enableMenuSound();
  else if (song.waiting || windowHunt || arcade) audio.unlock();
  if (dialogOpen()) return;
  const choices=activeChoices();
  if (choices && ((choices===menuChoices || choices===pauseChoices) ? /^Arrow(Up|Down)$/ : /^Arrow(Left|Right|Up|Down)$/).test(event.code)) {
    event.preventDefault();
    choices.move(event.code==='ArrowLeft' || event.code==='ArrowUp' ? -1 : 1);
  }
  if (event.code==='Escape' && !event.repeat && !dialogOpen() && !windowDefeat.open) {
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
  if (arcade && event.code==='KeyX' && keyboard.has(event.code)) keyboardButtons|=releaseSilkButton;
  keyboard.delete(event.code);
  if (event.code==='Space') spaceHeld=false;
});
window.addEventListener('blur',()=>{ spaceHeld=false; keyboard.clear(); keyboardButtons=0; });
document.addEventListener('visibilitychange',syncPause);

let arena=createArena('story');
let hunt=arena.hunt;
let spider=arena.spider;
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
  arena=createArena('story');
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

const windowInfo=get('window-hunt-info');
function setWindowView() {
  if (windowHunt) shell.dataset.windowHunt=windowHunt.practice ? 'practice' : 'true';
  else delete shell.dataset.windowHunt;
  worldCanvas.width=windowHunt ? roomWidth : 360;
  worldCanvas.height=windowHunt ? roomHeight : 204;
  windowInfo.hidden=!windowHunt?.practice;
  get('open-controls').hidden=!windowHunt?.openWorld;
  get('open-goal').hidden=!windowHunt?.openWorld;
  get('score-label').textContent='Catches';
}

function startWindowHunt(practice=false) {
  contextAudio=audio.audioContext();
  audio.unlock();
  song.stop();
  gnatMusic.reset();
  mode=undefined;
  windowDefeat.close();
  clearFlyScene();
  windowHunt=practice ? createWindowHunt(true) : createOpenWorld();
  windowHunt.escapeHeld=crossHeld;
  roomMapOpen=false;
  huntNoticeUntil=0;
  silkHeldFor=0;
  setWindowView();
  shell.dataset.screen='game';
  launch.inert=true;
  paused=false;
  pendingButtons=0;
  keyboardButtons=0;
  captions('');
  say('');
  syncPause();
}

function retryOpenWorld() {
  if (!windowHunt?.openWorld || windowHunt.phase==='complete') {
    startWindowHunt();
    return;
  }
  windowHunt=restartOpenWorld(windowHunt);
  windowHunt.escapeHeld=crossHeld;
  windowDefeat.close();
  roomMapOpen=false;
  huntNoticeUntil=0;
  silkHeldFor=0;
  say('You kept your nest supplies');
  huntNoticeUntil=2.2;
  syncPause();
}

let huntNoticeUntil=0;
let silkHeldFor=0;
function syncGnatMusic(run:WindowRun) {
  if (run.practice) {
    gnatMusic.reset();
    return;
  }
  const alerted=run.phase==='play' && (run.trapped || run.predators.some(predator=>
    run.clock>=predator.boundUntil && run.clock<predator.chaseUntil));
  gnatMusic.sync(contextAudio,alerted ? 'danger' : 'explore',paused || document.hidden);
}

function playWindowFrame(run:WindowRun,input:CornerInput,elapsed:number,realElapsed:number,zoomHeld:boolean) {
  if (!paused && !roomMapOpen && !document.hidden && run.phase==='play') {
    silkHeldFor=input.silk ? silkHeldFor+realElapsed : 0;
    input={...input,silkHeldFor};
    updateHuntZoom(run,zoomHeld,elapsed);
    remainder+=elapsed;
    while (remainder>=arenaStep && run.phase==='play') {
      remainder-=arenaStep;
      stepWindowHunt(run,input,arenaStep,event=>{
        if (event==='store' || event==='complete') {
          audio.play('discovery');
          say(event==='complete' ? 'Nest stocked!' : 'Cargo safely stored');
          huntNoticeUntil=run.clock+2;
        } else if (event==='eat') audio.play('catch');
        else if (event==='trap') audio.play('tension');
        else if (event==='escaped') audio.play('release');
        else if (event==='caught-insect' || event==='caught-predator') audio.play('fix');
        else {
          audio.play(event);
          if (event==='catch') {
            say('Insect collected · added to the silk chain');
            huntNoticeUntil=run.clock+1.35;
          }
        }
      });
    }
  }
  syncGnatMusic(run);
  if (run.practice) {
    renderWindowHunt(context,run,reduced());
    return;
  }
  if (contextAudio && contextAudio.state!=='running') say('Click or press a keyboard key to enable music');
  else if (roomMapOpen) say('World map · △ / M to close');
  else if (run.trapped) say('Trapped · Tap × / C · '+run.escapeCount+'/'+breakFreePresses);
  else if (run.clock<run.eatingUntil) say('Eating · Stay out of sight');
  else if (run.clock>=huntNoticeUntil) {
    const next=pantryTiers.find(tier=>!run.pantry[tier]);
    const needed=run.carried.some(prey=>!run.pantry[preyTier(prey)]);
    say(needed ? 'Bring your catch back to the nest' : next ? 'Find a '+next+' insect' : 'Nest stocked!');
  }
  const catches=String(run.catches);
  const cargo=`Carry ${run.carried.length}`;
  if (get('open-cargo').textContent!==cargo) get('open-cargo').textContent=cargo;
  if (scoreLabel.textContent!==catches) scoreLabel.textContent=catches;
  for (const tier of pantryTiers) {
    const slot=get('nest-'+tier);
    const status=run.pantry[tier] ? 'stored' : run.carried.some(prey=>preyTier(prey)===tier) ? 'carried' : 'missing';
    if (slot.dataset.state!==status) {
      slot.dataset.state=status;
      slot.setAttribute('aria-label',tier+': '+status);
    }
  }
  renderWindowHunt(context,run,reduced(),roomMapOpen,gnatMusic.pulse);
  if (run.phase!=='play' && !windowDefeat.open) {
    const won=run.phase==='complete';
    get('window-hunt-title').textContent=won ? 'Nest stocked!' : 'Caught on patrol';
    get('window-hunt-result').textContent=won ? 'One of each kind. Dinner is sorted.'
      : `Nest supplies kept · ${pantryTiers.filter(tier=>run.pantry[tier]).length}/3`;
    get('window-hunt-retry').textContent=won ? 'New Hunt' : 'Return to Nest';
    windowDefeat.showModal();
    windowChoices.select(1,true);
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
  const realElapsed=(time-(lastFrame||time))/1000;
  const elapsed=Math.min(.05,realElapsed);
  lastFrame=time;
  const gamepad=pad();
  let input: ReturnType<typeof samplePlayStation>|undefined;
  let crossPressed=false;
  const boardWasOpen=dialogOpen();
  const atMenu=shell.dataset.screen==='start';
  endlessBoard.handlePad(gamepad,time,false);
  const navigation=activeChoices();
  if (!navigation && !escape && mode==='story' && !canSwitchPerspective()) leaderboard.handlePad(gamepad);
  if (gamepad) {
    const cross=!!gamepad.buttons[0]?.pressed;
    const options=!!gamepad.buttons[9]?.pressed;
    const triangle=!!gamepad.buttons[3]?.pressed;
    const cancel=!!gamepad.buttons[1]?.pressed;
    if (triangle && !triangleHeld && !navigation && !dialogOpen()) {
      if (windowHunt && !windowHunt.practice && windowHunt.phase==='play') {
        roomMapOpen=!roomMapOpen;
        remainder=0;
      } else if (canSwitchPerspective()) beginFly();
    }
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
  if (windowHunt) {
    playWindowFrame(windowHunt,{
      move,aim:keys.aim??input?.aim,jump:keyboard.has('KeyZ') || !!gamepad?.buttons[4]?.pressed,
      silk:keyboard.has('KeyX') || !!gamepad?.buttons[5]?.pressed,
      grip:keyboard.has('KeyG') || !!gamepad?.buttons[7]?.pressed || (gamepad?.buttons[7]?.value??0)>.3,
      escape:keyboard.has('KeyC') || crossHeld,
      remove:keyboard.has('KeyV') || !!gamepad?.buttons[2]?.pressed,
    },elapsed,realElapsed,!!gamepad?.buttons[6]?.pressed || (gamepad?.buttons[6]?.value??0)>.3 || keyboard.has('KeyQ'));
    requestAnimationFrame(frame);
    return;
  }
  if (arcade) {
    const held=keyboard.has('KeyX') || !!gamepad?.buttons[5]?.pressed || frankTouchSilk;
    const release=(arcade.silkHeld || input?.fire || (actions|frankTouchButtons)&2) && !held ? releaseSilkButton : 0;
    const buttons=actions|frankTouchButtons|(input?.jump ? 1 : 0)|(input?.fire ? 2 : 0)|release|(!navigation && crossPressed ? arcadeEscapeButton : 0);
    frankTouchButtons=0;
    arcadeFrame(arcade,elapsed,move,keys.aim??input?.aim,buttons,
      paused || !!navigation || dialogOpen() || document.hidden);
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
  const introTrack='first';
  const startsAt=huntStartsAt;
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
      if (advanceArena(arena,command,arenaFeedback)!=='over') continue;
      remainder=0;
      audio.play('miss');
      startIntro(true);
      requestAnimationFrame(frame);
      return;
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
    seconds<=5 ? 'urgent' : hunt.time<20 ? 'low' : 'running';
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
