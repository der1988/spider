import {dialogueFade,speakerNames,type CastState,type DialogueLine,type Speaker} from './gnat-dialogue';

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

function portrait(speaker:Speaker) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 16 16');
  svg.setAttribute('shape-rendering','crispEdges');
  svg.setAttribute('aria-hidden','true');
  for (const [fill,shape] of portraits[speaker]) {
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('fill',fill);
    path.setAttribute('d',shape);
    svg.append(path);
  }
  return svg;
}

export function bindGnatDialogueView() {
  const panel=document.querySelector<HTMLElement>('#gnat-conversation')!;
  const castList=document.querySelector<HTMLUListElement>('#gnat-cast')!;
  const lines=document.querySelector<HTMLElement>('.gnat-lines')!;
  const left=document.querySelector<HTMLElement>('#gnat-dialogue-left')!;
  const right=document.querySelector<HTMLElement>('#gnat-dialogue-right')!;
  const speakers=['spider','midge','dart','pip','hunter'] as const;
  const tiles=speakers.map(speaker=>{
    const tile=document.createElement('li');
    tile.dataset.speaker=speaker;
    const icon=document.createElement('span');
    icon.className='gnat-cast-icon';
    icon.append(portrait(speaker));
    const name=document.createElement('span');
    name.textContent=speakerNames[speaker];
    tile.append(icon,name);
    castList.append(tile);
    return tile;
  });

  return function render(cast:Record<Speaker,CastState>|undefined,leftLine:DialogueLine|undefined,
    rightLine:DialogueLine|undefined,afterReading:number,enabled:boolean,reduced:boolean) {
    panel.hidden=!cast;
    if (!cast) return;
    const visible=enabled && afterReading<dialogueFade;
    const leftVisible=visible ? leftLine : undefined;
    const rightVisible=visible ? rightLine : undefined;
    const leftText=leftVisible?.text??'';
    const rightText=rightVisible?.text??'';
    if (left.textContent!==leftText) left.textContent=leftText;
    if (right.textContent!==rightText) {
      right.setAttribute('aria-label',rightVisible ? speakerNames[rightVisible.speaker] : 'Other character');
      right.textContent=rightText;
    }
    lines.dataset.fading=String(afterReading>=0);
    lines.dataset.reduced=String(reduced);
    speakers.forEach((speaker,i)=>{
      const tile=tiles[i];
      const state=cast[speaker];
      if (tile.dataset.state!==state) {
        tile.dataset.state=state;
        tile.setAttribute('aria-label',`${speakerNames[speaker]}, ${state}`);
      }
      const speaking=state==='active' && (leftVisible?.speaker===speaker || rightVisible?.speaker===speaker);
      if (tile.dataset.speaking!==String(speaking)) tile.dataset.speaking=String(speaking);
    });
  };
}
