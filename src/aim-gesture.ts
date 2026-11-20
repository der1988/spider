import type {Point} from './spider.ts';

const ARM = .32;
const RELEASE = .15;
const NEUTRAL_MS = 110;

export class AimGesture {
  private direction?: Point;
  private phase: 'ready' | 'aiming' | 'settling' = 'ready';
  private neutralSince?: number;

  get aiming() { return this.phase === 'aiming'; }
  get angle() { return this.direction; }

  sample({x,y}: Point,time: number): Point | undefined {
    const magnitude = Math.hypot(x,y);
    if (this.phase === 'settling') {
      if (magnitude > RELEASE) this.neutralSince = undefined;
      else {
        this.neutralSince ??= time;
        if (time - this.neutralSince >= NEUTRAL_MS) this.phase = 'ready';
      }
      return;
    }
    if (magnitude >= ARM) {
      this.phase = 'aiming';
      this.direction = {x:x/magnitude,y:y/magnitude};
    } else if (this.phase === 'aiming' && magnitude <= RELEASE) {
      this.phase = 'settling';
      this.neutralSince = time;
      return this.direction;
    }
  }

  reset(waitForCenter = false) {
    this.phase = waitForCenter ? 'settling' : 'ready';
    this.neutralSince = undefined;
    this.direction = undefined;
  }
}

export function silkMotion({x,y}: Point, wasDown: boolean) {
  const down = wasDown ? y > .55 : y > .65 && y > Math.abs(x)+.17;
  return {down,detach:down && !wasDown,reel:y < -.5};
}
