// World v3 (WORLD_V3_PLAN.md): one town, ten large fields, five dungeons.
//
// The seven region files still define every monster, material, item, shop,
// recipe, quest and dialogue, and their old maps serve as theme templates
// (ground, border, decoration). This file replaces the world itself: which
// maps exist, how they connect, where each monster lives (zones of 2–10
// levels inside a 256×256 field), and which NPCs remain.
//
// To move a monster, edit the zone lists in FIELDS (by monster name). The
// build and validator check the rest.

import { decodeWalk, type DialogueDef, type NpcDef, type Rect, type SpawnPocket } from "../src/data/schema";
import { bakeLayout, shapeContains } from "./layout";
import type { LinkDesign, MapDesign, RegionDesign } from "./types";

export const HUB = "lum_town_01";
const SIZE = 256;

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
}

// Zones run from the camp (west edge) round the field: lowest levels nearest the camp.
export const FIELDS: FieldSpec[] = [
  { id: "lum_fld_01", region: "lum", name: "Dawnmeadow", levels: [1, 10], zones: [
    { name: "Mosskin Meadow", species: ["Mosskin"], note: "Open grass by the camp: passive herds to learn movement and the first pull." },
    { name: "Sporeling Hollow", species: ["Sporeling", "Ambermite"], note: "Damp hollow where assisting spores and aggressive mites meet: the first mixed pack." },
    { name: "Glider Rise", species: ["Lunari", "Craglet"], note: "Upland grass: fleeing gliders and the first assisting bruisers." },
    { name: "Bramble Mill", species: ["Thornback", "Dustwing"], note: "Brambles round an old mill: boar herds and the dust-moth horde, the field's hardest pulls." },
  ] },
  { id: "lum_fld_02", region: "lum", name: "Moonbrook Vale", levels: [11, 20], zones: [
    { name: "Brookbed", species: ["Brookfin"], note: "Passive fish on the shallow banks next to camp: an easy first horde." },
    { name: "Reed Marsh", species: ["Reedstalker", "Graftling"], note: "Ranged reeds among passive grafted twigs: pull the spitters into the herd." },
    { name: "Rotting Rows", species: ["Rotroot", "Mossback Newt"], note: "Rot creeps into the orchard rows; newts call their whole bank." },
    { name: "Sap Groves", species: ["Sapdrone"], note: "Tapped trunks above Hollowroot: aggressive drones dive at anyone near the taps." },
  ], dungeon: { id: "lum_dun_01", minions: ["Barkwarden"] } },
  { id: "ver_fld_01", region: "ver", name: "Graftwood Wilds", levels: [21, 30], zones: [
    { name: "Jadewing Glade", species: ["Jadewing Moth", "Barkhound"], note: "Ranged moths over assisting hound packs." },
    { name: "Trellis Dunes", species: ["Vinecrawler", "Sandcoil"], note: "Where the grafted woods run into sand: vine constructs and basking coils." },
    { name: "Press Terraces", species: ["Pruning Tender", "Ochre Jackal"], note: "Gardener constructs mend each other; jackal packs hunt the terraces." },
    { name: "Glass Burrows", species: ["Thistlehare", "Glass Scarab"], note: "Fleeing hares and aggressive glass scarabs on fused sand." },
  ] },
  { id: "ver_fld_02", region: "ver", name: "Elderroot Expanse", levels: [31, 40], zones: [
    { name: "Root Ridge", species: ["Root Sentinel", "Brass Kite"], note: "Slow sentinels on the ridges, brass kites shooting from above." },
    { name: "Antler Glade", species: ["Dune Sentry", "Antlered Engine"], note: "Sandstone sentries under the elder trees; a few Antlered Engines graze the glade." },
    { name: "Spore Drift", species: ["Sporebloat", "Tidehopper"], note: "Spores drift down to a tidal pool: aggressive bloats and passive hoppers." },
    { name: "Basilisk Flats", species: ["Glasstail Basilisk", "Gullwing Skimmer"], note: "Assisting basilisks on the flats, skimmers diving from the cliffs." },
    { name: "Coral Steps", species: ["Gnomon Acolyte", "Coral Claw"], note: "Acolytes heal the crab packs on the old coral steps; the Heartwood Engine's vents are close." },
  ], dungeon: { id: "ver_dun_01", minions: ["Spore Matron", "Heartwood Pistonguard"] } },
  { id: "sol_fld_01", region: "sol", name: "Saffron Wastes", levels: [41, 50], zones: [
    { name: "Warden Causeway", species: ["Sun Warden", "Polyp Spitter"], note: "Bronze wardens on the causeway, polyps spitting from the old canal." },
    { name: "Canal Shallows", species: ["Canal Strider", "Kelp Tender"], note: "Fleeing striders and kelp tenders that knit the packs back together." },
    { name: "Frost Seep", species: ["Brine Automaton", "Frost Mite", "Dust Revenant"], note: "A cold seep in the desert: pump constructs, passive mites and dust revenants." },
    { name: "Colossus Sands", species: ["Rimehare", "Sand-buried Colossus"], note: "Hares herd round three half-buried colossi." },
    { name: "Prism Reach", species: ["Hullborer", "Prism Wisp"], note: "Borers in the old hulls, prism wisps beaming from the mirrors near the Vault." },
  ] },
  { id: "tha_fld_01", region: "tha", name: "Pearl Coast", levels: [51, 60], zones: [
    { name: "Relay Strand", species: ["Relay Guardian"], note: "Assisting guardians on the buoy cables by the camp." },
    { name: "Ram Terraces", species: ["Glassback Ram"], note: "Glass-backed ram flocks on the terraces." },
    { name: "Pearl Beds", species: ["Pearl Skate", "Icegear"], note: "Fleeing skates on the pearl beds, gear walkers at the frozen pumps." },
    { name: "Turtle Coils", species: ["Thunderhull Turtle", "Frostcoil Serpent"], note: "Turtle herds and the serpent horde in the coil trenches." },
    { name: "Squall Point", species: ["Squall Ray", "Glacier Juggernaut"], note: "Ranged rays on the point; a Glacier Juggernaut guards the way to the Heliostat Vault." },
  ], dungeon: { id: "sol_dun_01", minions: ["Vault Mirrorguard", "Prism Lens-drone"] } },
  { id: "cry_fld_01", region: "cry", name: "Frostfire Divide", levels: [61, 70], zones: [
    { name: "Ash Flats", species: ["Ashcrawler", "Pressure Drone"], note: "Passive ash grazers and drone swarms where ice meets the first lava." },
    { name: "Drowned Archive", species: ["Archive Keeper", "Gloom Medusa"], note: "Keepers in a flooded archive wing; medusas heal them." },
    { name: "Slag Mirrors", species: ["Slagback Toad", "Mirrorshade"], note: "Toads in the slag pools under mirror ice; mirrorshades mend them." },
    { name: "Behemoth Ice", species: ["Cinder Imp", "Hoarfrost Behemoth"], note: "Aggressive imps among passive behemoths." },
    { name: "Sentry Vents", species: ["Cryo Sentry", "Smelt Hound"], note: "Sentries and hound packs at the vents; the Drowned Signalmind surfaces here." },
  ], fieldBoss: "Drowned Signalmind" },
  { id: "emb_fld_01", region: "emb", name: "Cinder Expanse", levels: [71, 80], zones: [
    { name: "Tender Yards", species: ["Crucible Tender"], note: "Gardener constructs scavenging the yards by the camp." },
    { name: "Skink Flow", species: ["Vent Skink"], note: "Skinks along the lava channels." },
    { name: "Spitter Vents", species: ["Magma Spitter", "Null Wisp"], note: "Ranged spitters at the vents, passive wisps drifting through." },
    { name: "Knight's Road", species: ["Furnace Knight", "Gutter Lurk"], note: "Knight patrols and lurk packs on the old road." },
    { name: "Rivet Moraine", species: ["Rivet Scrapling", "Shade Carrier", "Nullbloom"], note: "Scraplings, haulers and blooms on the rivet heaps by the Cryocore Archive." },
  ], dungeon: { id: "cry_dun_01", minions: ["Archive Specter", "Cryo Lancer"] } },
  { id: "noc_fld_01", region: "noc", name: "Veil Rift", levels: [81, 90], zones: [
    { name: "Brute Pens", species: ["Slagforged Brute"], note: "Assisting brutes in the pens by the camp." },
    { name: "Coupler Yards", species: ["Coupler Mite", "Lattice Drone"], note: "Mite crews and ranged drones in the rail yards." },
    { name: "Wraith Pour", species: ["Pour Wraith", "Riftling"], note: "Wraiths and the riftling horde along the tear." },
    { name: "Stoker Heights", species: ["Zero Stoker", "Sparkwing"], note: "Stokers and fleeing sparkwings; Kiln Prime walks the heights." },
  ], fieldBoss: "Kiln Prime" },
  { id: "noc_fld_02", region: "noc", name: "Meridian Gate", levels: [91, 99], zones: [
    { name: "Sentinel Colonnade", species: ["Array Sentinel"], note: "Assisting sentinels between the columns." },
    { name: "Glyph Plaza", species: ["Glyph Swarm", "Meridian Executor"], note: "The glyph swarm horde; a court of Executors stands at the plaza's heart." },
    { name: "Lattice Verge", species: ["Glyph Swarm"], note: "A second glyph farm by the sealed descent to the Lattice Heart." },
  ], dungeon: { id: "noc_dun_01", minions: ["Lattice Weaver"] } },
];

/** Dungeon -> the field whose highest zone holds its entrance (bosses keep their dungeons). */
const DUNGEON_BOSS: Record<string, string> = {
  lum_dun_01: "Hollowroot Warden", ver_dun_01: "Heartwood Regent", sol_dun_01: "Heliostat Sovereign", cry_dun_01: "Cryocore Curator", noc_dun_01: "Lattice Sovereign",
};

// --- field geometry ------------------------------------------------------------------------

const CAMP_W: Rect = [6, 116, 26, 24];
const CAMP_E: Rect = [226, 118, 24, 20];
const WEST_TRIGGER: Rect = [0, 125, 3, 7];
const EAST_TRIGGER: Rect = [253, 125, 3, 7];
const WEST_LANDING: [number, number] = [20, 128];
const EAST_LANDING: [number, number] = [238, 132];
const GATE_TRIGGER: Rect = [236, 96, 6, 4];
const GATE_LANDING: [number, number] = [234, 122];
const CENTRE: [number, number] = [128, 128];
const ZONE_CENTRES: Record<number, [number, number][]> = {
  // The west zone keeps clear of the camp (x < 32) even after a field's nudge.
  3: [[76, 128], [128, 52], [180, 128]],
  4: [[76, 128], [128, 202], [128, 54], [180, 128]],
  5: [[76, 128], [108, 204], [108, 52], [196, 200], [196, 58]],
};
// Three pocket rects per zone, round its centre.
const POCKET_OFFSETS: [number, number][] = [[-34, -26], [6, -26], [-14, 4]];
const POCKET_SIZE: [number, number] = [28, 22];
const FIELD_ALIVE = { min_alive: 450, max_alive: 800 };
const TARGET_TOTAL = 600;

type Lookup = { byName: Map<string, { id: string; archetype: string; level: number }> };

function themeFrom(regions: RegionDesign[], f: FieldSpec): MapDesign {
  const r = regions.find((x) => x.region.id === f.region)!;
  const fields = r.maps.filter((m) => m.type === "field");
  return fields.reduce((best, m) => (Math.abs(m.levels[0] - f.levels[0]) < Math.abs(best.levels[0] - f.levels[0]) ? m : best), fields[0]);
}

/** npc_<region>_<field name>: ids take letters and underscores only. */
const stem = (f: FieldSpec) => `${f.region}_${f.name.toLowerCase().replace(/[^a-z]+/g, "_")}`;

/** A field's own nudge of the shared zone plan, so no two fields share pocket rects. */
function jitter(f: FieldSpec, i: number): [number, number] {
  let h = 0;
  for (const c of `${f.id}:${i}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return [(h % 13) - 6, ((h >> 8) % 11) - 5];
}

function fieldMap(regions: RegionDesign[], f: FieldSpec, look: Lookup, nextField: FieldSpec | undefined): MapDesign {
  const t = themeFrom(regions, f);
  const centres = ZONE_CENTRES[f.zones.length]?.map(([x, y], i) => { const [dx, dy] = jitter(f, i); return [x + dx, y + dy] as [number, number]; });
  if (!centres) throw new Error(`${f.id}: ${f.zones.length} zones (3-5 supported)`);
  const roadKind = t.roads[0]?.kind ?? "dirt";
  const blockerKinds = [...new Set(t.blockers.map((b) => b.kind))].filter((k) => k !== "building" && k !== "fence") as MapDesign["blockers"][number]["kind"][];
  const pockets: SpawnPocket[] = [];
  const mid = (name: string) => look.byName.get(name) ?? (() => { throw new Error(`${f.id}: unknown monster "${name}"`); })();

  // Regular species share each zone's three rects; elites get a small pocket of their own.
  const rectsTotal = f.zones.length * POCKET_OFFSETS.length;
  const perRect = Math.round(TARGET_TOTAL / rectsTotal);
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  f.zones.forEach((z, zi) => {
    const [cx, cy] = centres[zi];
    const regular = z.species.filter((n) => mid(n).archetype !== "elite");
    const elites = z.species.filter((n) => mid(n).archetype === "elite");
    POCKET_OFFSETS.forEach(([dx, dy], pi) => {
      const rect: Rect = [cx + dx, cy + dy, POCKET_SIZE[0], POCKET_SIZE[1]];
      // 1 species: all three; 2: one each and a mixed third; 3: one each.
      const names = regular.length === 2 && pi === 2 ? regular : [regular[pi % regular.length]];
      pockets.push({
        id: `${slug(z.name)}_${pi + 1}`, name: z.name, rects: [rect],
        species: names.map((n) => ({ monster_id: mid(n).id, weight: names.length > 1 ? 50 : 1 })),
        target_alive: perRect, respawn_sec: [6, 14], design_note: z.note,
      });
    });
    for (const e of elites) {
      pockets.push({ id: `${slug(z.name)}_${slug(e)}`, name: `${z.name} (${e})`, rects: [[cx - 8, cy + 30, 16, 12]], species: [{ monster_id: mid(e).id, weight: 1 }],
        target_alive: 4, respawn_sec: [45, 90], design_note: `A few ${e} elites hold this part of ${z.name}.` });
    }
  });
  const topZone = f.zones.length - 1;
  if (f.fieldBoss) {
    const [cx, cy] = centres[topZone];
    pockets.push({ id: `${slug(f.fieldBoss)}_arena`, name: `${f.fieldBoss}'s Arena`, rects: [[cx - 7, cy - 46, 14, 12]], species: [{ monster_id: mid(f.fieldBoss).id, weight: 1 }],
      target_alive: 1, respawn_sec: [300, 420], design_note: `${f.fieldBoss} roams the open field here: a world boss for groups.` });
  }

  // Decoration clusters between zones, never on a zone, a camp, the crossroads or a gate.
  const blockers: MapDesign["blockers"] = [];
  const clear = (x: number, y: number, r: number) =>
    centres.every(([zx, zy]) => Math.max(Math.abs(zx - x) - 40, Math.abs(zy - y) - 32) > r + 6) &&
    Math.hypot(x - CENTRE[0], y - CENTRE[1]) > r + 18 &&
    [CAMP_W, CAMP_E, GATE_TRIGGER].every(([rx, ry, rw, rh]) => x + r + 10 < rx || x - r - 10 > rx + rw || y + r + 10 < ry || y - r - 10 > ry + rh) &&
    x - r > 8 && y - r > 8 && x + r < SIZE - 8 && y + r < SIZE - 8;
  let k = 0;
  for (let y = 22; y < SIZE; y += 30) for (let x = 22 + ((y / 30) % 2) * 15; x < SIZE; x += 30) {
    const r = 9 + ((x * 7 + y * 13) % 8);
    if (!clear(x, y, r) || blockers.length >= 16) continue;
    blockers.push({ kind: blockerKinds[k++ % Math.max(1, blockerKinds.length)] ?? "rock", shape: { ellipse: [x, y, r, Math.round(r * 0.8)] } });
  }

  const roads: MapDesign["roads"] = [
    { points: [[0, 128], [20, 128], CENTRE], width: 5, kind: roadKind },
    ...centres.map((c) => ({ points: [CENTRE, c] as [number, number][], width: 4, kind: roadKind })),
  ];
  if (nextField) roads.push({ points: [CENTRE, [236, 128], [255, 128]], width: 5, kind: roadKind });
  else roads.push({ points: [CENTRE, [236, 128]], width: 5, kind: roadKind });
  if (f.dungeon) roads.push({ points: [[236, 128], [239, 100]], width: 4, kind: roadKind });

  const landmarks: MapDesign["landmarks"] = [
    { id: `lm_${stem(f)}_camp`, name: "Wayfarer Camp", kind: "camp", x: 16, y: 128, note: "Arrival from the west; scout, medic and the transit back to Avelorn." },
    { id: `lm_${stem(f)}_crossroads`, name: `${f.name} Crossroads`, kind: "crossroads", x: CENTRE[0], y: CENTRE[1], note: "Roads to every zone meet here." },
    ...f.zones.map((z, i) => {
      const lv = z.species.map((n) => mid(n).level);
      return { id: `lm_${stem(f)}_${z.name.toLowerCase().replace(/[^a-z]+/g, "_")}`, name: z.name, kind: "farm" as const, x: centres[i][0], y: centres[i][1], note: `Lv ${Math.min(...lv)}-${Math.max(...lv)}: ${z.species.filter((n, j, a) => a.indexOf(n) === j).join(", ")}.` };
    }),
    { id: `lm_${stem(f)}_east_camp`, name: "East Post", kind: "camp", x: 238, y: 128, note: nextField ? `The road east to ${nextField.name}.` : "The end of the road." },
  ];
  if (f.dungeon) landmarks.push({ id: `lm_${stem(f)}_dungeon_gate`, name: "Dungeon Gate", kind: "gate", x: 239, y: 98, note: `The way down to the ${DUNGEON_BOSS[f.dungeon.id]}'s dungeon.` });
  if (f.fieldBoss) landmarks.push({ id: `lm_${stem(f)}_boss`, name: `${f.fieldBoss}'s Arena`, kind: "boss_arena", x: centres[topZone][0], y: centres[topZone][1] - 40, note: "World boss." });

  const props: MapDesign["props"] = [
    { kind: "tent", x: 10, y: 120, block: 2 }, { kind: "lamp_post", x: 22, y: 121, block: 1 }, { kind: "crate", x: 26, y: 136, block: 1 },
    { kind: "rune_stone", x: CENTRE[0] + 6, y: CENTRE[1] + 6, block: 1 },
    { kind: "tent", x: 244, y: 120, block: 2 }, { kind: "lamp_post", x: 230, y: 121, block: 1 },
  ];
  if (f.dungeon) props.push({ kind: "cave_mouth", x: 245, y: 96, block: 0, scale: 1.4 });

  const lo = f.levels[0];
  return {
    id: f.id, name: f.name, type: "field",
    role: `${f.zones.length} zones from Lv ${lo} to ${f.levels[1]}: ${f.zones.map((z) => z.name).join(", ")}.${f.dungeon ? ` Gate to the ${DUNGEON_BOSS[f.dungeon.id]}'s dungeon.` : ""}${f.fieldBoss ? ` World boss: ${f.fieldBoss}.` : ""}`,
    levels: f.levels, size: [SIZE, SIZE], arrival: WEST_LANDING, ground: t.ground, theme: t.theme,
    border: t.border ? { width: 4, kind: t.border.kind } : { width: 4, kind: "forest" },
    roads, blockers, props,
    scatter: t.scatter.map((s) => ({ kind: s.kind, count: Math.min(400, s.count * 4), block: s.block, scale: s.scale })),
    landmarks, safe_areas: [CAMP_W, CAMP_E], horde: FIELD_ALIVE, pockets,
    npcs: [
      { id: `npc_${stem(f)}_scout`, name: `${f.name} Scout`, position: [12, 123], facing: "E", role: "scout", dialogue_id: `dlg_${stem(f)}_scout`, shop_id: null },
      { id: `npc_${stem(f)}_medic`, name: `${f.name} Medic`, position: [24, 134], facing: "E", role: "healer", dialogue_id: `dlg_${stem(f)}_medic`, shop_id: null },
      { id: `npc_${stem(f)}_transit`, name: `${f.name} Transit`, position: [12, 134], facing: "E", role: "teleporter", dialogue_id: `dlg_${stem(f)}_transit`, shop_id: null, destinations: [[HUB, 0]] },
      { id: `npc_${stem(f)}_post`, name: `${f.name} East Post`, position: [242, 124], facing: "W", role: "teleporter", dialogue_id: `dlg_${stem(f)}_post`, shop_id: null, destinations: [[HUB, 0]] },
    ],
  };
}

function fieldDialogues(f: FieldSpec, look: Lookup, next?: FieldSpec): DialogueDef[] {
  const zoneLine = f.zones.map((z) => {
    const lv = z.species.map((n) => look.byName.get(n)!.level);
    return `${z.name} (Lv ${Math.min(...lv)}-${Math.max(...lv)}): ${[...new Set(z.species)].join(", ")}`;
  }).join(". ");
  return [
    { id: `dlg_${stem(f)}_scout`, npc_id: `npc_${stem(f)}_scout`, lines: [`${f.name} runs from Lv ${f.levels[0]} by this camp to Lv ${f.levels[1]} in the east.`, `${zoneLine}.`] },
    { id: `dlg_${stem(f)}_medic`, npc_id: `npc_${stem(f)}_medic`, lines: ["Sit a while. Nothing follows you into the camp.", "Drag them as far as you like, but come back breathing."] },
    { id: `dlg_${stem(f)}_transit`, npc_id: `npc_${stem(f)}_transit`, lines: ["Back to Avelorn whenever you want it. The ride is on the Guild."] },
    { id: `dlg_${stem(f)}_post`, npc_id: `npc_${stem(f)}_post`, lines: [next ? `East is ${next.name}, Lv ${next.levels[0]} and up.` : "This is as far as the road goes.", "I can send you back to Avelorn."] },
  ];
}

// --- the world ----------------------------------------------------------------------------

/** Rebuilds the seven region designs into the v3 world. */
export function buildWorld(regions: RegionDesign[]): RegionDesign[] {
  const look: Lookup = { byName: new Map() };
  for (const r of regions) for (const m of r.monsters) look.byName.set(m.name, { id: m.id, archetype: m.archetype, level: m.level });

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
  for (const lm of avelorn.landmarks) {
    if (lm.id === "lm_avelorn_east_gate") lm.note = `To ${FIELDS[0].name} (Lv${FIELDS[0].levels[0]}-${FIELDS[0].levels[1]}) and on east to every field.`;
    if (lm.id === "lm_avelorn_north_gate") lm.note = "Closed: the north road now runs through the fields.";
    if (lm.id === "lm_avelorn_transit") lm.note = "Paid travel to the camp of any field.";
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
    links.push({ label: `${f.name} ⇄ ${oldMaps.get(did)!.name}`, requirements: old.requirements, a: { map: f.id, trigger: GATE_TRIGGER, landing: GATE_LANDING }, b: inside });
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
      ...r.dialogues.filter((d) => kept.has(d.npc_id) && !generated.has(d.id)),
      ...fieldsHere.flatMap((f) => fieldDialogues(f, look, FIELDS[FIELDS.indexOf(f) + 1])),
    ];
    return {
      ...r,
      region: { ...r.region, town_map_id: HUB, dungeon_map_id: dungeonOf },
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
