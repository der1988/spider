import './style.css';
import {act, advance, loadGame, movementEnergy, saveGame, type Action} from './game';
import {drawWorld} from './render';
import {discoveries, ready, travel, zoneAt, zoneIndex} from './world';

function element<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const actions = [
  ['feed','Nutri'], ['play','Gioca'], ['clean','Pulisci'], ['heal','Cura'],
] as const;
const fields = [
  ['hunger','Sazietà'], ['happiness','Felicità'], ['energy','Energia'],
  ['hygiene','Igiene'], ['health','Salute'],
] as const;
const stages = {egg:'UOVO', baby:'CUCCIOLO', teen:'ADOLESCENTE', adult:'ADULTO'};
const canvas = element<HTMLCanvasElement>('world');
const context = canvas.getContext('2d')!;
const message = element('message');
const soundButton = element<HTMLButtonElement>('sound');
const speed = import.meta.env.DEV && new URLSearchParams(location.search).has('rapido') ? 360 : 1;
const epoch = Date.UTC(2025, 0, 1);
const now = () => epoch + (Date.now() - epoch) * speed;
const storage = {
  getItem: (key: string) => localStorage.getItem(speed === 1 ? key : 'demo:' + key),
  setItem: (key: string, value: string) => localStorage.setItem(speed === 1 ? key : 'demo:' + key, value),
};
const soundKey = 'tamago.audio';
let state = loadGame(storage, now());
let sound = true;
try { sound = localStorage.getItem(soundKey) !== 'off'; } catch { /* Storage can be unavailable. */ }

type Direction = -1 | 1;
let facing: Direction = 1;
let reaction: Action | 'discover' | undefined;
let reactionUntil = 0;
let audio: AudioContext | undefined;
let activated = false;
let showedSaveFailure = false;
let previousZone = zoneIndex(state.world.position);
message.textContent = state.stage === 'egg' ? 'La schiusa è vicina…' : 'Tieni premuta una freccia per esplorare.';
if (speed !== 1) message.textContent += ' Modalità rapida';

function persist() {
  if (!saveGame(storage, state)) {
    message.textContent = 'Salvataggio locale non disponibile.';
    showedSaveFailure = true;
  } else if (showedSaveFailure) {
    message.textContent = 'Salvataggio ripristinato.';
    showedSaveFailure = false;
  }
}

function beep(discovery = false) {
  if (!sound || !activated) return;
  try {
    audio ??= new AudioContext();
    if (audio.state !== 'running') void audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    const time = audio.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(discovery ? 440 : 520, time);
    oscillator.frequency.setValueAtTime(680, time + .055);
    if (discovery) oscillator.frequency.setValueAtTime(880, time + .12);
    volume.gain.setValueAtTime(.1, time);
    volume.gain.exponentialRampToValueAtTime(.001, time + .19);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + .19);
  } catch {
    // Audio is optional when the browser denies playback.
  }
}

function activate(event: Event) {
  if (activated || event.target === soundButton) return;
  activated = true;
  beep();
}
window.addEventListener('pointerdown', activate, {capture:true});
window.addEventListener('pointerup', () => {
  if (sound && activated && audio?.state !== 'running') beep();
});
window.addEventListener('keydown', activate, {capture:true});

function renderAudio() {
  soundButton.setAttribute('aria-pressed', String(sound));
  soundButton.textContent = sound ? 'Audio On' : 'Audio Off';
}
soundButton.onclick = () => {
  sound = !sound;
  activated = true;
  try { localStorage.setItem(soundKey, sound ? 'on' : 'off'); } catch { /* Keep session preference. */ }
  renderAudio();
  if (sound) beep();
  else if (audio?.state === 'running') void audio.suspend().catch(() => {});
};

const statValues = fields.map(([, label]) => {
  const term = document.createElement('dt');
  term.textContent = label;
  const value = document.createElement('dd');
  element('details').append(term, value);
  return value;
});

function refresh() {
  element('stage').textContent = state.sick ? 'MALATO' : stages[state.stage];
  element<HTMLProgressElement>('fullness').value = state.hunger;
  element<HTMLProgressElement>('energy').value = state.energy;
  fields.forEach(([key], index) => {
    statValues[index].textContent = Math.round(state[key]) + '%';
  });
}

function updateLocation() {
  const index = zoneIndex(state.world.position);
  const {kind} = zoneAt(state.world.seed, index);
  element('zone').textContent = kind === 'clearing' ? 'Radura' : discoveries[kind].name;
}

function react(action: Action | 'discover') {
  reaction = action;
  reactionUntil = performance.now() + 900;
}

for (const [action, label] of actions) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.onclick = () => {
    const result = act(state, action, now());
    state = result.state;
    message.textContent = result.message;
    if (state.stage !== 'egg') react(action);
    beep();
    refresh();
    persist();
  };
  element('actions').append(button);
}

element('stats').onclick = () => {
  const panel = element('details');
  panel.hidden = !panel.hidden;
  element('stats').setAttribute('aria-expanded', String(!panel.hidden));
};

const pointers = new Map<number, Direction>();
const keys = new Set<Direction>();
const left = element<HTMLButtonElement>('left');
const right = element<HTMLButtonElement>('right');
function renderHeld() {
  const held = [...keys, ...pointers.values()];
  left.dataset.held = String(held.includes(-1));
  right.dataset.held = String(held.includes(1));
}
for (const [button, direction] of [[left, -1], [right, 1]] as const) {
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, direction);
    renderHeld();
  });
  const release = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    renderHeld();
    persist();
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', event => event.preventDefault());
}

const keyDirection = (key: string): Direction | undefined =>
  key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : undefined;
window.addEventListener('keydown', event => {
  const direction = keyDirection(event.key);
  if (direction === undefined || event.metaKey || event.altKey || event.ctrlKey) return;
  event.preventDefault();
  keys.add(direction);
  renderHeld();
});
window.addEventListener('keyup', event => {
  const direction = keyDirection(event.key);
  if (direction === undefined) return;
  keys.delete(direction);
  renderHeld();
  persist();
});

function clearControls() {
  pointers.clear();
  keys.clear();
  renderHeld();
}
window.addEventListener('blur', clearControls);

let timer: number;
let hiddenAt: number | undefined;
function tick() {
  const previous = state.stage;
  state = advance(state, now());
  if (state.stage !== previous) message.textContent = previous === 'egg'
    ? 'L’uovo si è schiuso! Esplora con le frecce.' : 'Tamago è cresciuto!';
  refresh();
  persist();
}
function visibility() {
  clearInterval(timer);
  if (document.hidden) {
    clearControls();
    hiddenAt = Date.now();
  } else if (hiddenAt !== undefined) {
    if (state.stage !== 'egg') state.energy = movementEnergy(state.energy, (Date.now() - hiddenAt) / 1000, false);
    hiddenAt = undefined;
  }
  tick();
  if (!document.hidden) timer = window.setInterval(tick, 1000);
}
document.addEventListener('visibilitychange', visibility);
window.addEventListener('pagehide', () => {
  clearControls();
  persist();
});

let ground = 103;
function resize() {
  const {clientWidth, clientHeight} = canvas;
  if (canvas.height !== 128) canvas.height = 128;
  const controls = document.querySelector('footer')!;
  const available = controls.offsetTop - 4;
  ground = Math.min(103, Math.floor(available * 128 / Math.max(1, clientHeight)));
  const width = Math.max(1, Math.round(clientWidth * canvas.height / Math.max(1, clientHeight)));
  if (canvas.width !== width) canvas.width = width;
}
const layout = new ResizeObserver(resize);
layout.observe(canvas);
layout.observe(document.querySelector('footer')!);
resize();

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let lastFrame = 0;
let lastPaint = -Infinity;
let lastDistance = NaN;
function frame(time: number) {
  const seconds = Math.min(.05, (time - (lastFrame || time)) / 1000);
  lastFrame = time;
  const leftHeld = left.dataset.held === 'true';
  const rightHeld = right.dataset.held === 'true';
  const moving = state.stage !== 'egg' && leftHeld !== rightHeld && !document.hidden;
  if (state.stage !== 'egg' && !document.hidden) {
    state.energy = movementEnergy(state.energy, seconds, moving);
  }
  if (moving) {
    facing = leftHeld ? -1 : 1;
    const rate = 12 + Math.min(1, state.energy / 20) * 18;
    const found = travel(state.world, state.world.position + facing * seconds * rate, Date.now());
    const index = zoneIndex(state.world.position);
    if (index !== previousZone) {
      previousZone = index;
      updateLocation();
      message.textContent = index === 0 ? 'Di nuovo nella radura.' : 'Avvicinati al luccichio per scoprire cosa c’è.';
    }
    if (found) {
      state[found.need] = Math.min(100, state[found.need] + found.amount);
      message.textContent = found.text;
      react('discover');
      beep(true);
      refresh();
      persist();
    }
    const distance = Math.round(state.world.position / 4);
    if (distance !== lastDistance) {
      element('distance').textContent = distance === 0 ? 'RADURA · 0 m' : distance > 0 ? distance + ' m EST' : -distance + ' m OVEST';
      lastDistance = distance;
    }
  }
  if (time - lastPaint >= 1000 / 36) {
    lastPaint = time;
    const wallTime = Date.now();
    drawWorld(context, {
      ground,
      seed:state.world.seed,
      position:state.world.position,
      stage:state.stage,
      form:state.form === 'bud' ? 'bloom' : state.form ? 'stone' : undefined,
      mood:state.sick ? 'sick' : state.happiness < 45 ? 'sad' : 'happy',
      facing,
      walking:moving,
      reaction:time < reactionUntil ? reaction : undefined,
      ready:index => ready(state.world, index, wallTime),
    }, reducedMotion.matches ? 0 : time);
  }
  requestAnimationFrame(frame);
}

renderAudio();
renderHeld();
updateLocation();
const startingDistance = Math.round(state.world.position / 4);
element('distance').textContent = startingDistance === 0 ? 'RADURA · 0 m' : startingDistance > 0
  ? startingDistance + ' m EST' : -startingDistance + ' m OVEST';
visibility();
requestAnimationFrame(frame);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline non disponibile', error));
}
