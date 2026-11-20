// WebKit can zoom on a second tap even when game controls declare touch-action.
export function preventGameZoom() {
  const starts = new Map<number,{x:number;y:number;time:number}>();
  let lastTap: {x:number;y:number;time:number} | undefined;

  document.addEventListener('touchstart',event => {
    const time = performance.now();
    for (const touch of Array.from(event.changedTouches)) {
      starts.set(touch.identifier,{x:touch.clientX,y:touch.clientY,time});
    }
    if (event.touches.length > 1) lastTap = undefined;
  },{capture:true,passive:true});

  document.addEventListener('touchend',event => {
    const touch = event.changedTouches[0];
    const start = touch && starts.get(touch.identifier);
    for (const ended of Array.from(event.changedTouches)) starts.delete(ended.identifier);

    const time = performance.now();
    if (!start || event.touches.length || event.changedTouches.length !== 1 ||
      time-start.time > 340 || Math.hypot(touch.clientX-start.x,touch.clientY-start.y) > 12) {
      lastTap = undefined;
      return;
    }

    if (lastTap && time-lastTap.time < 380 &&
      Math.hypot(touch.clientX-lastTap.x,touch.clientY-lastTap.y) < 48) {
      event.preventDefault();
    }
    lastTap = {x:touch.clientX,y:touch.clientY,time};
  },{capture:true,passive:false});

  document.addEventListener('touchcancel',event => {
    for (const touch of Array.from(event.changedTouches)) starts.delete(touch.identifier);
    lastTap = undefined;
  },{capture:true,passive:true});

  for (const type of ['gesturestart','gesturechange','dblclick']) {
    document.addEventListener(type,event => event.preventDefault(),{capture:true,passive:false});
  }
}
