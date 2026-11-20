import './style.css';
import {area, loopShift, loopSurfaces} from './area';
import {aimHit, createSpider, DEFAULT_TUNING, detach, queueJump, shoot, tickSpider, type Point} from './spider';
import {drawScene} from './web-render';
import {availableAnchors, bridgePreview, buildBridge, createWeb, fixSilk, leaveSilk, recoverFlies, tickFlies, WEB_KEY} from './threads';
import {Soundscape} from './soundscape';
import {samplePlayStation, silkMotion} from './pad-controls';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('world');
const context = canvas.getContext('2d', {alpha:false})!;
const message = get('message');
const audioButton = get<HTMLButtonElement>('sound');
const tuning = {...DEFAULT_TUNING};
const tuningKeys = ['range', 'acceleration', 'reelSpeed'] as const;
const gamepadGuide = get('gamepad-guide');
const altitude = get('altitude');
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
let padIndex: number | undefined;
let gamepadAvailable = typeof navigator.getGamepads === 'function';
let padStick = {x:0,y:0};
let shoulders: ReturnType<typeof samplePlayStation>['shoulders'] | undefined;
let aiming = false;
let downHeld = false;

let landedAt = -Infinity;
let shot: {from:Point; to:Point; hit:boolean; until:number} | undefined;
let traveledOffset = 0;

function say(text: string) {
  if (message.textContent !== text) message.textContent = text;
}

const waitingForPad = 'Collega il joypad PlayStation al PC e premi un tasto.';
const intro = 'Mira con lo stick destro e premi R1. Sali fino al germoglio in cima.';
say(waitingForPad);

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
for (const type of ['keydown','pointerdown','click'] as const) {
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
  say(hit ? 'Stick sinistro su per risalire, giù per staccarti. Mira più in alto e premi R1.'
    : 'Nessun appiglio. Punta una foglia o un rametto.');
}
function releaseRope() {
  if (!spider.rope) return;
  leaveSilk(web,spider.rope,ropeReach);
  detach(spider);
  taut = false;
  audio.play('release');
  say('Puoi lanciare di nuovo con R1 anche in aria.');
}

function resetPad() {
  padIndex = undefined;
  padStick = {x:0,y:0};
  shoulders = undefined;
  aiming = false;
  downHeld = false;
  spider.jumpBuffer = 0;
  gamepadGuide.hidden = true;
  say(waitingForPad);
}

function pollPad() {
  if (document.hidden || !gamepadAvailable) return;
  let gamepads: (Gamepad | null)[];
  try {
    gamepads = Array.from(navigator.getGamepads());
  } catch {
    gamepadAvailable = false;
    resetPad();
    return;
  }
  const current = gamepads.find(p => p && p.index === padIndex && p.connected && p.mapping === 'standard');
  const pad = current ?? gamepads.find(p => p?.connected && p.mapping === 'standard');
  if (!pad) {
    if (padIndex !== undefined) resetPad();
    return;
  }
  if (pad.index !== padIndex) {
    resetPad();
    padIndex = pad.index;
    gamepadGuide.hidden = false;
    say(intro);
  }
  const input = samplePlayStation(pad,shoulders);
  shoulders = input.shoulders;
  padStick = input.movement;
  aiming = !!input.aim;
  if (input.aim) aimOffset = {x:input.aim.x*75,y:input.aim.y*75};
  if (input.jump) queueJump(spider);
  if (input.fire) fire(worldAim());
}

window.addEventListener('gamepaddisconnected',event => {
  if (event.gamepad.index === padIndex) resetPad();
});
document.addEventListener('visibilitychange',() => {
  if (document.hidden) resetPad();
  audio.setPaused(document.hidden);
});

function goal(check: Point, radius: number) {
  return Math.hypot(spider.x - check.x, spider.y - check.y) < radius;
}
function update(dt: number, time: number) {
  const deadZone = .12;
  const x = padStick.x;
  const analogMove = Math.max(0,(Math.abs(x)-deadZone)/(1-deadZone));
  const move = Math.sign(x)*Math.pow(analogMove,.8);
  const vertical = silkMotion(padStick,downHeld);
  downHeld = vertical.down;
  if (vertical.detach) releaseRope();
  const reeling = vertical.reel;
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
  const restless = !!move || reeling || !spider.grounded || aiming ||
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
    say('Riprova dal punto sicuro. ' + (checkpoint ? 'Cerca il prossimo appiglio sopra di te.' : intro));
    return;
  }

  for (let index = checkpoint; index < area.checkpoints.length; index++) {
    const perch = area.checkpoints[index];
    const reachedBelow = index >= 4 && spider.rope &&
      Math.abs(spider.rope.x-perch.x) < 31 &&
      Math.abs(spider.rope.y-perch.y-8) <= 8 &&
      Math.hypot(spider.x-perch.x,spider.y-perch.y) < 43;
    if (!(spider.grounded && goal(perch,24)) && !reachedBelow) continue;
    checkpoint = index + 1;
    say(index === 0 ? 'Prima sponda! Usa il filo per risalire verso la prossima foglia.'
      : 'Punto sicuro. Cerca la prossima foglia sopra di te.');
  }
  if (!web.reward && goal(area.bridgeDiscovery,15)) {
    web.reward = true;
    audio.play('discovery');
    say('Seme d’ambra trovato! Puoi riattraversare il ponte.');
  }
  if (!discovered && goal(area.discovery, 15)) {
    discovered = true;
    audio.play('discovery');
    say('Rugiada trovata! Segui le foglie a zig zag per salire ancora.');
  }
  if (!finished && goal(area.finish, 17)) {
    finished = true;
    say('Cima raggiunta! Hai trovato il germoglio della chioma.');
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
  pollPad();
  if (padIndex !== undefined) {
    remainder += elapsed;
    while (remainder >= step) {
      update(step,time);
      remainder -= step;
    }
  } else {
    remainder = 0;
  }
  const height = 'Quota '+Math.max(0,Math.floor((area.spawn.y-spider.y)/4));
  if (altitude.textContent !== height) altitude.textContent = height;
  const playerScreen = {x:Math.floor(canvas.width/2),y:Math.floor(canvas.height*.74)};
  const camera = {x:spider.x-playerScreen.x,y:spider.y-playerScreen.y};
  const aim = worldAim();
  const extended = bridgePreview(web,spider,loopSurfaces,aim,tuning.range);
  const hit = extended?.to ?? aimHit(spider,loopSurfaces,aim,tuning);
  const anchors = availableAnchors(web,spider,loopSurfaces,tuning.range);
  drawScene(context,area,spider,{
    camera,playerScreen,backgroundX:camera.x+traveledOffset,time,aim,hit,aiming,shot,landedAt,discovered,finished,web,catchLook,
    stride,walkingInput,stepFace,taut,idlePose,anchors,extended:!!extended,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline non disponibile', error));
}
