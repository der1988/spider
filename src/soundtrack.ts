import {locateTrack,playlistEnd,trackStarts,wrapPlaylist} from './playlist';
import {flyDuration} from './fly-song-timing';
import {infiniteEnd,infiniteReturn} from './infinite-timing';

type TrackBytes = Promise<ArrayBuffer | undefined>;
type Program = 'story'|'fly'|'loop';

const boundaryFade = .012;
const returnBlend = .14;
const ease = (t: number) => .5-.5*Math.cos(Math.PI*t);

export class Soundtrack {
  private program?: Program;
  private prepared: Partial<Record<Program,Promise<AudioBuffer|undefined>>> = {};
  private buffer?: AudioBuffer;
  private ready = false;
  private generation = 0;
  private upgradeStart: number = trackStarts[1];
  private roomStart = trackStarts[2];
  private output?: GainNode;
  private source?: AudioBufferSourceNode;
  private offset = 0;
  private epoch = 0;
  private paused = false;
  started = false;

  constructor(
    private readonly bytes: readonly [TrackBytes,TrackBytes,TrackBytes],
    private readonly returnAt: number,
    private readonly flyBytes: TrackBytes,
    private readonly infiniteBytes: TrackBytes,
  ) {}

  get waiting() { return this.program!==undefined && !this.started; }
  get failed() { return this.ready && !this.buffer; }

  play(program: Program,context?: AudioContext,startAt=0) {
    this.stopSource();
    this.program=program;
    this.buffer=undefined;
    this.started=false;
    this.ready=!context;
    this.offset=startAt;
    const generation=++this.generation;
    if (!context) {
      this.connect();
      return;
    }
    if (!this.output) {
      this.output=context.createGain();
      this.output.gain.value=.76;
      this.output.connect(context.destination);
    }
    void this.prepare(program,context).then(buffer=>{
      if (this.generation!==generation) return;
      this.buffer=buffer;
      this.ready=true;
      this.connect(context);
      if (program==='story') void this.prepare('fly',context);
    });
  }

  private prepare(program: Program,context: AudioContext) {
    return this.prepared[program]??=(program==='story' ? this.join(context) : this.decode(program,context))
      .catch(()=>undefined);
  }

  private async decode(program: 'fly'|'loop',context: AudioContext) {
    const bytes=await (program==='fly' ? this.flyBytes : this.infiniteBytes);
    if (!bytes) return;
    const buffer=await context.decodeAudioData(bytes);
    if (program==='loop') this.blendLoop(buffer,infiniteReturn,infiniteEnd);
    return buffer;
  }

  reset() {
    this.stopSource();
    this.generation++;
    this.program=undefined;
    this.buffer=undefined;
    this.ready=false;
    this.started=false;
    this.offset=0;
    this.paused=false;
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
    for (let channel=0;channel<playlist.numberOfChannels;channel++) {
      const samples=playlist.getChannelData(channel);
      for (const cut of [upgrade,room]) {
        for (let i=0;i<fade;i++) {
          const gain=ease(i/(fade-1));
          samples[cut-fade+i]*=1-gain;
          samples[cut+i]*=gain;
        }
      }
    }
    this.blendLoop(playlist,this.returnAt,playlist.duration);
    return playlist;
  }

  private blendLoop(buffer: AudioBuffer,start: number,end: number) {
    const rate=buffer.sampleRate;
    const blend=Math.round(returnBlend*rate);
    const head=Math.round(start*rate);
    const tail=Math.min(buffer.length,Math.round(end*rate))-blend;
    // Match the last samples to the pre-roll so the first syllable at the loop point stays intact.
    for (let channel=0;channel<buffer.numberOfChannels;channel++) {
      const samples=buffer.getChannelData(channel);
      for (let i=0;i<blend;i++) {
        const weight=ease(i/(blend-1));
        samples[tail+i]=samples[tail+i]*(1-weight)+samples[head-blend+i]*weight;
      }
    }
  }

  private clock() {
    return this.source ? this.source.context.currentTime : performance.now()/1000;
  }

  private currentOffset() {
    if (!this.started || this.paused) return this.offset;
    const elapsed=this.offset+Math.max(0,this.clock()-this.epoch);
    if (this.program==='fly') return Math.min(flyDuration,elapsed);
    if (this.program==='loop') return wrapPlaylist(elapsed,infiniteReturn,infiniteEnd);
    return wrapPlaylist(elapsed,this.returnAt,this.buffer?.duration);
  }

  get position() {
    const time=this.currentOffset();
    if (this.program==='fly' || this.program==='loop') return {track:this.program,time};
    return locateTrack(time,this.upgradeStart,this.roomStart);
  }

  connect(context?: AudioContext) {
    if (!this.ready || this.paused || this.source) return;
    const buffer=this.buffer;
    if (!buffer) {
      if (!this.started) this.epoch=this.clock();
      this.started=true;
      return;
    }
    if (context?.state!=='running' || !this.output) return;
    this.offset=this.currentOffset();
    if (this.program==='fly' && this.offset>=buffer.duration) return;
    const source=context.createBufferSource();
    source.buffer=buffer;
    if (this.program!=='fly') {
      source.loop=true;
      source.loopStart=this.program==='loop' ? infiniteReturn : this.returnAt;
      source.loopEnd=this.program==='loop' ? infiniteEnd : buffer.duration;
    }
    source.connect(this.output);
    const launch=context.currentTime+.012;
    source.start(launch,this.offset);
    this.source=source;
    this.started=true;
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
