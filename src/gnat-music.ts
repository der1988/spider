const sampleRate=22050;
const beat=60/110;
const eighth=beat/2;
const bar=beat*4;
const circle=2*Math.PI;
const chords=[
  [43,55,58,62],[39,55,58,63],[46,53,58,62],[41,53,57,60],
  [43,55,58,62],[39,55,58,63],[48,55,60,63],[38,54,57,62],
] as const;
const melody=[
  [74,0,79,81,82,79,77,0], [75,0,77,79,82,0,79,0],
  [74,77,0,82,81,77,74,0], [72,77,0,81,79,77,72,0],
  [74,0,79,81,82,86,84,82], [79,82,87,0,86,82,79,0],
  [84,0,82,79,75,0,79,77], [74,0,78,81,79,78,74,0],
] as const;

type Voice='lead'|'bass'|'keys'|'pad';
type Drum='kick'|'snare'|'hat'|'tom';
function pulse(phase:number,width:number) {
  return Math.tanh(2.7*(Math.cos(phase*circle)-Math.cos(width*Math.PI)));
}

function envelope(time:number,length:number,attack:number,release:number) {
  return Math.max(0,Math.min(1,time/attack,(length-time)/release));
}

function renderMusic(context:AudioContext,danger:boolean,accent=false) {
  const length=accent ? .27 : bar*chords.length;
  const buffer=context.createBuffer(2,Math.round(length*sampleRate),sampleRate);
  const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
  function mix(at:number,duration:number,pan:number,signal:(t:number)=>number) {
    const start=Math.round(at*sampleRate);
    const count=Math.min(left.length-start,Math.round(duration*sampleRate));
    const l=(1-pan*.62)*.72,r=(1+pan*.62)*.72;
    for (let i=0;i<count;i++) {
      const value=signal(i/sampleRate);
      left[start+i]+=value*l;
      right[start+i]+=value*r;
    }
  }
  function note(voice:Voice,pitch:number,at:number,duration:number,gain:number,pan=0) {
    if (!pitch) return;
    const hz=440*2**((pitch-69)/12);
    mix(at,duration,pan,time=>{
      const phase=hz*time;
      const angle=phase*circle;
      const shape=envelope(time,duration,voice==='pad' ? .105 : .006,voice==='pad' ? .15 : .036);
      if (voice==='bass') {
        const tone=(1-4*Math.abs(phase-Math.round(phase)))*.76+pulse(phase,.35)*.24;
        return gain*tone*shape*Math.exp(-time*.96);
      }
      if (voice==='lead') {
        const bend=Math.sin(time*32)*.064;
        const bright=pulse(phase+bend,.37)+.28*Math.sin(angle*2+bend);
        return gain*bright*shape*Math.exp(-time*1.3);
      }
      if (voice==='keys') {
        return gain*Math.sin(angle+1.35*Math.exp(-time*8)*Math.sin(angle*2))*shape*Math.exp(-time*4.1);
      }
      return gain*(Math.sin(angle)*.76+Math.sin(angle+time*2.1)*.24)*shape;
    });
  }
  function drum(voice:Drum,at:number,gain:number,pan=0) {
    const duration=voice==='hat' ? .052 : voice==='kick' ? .20 : .18;
    let seed=531+(Math.round(at*sampleRate)>>>0),previous=0;
    mix(at,duration,pan,time=>{
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const noise=seed/2147483648-1;
      const edge=noise-previous;
      previous=noise;
      const fade=envelope(time,duration,.003,.028);
      if (voice==='kick' || voice==='tom') {
        const hz=voice==='kick' ? 43 : 99;
        return gain*fade*Math.exp(-time*18)*Math.sin(circle*(hz*time+2.5*(1-Math.exp(-time*39))));
      }
      if (voice==='hat') return gain*fade*Math.exp(-time*75)*edge;
      return gain*fade*Math.exp(-time*23)*(.62*edge+.38*Math.sin(time*circle*176));
    });
  }

  if (accent) {
    drum('kick',0,.43);
    drum('snare',.018,.23);
    note('lead',49,0,.17,.19,-.3);
    note('keys',55,.014,.24,.16,.32);
  } else {
    for (const [index,[root,...harmony]] of chords.entries()) {
      const start=index*bar;
      for (const [n,pitch] of harmony.entries()) {
        note('pad',danger && n===2 ? pitch-1 : pitch,start,bar-.015,danger ? .026 : .043,(n-1)*.37);
      }
      for (let step=0;step<8;step++) {
        const at=start+step*eighth;
        const bass=step===7 ? root+7 : step===4 ? root+12 : root;
        if (danger || step%2===0 || step===7) {
          note('bass',bass-(danger ? 12 : 0),at,eighth*(danger ? .71 : 1.38),danger ? .24 : .18);
        }
        const lead=melody[index][step];
        if (lead && (!danger || step%4!==3)) {
          note('lead',lead-(danger ? 12 : 0),at,eighth*(step%4===0 ? 1.38 : .83),danger ? .15 : .14,-.16);
          if (step<7) note('keys',lead,at+eighth*.77,eighth*.81,.031,.59);
        }
        const arp=harmony[(step+index)%harmony.length];
        if (danger || step%2) note('keys',arp+(step%4===3 ? 24 : 12),at+eighth*.18,eighth*.73,danger ? .112 : .085,.46);
        if (step===0 || step===4 || danger && (step===3 || step===6)) drum('kick',at,danger ? .28 : .17);
        if (step===2 || step===6) drum('snare',at,danger ? .225 : .127,-.12);
        drum('hat',at+(step%2 ? 0 : eighth*.52),step%2 ? .092 : .042,.55);
        if (danger) drum('hat',at+eighth*.48,.069,-.48);
        if (index%4===3 && step>=6) drum('tom',at+eighth*.56,danger ? .18 : .105,(step-6)*.4-.2);
      }
    }
  }
  for (let i=0;i<left.length;i++) {
    const seam=Math.min(1,i/250,(left.length-1-i)/330);
    left[i]=Math.tanh(left[i])*seam;
    right[i]=Math.tanh(right[i])*seam;
  }
  return buffer;
}

type Playback={quiet:AudioBufferSourceNode;danger:AudioBufferSourceNode;quietGain:GainNode;dangerGain:GainNode;output:GainNode;started:number};

export class GnatMusic {
  private tracks?: {quiet:AudioBuffer;danger:AudioBuffer;accent:AudioBuffer;volume:GainNode};
  private playing?:Playback;
  private offset=0;
  private alerted=false;
  private volume=.6;

  setVolume(value:number) {
    this.volume=.6*value;
    const gain=this.tracks?.volume;
    if (gain) gain.gain.setTargetAtTime(this.volume,gain.context.currentTime,.025);
  }

  sync(context:AudioContext|undefined,alerted:boolean,frozen:boolean) {
    if (frozen) {
      this.pause();
      return;
    }
    if (!context || context.state!=='running') return;
    if (!this.tracks) {
      const volume=context.createGain();
      volume.gain.value=this.volume;
      volume.connect(context.destination);
      this.tracks={quiet:renderMusic(context,false),danger:renderMusic(context,true),accent:renderMusic(context,true,true),volume};
    }
    const tracks=this.tracks;
    if (!this.playing) {
      const time=context.currentTime+.012;
      const output=context.createGain();
      const quietGain=context.createGain();
      const dangerGain=context.createGain();
      const loop=(buffer:AudioBuffer,gain:GainNode,value:number)=>{
        gain.gain.value=value;
        gain.connect(output);
        const source=context.createBufferSource();
        source.buffer=buffer;
        source.loop=true;
        source.connect(gain);
        source.start(time,this.offset);
        return source;
      };
      output.gain.setValueAtTime(0,time);
      output.gain.linearRampToValueAtTime(1,time+.018);
      output.connect(tracks.volume);
      this.playing={quiet:loop(tracks.quiet,quietGain,this.alerted ? 0 : 1),
        danger:loop(tracks.danger,dangerGain,this.alerted ? 1 : 0),quietGain,dangerGain,output,started:time};
    }
    if (alerted===this.alerted) return;
    this.alerted=alerted;
    const {quietGain,dangerGain,output,started}=this.playing;
    const time=Math.max(context.currentTime,started);
    const transition=alerted ? .065 : .28;
    quietGain.gain.setTargetAtTime(alerted ? 0 : 1,time,transition);
    dangerGain.gain.setTargetAtTime(alerted ? 1 : 0,time,transition);
    if (alerted) {
      const hit=context.createBufferSource();
      hit.buffer=tracks.accent;
      hit.connect(output);
      hit.start(time);
    }
  }

  private pause() {
    if (!this.playing || !this.tracks) return;
    const {quiet,danger,output,started}=this.playing;
    const time=output.context.currentTime;
    this.offset=(this.offset+Math.max(0,time-started))%this.tracks.quiet.duration;
    output.gain.cancelScheduledValues(time);
    output.gain.setTargetAtTime(0,time,.003);
    quiet.stop(time+.015);
    danger.stop(time+.015);
    quiet.onended=()=>output.disconnect();
    this.playing=undefined;
  }

  reset() {
    this.pause();
    this.offset=0;
    this.alerted=false;
  }
}
