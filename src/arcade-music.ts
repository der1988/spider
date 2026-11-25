import {frankMix} from './frank-story';
import {arcadeLevels} from './arcade-dialogue';

const bpm=112;
const beat=60/bpm;
const rate=16000;
const chords=[
  [50,57,60,65],[46,53,57,62],[43,55,58,62],[45,55,61,64],
  [50,57,60,65],[48,55,60,64],[46,53,57,62],[45,55,61,64],
  [53,57,60,65],[43,55,58,62],[46,53,57,62],[45,55,61,64],
];
const loopLength=Math.round(chords.length*4*beat*rate);
const melody=[
  [74,0,77,79,81,0,77,0],[74,0,72,69,65,0,69,0],
  [67,0,70,72,74,0,77,0],[76,0,73,0,69,0,0,73],
  [74,0,77,79,86,0,84,81],[79,0,76,72,79,0,77,0],
  [74,0,77,81,82,0,81,77],[76,0,73,76,81,0,0,0],
  [84,0,81,77,79,81,84,0],[82,0,79,74,77,0,79,82],
  [86,0,81,77,74,0,77,0],[76,0,73,69,73,0,0,0],
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
        melody[bar].forEach((pitch,i)=>{
          if (pitch) note(pitch,i*.5+(i%2 && bar%3===1 ? .08 : 0),melody[bar][i+1]===0 ? .82 : .39,.188);
        });
        break;
      case 1: note(root,0,1.6,.16);note(bar%2 ? root+7 : root,2,1.55,.14);break;
      case 2: [1,2,3,3.5].forEach((offset,i)=>note(harmony[(i+bar)%3]+12,offset,.28,.062));break;
      case 3: note(32,0,.33,.12);note(39,2,.29,.086);note(57,3.5,.12,.037);break;
      case 4: harmony.forEach(pitch=>note(pitch,0,3.92,.027,.155));break;
      case 5: note(harmony[2]+24,1.5,.68,.048);if (bar%2) note(harmony[1]+24,3,.73,.041);break;
      case 6: note(harmony[0],.75,.5,.069);note(harmony[1],2.75,.46,.067);break;
      case 7: note(root+12,0,1.64,.081,.059);note(harmony[0],2,1.54,.071,.07);break;
      case 8:
        note(harmony[2]+12,1.75,.59,.057,.055);
        note(harmony[1]+12,2.5,.72,.051,.074);
        if (bar%3) note(harmony[0]+12,3.5,.44,.047);
        break;
      case 9: note(34+bar%4,0,.83,.135);note(41,2.5,.62,.094);break;
    }
  }
  return buffer;
}

function renderFanfare(context:BaseAudioContext,level:number) {
  const boss=level===arcadeLevels;
  const buffer=context.createBuffer(1,Math.round((boss ? 1.32 : 1.02)*rate),rate);
  const data=buffer.getChannelData(0);
  const phrase=melody[(level-1)%melody.length].filter(Boolean).slice(0,4);
  phrase.forEach((pitch,index)=>{
    const at=[.025,.19,.39,.66][index]/beat;
    addNote(data,boss ? 7 : 2,pitch-(boss ? 12 : 0),at,index===3 ? .57 : .24,.17);
    if (boss && index>1) addNote(data,4,pitch-24,at,.7,.081);
  });
  addNote(data,3,boss ? 34 : 42,.66/beat,.49,boss ? .20 : .12);
  if (boss) addNote(data,9,38,.66/beat,.87,.16);
  return buffer;
}

type Stem={source:AudioBufferSourceNode;gain:GainNode};
export class ArcadeMusic {
  private stems=new Map<number,Stem>();
  private buffers=new Map<number,AudioBuffer>();
  private fanfares=new Map<number,AudioBuffer>();
  private output?:GainNode;
  private bed?:GainNode;
  private cueGain?:GainNode;
  private cinematic=false;
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
    this.fadeCue(context.currentTime);
    let buffer=this.fanfares.get(level);
    if (!buffer) {
      buffer=renderFanfare(context,level);
      this.fanfares.set(level,buffer);
    }
    const source=context.createBufferSource();
    source.buffer=buffer;
    const gain=context.createGain();
    source.connect(gain).connect(this.master(context));
    source.onended=()=>{
      gain.disconnect();
      if (this.cue===source) {this.cue=undefined;this.cueGain=undefined;}
    };
    source.start();
    this.cue=source;this.cueGain=gain;
  }

  private fadeCue(now:number) {
    if (this.cue && this.cueGain) {
      this.cueGain.gain.setTargetAtTime(0,now,.035);
      this.cue.stop(now+.13);
    }
    this.cue=undefined;this.cueGain=undefined;
  }

  sync(context:AudioContext|undefined,level:number,frozen:boolean,cinematic=false) {
    if (frozen) {this.stop(true);return;}
    if (!context || context.state!=='running') return;
    const now=context.currentTime+.02;
    if (!this.bed) {
      this.bed=context.createGain();
      this.bed.gain.value=cinematic ? frankMix.narrative : frankMix.combat;
      this.bed.connect(this.master(context));
    }
    if (cinematic!==this.cinematic) {
      this.bed.gain.setTargetAtTime(cinematic ? frankMix.narrative : frankMix.combat,now,cinematic ? .045 : .095);
      if (!cinematic) this.fadeCue(now);
      this.cinematic=cinematic;
    }
    if (this.stems.size===level) return;
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
      source.connect(panner).connect(gain).connect(this.bed);
      gain.gain.setValueAtTime(0,at);
      gain.gain.linearRampToValueAtTime(1,at+.16);
      source.onended=()=>gain.disconnect();
      source.start(at,(at-this.origin)%buffer.duration);
      this.stems.set(voice,{source,gain});
    }
  }

  stop(preserve=false) {
    if (this.output) this.fadeCue(this.output.context.currentTime);
    if (this.stems.size && this.output) {
      const now=this.output.context.currentTime,source=this.stems.values().next().value!;
      this.offset=preserve ? Math.max(0,now-this.origin)%source.source.buffer!.duration : 0;
      for (const {source,gain} of this.stems.values()) {
        gain.gain.setTargetAtTime(0,now,.02);
        source.stop(now+.1);
      }
      this.stems.clear();
    }
    if (!preserve) {this.offset=0;this.cinematic=false;this.bed?.gain.setTargetAtTime(1,this.bed.context.currentTime,.02);}
  }
}
