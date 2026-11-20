import './style.css';
import {area} from './area';
import {aimHit, createSpider, DEFAULT_TUNING, detach, shoot, tickSpider, type Point} from './spider';
import {drawScene} from './web-render';

const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>('world');
const context = canvas.getContext('2d', {alpha:false})!;
const message = get('message');
const audioButton = get<HTMLButtonElement>('sound');
const touch = matchMedia('(pointer: coarse)');
const tuning = {...DEFAULT_TUNING};
const tuningKeys = ['range', 'acceleration', 'reelSpeed'] as const;
const keys = new Set<string>();
const held = new Map<number, string>();
const soundKey = 'tamago.audio';
let audioOn = true;
let audio: AudioContext | undefined;
try { audioOn = localStorage.getItem(soundKey) !== 'off'; } catch { /* File previews can deny storage. */ }

let checkpoint = 0;
let spider = createSpider(area.spawn);
let discovered = false;
let finished = false;
const initialAim = {x:40,y:-63};
let keyboardAim = {...initialAim};
let touchAim: number | undefined;
let touchPoint: Point | undefined;
let landedAt = -Infinity;
let shot: {from:Point; to:Point; hit:boolean; until:number} | undefined;
let camera: Point = {x:0,y:0};

function say(text: string) {
  if (message.textContent !== text) message.textContent = text;
}

function intro() {
  return touch.matches
    ? 'Trascina sul paesaggio verso il rametto e rilascia per lanciare la seta.'
    : 'Tieni Spazio, punta il rametto con le frecce e rilascia Spazio per agganciarti.';
}
say(intro());

const tones = {
  attach:[680, 920], miss:[270, 175], release:[470, 310],
  land:[195], discovery:[520, 660, 880], start:[420],
};
function play(effect: keyof typeof tones) {
  if (!audioOn || !audio) return;
  if (audio.state !== 'running') void audio.resume().catch(() => {});
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime;
  oscillator.type = 'triangle';
  const notes = tones[effect];
  notes.forEach((note, i) => oscillator.frequency.setValueAtTime(note, start + i * .065));
  gain.gain.setValueAtTime(.12, start);
  gain.gain.exponentialRampToValueAtTime(.001, start + notes.length * .065 + .06);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + notes.length * .065 + .06);
}
function unlock() {
  if (!audioOn) return;
  try {
    if (!audio) {
      audio = new AudioContext();
      play('start');
    } else if (audio.state !== 'running') void audio.resume().catch(() => {});
  } catch { /* Audio is optional in browsers that block playback. */ }
}
function audioLabel() {
  audioButton.textContent = audioOn ? 'Audio On' : 'Audio Off';
  audioButton.setAttribute('aria-pressed', String(audioOn));
}
audioLabel();
audioButton.onclick = () => {
  audioOn = !audioOn;
  try { localStorage.setItem(soundKey, audioOn ? 'on' : 'off'); } catch { /* Keep the setting for this session. */ }
  if (audioOn) unlock();
  else if (audio?.state === 'running') void audio.suspend().catch(() => {});
  audioLabel();
};
window.addEventListener('keydown', unlock);
window.addEventListener('pointerup', event => {
  if (event.target !== audioButton) unlock();
}, {capture:true});

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

function screenPoint(event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {x:(event.clientX - rect.left) * canvas.width / rect.width,
    y:(event.clientY - rect.top) * canvas.height / rect.height};
}
function worldAim() {
  if (touchAim !== undefined && touchPoint) {
    return {x:camera.x + touchPoint.x,y:camera.y + touchPoint.y};
  }
  return {x:spider.x + keyboardAim.x,y:spider.y + keyboardAim.y};
}
function fire(target: Point) {
  const from = {x:spider.x,y:spider.y};
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return;

  const hit = shoot(spider, area.surfaces, target, tuning);
  const length = tuning.range / distance;
  const to = hit && spider.rope
    ? {x:spider.rope.x,y:spider.rope.y}
    : {x:from.x + dx * length,y:from.y + dy * length};
  shot = {from,to,hit,until:performance.now() + 160};
  play(hit ? 'attach' : 'miss');
  const firstCrossing = checkpoint === 0 && from.x < area.checkpoints[0].x;
  const instructions = firstCrossing
    ? (touch.matches ? 'Tieni ▶, poi tocca Stacca sopra la foglia.'
      : 'Tieni D per dondolare, poi premi S sopra la foglia.')
    : touch.matches
    ? 'Dai slancio con le frecce. Tocca Risali o Stacca.'
    : 'Dai slancio con A/D. Risali con W o staccati con S.';
  say(hit ? instructions : 'Nessun appiglio. Punta un rametto.');
}
function releaseRope() {
  if (!spider.rope) return;
  detach(spider);
  play('release');
  say(touch.matches ? 'Puoi mirare di nuovo mentre sei in aria.' : 'Puoi mirare con Spazio anche mentre sei in aria.');
}

window.addEventListener('pointermove', event => {
  if (event.pointerId === touchAim) touchPoint = screenPoint(event);
});
canvas.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' || touchAim !== undefined) return;
  touchPoint = screenPoint(event);
  canvas.setPointerCapture(event.pointerId);
  touchAim = event.pointerId;
});
canvas.addEventListener('pointerup', event => {
  if (event.pointerId !== touchAim) return;
  touchPoint = screenPoint(event);
  const target = worldAim();
  touchAim = undefined;
  fire(target);
});
function cancelAim(event: PointerEvent) {
  if (event.pointerId !== touchAim) return;
  touchAim = undefined;
}
canvas.addEventListener('pointercancel', cancelAim);
canvas.addEventListener('lostpointercapture', cancelAim);

const aimKeys: Record<string, Point> = {
  ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0}, ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1},
};
const commands = new Set([...Object.keys(aimKeys), 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

function moveAim(dx: number, dy: number) {
  const x = keyboardAim.x + dx;
  const y = keyboardAim.y + dy;
  const scale = Math.max(1, Math.hypot(x, y) / tuning.range);
  keyboardAim = {x:x / scale,y:y / scale};
}
window.addEventListener('keydown', event => {
  if (!commands.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof HTMLElement && (event.target.closest('input') ||
    (event.code === 'Space' && event.target.closest('button, summary')))) return;
  event.preventDefault();
  if (event.code === 'KeyS' && !event.repeat) releaseRope();
  const direction = aimKeys[event.code];
  if (direction && keys.has('Space') && !keys.has(event.code)) moveAim(direction.x * 4, direction.y * 4);
  keys.add(event.code);
});
window.addEventListener('keyup', event => {
  if (!keys.delete(event.code)) return;
  event.preventDefault();
  if (event.code === 'Space' && touchAim === undefined) fire(worldAim());
});
for (const [id, key] of [['left','KeyA'], ['right','KeyD'], ['reel','KeyW']]) {
  const button = get(id);
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    held.set(event.pointerId, key);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    button.addEventListener(event, pointer => held.delete(pointer.pointerId));
  }
}
get('detach').onclick = releaseRope;
function clearInput() {
  keys.clear();
  held.clear();
  touchAim = undefined;
}
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInput();
});

function goal(check: Point, radius: number) {
  return Math.hypot(spider.x - check.x, spider.y - check.y) < radius;
}
function update(dt: number, time: number) {
  const isHeld = (key: string) => keys.has(key) || [...held.values()].includes(key);
  const move = (Number(isHeld('KeyD')) - Number(isHeld('KeyA'))) as -1 | 0 | 1;
  if (keys.has('Space')) {
    const dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
    const dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
    if (dx || dy) {
      const speed = 112 * dt / Math.hypot(dx, dy);
      moveAim(dx * speed, dy * speed);
    }
  }
  const wasGrounded = spider.grounded;
  const landingSpeed = spider.vy;
  tickSpider(spider, area.surfaces, {move,reel:isHeld('KeyW')}, dt, tuning);
  if (spider.grounded && !wasGrounded) {
    landedAt = time;
    if (landingSpeed > 30) play('land');
  }

  if (spider.y > area.bounds.bottom || spider.x < area.bounds.left - 20 || spider.x > area.bounds.right + 20) {
    spider = createSpider(checkpoint ? area.checkpoints[checkpoint - 1] : area.spawn);
    shot = undefined;
    keyboardAim = {...initialAim};
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
    play('discovery');
    say('Rugiada trovata! Hai raggiunto il sentiero alto.');
  }
  if (!finished && goal(area.finish, 17)) {
    finished = true;
    say(discovered ? 'Area completata · rugiada trovata.'
      : 'Area completata. Puoi tornare a cercare la rugiada in alto.');
    play('discovery');
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
  while (remainder >= step) {
    update(step,time);
    remainder -= step;
  }
  camera = locateCamera();
  const aim = keys.has('Space') || touchAim !== undefined ? worldAim() : undefined;
  const hit = aim ? aimHit(spider, area.surfaces, aim, tuning) : undefined;
  drawScene(context, area, spider, {camera,time,aim,hit,shot,landedAt,discovered});
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (import.meta.env.PROD && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline non disponibile', error));
}
