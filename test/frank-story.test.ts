import assert from 'node:assert/strict';
import test from 'node:test';
import {frankChapters} from '../src/frank-script.ts';
import {frankPortraitPosition} from '../src/frank-portrait.ts';
import {createFrankStory,frankCastNames,frankLine,frankPhase,frankSpeakerIdentity,frankSpeakerIndex,tickFrank} from '../src/frank-story.ts';
import {advanceArcade,arcadeDirectHits,createArcade,loadArcadeChapter,species} from '../src/arcade.ts';
import {arenaInput} from '../src/arena-run.ts';

test('campaign data uses the existing roster, resistance and known speakers',()=>{
  assert.equal(frankChapters.length,12);
  for (const [i,chapter] of frankChapters.entries()) {
    for (const line of [...chapter.before,...chapter.after]) {
      assert.ok(['FRANK','DUKE','STRANGER'].includes(line.speaker) || frankSpeakerIndex(i,line.speaker)>=0);
    }
    if (!i || i===11) continue;
    const run=createArcade(i);
    assert.deepEqual(chapter.enemies.map(f=>f.species),run.flies.map(f=>species[f.kind][0]));
    assert.deepEqual(chapter.enemies.map(f=>f.hits),run.flies.map(f=>arcadeDirectHits(i,f.actor)));
  }
});

test('every cast member has a distinct portrait in the atlas',()=>{
  const names=[...new Set(frankChapters.flatMap((_,chapter)=>frankCastNames(chapter)))];
  assert.equal(names.length,30);
  const positions=names.map(frankPortraitPosition);
  assert.ok(positions.every(Boolean));
  assert.equal(new Set(positions).size,30);
  frankChapters.forEach(({before,after},chapter)=>{
    for (const line of [...before,...after]) assert.ok(names.includes(frankSpeakerIdentity(chapter,line.speaker)));
  });
});

test('manual reveal takes two edges and all chapters advance through the epilogue',()=>{
  const story=createFrankStory();
  for (let i=0;i<12;i++) {
    assert.equal(story.chapter,i);
    tickFrank(story,3,false);
    while (story.phase==='before') {
      const line=frankLine(story)!;
      tickFrank(story,0,true);
      assert.equal(frankLine(story),line);
      assert.equal(story.reveal,line.text.length);
      tickFrank(story,0,true);
    }
    if (i>0 && i<11) {
      assert.equal(story.phase,'combat');
      frankPhase(story,'setup');
      tickFrank(story,1.1,false);
      while (story.phase==='after') {tickFrank(story,0,true);tickFrank(story,0,true);}
    }
    assert.equal(story.phase,'fade');
    tickFrank(story,.55,false);
  }
  assert.equal(story.phase,'complete');
});

test('the campaign holds the chapter until recovery and preserves progress on transition',()=>{
  const run=createArcade(1),input=arenaInput({x:0,y:0});
  loadArcadeChapter(run,1);
  const [fly]=run.flies,hero=run.movement.spider;
  fly.caughtUntil=2;
  advanceArcade(run,input,undefined,true);
  assert.equal(run.flies.length,1);
  fly.p={x:hero.x,y:hero.y-4};
  advanceArcade(run,input,undefined,true);
  assert.equal(run.flies.length,0);
  assert.equal(run.level,1);
  assert.equal(run.score,1);
  run.lives=2;
  loadArcadeChapter(run,2);
  assert.equal(run.level,2);
  assert.equal(run.lives,2);
  assert.equal(run.score,1);
});
