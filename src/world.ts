export const ZONE_WIDTH = 192;
export const RETURN_MS = 90_000;
const biomes = ['forest', 'beach', 'cave', 'meadow'] as const;
export type Biome = typeof biomes[number];
export interface World {
  seed: number;
  position: number;
  found: Record<string, number>;
  discoveries: number;
}

export const discoveries = {
  forest: {name:'Bosco', text:'Bacche selvatiche · +24 sazietà', need:'hunger', amount:24},
  beach: {name:'Spiaggia', text:'Conchiglia sonora · +25 felicità', need:'happiness', amount:25},
  cave: {name:'Grotta', text:'Cristallo raro · +20 salute', need:'health', amount:20},
  meadow: {name:'Prato', text:'Sorgente fresca · +28 igiene', need:'hygiene', amount:28},
} as const;

export const zoneIndex = (x: number) => Math.floor((x + ZONE_WIDTH / 2) / ZONE_WIDTH);

function hash(seed: number, index: number) {
  let value = seed ^ Math.imul(index, 0x9e3779b1);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function zoneAt(seed: number, index: number) {
  const variant = hash(seed, index);
  const distance = Math.abs(index);
  const nearby = [0, 1, 2, 3];
  // The first two zones on either side cover all four biomes, in seed-dependent order.
  for (let i = nearby.length - 1; i > 0; i--) {
    const pick = hash(seed, i) % (i + 1);
    [nearby[i], nearby[pick]] = [nearby[pick], nearby[i]];
  }
  const kind: Biome | 'clearing' = index === 0 ? 'clearing' : biomes[distance <= 2
    ? nearby[(distance - 1) * 2 + Number(index > 0)]
    : (variant % 3 + (index % 4 + 4) % 4) % 4];
  const findAt = index * ZONE_WIDTH - Math.sign(index) * (42 + variant % 24);
  return {kind, findAt, variant};
}

export function createWorld(seed: number): World {
  return {seed, position:0, found:{}, discoveries:0};
}

export function validWorld(value: unknown): value is World {
  if (!value || typeof value !== 'object') return false;
  const world = value as World;
  return Number.isInteger(world.seed) && world.seed >= 0 && world.seed <= 0xffffffff
    && Number.isFinite(world.position) && Math.abs(world.position) <= 1e12
    && Number.isSafeInteger(world.discoveries) && world.discoveries >= 0
    && !!world.found && typeof world.found === 'object' && !Array.isArray(world.found)
    && Object.entries(world.found).every(([key, time]) =>
      /^-?[1-9]\d*$/.test(key) && Number.isSafeInteger(time) && time >= 0);
}

export function ready(world: World, index: number, now: number) {
  return !Object.hasOwn(world.found, index) || now - world.found[index] >= RETURN_MS;
}

export function travel(world: World, position: number, now: number) {
  world.position = Math.max(-1e12, Math.min(1e12, position));
  const index = zoneIndex(world.position);
  const zone = zoneAt(world.seed, index);
  if (zone.kind === 'clearing' || Math.abs(zone.findAt - world.position) > 7 || !ready(world, index, now)) return;
  world.found[index] = now;
  world.discoveries++;
  // Only recent finds need to be retained to enforce respawn times.
  for (const key of Object.keys(world.found)) {
    if (now - world.found[key] >= RETURN_MS) delete world.found[key];
  }
  return discoveries[zone.kind];
}
