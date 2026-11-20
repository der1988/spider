import type { Area } from './area';
import type { Point, Rect, Spider } from './spider';
import type {Web} from './threads';

interface View {
  camera: Point;
  time: number;
  aim: Point;
  aiming: boolean;
  stride: number;
  walkingInput: boolean;
  stepFace: number;
  taut: boolean;
  idlePose?: {kind:'groom'|'probe'|'freeze'; since:number; until:number};
  web: Web;
  catchLook?: {point:Point; until:number};
  hit?: Point;
  shot?: { from: Point; to: Point; hit: boolean; until: number };
  landedAt: number;
  discovered: boolean;
}

const color = {
  sky: '#b3bf85',
  glow: '#c0c994',
  far: '#a2af79',
  mist: '#949f70',
  middle: '#7e9163',
  moss: '#637849',
  leaf: '#516942',
  bark: '#405637',
  earth: '#334932',
  dark: '#203929',
  silk: '#dce3b1',
};

function block(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), width, height);
}

function line(ctx: CanvasRenderingContext2D, from: Point, to: Point, fill: string) {
  let x = Math.round(from.x);
  let y = Math.round(from.y);
  const tx = Math.round(to.x);
  const ty = Math.round(to.y);
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let error = dx + dy;

  ctx.fillStyle = fill;
  for (;;) {
    ctx.fillRect(x, y, 1, 1);
    if (x === tx && y === ty) break;
    const next = 2 * error;
    if (next >= dy) {
      error += dy;
      x += sx;
    }
    if (next <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function pixelSprite(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number) {
  const palette: Record<string, string> = { '#': color.dark, '+': color.bark, 'o': color.moss, '*': color.silk };
  rows.forEach((row, dy) => {
    Array.from(row).forEach((pixel, dx) => {
      const fill = palette[pixel];
      if (fill) block(ctx, x + dx, y + dy, 1, 1, fill);
    });
  });
}

const spiderBody = [
  '..######......',
  '.#oooooo#.....',
  '#oo+++oo+#....',
  '#o++o+o++####.',
  '#oo+++o#+oooo#',
  '#o+++++#o*o*o#',
  '.#+++++#oo#oo#',
  '..#####.#ooo#.',
  '.........###..',
];

const relic = [
  '......#......',
  '.....#*#.....',
  '...##***##...',
  '..#**ooo**#..',
  '.#**o***o**#.',
  '#**o**#**o**#',
  '.#**o***o**#.',
  '..#**ooo**#..',
  '...##***##...',
  '.....#*#.....',
  '......#......',
];

function background(ctx: CanvasRenderingContext2D, camera: Point, time: number) {
  const { width, height } = ctx.canvas;
  block(ctx, 0, 0, width, height, color.sky);
  const glowX = Math.round(width * 0.48 - camera.x * 0.055);
  for (let row = -18; row <= 18; row += 2) {
    const radius = Math.floor(Math.sqrt(19 * 19 - row * row));
    block(ctx, glowX - radius, 66 + row, radius * 2, 2, color.glow);
  }

  const scroll = camera.x * 0.22;
  for (let cell = Math.floor(scroll / 45) - 1; cell < (scroll + width) / 45 + 2; cell++) {
    const x = Math.round(cell * 45 - scroll);
    const variant = Math.abs(cell * 53 % 17);
    block(ctx, x, 30 - variant, 4 + variant % 5, height, color.far);
    block(ctx, x - 12, 26 - variant, 27, 11, color.far);
    block(ctx, x - 5, 19 - variant, 17, 7, color.far);
    block(ctx, x + 4, 49 + variant, 15, 3, color.far);
    block(ctx, x - 8, 62 + variant, 11, 2, color.far);
  }

  const nearScroll = camera.x * 0.48;
  for (let cell = Math.floor(nearScroll / 78) - 1; cell < (nearScroll + width) / 78 + 2; cell++) {
    const x = Math.round(cell * 78 - nearScroll);
    const variant = Math.abs(cell * 29 % 23);
    block(ctx, x, 0, 7 + variant % 7, height, color.mist);
    block(ctx, x - 13, 23 + variant, 23, 4, color.mist);
    block(ctx, x - 17, 21 + variant, 12, 2, color.mist);
    block(ctx, x + 7, 44 + variant, 17, 3, color.mist);
    block(ctx, x + 17, 39 + variant, 12, 5, color.mist);
    block(ctx, x + 4, 143 + variant, 12, 8, color.mist);
    block(ctx, x - 13, 155 + variant, 33, 9, color.mist);
    block(ctx, x - 24, 162 + variant, 55, 8, color.mist);
  }

  for (let speck = 0; speck < 18; speck++) {
    const x = ((37 * speck + Math.floor(time / (90 + speck * 11))) % width + width) % width;
    const y = 23 + (53 * speck) % 146;
    block(ctx, x, y, speck % 5 ? 1 : 2, 1, color.glow);
  }
}

type Surface = Rect & { kind: 'earth' | 'twig' | 'leaf' | 'root' };

function surface(ctx: CanvasRenderingContext2D, item: Surface, camera: Point) {
  const x = item.x - camera.x;
  const y = item.y - camera.y;
  const width = item.w;
  const height = item.h;
  if (x > ctx.canvas.width || x + width < 0 || y > ctx.canvas.height || y + height < 0) return;

  const fill = { earth: color.earth, twig: color.bark, leaf: color.leaf, root: color.dark }[item.kind];
  block(ctx, x, y, width, height, fill);
  block(ctx, x, y, width, 2, color.dark);
  block(ctx, x + 1, y + 2, Math.max(1, width - 2), 1, color.moss);

  if (item.grip) {
    const middle = x + Math.round(width / 2);
    block(ctx, middle - 4, y + 3, 9, 1, color.glow);
    block(ctx, middle - 2, y + 4, 5, 1, color.middle);
  }

  for (let n = 3; n < width - 2; n += 8) {
    const offset = Math.abs(Math.round(item.x + n * 13) % 9);
    block(ctx, x + n, y + 3, Math.min(width - n, 3 + offset % 3), 1, color.middle);
    if (height > 8) {
      block(ctx, x + n - 1, y + 6 + offset % Math.max(1, height - 7), 3, 1, color.moss);
    }
    if (item.kind === 'earth' && offset < 3) {
      block(ctx, x + n, y - 4, 1, 4, color.leaf);
      block(ctx, x + n - 2, y - 3, 2, 1, color.moss);
      block(ctx, x + n + 1, y - 5, 2, 1, color.moss);
    }
    if (item.kind === 'leaf' && offset < 3) {
      block(ctx, x + n, y + height, 1, 4, color.leaf);
      block(ctx, x + n + 1, y + height + 2, 2, 2, color.leaf);
    }
  }
}

function avatar(ctx: CanvasRenderingContext2D, spider: Spider, p: Point, view: View, area: Area) {
  const {time,landedAt} = view;
  const walking = spider.grounded && (view.walkingInput || Math.abs(spider.vx) > 2);
  const landingAge = time-landedAt;
  const land = spider.grounded && landingAge >= 0 && landingAge < 215;
  const launch = view.shot && view.shot.until > time ? (view.shot.until-time) / 160 : 0;
  const dangling = !!spider.rope && !spider.grounded;
  const bracing = !spider.grounded && spider.vy > 56;
  const idle = !view.aiming && !walking && !launch && !land ? view.idlePose : undefined;
  const idleTime = idle ? time-idle.since : 0;
  const focus = launch ? view.shot?.to
    : view.aiming ? view.aim
    : view.catchLook && view.catchLook.until > time ? view.catchLook.point : undefined;
  const angle = focus ? Math.round(Math.atan2(focus.y-spider.y,focus.x-spider.x) / (Math.PI/4)) * (Math.PI/4) : 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const facing = focus ? 1 : (walking ? view.stepFace : spider.facing);
  const leaf = walking ? area.surfaces.find(r => r.kind === 'leaf' &&
    Math.abs(spider.y+8-r.y) < 1 && spider.x >= r.x-5 && spider.x <= r.x+r.w+5) : undefined;
  const edge = leaf ? (facing > 0 ? leaf.x+leaf.w-spider.x : spider.x-leaf.x) : Infinity;
  const feeler = edge < 19 ? Math.round(Math.max(0,19-edge)/5) : 0;
  const bodyLag = walking ? Math.sin(view.stride-.78) * 1.25 - Number(feeler > 0) : 0;
  const compression = land ? (landingAge < 84 ? 2 : -Math.sin((landingAge-84)*Math.PI/131)) : 0;
  const crouch = view.aiming && spider.grounded ? 2 : idle?.kind === 'freeze' ? 1 : 0;
  const recoil = launch ? Math.round(2.2*Math.sin(launch*Math.PI/2)) : 0;
  const center = {x:p.x+facing*bodyLag,y:p.y+crouch+compression};
  const at = (x: number, y: number, foot = false) => {
    const origin = foot ? p : center;
    return {x:origin.x+x*facing*cos-y*sin,y:origin.y+x*facing*sin+y*cos};
  };

  for (let leg = 0; leg < 4; leg++) {
    const startX = -6+leg*3;
    for (const side of [-1,1]) {
      const phase = view.stride + ((leg + Number(side > 0)) % 2) * Math.PI;
      const stride = walking ? Math.sin(phase)*3 : 0;
      const lift = walking ? Math.max(0,Math.cos(phase))*2 : 0;
      const front = leg >= 2;
      const reach = front ? feeler + (view.aiming ? 3 : 0) + recoil : -recoil;
      const groom = idle?.kind === 'groom' && leg === 3 && side === 1
        ? 4 + Math.sin(idleTime/52)*2 : 0;
      const probe = idle?.kind === 'probe' && leg === 3 && side === 1
        ? Math.sin(Math.min(Math.PI,idleTime*Math.PI/610))*4 : 0;
      const tuck = dangling && view.taut && !bracing ? .72 : bracing ? 1.12 : 1;
      const knee = at(startX+stride*.4+Number(front && view.aiming),side*(land ? 2 : 4));
      const footY = side*(bracing ? 7 : dangling && view.taut ? 3 : 6) - (side > 0 ? lift+groom : 0);
      const foot = at((-9+leg*6)*tuck+stride+reach+probe,footY,true);
      if (bracing) {
        foot.x += Math.max(-2,Math.min(2,spider.vx / 65));
        foot.y += 2;
      }
      line(ctx,at(startX,side),knee,side < 0 ? color.bark : color.dark);
      line(ctx,knee,foot,side < 0 ? color.bark : color.dark);
    }
  }

  const palette: Record<string,string> = {'#':color.dark,'+':color.bark,o:color.moss,'*':color.silk};
  const extent = 10;
  for (let y = -extent; y <= extent; y++) for (let x = -extent; x <= extent; x++) {
    const longitudinal = (x*cos+y*sin)*facing;
    const sourceX = Math.round(longitudinal) + 7 + (longitudinal < -1 ? recoil : 0);
    const sourceY = Math.round(-x*sin+y*cos)+5;
    const ink = palette[spiderBody[sourceY]?.[sourceX]];
    if (ink) block(ctx,center.x+x,center.y+y,1,1,ink);
  }
}

function drawFly(ctx: CanvasRenderingContext2D, point: Point, time: number, caughtAt?: number) {
  const caught = caughtAt !== undefined;
  const age = caught ? time - caughtAt : 0;
  const wings = !caught || age < 1350;
  const flutter = Math.floor(time / (caught ? 42 : 55)) % 2;
  const x = point.x;
  const y = point.y;
  if (wings) {
    block(ctx,x-3,y-2-flutter,2,2,color.silk);
    block(ctx,x+2,y-2+flutter,2,2,color.silk);
  }
  block(ctx,x-1,y-1,3,3,color.dark);
  block(ctx,x,y-2,1,1,color.bark);
  if (caught) {
    block(ctx,x-2,y+2,5,1,color.silk);
    if (age < 440) {
      block(ctx,x-6,y-4,2,1,color.silk);
      block(ctx,x+4,y+3,2,1,color.silk);
    }
  }
}

function reticle(ctx: CanvasRenderingContext2D, p: Point, inRange: boolean) {
  const fill = inRange ? color.silk : color.bark;
  for (const offset of [-6, 4]) {
    block(ctx, p.x + offset, p.y, 3, 1, fill);
    block(ctx, p.x, p.y + offset, 1, 3, fill);
  }
  block(ctx, p.x, p.y, 1, 1, fill);
}

export function drawScene(ctx: CanvasRenderingContext2D, area: Area, spider: Spider, view: View) {
  const camera = { x: Math.round(view.camera.x), y: Math.round(view.camera.y) };
  const local = (p: Point): Point => ({ x: Math.round(p.x - camera.x), y: Math.round(p.y - camera.y) });
  ctx.imageSmoothingEnabled = false;
  background(ctx, camera, view.time);
  for (const item of area.surfaces) surface(ctx, item, camera);

  const find = local(area.discovery);
  if (!view.discovered) {
    const bob = Math.floor(view.time / 290) % 2;
    pixelSprite(ctx, relic, find.x - 6, find.y - 5 - bob);
    block(ctx, find.x - 11, find.y, 2, 1, color.silk);
    block(ctx, find.x + 10, find.y - 4, 1, 2, color.silk);
  }

  const p = local(spider);
  for (const thread of view.web.strands) {
    const from = local(thread.from);
    const to = local(thread.to);
    if ((from.x < 0 && to.x < 0) || (from.x > ctx.canvas.width && to.x > ctx.canvas.width)) continue;
    if (thread.shakeUntil > view.time) {
      const wobble = Math.sin(view.time / 18) * (thread.shakeUntil-view.time) / 115;
      const middle = {x:(from.x+to.x)/2,y:(from.y+to.y)/2+wobble};
      line(ctx,from,middle,color.leaf);
      line(ctx,middle,to,color.leaf);
    } else {
      line(ctx,from,to,color.moss);
    }
    for (const end of [from,to]) block(ctx,end.x-1,end.y-1,3,3,color.middle);
  }
  for (const end of view.web.loose) {
    const anchor = local(end.from);
    const middle = {x:(anchor.x+p.x)/2,y:(anchor.y+p.y)/2+7};
    line(ctx,anchor,middle,color.middle);
    line(ctx,middle,p,color.middle);
  }
  for (const fly of view.web.flies) drawFly(ctx,local(fly.position),view.time,fly.caughtAt);
  if (spider.rope) {
    const anchor = local(spider.rope);
    line(ctx, p, anchor, color.silk);
    block(ctx, anchor.x - 1, anchor.y - 1, 3, 3, color.dark);
    block(ctx, anchor.x, anchor.y, 1, 1, color.silk);
  }

  if (view.shot && view.shot.until >= view.time) {
    const tip = local(view.shot.to);
    line(ctx, local(view.shot.from), tip, view.shot.hit ? color.silk : color.moss);
    if (view.shot.hit) reticle(ctx, tip, true);
  }
  if (view.aiming) {
    reticle(ctx,local(view.hit ?? view.aim),Boolean(view.hit));
  } else {
    const aim = local(view.hit ?? view.aim);
    block(ctx,aim.x-1,aim.y,3,1,view.hit ? color.silk : color.bark);
    block(ctx,aim.x,aim.y-1,1,3,view.hit ? color.silk : color.bark);
  }
  avatar(ctx,spider,p,view,area);
}
