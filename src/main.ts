import './style.css';
import {act, advance, loadGame, saveGame, type Action} from './game';
import {drawPet} from './render';

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const actions = [
  {id:'feed', label:'Nutri', icon:['01100','11110','11111','01110','00100']},
  {id:'play', label:'Gioca', icon:['00100','10101','01110','10101','00100']},
  {id:'clean', label:'Pulisci', icon:['00100','00110','01110','11111','01110']},
  {id:'light', label:'Luce', icon:['01110','10001','10001','01110','00100']},
  {id:'heal', label:'Cura', icon:['00100','00100','11111','00100','00100']},
] as const;

const fields = [
  ['hunger','Sazietà'], ['happiness','Felicità'], ['energy','Energia'],
  ['hygiene','Igiene'], ['health','Salute'],
] as const;
const stages = {egg:'UOVO', baby:'CUCCIOLO', teen:'ADOLESCENTE', adult:'ADULTO'};
const canvas = document.querySelector('canvas')!;
const context = canvas.getContext('2d')!;
const message = element('message');

const storage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};
const speed = import.meta.env.DEV && new URLSearchParams(location.search).has('rapido') ? 360 : 1;
const started = Date.UTC(2025, 0, 1);
const now = () => started + (Date.now() - started) * speed;
const saveStorage = speed === 1 ? storage : {
  getItem: (key: string) => storage.getItem('demo:' + key),
  setItem: (key: string, value: string) => storage.setItem('demo:' + key, value),
  removeItem: (key: string) => storage.removeItem('demo:' + key),
};
let state = loadGame(saveStorage, now());
let selected = 0;
let reaction: 'feed'|'play'|'clean'|'heal'|undefined;
let reactionUntil = 0;
let sound = false;
let audio: AudioContext | undefined;
let showedSaveFailure = false;
message.textContent = state.stage === 'egg' ? 'L’uovo si muove…' : 'Bentornato!';
if (speed !== 1) message.textContent += ' Modalità rapida';

function persist() {
  if (!saveGame(saveStorage, state)) {
    message.textContent = 'Salvataggio locale non disponibile.';
    showedSaveFailure = true;
  } else if (showedSaveFailure) {
    message.textContent = 'Salvataggio ripristinato.';
    showedSaveFailure = false;
  }
}

const actionButtons = actions.map(({id, label, icon}, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  const glyph = document.createElement('i');
  glyph.setAttribute('aria-hidden', 'true');
  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = iconCanvas.height = 5;
  const ink = iconCanvas.getContext('2d')!;
  ink.fillStyle = '#c6ccb9';
  icon.forEach((row, y) => Array.from(row).forEach((pixel, x) => {
    if (pixel === '1') ink.fillRect(x, y, 1, 1);
  }));
  glyph.style.backgroundImage = 'url("' + iconCanvas.toDataURL() + '")';
  button.append(glyph, label);
  button.addEventListener('click', () => {
    select(index);
    perform(id);
  });
  element('actions').append(button);
  return button;
});

const statValues = fields.map(([, label]) => {
  const term = document.createElement('dt');
  term.textContent = label;
  const value = document.createElement('dd');
  element('details').append(term, value);
  return value;
});

function select(index: number) {
  selected = index;
  actionButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
}

function refresh() {
  element('stage').textContent = stages[state.stage];
  element('clock').textContent = state.sick ? 'MALATO' : state.sleeping ? 'SONNO' : state.stage === 'egg' ? '' : 'SVEGLIO';
  element<HTMLProgressElement>('fullness').value = state.hunger;
  fields.forEach(([key], index) => {
    statValues[index].textContent = Math.round(state[key]) + '%';
  });
}

function tick() {
  const previous = state.stage;
  state = advance(state, now());
  if (state.stage !== previous) message.textContent = previous === 'egg' ? 'L’uovo si è schiuso!' : 'Tamago è cresciuto!';
  refresh();
  persist();
}

function beep() {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    const time = audio.currentTime;
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(520, time);
    oscillator.frequency.setValueAtTime(680, time + .055);
    volume.gain.setValueAtTime(.035, time);
    volume.gain.exponentialRampToValueAtTime(.001, time + .12);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + .12);
  } catch {
    // Audio is optional, including when Safari denies playback.
  }
}

function perform(action: Action) {
  const result = act(state, action, now());
  state = result.state;
  message.textContent = result.message;
  if (action !== 'light' && state.stage !== 'egg' && !state.sleeping) {
    reaction = action;
    reactionUntil = performance.now() + 750;
  }
  beep();
  refresh();
  persist();
}

element('select').onclick = () => select((selected + 1) % actions.length);
element('confirm').onclick = () => perform(actions[selected].id);
element('back').onclick = () => {
  select(0);
  element('details').hidden = true;
  element('stats').setAttribute('aria-expanded', 'false');
};
element('stats').onclick = () => {
  const panel = element('details');
  panel.hidden = !panel.hidden;
  element('stats').setAttribute('aria-expanded', String(!panel.hidden));
};
element('sound').onclick = () => {
  sound = !sound;
  element('sound').setAttribute('aria-pressed', String(sound));
  element('sound').textContent = sound ? 'Audio acceso' : 'Audio spento';
  beep();
};

let timer: number;
function visibility() {
  clearInterval(timer);
  tick();
  if (!document.hidden) timer = window.setInterval(tick, 1000);
}
document.addEventListener('visibilitychange', visibility);
window.addEventListener('pagehide', persist);

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function frame(time: number) {
  drawPet(context, {
    stage: state.stage,
    form: state.form === 'bud' ? 'bloom' : state.form ? 'stone' : undefined,
    mood: state.sick ? 'sick' : state.happiness < 45 ? 'sad' : 'happy',
    asleep: state.sleeping,
    lightsOff: !state.lightOn,
    reaction: time < reactionUntil ? reaction : undefined,
  }, reducedMotion.matches ? 0 : time);
  requestAnimationFrame(frame);
}
select(0);
visibility();
requestAnimationFrame(frame);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline non disponibile', error));
}
