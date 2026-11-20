import type { Area } from './area';
import type { Point, Rect, Spider } from './spider';

interface View {
  camera: Point;
  time: number;
  aim?: Point;
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

function avatar(ctx: CanvasRenderingContext2D, spider: Spider, p: Point, time: number, landedAt: number) {
  const walking = spider.grounded && Math.abs(spider.vx) > 2;
  const gait = walking ? [0, 1, 0, -1][Math.floor(time / 92) % 4] : 0;
  const landing = spider.grounded && time >= landedAt && time - landedAt < 130;
  const stretch = spider.grounded && !landing ? 0 : -2;
  const at = (x: number, y: number) => ({ x: p.x + x * spider.facing, y: p.y + y });

  for (let leg = 0; leg < 4; leg++) {
    const startX = -6 + leg * 3;
    const shift = (leg % 2 ? -gait : gait) * 2;
    const footX = -10 + leg * 6;
    line(ctx, at(startX, 1), at(startX - 2, -4 + stretch), color.bark);
    line(ctx, at(startX - 2, -4 + stretch), at(footX - 1, stretch), color.bark);
    line(ctx, at(startX, 2), at(startX + shift, 4 + stretch), color.dark);
    line(ctx, at(startX + shift, 4 + stretch), at(footX + shift, 6 + stretch), color.dark);
  }

  ctx.save();
  ctx.translate(p.x, p.y + (landing ? 1 : 0));
  ctx.scale(spider.facing, 1);
  pixelSprite(ctx, spiderBody, -7, -5);
  ctx.restore();
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
  if (view.aim) {
    const aim = local(view.hit ?? view.aim);
    reticle(ctx, aim, Boolean(view.hit));
  }
  avatar(ctx, spider, p, view.time, view.landedAt);
}
