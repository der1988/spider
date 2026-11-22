import {speakerNames,type DialogueLine,type Speaker} from './gnat-dialogue';

const portraits:Record<Speaker,readonly [string,string][]>={
  spider:[
    ['#9eb77b','M4 5h8v1h2v6h-2v2H4v-2H2V6h2z'],
    ['#263a2d','M1 10h2v3H1zm12 0h2v3h-2zM6 8h1v2H6zm3 0h1v2H9z'],
    ['#f9e99d','M4 7h2v2H4zm6 0h2v2h-2z'],
  ],
  hunter:[
    ['#ae7751','M3 3h10v2h2v7h-3v2H4v-2H1V5h2z'],
    ['#ffce8c','M3 6h2v1h2v2H5V8H3zm8 0h2v2h-2v1H9V7h2zM5 11h2v3H5zm4 0h2v3H9z'],
  ],
  midge:[
    ['#a6cba1','M1 3h5v2h2v4H4V7H1zm9 0h5v4h-3v2H8V5h2z'],
    ['#6d884f','M5 7h6v7H5z'],
    ['#f1f9d7','M5 8h2v3H5zm4 0h2v3H9z'],
  ],
  dart:[
    ['#a4d2db','M1 4h6v3H4v2H1zm8 0h6v5h-3V7H9z'],
    ['#6e9e96','M4 7h8v4h-2v2H6v-2H4z'],
    ['#ecf9ef','M5 7h2v2H5zm4 0h2v2H9z'],
  ],
  pip:[
    ['#caabd7','M2 4h4v2h4V4h4v5h-3v1H5V9H2z'],
    ['#9d779e','M4 7h8v6h-2v1H6v-1H4z'],
    ['#fae4ce','M5 8h2v3H5zm4 0h2v3H9z'],
  ],
};

function dialogueRow(line:DialogueLine) {
  const row=document.createElement('li');
  row.className='gnat-line';
  row.dataset.speaker=line.speaker;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 16 16');
  svg.setAttribute('shape-rendering','crispEdges');
  svg.setAttribute('aria-hidden','true');
  for (const [fill,shape] of portraits[line.speaker]) {
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('fill',fill);
    path.setAttribute('d',shape);
    svg.append(path);
  }
  const copy=document.createElement('span');
  const name=document.createElement('b');
  name.textContent=speakerNames[line.speaker]+':';
  copy.append(name,' '+line.text);
  row.append(svg,copy);
  return row;
}

export function bindGnatDialogueView() {
  const panel=document.querySelector<HTMLElement>('#gnat-conversation')!;
  const recent=document.querySelector<HTMLOListElement>('#gnat-recent')!;
  const journal=document.querySelector<HTMLDialogElement>('#gnat-history')!;
  const entries=document.querySelector<HTMLOListElement>('#gnat-history-lines')!;
  const scroll=document.querySelector<HTMLElement>('#gnat-history-scroll')!;
  const empty=document.querySelector<HTMLElement>('#gnat-history-empty')!;
  let source:readonly DialogueLine[]|undefined;
  let displayed=0;

  function render(history:readonly DialogueLine[]|undefined,afterReading:number,enabled:boolean,reduced:boolean) {
    if (source!==history) {
      recent.replaceChildren();
      displayed=0;
      source=history;
    }
    const visible=enabled && afterReading<.45 && !!history?.length;
    const animate=visible && !reduced && !panel.hidden;
    panel.hidden=!visible;
    panel.dataset.fading=String(afterReading>=0);
    panel.dataset.reduced=String(reduced);
    if (!visible || !history || displayed===history.length) return;
    const previous=new Map([...recent.children].map(element=>[element,element.getBoundingClientRect().top]));
    const start=Math.max(displayed,history.length-3);
    for (const line of history.slice(start)) recent.append(dialogueRow(line));
    while (recent.childElementCount>3) recent.firstElementChild?.remove();
    displayed=history.length;
    if (animate) for (const element of recent.children) {
      const y=previous.get(element);
      const offset=y===undefined ? 12 : y===0 ? 0 : y-element.getBoundingClientRect().top;
      if (offset) element.animate([{transform:`translateY(${offset}px)`},{transform:'translateY(0)'}],
        {duration:215,easing:'ease-out'});
    }
  }

  function open(history:readonly DialogueLine[]) {
    entries.replaceChildren(...history.map(dialogueRow));
    empty.hidden=history.length>0;
    journal.showModal();
    scroll.focus();
    scroll.scrollTop=scroll.scrollHeight;
  }

  return {journal,render,open,scroll:(direction:number,reduced:boolean)=>scroll.scrollBy({
    top:direction*Math.max(45,scroll.clientHeight*.34),behavior:reduced ? 'auto' : 'smooth',
  })};
}
