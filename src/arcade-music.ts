import {arcadeLevels} from './arcade-dialogue';

const bpm=112;
const beat=60/bpm;
const rate=16000;
const loopLength=Math.round(32*beat*rate);
const chords=[
  [48,55,59,64],[45,55,60,64],[41,53,57,64],[43,55,60,62],
  [52,55,59,62],[45,55,60,64],[41,53,57,60],[43,53,59,62],
];
const melody=[
  [72,0,76,0,79,0,0,76],[74,0,72,0,69,0,0,67],
  [69,0,72,0,76,0,74,0],[72,0,0,0,67,0,0,0],
  [71,0,74,0,79,0,0,74],[76,0,72,0,69,0,0,72],
  [76,0,77,0,72,0,69,0],[71,0,0,69,67,0,0,0],
];

const circle=Math.PI*2;
const triangle=(phase:number)=>1-4*Math.abs(phase-Math.round(phase));
type Tone=(phase:number,time:number)=>number;
const voices:readonly Tone[]=[
  (p)=>triangle(p)*.8+Math.sin(circle*p*2)*.2,
  (p,t)=>Math.sin(circle*p+Math.sin(circle*p*2)*Math.exp(-t*6)),
  (p)=>(p%1<.3 ? .64 : -.28),
  (p,t)=>Math.sin(circle*(p+1.7*(1-Math.exp(-t*30))))*.8+Math.sin(t*7660)*.2,
  (p,t)=>Math.sin(circle*p)*.6+Math.sin(circle*p*.998+t*.3)*.4,
  (p,t)=>Math.sin(circle*p+Math.sin(circle*p*2.01)*Math.exp(-t*7)),
  (p,t)=>Math.sin(circle*p)*.8+Math.sin(circle*p*3.94)*Math.exp(-t*12)*.2,
  (p)=>triangle(p)*.64+Math.sin(circle*p*3)*.22+Math.sin(circle*p*5)*.14,
  (p,t)=>triangle(p+Math.sin(t*32)*.016),
  (p,t)=>Math.sin(circle*(p+1.8*(1-Math.exp(-t*10))))*.7+triangle(p*1.515)*.3,
];
const pans=[0,0,.35,0,-.42,.43,-.31,.18,.54,-.14];

function addNote(data:Float32Array,voice:number,midi:number,at:number,length:number,volume:number,swell=0) {
  const start=Math.round(at*beat*rate),count=Math.min(data.length-start,Math.round(length*beat*rate));
  const hz=440*2**((midi-69)/12);
  for (let i=0;i<count;i++) {
    const time=i/rate;
    const envelope=Math.min(1,time/(.008+swell),(count-i)/(rate*.045));
    data[start+i]+=voices[voice](hz*time,time)*envelope*volume*Math.exp(-time*(voice===4 || voice===7 ? .58 : 2.6));
  }
}

export function renderCampaignStem(context:BaseAudioContext,voice:number) {
  const buffer=context.createBuffer(1,loopLength,rate);
  const data=buffer.getChannelData(0);
  for (const [bar,[root,...harmony]] of chords.entries()) {
    const on=bar*4;
    const note=(midi:number,offset:number,length:number,volume:number,swell=0)=>
      addNote(data,voice,midi,on+offset,length,volume,swell);
    switch (voice) {
      case 0:
        melody[bar].forEach((pitch,i)=>{if (pitch) note(pitch,i*.5,melody[bar][i+1]===0 ? .78 : .41,.19);});
        break;
      case 1: note(root,0,1.6,.16);note(bar%2 ? root+7 : root,2,1.55,.14);break;
      case 2: [1,2,3,3.5].forEach((offset,i)=>note(harmony[(i+bar)%3]+12,offset,.28,.062));break;
      case 3: note(32,0,.33,.12);note(39,2,.29,.086);note(57,3.5,.12,.037);break;
      case 4: harmony.forEach(pitch=>note(pitch,0,3.92,.027,.155));break;
      case 5: note(harmony[2]+24,1.5,.68,.048);if (bar%2) note(harmony[1]+24,3,.73,.041);break;
      case 6: note(harmony[0],.75,.5,.069);note(harmony[1],2.75,.46,.067);break;
      case 7: note(root+12,0,1.64,.081,.059);note(harmony[0],2,1.54,.071,.07);break;
      case 8: note(harmony[2]+12,0,1.48,.06,.06);note(harmony[1]+12,2.5,1.37,.051,.074);break;
      case 9: note(34+bar%4,0,.83,.135);note(41,2.5,.62,.094);break;
    }
  }
  return buffer;
}

function renderFanfare(context:BaseAudioContext,level:number) {
  const boss=level===arcadeLevels;
  const buffer=context.createBuffer(1,Math.round((boss ? 1.18 : .82)*rate),rate);
  const data=buffer.getChannelData(0);
  const root=boss ? 48 : [67,69,65,71,64,70,66,72,68][level-1];
  const steps=boss ? [0,7,12,15] : [0,7,12,16];
  steps.forEach((interval,index)=>addNote(data,boss ? 7 : 2,root+interval,index*(boss ? .36 : .21),index===3 ? .86 : .28,.19));
  addNote(data,3,boss ? 31 : 41,0,.46,boss ? .20 : .12);
  if (boss) addNote(data,9,38,1.1,.87,.16);
  return buffer;
}

type Stem={source:AudioBufferSourceNode;gain:GainNode};
export class ArcadeMusic {
  private stems=new Map<number,Stem>();
  private buffers=new Map<number,AudioBuffer>();
  private fanfares=new Map<number,AudioBuffer>();
  private output?:GainNode;
  private volume=.58;
  private origin=0;
  private offset=0;
  private cue?:AudioBufferSourceNode;

  get pulse() {
    if (!this.stems.size || !this.output) return 0;
    const elapsed=Math.max(0,this.output.context.currentTime-this.origin);
    return Math.exp(-(elapsed%beat)/beat*5.6);
  }

  private master(context:AudioContext) {
    if (!this.output) {
      this.output=context.createGain();
      this.output.gain.value=this.volume;
      this.output.connect(context.destination);
    }
    return this.output;
  }

  setVolume(volume:number) {
    this.volume=.58*volume;
    const output=this.output;
    output?.gain.setTargetAtTime(this.volume,output.context.currentTime,.025);
  }

  entrance(context:AudioContext|undefined,level:number) {
    if (!context || context.state!=='running') return;
    this.cue?.stop();
    let buffer=this.fanfares.get(level);
    if (!buffer) {
      buffer=renderFanfare(context,level);
      this.fanfares.set(level,buffer);
    }
    const source=context.createBufferSource();
    source.buffer=buffer;
    source.connect(this.master(context));
    source.onended=()=>{if (this.cue===source) this.cue=undefined;};
    source.start();
    this.cue=source;
  }

  sync(context:AudioContext|undefined,level:number,frozen:boolean) {
    if (frozen) {this.stop(true);return;}
    if (!context || context.state!=='running' || this.stems.size===level) return;
    const output=this.master(context),now=context.currentTime+.02;
    if (!this.stems.size) this.origin=now-this.offset;
    for (const [voice,stem] of this.stems) {
      if (voice>=level) {
        stem.gain.gain.setTargetAtTime(0,now,.02);
        stem.source.stop(now+.1);
        this.stems.delete(voice);
      }
    }
    for (let voice=0;voice<level;voice++) {
      if (this.stems.has(voice)) continue;
      let buffer=this.buffers.get(voice);
      if (!buffer) {
        buffer=renderCampaignStem(context,voice);
        this.buffers.set(voice,buffer);
      }
      const source=context.createBufferSource(),gain=context.createGain(),panner=context.createStereoPanner();
      const at=Math.max(now,context.currentTime+.01);
      source.buffer=buffer;source.loop=true;
      panner.pan.value=pans[voice];
      source.connect(panner).connect(gain).connect(output);
      gain.gain.setValueAtTime(0,at);
      gain.gain.linearRampToValueAtTime(1,at+.16);
      source.onended=()=>gain.disconnect();
      source.start(at,(at-this.origin)%buffer.duration);
      this.stems.set(voice,{source,gain});
    }
  }

  stop(preserve=false) {
    this.cue?.stop();
    this.cue=undefined;
    if (this.stems.size && this.output) {
      const now=this.output.context.currentTime,source=this.stems.values().next().value!;
      this.offset=preserve ? Math.max(0,now-this.origin)%source.source.buffer!.duration : 0;
      for (const {source,gain} of this.stems.values()) {
        gain.gain.setTargetAtTime(0,now,.02);
        source.stop(now+.1);
      }
      this.stems.clear();
    }
    if (!preserve) this.offset=0;
  }
}
