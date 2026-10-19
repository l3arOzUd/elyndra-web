import type { Dir } from "../shared/dir";
import { spriteFromImages, type AnimName, type SpriteDef, type SpriteDefJson } from "./spriteDef";

// A stand-in Wayfarer, drawn onto canvases in the same sheet format real art
// will use: the frame counts of ASSET_SPEC (idle 4, walk 8, attack 6, hit 3,
// death 6), five drawn facings and three mirrored. Swap in PNG sheets with
// the same JSON and nothing else changes.

const FRAME = 128;
const PIVOT = { x: 64, y: 116 };
const ROWS: Dir[] = ["S", "SW", "W", "NW", "N"];
/** Degrees the figure is turned from facing the viewer, towards screen left. */
const TURN: Record<string, number> = { S: 0, SW: 45, W: 90, NW: 135, N: 180 };

export const HERO_JSON: SpriteDefJson = {
  id: "wayfarer",
  frame: { w: FRAME, h: FRAME },
  pivot: PIVOT,
  pixelsPerCell: 54,
  rows: ROWS,
  mirror: { NE: "NW", E: "W", SE: "SW" },
  animations: {
    idle: { file: "(generated)", frames: 4, fps: 5, loop: true },
    walk: { file: "(generated)", frames: 8, fps: 12, loop: true, refMsPerCell: 150 },
    attack: { file: "(generated)", frames: 6, fps: 14, events: { hit: 3 } },
    hit: { file: "(generated)", frames: 3, fps: 10 },
    death: { file: "(generated)", frames: 6, fps: 9, hold: true },
  },
};

interface Pose {
  bob: number;
  stride: number;
  lean: number;
  sword: number;
  fall: number;
  hurt: number;
}

function pose(anim: AnimName, f: number, n: number): Pose {
  const p: Pose = { bob: 0, stride: 0, lean: 0, sword: 0.5, fall: 0, hurt: 0 };
  const t = f / n;
  switch (anim) {
    case "idle":
      p.bob = Math.sin(t * Math.PI * 2) * 1.2;
      break;
    case "walk":
      p.stride = Math.sin(t * Math.PI * 2);
      p.bob = -Math.abs(Math.cos(t * Math.PI * 2)) * 2.5;
      p.lean = 0.05;
      p.sword = 0.7;
      break;
    case "attack": {
      // Wind up over frames 0-2, strike on 3, follow through.
      const k = f / (n - 1);
      p.sword = k < 0.5 ? -0.6 - k * 3.4 : -2.3 + (k - 0.5) * 7;
      p.lean = k < 0.5 ? -0.08 : 0.16 - (k - 0.5) * 0.2;
      p.stride = k < 0.5 ? 0 : 0.7;
      break;
    }
    case "hit":
      p.lean = -0.22 * (1 - t);
      p.hurt = 1 - t;
      p.sword = 0.9;
      break;
    case "death": {
      const k = f / (n - 1);
      p.fall = Math.min(1, k * 1.15);
      p.hurt = 0.4 * (1 - k);
      p.sword = 1.2;
      break;
    }
  }
  return p;
}

function drawFigure(g: CanvasRenderingContext2D, turnDeg: number, p: Pose) {
  const turn = (turnDeg * Math.PI) / 180;
  const side = Math.sin(turn); // 0 facing viewer or away, 1 in profile (facing screen left)
  const front = Math.cos(turn); // 1 facing the viewer, -1 facing away
  const back = front < -0.2;

  g.save();
  g.translate(PIVOT.x, PIVOT.y);
  // Death: topples backwards and settles on the ground.
  if (p.fall > 0) {
    g.translate(p.fall * 10, -p.fall * 4);
    g.rotate(p.fall * 1.45);
  }
  g.translate(0, p.bob);
  g.rotate(-p.lean * (side > 0.3 ? 1 : 0.4));

  const legGap = 6 * Math.abs(front) + 1;
  const swing = p.stride * 7;
  const legs: [number, number][] = [
    [-legGap - swing * side, -p.stride * 2 * Math.abs(front)],
    [legGap + swing * side, p.stride * 2 * Math.abs(front)],
  ];
  // Legs and boots.
  for (const [lx, lift] of legs) {
    g.fillStyle = "#3a3f5a";
    g.fillRect(lx - 4, -34 + lift, 8, 28);
    g.fillStyle = "#5b3d2a";
    g.fillRect(lx - 5 - side * 2, -8 + lift, 10 + side * 3, 8);
  }

  const swordBehind = back;
  const handX = back ? 15 : -15 + side * 2;
  const drawSword = () => {
    g.save();
    g.translate(handX, -48);
    g.rotate(p.sword * (back ? -1 : 1));
    g.fillStyle = "#c79a3c";
    g.fillRect(-5, -2, 10, 4);
    g.fillStyle = "#e6ebf2";
    g.beginPath();
    g.moveTo(-2, 2);
    g.lineTo(2, 2);
    g.lineTo(1, 32);
    g.lineTo(0, 36);
    g.lineTo(-1, 32);
    g.closePath();
    g.fill();
    g.strokeStyle = "#8a96a8";
    g.lineWidth = 1;
    g.stroke();
    g.restore();
  };
  if (swordBehind) drawSword();

  // Cape: behind the body unless seen from behind.
  const cape = () => {
    g.fillStyle = "#8c2f3c";
    g.beginPath();
    g.moveTo(-13 + side * 10, -64);
    g.lineTo(13 + side * 10, -64);
    g.lineTo(16 + side * 16, -22);
    g.lineTo(-14 + side * 16, -24);
    g.closePath();
    g.fill();
  };
  if (!back) cape();

  // Body.
  const torsoW = 24 - side * 6;
  g.fillStyle = "#2f6f8f";
  g.beginPath();
  g.roundRect(-torsoW / 2, -66, torsoW, 36, 7);
  g.fill();
  g.fillStyle = "#e3c27a";
  g.fillRect(-torsoW / 2, -40, torsoW, 4);
  if (back) cape();

  // Head and hair.
  const hx = -side * 3;
  g.fillStyle = "#f1cba2";
  g.beginPath();
  g.arc(hx, -78, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#6b4426";
  g.beginPath();
  if (back) {
    g.arc(hx, -78, 13.5, 0, Math.PI * 2);
  } else {
    g.arc(hx + side * 4, -81, 13.5, Math.PI * 0.95, Math.PI * 2.05);
  }
  g.fill();
  // Eyes on the side of the head that faces the viewer.
  if (front > -0.2) {
    g.fillStyle = "#1d2433";
    const eyes = side > 0.85 ? [-8] : side > 0.3 ? [-9, -2] : [-5, 5];
    for (const ex of eyes) g.fillRect(hx + ex - 1.5, -79, 3, 4);
  }
  if (!swordBehind) drawSword();
  g.restore();

  if (p.hurt > 0) {
    g.save();
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = `rgba(255,70,60,${0.45 * p.hurt})`;
    g.fillRect(0, 0, FRAME, FRAME);
    g.restore();
  }
}

/** Draws every sheet of the stand-in hero. */
export function buildHeroSprite(): SpriteDef {
  const images: Partial<Record<AnimName, HTMLCanvasElement>> = {};
  for (const [name, def] of Object.entries(HERO_JSON.animations) as [AnimName, { frames: number }][]) {
    const sheet = document.createElement("canvas");
    sheet.width = FRAME * def.frames;
    sheet.height = FRAME * ROWS.length;
    const g = sheet.getContext("2d")!;
    ROWS.forEach((dir, row) => {
      for (let f = 0; f < def.frames; f++) {
        // Each frame on its own canvas so the hurt tint stays inside it.
        const cell = document.createElement("canvas");
        cell.width = cell.height = FRAME;
        drawFigure(cell.getContext("2d")!, TURN[dir], pose(name, f, def.frames));
        g.drawImage(cell, f * FRAME, row * FRAME);
      }
    });
    images[name] = sheet;
  }
  return spriteFromImages(HERO_JSON, images);
}
