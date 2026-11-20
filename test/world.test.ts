import assert from 'node:assert/strict';
import test from 'node:test';
import {createGame, loadGame, saveGame} from '../src/game.ts';
import {RETURN_MS, ready, travel, zoneAt, zoneIndex} from '../src/world.ts';

test('both directions lead to discoveries and the first four zones cover all four biomes', () => {
  for (const seed of [0, 17, 1024, 0xffffffff]) {
    const game = createGame(0, seed);
    assert.equal(zoneAt(seed, 0).kind, 'clearing');
    const neighbors = [-2, -1, 1, 2].map(index => zoneAt(seed, index));
    assert.equal(new Set(neighbors.map(zone => zone.kind)).size, 4);
    assert.ok(neighbors.every(zone => Math.abs(zone.findAt) < 400));
    for (const direction of [-1, 1]) {
      const {findAt} = zoneAt(seed, direction);
      assert.equal(zoneIndex(findAt), direction);
      assert.ok(travel(game.world, findAt, 1000));
      assert.equal(travel(game.world, findAt, 1100), undefined);
      assert.equal(ready(game.world, direction, RETURN_MS + 1000), true);
    }
  }
});

test('reload preserves location, procedural details, discovery count and cooldown', () => {
  const entries = new Map<string, string>();
  const storage = {getItem: (key: string) => entries.get(key) ?? null, setItem: entries.set.bind(entries)};
  const game = createGame(0, 512);
  const zone = zoneAt(game.world.seed, -1);
  travel(game.world, zone.findAt, 100);
  assert.equal(saveGame(storage, game), true);
  const restored = loadGame(storage, 0).world;
  assert.deepEqual(restored, game.world);
  assert.deepEqual(zoneAt(restored.seed, -1), zone);
  assert.equal(travel(restored, zone.findAt, 101), undefined);
  assert.ok(travel(restored, zone.findAt, RETURN_MS + 100));
});
