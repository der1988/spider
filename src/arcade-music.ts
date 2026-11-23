import {renderMusic} from './gnat-music';

const tempo=[149,154,152,158,156,162,160,166,164,170] as const;
type Track={source:AudioBufferSourceNode;gain:GainNode;started:number;stage:number};

export class ArcadeMusic {
  private playing?:Track;
  private volume=.58;
  private output?:GainNode;
  private buffers=new Map<number,AudioBuffer>();
  private offset=0;
  private stage=-1;

  get pulse() {
    const track=this.playing;
    if (!track) return 0;
    const elapsed=this.offset+Math.max(0,track.gain.context.currentTime-track.started);
    const beat=60/tempo[track.stage];
    return Math.exp(-elapsed%beat/beat*5.6);
  }

  setVolume(volume:number) {
    this.volume=.58*volume;
    const output=this.output;
    output?.gain.setTargetAtTime(this.volume,output.context.currentTime,.025);
  }

  sync(context:AudioContext|undefined,stage:number,frozen:boolean) {
    if (frozen) {this.stop(true);return;}
    if (!context || context.state!=='running' || this.playing?.stage===stage) return;
    if (!this.output) {
      this.output=context.createGain();
      this.output.gain.value=this.volume;
      this.output.connect(context.destination);
    }
    if (this.stage!==stage) this.stop();
    this.stage=stage;
    let buffer=this.buffers.get(stage);
    if (!buffer) {
      buffer=renderMusic(context,'explore',false,tempo[stage],stage);
      this.buffers.set(stage,buffer);
    }
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=buffer;
    source.loop=true;
    source.connect(gain).connect(this.output);
    const started=context.currentTime+.01;
    gain.gain.setValueAtTime(0,started);
    gain.gain.linearRampToValueAtTime(1,started+.09);
    source.start(started,this.offset);
    this.playing={source,gain,started,stage};
  }

  stop(preserve=false) {
    const track=this.playing;
    if (track) {
      const now=track.gain.context.currentTime;
      this.offset=preserve ? (this.offset+Math.max(0,now-track.started))%track.source.buffer!.duration : 0;
      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setTargetAtTime(0,now,.025);
      track.source.stop(now+.11);
      track.source.onended=()=>track.gain.disconnect();
      this.playing=undefined;
    }
    if (!preserve) this.offset=0;
  }
}
