import assert from 'node:assert/strict';
import test from 'node:test';
import {frankChapters} from '../src/frank-script.ts';
import {frankPortraitPosition} from '../src/frank-portrait.ts';
import {frankDukePose,frankPrologueWalkway,frankStrangerPose} from '../src/frank-staging.ts';
import {createFrankStory,frankCastNames,frankLine,frankPhase,frankSpeakerIdentity,frankSpeakerIndex,tickFrank} from '../src/frank-story.ts';
import {advanceArcade,arcadeDirectHits,createArcade,loadArcadeChapter,species} from '../src/arcade.ts';
import {arcadeRivalStage} from '../src/arcade-scenery.ts';
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
      tickFrank(story,2.05,false);
      while (story.phase==='after') {tickFrank(story,0,true);tickFrank(story,0,true);}
    }
    assert.equal(story.phase,'fade');
    tickFrank(story,.55,false);
  }
  assert.equal(story.phase,'complete');
});

test('the Stranger walks in, talks and walks out along the prologue platform',()=>{
  const story=createFrankStory();
  frankPhase(story,'before');
  const walkway=frankPrologueWalkway;
  story.lineIndex=3;
  const entrance=frankStrangerPose(story)!;
  tickFrank(story,0,true);
  assert.deepEqual(frankStrangerPose(story),entrance);
  for (const index of [3,4,frankChapters[0].before.length-1]) {
    story.lineIndex=index;
    for (let step=0;step<120;step++) {
      story.lineElapsed=step/120;
      const pose=frankStrangerPose(story)!;
      assert.ok(pose.x-8>=walkway.x && pose.x+8<=walkway.x+walkway.w);
      assert.equal(pose.y+7,walkway.y);
    }
  }
  story.lineElapsed=1;
  assert.equal(frankStrangerPose(story),undefined);
});

test('Duke stages both conversations on the same perch as the fight entrance',()=>{
  const story=createFrankStory(10),run=createArcade(10);
  const {perch,feet,halfWidth,start}=arcadeRivalStage;
  assert.ok(run.movement.hunt.surfaces.includes(perch));
  assert.deepEqual(run.boss?.p,start);
  for (const phase of ['title','before','setup','after'] as const) {
    frankPhase(story,phase);
    for (let frame=0;frame<=120;frame++) {
      story.elapsed=frame/120;
      for (const battleX of [45,348,380]) {
        const pose=frankDukePose(story,battleX);
        assert.equal(pose.y+feet,perch.y);
        assert.ok(pose.x-halfWidth>=perch.x && pose.x+halfWidth<=perch.x+perch.w);
      }
    }
    if (phase!=='title') assert.equal(frankDukePose(story,348).x,start.x);
  }
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
  run.invincible=run.clock+1.5;
  loadArcadeChapter(run,2);
  assert.equal(run.level,2);
  assert.equal(run.lives,3);
  assert.equal(run.invincible,0);
  assert.equal(run.score,1);
});

test('skipping a scene leaves the next encounter or scene intact',()=>{
  for (const phase of ['title','before','setup','after'] as const) {
    const story=createFrankStory(4);
    frankPhase(story,phase);
    tickFrank(story,0,false,true);
    assert.equal(story.phase,phase==='title'||phase==='before' ? 'combat' : 'fade');
    assert.equal(story.chapter,4);
    if (story.phase==='fade') {
      tickFrank(story,.55,false);
      assert.equal(story.chapter,5);
      assert.equal(story.phase,'title');
    }
  }
  const prologue=createFrankStory();
  tickFrank(prologue,0,false,true);
  tickFrank(prologue,.55,false);
  assert.equal(prologue.chapter,1);
  assert.equal(prologue.phase,'title');
});
