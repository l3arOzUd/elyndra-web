import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { poseAt, type ItemLook, type Rig } from "../src/render/paperDoll";
import type { ItemDef } from "../src/data/schema";

// The Wayfarer kit is edited by hand (rig.json, equipment.json) and by the art
// team (the PNGs); these checks catch the mistakes that would silently drop a
// part or an item from the game.

const KIT = join(__dirname, "..", "public", "sprites", "wayfarer");
const rig = JSON.parse(readFileSync(join(KIT, "rig.json"), "utf8")) as Rig;
const items = (JSON.parse(readFileSync(join(KIT, "equipment.json"), "utf8")) as { items: Record<string, ItemLook> }).items;
const gameItems = new Map((JSON.parse(readFileSync(join(__dirname, "..", "public", "data", "items.json"), "utf8")) as ItemDef[]).map((i) => [i.id, i]));

describe("wayfarer rig", () => {
  const views = Object.entries(rig.views);
  it("has the same parts in every view, each with a known parent", () => {
    const names = Object.keys(views[0][1].parts).sort();
    for (const [view, v] of views) {
      expect(Object.keys(v.parts).sort(), view).toEqual(names);
      for (const [part, def] of Object.entries(v.parts)) {
        expect(def.parent === "root" || def.parent in v.parts, `${view}/${part} parent ${def.parent}`).toBe(true);
        const [x, y] = def.pivot;
        expect(x >= 0 && x <= rig.canvas && y >= 0 && y <= rig.canvas, `${view}/${part} pivot inside canvas`).toBe(true);
      }
    }
  });
  it("draws every part and attachment exactly once per view", () => {
    for (const [view, v] of views) {
      const want = [...Object.keys(v.parts), ...Object.keys(rig.attach)].sort();
      expect([...v.order].sort(), view).toEqual(want);
    }
  });
  it("maps every drawn facing to a view", () => {
    for (const view of Object.values(rig.facings)) expect(view! in rig.views).toBe(true);
  });
});

describe("wayfarer equipment", () => {
  const layerNames = new Set([...Object.keys(Object.values(rig.views)[0].parts), ...Object.keys(rig.attach)]);
  it("lists only equippable game items, in their real slot", () => {
    for (const [id, look] of Object.entries(items)) {
      const it = gameItems.get(id);
      expect(it?.equip, `${id} is not an equippable item`).toBeTruthy();
      expect(look.slot, id).toBe(it!.equip!.slot);
      for (const layer of look.layers) expect(layerNames.has(layer), `${id} layer ${layer}`).toBe(true);
    }
  });
  it("gives every item drawn on the body a look", () => {
    // Charms, Totems and accessories are never drawn.
    for (const it of gameItems.values()) if (it.equip && ["weapon", "armor", "boots", "head"].includes(it.equip.slot)) expect(items[it.id], `${it.name} has no entry in equipment.json`).toBeTruthy();
  });
  it("has a PNG for every base part and item layer in every view", () => {
    const missing: string[] = [];
    for (const [view, v] of Object.entries(rig.views)) {
      for (const part of Object.keys(v.parts)) if (!existsSync(join(KIT, "base", view, `${part}.png`))) missing.push(`base/${view}/${part}`);
      for (const look of Object.values(items)) for (const layer of look.layers) if (!existsSync(join(KIT, "items", look.visual, view, `${layer}.png`))) missing.push(`items/${look.visual}/${view}/${layer}`);
    }
    expect(missing).toEqual([]);
  });
});

describe("wayfarer poses", () => {
  it("raises the weapon arm on the wind-up and lands the strike on the hit frame", () => {
    const n = 8;
    const windup = poseAt("side", "attack", 3, n).angle.arm_near!;
    const strike = poseAt("side", "attack", 4, n).angle.arm_near!;
    expect(windup).toBeLessThan(-90); // arm up and back
    expect(strike).toBeGreaterThan(windup); // swinging forward
  });
  it("ends the death lying down and shifted back over the feet", () => {
    const end = poseAt("front", "death", 7, 8);
    expect(end.rot).toBeGreaterThan(80);
    expect(end.dx).toBeLessThan(-150);
  });
});
