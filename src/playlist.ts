import {firstTrackEnd} from './song-timing.ts';
import {upgradeEnd} from './upgrade-timing.ts';
import {roomEnd} from './room-timing.ts';

export const trackStarts = [0,firstTrackEnd,firstTrackEnd+upgradeEnd] as const;
export const playlistEnd = trackStarts[2]+roomEnd;

export type SongPosition = {track: 'first'|'upgrade'|'room'; time: number};

export function wrapPlaylist(elapsed: number,returnAt: number,end=playlistEnd) {
  if (elapsed<end) return elapsed;
  return returnAt+(elapsed-end)%(end-returnAt);
}

export function locateTrack(offset: number,upgrade: number=trackStarts[1],room: number=trackStarts[2]): SongPosition {
  if (offset>=room) return {track:'room',time:offset-room};
  if (offset>=upgrade) return {track:'upgrade',time:offset-upgrade};
  return {track:'first',time:offset};
}
