// Skill ranks (CHARACTER_SYSTEMS.md §15): every rank of every skill must
// change something the player can read, rank 5 and rank 10 carry their
// upgrades, and the Awakening status follows the sheet.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ClientContent } from "../src/data/content";
import type { SheetMsg } from "../src/net/protocol";
import { awakenStatus, rankLines } from "../src/ui/ranks";

const DATA = join(__dirname, "..", "public", "data");
const json = (f: string) => JSON.parse(readFileSync(join(DATA, f), "utf8"));
const skillList = json("skills.json");
const c = {
  systems: json("systems.json"),
  skills: new Map((Array.isArray(skillList) ? skillList : skillList.skills).map((s: { id: string }) => [s.id, s])),
} as unknown as ClientContent;
const ranked = [...c.skills.values()].filter((s) => s.implemented && c.systems.mastery.awaken[s.id]).map((s) => s.id);

describe("skill ranks", () => {
  it("covers every implemented skill with a rank-5 upgrade, a rank-10 perk and an Awakening", () => {
    expect(ranked.length).toBe(13);
    for (const id of ranked) {
      expect(c.systems.mastery.rank5[id]?.text, id).toBeTruthy();
      expect(c.systems.mastery.perks[id], id).toBeTruthy();
      expect(c.systems.mastery.awaken[id].feat.times, id).toBeGreaterThan(0);
    }
  });

  it("changes something at every rank", () => {
    for (const id of [...ranked, "basic"]) {
      const lines = rankLines(c, id);
      expect(lines).toHaveLength(c.systems.mastery.max_rank);
      for (let i = 1; i < lines.length; i++) expect(lines[i].text, `${id} rank ${i + 1}`).not.toBe(lines[i - 1].text);
      expect(lines[4].special, `${id} rank 5`).toBe("upgrade");
      expect(lines[lines.length - 1].special, `${id} rank 10`).toBe("mastery");
    }
  });

  it("tracks the way to Awakening", () => {
    const sheet = (rank: number, extra: Partial<SheetMsg> = {}) => ({ mastery: { cleaving_arc: [rank, 0, 0] }, ...extra }) as unknown as SheetMsg;
    const need = c.systems.mastery.awaken.cleaving_arc.feat.times;
    expect(awakenStatus(c, sheet(9), "cleaving_arc").state).toBe("locked");
    expect(awakenStatus(c, sheet(10), "cleaving_arc").state).toBe("ready");
    expect(awakenStatus(c, sheet(10, { trials: { cleaving_arc: 3 } }), "cleaving_arc")).toEqual({ state: "trial", progress: 3, need });
    expect(awakenStatus(c, sheet(10, { trials: { cleaving_arc: need } }), "cleaving_arc").state).toBe("complete");
    expect(awakenStatus(c, sheet(10, { awakened: ["cleaving_arc"] }), "cleaving_arc").state).toBe("awakened");
  });
});
