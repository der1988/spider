type Entry = {name:string; catches:number};
type Result = {id:string; catches:number};

export function newRunId() {
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;
  bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

export function bindLeaderboard() {
  const byId=<T extends HTMLElement>(id: string)=>document.getElementById(id) as T;
  const dialog=byId<HTMLDialogElement>('scoreboard');
  const form=byId<HTMLFormElement>('score-form');
  const save=byId<HTMLButtonElement>('score-save');
  const reload=byId<HTMLButtonElement>('board-reload');
  const status=byId('board-status');
  const entries=byId<HTMLOListElement>('board-entries');
  const title=byId('board-title');
  const countText=(n: number)=>n===1 ? '1 fly caught' : n+' flies caught';
  let result: Result|undefined;
  let submittedName: string|undefined;
  let saving=false;
  let requestVersion=0;
  let selected=0;
  let held='';
  let repeatAt=0;
  let crossHeld=false;
  let circleHeld=false;
  let triangleHeld=false;

  function selectLetter(index: number) {
    selected=Math.max(0,Math.min(4,index));
    letters[selected].focus();
    letters[selected].select();
  }

  // Filter before uppercasing to keep expansions such as ß out of the alphabet.
  const clean=(input: string)=>input.replace(/[^A-Za-z]/g,'').toUpperCase();
  const letters=Array.from({length:5},(_,index)=>{
    const letter=document.createElement('input');
    letter.type='text';
    letter.maxLength=1;
    letter.autocomplete='off';
    letter.spellcheck=false;
    letter.setAttribute('aria-label','Letter '+(index+1));
    letter.onfocus=()=>{ selected=index; letter.select(); };
    letter.oninput=()=>{
      letter.value=clean(letter.value);
      if (letter.value && index<4) selectLetter(index+1);
    };
    letter.onkeydown=event=>{
      if (!event.key.startsWith('Arrow')) return;
      event.preventDefault();
      if (submittedName===undefined) navigate(event.key.slice(5).toLowerCase());
    };
    letter.onpaste=event=>{
      event.preventDefault();
      if (submittedName!==undefined) return;
      const values=clean(event.clipboardData?.getData('text')??'');
      for (let i=0;i<values.length && index+i<5;i++) letters[index+i].value=values[i];
      selectLetter(index+values.length);
    };
    byId('score-letters').append(letter);
    return letter;
  });

  async function request<T>(body?: Entry & {runId:string}): Promise<T> {
    if (!/^https?:$/.test(location.protocol)) throw new Error('Open the hosted game to view the leaderboard or save a score.');
    if (!navigator.onLine) throw new Error('No connection. Reconnect and try again.');
    let response: Response;
    try {
      response=await fetch(new URL('api/scores',document.baseURI),{
        cache:'no-store',signal:AbortSignal.timeout(8000),
        ...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}),
      });
    } catch {
      throw new Error('Could not reach the leaderboard. Check your connection and try again.');
    }
    const data=await response.json().catch(()=>null);
    if (!response.ok || !data) throw new Error(data?.error??'Leaderboard unavailable. Try again.');
    return data;
  }

  async function load(prefix='') {
    const version=++requestVersion;
    reload.hidden=true;
    entries.replaceChildren();
    status.textContent=prefix+'Loading leaderboard…';
    try {
      const board=await request<{entries:Entry[]}>();
      if (version!==requestVersion) return;
      for (const {name,catches} of board.entries) {
        const item=document.createElement('li');
        const row=document.createElement('span');
        row.className='score-row';
        const initials=document.createElement('strong');
        initials.textContent=name;
        const count=document.createElement('span');
        count.textContent=countText(catches);
        row.append(initials,count);
        item.append(row);
        entries.append(item);
      }
      status.textContent=prefix+(board.entries.length ? '' : 'No scores yet.');
    } catch (error) {
      if (version!==requestVersion) return;
      status.textContent=prefix+(error as Error).message;
      reload.hidden=false;
    }
  }

  async function submit() {
    if (!result || saving) return;
    const name=submittedName??letters.map(letter=>letter.value).join('');
    if (!/^[A-Z]{5}$/.test(name)) {
      status.textContent='Enter exactly five letters from A to Z.';
      selectLetter(letters.findIndex(letter=>!letter.value));
      return;
    }
    const version=++requestVersion;
    const score=result;
    submittedName=name;
    saving=true;
    save.disabled=true;
    for (const letter of letters) letter.readOnly=true;
    status.textContent='Saving…';
    try {
      await request<Entry>({name,catches:score.catches,runId:score.id});
      if (version!==requestVersion) return;
      result=undefined;
      form.hidden=true;
      title.textContent='Leaderboard';
      byId('board-close').focus();
      void load('Score saved · '+name+' · '+countText(score.catches)+'. ');
    } catch (error) {
      if (version!==requestVersion) return;
      status.textContent=(error as Error).message;
      save.textContent='Try again';
      save.focus();
    } finally {
      if (result===score) {
        saving=false;
        save.disabled=false;
      }
    }
  }

  function show(score?: Result) {
    if (dialog.open) return;
    result=score;
    submittedName=undefined;
    saving=false;
    save.disabled=false;
    save.textContent='Save score';
    form.hidden=!score;
    reload.hidden=true;
    entries.replaceChildren();
    status.textContent='';
    title.textContent=score ? 'Game over' : 'Leaderboard';
    dialog.showModal();
    if (score) {
      byId('score-result').textContent=countText(score.catches)+'. Save your score or skip.';
      for (const letter of letters) {
        letter.readOnly=false;
        letter.value='A';
      }
      selectLetter(0);
    } else void load();
  }

  function close() {
    ++requestVersion;
    dialog.close();
    result=undefined;
    saving=false;
  }

  form.onsubmit=event=>{ event.preventDefault(); void submit(); };
  byId('show-board').onclick=()=>show();
  byId('board-close').onclick=close;
  byId('score-skip').onclick=close;
  reload.onclick=()=>void load();
  dialog.oncancel=event=>{ event.preventDefault(); close(); };

  function navigate(direction: string) {
    if (direction==='left' || direction==='right') selectLetter(selected+(direction==='left' ? -1 : 1));
    else {
      const n=letters[selected].value.charCodeAt(0)-65 || 0;
      letters[selected].value=String.fromCharCode(65+(n+(direction==='up' ? 1 : 25))%26);
      selectLetter(selected);
    }
  }

  function handlePad(pad: Gamepad|null|undefined, time: number) {
    const pressed=(index: number)=>!!pad?.buttons[index]?.pressed;
    const cross=pressed(0), circle=pressed(1), triangle=pressed(3);
    const confirm=cross && !crossHeld, cancel=circle && !circleHeld, view=triangle && !triangleHeld;
    crossHeld=cross;
    circleHeld=circle;
    triangleHeld=triangle;
    if (!dialog.open) {
      held='';
      if (view) show();
      return;
    }
    if (cancel) { close(); return; }
    if (!result) {
      if (confirm) {
        if (reload.hidden) close();
        else void load();
      }
      return;
    }
    if (confirm) {
      if (submittedName!==undefined || selected===4) void submit();
      else selectLetter(selected+1);
      return;
    }
    if (submittedName!==undefined) return;
    const x=pad?.axes[0]??0, y=pad?.axes[1]??0;
    const direction=pressed(14) ? 'left' : pressed(15) ? 'right' :
      pressed(12) ? 'up' : pressed(13) ? 'down' :
      Math.max(Math.abs(x),Math.abs(y))<.55 ? '' :
      Math.abs(x)>Math.abs(y) ? (x<0 ? 'left' : 'right') : (y<0 ? 'up' : 'down');
    if (!direction) { held=''; return; }
    if (direction===held && time<repeatAt) return;
    repeatAt=time+(direction===held ? 110 : 325);
    held=direction;
    navigate(direction);
  }

  return {show,handlePad,get open() {return dialog.open;}};
}
