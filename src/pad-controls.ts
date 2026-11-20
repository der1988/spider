import type {Point} from './spider.ts';

interface Shoulders {
  l1: boolean;
  r1: boolean;
}

type StandardPad = Pick<Gamepad,'axes'|'buttons'>;

export function samplePlayStation(pad: StandardPad, previous?: Shoulders) {
  const shoulders = {l1:!!pad.buttons[4]?.pressed,r1:!!pad.buttons[5]?.pressed};
  const x = pad.axes[2] ?? 0;
  const y = pad.axes[3] ?? 0;
  const length = Math.hypot(x,y);
  return {
    shoulders,
    movement:{x:pad.axes[0] ?? 0,y:pad.axes[1] ?? 0},
    aim:length >= .22 ? {x:x/length,y:y/length} : undefined,
    jump:!!previous && shoulders.l1 && !previous.l1,
    fire:!!previous && shoulders.r1 && !previous.r1,
  };
}

export function silkMotion({x,y}: Point, wasDown: boolean) {
  const down = wasDown ? y > .55 : y > .65 && y > Math.abs(x)+.17;
  return {down,detach:down && !wasDown,reel:y < -.5};
}
