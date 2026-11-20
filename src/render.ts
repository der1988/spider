export interface PetScene {
  stage: 'egg' | 'baby' | 'teen' | 'adult'
  form?: 'bloom' | 'stone'
  mood?: 'happy' | 'sad' | 'sick'
  asleep?: boolean
  lightsOff?: boolean
  reaction?: 'feed' | 'play' | 'clean' | 'heal'
}

const ink = '#243523'
const shade = '#657952'
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
const moon = ['..###..', '.###...', '###....', '###...#', '.#####.', '..###..']

function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, scale = 1) {
  rows.forEach((row, dy) => {
    Array.from(row).forEach((pixel, dx) => {
      if (pixel === '.') return
      ctx.fillStyle = pixel === '#' ? ink : light
      ctx.fillRect(x + dx * scale, y + dy * scale, scale, scale)
    })
  })
}

export function drawPet(ctx: CanvasRenderingContext2D, scene: PetScene, elapsedMs: number) {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = scene.lightsOff ? '#8c9b71' : '#b7c78e'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = '#a7b882'
  for (let y = 2; y < ctx.canvas.height; y += 3) {
    for (let x = 2; x < ctx.canvas.width; x += 3) ctx.fillRect(x, y, 1, 1)
  }

  ctx.fillStyle = shade
  ctx.fillRect(16, 69, 128, 1)
  for (let index = 0; index < 5; index++) {
    const x = 22 + index * 29
    ctx.fillRect(x, 67, 3, 1)
    ctx.fillRect(x + 1, 66, 1, 1)
  }
  sprite(ctx, moon, 132, 12)

  const step = Math.floor(elapsedMs / 480)
  if (scene.stage === 'egg') {
    sprite(ctx, egg, 66 + [0, 1, 0, -1][step % 4], 46 - (step % 2), 2)
    sprite(ctx, spark, 105, 39 + (step % 2))
    return
  }

  const scale = scene.stage === 'baby' ? 2 : 3
  const path = [0, 2, 4, 2, 0, -2, -4, -2]
  const x = 80 - 8 * scale + (scene.asleep ? 0 : path[step % path.length])
  const y = 69 - 14 * scale - (scene.asleep ? 0 : step % 2)
  if (scene.stage === 'adult') {
    sprite(ctx, scene.form === 'stone' ? stone : bloom, x, y - 4 * scale, scale)
  }
  sprite(ctx, body, x, y, scale)
  ctx.fillStyle = ink
  const eyesY = y + 6 * scale
  const blink = scene.asleep || step % 9 === 8
  for (const eye of [5, 10]) {
    ctx.fillRect(x + eye * scale, eyesY, scale, blink ? 1 : 2 * scale)
  }
  if (scene.mood === 'sick' || scene.mood === 'sad') {
    ctx.fillRect(x + 7 * scale, y + 9 * scale, 2 * scale, 1)
    ctx.fillRect(x + 6 * scale, y + 9 * scale + 1, scale, 1)
    ctx.fillRect(x + 9 * scale, y + 9 * scale + 1, scale, 1)
  } else {
    ctx.fillRect(x + 7 * scale, y + 9 * scale + 1, 2 * scale, 1)
    ctx.fillRect(x + 6 * scale, y + 9 * scale, scale, 1)
    ctx.fillRect(x + 9 * scale, y + 9 * scale, scale, 1)
  }

  if (scene.asleep) {
    ctx.fillRect(109, 31, 5, 1)
    ctx.fillRect(109, 35, 5, 1)
    for (let pixel = 1; pixel < 4; pixel++) ctx.fillRect(113 - pixel, 31 + pixel, 1, 1)
  } else if (scene.reaction) {
    sprite(ctx, scene.reaction === 'feed' ? heart : spark, 114, 29 - (step % 4))
  }
}
