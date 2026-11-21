type Entry = {name:string; catches:number};

export function bindLeaderboard() {
  const byId=<T extends HTMLElement>(id: string)=>document.getElementById(id) as T;
  const dialog=byId<HTMLDialogElement>('scoreboard');
  const reload=byId<HTMLButtonElement>('board-reload');
  const status=byId('board-status');
  const entries=byId<HTMLOListElement>('board-entries');
  let requestVersion=0;
  let crossHeld=false;
  let circleHeld=false;
  let triangleHeld=false;

  async function requestEntries(): Promise<Entry[]> {
    if (!/^https?:$/.test(location.protocol)) throw new Error('Open the hosted game to view the leaderboard.');
    if (!navigator.onLine) throw new Error('No connection. Reconnect and try again.');
    let response: Response;
    try {
      response=await fetch(new URL('api/scores',document.baseURI),{
        cache:'no-store',signal:AbortSignal.timeout(8000),
      });
    } catch {
      throw new Error('Could not reach the leaderboard. Check your connection and try again.');
    }
    const data=await response.json().catch(()=>null);
    if (!response.ok || !Array.isArray(data?.entries)) throw new Error(data?.error??'Leaderboard unavailable. Try again.');
    return data.entries;
  }

  async function load() {
    const version=++requestVersion;
    reload.hidden=true;
    entries.replaceChildren();
    status.textContent='Loading leaderboard…';
    try {
      const board=await requestEntries();
      if (version!==requestVersion) return;
      for (const {name,catches} of board) {
        const item=document.createElement('li');
        const row=document.createElement('span');
        row.className='score-row';
        const initials=document.createElement('strong');
        initials.textContent=name;
        const count=document.createElement('span');
        count.textContent=catches===1 ? '1 fly caught' : catches+' flies caught';
        row.append(initials,count);
        item.append(row);
        entries.append(item);
      }
      status.textContent=board.length ? '' : 'No scores yet.';
    } catch (error) {
      if (version!==requestVersion) return;
      status.textContent=(error as Error).message;
      reload.hidden=false;
    }
  }

  function close() {
    requestVersion++;
    dialog.close();
  }

  byId('board-close').onclick=close;
  reload.onclick=()=>void load();
  dialog.oncancel=event=>{ event.preventDefault(); close(); };

  function handlePad(pad: Gamepad|null|undefined) {
    const pressed=(index: number)=>!!pad?.buttons[index]?.pressed;
    const cross=pressed(0), circle=pressed(1), triangle=pressed(3);
    const confirm=cross && !crossHeld, cancel=circle && !circleHeld, view=triangle && !triangleHeld;
    crossHeld=cross;
    circleHeld=circle;
    triangleHeld=triangle;
    if (!dialog.open) {
      if (view) {
        dialog.showModal();
        void load();
      }
    } else if (cancel || (confirm && reload.hidden)) close();
    else if (confirm) void load();
  }

  return {handlePad,get open() {return dialog.open;}};
}
