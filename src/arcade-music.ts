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
const bossTempo=146;
const bossChords=[[45,57,60,64],[41,53,57,60],[50,57,62,65],[40,56,59,64]] as const;
const bossMelody=[[81,0,76,79,81,84,81,0],[77,0,72,76,77,81,79,77],
  [86,0,81,84,86,89,86,0],[83,0,80,83,88,86,83,80]] as const;
type Track={source:AudioBufferSourceNode;gain:GainNode;started:number;id:number;bpm:number};

export class ArcadeMusic {
  private playing?:Track;
  private volume=.58;
  private output?:GainNode;
  private buffers=new Map<number,AudioBuffer>();
  private offset=0;
  private trackId=-1;

  get pulse() {
    const track=this.playing;
    if (!track) return 0;
    const elapsed=this.offset+Math.max(0,track.gain.context.currentTime-track.started);
    const beat=60/track.bpm;
    return Math.exp(-elapsed%beat/beat*5.6);
  }

  setVolume(volume:number) {
    this.volume=.58*volume;
    const output=this.output;
    output?.gain.setTargetAtTime(this.volume,output.context.currentTime,.025);
  }

  sync(context:AudioContext|undefined,stage:number,boss:boolean,frozen:boolean) {
    if (frozen) {this.stop(true);return;}
    const id=stage+(boss ? tempo.length : 0),bpm=boss ? bossTempo : tempo[stage];
    if (!context || context.state!=='running' || this.playing?.id===id) return;
    if (!this.output) {
      this.output=context.createGain();
      this.output.gain.value=this.volume;
      this.output.connect(context.destination);
    }
    if (this.trackId!==id) this.stop();
    this.trackId=id;
    let buffer=this.buffers.get(id);
    if (!buffer) {
      buffer=renderMusic(context,boss ? 'danger' : 'explore',false,{
        bpm,key:keys[stage],chords:boss ? bossChords : chords,melody:boss ? bossMelody : melody,arrangement:stage,
      });
      this.buffers.set(id,buffer);
    }
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=buffer;
    source.loop=true;
    source.connect(gain).connect(this.output);
    const started=context.currentTime+.01;
    gain.gain.setValueAtTime(0,started);
    gain.gain.linearRampToValueAtTime(1,started+.09);
    source.start(started,this.offset);
    this.playing={source,gain,started,id,bpm};
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
