import type {SongPosition} from './playlist';
import {upgradeBeats,upgradeCaptions} from './upgrade-timing';
import {beats,captions,clockCue,defaultLoopStart,firstTrackEnd,loopCue} from './song-timing';

const timingKey = 'tamago.soundtrack.cues.v1';
export interface SongTiming {
  starts: number[];
  loopStart: number;
}

export function loadTiming(): SongTiming {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(timingKey)??'null');
    if (validTiming(saved)) return saved;
  } catch { /* Use the shipped alignment when storage is unavailable. */ }
  return defaultTiming();
}

function defaultTiming(): SongTiming {
  return {starts:captions.map(([start])=>start),loopStart:defaultLoopStart};
}

function validTiming(value: unknown): value is SongTiming {
  if (!value || typeof value!=='object') return false;
  const {starts,loopStart}=value as SongTiming;
  return Array.isArray(starts) && starts.length===captions.length &&
    starts.every((time,i)=>Number.isFinite(time) && time>=0 && time<firstTrackEnd && (!i || time>starts[i-1])) &&
    Number.isFinite(loopStart) && loopStart>starts[clockCue] &&
    loopStart<=starts[loopCue] && starts[loopCue]-loopStart<=.54;
}

function lastCue(times: readonly number[],time: number) {
  let lo=0;
  let hi=times.length;
  while (lo<hi) {
    const mid=(lo+hi)>>>1;
    if (times[mid]<=time) lo=mid+1;
    else hi=mid;
  }
  return lo-1;
}

const upgradeStarts = upgradeCaptions.map(([start])=>start);

export function lyricAt({track,time}: SongPosition,timing: SongTiming) {
  const starts=track==='first' ? timing.starts : upgradeStarts;
  const lines=track==='first' ? captions : upgradeCaptions;
  const i=lastCue(starts,time);
  if (i<0) return '';
  const [start,end,text]=lines[i];
  const duration=Math.max(.55,end-start+.23);
  return time<starts[i]+duration ? text : '';
}

export function huntStart(timing: SongTiming) {
  const [start,end]=captions[clockCue];
  return Math.min(timing.starts[clockCue]+end-start,timing.starts[loopCue]);
}

export function beatAt({track,time}: SongPosition) {
  const accents=track==='first' ? beats : upgradeBeats;
  const i=lastCue(accents,time);
  return i<0 ? 0 : Math.max(0,1-(time-accents[i])/.22)**2;
}

export interface OpeningShot {subject: 'spider'|'fly'|'arena'; zoom: number}

export function openingShot(time: number,timing: SongTiming): OpeningShot {
  const [spider,fly,room,game]=timing.starts;
  if (time<spider || time>=game) return {subject:'arena',zoom:1};
  if (time<fly) return {subject:'spider',zoom:4.2};
  if (time<room) return {subject:'fly',zoom:6};
  const p=Math.min(1,(time-room)/Math.min(.68,game-room));
  const eased=p*p*(3-2*p);
  return {subject:'fly',zoom:1+5*(1-eased)};
}
