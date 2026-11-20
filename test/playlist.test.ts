import assert from 'node:assert/strict';
import test from 'node:test';
import {locateTrack,playlistEnd,trackStarts,wrapPlaylist} from '../src/playlist.ts';
import {defaultLoopStart,firstTrackEnd} from '../src/song-timing.ts';
import {roomBeats,roomCaptions,roomEnd} from '../src/room-timing.ts';
import {upgradeBeats,upgradeCaptions,upgradeEnd} from '../src/upgrade-timing.ts';

test('the first song plays once with its introduction, then all three songs cycle',()=>{
  assert.deepEqual(locateTrack(wrapPlaylist(0,defaultLoopStart)),{track:'first',time:0});
  assert.deepEqual(locateTrack(wrapPlaylist(firstTrackEnd,defaultLoopStart)),{track:'upgrade',time:0});
  assert.deepEqual(locateTrack(wrapPlaylist(trackStarts[2],defaultLoopStart)),{track:'room',time:0});
  assert.deepEqual(locateTrack(wrapPlaylist(playlistEnd,defaultLoopStart)),{track:'first',time:defaultLoopStart});
  const cycle=playlistEnd-defaultLoopStart;
  const repeat=locateTrack(wrapPlaylist(firstTrackEnd+cycle,defaultLoopStart));
  assert.equal(repeat.track,'upgrade');
  assert.ok(repeat.time<1e-9);
});

for (const [captions,beats,duration] of [[upgradeCaptions,upgradeBeats,upgradeEnd],[roomCaptions,roomBeats,roomEnd]] as const) {
  test('captions and beats are ordered and fit before the transition at '+duration,()=>{
    assert.ok(captions.every(([start,end],i)=>start<end && end<duration &&
      (!i || start>captions[i-1][0])));
    assert.ok(beats.every((time,i)=>time<duration && (!i || time>beats[i-1])));
  });
}
