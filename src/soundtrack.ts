import {loopEnd} from './song-timing';

const blendSeconds = .24;

export class Soundtrack {
  private buffer?: AudioBuffer;
  private originalTail: Float32Array[] = [];
  private output?: GainNode;
  private source?: AudioBufferSourceNode;
  private offset = 0;
  private epoch = 0;
  private paused = false;
  private muted = false;
  private loading = false;
  failed = false;
  started = false;

  constructor(private readonly bytes: Promise<ArrayBuffer | undefined>,private loopStart: number) {}

  prepare(context: AudioContext | undefined) {
    if (this.loading) return;
    this.loading = true;
    if (!context) {
      this.failed = true;
      return;
    }
    void this.bytes.then(async bytes => {
      if (!bytes) throw new Error('Colonna sonora non disponibile');
      const buffer = await context.decodeAudioData(bytes.slice(0));
      this.buffer = buffer;
      const end = Math.round(loopEnd*buffer.sampleRate);
      const blend = Math.round(blendSeconds*buffer.sampleRate);
      this.originalTail = Array.from({length:buffer.numberOfChannels},(_,channel) =>
        buffer.getChannelData(channel).slice(end-blend,end));
      this.splice();
      this.output = context.createGain();
      this.output.gain.value = this.muted ? 0 : .76;
      this.output.connect(context.destination);
    }).catch(() => { this.failed = true; });
  }

  private clock() {
    return this.source ? this.source.context.currentTime : performance.now()/1000;
  }

  get time() {
    if (!this.started || this.paused) return this.offset;
    const time = this.offset + Math.max(0,this.clock()-this.epoch);
    if (time < loopEnd) return time;
    return this.loopStart+(time-loopEnd)%(loopEnd-this.loopStart);
  }

  start() {
    this.started = true;
    this.epoch = this.clock();
  }

  canPlay(context?: AudioContext) {
    return !!this.buffer && context?.state==='running';
  }

  connect(context?: AudioContext) {
    if (!this.started || this.paused || this.source || !this.canPlay(context) || !context || !this.output) return;
    this.offset = this.time;
    const source = context.createBufferSource();
    source.buffer = this.buffer!;
    source.loop = true;
    source.loopStart = this.loopStart;
    source.loopEnd = loopEnd;
    source.connect(this.output);
    const launch = context.currentTime + .012;
    source.start(launch,this.offset);
    this.source = source;
    this.epoch = launch;
  }

  setLoopStart(start: number) {
    // The calibration dialog pauses playback before changing the splice.
    if (this.loopStart===start) return;
    this.loopStart = start;
    this.splice();
  }

  private splice() {
    const buffer = this.buffer;
    if (!buffer) return;
    const end = Math.round(loopEnd*buffer.sampleRate);
    const head = Math.round(this.loopStart*buffer.sampleRate);
    for (const [channel,tail] of this.originalTail.entries()) {
      const samples = buffer.getChannelData(channel);
      for (let i=0;i<tail.length;i++) {
        const weight = .5-.5*Math.cos(Math.PI*i/(tail.length-1));
        samples[end-tail.length+i] = tail[i]*(1-weight)+samples[head-tail.length+i]*weight;
      }
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.output) {
      this.output.gain.setTargetAtTime(muted ? 0 : .76,this.output.context.currentTime,.015);
    }
  }

  setPaused(paused: boolean) {
    if (paused===this.paused) return;
    this.offset = this.time;
    this.paused = paused;
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = undefined;
    }
    this.epoch = this.clock();
  }
}
