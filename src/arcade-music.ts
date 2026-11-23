import {renderMusic} from './gnat-music';

const tempo=[100,104,98,106,102,108,103,110,107,112] as const;
const keys=[0,2,-2,3,5,-4,1,4,-3,7] as const;
const chords=[
  [48,55,59,64],[45,55,60,64],[41,53,57,64],[43,55,60,62],
  [52,55,59,62],[45,55,60,64],[41,53,57,60],[43,53,59,62],
] as const;
const melody=[
  [72,0,76,0,79,0,0,76],[74,0,72,0,69,0,0,67],
  [69,0,72,0,76,0,74,0],[72,0,0,0,67,0,0,0],
  [71,0,74,0,79,0,0,74],[76,0,72,0,69,0,0,72],
  [76,0,77,0,72,0,69,0],[71,0,0,69,67,0,0,0],
] as const;
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
      buffer=renderMusic(context,'explore',false,{bpm:tempo[stage],key:keys[stage],chords,melody,arrangement:stage});
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
