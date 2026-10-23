// World v3 (WORLD_V3_PLAN.md): one town, ten large fields, five dungeons.
//
// The seven region files still define every monster, material, item, shop,
// recipe, quest and dialogue, and their old maps serve as theme templates
// (ground, border, decoration). This file replaces the world itself: which
// maps exist, how they connect, where each monster lives (zones of 2–10
// levels inside a 192×192 field), and which NPCs remain.
//
// To move a monster, edit the zone lists in FIELDS (by monster name). The
// build and validator check the rest.

import { decodeWalk, type DialogueDef, type ItemDef, type NpcDef, type Rect, type SpawnPocket } from "../src/data/schema";
import { bakeLayout, shapeContains } from "./layout";
import { BOUNTY } from "./model";
import { AFTER_ENDING, DUNGEON_ZONE_NOTE, ECOLOGY, FIELD_CAST, FINAL_QUEST, QUEST_SUMMARY, STORY_STAGES, SURVEY_PAGES, TOWN_CAST } from "./lore";
import type { LinkDesign, MapDesign, RegionDesign } from "./types";

export const HUB = "lum_town_01";
const SIZE = 192;

interface ZoneSpec { name: string; species: string[]; note: string }
interface FieldSpec {
  id: string;
  region: string;
  name: string;
  levels: [number, number];
  zones: ZoneSpec[];
  /** A dungeon entered from this field's highest zone. */
  dungeon?: { id: string; minions: string[] };
  /** A boss that lives in the open, in the highest zone. */
  fieldBoss?: string;
  /** The field's one passive species (model.ts BOUNTY); it must share its zone with a horde. */
  bounty: string;
}

// Zones run from the camp (west edge) round the field: lowest levels nearest the camp.
export const FIELDS: FieldSpec[] = [
  { id: "lum_fld_01", bounty: "Lunari", region: "lum", name: "Dawnmeadow", levels: [1, 10], zones: [
    { name: "Mosskin Meadow", species: ["Mosskin"], note: "Open grass by the camp. The Mosskin herds charge since the Quickening: learn to pull them into one heap." },
    { name: "Sporeling Hollow", species: ["Sporeling", "Ambermite"], note: "A damp hollow where spore clouds and resin mites rush anyone together: the first mixed pack." },
    { name: "Glider Rise", species: ["Lunari", "Craglet"], note: "Upland grass where rock lizards hunt and a few Gorged gliders sit too heavy to fly." },
    { name: "Bramble Mill", species: ["Thornback", "Dustwing"], note: "Brambles round an old mill: boar herds and the dust-moth horde, the field's hardest pulls." },
  ] },
  { id: "lum_fld_02", bounty: "Graftling", region: "lum", name: "Moonbrook Vale", levels: [11, 20], zones: [
    { name: "Brookbed", species: ["Brookfin"], note: "Amphibious fish crawl the shallow banks next to camp and rush anything on two legs: an easy first horde." },
    { name: "Reed Marsh", species: ["Reedstalker", "Graftling"], note: "Reedstalkers spit from the reeds; Gorged Graftlings root among them, slow and rich." },
    { name: "Rotting Rows", species: ["Rotroot", "Mossback Newt"], note: "Rot creeps into the orchard rows from the pump-house below; newts croak their whole bank into a fight." },
    { name: "Sap Groves", species: ["Sapdrone"], note: "Tapped trunks above Hollowroot: drones dive at anyone near the taps." },
  ], dungeon: { id: "lum_dun_01", minions: ["Barkwarden"] } },
  { id: "ver_fld_01", bounty: "Sandcoil", region: "ver", name: "Graftwood Wilds", levels: [21, 30], zones: [
    { name: "Jadewing Glade", species: ["Jadewing Moth", "Barkhound"], note: "Moths shoot from the canopy while bark-plated hound packs rush in." },
    { name: "Trellis Dunes", species: ["Vinecrawler", "Sandcoil"], note: "Where the grafted woods run into sand: vine constructs on the trellises, Gorged Sandcoils basking on the crests." },
    { name: "Press Terraces", species: ["Pruning Tender", "Ochre Jackal"], note: "Gardener machines mend each other at the old presses; jackal packs hunt the terraces." },
    { name: "Glass Burrows", species: ["Thistlehare", "Glass Scarab"], note: "Thistle hares and glass scarabs swarm the fused sand." },
  ] },
  { id: "ver_fld_02", bounty: "Tidehopper", region: "ver", name: "Elderroot Expanse", levels: [31, 40], zones: [
    { name: "Root Ridge", species: ["Root Sentinel", "Brass Kite"], note: "Slow root-laced sentinels on the ridges, brass kites shooting from above." },
    { name: "Antler Glade", species: ["Dune Sentry", "Antlered Engine"], note: "Sandstone sentries under the elder trees; a few Antlered Engines hold the glade." },
    { name: "Spore Drift", species: ["Sporebloat", "Tidehopper"], note: "The Heartwood Engine's spores drift down to a tidal pool: bloated spore-sacs, and Gorged Tidehoppers too full to move." },
    { name: "Basilisk Flats", species: ["Glasstail Basilisk", "Gullwing Skimmer"], note: "Glass-tailed basilisks bask in packs on the flats; skimmers dive from the cliffs." },
    { name: "Coral Steps", species: ["Gnomon Acolyte", "Coral Claw"], note: "Brass acolytes mend the crab packs on the old coral steps; the Heartwood Engine's vents are close." },
  ], dungeon: { id: "ver_dun_01", minions: ["Spore Matron", "Heartwood Pistonguard"] } },
  { id: "sol_fld_01", bounty: "Frost Mite", region: "sol", name: "Saffron Wastes", levels: [41, 50], zones: [
    { name: "Warden Causeway", species: ["Sun Warden", "Polyp Spitter"], note: "Bronze wardens hold the causeway; polyps spit from the old canal." },
    { name: "Canal Shallows", species: ["Canal Strider", "Kelp Tender"], note: "Striders dart along the last water; kelp tenders knit the packs back together." },
    { name: "Frost Seep", species: ["Brine Automaton", "Frost Mite", "Dust Revenant"], note: "A cold seep in the desert: pump constructs, dust revenants, and Gorged Frost Mites feeding on the thaw." },
    { name: "Colossus Sands", species: ["Rimehare", "Sand-buried Colossus"], note: "Rimehares burst from the drifts round three half-buried colossi." },
    { name: "Prism Reach", species: ["Hullborer", "Prism Wisp"], note: "Borers in the old hulls, prism wisps beaming from the mirrors near the Vault." },
  ] },
  { id: "tha_fld_01", bounty: "Pearl Skate", region: "tha", name: "Pearl Coast", levels: [51, 60], zones: [
    { name: "Relay Strand", species: ["Relay Guardian"], note: "Relay Guardians ping the buoy cables by the camp and answer anything that comes close." },
    { name: "Ram Terraces", species: ["Glassback Ram"], note: "Glass-backed ram flocks on the terraces." },
    { name: "Pearl Beds", species: ["Pearl Skate", "Icegear"], note: "Gorged Pearl Skates lie heavy in the pearl mud; gear walkers stalk the frozen pumps." },
    { name: "Turtle Coils", species: ["Thunderhull Turtle", "Frostcoil Serpent"], note: "Turtle herds and the serpent horde in the coil trenches." },
    { name: "Squall Point", species: ["Squall Ray", "Glacier Juggernaut"], note: "Rays ride the gale round the lightning masts; a Glacier Juggernaut guards the way to the Heliostat Vault." },
  ], dungeon: { id: "sol_dun_01", minions: ["Vault Mirrorguard", "Prism Lens-drone"] } },
  { id: "cry_fld_01", bounty: "Hoarfrost Behemoth", region: "cry", name: "Frostfire Divide", levels: [61, 70], zones: [
    { name: "Ash Flats", species: ["Ashcrawler", "Pressure Drone"], note: "Ash grazers and drone swarms where ice meets the first lava, all of them hostile since the Quickening." },
    { name: "Drowned Archive", species: ["Archive Keeper", "Gloom Medusa"], note: "Keepers in a flooded archive wing; medusas heal them." },
    { name: "Slag Mirrors", species: ["Slagback Toad", "Mirrorshade"], note: "Toads in the slag pools under mirror ice; mirrorshades mend them." },
    { name: "Behemoth Ice", species: ["Cinder Imp", "Hoarfrost Behemoth"], note: "Cinder imps swarm round Gorged Hoarfrost Behemoths that keep on grazing." },
    { name: "Sentry Vents", species: ["Cryo Sentry", "Smelt Hound"], note: "Sentries and hound packs at the vents; the Drowned Signalmind surfaces here." },
  ], fieldBoss: "Drowned Signalmind" },
  { id: "emb_fld_01", bounty: "Null Wisp", region: "emb", name: "Cinder Expanse", levels: [71, 80], zones: [
    { name: "Tender Yards", species: ["Crucible Tender"], note: "Repair automata scavenge the yards by the camp and weld anything they find." },
    { name: "Skink Flow", species: ["Vent Skink"], note: "Skinks along the lava channels." },
    { name: "Spitter Vents", species: ["Magma Spitter", "Null Wisp"], note: "Ranged spitters at the vents; Gorged Null Wisps drift through, drinking the light." },
    { name: "Knight's Road", species: ["Furnace Knight", "Gutter Lurk"], note: "Knight patrols and lurk packs on the old road." },
    { name: "Rivet Moraine", species: ["Rivet Scrapling", "Shade Carrier", "Nullbloom"], note: "Scraplings, haulers and blooms on the rivet heaps above the Cryocore Archive." },
  ], dungeon: { id: "cry_dun_01", minions: ["Archive Specter", "Cryo Lancer"] } },
  { id: "noc_fld_01", bounty: "Sparkwing", region: "noc", name: "Veil Rift", levels: [81, 90], zones: [
    { name: "Brute Pens", species: ["Slagforged Brute"], note: "Slag-forged brutes in the pens by the camp." },
    { name: "Coupler Yards", species: ["Coupler Mite", "Lattice Drone"], note: "Mite crews and ranged drones in the rail yards." },
    { name: "Wraith Pour", species: ["Pour Wraith", "Riftling"], note: "Wraiths and the riftling horde along the tear in the Veil." },
    { name: "Stoker Heights", species: ["Zero Stoker", "Sparkwing"], note: "Stokers still feed the fire; Gorged Sparkwings sit charged on the dishes. Kiln Prime walks the heights." },
  ], fieldBoss: "Kiln Prime" },
  { id: "noc_fld_02", bounty: "Array Sentinel", region: "noc", name: "Meridian Gate", levels: [91, 99], zones: [
    { name: "Sentinel Colonnade", species: ["Array Sentinel", "Glyph Swarm"], note: "Glyph swarms drift between the columns round Gorged sentinels, half asleep on their posts." },
    { name: "Glyph Plaza", species: ["Glyph Swarm", "Meridian Executor"], note: "The glyph swarm horde; a court of Executors stands at the plaza's heart." },
    { name: "Lattice Verge", species: ["Glyph Swarm"], note: "Glyphs thicken by the sealed descent to the Lattice Heart." },
  ], dungeon: { id: "noc_dun_01", minions: ["Lattice Weaver"] } },
];

/** Dungeon -> the field whose highest zone holds its entrance (bosses keep their dungeons). */
const DUNGEON_BOSS: Record<string, string> = {
  lum_dun_01: "Hollowroot Warden", ver_dun_01: "Heartwood Regent", sol_dun_01: "Heliostat Sovereign", cry_dun_01: "Cryocore Curator", noc_dun_01: "Lattice Sovereign",
};

// --- field geometry ------------------------------------------------------------------------
//
// A 192×192 field: the camp on the west edge, the zones on a horseshoe round the central
// crossroads (west → north → east → south, rising in level), a ring road joining them, the
// east post on the east edge and the dungeon gate beside the last zone. Each zone owns a
// wedge of the field and its monsters spawn all over it (about three quarters of the map,
// one monster per ~34 walkable cells), RO style: wherever you walk there are monsters.

const CAMP_W: Rect = [4, 84, 20, 20];
const CAMP_E: Rect = [170, 86, 18, 18];
const WEST_TRIGGER: Rect = [0, 93, 3, 7];
const EAST_TRIGGER: Rect = [SIZE - 3, 93, 3, 7];
const WEST_LANDING: [number, number] = [14, 96];
const EAST_LANDING: [number, number] = [180, 98];
const CENTRE: [number, number] = [96, 96];
const RING: [number, number] = [56, 62];
/** No spawns this close to the crossroads. */
const CROSSROADS_CLEAR = 14;
/** Spawn areas are whole blocks of this many cells a side. */
const SPAWN_BLOCK = 8;
/** How far (degrees) the first and last zones reach past their own angle into the
 * south-west gap; the rest of the gap stays empty between the lowest and highest zone. */
const GAP_REACH = 30;
/** Angle (degrees, screen y down) of zone i of n: 180 = west, 270 = north, 360 = east, 450 = south. */
const zoneAngle = (i: number, n: number) => 180 + (270 * i) / (n - 1);
const onRing = (deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [Math.round(CENTRE[0] + RING[0] * Math.cos(a)), Math.round(CENTRE[1] + RING[1] * Math.sin(a))];
};
const FIELD_ALIVE = { min_alive: 550, max_alive: 900 };
const TARGET_TOTAL = 700;

type Lookup = { byName: Map<string, { id: string; archetype: string; level: number; region: string }> };

/** The old field of a region nearest a level: its ground, theme, border and scatter. */
function themeOf(regions: RegionDesign[], region: string, level: number): MapDesign {
  const r = regions.find((x) => x.region.id === region)!;
  const fields = r.maps.filter((m) => m.type === "field");
  return fields.reduce((best, m) => (Math.abs(m.levels[0] - level) < Math.abs(best.levels[0] - level) ? m : best), fields[0]);
}
const themeFrom = (regions: RegionDesign[], f: FieldSpec) => themeOf(regions, f.region, f.levels[0]);

/** npc_<region>_<field name>: ids take letters and underscores only. */
const stem = (f: FieldSpec) => `${f.region}_${f.name.toLowerCase().replace(/[^a-z]+/g, "_")}`;

/** A field's own nudge of the shared zone plan, so no two fields share pocket rects. */
function jitter(f: FieldSpec, i: number): [number, number] {
  let h = 0;
  for (const c of `${f.id}:${i}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return [(h % 13) - 6, ((h >> 8) % 11) - 5];
}

/** Zone centres of a field: on the ring, nudged. */
function zoneCentres(f: FieldSpec): [number, number][] {
  const n = f.zones.length;
  return f.zones.map((_, i) => { const [x, y] = onRing(zoneAngle(i, n)); const [dx, dy] = jitter(f, i); return [x + dx, y + dy] as [number, number]; });
}

/** The dungeon gate east of the last zone, with a small safe yard to land in. */
function gateOf(f: FieldSpec): { trigger: Rect; landing: [number, number]; safe: Rect } {
  const c = zoneCentres(f), last = c[c.length - 1];
  return { trigger: [last[0] + 30, last[1] - 2, 6, 4], landing: [last[0] + 30, last[1] + 8], safe: [last[0] + 22, last[1] - 10, 18, 22] };
}

/** Zone i's wedge round the crossroads (degrees, screen y down, as zoneAngle): halfway to
 * its neighbours, the first and last reaching GAP_REACH into the south-west gap. */
function wedgeOf(i: number, n: number): [number, number] {
  const step = 270 / (n - 1), a = zoneAngle(i, n);
  return [i === 0 ? a - Math.min(GAP_REACH, step / 2) : a - step / 2, i === n - 1 ? a + Math.min(GAP_REACH, step / 2) : a + step / 2];
}

/** Is a point's angle round the crossroads inside a wedge? */
function inWedge(x: number, y: number, [lo, hi]: [number, number]): boolean {
  let a = (Math.atan2(y - CENTRE[1], x - CENTRE[0]) * 180) / Math.PI;
  while (a < lo) a += 360;
  return a < hi;
}

/** A wedge as a polygon reaching past the map edge (for ground patches). */
function wedgePoly([lo, hi]: [number, number]): [number, number][] {
  const pts: [number, number][] = [CENTRE];
  for (let d = lo; d <= hi + 0.01; d += Math.min(10, hi - lo)) {
    const a = (d * Math.PI) / 180;
    pts.push([Math.round(CENTRE[0] + SIZE * Math.cos(a)), Math.round(CENTRE[1] + SIZE * Math.sin(a))]);
  }
  return pts;
}

/** Distance from a point to a polyline. */
function distToLine(x: number, y: number, pts: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

function fieldMap(regions: RegionDesign[], f: FieldSpec, look: Lookup, nextField: FieldSpec | undefined): MapDesign {
  const t = themeFrom(regions, f);
  const n = f.zones.length;
  if (n < 3 || n > 6) throw new Error(`${f.id}: ${n} zones (3-6 supported)`);
  const bountyZone = f.zones.filter((z) => z.species.includes(f.bounty));
  if (bountyZone.length !== 1 || bountyZone[0].species.filter((s) => s !== f.bounty && look.byName.get(s)?.archetype !== "elite").length === 0)
    throw new Error(`${f.id}: bounty ${f.bounty} must live in exactly one zone, beside a horde species`);
  const angles = f.zones.map((_, i) => zoneAngle(i, n));
  const centres = zoneCentres(f);
  const roadKind = t.roads[0]?.kind ?? "dirt";
  const blockerKinds = [...new Set(t.blockers.map((b) => b.kind))].filter((k) => k !== "building" && k !== "fence") as MapDesign["blockers"][number]["kind"][];
  const pockets: SpawnPocket[] = [];
  const mid = (name: string) => look.byName.get(name) ?? (() => { throw new Error(`${f.id}: unknown monster "${name}"`); })();

  const last = centres[n - 1];
  // The world boss stands between the crossroads and the last zone.
  const bossAt: [number, number] = [Math.round(CENTRE[0] + (last[0] - CENTRE[0]) * 0.45), Math.round(CENTRE[1] + (last[1] - CENTRE[1]) * 0.45)];
  const gate = gateOf(f);
  const wedges = f.zones.map((_, i) => wedgeOf(i, n));

  // Each zone's regular species spawn over every whole block of its wedge, clear of the
  // border, the camps, the gate yard, the crossroads and the boss arena, mixed together but
  // each with its own count (a pocket per species on the same rects), so a dead monster
  // respawns as its own kind and farming one species never turns the zone into another.
  // The zone's elites hold a small pocket in the middle.
  const noSpawn: Rect[] = [CAMP_W, CAMP_E, gate.safe, ...(f.fieldBoss ? [[bossAt[0] - 8, bossAt[1] - 7, 16, 14] as Rect] : [])];
  const blockFree = (x: number, y: number) =>
    x >= 6 && y >= 6 && x + SPAWN_BLOCK <= SIZE - 6 && y + SPAWN_BLOCK <= SIZE - 6 &&
    Math.hypot(x + SPAWN_BLOCK / 2 - CENTRE[0], y + SPAWN_BLOCK / 2 - CENTRE[1]) > CROSSROADS_CLEAR + SPAWN_BLOCK / 2 &&
    noSpawn.every(([rx, ry, rw, rh]) => x + SPAWN_BLOCK + 2 <= rx || x - 2 >= rx + rw || y + SPAWN_BLOCK + 2 <= ry || y - 2 >= ry + rh);
  // Each field's block grid is offset its own way, so no two fields share a spawn rect.
  const fi = FIELDS.indexOf(f), gx = fi % SPAWN_BLOCK, gy = Math.floor(fi / SPAWN_BLOCK);
  const zoneRects: Rect[][] = f.zones.map(() => []);
  for (let y = gy; y < SIZE; y += SPAWN_BLOCK) for (let x = gx; x < SIZE; x += SPAWN_BLOCK) {
    if (!blockFree(x, y)) continue;
    const zi = wedges.findIndex((w) => inWedge(x + SPAWN_BLOCK / 2, y + SPAWN_BLOCK / 2, w));
    if (zi >= 0) zoneRects[zi].push([x, y, SPAWN_BLOCK, SPAWN_BLOCK]);
  }
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  f.zones.forEach((z, zi) => {
    const [cx, cy] = centres[zi];
    const regular = z.species.filter((s) => mid(s).archetype !== "elite");
    const elites = z.species.filter((s) => mid(s).archetype === "elite");
    // The bounty keeps a small count; the zone's hordes share the rest of its quota.
    const hasBounty = regular.includes(f.bounty);
    const hordes = regular.length - (hasBounty ? 1 : 0);
    const hordeAlive = Math.round((TARGET_TOTAL / n - (hasBounty ? BOUNTY.alive : 0)) / hordes);
    for (const sp of regular) {
      pockets.push({
        id: regular.length > 1 ? `${slug(z.name)}_${slug(sp)}` : slug(z.name), name: z.name, rects: zoneRects[zi],
        species: [{ monster_id: mid(sp).id, weight: 1 }],
        target_alive: sp === f.bounty ? BOUNTY.alive : hordeAlive, respawn_sec: [6, 14],
        design_note: sp === f.bounty ? `${z.note} Gorged bounty: ${BOUNTY.alive} on the map, ${BOUNTY.hp}x HP, ${BOUNTY.exp}x EXP.` : z.note,
      });
    }
    for (const e of elites) {
      pockets.push({ id: `${slug(z.name)}_${slug(e)}`, name: `${z.name} (${e})`, rects: [[cx - 6, cy - 5, 12, 10]], species: [{ monster_id: mid(e).id, weight: 1 }],
        target_alive: 4, respawn_sec: [45, 90], design_note: `A few ${e} elites hold the middle of ${z.name}.` });
    }
  });
  if (f.fieldBoss) {
    pockets.push({ id: `${slug(f.fieldBoss)}_arena`, name: `${f.fieldBoss}'s Arena`, rects: [[bossAt[0] - 6, bossAt[1] - 5, 12, 10]], species: [{ monster_id: mid(f.fieldBoss).id, weight: 1 }],
      target_alive: 1, respawn_sec: [300, 420], design_note: `${f.fieldBoss} roams the open field here: a world boss for groups.` });
  }

  // Roads: west edge → camp → first zone, the ring through every zone, spokes from the
  // crossroads, the east zone out to the east post, and a spur to the gate.
  const ring: [number, number][] = [];
  for (let deg = angles[0]; deg <= angles[n - 1] + 0.01; deg += 15) ring.push(onRing(deg));
  const roads: MapDesign["roads"] = [
    { points: [[0, CENTRE[1]], WEST_LANDING, centres[0]], width: 4, kind: roadKind },
    { points: ring, width: 4, kind: roadKind },
    ...centres.map((c) => ({ points: [CENTRE, c] as [number, number][], width: 3, kind: roadKind })),
    { points: [CENTRE, WEST_LANDING], width: 3, kind: roadKind },
    { points: [onRing(360), [EAST_LANDING[0], CENTRE[1]], [nextField ? SIZE - 1 : EAST_LANDING[0] + 6, CENTRE[1]]], width: 4, kind: roadKind },
  ];
  if (f.dungeon) roads.push({ points: [last, [gate.landing[0], last[1]], [gate.landing[0], gate.trigger[1] + 2]], width: 4, kind: roadKind });

  // Decoration clusters scattered through the zones, small enough to leave the hordes room,
  // never on a road, a camp, the crossroads, a zone's elite spot or a gate.
  const blockers: MapDesign["blockers"] = [];
  const keepOut: Rect[] = [CAMP_W, CAMP_E, gate.safe, [bossAt[0] - 8, bossAt[1] - 8, 16, 16]];
  const clear = (x: number, y: number, r: number) =>
    centres.every(([zx, zy]) => Math.hypot(zx - x, zy - y) > r + 10) &&
    Math.hypot(x - CENTRE[0], y - CENTRE[1]) > r + CROSSROADS_CLEAR &&
    roads.every((rd) => distToLine(x, y, rd.points) > r + rd.width + 2) &&
    keepOut.every(([rx, ry, rw, rh]) => x + r + 6 < rx || x - r - 6 > rx + rw || y + r + 6 < ry || y - r - 6 > ry + rh) &&
    x - r > 6 && y - r > 6 && x + r < SIZE - 6 && y + r < SIZE - 6;
  // A field-specific grid offset and a hash skip, so fields differ and clusters spread over the whole map.
  const [ox, oy] = jitter(f, 99);
  let k = 0;
  for (let y = 14 + oy; y < SIZE; y += 22) for (let x = 14 + ox + ((Math.round(y / 22) % 2) * 11); x < SIZE; x += 22) {
    const r = 4 + ((x * 7 + y * 13) % 5);
    if (((x * 31 + y * 17 + ox * 7) % 10) < 4 || !clear(x, y, r) || blockers.length >= 28) continue;
    blockers.push({ kind: blockerKinds[k++ % Math.max(1, blockerKinds.length)] ?? "rock", shape: { ellipse: [x, y, r, Math.round(r * 0.8)] } });
  }

  // Each zone wears the ground of the land its monsters come from.
  const ground_patches: NonNullable<MapDesign["ground_patches"]> = [];
  f.zones.forEach((z, zi) => {
    const votes = new Map<string, number>();
    for (const s of z.species) votes.set(mid(s).region, (votes.get(mid(s).region) ?? 0) + 1);
    const origin = [...votes].sort((a, b) => b[1] - a[1] || (a[0] === f.region ? -1 : b[0] === f.region ? 1 : 0))[0][0];
    const g = themeOf(regions, origin, mid(z.species[0]).level).ground;
    if (g !== t.ground) ground_patches.push({ ground: g, shape: { poly: wedgePoly(wedges[zi]) } });
  });

  const landmarks: MapDesign["landmarks"] = [
    { id: `lm_${stem(f)}_camp`, name: "Wayfarer Camp", kind: "camp", x: 12, y: CENTRE[1], note: "Arrival from the west and where the fallen wake; scout, medic and the transit back to Avelorn." },
    { id: `lm_${stem(f)}_crossroads`, name: `${f.name} Crossroads`, kind: "crossroads", x: CENTRE[0], y: CENTRE[1], note: "Roads to every zone meet here." },
    ...f.zones.map((z, i) => {
      const lv = z.species.map((s) => mid(s).level);
      return { id: `lm_${stem(f)}_${z.name.toLowerCase().replace(/[^a-z]+/g, "_")}`, name: z.name, kind: "farm" as const, x: centres[i][0], y: centres[i][1], note: `Lv ${Math.min(...lv)}-${Math.max(...lv)}: ${z.species.filter((s, j, a) => a.indexOf(s) === j).join(", ")}.` };
    }),
    { id: `lm_${stem(f)}_east_camp`, name: "East Post", kind: "camp", x: 180, y: CENTRE[1], note: nextField ? `The road east to ${nextField.name}.` : "The end of the road." },
  ];
  if (f.dungeon) landmarks.push({ id: `lm_${stem(f)}_dungeon_gate`, name: "Dungeon Gate", kind: "gate", x: gate.trigger[0] + 3, y: gate.trigger[1], note: `The way down to the ${DUNGEON_BOSS[f.dungeon.id]}'s dungeon.` });
  if (f.fieldBoss) landmarks.push({ id: `lm_${stem(f)}_boss`, name: `${f.fieldBoss}'s Arena`, kind: "boss_arena", x: bossAt[0], y: bossAt[1], note: "World boss." });

  const props: MapDesign["props"] = [
    { kind: "tent", x: 7, y: 88, block: 2 }, { kind: "lamp_post", x: 21, y: 89, block: 1 }, { kind: "crate", x: 22, y: 101, block: 1 },
    { kind: "rune_stone", x: CENTRE[0] + 5, y: CENTRE[1] + 5, block: 1 },
    { kind: "tent", x: 185, y: 89, block: 2 }, { kind: "lamp_post", x: 173, y: 89, block: 1 },
  ];
  if (f.dungeon) props.push({ kind: "cave_mouth", x: gate.trigger[0] + 3, y: gate.trigger[1] - 3, block: 0, scale: 1.4 });

  const lo = f.levels[0];
  return {
    id: f.id, name: f.name, type: "field",
    role: `${n} zones from Lv ${lo} to ${f.levels[1]}: ${f.zones.map((z) => z.name).join(", ")}.${f.dungeon ? ` Gate to the ${DUNGEON_BOSS[f.dungeon.id]}'s dungeon.` : ""}${f.fieldBoss ? ` World boss: ${f.fieldBoss}.` : ""}`,
    levels: f.levels, size: [SIZE, SIZE], arrival: WEST_LANDING, ground: t.ground, theme: t.theme,
    ...(ground_patches.length ? { ground_patches } : {}),
    border: t.border ? { width: 4, kind: t.border.kind } : { width: 4, kind: "forest" },
    roads, blockers, props,
    scatter: t.scatter.map((s) => ({ kind: s.kind, count: Math.min(240, s.count * 3), block: s.block, scale: s.scale })),
    landmarks, safe_areas: [], camps: f.dungeon ? [CAMP_W, CAMP_E, gate.safe] : [CAMP_W, CAMP_E], horde: FIELD_ALIVE, pockets,
    npcs: [
      { id: `npc_${stem(f)}_scout`, name: FIELD_CAST[f.id].scout.name, title: `${f.name} Scout`, position: [9, 91], facing: "E", role: "scout", dialogue_id: `dlg_${stem(f)}_scout`, shop_id: null },
      { id: `npc_${stem(f)}_medic`, name: FIELD_CAST[f.id].medic.name, title: `${f.name} Medic`, position: [19, 100], facing: "E", role: "healer", dialogue_id: `dlg_${stem(f)}_medic`, shop_id: null },
      { id: `npc_${stem(f)}_transit`, name: FIELD_CAST[f.id].transit.name, title: `${f.name} Transit`, position: [9, 100], facing: "E", role: "teleporter", dialogue_id: `dlg_${stem(f)}_transit`, shop_id: null, destinations: [[HUB, 0]] },
      { id: `npc_${stem(f)}_post`, name: FIELD_CAST[f.id].post.name, title: `${f.name} East Post`, position: [184, 95], facing: "W", role: "teleporter", dialogue_id: `dlg_${stem(f)}_post`, shop_id: null, destinations: [[HUB, 0]] },
    ],
  };
}


function fieldDialogues(f: FieldSpec, look: Lookup, next?: FieldSpec): DialogueDef[] {
  const zoneLine = f.zones.map((z) => {
    const lv = z.species.map((n) => look.byName.get(n)!.level);
    return `${z.name} (Lv ${Math.min(...lv)}-${Math.max(...lv)}): ${[...new Set(z.species)].join(", ")}`;
  }).join(". ");
  const cast = FIELD_CAST[f.id];
  if (!cast) throw new Error(`${f.id}: no camp cast in lore.ts`);
  if (next && !cast.post.lines.some((l) => l.includes(next.name))) throw new Error(`${f.id}: the east post must name ${next.name}`);
  return [
    { id: `dlg_${stem(f)}_scout`, npc_id: `npc_${stem(f)}_scout`, lines: [...cast.scout.lines, `${f.name} runs from Lv ${f.levels[0]} by this camp to Lv ${f.levels[1]} in the east.`, `${zoneLine}.`] },
    { id: `dlg_${stem(f)}_medic`, npc_id: `npc_${stem(f)}_medic`, lines: cast.medic.lines },
    { id: `dlg_${stem(f)}_transit`, npc_id: `npc_${stem(f)}_transit`, lines: cast.transit.lines },
    { id: `dlg_${stem(f)}_post`, npc_id: `npc_${stem(f)}_post`, lines: cast.post.lines },
  ];
}


// --- the world ----------------------------------------------------------------------------

/** Aldric's survey pages are items itm_0950 and up (lore.ts SURVEY_PAGES). */
export const surveyPageId = (i: number) => `itm_${String(950 + i).padStart(4, "0")}`;

/** Rebuilds the seven region designs into the v3 world. */
export function buildWorld(regions: RegionDesign[]): RegionDesign[] {
  const look: Lookup = { byName: new Map() };
  for (const r of regions) for (const m of r.monsters) look.byName.set(m.name, { id: m.id, archetype: m.archetype, level: m.level, region: r.region.id });

  const oldMaps = new Map(regions.flatMap((r) => r.maps.map((m) => [m.id, m] as const)));
  const oldNpcMap = new Map(regions.flatMap((r) => r.maps.flatMap((m) => m.npcs.map((n) => [n.id, m.id] as const))));
  const oldLinks = regions.flatMap((r) => r.links);

  // Maps.
  const newMaps = new Map<string, { design: MapDesign; region: string }>();
  const avelorn = structuredClone(oldMaps.get(HUB)!);
  newMaps.set(HUB, { design: avelorn, region: "lum" });
  FIELDS.forEach((f, i) => newMaps.set(f.id, { design: fieldMap(regions, f, look, FIELDS[i + 1]), region: f.region }));
  const dungeonField = new Map(FIELDS.filter((f) => f.dungeon).map((f) => [f.dungeon!.id, f] as const));
  for (const [did, f] of dungeonField) {
    const d = structuredClone(oldMaps.get(did)!);
    const boss = look.byName.get(DUNGEON_BOSS[did])!;
    const minions = f.dungeon!.minions.map((n) => look.byName.get(n)!.id);
    let mi = 0;
    for (const p of d.pockets) {
      p.design_note = DUNGEON_ZONE_NOTE[`${did}/${p.name}`] ?? (() => { throw new Error(`${did}/${p.name}: no zone note in lore.ts`); })();
      if (p.species.some((s) => s.monster_id === boss.id)) { p.species = [{ monster_id: boss.id, weight: 1 }]; continue; }
      const take = p.species.length > 1 && minions.length > 1 ? minions : [minions[mi++ % minions.length]];
      p.species = take.map((id) => ({ monster_id: id, weight: take.length > 1 ? 50 : 1 }));
    }
    for (const n of d.npcs) if (n.role === "teleporter") n.destinations = [[HUB, 0], [f.id, 0]];
    newMaps.set(did, { design: d, region: did.slice(0, 3) });
  }

  // Avelorn: one transit to every field, the north gate closed, the other towns' traders and craftsmen move in.
  const transit = avelorn.npcs.find((n) => n.role === "teleporter")!;
  transit.destinations = FIELDS.map((f) => [f.id, 10 + 4 * f.levels[0]] as [string, number]);
  const movers = regions.filter((r) => r.region.id !== "lum").flatMap((r) => {
    const town = oldMaps.get(r.region.town_map_id)!;
    return town.npcs.filter((n) => n.role === "merchant" || n.role === "craftsman");
  });
  placeInTown(avelorn, movers);
  avelorn.role = "The one town: services, quest hub, every region's merchants and craftsmen, and paid transit to the camp of every field.";
  for (const lm of avelorn.landmarks) {
    if (lm.id === "lm_avelorn_east_gate") lm.note = `To ${FIELDS[0].name} (Lv${FIELDS[0].levels[0]}-${FIELDS[0].levels[1]}) and on east to every field.`;
    if (lm.id === "lm_avelorn_north_gate") lm.note = "Closed: the north road now runs through the fields.";
    if (lm.id === "lm_avelorn_transit") lm.note = "Paid travel to the camp of any field.";
  }

  // Named people (lore.ts): Avelorn, the market stalls and the dungeon lift keepers.
  for (const { design } of newMaps.values()) for (const n of design.npcs) {
    const who = TOWN_CAST[n.id];
    if (who) Object.assign(n, { name: who.name, title: who.title });
  }

  // Links: Avelorn east gate -> field 1 -> ... -> field 10, and each dungeon from its field.
  const townGate = oldLinks.find((l) => l.a.map === HUB && l.b.map === "lum_fld_01")!.a;
  const links: LinkDesign[] = [{ label: `Avelorn East Gate ⇄ ${FIELDS[0].name}`, a: townGate, b: { map: FIELDS[0].id, trigger: WEST_TRIGGER, landing: WEST_LANDING } }];
  for (let i = 0; i + 1 < FIELDS.length; i++) {
    links.push({ label: `${FIELDS[i].name} ⇄ ${FIELDS[i + 1].name}`, a: { map: FIELDS[i].id, trigger: EAST_TRIGGER, landing: EAST_LANDING }, b: { map: FIELDS[i + 1].id, trigger: WEST_TRIGGER, landing: WEST_LANDING } });
  }
  for (const [did, f] of dungeonField) {
    const old = oldLinks.find((l) => l.a.map === did || l.b.map === did)!;
    const inside = old.a.map === did ? old.a : old.b;
    links.push({ label: `${f.name} ⇄ ${oldMaps.get(did)!.name}`, requirements: old.requirements, a: { map: f.id, trigger: gateOf(f).trigger, landing: gateOf(f).landing }, b: inside });
  }

  // Where each monster lives now, for moving quests.
  const home = new Map<string, string>();
  for (const { design } of newMaps.values()) for (const p of design.pockets) for (const s of p.species) home.set(s.monster_id, design.id);
  const kept = new Set([...newMaps.values()].flatMap(({ design }) => design.npcs.map((n) => n.id)));
  const npcMap = new Map([...newMaps.values()].flatMap(({ design }) => design.npcs.map((n) => [n.id, design.id] as const)));
  const fieldForLevel = (lv: number) => (FIELDS.find((f) => lv >= f.levels[0] && lv <= f.levels[1]) ?? FIELDS[FIELDS.length - 1]).id;
  const newMapFor = (old: string): string => {
    if (newMaps.has(old)) return old;
    const m = oldMaps.get(old);
    if (!m || m.type === "town") return HUB;
    return fieldForLevel(m.levels[0]);
  };
  const dropperHome = new Map<string, string>();
  for (const r of regions) for (const m of r.monsters) for (const it of [m.drops.common, m.drops.uncommon, m.drops.rare]) if (it && home.has(m.id) && !dropperHome.has(it)) dropperHome.set(it, home.get(m.id)!);
  const npcOn = (mapId: string) => {
    const d = newMaps.get(mapId)!.design;
    if (d.type === "town") return "npc_lum_guild_registrar";
    return d.npcs.find((n) => n.role === "scout")?.id ?? d.npcs[0].id;
  };

  const people = new Set([...newMaps.values()].flatMap(({ design }) => design.npcs.map((n) => n.id)));
  const roleOf = new Map([...newMaps.values()].flatMap(({ design }) => design.npcs.map((n) => [n.id, n.role] as const)));
  const bountyIds = new Set(FIELDS.map((f) => look.byName.get(f.bounty)!.id));
  for (const id of Object.keys(STORY_STAGES)) if (!people.has(id)) throw new Error(`lore.ts STORY_STAGES: no NPC ${id} in the world`);
  return regions.map((r) => {
    const quests = r.quests.map((q0) => {
      const q = structuredClone(q0);
      for (const o of q.objectives) if (o.type === "visit") o.map_id = newMapFor(o.map_id);
      const collect = q.objectives.find((o) => o.type === "collect" && dropperHome.has(o.item_id));
      const kill = q.objectives.find((o) => o.type === "kill" && home.has(o.monster_id));
      const visit = q.objectives.find((o) => o.type === "visit");
      const target = collect && collect.type === "collect" ? dropperHome.get(collect.item_id)!
        : kill && kill.type === "kill" ? home.get(kill.monster_id)!
        : visit && visit.type === "visit" ? visit.map_id
        : newMapFor(oldNpcMap.get(q.giver_npc_id) ?? HUB);
      const moveGiver = !kept.has(q.giver_npc_id) || (collect && npcMap.get(q.giver_npc_id) !== target && newMaps.get(npcMap.get(q.giver_npc_id)!)?.design.type !== "town");
      const giver = moveGiver ? npcOn(target) : q.giver_npc_id;
      const turnIn = q.turn_in_npc_id === q0.giver_npc_id ? giver : kept.has(q.turn_in_npc_id) ? q.turn_in_npc_id : "npc_lum_guild_registrar";
      q.summary = QUEST_SUMMARY[q.id] ?? (() => { throw new Error(`${q.id}: no summary in lore.ts`); })();
      // A Gorged bounty takes BOUNTY.hp times the hits: ask for a quarter as many, never
      // more than are alive on the map at once.
      for (const o of q.objectives) if (o.type === "kill" && bountyIds.has(o.monster_id)) o.count = Math.min(BOUNTY.alive, Math.max(5, Math.round(o.count / BOUNTY.hp / 5) * 5));
      // Each chapter's boss quest hands over one of Aldric's survey pages.
      const page = SURVEY_PAGES.findIndex((sp) => sp.quest === q.id);
      if (page >= 0) q.rewards.items.push({ item_id: surveyPageId(page), qty: 1 });
      q.giver_npc_id = giver;
      q.turn_in_npc_id = turnIn;
      return q;
    });
    const maps = [...newMaps.values()].filter((m) => m.region === r.region.id).map((m) => m.design);
    const dungeonOf = (() => {
      const own = maps.find((m) => m.type === "dungeon");
      if (own) return own.id;
      // Regions without a dungeon of their own point at the next one by level.
      return [...dungeonField.keys()].map((id) => oldMaps.get(id)!).sort((a, b) => Math.abs(a.levels[0] - r.region.level_range[1]) - Math.abs(b.levels[0] - r.region.level_range[1]))[0].id;
    })();
    const fieldsHere = FIELDS.filter((f) => f.region === r.region.id);
    const generated = new Set(FIELDS.flatMap((f) => fieldDialogues(f, look).map((d) => d.id)));
    const dialogues = [
      ...r.dialogues.filter((d) => kept.has(d.npc_id) && !generated.has(d.id)).map((d) => (TOWN_CAST[d.npc_id] ? { ...d, lines: TOWN_CAST[d.npc_id].lines } : d)),
      ...fieldsHere.flatMap((f) => fieldDialogues(f, look, FIELDS[FIELDS.indexOf(f) + 1])),
    ].map((d) => {
      // Story stages (lore.ts); a scout keeps its zone guide after them.
      const guide = d.npc_id.endsWith("_scout") ? d.lines.slice(-2) : [];
      const stages = (STORY_STAGES[d.npc_id] ?? []).map((st) => ({ after: st.after, lines: [...st.lines, ...guide] }));
      // Everyone hears how it ended: a line for their role before what they usually say.
      const role = roleOf.get(d.npc_id) as keyof typeof AFTER_ENDING | undefined;
      if (!stages.some((st) => st.after === FINAL_QUEST) && role && AFTER_ENDING[role]) {
        const last = stages.at(-1)?.lines ?? d.lines;
        stages.push({ after: FINAL_QUEST, lines: [AFTER_ENDING[role], ...last.slice(d.npc_id.endsWith("_scout") ? 0 : 1)] });
      }
      return stages.length ? { ...d, stages } : d;
    });
    // Each field's bounty is passive; every other monster attacks on sight.
    const bounties = new Set(FIELDS.map((f) => f.bounty));
    // Their ecology follows (lore.ts ECOLOGY), and the bounties are Gorged.
    const monsters = r.monsters.map((m) => ({
      ...m, ecology: ECOLOGY[m.name] ?? m.ecology,
      ...(bounties.has(m.name) ? { behavior: "passive" as const, bounty: true } : { behavior: "aggressive" as const }),
    }));
    const items = r.region.id === "lum" ? [...r.items, ...SURVEY_PAGES.map((sp, i): ItemDef => ({
      id: surveyPageId(i), name: sp.title, category: "quest", rarity: "rare", sell_price: 0, stack_max: 1, description: sp.text,
    }))] : r.items;
    return {
      ...r,
      items,
      region: { ...r.region, town_map_id: HUB, dungeon_map_id: dungeonOf },
      monsters,
      maps,
      links: r.region.id === "lum" ? links : [],
      quests,
      dialogues,
    };
  });
}

/** Stands the incoming traders round Avelorn's fountain on clear, walkable cells. */
function placeInTown(town: MapDesign, movers: Omit<NpcDef, "map_id">[]) {
  const layout = bakeLayout(town);
  const walk = decodeWalk(layout.walk_rle, layout.width * layout.height);
  const ok = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!walk[(y + dy) * layout.width + (x + dx)]) return false;
    return !town.npcs.some((n) => Math.abs(n.position[0] - x) < 3 && Math.abs(n.position[1] - y) < 3) &&
      !town.blockers.some((b) => shapeContains(b.shape, x, y));
  };
  const [cx, cy] = [60, 60];
  movers.forEach((n, i) => {
    // The free cell nearest a point on a ring round the fountain, spread by index.
    const a = (i / movers.length) * Math.PI * 2 + 0.3;
    const want = [cx + Math.cos(a) * 24, cy + Math.sin(a) * 24];
    let best: [number, number] | null = null, bestD = Infinity;
    for (let y = 5; y < layout.height - 5; y++) for (let x = 5; x < layout.width - 5; x++) {
      const d = Math.hypot(x - want[0], y - want[1]);
      if (d < bestD && ok(x, y)) { best = [x, y]; bestD = d; }
    }
    if (!best) throw new Error(`no room in Avelorn for ${n.id}`);
    town.npcs.push({ ...n, position: best, facing: "S" });
  });
}
