import {defaultTiming,saveTiming,type SongTiming} from './song-cues';
import {captions,controlsCue} from './song-timing';

export function bindCalibration(
  dialog: HTMLDialogElement, bytes: Promise<ArrayBuffer|undefined>, current: () => SongTiming,
  apply: (timing: SongTiming) => void, syncPause: () => void,
) {
  const byId=<T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const player=byId<HTMLAudioElement>('calibration-audio');
  const line=byId<HTMLSelectElement>('calibration-line');
  const message=byId('calibration-time');
  const mark=byId<HTMLButtonElement>('calibration-mark');
  const seek=byId<HTMLButtonElement>('calibration-seek');
  let draft=defaultTiming();
  const selected=() => line.selectedIndex;
  function describe() {
    message.textContent='Tempo salvabile per la riga · '+draft.starts[selected()].toFixed(3)+' s';
  }
  function mediaReady() {
    mark.disabled=seek.disabled=!Number.isFinite(player.duration);
  }

  captions.forEach(([, ,text],i)=>line.add(new Option((i+1)+'. '+text,String(i))));
  line.onchange=describe;
  player.onloadedmetadata=mediaReady;
  mediaReady();

  byId<HTMLButtonElement>('calibrate').onclick=()=>{
    const timing=current();
    draft={starts:[...timing.starts],loopStart:timing.loopStart};
    line.selectedIndex=0;
    describe();
    dialog.showModal();
    syncPause();
    if (!player.hasAttribute('src')) void bytes.then(data=>{
      if (!data) {
        message.textContent='Brano non disponibile.';
        return;
      }
      if (!player.hasAttribute('src')) player.src=URL.createObjectURL(new Blob([data],{type:'audio/mpeg'}));
    });
  };
  mark.onclick=()=>{
    const index=selected();
    const time=Math.round(player.currentTime*1000)/1000;
    draft.starts[index]=time;
    if (index===controlsCue) draft.loopStart=time;
    line.selectedIndex=Math.min(index+1,captions.length-1);
    message.textContent='Riga '+(index+1)+' segnata a '+time.toFixed(3)+' s.';
  };
  seek.onclick=()=>{ player.currentTime=Math.max(0,draft.starts[selected()]-.7); };
  byId<HTMLButtonElement>('calibration-reset').onclick=()=>{
    draft=defaultTiming();
    describe();
  };
  byId<HTMLButtonElement>('calibration-save').onclick=()=>{
    if (!saveTiming(draft)) {
      message.textContent='Controlla che tutte le righe siano in ordine cronologico.';
      return;
    }
    apply({starts:[...draft.starts],loopStart:draft.loopStart});
    dialog.close();
  };
  byId<HTMLButtonElement>('calibration-close').onclick=()=>dialog.close();
  dialog.onclose=()=>{
    player.pause();
    syncPause();
  };
}
