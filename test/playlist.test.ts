import assert from 'node:assert/strict';
import test from 'node:test';
import {locateTrack,playlistEnd,wrapPlaylist} from '../src/playlist.ts';
import {defaultLoopStart,firstTrackEnd} from '../src/song-timing.ts';
import {upgradeBeats,upgradeCaptions,upgradeEnd} from '../src/upgrade-timing.ts';

test('the first song plays once with its introduction, then both songs alternate',()=>{
  assert.deepEqual(locateTrack(wrapPlaylist(0,defaultLoopStart)),{track:'first',time:0});
  assert.deepEqual(locateTrack(wrapPlaylist(firstTrackEnd,defaultLoopStart)),{track:'upgrade',time:0});
  assert.deepEqual(locateTrack(wrapPlaylist(playlistEnd,defaultLoopStart)),{track:'first',time:defaultLoopStart});
  const cycle=playlistEnd-defaultLoopStart;
  const repeat=locateTrack(wrapPlaylist(firstTrackEnd+cycle,defaultLoopStart));
  assert.equal(repeat.track,'upgrade');
  assert.ok(repeat.time<1e-9);
});

test('upgrade captions and beat grid are ordered and fit before the return',()=>{
  assert.ok(upgradeCaptions.every(([start,end],i)=>start<end && end<upgradeEnd &&
    (!i || start>upgradeCaptions[i-1][0])));
  assert.ok(upgradeBeats.every((time,i)=>time<upgradeEnd && (!i || time>upgradeBeats[i-1])));
});
