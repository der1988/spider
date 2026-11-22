import {advanceArena,createArena,type ArenaInput} from './arena-run.ts';

export const runPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const packetSize=7;
const maxTicks=120*60*60;
const rotationPrefix='v2.';
export const maxReplayLength=Math.ceil(maxTicks*packetSize/3)*4+rotationPrefix.length;

export function newEndlessId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;
  bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

export function endlessArena(runId:string,rotate=true) {
  const seed=Number.parseInt(runId.slice(0,8),16);
  return createArena('loop',seed,rotate);
}

export function recordReplay(rotate=false) {
  const packets:number[]=[];
  let ticks=0;
  let last:ArenaInput|undefined;
  let repeat=0;
  return {
    add(input:ArenaInput) {
      if (++ticks>maxTicks) return;
      if (!input[4] && repeat<65535 && last?.every((value,index)=>value===input[index])) {
        repeat++;
        packets[packets.length-packetSize]=repeat&255;
        packets[packets.length-packetSize+1]=repeat>>>8;
      } else {
        repeat=1;
        last=input;
        packets.push(1,0,...input.map(value=>value&255));
      }
    },
    encode() {
      if (ticks>maxTicks) return;
      let binary='';
      for (let i=0;i<packets.length;i+=8192) binary+=String.fromCharCode(...packets.slice(i,i+8192));
      return (rotate ? rotationPrefix : '')+btoa(binary);
    },
  };
}

export function replayScore(runId:string,replay:string) {
  if (runId.length!==36 || !runPattern.test(runId) || !replay.length || replay.length>maxReplayLength) return;
  const rotate=replay.startsWith(rotationPrefix);
  if (rotate) replay=replay.slice(rotationPrefix.length);
  let binary:string;
  try { binary=atob(replay); } catch { return; }
  if (binary.length%packetSize!==0 || btoa(binary)!==replay) return;
  const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
  const axes=new Int8Array(bytes.buffer);
  // Validate the full schedule before performing any simulation.
  let ticks=0;
  for (let i=0;i<bytes.length;i+=packetSize) {
    const repeat=bytes[i]+256*bytes[i+1];
    const buttons=bytes[i+6];
    if (!repeat || (ticks+=repeat)>maxTicks || buttons>3 || (buttons!==0 && repeat!==1)) return;
    for (let offset=2;offset<=5;offset++) if (axes[i+offset]===-128) return;
  }
  const run=endlessArena(runId,rotate);
  for (let i=0;i<bytes.length;i+=packetSize) {
    const repeat=bytes[i]+256*bytes[i+1];
    const input:ArenaInput=[axes[i+2],axes[i+3],axes[i+4],axes[i+5],bytes[i+6]];
    for (let tick=0;tick<repeat;tick++) {
      if (advanceArena(run,input)!=='over') continue;
      if (tick===repeat-1 && i+packetSize===bytes.length) return run.hunt.score;
      return;
    }
  }
}
