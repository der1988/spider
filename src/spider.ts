export interface Point {
  x: number
  y: number
}

export interface Rect extends Point {
  w: number
  h: number
  grip?: boolean
}

interface Rope extends Point {
  length: number
}

export interface Spider extends Point {
  vx: number
  vy: number
  grounded: boolean
  facing: -1 | 1
  rope?: Rope
}

interface Input {
  move: number
  reel: boolean
}

export interface Tuning {
  range: number
  acceleration: number
  reelSpeed: number
  gravity: number
  walkSpeed: number
  airAcceleration: number
  minLength: number
}

export const DEFAULT_TUNING: Readonly<Tuning> = {
  range: 155,
  acceleration: 360,
  reelSpeed: 66,
  gravity: 300,
  walkSpeed: 54,
  airAcceleration: 120,
  minLength: 15,
}

export const SPIDER_HALF_WIDTH = 7
export const SPIDER_HALF_HEIGHT = 8

const STEP = 1 / 120
const EPSILON = 1e-7
const MAX_SWING_SPEED = 210

export function createSpider(point: Point): Spider {
  return {...point, vx: 0, vy: 0, grounded: false, facing: 1}
}

export function detach(spider: Spider) {
  delete spider.rope
}

/** First entry into a solid along a normalized ray, measured in world pixels. */
function rayDistance(origin: Point, direction: Point, surface: Rect): number {
  let near = 0
  let far = Infinity
  for (const axis of ['x', 'y'] as const) {
    const edge = surface[axis]
    const end = edge + (axis === 'x' ? surface.w : surface.h)
    const start = origin[axis]
    const speed = direction[axis]
    if (Math.abs(speed) < EPSILON) {
      if (start < edge || start > end) return Infinity
      continue
    }
    const a = (edge - start) / speed
    const b = (end - start) / speed
    near = Math.max(near, Math.min(a, b))
    far = Math.min(far, Math.max(a, b))
    if (far < near) return Infinity
  }
  return near
}

export function aimHit(spider: Spider, surfaces: readonly Rect[], target: Point, tuning?: Partial<Tuning>): Point | undefined {
  const dx = target.x - spider.x
  const dy = target.y - spider.y
  const magnitude = Math.hypot(dx, dy)
  if (!Number.isFinite(magnitude) || magnitude < EPSILON) return
  const direction = {x: dx / magnitude, y: dy / magnitude}
  const range = tuning?.range ?? DEFAULT_TUNING.range
  let nearest = Infinity
  let grip = false
  for (const surface of surfaces) {
    const distance = rayDistance(spider, direction, surface)
    if (distance < nearest - EPSILON) {
      nearest = distance
      grip = surface.grip === true
    } else if (Math.abs(distance - nearest) <= EPSILON && !surface.grip) {
      grip = false
    }
  }
  if (grip && nearest <= range) {
    return {x: spider.x + direction.x * nearest, y: spider.y + direction.y * nearest}
  }
}

export function shoot(spider: Spider, surfaces: readonly Rect[], target: Point, tuning?: Partial<Tuning>): boolean {
  const hit = aimHit(spider, surfaces, target, tuning)
  if (!hit) return false
  const minimum = tuning?.minLength ?? DEFAULT_TUNING.minLength
  spider.rope = {...hit, length: Math.max(minimum, Math.hypot(hit.x - spider.x, hit.y - spider.y))}
  return true
}

function approach(value: number, target: number, maxDelta: number) {
  return value < target ? Math.min(target, value + maxDelta) : Math.max(target, value - maxDelta)
}

/** Sweep the body along one axis, clipping motion to the nearest solid face. */
function moveAxis(spider: Spider, surfaces: readonly Rect[], axis: 'x' | 'y', delta: number) {
  if (Math.abs(delta) < EPSILON) return false
  const horizontal = axis === 'x'
  const across = horizontal ? 'y' : 'x'
  const half = horizontal ? SPIDER_HALF_WIDTH : SPIDER_HALF_HEIGHT
  const acrossHalf = horizontal ? SPIDER_HALF_HEIGHT : SPIDER_HALF_WIDTH
  const bodyMin = spider[across] - acrossHalf
  const bodyMax = spider[across] + acrossHalf
  const forward = delta > 0
  const start = spider[axis]
  let travel = delta
  let blocked = false

  for (const surface of surfaces) {
    if (bodyMax <= surface[across] + EPSILON ||
      bodyMin >= surface[across] + (horizontal ? surface.h : surface.w) - EPSILON) continue

    const face = surface[axis] + (forward ? -half : (horizontal ? surface.w : surface.h) + half)
    const distance = face - start
    if (forward && distance >= -EPSILON && distance <= travel) {
      travel = Math.max(0, distance)
      blocked = true
    } else if (!forward && distance <= EPSILON && distance >= travel) {
      travel = Math.min(0, distance)
      blocked = true
    }
  }
  spider[axis] += travel

  if (blocked) {
    const velocity = horizontal ? 'vx' : 'vy'
    if (spider[velocity] * delta > 0) spider[velocity] = 0
  }
  return blocked
}

function constrainRope(spider: Spider, surfaces: readonly Rect[], rope: Rope) {
  // Correct only outward motion: the silk can hang slack and never pushes.
  for (let pass = 0; pass < 3; pass++) {
    const dx = spider.x - rope.x
    const dy = spider.y - rope.y
    const distance = Math.hypot(dx, dy)
    if (distance <= rope.length + EPSILON) break
    const excess = (distance - rope.length) / distance
    const xBlocked = moveAxis(spider, surfaces, 'x', -dx * excess)
    const yBlocked = moveAxis(spider, surfaces, 'y', -dy * excess)
    if (xBlocked && yBlocked) break
  }

  const dx = spider.x - rope.x
  const dy = spider.y - rope.y
  const distance = Math.hypot(dx, dy)
  if (distance < rope.length - EPSILON || distance < EPSILON) return
  const nx = dx / distance
  const ny = dy / distance
  const outward = Math.max(0, spider.vx * nx + spider.vy * ny)
  spider.vx -= outward * nx
  spider.vy -= outward * ny
}

function step(spider: Spider, surfaces: readonly Rect[], input: Input, dt: number, tuning: Tuning) {
  const move = Math.max(-1, Math.min(1, input.move))
  const direction = move < 0 ? -1 : 1
  if (move) spider.facing = direction
  if (spider.grounded && !spider.rope) {
    // Preserve faster horizontal momentum on landing and settle into a walk.
    spider.vx = approach(spider.vx, move * tuning.walkSpeed, tuning.acceleration * dt)
  } else if (move) {
    const acceleration = spider.rope ? tuning.acceleration : tuning.airAcceleration
    spider.vx += direction * Math.min(Math.abs(move) * acceleration * dt, Math.max(0, MAX_SWING_SPEED - direction * spider.vx))
  }

  spider.vy = Math.min(320, spider.vy + tuning.gravity * dt)
  moveAxis(spider, surfaces, 'x', spider.vx * dt)
  const floor = spider.vy > 0 && moveAxis(spider, surfaces, 'y', spider.vy * dt)
  if (spider.vy < 0) moveAxis(spider, surfaces, 'y', spider.vy * dt)

  const rope = spider.rope
  if (rope) {
    const originalLength = rope.length
    if (input.reel) rope.length = Math.max(tuning.minLength, rope.length - tuning.reelSpeed * dt)
    constrainRope(spider, surfaces, rope)
    if (input.reel) {
      const distance = Math.hypot(spider.x - rope.x, spider.y - rope.y)
      // Obstructions can prevent the body from moving closer; keep slack off the spool.
      rope.length = Math.max(rope.length, Math.min(originalLength, distance))
    }
  }

  spider.grounded = floor && surfaces.some(surface =>
    Math.abs(spider.y + SPIDER_HALF_HEIGHT - surface.y) < EPSILON &&
    spider.x + SPIDER_HALF_WIDTH > surface.x + EPSILON &&
    spider.x - SPIDER_HALF_WIDTH < surface.x + surface.w - EPSILON,
  )
}

export function tickSpider(
  spider: Spider,
  surfaces: readonly Rect[],
  input: Input,
  dtSeconds: number,
  overrides?: Partial<Tuning>,
) {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return
  const tuning = overrides ? {...DEFAULT_TUNING, ...overrides} : DEFAULT_TUNING
  const elapsed = Math.min(dtSeconds, 0.05)
  const steps = Math.ceil(elapsed / STEP)
  for (let index = 0; index < steps; index++) step(spider, surfaces, input, elapsed / steps, tuning)
}
