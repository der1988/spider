const sampleRate=22050;
const eighth=60/110/2;
const steps=32;
const bassPattern=[43,43,46,43,41,41,44,42];
const melody=[67,0,0,70,0,65,0,66];
const dangerTicks=[0,.25,.55,.78];
const quietTicks=[0,.63];
const circle=2*Math.PI;

function oscillator(note:number,time:number,square=false) {
  const phase=time*440*2**((note-69)/12);
  return square ? Math.tanh(2.1*Math.sin(circle*phase)) : 1-4*Math.abs(phase-Math.round(phase));
}

function envelope(time:number,length:number,decay:number) {
  return Math.max(0,Math.min(1,time/.004,(length-time)/.012))*Math.exp(-time/decay);
}

function synthesize(context:AudioContext,danger:boolean,accent=false) {
  const length=accent ? .27 : eighth*steps;
  const buffer=context.createBuffer(1,Math.round(length*sampleRate),sampleRate);
  const samples=buffer.getChannelData(0);
  let noiseSeed=731;
  let previousNoise=0;
  for (let i=0;i<samples.length;i++) {
    const time=i/sampleRate;
    const step=Math.floor(time/eighth);
    const local=time-step*eighth;
    const root=bassPattern[Math.floor(step/4)];
    noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;
    const noise=noiseSeed/2**31-.5;
    const click=noise-previousNoise;
    previousNoise=noise;
    if (accent) {
      const impact=Math.sin(circle*(43*time+1.7*(1-Math.exp(-42*time))));
      const stab=oscillator(49,time,true)+oscillator(55,time,true)*.55;
      samples[i]=impact*.34*envelope(time,length,.065)
        +stab*.14*envelope(time,.15,.036)+click*.21*envelope(time,.04,.011);
      continue;
    }
    const note=root+(step%4===3 ? -1 : 0);
    const bass=oscillator(note-(danger ? 12 : 0),local);
    const lead=melody[step%melody.length];
    const ticks=danger ? dangerTicks : quietTicks;
    const tickAt=ticks.reduce((latest,fraction)=>local>=eighth*fraction ? fraction : latest,0);
    const tickTime=local-tickAt*eighth;
    const bassHit=danger || step%2===0 ? bass*envelope(local,eighth,danger ? .13 : .09) : 0;
    const synth=lead ? oscillator(lead-(danger ? 12 : 0),local,true)*envelope(local,.12,.045) : 0;
    const undertone=danger ? oscillator(root+6,local)*envelope(local,eighth,.17) : 0;
    samples[i]=bassHit*(danger ? .26 : .17)+synth*(danger ? .07 : .055)+undertone*.075
      +click*envelope(tickTime,.018,.004)*(danger ? .12 : .065);
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
      this.tracks={quiet:synthesize(context,false),danger:synthesize(context,true),accent:synthesize(context,true,true),volume};
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
    const transition=alerted ? .009 : .26;
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
