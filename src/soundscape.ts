const notes = {
  start:[440,620], launch:[390,610], attach:[860,1140], miss:[260,170],
  tension:[180,245], release:[500,295], jump:[285,460], land:[145], discovery:[530,690,880],
  catch:[790,470,1150], fix:[610,470],
};
export type Sound = keyof typeof notes;

export class Soundscape {
  private context?: AudioContext;
  private master?: GainNode;
  private buzzing?: GainNode;
  private flyTone?: OscillatorNode;
  private announced = false;
  private pending: {effect:Sound; delay:number; at:number}[] = [];

  constructor(private enabled: boolean) {}

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.pending.length = 0;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? .72 : 0,this.context.currentTime,.025);
    }
    if (enabled) this.unlock();
  }

  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) this.setup();
      const ctx = this.context;
      if (!ctx) return;
      const announce = () => {
        if (ctx.state !== 'running' || !this.enabled) return;
        if (!this.announced) {
          this.announced = true;
          this.play('start');
        }
        for (const {effect,delay,at} of this.pending.splice(0)) {
          if (performance.now()-at < 400) this.play(effect,delay);
        }
      };
      if (ctx.state === 'running') announce();
      else void ctx.resume().then(announce).catch(() => {});
    } catch { /* Unsupported audio leaves the game playable. */ }
  }

  private setup() {
    const Type = window.AudioContext ??
      (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!Type) return;
    const ctx = new Type();
    this.context = ctx;
    const master = ctx.createGain();
    master.gain.value = .72;
    master.connect(ctx.destination);
    this.master = master;

    const buffer = ctx.createBuffer(1,ctx.sampleRate * 3,ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const rustle = ctx.createBufferSource();
    rustle.buffer = buffer;
    rustle.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 350;
    filter.Q.value = .65;
    const wind = ctx.createGain();
    wind.gain.value = .17;
    rustle.connect(filter).connect(wind).connect(master);
    rustle.start();

    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 124;
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = 430;
    const volume = ctx.createGain();
    volume.gain.value = 0;
    buzz.connect(soft).connect(volume).connect(master);
    buzz.start();
    this.buzzing = volume;
    this.flyTone = buzz;
  }

  nearby(distance: number, time: number) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.buzzing || !this.flyTone) return;
    const strength = Math.max(0,1 - distance / 85);
    this.buzzing.gain.setTargetAtTime(strength * .027,ctx.currentTime,.075);
    this.flyTone.frequency.setTargetAtTime(122 + Math.sin(time * .014) * 15,ctx.currentTime,.075);
  }

  play(effect: Sound, delay = 0) {
    const ctx = this.context;
    if (!this.enabled || !ctx || !this.master) return;
    if (ctx.state !== 'running') {
      if (this.pending.length < 8) this.pending.push({effect,delay,at:performance.now()});
      return;
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const time = ctx.currentTime + delay;
    const melody = notes[effect];
    oscillator.type = effect === 'launch' || effect === 'tension' ? 'sine' : 'triangle';
    melody.forEach((note,i) => oscillator.frequency.setValueAtTime(note,time + i * .054));
    const end = time + melody.length * .054 + .055;
    gain.gain.setValueAtTime(.001,time);
    gain.gain.exponentialRampToValueAtTime(effect === 'catch' ? .26 : .17,time + .01);
    gain.gain.exponentialRampToValueAtTime(.001,end);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(time);
    oscillator.stop(end);
  }
}
