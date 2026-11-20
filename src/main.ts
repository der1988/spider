import './style.css';
import {area} from './area';
import {aimHit, createSpider, DEFAULT_TUNING, detach, shoot, tickSpider, type Point} from './spider';
import {drawScene} from './web-render';
import {createWeb, fixSilk, leaveSilk, tickFlies, WEB_KEY} from './threads';
import {Soundscape} from './soundscape';
import {AimGesture} from './aim-gesture';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('world');
const context = canvas.getContext('2d', {alpha:false})!;
const message = get('message');
const audioButton = get<HTMLButtonElement>('sound');
const touch = matchMedia('(pointer: coarse)');
const tuning = {...DEFAULT_TUNING};
const tuningKeys = ['range', 'acceleration', 'reelSpeed'] as const;
const keys = new Set<string>();
const gamepadGuide = get('gamepad-guide');
const soundKey = 'tamago.audio';
let audioOn = true;

let savedWeb: string | null = null;
try {
  audioOn = localStorage.getItem(soundKey) !== 'off';
  savedWeb = localStorage.getItem(WEB_KEY);
} catch { /* File previews can deny storage. */ }
const web = createWeb(savedWeb);
const audio = new Soundscape(audioOn);
const count = get<HTMLOutputElement>('web-count');
let catches = 0;
let flyTime = 0;
let catchLook: {point:Point; until:number} | undefined;
let taut = false;
let lastTension = -Infinity;
let lastBuzz = 0;
let stride = 0;
let stepFace = 1;
let walkingInput = false;
let idlePose: {kind:'groom'|'probe'|'freeze'; since:number; until:number} | undefined;
let nextIdle = 2700;
let flyNearby = false;
let ropeReach = tuning.range;

function updateCount() {
  count.value = web.strands.length + (web.strands.length === 1 ? ' filo' : ' fili') +
    ' · ' + catches + (catches === 1 ? ' mosca' : ' mosche');
}
updateCount();

let checkpoint = 0;
let spider = createSpider(area.spawn);
let discovered = false;
let finished = false;
const initialAim = {x:40,y:-63};
let aimOffset = {...initialAim};
const touchGesture = new AimGesture();
const padGesture = new AimGesture();
let padIndex: number | undefined;
let gamepadAvailable = typeof navigator.getGamepads === 'function';
let padMove = 0;
let padReel = false;
let padDetach = false;
let reelPointer: number | undefined;
let landedAt = -Infinity;
let shot: {from:Point; to:Point; hit:boolean; until:number} | undefined;
let camera: Point = {x:0,y:0};

function say(text: string) {
  if (message.textContent !== text) message.textContent = text;
}

function intro() {
  return touch.matches || padIndex !== undefined
    ? 'Inclina lo stick destro verso il rametto, poi lascialo al centro per tirare.'
    : 'Tieni Spazio, punta il rametto con le frecce e rilascia Spazio per agganciarti.';
}
say(intro());

function audioLabel() {
  audioButton.textContent = audioOn ? 'Audio On' : 'Audio Off';
  audioButton.setAttribute('aria-pressed', String(audioOn));
}
audioLabel();
audioButton.onclick = () => {
  audioOn = !audioOn;
  try { localStorage.setItem(soundKey, audioOn ? 'on' : 'off'); } catch { /* Keep the setting for this session. */ }
  audio.setEnabled(audioOn);
  audioLabel();
};
for (const type of ['keydown', 'pointerdown', 'pointerup', 'touchend', 'click'] as const) {
  window.addEventListener(type, event => {
    if (event.target !== audioButton) audio.unlock();
  }, {capture:true, passive:true});
}

for (const name of tuningKeys) {
  const input = get<HTMLInputElement>(name);
  input.oninput = () => {
    tuning[name] = Number(input.value);
    get(name + '-value').textContent = input.value;
  };
}
function syncTuning() {
  for (const name of tuningKeys) {
    get<HTMLInputElement>(name).value = String(tuning[name]);
    get(name + '-value').textContent = String(tuning[name]);
  }
}
get('reset-tuning').onclick = () => {
  Object.assign(tuning, DEFAULT_TUNING);
  syncTuning();
};
syncTuning();

function worldAim() {
  return {x:spider.x + aimOffset.x,y:spider.y + aimOffset.y};
}
function fire(target: Point) {
  const from = {x:spider.x,y:spider.y};
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return;

  const previousRope = spider.rope;
  const hit = shoot(spider, area.surfaces, target, tuning);
  audio.play('launch');
  if (hit) {
    if (previousRope) leaveSilk(web,previousRope,ropeReach);
    ropeReach = tuning.range;
    taut = false;
  }
  const length = tuning.range / distance;
  const to = hit && spider.rope
    ? {x:spider.rope.x,y:spider.rope.y}
    : {x:from.x + dx * length,y:from.y + dy * length};
  shot = {from,to,hit,until:performance.now() + 160};
  audio.play(hit ? 'attach' : 'miss',.075);
  const firstCrossing = checkpoint === 0 && from.x < area.checkpoints[0].x;
  const instructions = firstCrossing
    ? (padIndex !== undefined ? 'Dondola a destra con lo stick sinistro, poi premi B/○ sopra la foglia.'
      : touch.matches ? 'Spingi lo stick sinistro a destra, poi tocca Stacca sopra la foglia.'
      : 'Tieni D per dondolare, poi premi S sopra la foglia.')
    : padIndex !== undefined ? 'Dondola con lo stick sinistro, risali con LB/L1 o staccati con B/○.'
    : touch.matches
    ? 'Dondola con lo stick sinistro. Tocca Risali o Stacca.'
    : 'Dai slancio con A/D. Risali con W o staccati con S.';
  say(hit ? instructions : 'Nessun appiglio. Punta un rametto.');
}
function releaseRope() {
  if (!spider.rope) return;
  leaveSilk(web,spider.rope,ropeReach);
  detach(spider);
  taut = false;
  audio.play('release');
  say(touch.matches || padIndex !== undefined ? 'Puoi mirare di nuovo mentre sei in aria.' : 'Puoi mirare con Spazio anche mentre sei in aria.');
}

function analog(id: string, onMove?: (point: Point) => void, onEnd?: (released: boolean) => void) {
  const element = get(id);
  let pointer: number | undefined;
  let position = {x:0,y:0};
  const paint = (x: number, y: number) => {
    element.style.setProperty('--stick-x', x + 'px');
    element.style.setProperty('--stick-y', y + 'px');
  };
  function read(event: PointerEvent) {
    const rect = element.getBoundingClientRect();
    const radius = rect.width * .32;
    const x = (event.clientX - rect.left - rect.width / 2) / radius;
    const y = (event.clientY - rect.top - rect.height / 2) / radius;
    const scale = Math.max(1,Math.hypot(x,y));
    position = {x:x / scale,y:y / scale};
    paint(position.x * radius,position.y * radius);
    onMove?.(position);
  }
  function reset() {
    pointer = undefined;
    position = {x:0,y:0};
    paint(0,0);
  }
  element.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointer !== undefined) return;
    element.setPointerCapture(event.pointerId);
    pointer = event.pointerId;
    read(event);
  });
  element.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) read(event);
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture'] as const) {
    element.addEventListener(type,event => {
      if (event.pointerId !== pointer) return;
      onEnd?.(type === 'pointerup');
      reset();
    });
  }
  element.addEventListener('contextmenu',event => event.preventDefault());
  return {read:() => position,reset};
}
function setDirection(point: Point) {
  const radius = Math.min(tuning.range,75);
  aimOffset = {x:point.x*radius,y:point.y*radius};
}

function sampleAim(gesture: AimGesture, point: Point, time: number) {
  const fired = gesture.sample(point,time);
  if (gesture.aiming && gesture.angle) setDirection(gesture.angle);
  if (fired) {
    setDirection(fired);
    fire(worldAim());
  }
}

const movementStick = analog('stick');
const aimStick = analog('aim-stick', point => sampleAim(touchGesture,point,performance.now()), released => {
  if (released) sampleAim(touchGesture,{x:0,y:0},performance.now());
  // A new touch has its own pointer and no physical stick bounce.
  touchGesture.reset();
});

const reel = get<HTMLButtonElement>('reel');
reel.addEventListener('pointerdown',event => {
  if (event.button !== 0 || reelPointer !== undefined) return;
  reel.setPointerCapture(event.pointerId);
  reelPointer = event.pointerId;
});
for (const type of ['pointerup','pointercancel','lostpointercapture'] as const) {
  reel.addEventListener(type,event => {
    if (event.pointerId === reelPointer) reelPointer = undefined;
  });
}
get('unhook').onclick = releaseRope;

function resetPad() {
  padIndex = undefined;
  padMove = 0;
  padReel = false;
  padDetach = false;
  padGesture.reset(true);
  gamepadGuide.hidden = true;
}

function pollPad(time: number) {
  if (document.hidden || !gamepadAvailable) return;
  let gamepads: (Gamepad | null)[];
  try {
    gamepads = Array.from(navigator.getGamepads());
  } catch {
    gamepadAvailable = false;
    resetPad();
    return;
  }
  const pad = gamepads.find(p => p?.connected && p.mapping === 'standard');
  if (!pad) {
    if (padIndex !== undefined) resetPad();
    return;
  }
  if (pad.index !== padIndex) {
    resetPad();
    padIndex = pad.index;
    gamepadGuide.hidden = false;
    if (message.textContent?.includes('rametto')) say(intro());
  }
  padMove = pad.axes[0] ?? 0;
  padReel = !!(pad.buttons[4]?.pressed || pad.buttons[6]?.pressed);
  const detachHeld = !!pad.buttons[1]?.pressed;
  if (detachHeld && !padDetach) releaseRope();
  padDetach = detachHeld;
  sampleAim(padGesture,{x:pad.axes[2] ?? 0,y:pad.axes[3] ?? 0},time);
}

window.addEventListener('gamepaddisconnected',event => {
  if (event.gamepad.index === padIndex) resetPad();
});

const aimKeys: Record<string, Point> = {
  ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0}, ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1},
};
const commands = new Set([...Object.keys(aimKeys), 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

function moveAim(dx: number, dy: number) {
  const x = aimOffset.x + dx;
  const y = aimOffset.y + dy;
  const scale = Math.max(1, Math.hypot(x, y) / tuning.range);
  aimOffset = {x:x / scale,y:y / scale};
}
window.addEventListener('keydown', event => {
  if (!commands.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && (event.target.closest('input') ||
    (event.code === 'Space' && event.target.closest('button, summary')))) return;
  event.preventDefault();
  if (event.code === 'KeyS' && !event.repeat) releaseRope();
  const direction = aimKeys[event.code];
  if (direction && !keys.has(event.code)) moveAim(direction.x * 4, direction.y * 4);
  keys.add(event.code);
});
window.addEventListener('keyup', event => {
  if (!keys.delete(event.code)) return;
  event.preventDefault();
  if (event.code === 'Space') fire(worldAim());
});
function clearInput() {
  keys.clear();
  movementStick.reset();
  aimStick.reset();
  touchGesture.reset();
  reelPointer = undefined;
  resetPad();
}
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInput();
});

function goal(check: Point, radius: number) {
  return Math.hypot(spider.x - check.x, spider.y - check.y) < radius;
}
function update(dt: number, time: number) {
  const stick = movementStick.read();
  const moveKey = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const x = Math.abs(stick.x) > .16 ? stick.x : padMove;
  const move = moveKey || Math.sign(x) * Math.max(0,(Math.abs(x) - .16) / .84);
  const dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
  const dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
  if (dx || dy) {
    const speed = 112 * dt / Math.hypot(dx,dy);
    moveAim(dx * speed,dy * speed);
  }
  const reeling = keys.has('KeyW') || reelPointer !== undefined || padReel;
  const wasGrounded = spider.grounded;
  const oldX = spider.x;
  const landingSpeed = spider.vy;
  tickSpider(spider, area.surfaces, {move,reel:reeling}, dt, tuning);
  const lineTaut = spider.rope !== undefined &&
    Math.hypot(spider.x-spider.rope.x,spider.y-spider.rope.y) >= spider.rope.length - .6;
  walkingInput = !!move;
  if (move) stepFace = Math.sign(move);
  if (wasGrounded && spider.grounded) {
    stride += Math.max(Math.abs(spider.x-oldX),Math.abs(move)*dt*20) * Math.PI/8;
  }
  if (lineTaut && (!taut || reeling) && time - lastTension > 510) {
    lastTension = time;
    audio.play('tension');
  }
  taut = lineTaut;
  if (fixSilk(web,spider,area.surfaces)) {
    try { localStorage.setItem(WEB_KEY,JSON.stringify(web.strands.map(({from,to}) => ({from,to})))); } catch { /* Keep the web in memory. */ }
    updateCount();
    audio.play('fix');
    say('Filo fissato. Le mosche possono restare nella trama.');
  }
  flyTime += dt;
  const caught = tickFlies(web,flyTime,time);
  if (caught.length) {
    catches += caught.length;
    updateCount();
    for (const point of caught) {
      if (Math.hypot(point.x-spider.x,point.y-spider.y) < 95) catchLook = {point,until:time+850};
    }
    audio.play('catch');
    say(caught.length === 1 ? 'Una mosca è rimasta nella ragnatela!' : 'Altre mosche nella ragnatela!');
  }
  const restless = !!move || reeling || !spider.grounded || dx !== 0 || dy !== 0 ||
    keys.has('Space') || touchGesture.aiming || padGesture.aiming ||
    (shot !== undefined && shot.until > time);
  if (restless) {
    idlePose = undefined;
    nextIdle = time + 2100 + Math.random()*2500;
  } else {
    const close = web.flies.some(fly => fly.caughtAt === undefined &&
      Math.hypot(fly.position.x-spider.x,fly.position.y-spider.y) < 31);
    if (!idlePose || idlePose.until < time) {
      idlePose = undefined;
      if (close && !flyNearby) {
        idlePose = {kind:'freeze',since:time,until:time+380};
      } else if (time > nextIdle) {
        const kind = Math.random() < .55 ? 'groom' : 'probe';
        idlePose = {kind,since:time,until:time+(kind === 'groom' ? 820 : 610)};
        nextIdle = time + 2350 + Math.random()*3800;
      }
    }
    flyNearby = close;
  }
  if (time-lastBuzz > 60) {
    lastBuzz = time;
    const distances = web.flies.filter(fly => fly.caughtAt === undefined)
      .map(fly => Math.hypot(fly.position.x-spider.x,fly.position.y-spider.y));
    audio.nearby(Math.min(...distances),time);
  }
  if (spider.grounded && !wasGrounded) {
    landedAt = time;
    if (landingSpeed > 30) audio.play('land');
  }

  if (spider.y > area.bounds.bottom || spider.x < area.bounds.left - 20 || spider.x > area.bounds.right + 20) {
    spider = createSpider(checkpoint ? area.checkpoints[checkpoint - 1] : area.spawn);
    shot = undefined;
    web.loose.length = 0;
    taut = false;
    aimOffset = {...initialAim};
    touchGesture.reset(true);
    padGesture.reset(true);
    say('Riprova dal punto sicuro. ' + (checkpoint ? 'Cerca il prossimo appiglio sopra di te.' : intro()));
    return;
  }

  for (let index = checkpoint; index < area.checkpoints.length; index++) {
    if (!spider.grounded || !goal(area.checkpoints[index], 24)) continue;
    checkpoint = index + 1;
    say(index === 0 ? 'Prima sponda! Usa il filo per risalire verso la prossima foglia.'
      : 'Punto sicuro. Cerca la rugiada in alto con due lanci in aria.');
  }
  if (!discovered && goal(area.discovery, 15)) {
    discovered = true;
    audio.play('discovery');
    say('Rugiada trovata! Hai raggiunto il sentiero alto.');
  }
  if (!finished && goal(area.finish, 17)) {
    finished = true;
    say(discovered ? 'Area completata · rugiada trovata.'
      : 'Area completata. Puoi tornare a cercare la rugiada in alto.');
    audio.play('discovery');
  }
}

function locateCamera() {
  const maxX = Math.max(area.bounds.left, area.bounds.right - canvas.width);
  const x = Math.max(area.bounds.left, Math.min(maxX, spider.x - canvas.width * .34));
  const y = Math.max(area.bounds.top, Math.min(area.bounds.bottom - canvas.height, spider.y - canvas.height * .79));
  return {x:Math.round(x),y:Math.round(y)};
}
function resize() {
  canvas.height = 200;
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * 200 / Math.max(1, canvas.clientHeight)));
  camera = locateCamera();
}
window.addEventListener('resize', resize);
resize();

let lastFrame = 0;
let remainder = 0;
const step = 1 / 120;
function frame(time: number) {
  remainder += Math.min(.05, (time - (lastFrame || time)) / 1000);
  lastFrame = time;
  pollPad(time);
  sampleAim(touchGesture,aimStick.read(),time);
  while (remainder >= step) {
    update(step,time);
    remainder -= step;
  }
  camera = locateCamera();
  const aim = worldAim();
  const hit = aimHit(spider,area.surfaces,aim,tuning);
  const aiming = keys.has('Space') || Object.keys(aimKeys).some(key => keys.has(key)) ||
    touchGesture.aiming || padGesture.aiming;
  get('aim-stick').dataset.aiming = String(touchGesture.aiming);
  drawScene(context,area,spider,{
    camera,time,aim,hit,aiming,shot,landedAt,discovered,web,catchLook,
    stride,walkingInput,stepFace,taut,idlePose,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline non disponibile', error));
}
