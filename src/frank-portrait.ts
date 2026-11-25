const outline='#111d1c',paper='#ead9aa';

function path(d:string,fill:string) {
  return `<path d="${d}" fill="${fill}"/>`;
}

function spiderPortrait(speaker:string) {
  const frank=speaker==='FRANK',duke=speaker==='DUKE';
  const coat=frank ? '#586b53' : duke ? '#765264' : '#3d414a';
  const lapel=frank ? '#89916a' : duke ? '#a86b75' : '#666375';
  const face=frank ? '#98bb7b' : duke ? '#cc9b78' : '#666c63';
  return path('M3 32v-6h3v-3h5v-3h10v3h5v3h3v6z',outline)+
    path('M5 32v-6h3v-2h6v-3h4v3h6v2h3v6z',coat)+
    path('M8 24h5v3h3v5h-4v-3H9zM24 24h-5v3h-3v5h4v-3h3z',lapel)+
    path('M13 23h6v3h-6z',paper)+path('M15 25h2v7h-2z',frank ? '#b86659' : '#844756')+
    path('M8 10h16v4h2v4h-3v3H9v-3H6v-4h2z',outline)+
    path('M9 11h14v7h-2v2H11v-2H9zM7 15h3v3H7zM22 15h3v3h-3z',face)+
    path('M10 14h5v2h-5zM18 14h4v2h-4zM13 18h7v1h-7z',outline)+
    path('M13 14h1v1h-1zM20 14h1v1h-1z',duke ? '#ffb76f' : frank ? paper : '#9f9c84')+
    (duke ? path('M8 5h3v2h3V3h4v4h3V5h3v7H8z','#d7aa66')+path('M15 8h2v2h-2z','#a24c51') :
      path('M5 11h3V8h3V4h5v1h6v2h2v4h3v2H5z',outline)+path('M9 9h14v2H9z',frank ? '#bb8960' : '#817384'));
}

const wings:Record<string,string>={
  Gnat:'M2 9h7v2h4v8H8v-2H4v-3H2z',
  Dart:'M2 13h3v-3h4V7h5v10h-4v3H3z',
  Veil:'M2 8h7v2h3v4h2v9H8v-3H5v-4H2z',
  Skipper:'M5 5h7v4h3v12h-4v-4H8v-5H5z',
  Comet:'M1 12h5V8h7v9H9v3H1z',
  Leafwing:'M2 8h6v2h4v2h3v9H8v-3H5v-3H2z',
  Looper:'M3 8h8v2h3v10h-3v3H5v-3H2v-8h1z',
  Drifter:'M2 9h9v4h3v10H6v-3H3v-3H2z',
  Needle:'M4 6h5v3h3v4h2v5h-4v-2H7v-4H4z',
  Lantern:'M1 10h3V7h7v3h3v10h-4v3H4v-3H1z',
};
const palettes:Record<string,readonly [string,string,string]>={
  Gnat:['#b7c981','#76945a','#d1b27e'],Dart:['#e0b276','#9b734c','#eb9264'],
  Veil:['#a3bacb','#6b828f','#b99cc0'],Skipper:['#d8a9b8','#9f6e81','#df9d91'],
  Comet:['#dfc194','#ab8861','#f1ae76'],Leafwing:['#b7d49a','#709666','#9fd097'],
  Looper:['#bcadcf','#79698c','#e4abcc'],Drifter:['#c6c8ae','#7c8475','#c69c8b'],
  Needle:['#e3aa90','#a97662','#e4ad74'],Lantern:['#f1df92','#c2a256','#f6c45f'],
};

function insectPortrait(kind:string,identity:string) {
  const [wing,shell,eye]=palettes[kind]??palettes.Gnat;
  const shape=wings[kind]??wings.Gnat;
  const stripe=[...identity].reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%3;
  return path(shape,wing)+`<g transform="translate(32) scale(-1 1)">${path(shape,wing)}</g>`+
    path('M12 11V8h2V5h2v6h1V8h3v3h4v4h2v8h-3v3h-3v6h-8v-6H9v-3H6v-8h3v-4z',outline)+
    path('M12 12h8v2h3v7h-3v4h-3v4h-2v-4h-3v-4H9v-7h3z',shell)+
    path('M9 15h6v6h-6zM17 15h6v6h-6z',eye)+
    path('M10 16h2v2h-2zM18 16h2v2h-2z',paper)+
    path('M13 22h6v2h-6zM14 26h4v1h-4z',outline)+
    path(stripe===0 ? 'M13 12h6v1h-6z' : stripe===1 ? 'M11 14h2v1h-2zM19 14h2v1h-2z' : 'M15 12h2v2h-2z',paper);
}

export function frankPortrait(speaker:string,species:string|undefined,identity:string) {
  const figure=species ? insectPortrait(species,identity) : spiderPortrait(speaker);
  return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${figure}</svg>`;
}
