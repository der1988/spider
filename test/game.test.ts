import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADULT_MS,
  advance,
  act,
  BACKUP_KEY,
  createGame,
  HATCH_MS,
  loadGame,
  MAX_ABSENCE_MS,
  movementEnergy,
  SAVE_KEY,
  saveGame,
  TEEN_MS,
} from '../src/game.ts';

const birth = Date.UTC(2026, 10, 20, 9);
const hatch = birth + HATCH_MS;

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

test('the egg hatches once and has distinct later stages', () => {
  const egg = createGame(birth);
  assert.equal(advance(egg, hatch - 1).stage, 'egg');
  const baby = advance(egg, hatch);
  assert.equal(baby.stage, 'baby');
  const teen = advance(baby, birth + TEEN_MS);
  assert.equal(teen.stage, 'teen');
  const adult = advance(teen, birth + ADULT_MS);
  assert.equal(adult.stage, 'adult');
  assert.ok(adult.form);
  assert.equal(advance(adult, birth + ADULT_MS + 1000).form, adult.form);
});

test('a hatched creature gets hungry and feeding replenishes its food meter', () => {
  const baby = advance(createGame(birth), hatch);
  const later = hatch + 30 * 60_000;
  const hungry = advance(baby, later);
  assert.ok(hungry.hunger < baby.hunger);
  const fed = act(hungry, 'feed', later).state;
  assert.ok(fed.hunger > hungry.hunger);
  assert.ok(fed.hunger <= 100);
});

test('a prolonged absence caps needs decay and does not charge it again immediately', () => {
  const baby = advance(createGame(birth), hatch);
  const returnTime = hatch + MAX_ABSENCE_MS * 4;
  const startOfWindow = returnTime - MAX_ABSENCE_MS;
  const shortAbsence = advance({ ...baby, updatedAt: startOfWindow, simulatedAt: startOfWindow }, returnTime);
  const longAbsence = advance(baby, returnTime);
  for (const need of ['hunger', 'happiness', 'energy', 'hygiene', 'health'] as const) {
    assert.equal(longAbsence[need], shortAbsence[need], need);
    assert.ok(longAbsence[need] >= 0 && longAbsence[need] <= 100, need);
  }
  assert.deepEqual(advance(longAbsence, returnTime), longAbsence);
});

test('loading a saved creature advances time and uses the backup if primary JSON is corrupt', () => {
  const storage = memoryStorage();
  const baby = advance(createGame(birth), hatch);
  const later = hatch + 30 * 60_000;
  const hungry = { ...advance(baby, later), energy:100 };

  assert.equal(saveGame(storage, baby), true);
  assert.deepEqual(loadGame(storage, later), hungry);
  assert.equal(saveGame(storage, hungry), true);
  assert.ok(storage.getItem(BACKUP_KEY));
  storage.setItem(SAVE_KEY, '{');
  assert.deepEqual(loadGame(storage, later), hungry);
  storage.setItem(BACKUP_KEY, '{');
  assert.equal(loadGame(storage, later).stage, 'egg');
});

test('care history determines the adult form', () => {
  const baby = advance(createGame(birth), hatch);
  const minute = 60_000;
  const beforeEvolution = birth + ADULT_MS - minute;
  const teen = advance(baby, beforeEvolution);
  const wellCaredFor = { ...teen, care: 900, observations: 10 };
  const neglected = { ...teen, care: 300, observations: 10 };
  assert.equal(advance(wellCaredFor, birth + ADULT_MS).form, 'comet');
  assert.equal(advance(neglected, birth + ADULT_MS).form, 'bud');
});

test('neglect can cause sickness and treatment restores health', () => {
  let now = hatch;
  let pet = advance(createGame(birth), now);
  for (let step = 0; step < 4; step++) {
    now += MAX_ABSENCE_MS;
    pet = advance(pet, now);
  }
  assert.equal(pet.sick, true);
  const treated = act(pet, 'heal', now).state;
  assert.equal(treated.sick, false);
  assert.ok(treated.health > pet.health);
});

test('a version-one sleeping pet keeps its progress and starts awake in the clearing', () => {
  const storage = memoryStorage();
  const baby = advance(createGame(birth), hatch);
  storage.setItem(SAVE_KEY, JSON.stringify({
    version: 1, state: { ...baby, world: undefined, sleeping: true, lightOn: false, restUntil: hatch + 1000 },
  }));
  const migrated = loadGame(storage, hatch);
  assert.equal(migrated.stage, 'baby');
  assert.equal(migrated.bornAt, birth);
  assert.equal(migrated.world.position, 0);
  assert.equal('sleeping' in migrated, false);
  assert.equal(act(migrated, 'feed', hatch).state.hunger, 99);
  assert.ok(saveGame(storage, migrated));
  assert.deepEqual(loadGame(storage, hatch), migrated);
});

test('walking spends energy and standing still restores it gradually', () => {
  const tired = movementEnergy(90, 20, true);
  assert.ok(tired < 90);
  assert.ok(movementEnergy(tired, 5, false) > tired);
  assert.equal(movementEnergy(2, 30, true), 0);
  assert.equal(movementEnergy(98, 30, false), 100);
});
