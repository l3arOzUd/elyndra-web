// Authored idle studies only. No limb warping or per-key alignment.
export const idleSources = {
  front: ['front-rest-study.png', 'idle-front-look-v2.png'],
  back: ['back-anatomy-study-v4.png', 'idle-back-claw.png'],
  left: ['left-profile-study-v2.png', 'idle-left-look.png'],
  right: ['right-profile-study-v2.png', 'idle-right-look.png'],
};
export const idleSequence = [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0];
export async function loadIdleArt() {
  return Object.fromEntries(await Promise.all(Object.entries(idleSources).map(async ([view, files]) =>
    [view, await Promise.all(files.map(async file => {
      const image = new Image();
      image.src = new URL('./' + file, import.meta.url).href;
      await image.decode();
      return image;
    }))])));
}
export function drawIdle(ctx, art, view, frame, overlay = false) {
  const image = art[view][idleSequence[frame]];
  ctx.clearRect(0,0,512,512);
  ctx.drawImage(image,26,100,image.naturalWidth*.3,image.naturalHeight*.3);
  if (overlay && idleSequence[frame] === 1) {
    ctx.save(); ctx.globalAlpha = .4;
    const base = art[view][0];
    ctx.drawImage(base,26,100,base.naturalWidth*.3,base.naturalHeight*.3);
    ctx.restore();
  }
}
