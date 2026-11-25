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

type Face = 'round'|'narrow'|'moth'|'long'|'armored'|'leaf'|'broad'|'spider';
type Eyes = 'alert'|'squint'|'visor'|'glasses'|'sleepy'|'one-eye'|'spark';
type Design = {
  face:Face; eyes:Eyes; turn:1|-1; gaze:number; outfit?:'work'|'uniform'|'evening';
  colors:readonly [shell:string,lit:string,coat:string,accent:string];
  detail:(accent:string)=>string;
};
const shadow='#211a33',highlight='#fff3c5';
const heads:Record<Face,string>={
  round:'M11 12H16V9H29V11H35V16H39V27H35V33H29V36H17V34H11V28H8V19H11Z',
  narrow:'M13 14H19V9H28V11H34V16H37V26H34V32H31V36H19V32H14V27H10V20H13Z',
  moth:'M8 10H15V13H21V10H29V8H37V13H41V21H36V30H32V34H18V32H13V27H8V20H5V15H8Z',
  long:'M14 10H18V7H27V10H33V14H36V24H33V30H37V35H30V38H18V34H14V28H10V18H14Z',
  armored:'M9 14H14V9H32V11H38V17H42V29H37V33H33V37H17V34H10V29H6V19H9Z',
  leaf:'M9 13H15V9H22V7H34V11H39V16H37V23H34V29H28V36H20V33H14V28H9V22H6V17H9Z',
  broad:'M10 14H15V10H31V12H38V18H42V28H37V34H32V37H16V35H10V31H6V20H10Z',
  spider:'M8 15H15V11H33V13H39V17H43V27H38V33H32V37H17V34H10V30H5V20H8Z',
};
const contours:Record<Face,string>={
  round:'M10 14H13V11H18V8H28V10H33V11H24V14H17V19H13V24H10Z',
  narrow:'M13 14H19V9H29V11H32V13H23V16H20V23H15V28H13Z',
  moth:'M7 14H10V10H15V13H21V11H27V13H19V17H15V21H10V19H7Z',
  long:'M15 12H18V8H26V10H30V12H23V16H20V22H17V28H14V17H15Z',
  armored:'M9 15H15V10H31V12H36V14H21V17H16V23H11V27H9Z',
  leaf:'M9 16H14V12H19V9H24V8H33V10H30V12H24V15H19V19H15V25H10Z',
  broad:'M10 16H15V12H22V10H30V12H34V15H24V17H17V21H13V27H9V21H10Z',
  spider:'M8 16H15V12H24V11H34V14H25V17H17V19H13V24H9Z',
};
const eyeShapes:Record<Eyes,string>={
  alert:'M12 18H20V25H18V27H12V25H10V21H12ZM26 16H34V19H37V23H34V26H27V24H25V19H26Z',
  squint:'M12 20H21V24H12ZM26 18H35V22H26Z',
  visor:'M9 18H38V23H35V25H26V23H21V26H12V24H9Z',
  glasses:'M9 18H22V20H25V17H37V24H35V26H27V24H25V22H22V25H19V27H11V25H9Z',
  sleepy:'M11 21H21V25H19V26H13V25H11ZM26 19H36V23H34V24H28V23H26Z',
  'one-eye':'M13 19H21V25H13ZM26 16H36V18H38V23H36V26H28V24H26Z',
  spark:'M12 17H21V20H23V24H20V27H12V25H10V20H12ZM28 15H35V18H37V23H35V25H28V23H26V18H28Z',
};
const glints:Record<Eyes,string>={
  alert:'M17 20h2v4h-2zM31 18h2v4h-2z',
  squint:'M18 21h2v1h-2zM32 19h2v1h-2z',
  visor:'M10 19h9v1h-9zM28 18h8v1h-8zM14 21h3v1h-3z',
  glasses:'M11 20h6v2h-6zM16 23h3v1h-3zM27 19h6v2h-6z',
  sleepy:'M15 23h3v1h-3zM29 21h3v1h-3z',
  'one-eye':'M30 18h3v2h-3zM28 21h1v1h-1z',
  spark:'M14 19h4v3h-4zM31 17h3v3h-3zM13 23h1v1h-1z',
};

function illustratedPortrait({face,eyes,turn,gaze,colors,detail,outfit}:Design) {
  const [shell,lit,coat,accent]=colors;
  const antenna=face==='spider' ? 'M5 21h4v-8h4v3H10v11H5zM39 12h4v8h4v6h-5v-9h-3z' :
    face==='moth' || face==='leaf' ? 'M5 16H2V8H5V6H7V12H11V17ZM36 15V11H40V3H43V7H45V13H41V17Z' :
      'M16 13V7H14V4H17V7H20V13ZM27 12V6H30V2H33V6H31V12Z';
  const clothes=outfit==='work'
    ? path('M8 39h12v3h8v-3h11v9H8z',shell)+path('M13 40h5v8h-5zM30 40h5v8h-5z',coat)+path('M22 39h4v9h-4z',accent)
    : outfit==='uniform'
      ? path('M8 39h11v2h10v-2h11v6h-8v3H16v-3H8z',shell)+path('M13 42h3v3h-3zM34 42h5v3h-5z',accent)
      : outfit==='evening'
        ? path('M16 35h6v4h4v-4h6v7h-4v6h-8v-6h-4z',highlight)+path('M18 39h5v2h2v-2h5v5h-5v-2h-2v2h-5z',accent)
        : path('M7 43h6v-3h6v5h5v3h-7v-3H7zM36 41h6v3h-8v4h-7v-3h5v-8h4z',shell)+
          path('M20 36h8v4h-2v5h-3v-5h-3z',highlight)+path('M23 39h4v3h-1v6h-3v-6h-1v-3z',accent);
  return path('M0 29H48V48H0Z','#25362f')+
    path('M0 28H3V26H6V24H48V26H6V28H3V30H0Z','#2e413b')+
    `<g transform="${turn===1?'translate(0)':'translate(48) scale(-1 1)'}">`+
    path('M1 48V43H4V39H9V36H15V32H33V35H40V38H44V42H47V48Z',shadow)+
    path('M4 48V43H8V40H13V37H18V35H31V37H37V40H42V44H45V48Z',coat)+
    clothes+
    path(antenna,shadow)+path(heads[face],shell)+
    path(contours[face],lit)+
    path('M33 27h4v3h-3v3h-5v2H19v-2h8v-3h6z',shadow)+
    `<g transform="translate(${gaze} 0)">${path(eyeShapes[eyes],shadow)}${path(glints[eyes],eyes==='visor' ? accent : highlight)}</g>`+
    path('M22 24h3v2h3v3h-5v-2h-2v-2h1z',lit)+
    path('M17 30h5v1h8v-2h3v3h-4v2h-8v-1h-4z',shadow)+
    detail(accent)+'</g>';
}

const portraits:Record<string,Design>={
  'Benny Blabber':{
    face:'round',eyes:'alert',turn:1,gaze:0,colors:['#778d53','#c5cc82','#5b495d','#ed9280'],
    detail:a=>path('M10 29h6v5h-6zM8 30h2v1H8zM10 31h4v1h-4z','#ce8892')+
      path('M12 9V7h4V4h8v2h5v4H14v2H8V9z',shadow)+path('M15 8h11v2H15z',a)+
      path('M35 41h9v7H34v-5h1z','#dacc9e')+path('M37 43h4v1h-4zM37 45h3v1h-3z',shadow),
  },
  'Eddie Flapper':{
    outfit:'work',face:'narrow',eyes:'visor',turn:-1,gaze:1,colors:['#b07a59','#f6ca90','#367471','#70e2bf'],
    detail:a=>path('M9 16h4V8h5V5h13v3h5v7h3v4H9z',shadow)+path('M15 9h17v3H15zM22 13h13v2H22z',a)+
      path('M8 39h11v9H8z',shadow)+path('M11 40h6v5h-6z','#edb777')+path('M12 42h4v1h-4z',shadow),
  },
  'Freddie Flapper':{
    outfit:'work',face:'round',eyes:'sleepy',turn:1,gaze:-1,colors:['#7c9871','#c4dbb2','#666094','#ffd088'],
    detail:a=>path('M6 16V9h5V6h8v3H15v8zM33 9h5v3h4v13h-5V14h-4z','#3e3554')+
      path('M6 13h4v9H6zM37 16h5v9h-5z',a)+path('M9 39h10v9H9z','#cec48d')+
      path('M11 41h5v1h-5zM10 44h7v1h-7z',shadow),
  },
  'Doris Doublecross':{
    outfit:'evening',face:'moth',eyes:'squint',turn:-1,gaze:0,colors:['#9a627d','#f0aebe','#62558e','#f28296'],
    detail:a=>path('M24 10V7h3V3h5v2h5v2h3v5h-4v3h-4v-4h-3v2h-2v-3z',shadow)+path('M30 5h4v2h4v4h-5v2h-3z',a)+path('M32 8h2v2h-2z',highlight)+
      path('M33 26h3v3h-3z','#ffd6b6')+path('M19 30h11v2H19z','#d4537d')+
      path('M13 38h5v4h-5zM30 39h3v3h-3z',highlight),
  },
  'Douglas Doublecross':{
    outfit:'evening',face:'narrow',eyes:'glasses',turn:1,gaze:-1,colors:['#947988','#d6b4b2','#3d596b','#ffb880'],
    detail:a=>path('M15 11V7h5V5h8v2h6v4h3v4h-5v-3h-7v-2h-5v3h-5z',shadow)+path('M20 7h7v1h-7z',a)+
      path('M15 28h6v1h4v-2h8v3h-4v2H16v-2h-1z',shadow)+
      path('M35 41h4v2h2v3h-4v-2h-2z',a),
  },
  'Bernard Bugshot':{
    face:'long',eyes:'squint',turn:-1,gaze:1,colors:['#837767','#d2bf9c','#41465e','#ed7d7e'],
    detail:a=>path('M12 14h4V9h5V5h10v4h4v6H12z',shadow)+path('M18 11h13v2H18z','#576179')+
      path('M20 31h12v2H20z','#7f505f')+path('M35 39h8v9H30v-4h5z','#a47e61')+
      path('M37 41h4v2h-4z',a),
  },
  'Edgar Sixpence':{
    face:'moth',eyes:'one-eye',turn:1,gaze:-1,colors:['#738f91','#bbd5c7','#614a65','#ffd58c'],
    detail:a=>path('M10 16h12v2h2v9h-2v3H11v-2H8v-9h2z',a)+
      path('M11 19h9v2h1v5h-3v2h-7v-2H9v-5h2z',shadow)+
      path('M13 21h3v2h-3z','#f8efc8')+path('M9 28h1v9h-1zM10 36h4v1h-4z',a),
  },
  'Martin Flymore':{
    face:'round',eyes:'spark',turn:-1,gaze:0,colors:['#849650','#cddb87','#74505a','#f4a573'],
    detail:a=>path('M17 12V8h-2V5h4V2h5v3h4v2h4v3h-5v2z','#68405f')+path('M19 6h6v2h-6z',a)+
      path('M31 37h10v11H27v-5h4z','#e5d6a5')+path('M33 39h6v2h-6zM33 43h5v1h-5z',shadow)+
      path('M29 36h2v8h-2z',a)+path('M18 30h9v3h-9z',highlight),
  },
  'Captain Buzzkill':{
    outfit:'uniform',face:'armored',eyes:'squint',turn:1,gaze:1,colors:['#9e766b','#e6b496','#425271','#f9bd71'],
    detail:a=>path('M6 16h4V9h6V5h17v3h6v7h4v3H6z','#252a49')+
      path('M10 14h29v2H10zM22 8h6v4h-6z',a)+path('M14 28h9v-1h8v2h4v3H14z',shadow)+
      path('M7 40h12v2H7zM32 39h10v2H32z',a),
  },
  'Officer Mothball':{
    outfit:'uniform',face:'narrow',eyes:'visor',turn:-1,gaze:-1,colors:['#88705d','#c1a486','#4d5974','#8be4d4'],
    detail:a=>path('M8 16V9h5V6h18v3h5v8z','#26354e')+
      path('M13 11h20v2H13zM22 7h4v3h-4z',a)+path('M8 21h4v7H8zM10 28h8v2h-8z','#6b7491')+
      path('M34 40h6v5h-6z',a),
  },
  'Officer Drowsywing':{
    outfit:'uniform',face:'long',eyes:'sleepy',turn:1,gaze:-1,colors:['#83697c','#c2a9ac','#504c6d','#e6ab77'],
    detail:a=>path('M7 16h4V9h6V7h13v3h6v5h5v3H7z','#32304e')+
      path('M12 13h23v2H12z',a)+path('M16 25h4v2h-4zM28 24h4v2h-4z','#855462')+
      path('M33 37h10v8h-2v3h-7v-5h-3v-4h2z','#bf8f6e')+path('M35 37h6v2h-6z',highlight),
  },
  'Rupert Buzzpress':{
    outfit:'work',face:'leaf',eyes:'glasses',turn:-1,gaze:0,colors:['#6c9276','#b6d5a3','#8a5155','#f0b880'],
    detail:a=>path('M10 14h5V8h4V5h14v3h5v4H21v4H10z',shadow)+path('M15 11h17v2H15z',a)+
      path('M31 37h12v11H30v-8h1z','#ead5a2')+path('M33 39h8v2h-8zM34 43h5v1h-5zM34 45h7v1h-7z',shadow),
  },
  'Harold Flyline':{
    face:'moth',eyes:'sleepy',turn:1,gaze:-1,colors:['#546d86','#9fb4cc','#66587b','#ef9da8'],
    detail:a=>path('M7 11h5V7h5V5h8v3h8v3H19v4H7z','#24213b')+
      path('M14 9h10v2H14z',a)+path('M11 27h6v2h-6zM28 26h8v2h-8z','#60627d')+
      path('M32 30h11v2H32z','#e1c7a6')+path('M42 29h3v3h-3z',a),
  },
  'Jimmy Flashwing':{
    outfit:'work',face:'narrow',eyes:'spark',turn:-1,gaze:1,colors:['#9e795b','#efc198','#497b78','#8ef1c5'],
    detail:a=>path('M11 14H8V9h5V5h7V3h8v3h5v2h4v4h-9V9H17v5z',shadow)+
      path('M17 7h11v2H17z',a)+path('M26 39h17v9H25v-7h1z',shadow)+
      path('M33 41h6v5h-6z',a)+path('M26 39h5v2h-5z',highlight),
  },
  'Mayor Goldwing':{
    outfit:'evening',face:'broad',eyes:'squint',turn:1,gaze:0,colors:['#ad7653','#f0c477','#784e70','#ffd52f'],
    detail:a=>path('M9 16h4v-4h5V8h6V6h11v3h3v4H24v4H9z','#874e54')+
      path('M16 13h10v2H16zM31 9h5v2h-5z',a)+path('M16 29h16v4h-3v2H18v-3h-2z',shadow)+
      path('M18 29h12v2H18z',highlight)+path('M34 40h7v4h-7z',a),
  },
  'Arthur Flipwing':{
    face:'armored',eyes:'one-eye',turn:-1,gaze:0,colors:['#7c818c','#bec2c8','#4e5275','#e8b475'],
    detail:a=>path('M8 16V9h6V7h8v4h-4v4h-6zM29 8h6v3h4v7h-5v-5h-5z','#e0c497')+
      path('M23 19h5v7h-5zM18 22h15v2H18z',shadow)+
      path('M36 38h5v3h2v3h-5v-2h-2z',a),
  },
  'Walter Honeytongue':{
    outfit:'evening',face:'long',eyes:'alert',turn:1,gaze:0,colors:['#9a8263','#e9cb87','#5f867c','#ef9477'],
    detail:a=>path('M15 16h7v1h-7zM29 15h7v1h-7z',shadow)+
      path('M21 30h11v5h-4v3h-7v-3h-4v-4h4z',shadow)+path('M22 33h7v3h-7z',a)+
      path('M34 39h3v3h3v-3h3v7h-9z',highlight),
  },
  'Gordon Flyright':{
    face:'leaf',eyes:'visor',turn:-1,gaze:0,colors:['#6e9c6f','#c6e6a0','#4c596d','#ffad9a'],
    detail:a=>path('M6 13h6V8h4V4h14v3h7v4h5v6H6z','#425044')+
      path('M13 11h23v2H13z',a)+path('M24 27h11v3H24z','#accb8e')+
      path('M8 40h13v3H8zM32 44h11v2H32z',a),
  },
  'Harvey Blindfly':{
    outfit:'work',face:'broad',eyes:'visor',turn:1,gaze:-1,colors:['#696c68','#b7b39e','#65516b','#ff988d'],
    detail:a=>path('M7 13h4V9h5V5h16v2h5v5h5v4H7z','#282338')+
      path('M13 10h23v2H13z',a)+path('M9 18h28v8H9z','#302534')+
      path('M13 20h10v1H13zM26 19h8v1h-8z','#c38a88')+
      path('M11 40h3v8h-3zM11 38h8v3h-8z','#b59373'),
  },
  'Richard Falsewing':{
    face:'round',eyes:'one-eye',turn:-1,gaze:1,colors:['#9b6483','#dbb7ca','#435a61','#e6c48c'],
    detail:a=>path('M10 15v-5h4V7h7v4h-3v7h-4v-3zM27 9h6v3h5v6h-4v-3h-4v-3h-3z','#41304e')+path('M22 12h2v4h-2zM24 11h2v3h-2z','#eca3a3')+
      path('M10 20h13v7H10z',shadow)+path('M12 22h8v3h-8z',a)+
      path('M20 23h8v1h-8z',shadow)+path('M35 42h6v4h-6z',a),
  },
  'Stanley Spybug':{
    outfit:'work',face:'long',eyes:'glasses',turn:1,gaze:-1,colors:['#97718b','#e2b9ba','#526658','#87e0ae'],
    detail:a=>path('M9 14h4V9h4V6h17v3h4v5H9z','#2e3439')+
      path('M8 18h23v2h-8v6H11v-2H8z',shadow)+path('M11 19h7v2h-7zM16 23h3v1h-3z',a)+
      path('M31 19h8v2h2v6h-5v-2h-5z','#485659')+path('M35 22h4v2h-4z',a)+
      path('M9 44h10v4H9z',a),
  },
  'Gordon Flycatch':{
    face:'armored',eyes:'squint',turn:-1,gaze:0,colors:['#ac805d','#f4c093','#54475f','#f79364'],
    detail:a=>path('M11 12V8h5V5h16v3h5v5H23v2H11z',shadow)+path('M15 10h17v2H15z',a)+
      path('M29 14h3v4h-2v4h-2v-6h1z','#efd1a1')+
      path('M30 28h6v1h6v2H30z','#ce9671')+path('M41 28h3v3h-3z',a),
  },
  'Don Buzzarella':{
    outfit:'evening',face:'broad',eyes:'sleepy',turn:1,gaze:1,colors:['#aa9357','#f3d891','#673d56','#ffe082'],
    detail:a=>path('M5 16h6V9h5V5h16v3h6v7h5v3H5z',shadow)+path('M13 12h22v3H13z','#a2546a')+
      path('M15 29h19v3H15zM18 33h9v2h-9z','#6d4e5a')+
      path('M31 38h2v3h5v-2h2v5h-9zM35 46h6v2h-6z',a),
  },
  'Carlo Stingano':{
    face:'narrow',eyes:'one-eye',turn:1,gaze:1,colors:['#b07770','#edb79a','#4a4967','#f3ac59'],
    detail:a=>path('M16 14V9h4V6h12v3h4v4h-3v-3h-6v4h-3v-2h-4v2z','#803f4e')+
      path('M10 20h13v6H10z',shadow)+path('M8 19h16v1H8zM10 26h13v1H10z',a)+
      path('M16 32h5v2h-5z',highlight)+path('M34 36h4v7h-4zM33 42h7v2h-7z',a),
  },
  'Sal Leafone':{
    face:'leaf',eyes:'squint',turn:-1,gaze:0,colors:['#679272','#b7d5a5','#5d4569','#fabd76'],
    detail:a=>path('M0 16h4v-5h4V7h5v3h3v6H9v5H4v-5zM34 13V7h4V3h5v6h4v7h-7v3h-6z','#4d7965')+
      path('M4 14h4v-3h4v2H9v5H7v-4zM39 8h3v4h3v2h-6z',a)+path('M18 29h9v1h6v3H18z',shadow)+
      path('M5 40h7v-2h6v4h-5v2H5z',a)+path('M35 45h6v2h-6z',highlight),
  },
  'Rocco Loopetti':{
    face:'round',eyes:'spark',turn:1,gaze:-1,colors:['#8d6191','#d6acd6','#744e61','#ffb990'],
    detail:a=>path('M8 15v-4h4V7h3V4h6v3h4V4h7v3h5v4h3v6h-5v-3h-4v-3h-5v2h-5v-3h-4v3h-4v2z','#603b70')+
      path('M15 8h5v2h-5zM29 7h5v2h-5z',a)+path('M31 23h5v5h-2v2h-4v-2h3v-3h-2z',a)+
      path('M15 31h6v1h10v-3h3v5H16z',highlight),
  },
  'Vinnie Flyspeed':{
    outfit:'work',face:'armored',eyes:'visor',turn:-1,gaze:1,colors:['#a87964','#f0bb98','#387278','#ff996f'],
    detail:a=>path('M6 17V9h5V6h6V4h14v2h6v3h5v9h-7v-4H13v3z','#354354')+
      path('M13 9h22v3H13zM8 14h5v2H8zM35 13h6v2h-6z',a)+
      path('M7 39h9v3H7zM33 39h9v3h-9z',a)+path('M9 45h9v3H9zM32 45h7v3h-7z',highlight),
  },
  'Duke Wobbleknees':{
    outfit:'evening',face:'spider',eyes:'squint',turn:-1,gaze:1,colors:['#ba7c82','#efbb9f','#5b3f6d','#f8d57c'],
    detail:a=>path('M5 14h6V5h4v4h5V3h5v5h5V5h5v9H5z','#50344d')+
      path('M12 6h2v4h7V4h3v5h6V6h4v6H12z',a)+path('M22 10h3v2h-3z','#b65270')+
      path('M11 24h3v1h-3zM15 25h2v1h-2zM32 22h4v1h-4zM36 23h3v1h-3z',highlight)+
      path('M36 37h6v4h-6zM36 44h6v4h-6z',a),
  },
};

export function frankPortrait(speaker:string,species:string|undefined,identity:string) {
  const design=species || speaker==='DUKE' ? portraits[identity] : undefined;
  if (design) return `<svg viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">${illustratedPortrait(design)}</svg>`;
  return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">${spiderPortrait(speaker)}</svg>`;
}
