import { zoneAt, zoneIndex, ZONE_WIDTH } from "./world"

interface PetScene {
  stage: 'egg' | 'baby' | 'teen' | 'adult'
  form?: 'bloom' | 'stone'
  mood?: 'happy' | 'sad' | 'sick'
  reaction?: 'feed' | 'play' | 'clean' | 'heal'
}

const ink = '#243523'
const light = '#b8ca8a'

const egg = [
  '.....####.....',
  '....#oooo#....',
  '...#oooooo#...',
  '..#oo##oooo#..',
  '..#o#oo#ooo#..',
  '.#ooo##ooooo#.',
  '.#oooooo##oo#.',
  '.#ooooo#oo#o#.',
  '.#oooooo##oo#.',
  '..#oooooooo#..',
  '...########...',
]

const body = [
  '................',
  '....#......#....',
  '...#o#....#o#...',
  '...#o######o#...',
  '..#oooooooooo#..',
  '.#oooooooooooo#.',
  '.#oooooooooooo#.',
  '.#oooooooooooo#.',
  '##oooooooooooo##',
  '#o#oooooooooo#o#',
  '.##oooooooooo##.',
  '..#oooooooooo#..',
  '...##########...',
  '...###....###...',
]

const stone = [
  '....##....##....',
  '...#oo#..#oo#...',
  '..#oooo##oooo#..',
  '.#oooooooooooo#.',
  '.#oooooooooooo#.',
]

const bloom = [
  '......#..#......',
  '.....#o##o#.....',
  '...##oooooo##...',
  '..#oooo##oooo#..',
  '...###....###...',
]

const heart = ['.##.##.', '#######', '.#####.', '..###..', '...#...']
const spark = ['..#..', '..#..', '#####', '..#..', '..#..']
const finds = {
  forest: ['..##...', '.#..#..', '..###..', '.#o#o#.', '#o###o#', '.##.##.'],
  beach: ['..###..', '.#o#o#.', '#o#o#o#', '#ooooo#', '.#####.'],
  cave: ['...#...', '..#o#..', '.#ooo#.', '#oo#oo#', '.#ooo#.', '..###..'],
  meadow: ['...#...', '..#o#..', '.#ooo#.', '.#ooo#.', '..###..', '#..#..#'],
}

function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, scale = 1) {
  rows.forEach((row, dy) => {
    Array.from(row).forEach((pixel, dx) => {
      if (pixel === '.') return
      ctx.fillStyle = pixel === '#' ? ink : light
      ctx.fillRect(x + dx * scale, y + dy * scale, scale, scale)
    })
  })
}

export interface WorldView {
  position: number
  ground: number
  seed: number
  stage: PetScene['stage']
  form?: PetScene['form']
  mood?: PetScene['mood']
  facing: 1 | -1
  walking: boolean
  reaction?: PetScene['reaction'] | 'discover'
  ready: (index: number) => boolean
}

const terrain = {
  clearing: ['#c9d39d', '#aebc80', '#81945f'],
  forest: ['#b2c390', '#8fa574', '#607f57'],
  meadow: ['#d0d9a5', '#afbf79', '#849b60'],
  beach: ['#d9dbab', '#b6c5a1', '#a3a572'],
  cave: ['#a9b396', '#84997d', '#667b63'],
} as const

function tree(ctx: CanvasRenderingContext2D, x: number, height: number, ground: number) {
  ctx.fillRect(x - 2, ground - height + 10, 4, height - 10)
  for (let tier = 0; tier < 4; tier++) {
    ctx.fillRect(x - 3 - tier * 2, ground - height + tier * 5, 6 + tier * 4, 5)
  }
}

function landscape(
  ctx: CanvasRenderingContext2D,
  zone: ReturnType<typeof zoneAt>,
  left: number,
  time: number,
  ground: number,
) {
  const [sky, distant, soil] = terrain[zone.kind]
  ctx.fillStyle = sky
  ctx.fillRect(left, 0, ZONE_WIDTH, ground)
  ctx.fillStyle = distant
  for (let x = 0; x < ZONE_WIDTH; x += 4) {
    const hill = Math.ceil(8 * Math.sin((x + zone.variant * 19) / 27))
    const width = Math.min(4, ZONE_WIDTH - x)
    ctx.fillRect(left + x, ground - 33 + hill, width, 33 - hill)
  }

  ctx.fillStyle = soil
  ctx.fillRect(left, ground, ZONE_WIDTH, ctx.canvas.height - ground)
  ctx.fillStyle = ink
  ctx.fillRect(left, ground, ZONE_WIDTH, 1)

  const start = Math.max(0, Math.floor(-left / 23) * 23)
  const end = Math.min(ZONE_WIDTH, ctx.canvas.width - left + 23)
  for (let cell = start; cell < end; cell += 23) {
    const noise = ((cell * 17 + zone.variant * 13) % 31 + 31) % 31
    const x = left + cell + 5 + noise % 8
    ctx.fillStyle = distant
    ctx.fillRect(x + 3, ground + 8 + noise % 12, 2 + noise % 4, 1)

    ctx.fillStyle = soil
    if (zone.kind === 'forest' || (zone.kind === 'clearing' && noise < 9)) {
      tree(ctx, x, 28 + noise, ground)
    } else if (zone.kind === 'cave') {
      const stalactite = 10 + noise
      ctx.fillRect(x - 6, 0, 12, stalactite / 2 | 0)
      ctx.fillRect(x - 3, 0, 6, stalactite)
      ctx.fillRect(x - 1, 0, 2, stalactite + 4)
      ctx.fillRect(x - 4, ground - 6, 8, 6)
      ctx.fillRect(x - 2, ground - 9, 4, 3)
    } else if (zone.kind === 'beach') {
      const ripple = Math.floor(time / 320) % 3
      ctx.fillRect(x - 3 + ripple, ground - 22 + noise % 12, 8, 1)
      ctx.fillRect(x + 2 - ripple, ground - 31 + noise % 9, 5, 1)
    } else {
      ctx.fillRect(x, ground - 4, 1, 4)
      ctx.fillRect(x - 2, ground - 3, 2, 1)
      ctx.fillRect(x + 1, ground - 6, 2, 1)
      if (zone.kind === 'meadow') {
        ctx.fillRect(x + 1, ground - 8, 2, 1)
        ctx.fillRect(x, ground - 7, 4, 1)
      }
    }
  }
}

export function drawWorld(ctx: CanvasRenderingContext2D, view: WorldView, elapsedMs: number) {
  ctx.imageSmoothingEnabled = false
  const {ground} = view
  const camera = Math.round(view.position - ctx.canvas.width / 2)
  const first = zoneIndex(camera)
  const last = zoneIndex(camera + ctx.canvas.width - 1)

  for (let index = first; index <= last; index++) {
    const zone = zoneAt(view.seed, index)
    landscape(ctx, zone, (index - .5) * ZONE_WIDTH - camera, elapsedMs, ground)
  }
  for (let index = first; index <= last; index++) {
    if (index === 0 || !view.ready(index)) continue
    const zone = zoneAt(view.seed, index)
    if (zone.kind === 'clearing') continue
    const x = Math.round(zone.findAt - camera)
    const pulse = Math.floor(elapsedMs / 250) % 2
    sprite(ctx, spark, x - 2, ground - 13 - pulse)
    const item = finds[zone.kind]
    sprite(ctx, item, x - 3, ground - item.length)
  }

  const x = Math.round(view.position - camera)
  const step = Math.floor(elapsedMs / (view.walking ? 145 : 480))
  if (view.stage === 'egg') {
    sprite(ctx, egg, x - 7 + [0, 1, 0, -1][step % 4], ground - 11 - step % 2)
    return
  }

  const bob = view.walking ? [0, 2, 1, 0][step % 4] : step % 2
  const y = ground - 14 - bob
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(view.facing, 1)
  if (view.stage === 'adult') {
    sprite(ctx, view.form === 'stone' ? stone : bloom, -8, -4)
  } else if (view.stage === 'teen') {
    ctx.fillStyle = ink
    ctx.fillRect(-1, 1, 2, 3)
  }
  sprite(ctx, body, -8, 0)
  ctx.fillStyle = ink
  const eyeHeight = step % 9 === 8 ? 1 : 2
  ctx.fillRect(-2, 6, 1, eyeHeight)
  ctx.fillRect(3, 6, 1, eyeHeight)
  const unhappy = view.mood === 'sad' || view.mood === 'sick'
  ctx.fillRect(0, unhappy ? 9 : 10, 2, 1)
  ctx.fillRect(-1, unhappy ? 10 : 9, 1, 1)
  ctx.fillRect(2, unhappy ? 10 : 9, 1, 1)
  ctx.restore()

  if (view.reaction) {
    sprite(ctx, view.reaction === 'feed' ? heart : spark, x + 10, y - 8 - step % 3)
  }
}
