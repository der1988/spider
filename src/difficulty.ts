export const difficultyConfig = {
  round: {base:60, lossPerCatch:1, minimum:10, infinite:20},
  speed: {cruise:49, escape:75, variation:5, every:5, increase:.05},
  reaction: {base:.17, every:10, reduction:.10, minimum:.08},
  spider: {alert:47, route:56, every:20, increase:.10},
  webSight:48,
} as const;

export type HuntMode = 'story'|'loop';

export function difficultyAt(catches: number,mode: HuntMode='story') {
  const {round,speed,reaction,spider}=difficultyConfig;
  const speedMultiplier=1+Math.floor(catches/speed.every)*speed.increase;
  const radiusMultiplier=1+Math.floor(catches/spider.every)*spider.increase;
  return {
    duration:mode==='loop' ? round.infinite : Math.max(round.minimum,round.base-catches*round.lossPerCatch),
    cruiseSpeed:speed.cruise*speedMultiplier,
    escapeSpeed:speed.escape*speedMultiplier,
    reactionTime:Math.max(reaction.minimum,reaction.base*(1-reaction.reduction)**Math.floor(catches/reaction.every)),
    alertRadius:spider.alert*radiusMultiplier,
    routeRadius:spider.route*radiusMultiplier,
  };
}

export function difficultyChanges(catches: number) {
  const current=difficultyAt(catches);
  const previous=difficultyAt(Math.max(0,catches-1));
  return [
    ...(current.cruiseSpeed>previous.cruiseSpeed ? ['faster'] : []),
    ...(current.reactionTime<previous.reactionTime ? ['quicker to dodge webs'] : []),
    ...(current.alertRadius>previous.alertRadius ? ['more alert to the spider'] : []),
  ];
}
