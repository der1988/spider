import {firstTrackEnd} from './song-timing.ts';
import {upgradeEnd} from './upgrade-timing.ts';

export const playlistEnd = firstTrackEnd+upgradeEnd;

export type SongPosition = {track: 'first'|'upgrade'; time: number};

export function wrapPlaylist(elapsed: number,returnAt: number,end=playlistEnd) {
  if (elapsed<end) return elapsed;
  return returnAt+(elapsed-end)%(end-returnAt);
}

export function locateTrack(offset: number,boundary=firstTrackEnd): SongPosition {
  return offset<boundary ? {track:'first',time:offset} : {track:'upgrade',time:offset-boundary};
}
