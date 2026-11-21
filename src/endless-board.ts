type Result = {status:'qualified'|'outside'|'published'|'skipped'; catches:number; position?:number; error?:string};
type Entry = {position:number;name:string;catches:number};
type Pending = {runId:string;catches:number;replay?:string;intent?:{action:'publish';name:string}|{action:'skip'}};
type Run = Pick<Pending,'runId'|'catches'|'replay'>;

class BoardError extends Error {
  constructor(message:string,readonly retryable:boolean) { super(message); }
}

function pendingStore() {
  let opening:Promise<IDBDatabase>|undefined;
  function database() {
    opening??=new Promise((resolve,reject)=>{
      const request=indexedDB.open('tamago-endless',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('pending',{keyPath:'runId'});
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return opening;
  }
  return async <T>(mode:IDBTransactionMode,operation:(store:IDBObjectStore)=>IDBRequest<T>)=>{
    const db=await database();
    return new Promise<T>((resolve,reject)=>{
      const tx=db.transaction('pending',mode);
      const request=operation(tx.objectStore('pending'));
      tx.oncomplete=()=>resolve(request.result);
      tx.onabort=()=>reject(tx.error);
    });
  };
}

async function request<T>(body?:object):Promise<T> {
  if (!navigator.onLine || !/^https?:$/.test(location.protocol)) {
    throw new BoardError('Leaderboard unavailable offline.',true);
  }
  let response:Response;
  try {
    response=await fetch(new URL('api/endless',document.baseURI),{
      cache:'no-store',signal:AbortSignal.timeout(9000),
      ...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}),
    });
  } catch { throw new BoardError('Connection lost. Try again when you are online.',true); }
  const data=await response.json().catch(()=>null);
  if (!response.ok || !data) throw new BoardError(data?.error??'Leaderboard unavailable. Try again.',response.status>=500 || !data);
  return data;
}

export function bindEndlessBoard() {
  const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
  const dialog=get<HTMLDialogElement>('endless-board');
  const heading=get('endless-title');
  const entries=get('endless-entries');
  const status=get('endless-board-status');
  const summary=get('endless-status');
  const again=get<HTMLButtonElement>('endless-again');
  const form=get<HTMLFormElement>('endless-name-form');
  const field=get<HTMLInputElement>('endless-name');
  const publish=get<HTMLButtonElement>('endless-publish');
  const skip=get<HTMLButtonElement>('endless-skip');
  const close=get<HTMLButtonElement>('endless-close');
  const storage=pendingStore();
  const pending=new Map<string,Pending>();
  const busy=new Set<string>();
  const loaded=storage('readonly',store=>store.getAll()).then(rows=>{
    for (const run of rows) if (!pending.has(run.runId)) pending.set(run.runId,run);
  }).catch(()=>{});
  let current:string|undefined;
  let naming:Pending|undefined;
  let cursor=0;
  let listVersion=0;
  let held=0;
  let directionHeld='';
  let repeatAt=0;

  async function keep(run:Pending) {
    pending.set(run.runId,run);
    return storage('readwrite',store=>store.put(run)).then(()=>true).catch(()=>false);
  }
  async function forget(run:Pending) {
    pending.delete(run.runId);
    await storage('readwrite',store=>store.delete(run.runId)).catch(()=>{});
  }
  function inform(run:Pending,text:string) {
    if (current===run.runId) summary.textContent=text;
    if (dialog.open && (!naming || naming.runId===run.runId)) status.textContent=text;
  }
  function setCursor() {
    if (document.activeElement===field) field.setSelectionRange(cursor,Math.min(field.value.length,cursor+1));
  }
  function nameRun(run:Pending) {
    listVersion++;
    naming=run;
    heading.textContent='You made the Top 10!';
    entries.hidden=true;
    status.textContent='';
    again.hidden=true;
    close.hidden=true;
    form.hidden=false;
    field.value='';
    cursor=0;
    if (!dialog.open) dialog.showModal();
    field.focus();
    setCursor();
  }
  function actionButton() {
    const run=pending.get(current??'')??pending.values().next().value;
    again.textContent=run && !run.replay && !run.intent ? 'Enter Name' : 'Try Again';
    return run;
  }
  function dismiss() {
    listVersion++;
    naming=undefined;
    dialog.close();
  }
  async function view(notice='') {
    close.hidden=false;
    naming=undefined;
    form.hidden=true;
    heading.textContent='Endless Top 10';
    entries.hidden=false;
    entries.replaceChildren();
    again.hidden=true;
    status.textContent=notice || 'Loading leaderboard…';
    if (!dialog.open) dialog.showModal();
    const version=++listVersion;
    await loaded;
    if (version!==listVersion) return;
    again.hidden=!actionButton();
    try {
      const board=await request<{entries:Entry[]}>();
      if (version!==listVersion) return;
      for (const {position,name,catches} of board.entries) {
        const item=document.createElement('li');
        item.value=position;
        const row=document.createElement('span');
        row.className='score-row';
        const initials=document.createElement('strong');
        initials.textContent=name;
        const score=document.createElement('span');
        score.textContent=catches===1 ? '1 catch' : catches+' catches';
        row.append(initials,score);
        item.append(row);
        entries.append(item);
      }
      status.textContent=notice || (board.entries.length ? '' : 'No scores yet.');
    } catch (error) {
      if (version!==listVersion) return;
      status.textContent=notice || (error as Error).message;
      again.hidden=false;
    }
  }
  function finished(run:Pending,message:string) {
    if (naming?.runId===run.runId && current===run.runId) dismiss();
    else if (dialog.open && (!naming || naming.runId===run.runId)) void view(message);
    inform(run,message);
  }
  async function sync(run:Pending,openName=false) {
    if (busy.has(run.runId)) return;
    busy.add(run.runId);
    let saved=await keep(run);
    try {
      if (run.replay) {
        const result=await request<Result>({action:'register',...run});
        if (result.status!=='qualified') {
          await forget(run);
          finished(run,result.status==='outside' ? 'This score is outside the Top 10.' : 'Score received.');
          return;
        }
        delete run.replay;
        saved=await keep(run);
      }
      if (!run.intent) {
        inform(run,'You made the Top 10!');
        if (!naming && ((openName && dialog.open) || current===run.runId)) nameRun(run);
        return;
      }
      const result=await request<Result>({runId:run.runId,...run.intent});
      await forget(run);
      finished(run,result.error??(result.status==='published' ? 'Score published.' : 'Score skipped.'));
    } catch (error) {
      if (error instanceof BoardError && !error.retryable) {
        await forget(run);
        finished(run,error.message);
      } else {
        const message=(error as Error).message+(saved ? ' Result saved on this device.' : ' This device could not save the result.');
        if (naming?.runId===run.runId) {
          if (current===run.runId) dismiss();
          else void view(message);
        }
        inform(run,message);
        if (dialog.open) again.hidden=false;
      }
    } finally { busy.delete(run.runId); }
  }
  function finish(run:Run) {
    current=run.runId;
    summary.textContent='Checking the Top 10…';
    if (!run.replay) {
      summary.textContent='This game exceeded the leaderboard replay limit.';
      return;
    }
    void sync(run);
  }
  function submit(action:'publish'|'skip') {
    if (!naming) return;
    const name=field.value;
    if (action==='publish' && !/^[A-Z]{1,6}$/.test(name)) {
      status.textContent='Enter 1–6 letters from A to Z.';
      field.focus();
      return;
    }
    const run=naming;
    if (busy.has(run.runId)) return;
    run.intent=action==='publish' ? {action,name} : {action};
    status.textContent='Saving…';
    void sync(run);
  }

  field.oninput=()=>{ field.value=field.value.replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,6); };
  form.onsubmit=event=>{ event.preventDefault(); submit('publish'); };
  skip.onclick=()=>submit('skip');
  close.onclick=dismiss;
  again.onclick=()=>{
    const candidate=actionButton();
    if (candidate) void sync(candidate,true);
    else void view();
  };
  dialog.oncancel=event=>{ event.preventDefault(); if (naming) submit('skip'); else dismiss(); };

  function edit(dir:string) {
    const text=field.value;
    if (dir==='left' || dir==='right') cursor=Math.max(0,Math.min(5,text.length,cursor+(dir==='left' ? -1 : 1)));
    else if (dir==='delete' && text) {
      const index=Math.min(cursor,text.length-1);
      field.value=text.slice(0,index)+text.slice(index+1);
      cursor=Math.min(cursor,field.value.length);
    } else if (dir==='up' || dir==='down') {
      const previous=text.charCodeAt(cursor)-65;
      const next=Number.isNaN(previous) ? (dir==='up' ? 0 : 25) : (previous+(dir==='up' ? 1 : 25))%26;
      field.value=text.slice(0,cursor)+String.fromCharCode(65+next)+text.slice(cursor+1);
    }
    field.focus();
    setCursor();
  }
  function handlePad(pad:Gamepad|null|undefined,time:number,canView:boolean) {
    const pressed=(index:number)=>!!pad?.buttons[index]?.pressed;
    const keys=Number(pressed(0)) | Number(pressed(1))*2 | Number(pressed(2))*4 | Number(pressed(3))*8;
    const fresh=keys&~held;
    held=keys;
    if (!dialog.open) {
      directionHeld='';
      if (canView && (fresh&8)) void view();
      return;
    }
    if (naming) {
      if (fresh&2) submit('skip');
      else if (fresh&1) publish.click();
      else if (fresh&4) edit('delete');
      const x=pad?.axes[0]??0,y=pad?.axes[1]??0;
      const dir=pressed(14) ? 'left' : pressed(15) ? 'right' : pressed(12) ? 'up' : pressed(13) ? 'down' :
        Math.max(Math.abs(x),Math.abs(y))<.62 ? '' : Math.abs(x)>Math.abs(y) ? (x<0 ? 'left' : 'right') : (y<0 ? 'up' : 'down');
      if (dir && (dir!==directionHeld || time>=repeatAt)) {
        repeatAt=time+(dir===directionHeld ? 110 : 340);
        edit(dir);
      }
      directionHeld=dir;
    } else if (fresh&2 || fresh&8) dismiss();
    else if (fresh&1) { if (again.hidden) dismiss(); else again.click(); }
  }
  return {finish,view,handlePad,clear:()=>{ current=undefined;summary.textContent=''; },get open(){return dialog.open;}};
}
