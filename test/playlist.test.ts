import assert from 'node:assert/strict';
import test from 'node:test';
import {flyBeats,flyCaptions,flyCues,flyDoubtAt,flyDuration,flyFinalStart,flyRoomEffect,flyRoomEnd} from '../src/fly-song-timing.ts';
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

for (const [captions,beats,duration] of [[upgradeCaptions,upgradeBeats,upgradeEnd],[roomCaptions,roomBeats,roomEnd],[flyCaptions,flyBeats,flyDuration]] as const) {
  test('captions and beats are ordered and fit before the transition at '+duration,()=>{
    assert.ok(captions.every(([start,end],i)=>start<end && end<duration &&
      (!i || start>captions[i-1][0])));
    assert.ok(beats.every((time,i)=>time<duration && (!i || time>beats[i-1])));
  });
}

test('fly choreography follows the spoken cues and finale has exactly twenty seconds',()=>{
  assert.equal(flyDuration-flyFinalStart,20);
  assert.ok(Object.values(flyCues).every((time,index,values)=>!index || time>values[index-1]));
  assert.equal(flyCaptions.find(([, ,text])=>text==='Start the clock.')?.[1],flyCues.play);
  assert.ok(flyCues.pass<flyFinalStart);
});

test('the questions, watched web and step back have separate song-time windows',()=>{
  assert.equal(flyDoubtAt(155.051),undefined);
  assert.equal(flyDoubtAt(155.052),'identity');
  assert.equal(flyDoubtAt(157.100),undefined);
  assert.equal(flyDoubtAt(161.192),'decision');
  assert.equal(flyDoubtAt(164.392),'lastWeb');
  assert.equal(flyDoubtAt(174.392),'watch');
  assert.equal(flyDoubtAt(178.072),'stepBack');
  assert.equal(flyDoubtAt(flyFinalStart),undefined);
});

test('the room effect eases in at its lyric, hides details briefly and fully returns',()=>{
  assert.deepEqual(flyRoomEffect(flyCues.shrink-.01),{shrink:0,details:1});
  const entry=flyRoomEffect(flyCues.shrink+1);
  assert.ok(entry.shrink>0 && entry.shrink<1);
  assert.deepEqual(flyRoomEffect(flyCues.shrink+4),{shrink:1,details:0});
  const exit=flyRoomEffect(flyRoomEnd-1);
  assert.ok(exit.shrink>0 && exit.shrink<1 && exit.details>0 && exit.details<1);
  assert.deepEqual(flyRoomEffect(flyRoomEnd),{shrink:0,details:1});
});
