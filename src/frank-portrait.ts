// Cell order in public/frank-cast.png, left to right across six columns.
const cast=[
  'Frank Webbin',
  'The Stranger',
  'Benny Blabber',
  'Eddie Flapper',
  'Freddie Flapper',
  'Doris Doublecross',
  'Douglas Doublecross',
  'Bernard Bugshot',
  'Edgar Sixpence',
  'Martin Flymore',
  'Captain Buzzkill',
  'Officer Mothball',
  'Officer Drowsywing',
  'Rupert Buzzpress',
  'Harold Flyline',
  'Jimmy Flashwing',
  'Mayor Goldwing',
  'Arthur Flipwing',
  'Walter Honeytongue',
  'Gordon Flyright',
  'Harvey Blindfly',
  'Richard Falsewing',
  'Stanley Spybug',
  'Gordon Flycatch',
  'Don Buzzarella',
  'Carlo Stingano',
  'Sal Leafone',
  'Rocco Loopetti',
  'Vinnie Flyspeed',
  'Duke Wobbleknees',
];

export function frankPortraitPosition(name:string) {
  const index=cast.indexOf(name);
  if (index<0) return undefined;
  return `${index%6*20}% ${Math.floor(index/6)*25}%`;
}
