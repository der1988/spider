import './style.css';
import {area, loopShift, loopSurfaces} from './area';
import {aimHit, createSpider, DEFAULT_TUNING, detach, queueJump, shoot, tickSpider, type Point} from './spider';
import {drawScene} from './web-render';
import {availableAnchors, bridgePreview, buildBridge, createWeb, fixSilk, leaveSilk, recoverFlies, tickFlies, WEB_KEY} from './threads';
import {Soundscape} from './soundscape';
import {AimGesture, silkMotion} from './aim-gesture';
import {preventGameZoom} from './touch-zoom';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const scene = get('scene');
const canvas = get<HTMLCanvasElement>('world');
const context = canvas.getContext('2d', {alpha:false})!;
const message = get('message');
const audioButton = get<HTMLButtonElement>('sound');
const touch = matchMedia('(any-pointer: coarse)');
const portrait = matchMedia('(orientation: portrait)');
preventGameZoom();
const tuning = {...DEFAULT_TUNING};
const tuningKeys = ['range', 'acceleration', 'reelSpeed'] as const;
const keys = new Set<string>();
const gamepadGuide = get('gamepad-guide');
const soundKey = 'tamago.audio';
let audioOn = true;

try {
  audioOn = localStorage.getItem(soundKey) !== 'off';
  localStorage.removeItem(WEB_KEY);
} catch { /* File previews can deny storage. */ }
const web = createWeb();
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
    ' · ' + catches + (catches === 1 ? ' mosca' : ' mosche') + ' · Seta ' + web.silk;
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
let padStick = {x:0,y:0};
let downHeld = false;
let padReel = false;
let padDetach = false;
let padJump = false;

let landedAt = -Infinity;
let shot: {from:Point; to:Point; hit:boolean; until:number} | undefined;
let traveledOffset = 0;

function say(text: string) {
  if (message.textContent !== text) message.textContent = text;
}

function intro() {
  if (padIndex !== undefined) return 'Inclina lo stick destro verso il rametto e rilascialo per tirare.';
  return touch.matches || scene.dataset.touch === 'true'
    ? 'Trascina a sinistra per muoverti. Trascina a destra verso il rametto e rilascia per tirare.'
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

  audio.play('launch');
  const bridge = buildBridge(web,spider,loopSurfaces,target,tuning.range);
  if (bridge) {
    shot = {from,to:bridge.to,hit:true,until:performance.now()+160};
    audio.play('attach',.075);
    updateCount();
    say('Filo portante teso! Cammina sul ponte fino alla foglia alta.');
    return;
  }
  const previousRope = spider.rope;
  const hit = shoot(spider, loopSurfaces, target, tuning);
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
    ? (padIndex !== undefined || touch.matches ? 'Giù stacca: tendi un filo qui per le mosche, oppure dondola verso la foglia.'
      : 'S stacca: tendi un filo qui per le mosche, oppure dondola con D verso la foglia.')
    : padIndex !== undefined || touch.matches
    ? 'Muovi lo stick sinistro: di lato per dondolare, su per risalire, giù per staccarti.'
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
  let origin = {x:0,y:0};
  let radius = 1;
  let position = {x:0,y:0};

  function start(event: PointerEvent, bounds: DOMRect) {
    if (pointer !== undefined) return false;
    pointer = event.pointerId;
    origin = {x:event.clientX,y:event.clientY};
    element.style.left = origin.x-bounds.left+'px';
    element.style.top = origin.y-bounds.top+'px';
    element.hidden = false;
    radius = element.offsetWidth*.32;
    return true;
  }

  function move(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    const x = (event.clientX-origin.x)/radius;
    const y = (event.clientY-origin.y)/radius;
    const scale = Math.max(1,Math.hypot(x,y));
    position = {x:x/scale,y:y/scale};
    element.style.setProperty('--stick-x',position.x*radius+'px');
    element.style.setProperty('--stick-y',position.y*radius+'px');
    onMove?.(position);
  }

  function reset() {
    pointer = undefined;
    position = {x:0,y:0};
    element.hidden = true;
    element.style.removeProperty('--stick-x');
    element.style.removeProperty('--stick-y');
  }

  function end(event: PointerEvent, released: boolean) {
    if (event.pointerId !== pointer) return;
    if (released) move(event);
    onEnd?.(released);
    reset();
  }

  return {start,move,end,read:() => position,reset};
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

scene.addEventListener('pointerdown',event => {
  if (portrait.matches || event.button !== 0 || event.pointerType === 'mouse' ||
    (event.target instanceof Element && event.target.closest('button,input,details'))) return;
  const bounds = scene.getBoundingClientRect();
  const analog = event.clientX-bounds.left < bounds.width/2 ? movementStick : aimStick;
  if (!analog.start(event,bounds)) return;
  scene.dataset.touch = 'true';
  scene.setPointerCapture(event.pointerId);
  event.preventDefault();
});
scene.addEventListener('pointermove',event => {
  movementStick.move(event);
  aimStick.move(event);
});
for (const type of ['pointerup','pointercancel','lostpointercapture'] as const) {
  scene.addEventListener(type,event => {
    movementStick.end(event,type === 'pointerup');
    aimStick.end(event,type === 'pointerup');
  });
}
for (const type of ['selectstart','contextmenu'] as const) {
  scene.addEventListener(type,event => event.preventDefault());
}

function resetPad() {
  padIndex = undefined;
  padStick = {x:0,y:0};
  downHeld = false;
  padReel = false;
  padDetach = false;
  padJump = false;
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
  padStick = {x:pad.axes[0] ?? 0,y:pad.axes[1] ?? 0};
  padReel = !!(pad.buttons[4]?.pressed || pad.buttons[6]?.pressed);
  const detachHeld = !!pad.buttons[1]?.pressed;
  if (detachHeld && !padDetach) releaseRope();
  padDetach = detachHeld;
  const jumpHeld = !!pad.buttons[0]?.pressed;
  if (jumpHeld && !padJump) queueJump(spider);
  padJump = jumpHeld;
  sampleAim(padGesture,{x:pad.axes[2] ?? 0,y:pad.axes[3] ?? 0},time);
}

window.addEventListener('gamepaddisconnected',event => {
  if (event.gamepad.index === padIndex) resetPad();
});

const jumpButton = get<HTMLButtonElement>('jump');
jumpButton.addEventListener('pointerdown',event => {
  if (event.button !== 0) return;
  event.preventDefault();
  queueJump(spider);
});
jumpButton.addEventListener('click',event => {
  if (event.detail === 0) queueJump(spider);
});
jumpButton.addEventListener('contextmenu',event => event.preventDefault());

const aimKeys: Record<string, Point> = {
  ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0}, ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1},
};
const commands = new Set([...Object.keys(aimKeys), 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ']);

function moveAim(dx: number, dy: number) {
  const x = aimOffset.x + dx;
  const y = aimOffset.y + dy;
  const scale = Math.max(1, Math.hypot(x, y) / tuning.range);
  aimOffset = {x:x / scale,y:y / scale};
}
window.addEventListener('keydown', event => {
  if (portrait.matches || !commands.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && (event.target.closest('input') ||
    (event.code === 'Space' && event.target.closest('button, summary')))) return;
  event.preventDefault();
  if (event.code === 'KeyS' && !event.repeat) releaseRope();
  if (event.code === 'KeyJ' && !event.repeat) queueJump(spider);
  const direction = aimKeys[event.code];
  if (direction && !keys.has(event.code)) moveAim(direction.x * 4, direction.y * 4);
  keys.add(event.code);
});
window.addEventListener('keyup', event => {
  if (portrait.matches || !keys.delete(event.code)) return;
  event.preventDefault();
  if (event.code === 'Space') fire(worldAim());
});
function clearInput() {
  keys.clear();
  spider.jumpBuffer = 0;
  movementStick.reset();
  aimStick.reset();
  touchGesture.reset();
  downHeld = false;
  resetPad();
}
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInput();
});

const orientationCover = get('orientation-cover');
function syncOrientation() {
  scene.inert = portrait.matches;
  orientationCover.hidden = !portrait.matches;
  if (portrait.matches) clearInput();
  audio.setPaused(portrait.matches);
}
portrait.addEventListener('change',syncOrientation);
syncOrientation();

const lockAvailable = touch.matches && document.fullscreenEnabled &&
  typeof screen.orientation?.lock === 'function';
for (const id of ['fullscreen','portrait-fullscreen']) {
  const button = get<HTMLButtonElement>(id);
  button.hidden = !lockAvailable;
  button.onclick = async () => {
    const wasFullscreen = !!document.fullscreenElement;
    try {
      if (!wasFullscreen) await document.documentElement.requestFullscreen();
      await screen.orientation.lock('landscape');
    } catch {
      if (!wasFullscreen && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      if (portrait.matches) get('orientation-copy').textContent = 'Ruota il telefono per continuare.';
      else say('Il dispositivo non consente il blocco automatico.');
    }
  };
}

function goal(check: Point, radius: number) {
  return Math.hypot(spider.x - check.x, spider.y - check.y) < radius;
}
function update(dt: number, time: number) {
  const touchMove = movementStick.read();
  const deadZone = .12;
  const stick = Math.hypot(touchMove.x,touchMove.y) > deadZone ? touchMove : padStick;
  const moveKey = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const x = stick.x;
  const analogMove = Math.max(0,(Math.abs(x)-deadZone)/(1-deadZone));
  const move = moveKey || Math.sign(x)*Math.pow(analogMove,.8);
  const dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
  const dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
  if (dx || dy) {
    const speed = 112 * dt / Math.hypot(dx,dy);
    moveAim(dx * speed,dy * speed);
  }
  const vertical = silkMotion(stick,downHeld);
  downHeld = vertical.down;
  if (vertical.detach) releaseRope();
  const reeling = keys.has('KeyW') || vertical.reel || padReel;
  const wasGrounded = spider.grounded;
  const oldX = spider.x;
  const landingSpeed = spider.vy;
  const jumped = tickSpider(spider,loopSurfaces,{move,reel:reeling},dt,tuning,area.ramps.concat(web.strands));
  if (jumped) audio.play('jump');
  const lineTaut = spider.rope !== undefined &&
    Math.hypot(spider.x-spider.rope.x,spider.y-spider.rope.y) >= spider.rope.length - .6;
  walkingInput = !!move;
  if (move) stepFace = Math.sign(move);
  if (wasGrounded && spider.grounded) {
    stride += Math.max(Math.abs(spider.x-oldX),Math.abs(move)*dt*20) * Math.PI/8;
  }
  const shift = loopShift(spider.x);
  if (shift) {
    spider.x -= shift;
    traveledOffset += shift;
    if (spider.rope) spider.rope.x -= shift;
    for (const end of web.loose) end.from.x -= shift;
    const translate = (p: Point) => ({x:p.x-shift,y:p.y});
    if (shot) shot = {...shot,from:translate(shot.from),to:translate(shot.to)};
    if (catchLook) catchLook = {...catchLook,point:translate(catchLook.point)};
  }
  if (lineTaut && (!taut || reeling) && time - lastTension > 510) {
    lastTension = time;
    audio.play('tension');
  }
  taut = lineTaut;
  if (fixSilk(web,spider,loopSurfaces)) {
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
    say('Mosca impigliata! Cammina sul filo per recuperare la seta.');
  }
  if (recoverFlies(web,spider,time)) {
    updateCount();
    audio.play('discovery');
    say('Seta +1 per mosca. Da un appiglio marcato, mira alla foglia alta.');
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

  if (spider.y > area.bounds.bottom) {
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
  if (!web.reward && goal(area.bridgeDiscovery,15)) {
    web.reward = true;
    audio.play('discovery');
    say('Seme d’ambra trovato! Puoi riattraversare il ponte.');
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

function resize() {
  canvas.height = 200;
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * 200 / Math.max(1, canvas.clientHeight)));
}
window.addEventListener('resize', resize);
resize();

let lastFrame = 0;
let remainder = 0;
const step = 1 / 120;
function frame(time: number) {
  const elapsed = Math.min(.05,(time-(lastFrame || time))/1000);
  lastFrame = time;
  if (portrait.matches) {
    remainder = 0;
    requestAnimationFrame(frame);
    return;
  }
  remainder += elapsed;
  pollPad(time);
  sampleAim(touchGesture,aimStick.read(),time);
  while (remainder >= step) {
    update(step,time);
    remainder -= step;
  }
  const playerScreen = {x:Math.floor(canvas.width/2),y:Math.floor(canvas.height*.74)};
  const camera = {x:spider.x-playerScreen.x,y:spider.y-playerScreen.y};
  const aim = worldAim();
  const extended = bridgePreview(web,spider,loopSurfaces,aim,tuning.range);
  const hit = extended?.to ?? aimHit(spider,loopSurfaces,aim,tuning);
  const anchors = availableAnchors(web,spider,loopSurfaces,tuning.range);
  const aiming = keys.has('Space') || Object.keys(aimKeys).some(key => keys.has(key)) ||
    touchGesture.aiming || padGesture.aiming;
  get('aim-stick').dataset.aiming = String(touchGesture.aiming);
  drawScene(context,area,spider,{
    camera,playerScreen,backgroundX:camera.x+traveledOffset,time,aim,hit,aiming,shot,landedAt,discovered,web,catchLook,
    stride,walkingInput,stepFace,taut,idlePose,anchors,extended:!!extended,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline non disponibile', error));
}
