import {firstTrackEnd} from './song-timing';
import {locateTrack,playlistEnd,wrapPlaylist} from './playlist';

const boundaryFade = .012;
const returnBlend = .14;
const ease = (t: number) => .5-.5*Math.cos(Math.PI*t);

export class Soundtrack {
  private buffer?: AudioBuffer;
  private boundary = firstTrackEnd;
  private output?: GainNode;
  private source?: AudioBufferSourceNode;
  private offset = 0;
  private epoch = 0;
  private paused = false;
  private muted = false;
  private loading = false;
  failed = false;
  started = false;

  constructor(
    private readonly bytes: readonly [Promise<ArrayBuffer | undefined>,Promise<ArrayBuffer | undefined>],
    private readonly returnAt: number,
  ) {}

  prepare(context: AudioContext | undefined) {
    if (this.loading) return;
    this.loading = true;
    if (!context) {
      this.failed = true;
      return;
    }
    const decode = async (track: Promise<ArrayBuffer | undefined>) => {
      const data=await track;
      return data ? context.decodeAudioData(data).catch(()=>undefined) : undefined;
    };
    void Promise.all(this.bytes.map(decode)).then(([first,upgrade]) => {
      if (!first && !upgrade) {
        this.failed=true;
        return;
      }
      this.buffer=this.join(context,first,upgrade);
      this.output=context.createGain();
      this.output.gain.value=this.muted ? 0 : .76;
      this.output.connect(context.destination);
    }).catch(()=>{this.failed=true;});
  }

  private join(context: AudioContext,first?: AudioBuffer,upgrade?: AudioBuffer) {
    const rate=context.sampleRate;
    const cut=Math.round(firstTrackEnd*rate);
    const end=Math.round(playlistEnd*rate);
    const fade=Math.round(boundaryFade*rate);
    const blend=Math.round(returnBlend*rate);
    const head=Math.round(this.returnAt*rate);
    const channels=Math.max(first?.numberOfChannels??0,upgrade?.numberOfChannels??0);
    const playlist=context.createBuffer(channels,end,rate);
    this.boundary=cut/rate;
    for (let channel=0;channel<channels;channel++) {
      const samples=playlist.getChannelData(channel);
      if (first) samples.set(first.getChannelData(channel%first.numberOfChannels).subarray(0,cut));
      if (upgrade) samples.set(upgrade.getChannelData(channel%upgrade.numberOfChannels).subarray(0,end-cut),cut);
      for (let i=0;i<fade;i++) {
        const gain=ease(i/(fade-1));
        samples[cut-fade+i]*=1-gain;
        samples[cut+i]*=gain;
      }
      // Blend the decay into the pre-roll so the return begins with an uncut first syllable.
      for (let i=0;i<blend;i++) {
        const weight=ease(i/(blend-1));
        const tail=end-blend+i;
        samples[tail]=samples[tail]*(1-weight)+samples[head-blend+i]*weight;
      }
    }
    return playlist;
  }

  private clock() {
    return this.source ? this.source.context.currentTime : performance.now()/1000;
  }

  private currentOffset() {
    if (!this.started || this.paused) return this.offset;
    const elapsed=this.offset+Math.max(0,this.clock()-this.epoch);
    return wrapPlaylist(elapsed,this.returnAt,this.buffer?.duration);
  }

  get position() {
    return locateTrack(this.currentOffset(),this.boundary);
  }

  start() {
    this.started = true;
    this.epoch = this.clock();
  }

  canPlay(context?: AudioContext) {
    return !!this.buffer && context?.state==='running';
  }

  connect(context?: AudioContext) {
    const buffer=this.buffer;
    if (!this.started || this.paused || this.source || !this.canPlay(context) || !context || !this.output || !buffer) return;
    this.offset=this.currentOffset();
    const source=context.createBufferSource();
    source.buffer=buffer;
    source.loop=true;
    source.loopStart=this.returnAt;
    source.loopEnd=buffer.duration;
    source.connect(this.output);
    const launch=context.currentTime+.012;
    source.start(launch,this.offset);
    this.source=source;
    this.epoch=launch;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.output) {
      this.output.gain.setTargetAtTime(muted ? 0 : .76,this.output.context.currentTime,.015);
    }
  }

  setPaused(paused: boolean) {
    if (paused===this.paused) return;
    this.offset=this.currentOffset();
    this.paused=paused;
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source=undefined;
    }
    this.epoch=this.clock();
  }
}
