const notes = {
  start:[440,620], launch:[390,610], attach:[860,1140], miss:[260,170],
  tension:[180,245], release:[500,295], jump:[285,460], land:[145], discovery:[530,690,880],
  heart:[310,207,122], catch:[790,470,1150], fix:[610,470],
};
export type Sound = keyof typeof notes;

export class Soundscape {
  private context?: AudioContext;
  private master?: GainNode;
  private paused = false;
  private volume=.72;

  setVolume(volume:number) {
    this.volume=.72*volume;
    this.updateVolume();
  }
  private pending: {effect:Sound; delay:number; at:number}[] = [];

  setPaused(paused: boolean) {
    this.paused = paused;
    this.updateVolume();
  }

  private updateVolume() {
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(!this.paused ? this.volume : 0,this.context.currentTime,.025);
    }
  }

  audioContext() {
    try {
      if (!this.context) this.setup();
      return this.context;
    } catch { /* The silent timeline remains available without Web Audio. */ }
  }

  unlock() {
    const ctx = this.audioContext();
    if (!ctx || ctx.state === 'running') return;
    void ctx.resume().then(() => {
      if (this.paused) return;
      for (const {effect,delay,at} of this.pending.splice(0)) {
        if (performance.now()-at < 400) this.play(effect,delay);
      }
    }).catch(() => {});
  }

  private setup() {
    const Type = window.AudioContext ??
      (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!Type) return;
    const ctx = new Type();
    this.context = ctx;
    const master = ctx.createGain();
    master.gain.value = !this.paused ? this.volume : 0;
    master.connect(ctx.destination);
    this.master = master;

  }

  play(effect: Sound, delay = 0) {
    const ctx = this.context;
    if (this.paused || !ctx || !this.master) return;
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
