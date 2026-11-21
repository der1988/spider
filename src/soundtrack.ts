import {locateTrack,playlistEnd,trackStarts,wrapPlaylist} from './playlist';
import {flyDuration} from './fly-song-timing';

type TrackBytes = Promise<ArrayBuffer | undefined>;

const boundaryFade = .012;
const returnBlend = .14;
const ease = (t: number) => .5-.5*Math.cos(Math.PI*t);

export class Soundtrack {
  private buffer?: AudioBuffer;
  private flyBuffer?: AudioBuffer;
  private flyReady = false;
  private flyLoading = false;
  private flyStarting = false;
  private finale = false;
  private upgradeStart: number = trackStarts[1];
  private roomStart = trackStarts[2];
  private output?: GainNode;
  private source?: AudioBufferSourceNode;
  private offset = 0;
  private epoch = 0;
  private paused = false;
  private loading = false;
  failed = false;
  started = false;

  constructor(
    private readonly bytes: readonly [TrackBytes,TrackBytes,TrackBytes],
    private readonly returnAt: number,
    private readonly flyBytes: TrackBytes,
  ) {}

  prepare(context: AudioContext | undefined) {
    if (this.loading) return;
    this.loading = true;
    if (!context) {
      this.failed = true;
      this.flyReady = true;
      return;
    }
    void this.join(context).then(buffer => {
      this.buffer=buffer;
    }).catch(()=>{this.failed=true;}).finally(()=>void this.prepareFly(context));
    this.prepareOutput(context);
  }

  private prepareOutput(context: AudioContext) {
    if (this.output) return;
    this.output=context.createGain();
    this.output.gain.value=.76;
    this.output.connect(context.destination);
  }

  private async prepareFly(context: AudioContext) {
    if (this.flyLoading) return;
    this.flyLoading=true;
    try {
      const bytes=await this.flyBytes;
      if (bytes) this.flyBuffer=await context.decodeAudioData(bytes);
    } catch { /* Keep the scene and subtitles playable without audio. */ }
    this.flyReady=true;
    if (this.finale) this.connect(context);
  }

  get waitingForFly() {
    return this.flyStarting;
  }

  enterFly(context?: AudioContext,startAt=0) {
    this.stopSource();
    this.started=true;
    this.finale=true;
    this.flyStarting=true;
    this.offset=startAt;
    this.epoch=this.clock();
    if (context) {
      this.prepareOutput(context);
      void this.prepareFly(context);
    } else this.flyReady=true;
    this.connect(context);
  }

  private async join(context: AudioContext) {
    const rate=context.sampleRate;
    const [start,upgrade,room,end]=[...trackStarts,playlistEnd].map(seconds=>Math.round(seconds*rate));
    const playlist=context.createBuffer(2,end,rate);
    this.upgradeStart=upgrade/rate;
    this.roomStart=room/rate;
    const boundaries=[start,upgrade,room,end];
    let decoded=false;
    // Decode one original at a time while assembling the shared playback buffer.
    for (const [index,bytes] of this.bytes.entries()) {
      const data=await bytes;
      if (!data) continue;
      const track=await context.decodeAudioData(data).catch(()=>undefined);
      if (!track) continue;
      decoded=true;
      for (let channel=0;channel<playlist.numberOfChannels;channel++) {
        const samples=track.getChannelData(channel%track.numberOfChannels);
        playlist.copyToChannel(samples.subarray(0,boundaries[index+1]-boundaries[index]),channel,boundaries[index]);
      }
    }
    if (!decoded) throw new Error('Soundtrack unavailable');
    const fade=Math.round(boundaryFade*rate);
    const blend=Math.round(returnBlend*rate);
    const head=Math.round(this.returnAt*rate);
    for (let channel=0;channel<playlist.numberOfChannels;channel++) {
      const samples=playlist.getChannelData(channel);
      for (const cut of [upgrade,room]) {
        for (let i=0;i<fade;i++) {
          const gain=ease(i/(fade-1));
          samples[cut-fade+i]*=1-gain;
          samples[cut+i]*=gain;
        }
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
    if (!this.started || this.paused || this.flyStarting) return this.offset;
    const elapsed=this.offset+Math.max(0,this.clock()-this.epoch);
    return this.finale ? Math.min(flyDuration,elapsed) : wrapPlaylist(elapsed,this.returnAt,this.buffer?.duration);
  }

  get position() {
    const time=this.currentOffset();
    if (this.finale) return {track:'fly' as const,time};
    return locateTrack(time,this.upgradeStart,this.roomStart);
  }

  start() {
    this.started = true;
    this.epoch = this.clock();
  }

  canPlay(context?: AudioContext) {
    return !!this.buffer && context?.state==='running';
  }

  connect(context?: AudioContext) {
    if (this.flyStarting && this.flyReady && !this.flyBuffer) {
      this.flyStarting=false;
      this.epoch=this.clock();
    }
    const buffer=this.finale ? this.flyBuffer : this.buffer;
    if (!this.started || this.paused || this.source || context?.state!=='running' || !this.output || !buffer) return;
    this.offset=this.currentOffset();
    if (this.finale && this.offset>=buffer.duration) return;
    const source=context.createBufferSource();
    source.buffer=buffer;
    if (!this.finale) {
      source.loop=true;
      source.loopStart=this.returnAt;
      source.loopEnd=buffer.duration;
    }
    source.connect(this.output);
    const launch=context.currentTime+.012;
    source.start(launch,this.offset);
    this.source=source;
    this.flyStarting=false;
    this.epoch=launch;
  }

  setPaused(paused: boolean) {
    if (paused===this.paused) return;
    this.offset=this.currentOffset();
    this.paused=paused;
    this.stopSource();
    this.epoch=this.clock();
  }

  private stopSource() {
    if (!this.source) return;
    this.source.stop();
    this.source.disconnect();
    this.source=undefined;
  }
}
