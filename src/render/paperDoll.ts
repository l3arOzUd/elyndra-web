import type { Dir } from "../shared/dir";
import { refineGlow } from "../shared/refine";
import { spriteFromImages, type AnimName, type SpriteDef, type SpriteDefJson } from "./spriteDef";

// The Wayfarer as a paper doll: body parts and equipment layers are separate
// PNGs (public/sprites/wayfarer/), all drawn in their resting place on one
// art canvas. rig.json gives each part's pivot and parent; this file turns
// them by pose, stacks them in the view's order with whatever is equipped,
// and bakes ordinary sprite sheets, so SpriteActor draws a player exactly
// like any other sprite. One bake per outfit, cached.
//
// Art rules for the PNGs: CHARACTER_ART_GUIDE.md.

type Vec = [number, number];
interface PartDef { pivot: Vec; parent: string }
interface ViewDef { parts: Record<string, PartDef>; order: string[] }
export interface Rig {
  canvas: number;
  feet: Vec;
  frame: number;
  pixelsPerCell: number;
  facings: Partial<Record<Dir, string>>;
  attach: Record<string, string>;
  views: Record<string, ViewDef>;
  variants?: Record<string, string[]>;
  effects?: string[];
}
/** variants: the item also has a drawing of each layer's rig variants (gloves: hand_near_open.png), used in those poses. */
export interface ItemLook { name: string; slot: string; visual: string; layers: string[]; hides?: string[]; motion?: "melee" | "punch" | "shoot" | "cast"; variants?: boolean; refine?: number }
export interface PaperDollKit { rig: Rig; items: Record<string, ItemLook>; img: Map<string, HTMLImageElement> }

/** Generated equipment may share an existing painted weapon without a motion field. */
export function weaponMotion(looks: ItemLook[]): string {
  const weapon=looks.find(it=>it.slot==="weapon");
  if(!weapon)return "unarmed";
  return weapon.motion ?? (/gauntlet/.test(weapon.visual) ? "punch" : ({surveyor_bow:"shoot",aether_rod:"cast",copper_saber:"melee"}[weapon.visual])) ?? "melee";
}

const DIR = "sprites/wayfarer/";

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null); // a part not drawn yet is simply left out
    im.src = url;
  });
}

/**
 * Loads rig.json, equipment.json and every part and layer PNG they name.
 * `bust` (any string) fetches past the browser cache, for picking up new art.
 */
export async function loadPaperDoll(base = DIR, bust = ""): Promise<PaperDollKit> {
  const q = bust ? `?v=${encodeURIComponent(bust)}` : "";
  const rig = (await (await fetch(base + "rig.json" + q)).json()) as Rig;
  const items = ((await (await fetch(base + "equipment.json" + q)).json()) as { items: Record<string, ItemLook> }).items;
  // Content builds may regenerate aliases using the old four-layer coat brief.
  // Inherit its actual painted cuffs and occlusion rules from the canonical look.
  const coat=items.itm_0079;
  if(coat)for(const item of Object.values(items))if(item.visual===coat.visual){
    item.layers=[...new Set([...item.layers,...coat.layers])];
    item.hides=[...new Set([...item.hides??[],...coat.hides??[]])];
  }
  const files: string[] = [];
  for (const [view, v] of Object.entries(rig.views)) {
    for (const part of Object.keys(v.parts)) files.push(`base/${view}/${part}.png`);
    for (const [part, variants] of Object.entries(rig.variants ?? {})) for (const variant of variants) files.push(`base/${view}/${part}_${variant}.png`);
    for (const it of Object.values(items)) for (const layer of it.layers) {
      files.push(`items/${it.visual}/${view}/${layer}.png`);
      if (it.variants) for (const variant of rig.variants?.[layer] ?? []) files.push(`items/${it.visual}/${view}/${layer}_${variant}.png`);
    }
  }
  files.push(...rig.effects ?? []);
  const img = new Map<string, HTMLImageElement>();
  const unique=[...new Set(files)];
  const loaded = await Promise.all(unique.map((f) => loadImage(base + f + q)));
  unique.forEach((f, i) => { if (loaded[i]) img.set(f, loaded[i]!); });
  return { rig, items, img };
}

// --- poses --------------------------------------------------------------------------------

/** Frame counts and timing; the attack's "hit" event is the strike frame. */
export const DOLL_ANIMS: SpriteDefJson["animations"] = {
  idle: { file: "(paper doll)", frames: 8, fps: 6, loop: true },
  walk: { file: "(paper doll)", frames: 8, fps: 12, loop: true, refMsPerCell: 150 },
  attack: { file: "(paper doll)", frames: 8, fps: 16, events: { hit: 4 } },
  shoot: { file: "(paper doll)", frames: 12, fps: 20, events: { hit: 8 } },
  cast: { file: "(paper doll)", frames: 12, fps: 16, events: { hit: 8 } },
  hit: { file: "(paper doll)", frames: 4, fps: 12 },
  death: { file: "(paper doll)", frames: 12, fps: 12, hold: true },
};

interface Pose {
  /** Whole body: turn (degrees, clockwise) about the feet, then shift (art px). */
  rot: number;
  dx: number;
  dy: number;
  /** Per part: turn about its pivot (degrees, clockwise) and lift (art px, up). */
  angle: Record<string, number>;
  lift: Record<string, number>;
  hurt: number;
  openHands?: string[];
  bowDraw?: number;
  arrowFlight?: number;
  spell?: number;
  farArmInFront?: boolean;
  unconscious?: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * The pose of every part for one frame. Side view faces screen-left, so a
 * clockwise turn moves a hanging limb forward (left) and tips the body back.
 */
export function poseAt(view: string, anim: AnimName, f: number, n: number): Pose {
  const p: Pose = { rot: 0, dx: 0, dy: 0, angle: {}, lift: {}, hurt: 0 };
  const t = f / n; // looping clips
  const k = n > 1 ? f / (n - 1) : 1; // one-shot clips, 0..1
  const side = view === "side";
  // Raising the weapon arm outwards: clockwise on the front (arm on screen-left), anticlockwise from the back.
  const out = view === "back" ? -1 : 1;
  switch (anim) {
    case "idle": {
      const s = Math.sin(t * Math.PI * 2);
      p.dy = s * 3;
      p.angle.arm_near = s * 3 * out;
      p.angle.arm_far = -s * 3 * out;
      break;
    }
    case "walk": {
      const s = Math.sin(t * Math.PI * 2);
      p.dy = -Math.abs(Math.cos(t * Math.PI * 2)) * 7;
      if (side) {
        p.angle.thigh_near = s * 28;
        p.angle.thigh_far = -s * 28;
        p.angle.shin_near = Math.min(0, s) * 38;
        p.angle.shin_far = Math.min(0, -s) * 38;
        p.angle.arm_near = -s * 22;
        p.angle.arm_far = s * 22;
        p.rot = -3;
      } else {
        // Frontal depth must read at the final game scale. A tiny whole-leg
        // lift looked stationary; alternate the planted and recovering foot,
        // folding the shin into the thigh instead of bouncing both feet.
        p.dy = -Math.abs(s) * 3;
        p.dx = s * 2;
        p.lift.thigh_near = s * 10;
        p.lift.thigh_far = -s * 10;
        p.lift.shin_near = Math.max(0, s) * 18;
        p.lift.shin_far = Math.max(0, -s) * 18;
        p.angle.thigh_near = s * 4 * out;
        p.angle.thigh_far = -s * 4 * out;
        p.angle.shin_near = -s * 7 * out;
        p.angle.shin_far = s * 7 * out;
        p.angle.arm_near = s * 9 * out;
        p.angle.arm_far = -s * 9 * out;
      }
      break;
    }
    case "attack": {
      // Wind up to 0.4, strike by 0.6 (the hit frame), recover.
      const up = side ? -150 : 150 * out;
      const down = side ? 70 : -40 * out;
      const a = k < 0.4 ? lerp(0, up, ease(k / 0.4)) : k < 0.6 ? lerp(up, down, ease((k - 0.4) / 0.2)) : lerp(down, 0, ease((k - 0.6) / 0.4));
      p.angle.arm_near = a;
      if (side) {
        p.rot = k < 0.4 ? lerp(0, 5, k / 0.4) : k < 0.6 ? lerp(5, -8, (k - 0.4) / 0.2) : lerp(-8, 0, (k - 0.6) / 0.4);
        p.angle.thigh_near = k >= 0.4 ? 14 * (1 - Math.abs(k - 0.6) / 0.4) : 0;
        p.angle.arm_far = -a * 0.15;
      } else {
        p.dy = k >= 0.4 && k < 0.8 ? 4 : 0;
      }
      break;
    }
    case "hit": {
      const h = 1 - t;
      p.hurt = h;
      if (side) p.rot = 10 * h;
      else p.dy = -6 * h;
      p.angle.arm_near = (side ? -12 : 10 * out) * h;
      p.angle.arm_far = (side ? 12 : -10 * out) * h;
      break;
    }
    case "death": {
      // Knees give way first, then the spine folds and the head settles.
      // Keep the root upright: never rotate the standing silhouette like a plank.
      const knees=ease(Math.min(1,k/.55));
      const slump=ease(Math.max(0,Math.min(1,(k-.3)/.6)));
      p.angle.thigh_near=(side?78:60)*knees;
      p.angle.thigh_far=(side?84:-60)*knees;
      p.angle.shin_near=(side?-158:-145)*knees;
      p.angle.shin_far=(side?-164:145)*knees;
      // Transfer support from the soles to the knees. The old foot-only
      // compensation left both knees suspended in a permanent squat.
      const rad=Math.PI/180;
      const thigh=p.angle.thigh_near*rad,shin=(p.angle.thigh_near+p.angle.shin_near)*rad;
      const soleSupport=144-72*Math.cos(thigh)-72*Math.cos(shin);
      // The painted knee/boot extends below its joint; reserve that volume.
      const kneeSupport=92-72*Math.cos(thigh);
      const contact=ease(Math.max(0,Math.min(1,(k-.25)/.3)));
      p.dy=lerp(soleSupport,kneeSupport,contact);
      p.dx=side?85*slump:-35*out*slump;
      // Once the knees support the body, fold the upper body all the way
      // down. A small frontal tilt leaves a visibly seated, upright corpse.
      // Rotate the spine only; the planted legs never tip with the torso.
      // A profile fold beyond 90 degrees drives the head and held staff
      // through the ground. Keep the chest over the planted knees.
      p.angle.torso=(side?-65:78*out)*slump;
      p.angle.head=(side?-10:12*out)*slump;
      p.angle.arm_near=(side?58:-12*out)*slump;
      p.angle.arm_far=(side?50:10*out)*slump;
      p.hurt=.35*(1-Math.min(1,k*3));
      p.unconscious=k>=.25;
      break;
    }
  }
  return p;
}

// --- baking -------------------------------------------------------------------------------

/** Two fixed-length arm bones. No per-frame scaling or stretched elbows. */
export function aimArm(rig: Rig, view: string, p: Pose, side: "near" | "far", target: Vec, bend: number, wristAngle = 0) {
  const parts = rig.views[view].parts;
  const a = parts[`arm_${side}`], e = parts[`forearm_${side}`], w = parts[`hand_${side}`];
  if (!a || !e || !w) return;
  const [sx, sy] = a.pivot, [ex, ey] = e.pivot, [wx, wy] = w.pivot;
  const l1 = Math.hypot(ex-sx, ey-sy), l2 = Math.hypot(wx-ex, wy-ey);
  const dx = target[0]-sx, dy = target[1]-sy;
  const d = Math.max(Math.abs(l1-l2)+0.01, Math.min(l1+l2-0.01, Math.hypot(dx,dy)));
  const theta = Math.atan2(dy,dx);
  const a1 = theta + bend*Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))));
  const tx = sx+Math.cos(theta)*d, ty=sy+Math.sin(theta)*d;
  const a2 = Math.atan2(ty-sy-Math.sin(a1)*l1, tx-sx-Math.cos(a1)*l1);
  const rest1=Math.atan2(ey-sy,ex-sx), rest2=Math.atan2(wy-ey,wx-ex), deg=180/Math.PI;
  p.angle[`arm_${side}`]=(a1-rest1)*deg;
  p.angle[`forearm_${side}`]=(a2-a1-rest2+rest1)*deg;
  p.angle[`hand_${side}`]=wristAngle-p.angle[`arm_${side}`]-p.angle[`forearm_${side}`];
}

/** Weapon actions add articulated elbows/wrists to the shared body poses. */
export function actionPose(rig: Rig, view: string, anim: AnimName, f: number, n: number, motion = "melee"): Pose {
  const p=poseAt(view,anim,f,n), side=view==="side", sign=view==="back"?-1:1;
  const parts=rig.views[view].parts, near=parts.arm_near.pivot, far=parts.arm_far.pivot;
  const k=f/Math.max(1,n-1), release=8/11;
  const aim=(which:"near"|"far",x:number,y:number,bend:number,angle=0)=>aimArm(rig,view,p,which,[x,y],bend,angle);
  const rest=(which:"near"|"far"):Vec=>which==="near"&&motion==="melee"?[near[0]-(side?46:24*sign),near[1]+(side?65:70)]:which==="near"&&side&&motion!=="unarmed"?[near[0]-46,near[1]+65]:parts[`hand_${which}`]?.pivot ?? parts[`arm_${which}`].pivot;
  const blendAim=(which:"near"|"far",target:Vec,t:number,bend:number,angle=0)=>{
    const r=rest(which),start=which==="near"&&side&&motion!=="unarmed"?(motion==="cast"?-18:motion==="shoot"?-14:-5):0;
    aim(which,lerp(r[0],target[0],t),lerp(r[1],target[1],t),bend,lerp(start,angle,t));
  };
  if(anim==="death") {
    const settle=ease(Math.max(0,Math.min(1,(k-.2)/(motion==="melee"?.5:.7))));
    // Lower the shoulders and fold the elbows as the hands meet the floor.
    // Fully straight hanging arms would penetrate the floor after the fall.
    const fall=ease(Math.max(0,Math.min(1,(k-.3)/.6)));
    p.angle.arm_far=-(p.angle.torso??0)*.55;
    p.angle.forearm_far=(side?10:90*sign)*fall;
    if(motion==="unarmed") {
      p.angle.arm_near=-(p.angle.torso??0)*.6;
      p.angle.forearm_near=(side?15:85*sign)*fall;
    }
    if(motion!=="unarmed") {
      const start=rest("near");
      // Counter the folded torso so the hand hangs below the shoulder,
      // rather than keeping the weapon in a combat-ready chest carry.
      aim("near",lerp(start[0],near[0]+(side?-72:60*sign),settle),lerp(start[1],near[1]+(side?38:85),settle),-1,
        lerp(side?(motion==="cast"?-18:motion==="shoot"?-14:-5):0,side?(motion==="melee"?-175:-18):(motion==="melee"?-240:-130)*sign,settle));
    }
    return p;
  }
  if(anim==="idle"||anim==="walk"||anim==="hit") {
    if(motion==="melee") {
      const carry=rest('near'),sway=anim==='walk'?Math.sin(f/n*Math.PI*2):0;
      aim('near',carry[0]+sway*3,carry[1]+sway*2,side?-1:-sign,side?-5:0);
      return p;
    }
    // Carry in FRONT of the chest/hips. The staff leans away from the face;
    // moving the gripping hand behind the body is not a valid carry pose.
    if(side && motion!=="unarmed") {
      const sway=anim==="walk"?Math.sin(f/n*Math.PI*2)*4:0;
      const carryAngle=motion==="cast"?-18:motion==="shoot"?-14:-5;
      aim("near",near[0]-46+sway,near[1]+65,-1,carryAngle);
    } else if(motion==="cast") aim("near",near[0]-28*sign,near[1]+72,-sign,-12*sign);
    return p;
  }
  if(anim==="attack") {
    if(motion==="punch" || motion==="unarmed") {
      // A worn fist drives forward from the elbow, rather than swinging
      // overhead like a blade. The impact lands on attack's hit frame (4/7).
      const start=rest("near"),impact=4/7;
      const guard:Vec=side?[near[0]-22,near[1]+25]:[near[0]-12*sign,near[1]+35];
      const strike:Vec=side?[near[0]-94,near[1]+12]:[near[0]-36*sign,near[1]+12];
      const a=k<2/7?start:k<=impact?guard:strike;
      const b=k<2/7?guard:k<=impact?strike:start;
      const t=ease(k<2/7?k/(2/7):k<=impact?(k-2/7)/(2/7):(k-impact)/(1-impact));
      const extension=k<=impact?Math.max(0,(k-2/7)/(2/7)):(1-k)/(1-impact);
      aim("near",lerp(a[0],b[0],t),lerp(a[1],b[1],t),-sign,side?lerp(-5,85,extension):0);
      blendAim("far",[far[0]-(side?22:-12*sign),far[1]+35],Math.sin(k*Math.PI),side?-1:sign);
      p.angle.torso=(side?-7:7*sign)*Math.sin(k*Math.PI);
      return p;
    }
    // Reach keyframes keep the wrist attached and return to the actual carry pose.
    const start=rest("near"),up:Vec=side?[near[0]+34,near[1]-29]:[near[0]-20*sign,near[1]-15];
    const strike:Vec=side?[near[0]-76,near[1]+5]:[near[0]+62*sign,near[1]+20];
    const mix=(a:Vec,b:Vec,t:number):Vec=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
    const hand=k<.4?mix(start,up,ease(k/.4)):k<.62?mix(up,strike,ease((k-.4)/.22)):mix(strike,start,ease((k-.62)/.38));
    const resting=side?-5:0,windup=-10*sign,hit=-100*sign;
    const wrist=k<.4?lerp(resting,windup,ease(k/.4)):k<.62?lerp(windup,hit,ease((k-.4)/.22)):lerp(hit,resting,ease((k-.62)/.38));
    aim("near",hand[0],hand[1],side?-1:-sign,wrist);
    p.angle.torso=(side?-5:4*sign)*Math.sin(k*Math.PI);
    return p;
  }
  if(anim==="shoot") {
    p.farArmInFront=true;
    const ready=k<.22?ease(k/.22):k<.84?1:1-ease((k-.84)/.16);
    const pull=k<.22?0:k<release?ease((k-.22)/(release-.22)):0;
    const releaseHand=k<release?pull:Math.max(0,1-(k-release)/.14);
    const bow:Vec=side?[near[0]-82,near[1]+8]:[near[0]-36*sign,near[1]+33];
    const draw:Vec=side?[lerp(near[0]-45,far[0]+8,releaseHand),far[1]+8]:[lerp(near[0]+10*sign,far[0]-14*sign,releaseHand),far[1]+34];
    blendAim("near",bow,ready,side?-1:-sign);
    blendAim("far",draw,ready,side?-1:sign);
    p.angle.thigh_near=(side?8:3*sign)*ready;p.angle.thigh_far=(side?-8:-3*sign)*ready;
    p.bowDraw=pull;
    if(k>=.22&&k<release)p.arrowFlight=-1;
    if(k>=release&&k<.92)p.arrowFlight=(k-release)/(.92-release);
    return p;
  }
  if(anim==="cast") {
    p.farArmInFront=true;
    // Near hand keeps the staff upright; far palm opens, gathers, then pushes outward.
    const gather=k<.3?ease(k/.3):k<release?1:1-ease((k-release)/(1-release));
    const burst=k>=release?Math.max(0,1-(k-release)/.2):0;
    const staff:Vec=[near[0]-(side?46:28*sign),near[1]+(side?65:72)];
    if(motion==="cast") aim("near",staff[0],staff[1],side?-1:-sign,side?-18:-12*sign);
    else if(side&&motion!=="unarmed") aim("near",near[0]-46,near[1]+65,-1,motion==="shoot"?-14:-5);
    const palm:Vec=side?[far[0]-58-burst*20,far[1]+20]:[far[0]+(30+burst*20)*sign,far[1]+20];
    blendAim("far",palm,Math.max(gather,burst),side?-1:sign,side?95:160*sign);
    p.openHands=["hand_far"];
    p.spell=k<release?gather*.65:burst;
    p.angle.head=0; // Do not reintroduce the unwanted tilted resting head.
    return p;
  }
  return p;
}

const ROWS: Dir[] = ["S", "SW", "W", "NW", "N"];

/**
 * Worn items from a look: "itm_1001+5" is an item and its refine (the server
 * marks the weapon's), which makes it glow (ITEM_ART.md §3).
 */
export function looksOf(kit: PaperDollKit, gear: readonly string[]): ItemLook[] {
  return gear.map((entry) => {
    const [id, plus] = entry.split("+"), it = kit.items[id];
    return it && plus ? { ...it, refine: Number(plus) } : it;
  }).filter((it): it is ItemLook => !!it);
}

const boxes = new WeakMap<HTMLImageElement, [number, number, number, number]>();
/** The painted area of a layer (x, y, w, h), for placing sparkles on it. */
function paintedBox(im: HTMLImageElement): [number, number, number, number] {
  let box = boxes.get(im);
  if (!box) {
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(im, 0, 0);
    const a = g.getImageData(0, 0, c.width, c.height).data;
    let l = c.width, t = c.height, r = 0, b = 0;
    for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (a[(y * c.width + x) * 4 + 3] > 40) { l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y); }
    box = r < l ? [0, 0, 0, 0] : [l, t, r - l, b - t];
    boxes.set(im, box);
  }
  return box;
}

/** A refined item's layer: the glow of its +N round it, and sparkles that move from frame to frame. */
function drawGlowing(g: CanvasRenderingContext2D, im: HTMLImageElement, m: DOMMatrix, refine: number, seed: number) {
  const glow = refineGlow(refine)!;
  const color = glow.prism ? `hsl(${(seed * 47) % 360} 100% 72%)` : glow.color;
  const r = 3 + refine * 0.9, pulse = 0.65 + 0.35 * Math.abs(Math.sin(seed * 0.9));
  g.setTransform(m);
  g.save();
  g.globalAlpha = pulse;
  g.filter = `drop-shadow(0 0 ${r}px ${color}) drop-shadow(0 0 ${r / 2}px ${color})`;
  g.drawImage(im, 0, 0);
  g.restore();
  g.drawImage(im, 0, 0);
  if (!glow.spark) return;
  const [bx, by, bw, bh] = paintedBox(im);
  let s = (seed * 2654435761 + refine * 97) >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 2 + Math.floor(refine / 2); i++) {
    const x = bx + rand() * bw, y = by + rand() * bh, size = 3 + rand() * (2 + refine * 0.4);
    g.save(); g.shadowColor = color; g.shadowBlur = 6; g.globalAlpha = 0.6 + rand() * 0.4;
    g.beginPath(); g.moveTo(x, y - size); g.lineTo(x + size * 0.28, y); g.lineTo(x, y + size); g.lineTo(x - size * 0.28, y); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x - size, y); g.lineTo(x, y + size * 0.28); g.lineTo(x + size, y); g.lineTo(x, y - size * 0.28); g.closePath(); g.fill();
    g.restore();
  }
}

function drawCell(g: CanvasRenderingContext2D, kit: PaperDollKit, view: string, pose: Pose, gear: ItemLook[], seed = 0) {
  const { rig } = kit;
  const v = rig.views[view];
  const k = rig.frame / rig.canvas;
  const [fx, fy] = rig.feet;
  // Shift in screen space first, then turn about the feet, so a body lying
  // down (death) can be slid back inside the canvas.
  const root = new DOMMatrix().scale(k, k).translate(pose.dx, pose.dy).translate(fx, fy).rotate(pose.rot).translate(-fx, -fy);
  const memo = new Map<string, DOMMatrix>();
  const matrixOf = (part: string): DOMMatrix => {
    const known = memo.get(part);
    if (known) return known;
    const def = v.parts[part];
    if (!def) return root;
    const parent = def.parent === "root" ? root : matrixOf(def.parent);
    const [px, py] = def.pivot;
    const m = parent.translate(px, py).rotate(pose.angle[part] ?? 0).translate(-px, -py).translate(0, -(pose.lift[part] ?? 0));
    memo.set(part, m);
    return m;
  };
  const hidden = new Set(gear.flatMap((it) => it.hides ?? []));
  const gauntlet = gear.some(it => it.slot === 'weapon' && /gauntlet/.test(it.visual));
  if (gauntlet) hidden.add('hand_near');
  const draw = (file: string, m: DOMMatrix) => {
    const im = kit.img.get(file);
    if (!im) return;
    g.setTransform(m);
    g.drawImage(im, 0, 0);
  };
  const order=[...v.order];
  // Fingers occlude the handle. Drawing the weapon over the fist makes
  // the character appear to hold the guard or glue the blade onto a palm.
  if(weaponMotion(gear)==='melee'&&view!=='back') {
    order.splice(order.indexOf('weapon'),1);
    order.splice(order.indexOf('hand_near'),0,'weapon');
  }
  // Lower robe panels follow the hips, not the chest. Place them over the
  // legs and under the bodice belt, with room for the knees when collapsing.
  if(gear.some(it=>it.layers.includes('skirt')))order.splice(order.indexOf('torso'),0,'skirt');
  if(view==="side"&&pose.farArmInFront) {
    const far=["arm_far","forearm_far","hand_far"];
    for(const part of far){const at=order.indexOf(part);if(at>=0)order.splice(at,1);}
    order.splice(order.indexOf("weapon"),0,...far);
  }
  for (const slot of order) {
    const bone = v.parts[slot] ? slot : rig.attach[slot];
    let m = matrixOf(bone);
    if(slot==='skirt') {
      const fold=Math.max(0,Math.min(1,(Math.abs(pose.angle.thigh_near??0)-35)/25));
      const sway=((pose.angle.thigh_near??0)+(pose.angle.thigh_far??0))*.04;
      m=root.translate(256,294).rotate(view==='side'?fold*45+sway:sway).scale(1,1-fold*.5).translate(-256,-294);
    }
    const variant=slot==="head"&&pose.unconscious?"_unconscious":pose.openHands?.includes(slot)?"_open":"";
    if (v.parts[slot] && !hidden.has(slot)) draw(`base/${view}/${slot}${variant}.png`, m);
    for (const it of gear) if (it.layers.includes(slot)) {
      if (gauntlet && slot === 'hand_near' && it.slot === 'gloves') continue;
      const f = `items/${it.visual}/${view}/${slot}`, file = variant && kit.img.has(f + variant + ".png") ? f + variant + ".png" : f + ".png";
      const im = it.refine ? kit.img.get(file) : undefined;
      // The original starter saber was painted point-down; normalize it
      // to the same forward grip as the imported blade-up sword families.
      const wrist=v.parts.hand_near.pivot;
      const itemMatrix=slot==='weapon'&&it.visual==='copper_saber'
        ?m.translate(wrist[0],wrist[1]+12).rotate(view==='back'?-110:110).translate(-wrist[0],-wrist[1]-12):m;
      if (im) drawGlowing(g, im, itemMatrix, it.refine!, seed); else draw(file, itemMatrix);
    }
  }
  // Native line geometry follows the actual wrist transforms: a bowstring
  // bends to the pulling hand; it is not another stretched painted limb.
  const bow=weaponMotion(gear)==="shoot";
  if(bow && v.parts.hand_near) {
    const [wx,wy]=v.parts.hand_near.pivot, sign=view==="back"?-1:1;
    const hand=matrixOf("hand_near"), other=matrixOf("hand_far");
    const point=(m:DOMMatrix,x:number,y:number)=>new DOMPoint(x,y).matrixTransform(m);
    const top=point(hand,wx+28*sign,wy+10-98), bottom=point(hand,wx+28*sign,wy+10+98);
    const middle=pose.bowDraw!==undefined&&pose.bowDraw>0?point(other,...v.parts.hand_far.pivot):point(hand,wx+28*sign,wy+10);
    g.setTransform(1,0,0,1,0,0);g.strokeStyle="#e9d6ac";g.lineWidth=1;
    g.beginPath();g.moveTo(top.x,top.y);g.lineTo(middle.x,middle.y+((pose.bowDraw??0)>0?5:0));g.lineTo(bottom.x,bottom.y);g.stroke();
    if(pose.arrowFlight!==undefined) {
      const arrow=kit.img.get("effects/arrow.png");
      const step=pose.arrowFlight<0?0:pose.arrowFlight*95;
      const x=middle.x-sign*step, y=middle.y+5;
      if(arrow&&x>65&&x<rig.frame-65){g.save();g.translate(x,y);g.scale(sign,1);g.drawImage(arrow,0,0,120,16,-60,-4,60,8);g.restore();}
    }
  }
  if(pose.spell && v.parts.hand_far) {
    const [x,y]=v.parts.hand_far.pivot;const pt=new DOMPoint(x,y+22).matrixTransform(matrixOf("hand_far"));
    g.setTransform(1,0,0,1,0,0);const r=8+pose.spell*10;
    const halo=g.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,r);
    halo.addColorStop(0,"rgba(226,255,244,.95)");halo.addColorStop(.35,"rgba(96,224,218,.65)");halo.addColorStop(1,"rgba(70,190,212,0)");
    g.fillStyle=halo;g.beginPath();g.arc(pt.x,pt.y,r,0,Math.PI*2);g.fill();
    g.strokeStyle=`rgba(154,242,233,${pose.spell})`;g.lineWidth=1;g.beginPath();g.arc(pt.x,pt.y,r*.7,0,Math.PI*2);g.stroke();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (pose.hurt > 0) {
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = `rgba(255,70,60,${0.45 * pose.hurt})`;
    g.fillRect(0, 0, rig.frame, rig.frame);
    g.globalCompositeOperation = "source-over";
  }
  return Object.fromEntries(Object.entries(v.parts).map(([part,def])=>{
    const pt=new DOMPoint(...def.pivot).matrixTransform(matrixOf(part));return [part,[pt.x,pt.y] as Vec];
  }));
}

/** Same renderer for the artist's pose preview and the live sprite sheets. */
export function renderWayfarerPose(g: CanvasRenderingContext2D, kit: PaperDollKit, view: string, gear: readonly string[], anim: AnimName="idle", frame=0) {
  const looks=looksOf(kit,gear);
  const motion=weaponMotion(looks);
  const action=anim==="attack"&&(motion==="shoot"||motion==="cast")?motion:anim;
  return drawCell(g,kit,view,actionPose(kit.rig,view,action,frame,DOLL_ANIMS[action]!.frames,motion),looks,frame);
}

/** The sprite definition every baked outfit shares. */
export function dollJson(rig: Rig, id = "wayfarer"): SpriteDefJson {
  const k = rig.frame / rig.canvas;
  return {
    id,
    frame: { w: rig.frame, h: rig.frame },
    pivot: { x: Math.round(rig.feet[0] * k), y: Math.round(rig.feet[1] * k) },
    pixelsPerCell: rig.pixelsPerCell,
    rows: ROWS,
    mirror: { NE: "NW", E: "W", SE: "SW" },
    animations: DOLL_ANIMS,
  };
}

/** Bakes the sheets for one outfit (equipped item ids; unknown ids are ignored). */
export function bakeWayfarer(kit: PaperDollKit, gear: readonly string[] = []): SpriteDef {
  const looks = looksOf(kit, gear);
  const motion=weaponMotion(looks);
  const json = dollJson(kit.rig, gear.length ? `wayfarer+${gear.join("+")}` : "wayfarer");
  json.animations={...json.animations};
  if(motion==="shoot"||motion==="cast") json.animations.attack={...DOLL_ANIMS[motion]!};
  const images: Partial<Record<AnimName, HTMLCanvasElement>> = {};
  const F = kit.rig.frame;
  for (const [name, def] of Object.entries(json.animations) as [AnimName, { frames: number }][]) {
    const sheet = document.createElement("canvas");
    sheet.width = F * def.frames;
    sheet.height = F * ROWS.length;
    const g = sheet.getContext("2d")!;
    ROWS.forEach((dir, row) => {
      const view = kit.rig.facings[dir] ?? "front";
      for (let f = 0; f < def.frames; f++) {
        // Each frame on its own canvas so the hurt tint stays inside it.
        const cell = document.createElement("canvas");
        cell.width = cell.height = F;
        const action=name==="attack"&&(motion==="shoot"||motion==="cast")?motion:name;
        drawCell(cell.getContext("2d")!, kit, view, actionPose(kit.rig, view, action, f, def.frames, motion), looks, f + row * 7);
        g.drawImage(cell, f * F, row * F);
      }
    });
    images[name] = sheet;
  }
  return spriteFromImages(json, images);
}

// --- shared kit and outfit cache, for the game -------------------------------------------

let kit: PaperDollKit | null = null;
const baked = new Map<string, SpriteDef>();

export function setPaperDollKit(k: PaperDollKit) {
  kit = k;
  baked.clear();
}

/** The Wayfarer facing the viewer in this outfit, for the Equipment window; false before the kit loads. */
export function drawWayfarerPortrait(canvas: HTMLCanvasElement, gear: readonly string[] = []): boolean {
  if (!kit) return false;
  canvas.width = canvas.height = kit.rig.frame;
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, canvas.width, canvas.height);
  renderWayfarerPose(g, kit, kit.rig.facings.S ?? "front", gear);
  return true;
}

/** The Wayfarer wearing these items (baked once per outfit), or null before the kit loads. */
export function wayfarerSprite(gear: readonly string[] = []): SpriteDef | null {
  if (!kit) return null;
  const key = gear.join("+");
  let s = baked.get(key);
  if (!s) {
    s = bakeWayfarer(kit, gear);
    baked.set(key, s);
  }
  return s;
}
