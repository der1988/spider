import {createWorld, validWorld, type World} from './world.ts'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
export const HATCH_MS = 10_000
export const TEEN_MS = 12 * HOUR
export const ADULT_MS = 48 * HOUR
export const MAX_ABSENCE_MS = 12 * HOUR
export const SAVE_KEY = 'tamago.save'
export const BACKUP_KEY = 'tamago.backup'

export type Stage = 'egg' | 'baby' | 'teen' | 'adult'
export type Form = 'bud' | 'comet'
export type Action = 'feed' | 'play' | 'clean' | 'heal'

export interface State {
  stage: Stage
  form: Form | null
  hunger: number
  happiness: number
  energy: number
  hygiene: number
  health: number
  world: World
  sick: boolean
  bornAt: number
  updatedAt: number
  simulatedAt: number
  care: number
  observations: number
}

type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>

const clamp = (value: number) => Math.max(0, Math.min(100, value))
export function createGame(now: number, seed = Math.floor(Math.random() * 0x100000000)): State {
  return {
    stage: 'egg', form: null,
    hunger: 72, happiness: 74, energy: 93, hygiene: 95, health: 100,
    world: createWorld(seed), sick: false,
    bornAt: now, updatedAt: now, simulatedAt: now + HATCH_MS,
    care: 0, observations: 0,
  }
}

export function movementEnergy(energy: number, seconds: number, moving: boolean) {
  return clamp(energy + seconds * (moving ? -0.85 : 1.5))
}

function simulateMinute(state: State, elapsed: number) {
  state.hunger = clamp(state.hunger - 6 / 60)
  state.happiness = clamp(state.happiness - 4 / 60)
  state.hygiene = clamp(state.hygiene - 5 / 60)
  const needCare = Math.min(state.hunger, state.hygiene) < 25
  state.health = clamp(state.health + (needCare ? -6 : state.sick ? 0 : 4) / 60)
  state.sick ||= state.health < 55

  if (state.form === null && elapsed <= ADULT_MS) {
    state.care += (state.hunger + state.happiness + state.hygiene + state.energy + state.health) / 5
    state.observations++
  }
}

export function advance(state: State, now: number): State {
  if (!Number.isFinite(now) || now <= state.updatedAt) return state
  const elapsed = now - state.bornAt
  const next = { ...state, updatedAt: now }
  if (elapsed < HATCH_MS) return next

  const start = Math.max(state.simulatedAt, now - MAX_ABSENCE_MS)
  next.simulatedAt = start
  while (now - next.simulatedAt >= MINUTE) {
    next.simulatedAt += MINUTE
    simulateMinute(next, next.simulatedAt - next.bornAt)
  }

  next.stage = elapsed >= ADULT_MS ? 'adult' : elapsed >= TEEN_MS ? 'teen' : 'baby'
  if (next.stage === 'adult' && next.form === null) {
    const average = next.observations
      ? next.care / next.observations
      : (next.hunger + next.happiness + next.hygiene + next.energy + next.health) / 5
    next.form = average >= 70 ? 'comet' : 'bud'
  }
  return next
}

export function act(state: State, action: Action, now: number): { state: State; message: string } {
  const next = { ...advance(state, now) }
  if (next.stage === 'egg') return { state: next, message: 'Si sta ancora schiudendo…' }
  switch (action) {
    case 'feed':
      next.hunger = clamp(next.hunger + 27)
      return { state: next, message: 'Gnam!' }
    case 'play':
      if (next.energy < 8) return { state: next, message: 'Fermati un momento per recuperare energia.' }
      next.happiness = clamp(next.happiness + 26)
      next.energy = clamp(next.energy - 8)
      return { state: next, message: 'Che divertimento!' }
    case 'clean':
      next.hygiene = clamp(next.hygiene + 36)
      return { state: next, message: 'Pulito e splendente!' }
    case 'heal':
      if (!next.sick) return { state: next, message: 'È già in salute.' }
      next.sick = false
      next.health = Math.max(next.health, 72)
      return { state: next, message: 'Si sente meglio!' }
  }
}

const SAVE_VERSION = 2

function decode(raw: string | null): State | undefined {
  if (raw === null) return undefined
  try {
    const save = JSON.parse(raw)
    if (save?.version !== SAVE_VERSION && save?.version !== 1) return undefined
    const value = save.state as State | null
    if (!value || !['egg', 'baby', 'teen', 'adult'].includes(value.stage)) return undefined
    if (value.stage === 'adult' ? !['bud', 'comet'].includes(value.form ?? '') : value.form !== null) {
      return undefined
    }
    const meters = [value.hunger, value.happiness, value.energy, value.hygiene, value.health]
    if (!meters.every((meter) => Number.isFinite(meter) && meter >= 0 && meter <= 100)) return undefined
    if (typeof value.sick !== 'boolean') return undefined
    const times = [value.bornAt, value.updatedAt, value.simulatedAt]
    if (!times.every(Number.isSafeInteger) || value.bornAt < 0 || value.updatedAt < value.bornAt ||
      value.simulatedAt < value.bornAt + HATCH_MS ||
      value.simulatedAt > Math.max(value.bornAt + HATCH_MS, value.updatedAt)) {
      return undefined
    }
    if (!Number.isSafeInteger(value.observations) || value.observations < 0 ||
      !Number.isFinite(value.care) || value.care < 0 || value.care > value.observations * 100) {
      return undefined
    }
    if (save.version === SAVE_VERSION) return validWorld(value.world) ? value : undefined
    const {sleeping, lightOn, restUntil, ...awake} = save.state
    void sleeping
    void lightOn
    void restUntil
    return { ...awake, world: createWorld(Math.floor(Math.random() * 0x100000000)) }
  } catch {
    return undefined
  }
}

export function loadGame(storage: SaveStorage, now: number): State {
  try {
    const state = decode(storage.getItem(SAVE_KEY)) ?? decode(storage.getItem(BACKUP_KEY))
    if (state) {
      const next = advance(state, now)
      const idle = Math.max(0, now - Math.max(state.updatedAt, state.bornAt + HATCH_MS)) / 1000
      return { ...next, energy: movementEnergy(next.energy, idle, false) }
    }
  } catch {
    // A restricted browser can deny access to localStorage.
  }
  return createGame(now)
}

export function saveGame(storage: SaveStorage, state: State): boolean {
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (raw !== null && decode(raw)) storage.setItem(BACKUP_KEY, raw)
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, state }))
    return true
  } catch {
    return false
  }
}
