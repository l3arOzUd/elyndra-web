// EMBERFALL — lava, foundries and iron bridges (Lv 60-90).
//
// Follows the Lumeris conventions (content/regions/lum.ts):
//  * Cindervale has the five service NPCs round a real plaza, plus two gate
//    guards; every field has a camp (safe area + scout) at its main entrance
//  * fields climb ~4 levels at a time (60 → 85), Furnace Zero tops it at 90;
//    each field has 3-4 pockets summing to 120-125 alive
//  * every link is two warps with distinct edge triggers and landings 7+
//    cells inside, in a safe camp
//  * species sit where their ecology puts them: grazers on cooled ash, imps
//    and skinks by live lava, constructs in the foundries and on the bridges
//
// Geography (north up):
//
//   Magma Vents ── Ironfall ── Red Crucible
//        │                          │
//   Forge Approach ── Cinder Track  Furnace Zero (below the Crucible)
//        │                │
//   Cindervale ───── Ashfield
//
// Cindervale's East Gate opens on Ashfield; its North Gate is the start of
// the old Forge Approach causeway. The haul road (Cinder Track) loops from
// Ashfield back to the causeway, which climbs to the Vents. The Vents drain
// east into the Ironfall canyon, whose far side is the Red Crucible basin and
// the sealed hatch down to Furnace Zero.

import type { DialogueDef, ItemDef, NpcDef, Prop, QuestDef, RecipeDef } from "../../src/data/schema";
import { expToNext } from "../model";
import type { MapDesign, RegionDesign } from "../types";

const questExp = (level: number, share: number) => Math.round(expToNext(level) * share);

// --- monsters ------------------------------------------------------------------

const LIVING_EMBER = "itm_0236";

const monsters: RegionDesign["monsters"] = [
  {
    id: "mob_0028", name: "Ashcrawler", level: 61, archetype: "swarm", family: "insect", element: "fire", behavior: "passive",
    mods: { hp: 1.05, speed: 1.1 }, why: "Ash-crusted shell (+5% HP), plodding (10% slower). Passive: the grazing herd that welcomes Wayfarers arriving from Crystallis before the region turns hostile.",
    drops: { common: "itm_0055", uncommon: "itm_0056" },
    ecology: "Woodlouse-like grazers that eat the warm ash blown off Emberfall's vents; herds cover the Ashfield flats and ignore anything that leaves them alone.",
    art_brief: "A dog-sized segmented crawler with a grey ash shell, ember light glowing between the plates, soot-black legs; slow and placid.",
  },
  {
    id: "mob_0080", name: "Slagback Toad", level: 63, archetype: "bruiser", family: "amphibian", element: "earth", behavior: "assist",
    mods: { def: 1.3, speed: 1.15, atk: 0.9 }, why: "Slag crust on its back (+30% DEF), squat (15% slower), blunt tongue-lash (-10% ATK). Assist: one croak raises the whole pool. Emberfall's first bruiser, the wall between the passive grazers and the imp hordes.",
    drops: { common: "itm_0220", uncommon: "itm_0221" },
    ecology: "Toads that soak in cooling slag pools; the slag sets on their backs as armour. They crowd the pools of Ashfield and the warm vents round its toppled heat-sink.",
    art_brief: "A boulder-sized toad with a cracked black slag shell on its back, orange heat in the cracks, wide throat sac glowing like a bellows.",
  },
  {
    id: "mob_0029", name: "Cinder Imp", level: 65, archetype: "swarm", family: "elemental", element: "fire", behavior: "aggressive",
    mods: { atk: 1.15, hp: 0.95, speed: 0.85 }, why: "Burns on contact (+15% ATK), brittle charcoal body (-5% HP), skittering (15% faster). The first aggressive horde of Emberfall: imps come to you, so trains build themselves.",
    drops: { common: "itm_0057", uncommon: "itm_0058", rare: LIVING_EMBER },
    ecology: "Sparks that took shape in the Aethrion vents and never cooled; they nest in hot hollows along the haul road and swarm anything that brings fresh air near the coals.",
    art_brief: "A knee-high charcoal imp with a cracked ember belly, flame wisps for horns, long ash-grey fingers; leaves glowing footprints.",
  },
  {
    id: "mob_0030", name: "Smelt Hound", level: 70, archetype: "swarm", family: "construct", element: "fire", behavior: "aggressive",
    mods: { def: 1.3, hp: 1.05, speed: 0.8 }, why: "An iron hunting frame: plated (+30% DEF, +5% HP) and the fastest thing in Emberfall (20% faster). Swarm, not bruiser: the foundries built them in packs to run down escaped slag-beasts.",
    drops: { common: "itm_0059", uncommon: "itm_0060" },
    ecology: "Aethrion foundry hounds still loose from their kennels on the Forge Approach; packs range from the kennel yard along the causeway's lava channels hunting heat.",
    art_brief: "A lean hound of riveted iron plates over a molten core, glowing slag dripping from the jaw, bellows-ribs that pump sparks when it runs.",
  },
  {
    id: "mob_0081", name: "Crucible Tender", level: 71, archetype: "support", family: "construct", element: "fire", behavior: "flee",
    mods: { hp: 0.9, speed: 0.9 }, why: "A spindly maintenance frame (-10% HP) that scuttles away when struck (flee, 10% faster) and keeps welding its neighbours from behind; kill it first or the pack lasts. Teaches target priority in a horde.",
    drops: { common: "itm_0222", uncommon: "itm_0223" },
    ecology: "Repair automata that once tended the forges; they still patch every hound they find, and pick over the slag heaps for scrap to do it with.",
    art_brief: "A four-legged brass spider-frame with a welding arc on one arm and a slag scoop on the other; blue-white arc light, soot-stained lens.",
  },
  {
    id: "mob_0082", name: "Vent Skink", level: 74, archetype: "swarm", family: "reptile", element: "fire", behavior: "aggressive",
    mods: { hp: 1.1, atk: 0.9 }, why: "Basalt scales (+10% HP), a shallow nip (-10% ATK): the dense, durable horde of the Magma Vents, built for long trains rather than burst damage.",
    drops: { common: "itm_0224", uncommon: "itm_0225" },
    ecology: "Lizards that bask on vent rims and dive into the lava to cool off; colonies ring the Vents' magma pool and spill into the ash wash and round the heat-tap drill.",
    art_brief: "A slim lizard with glossy black basalt scales, a glowing orange throat and tail tip, heat shimmer over its back.",
  },
  {
    id: "mob_0083", name: "Magma Spitter", level: 75, archetype: "ranged", family: "annelid", element: "fire", behavior: "aggressive",
    mods: { range: 6, speed: 1.2 }, why: "Lobs magma from 6 cells (+1 range) but drags itself slowly (20% slower): it squats on the lava edge and makes you come to it. Emberfall's ranged lesson, mixed into melee packs.",
    drops: { common: "itm_0226", uncommon: "itm_0227" },
    ecology: "Armoured worms that root in lava fissures and spit what they swallow; they line the Vents' southern fissure and the heat-tap ridge.",
    art_brief: "A thick segmented worm half out of a fissure, a crusted shell collar and a tube mouth dripping magma; dull red with yellow-hot gullet.",
  },
  {
    id: "mob_0031", name: "Furnace Knight", level: 77, archetype: "construct", family: "construct", element: "fire", behavior: "aggressive",
    mods: { atk: 1.1, def: 1.1 }, why: "Ceremonial furnace-plate (+10% DEF) and a heated greatblade (+10% ATK). Aggressive, unlike the assist constructs: knights patrol alone and charge on sight.",
    drops: { common: "itm_0061", uncommon: "itm_0062", rare: LIVING_EMBER, extra: [{ item_id: "itm_0073", rate_bp: 600 }] },
    ecology: "The foundry guard of Aethrion, still marching patrols across Ironfall's fallen trusses and its eastern lava banks. A live furnace burns in each breastplate.",
    art_brief: "A tall armoured automaton whose chest is an open furnace door, riveted iron plate, a long blade glowing at the edge, smoke from the helm vents.",
  },
  {
    id: "mob_0084", name: "Rivet Scrapling", level: 79, archetype: "swarm", family: "construct", element: "earth", behavior: "assist",
    mods: { hp: 0.95, speed: 0.9, attack_speed: 0.9 }, why: "Tiny salvage frames: light (-5% HP), quick (10% faster, 10% quicker strikes). Assist: a struck scrapling rings like a bell and the whole heap answers. Ironfall's signature horde.",
    drops: { common: "itm_0228", uncommon: "itm_0229" },
    ecology: "Scrap-built drones that strip the collapsed bridges of Ironfall for rivets and hoard them in heaps; they swarm the girder fields and the Lower Span approach.",
    art_brief: "A fist-sized rattling bundle of rivets, bolts and a single glowing gear-eye on wire legs; moves in jittering hops.",
  },
  {
    id: "mob_0085", name: "Slagforged Brute", level: 83, archetype: "bruiser", family: "elemental", element: "earth", behavior: "aggressive",
    mods: { hp: 1.15, speed: 1.15 }, why: "Poured from the Crucible's slag (+15% HP) and slow to move (15% slower). Aggressive: the brutes treat the mould yard, the scrap moraine and the Crucible rim as theirs.",
    drops: { common: "itm_0230", uncommon: "itm_0231" },
    ecology: "Slag that set in the Red Crucible's moulds and walked off; brutes stand in the mould yard where they were first cast and roam the scrap moraine and the Crucible rim.",
    art_brief: "A hulking ogre-shape of rough black slag with mould seams down its sides, a molten core showing through cracks, iron bands still on its fists.",
  },
  {
    id: "mob_0086", name: "Pour Wraith", level: 85, archetype: "swarm", family: "elemental", element: "fire", behavior: "aggressive",
    mods: { def: 0.8, atk: 1.1 }, why: "Liquid metal: blows pass through it (-20% DEF) but its touch is molten (+10% ATK). The fast-dying, hard-hitting horde of the Crucible's pour channels and rim.",
    drops: { common: "itm_0232", uncommon: "itm_0233" },
    ecology: "Molten metal that kept its shape after the last pour; wraiths drift along the pour channels of the Red Crucible and spill over its rim.",
    art_brief: "A dripping humanoid of white-hot liquid metal with no face, trailing a cooling grey skin that cracks and re-melts; a mould seam down its middle.",
  },
  {
    id: "mob_0087", name: "Zero Stoker", level: 88, archetype: "construct", family: "construct", element: "fire", behavior: "assist",
    mods: { hp: 1.1, attack_speed: 1.1 }, why: "Heavy coal-feeding automata (+10% HP) with slow shovel swings (10% slower attacks). Assist: Furnace Zero's halls answer as one, the dungeon's construct wall before the core.",
    drops: { common: "itm_0234", uncommon: "itm_0235", rare: LIVING_EMBER, extra: [{ item_id: "itm_0073", rate_bp: 800 }] },
    ecology: "The stokers of the first Aethrion furnace, still shovelling into a fire that no longer needs feeding. They work Furnace Zero's stoker halls, coal pens and pour gallery.",
    art_brief: "A broad-shouldered iron automaton with a shovel for one arm and a coal hopper on its back, firebox glow behind a grille face.",
  },
  {
    id: "mob_0088", name: "Kiln Prime", level: 90, archetype: "boss", family: "construct", element: "fire", behavior: "aggressive",
    drops: { common: "itm_0234", uncommon: "itm_0233", rare: "itm_0237", extra: [{ item_id: LIVING_EMBER, rate_bp: 10000, qty: [1, 2] }, { item_id: "itm_0073", rate_bp: 10000, qty: [3, 5] }] },
    ecology: "The governing intelligence of Furnace Zero, the first furnace of Aethrion. Since the Sundering it has run the whole of Emberfall's foundry as one body: every hound, knight and stoker answers to it from the Zero Core.",
    art_brief: "A colossal kiln-shaped automaton rising from the core floor, crucible arms that pour molten metal, a white-hot Aetherite heart behind a lattice grille.",
  },
];

// --- items -----------------------------------------------------------------------

const materials: RegionDesign["materials"] = [
  { id: "itm_0055", name: "Ashcrawler Fragment", level: 61, tier: "common", description: "A plate of ash-crusted Ashcrawler shell, still warm." },
  { id: "itm_0056", name: "Ashcrawler Core", level: 61, tier: "uncommon", description: "The ember that glows between an Ashcrawler's plates; it never quite goes out." },
  { id: "itm_0057", name: "Cinder Imp Fragment", level: 65, tier: "common", description: "A chunk of charcoal body from a Cinder Imp." },
  { id: "itm_0058", name: "Cinder Imp Core", level: 65, tier: "uncommon", description: "The hot coal at a Cinder Imp's heart. Wrap it before pocketing it." },
  { id: "itm_0059", name: "Smelt Hound Fragment", level: 70, tier: "common", description: "A riveted iron plate from a Smelt Hound's flank." },
  { id: "itm_0060", name: "Smelt Hound Core", level: 70, tier: "uncommon", description: "A Smelt Hound's molten core in its ceramic housing." },
  { id: "itm_0061", name: "Furnace Knight Fragment", level: 77, tier: "common", description: "A scorched plate of Furnace Knight armour." },
  { id: "itm_0062", name: "Furnace Knight Core", level: 77, tier: "uncommon", description: "The firebox regulator from a Furnace Knight's breastplate." },
  { id: "itm_0220", name: "Slagback Wart", level: 63, tier: "common", description: "A knob of slag broken off a Slagback Toad's back." },
  { id: "itm_0221", name: "Slagback Furnace-Gland", level: 63, tier: "uncommon", description: "The heat gland in a Slagback's throat; herbalists brew it into tonics." },
  { id: "itm_0222", name: "Tender Weld-Bead", level: 71, tier: "common", description: "A bead of weld metal from a Crucible Tender's arc arm." },
  { id: "itm_0223", name: "Tender Arc Nozzle", level: 71, tier: "uncommon", description: "A working Aethrion welding nozzle." },
  { id: "itm_0224", name: "Skink Basalt Scale", level: 74, tier: "common", description: "A glossy black scale from a Vent Skink." },
  { id: "itm_0225", name: "Skink Vent Bladder", level: 74, tier: "uncommon", description: "The gas bladder a Vent Skink uses to dive into lava. Cool and blue inside." },
  { id: "itm_0226", name: "Spitter Pumice", level: 75, tier: "common", description: "Light frothy stone a Magma Spitter coughs up." },
  { id: "itm_0227", name: "Spitter Magma Crop", level: 75, tier: "uncommon", description: "The heat-proof crop where a Spitter stores its magma." },
  { id: "itm_0228", name: "Scrapling Rivet", level: 79, tier: "common", description: "An Aethrion bridge rivet, carried off by a Rivet Scrapling." },
  { id: "itm_0229", name: "Scrapling Gear-Eye", level: 79, tier: "uncommon", description: "The single glowing gear that serves a Scrapling as an eye." },
  { id: "itm_0230", name: "Brute Slag Plate", level: 83, tier: "common", description: "A slab of set slag from a Slagforged Brute." },
  { id: "itm_0231", name: "Brute Mould Seam", level: 83, tier: "uncommon", description: "The seam line where a Brute left its mould, dense as iron." },
  { id: "itm_0232", name: "Wraith Cooled Pour", level: 85, tier: "common", description: "Metal that cooled the moment a Pour Wraith died." },
  { id: "itm_0233", name: "Wraith Mould-Core", level: 85, tier: "uncommon", description: "The still-liquid centre of a Pour Wraith, sealed in its own skin." },
  { id: "itm_0234", name: "Stoker Coal", level: 88, tier: "common", description: "Dense Aethrion coke from a Zero Stoker's hopper." },
  { id: "itm_0235", name: "Stoker Firebox", level: 88, tier: "uncommon", description: "A Zero Stoker's grille-faced firebox." },
  { id: "itm_0236", name: "Living Ember", level: 77, tier: "rare", description: "An ember that keeps itself alight, born where Furnace Zero's fire runs through Emberfall. Imps carry them; knights and stokers burn on them." },
  { id: "itm_0237", name: "Zero Heartcore", level: 90, tier: "rare", description: "A shard of Kiln Prime's Aetherite heart, still white-hot." },
];

/** Emberfall adds no new non-material items: its shop and recipes reuse the Lumeris consumables. */
const items: ItemDef[] = [];

// Crafting turns surplus field materials into supplies cheaper than the shop
// (shop prices here are 6x Lumeris). Inputs always sell for more than the
// output, so crafting is never a money printer.
const recipes: RecipeDef[] = [
  { id: "rcp_emb_ash_ration", npc_id: "npc_emb_craftsman", output: { item_id: "itm_0075", qty: 10 }, inputs: [{ item_id: "itm_0055", qty: 3 }], currency: 60 },
  { id: "rcp_emb_gland_tonic", npc_id: "npc_emb_craftsman", output: { item_id: "itm_0076", qty: 8 }, inputs: [{ item_id: "itm_0221", qty: 1 }, { item_id: "itm_0220", qty: 2 }], currency: 120 },
  { id: "rcp_emb_bladder_focus", npc_id: "npc_emb_craftsman", output: { item_id: "itm_0077", qty: 8 }, inputs: [{ item_id: "itm_0225", qty: 1 }, { item_id: "itm_0222", qty: 2 }], currency: 150 },
];

// --- quests: a chain that walks the player through every map in level order ------

const R = "npc_emb_guild_registrar";
const quests: QuestDef[] = [
  { id: "q_emb_intro", title: "Emberfall: First Survey", region_id: "emb", giver_npc_id: R, turn_in_npc_id: R, min_level: 60, prerequisite: null,
    objectives: [{ type: "kill", monster_id: "mob_0028", count: 60 }],
    rewards: { base_exp: questExp(60, 0.6), currency: 1800, items: [{ item_id: "itm_0075", qty: 15 }] },
    summary: "Thin the Ashcrawler herds on the Ashfield flats. A gentle first train for Wayfarers fresh from Crystallis." },
  { id: "q_emb_slag_pools", title: "Croaks in the Slag", region_id: "emb", giver_npc_id: "npc_emb_ashfield_scout", turn_in_npc_id: "npc_emb_ashfield_scout", min_level: 62, prerequisite: "q_emb_intro",
    objectives: [{ type: "kill", monster_id: "mob_0080", count: 50 }, { type: "collect", item_id: "itm_0220", count: 10 }],
    rewards: { base_exp: questExp(62, 0.5), currency: 2400, items: [{ item_id: "itm_0076", qty: 8 }] },
    summary: "Break the assisting Slagback pools; the warts point the player at the Artificer's tonic recipe." },
  { id: "q_emb_cinder_track", title: "Imps on the Haul Road", region_id: "emb", giver_npc_id: "npc_emb_cinder_track_scout", turn_in_npc_id: "npc_emb_cinder_track_scout", min_level: 64, prerequisite: "q_emb_slag_pools",
    objectives: [{ type: "visit", map_id: "emb_fld_02", count: 1 }, { type: "kill", monster_id: "mob_0029", count: 150 }],
    rewards: { base_exp: questExp(64, 0.45), currency: 3000, items: [{ item_id: "itm_0077", qty: 8 }] },
    summary: "The first aggressive horde of the region: 150 imps is three full trains through the hollows." },
  { id: "q_emb_forge_approach", title: "Kennels of the Cold Forges", region_id: "emb", giver_npc_id: "npc_emb_forge_scout", turn_in_npc_id: "npc_emb_forge_scout", min_level: 68, prerequisite: "q_emb_cinder_track",
    objectives: [{ type: "kill", monster_id: "mob_0030", count: 150 }, { type: "kill", monster_id: "mob_0081", count: 40 }],
    rewards: { base_exp: questExp(68, 0.45), currency: 3600, items: [{ item_id: "itm_0076", qty: 10 }] },
    summary: "Hounds are fast and Tenders flee to keep welding them: teaches killing the support first." },
  { id: "q_emb_magma_vents", title: "Vent Census", region_id: "emb", giver_npc_id: "npc_emb_magma_scout", turn_in_npc_id: "npc_emb_magma_scout", min_level: 72, prerequisite: "q_emb_forge_approach",
    objectives: [{ type: "kill", monster_id: "mob_0082", count: 150 }, { type: "kill", monster_id: "mob_0083", count: 60 }],
    rewards: { base_exp: questExp(72, 0.4), currency: 4200, items: [{ item_id: "itm_0077", qty: 10 }] },
    summary: "Skink trains round the vent pool, then pull the ranged Spitters off the fissure edge." },
  { id: "q_emb_ironfall", title: "The Fallen Span", region_id: "emb", giver_npc_id: "npc_emb_ironfall_scout", turn_in_npc_id: "npc_emb_ironfall_scout", min_level: 76, prerequisite: "q_emb_magma_vents",
    objectives: [{ type: "kill", monster_id: "mob_0031", count: 60 }, { type: "collect", item_id: "itm_0228", count: 20 }],
    rewards: { base_exp: questExp(76, 0.4), currency: 5000, items: [{ item_id: LIVING_EMBER, qty: 1 }] },
    summary: "Break the Furnace Knight patrols and recover the rivets the Scraplings stole from the bridges." },
  { id: "q_emb_red_crucible", title: "The Red Pour", region_id: "emb", giver_npc_id: "npc_emb_crucible_medic", turn_in_npc_id: "npc_emb_crucible_medic", min_level: 80, prerequisite: "q_emb_ironfall",
    objectives: [{ type: "kill", monster_id: "mob_0086", count: 150 }, { type: "kill", monster_id: "mob_0085", count: 40 }],
    rewards: { base_exp: questExp(80, 0.4), currency: 6000, items: [{ item_id: "itm_0076", qty: 12 }] },
    summary: "Clear the pour channels and the mould yard. Leads to the hatch down to Furnace Zero." },
  { id: "q_emb_furnace_zero", title: "Furnace Zero", region_id: "emb", giver_npc_id: "npc_emb_crucible_medic", turn_in_npc_id: R, min_level: 85, prerequisite: "q_emb_red_crucible",
    objectives: [{ type: "kill", monster_id: "mob_0088", count: 1 }],
    rewards: { base_exp: questExp(85, 0.8), currency: 12000, items: [{ item_id: LIVING_EMBER, qty: 2 }, { item_id: "itm_0076", qty: 12 }] },
    summary: "Shut down Kiln Prime in the Zero Core and report to Cindervale. Opens the road to Nocthaven." },
];

// --- maps --------------------------------------------------------------------------

const npc = (id: string, name: string, position: [number, number], facing: NpcDef["facing"], role: NpcDef["role"], extra: Partial<NpcDef> = {}): Omit<NpcDef, "map_id"> =>
  ({ id, name, position, facing, role, dialogue_id: id.replace(/^npc_/, "dlg_"), shop_id: null, ...extra });

const fieldCost = (minLevel: number) => 10 + 4 * minLevel;
/** Capital-to-capital transit, priced on the destination region's starting level. */
const capitalCost = (destMinLevel: number) => 300 + 15 * destMinLevel;

const cindervale: MapDesign = {
  id: "emb_town_01", name: "Cindervale", type: "town", role: "Region capital: services, quest hub, crafting, transit to Emberfall fields, Vaelspire and Umbracrest.",
  levels: [60, 90], size: [144, 136], arrival: [68, 77], ground: "stone", theme: "a basalt foundry town on an island in a cooled lava lake, round an ever-burning Aethrion hearth",
  border: { width: 4, kind: "lava" },
  roads: [
    { points: [[68, 70], [110, 70], [143, 72]], width: 5, kind: "stone" },
    { points: [[68, 70], [68, 40], [62, 20], [62, 0]], width: 5, kind: "stone" },
    { points: [[68, 70], [36, 72], [26, 88]], width: 3, kind: "stone" },
    { points: [[68, 70], [74, 96], [74, 114]], width: 3, kind: "stone" },
    // Iron bridges: over the town's lava moat at both gates and over the slag canal.
    { points: [[134, 72], [143, 72]], width: 5, kind: "bridge" },
    { points: [[62, 8], [62, 0]], width: 5, kind: "bridge" },
    { points: [[101, 70], [111, 70]], width: 5, kind: "bridge" },
  ],
  blockers: [
    { kind: "building", shape: { rect: [74, 28, 24, 14] } }, // Guild Hall
    { kind: "building", shape: { rect: [36, 50, 14, 10] } }, // Medic house
    { kind: "building", shape: { rect: [80, 98, 18, 12] } }, // Artificer's foundry
    { kind: "building", shape: { rect: [16, 16, 14, 10] } },
    { kind: "building", shape: { rect: [40, 14, 12, 10] } },
    { kind: "building", shape: { rect: [112, 24, 16, 12] } },
    { kind: "building", shape: { rect: [14, 100, 14, 12] } },
    { kind: "building", shape: { rect: [44, 112, 14, 10] } },
    { kind: "building", shape: { rect: [116, 84, 14, 8] } },
    { kind: "lava", shape: { rect: [104, 48, 4, 42] } }, // slag canal, bridged by the east road
    { kind: "lava", shape: { ellipse: [112, 110, 14, 9] } }, // cooling pool
  ],
  props: [
    { kind: "furnace", x: 68, y: 70, block: 3, scale: 1.6 }, // the Ever-Hearth
    { kind: "aether_pylon", x: 60, y: 62, block: 1 }, { kind: "aether_pylon", x: 76, y: 62, block: 1 },
    { kind: "aether_pylon", x: 60, y: 79, block: 1 }, { kind: "aether_pylon", x: 77, y: 79, block: 1 },
    { kind: "hall", x: 86, y: 35, block: 0, scale: 1.4 },
    { kind: "market_stall", x: 82, y: 62, block: 2 }, { kind: "market_stall", x: 88, y: 62, block: 2 }, { kind: "market_stall", x: 94, y: 62, block: 2 },
    { kind: "transit_gate", x: 24, y: 92, block: 3 },
    { kind: "workshop", x: 89, y: 104, block: 0 },
    { kind: "anvil", x: 84, y: 94, block: 1 }, { kind: "furnace", x: 90, y: 94, block: 2 },
    { kind: "statue", x: 58, y: 54, block: 2 },
    { kind: "brass_pipe", x: 106, y: 46, block: 0 }, { kind: "brass_pipe", x: 106, y: 92, block: 0 },
    { kind: "gear_ruin", x: 124, y: 104, block: 0 },
    { kind: "lamp_post", x: 72, y: 66, block: 1 }, { kind: "lamp_post", x: 98, y: 67, block: 1 }, { kind: "lamp_post", x: 122, y: 67, block: 1 },
    { kind: "lamp_post", x: 65, y: 30, block: 1 }, { kind: "lamp_post", x: 65, y: 14, block: 1 },
    { kind: "crate", x: 98, y: 60, block: 1 }, { kind: "crate", x: 99, y: 61, block: 1 },
  ],
  scatter: [
    { kind: "boulder", count: 24, block: 1, scale: [0.8, 1.3] },
    { kind: "dead_tree", count: 18, block: 1, scale: [0.8, 1.1] },
    { kind: "rock", count: 30, block: 0, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_emb_hearth", name: "The Ever-Hearth", kind: "plaza", x: 68, y: 70, note: "Respawn point; an Aethrion hearth that has burned since before the Sundering. The services face it." },
    { id: "lm_emb_guild", name: "Wayfarer Guild, Cindervale Hall", kind: "plaza", x: 86, y: 35, note: "Quest hub." },
    { id: "lm_emb_east_gate", name: "East Gate Bridge", kind: "gate", x: 138, y: 72, note: "Iron bridge over the moat to Ashfield (Lv60-64)." },
    { id: "lm_emb_north_gate", name: "North Gate Bridge", kind: "gate", x: 62, y: 5, note: "To the Forge Approach causeway (Lv68-72)." },
    { id: "lm_emb_transit", name: "Transit Station", kind: "plaza", x: 24, y: 92, note: "Paid travel to field camps, Vaelspire and Umbracrest." },
    { id: "lm_emb_foundry", name: "Artificer's Foundry", kind: "plaza", x: 89, y: 104, note: "Turns field materials into supplies." },
    { id: "lm_emb_canal", name: "Slag Canal", kind: "crossroads", x: 106, y: 70, note: "The east road crosses the canal on an iron bridge." },
  ],
  safe_areas: [[0, 0, 144, 136]],
  pockets: [],
  npcs: [
    npc("npc_emb_guild_registrar", "Cindervale Guild Registrar", [86, 44], "S", "guild_registrar"),
    npc("npc_emb_merchant", "Cindervale Supply Merchant", [88, 66], "N", "merchant", { shop_id: "shop_emb_supply" }),
    npc("npc_emb_healer", "Cindervale Field Medic", [44, 62], "E", "healer"),
    npc("npc_emb_teleporter", "Cindervale Transit Operator", [30, 88], "SW", "teleporter", {
      destinations: [
        ["emb_fld_01", fieldCost(60)], ["emb_fld_02", fieldCost(64)], ["emb_fld_03", fieldCost(68)],
        ["emb_fld_04", fieldCost(72)], ["emb_fld_05", fieldCost(76)], ["emb_fld_06", fieldCost(80)],
        ["cry_town_01", capitalCost(45)], ["noc_town_01", capitalCost(75)],
      ],
    }),
    npc("npc_emb_craftsman", "Cindervale Artificer", [79, 94], "NW", "craftsman"),
    npc("npc_emb_east_gate_guard", "East Bridge Warden", [128, 66], "W", "guard"),
    npc("npc_emb_north_gate_guard", "North Bridge Warden", [57, 12], "S", "guard"),
  ],
};

const ashfield: MapDesign = {
  id: "emb_fld_01", name: "Ashfield", type: "field", role: "First field: passive grazers on open ash and the crust ridge, assisting slag toads in the pools and round the heat-sink vents; the warm-up from Crystallis.",
  levels: [60, 64], size: [136, 112], arrival: [10, 60], ground: "ash", theme: "grey ash plains over a cooled lava sheet, steaming vents and toppled Aethrion heat-sinks",
  border: { width: 4, kind: "rock" },
  roads: [
    { points: [[0, 60], [24, 60], [50, 56], [70, 62]], width: 4, kind: "dirt" },
    { points: [[70, 62], [88, 42], [96, 22], [96, 0]], width: 4, kind: "dirt" },
    { points: [[70, 62], [98, 72], [116, 90]], width: 3, kind: "dirt" },
    { points: [[70, 62], [58, 84], [46, 100]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "lava", shape: { poly: [[108, 8], [118, 10], [124, 30], [120, 50], [112, 46], [114, 26]] } },
    { kind: "lava", shape: { ellipse: [30, 92, 7, 5] } },
    { kind: "lava", shape: { ellipse: [20, 82, 4, 3] } },
    { kind: "chasm", shape: { ellipse: [80, 96, 7, 4] } },
    { kind: "rock", shape: { ellipse: [40, 26, 5, 4] } },
    { kind: "rock", shape: { ellipse: [58, 30, 3, 3] } },
    { kind: "machine", shape: { rect: [118, 70, 7, 4] } }, // toppled heat-sink
  ],
  props: [
    { kind: "tent", x: 8, y: 54, block: 2 }, { kind: "crate", x: 15, y: 66, block: 1 }, { kind: "lamp_post", x: 19, y: 56, block: 1 },
    { kind: "tent", x: 101, y: 7, block: 2 },
    { kind: "aether_pylon", x: 64, y: 56, block: 1 },
    { kind: "rune_stone", x: 74, y: 70, block: 1 },
    { kind: "gear_ruin", x: 121, y: 78, block: 2 }, { kind: "brass_pipe", x: 110, y: 64, block: 0 }, { kind: "brass_pipe", x: 124, y: 66, block: 0 },
    { kind: "furnace", x: 36, y: 86, block: 0, scale: 0.8 },
  ],
  scatter: [
    { kind: "boulder", count: 40, block: 1, scale: [0.8, 1.3] },
    { kind: "dead_tree", count: 50, block: 1, scale: [0.7, 1.1] },
    { kind: "rock", count: 60, block: 0, scale: [0.5, 1] },
    { kind: "crystal", count: 10, area: [96, 50, 30, 40], block: 1, scale: [0.6, 0.9] },
  ],
  landmarks: [
    { id: "lm_emb_ash_camp", name: "Ashfield Camp", kind: "camp", x: 10, y: 60, note: "Arrival from Cindervale; the scout knows the herds." },
    { id: "lm_emb_ash_crossroads", name: "Cinder Crossroads", kind: "crossroads", x: 70, y: 62, note: "Four roads meet by a rune stone." },
    { id: "lm_emb_ash_flats", name: "Ash Flats", kind: "farm", x: 40, y: 27, note: "40 passive Ashcrawlers on open ash." },
    { id: "lm_emb_ash_slag", name: "Slag Pools", kind: "farm", x: 34, y: 88, note: "Slagback Toads in the cooling pools." },
    { id: "lm_emb_ash_vents", name: "Heat-Sink Vents", kind: "farm", x: 110, y: 70, note: "Slagback Toads crowd the warm vents round the toppled heat-sink." },
    { id: "lm_emb_ash_ridge", name: "Crust Ridge", kind: "farm", x: 72, y: 25, note: "Passive Ashcrawlers grazing the lava crust." },
    { id: "lm_emb_ash_north", name: "North Road", kind: "gate", x: 96, y: 8, note: "To Cinder Track (Lv64-68)." },
  ],
  safe_areas: [[4, 52, 14, 16], [88, 4, 16, 13]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "ash_flats", name: "Ash Flats", rects: [[20, 12, 40, 30]], species: [{ monster_id: "mob_0028", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "Open ash with only two rock outcrops: passive Ashcrawlers at the bottom of the band, ~27 cells each, so returning players can gather a 40-pack with a taunt and test their AoE on a new region's numbers." },
    { id: "slag_pools", name: "Slag Pools", rects: [[14, 72, 40, 32]], species: [{ monster_id: "mob_0080", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Assisting bruisers round two lava pools: one hit wakes the pool, so the pocket is sized for a deliberate 10-15 bruiser pull, not a wander-through." },
    { id: "heat_sink_vents", name: "Heat-Sink Vents", rects: [[96, 50, 30, 40]], species: [{ monster_id: "mob_0080", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "Assisting Lv63 toads round the toppled heat-sink under the lava fissure: a second, larger toad pull kept off the main road so the camp-to-crossroads walk stays calm." },
    { id: "crust_ridge", name: "Crust Ridge", rects: [[60, 12, 24, 26]], species: [{ monster_id: "mob_0028", weight: 1 }], target_alive: 20, respawn_sec: [7, 15],
      design_note: "Beside the north road: a small passive grazer herd on the lava crust, an easy top-up for a train on the way to Cinder Track." },
  ],
  npcs: [npc("npc_emb_ashfield_scout", "Ashfield Scout Varro", [13, 55], "E", "scout")],
};

const cinderTrack: MapDesign = {
  id: "emb_fld_02", name: "Cinder Track", type: "field", role: "The old haul road climbing north over a lava stream: the first aggressive horde, Cinder Imps on the terraces, in the hollows, on the scree and along the rail trestles.",
  levels: [64, 68], size: [112, 148], arrival: [56, 137], ground: "ash", theme: "a cinder-paved haul road winding past lava falls and a dead Aethrion ore-rail",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[56, 147], [56, 124], [48, 102], [60, 76], [52, 52], [30, 42], [0, 40]], width: 4, kind: "dirt" },
    { points: [[60, 76], [86, 70], [96, 56]], width: 3, kind: "dirt" },
    { points: [[52, 52], [64, 28], [80, 16]], width: 3, kind: "dirt" },
    { points: [[49, 102], [55, 84]], width: 4, kind: "bridge" }, // iron bridge over the lava stream
  ],
  blockers: [
    { kind: "lava", shape: { poly: [[4, 86], [40, 92], [70, 86], [108, 92], [108, 99], [70, 93], [40, 99], [4, 94]] } },
    { kind: "lava", shape: { ellipse: [94, 18, 8, 9] } }, // lava falls
    { kind: "cliff", shape: { poly: [[4, 104], [22, 106], [26, 124], [4, 130]] } },
    { kind: "rock", shape: { ellipse: [30, 64, 4, 3] } },
    { kind: "machine", shape: { rect: [68, 8, 8, 4] } }, // ore-rail terminus
  ],
  props: [
    { kind: "tent", x: 62, y: 140, block: 2 }, { kind: "lamp_post", x: 52, y: 131, block: 1 },
    { kind: "tent", x: 9, y: 36, block: 2 },
    { kind: "brass_pipe", x: 40, y: 20, block: 0 }, { kind: "brass_pipe", x: 30, y: 24, block: 0 }, { kind: "gear_ruin", x: 72, y: 16, block: 2 },
    { kind: "aether_pylon", x: 64, y: 78, block: 1 },
    { kind: "anvil", x: 84, y: 112, block: 1 }, { kind: "gear_ruin", x: 92, y: 120, block: 2 },
    { kind: "rune_stone", x: 44, y: 106, block: 1 },
  ],
  scatter: [
    { kind: "boulder", count: 50, block: 1, scale: [0.8, 1.4] },
    { kind: "dead_tree", count: 40, block: 1, scale: [0.7, 1.1] },
    { kind: "rock", count: 70, block: 0, scale: [0.5, 1] },
  ],
  landmarks: [
    { id: "lm_emb_track_camp", name: "Trackfoot Camp", kind: "camp", x: 56, y: 137, note: "Arrival from Ashfield." },
    { id: "lm_emb_track_bridge", name: "Stream Bridge", kind: "crossroads", x: 52, y: 93, note: "The only crossing of the lava stream." },
    { id: "lm_emb_track_terraces", name: "Slag Terraces", kind: "farm", x: 82, y: 117, note: "Cinder Imps swarming the stepped slag." },
    { id: "lm_emb_track_hollows", name: "Imp Hollows", kind: "farm", x: 24, y: 70, note: "Cinder Imp nests in hot ground." },
    { id: "lm_emb_track_scree", name: "Scorch Scree", kind: "farm", x: 86, y: 48, note: "Cinder Imps pouring down the scree under the lava falls." },
    { id: "lm_emb_track_rail", name: "Ore-Rail Terminus", kind: "ruin", x: 72, y: 12, note: "Dead Aethrion ore-rail below the lava falls." },
    { id: "lm_emb_track_west", name: "Causeway Turn", kind: "gate", x: 8, y: 40, note: "West to the Forge Approach (Lv68-72)." },
  ],
  safe_areas: [[48, 128, 16, 16], [4, 33, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "slag_terraces", name: "Slag Terraces", rects: [[64, 104, 36, 26]], species: [{ monster_id: "mob_0029", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Aggressive Lv65 imps on stepped slag south of the lava stream, next to camp: a smaller first taste of the horde before the bridge." },
    { id: "imp_hollows", name: "Imp Hollows", rects: [[8, 56, 32, 28]], species: [{ monster_id: "mob_0029", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature horde: 40 aggressive imps (~22 cells each) between the stream and the west road; quick respawn so the hollow refills between 30-mob trains." },
    { id: "scorch_scree", name: "Scorch Scree", rects: [[70, 34, 34, 30]], species: [{ monster_id: "mob_0029", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Aggressive imps on the open scree under the lava falls: packs rush down on anyone climbing the east road, so trains build themselves." },
    { id: "rail_trestles", name: "Rail Trestles", rects: [[16, 8, 40, 22]], species: [{ monster_id: "mob_0029", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Rail pipes break the ground into lanes; imp packs funnel along them, good for stringing a train between the trestles." },
  ],
  npcs: [npc("npc_emb_cinder_track_scout", "Track Scout Hesk", [60, 134], "N", "scout")],
};

const forgeApproach: MapDesign = {
  id: "emb_fld_03", name: "Forge Approach", type: "field", role: "The industrial causeway north of Cindervale: iron bridges over lava channels, the hound kennels and the cold forges.",
  levels: [68, 72], size: [128, 140], arrival: [64, 129], ground: "metal", theme: "an iron-plated causeway over lava channels, flanked by abandoned Aethrion forges and slag heaps",
  border: { width: 4, kind: "rock" },
  roads: [
    { points: [[64, 139], [64, 112], [70, 86], [64, 62]], width: 5, kind: "stone" },
    { points: [[64, 62], [92, 52], [127, 46]], width: 4, kind: "stone" },
    { points: [[64, 62], [48, 40], [40, 18], [40, 0]], width: 4, kind: "stone" },
    { points: [[70, 86], [100, 94], [112, 114]], width: 3, kind: "dirt" },
    { points: [[66, 106], [68, 94]], width: 5, kind: "bridge" },
    { points: [[101, 96], [105, 104]], width: 3, kind: "bridge" },
  ],
  blockers: [
    { kind: "lava", shape: { rect: [4, 98, 120, 4] } }, // the Great Channel, crossed by two bridges
    { kind: "lava", shape: { rect: [4, 70, 36, 3] } },
    { kind: "machine", shape: { rect: [18, 30, 10, 8] } }, // cold forge
    { kind: "machine", shape: { rect: [88, 18, 12, 8] } }, // dead foundry
    { kind: "ruin_wall", shape: { rect: [80, 116, 14, 2] } },
    { kind: "ruin_wall", shape: { rect: [50, 110, 2, 12] } },
    { kind: "rock", shape: { ellipse: [104, 74, 4, 3] } },
  ],
  props: [
    { kind: "tent", x: 59, y: 132, block: 2 },
    { kind: "tent", x: 120, y: 52, block: 2 }, { kind: "tent", x: 34, y: 8, block: 2 },
    { kind: "furnace", x: 23, y: 44, block: 2 }, { kind: "anvil", x: 30, y: 44, block: 1 }, { kind: "furnace", x: 36, y: 28, block: 2 },
    { kind: "gear_ruin", x: 94, y: 30, block: 2 }, { kind: "brass_pipe", x: 82, y: 22, block: 0 }, { kind: "brass_pipe", x: 104, y: 22, block: 0 },
    { kind: "aether_pylon", x: 60, y: 66, block: 1 }, { kind: "aether_pylon", x: 74, y: 82, block: 1 },
    { kind: "statue", x: 56, y: 92, block: 2 },
    { kind: "lamp_post", x: 61, y: 118, block: 1 }, { kind: "lamp_post", x: 68, y: 90, block: 1 },
  ],
  scatter: [
    { kind: "boulder", count: 50, block: 1, scale: [0.8, 1.3] },
    { kind: "gear_ruin", count: 14, area: [8, 20, 40, 34], block: 1, scale: [0.6, 1] },
    { kind: "rock", count: 60, block: 0, scale: [0.5, 1] },
    { kind: "crate", count: 10, area: [86, 104, 30, 26], block: 1 },
  ],
  landmarks: [
    { id: "lm_emb_forge_camp", name: "Causeway Camp", kind: "camp", x: 64, y: 129, note: "Arrival from Cindervale's North Gate." },
    { id: "lm_emb_forge_bridge", name: "Great Channel Bridge", kind: "crossroads", x: 67, y: 100, note: "Iron bridge over the main lava channel." },
    { id: "lm_emb_forge_junction", name: "Causeway Junction", kind: "crossroads", x: 64, y: 62, note: "Roads east to Cinder Track and north to the Vents." },
    { id: "lm_emb_forge_kennels", name: "Hound Kennels", kind: "farm", x: 98, y: 72, note: "The Smelt Hounds' old kennels." },
    { id: "lm_emb_forge_cold", name: "Cold Forges", kind: "ruin", x: 26, y: 36, note: "Dead forges still tended by Crucible Tenders." },
    { id: "lm_emb_forge_heaps", name: "Slag Heaps", kind: "farm", x: 100, y: 118, note: "Crucible Tenders scavenge here for scrap." },
    { id: "lm_emb_forge_east", name: "East Causeway", kind: "gate", x: 122, y: 46, note: "To Cinder Track (Lv64-68)." },
    { id: "lm_emb_forge_north", name: "North Climb", kind: "gate", x: 40, y: 6, note: "To Magma Vents (Lv72-77)." },
  ],
  safe_areas: [[56, 122, 16, 15], [109, 40, 15, 15], [32, 4, 16, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "hound_kennels", name: "Hound Kennels", rects: [[78, 58, 40, 30]], species: [{ monster_id: "mob_0030", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The main horde: 40 fast hounds in the open kennel yard. They are the quickest monster in the region, so the yard is wide (~29 cells each) to give room to kite into a stack." },
    { id: "cold_forges", name: "Cold Forges", rects: [[10, 22, 36, 30]], species: [{ monster_id: "mob_0081", weight: 50 }, { monster_id: "mob_0030", weight: 50 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Tenders weld the hounds they live with and flee when hit: the pocket teaches killing the support first. Forge machinery splits the yard into lanes." },
    { id: "channel_bank", name: "Channel Bank", rects: [[8, 76, 44, 20]], species: [{ monster_id: "mob_0030", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Aggressive hounds along the bank between two lava channels: a long thin pocket that strings the fast packs out along the lava, an overflow for the kennels." },
    { id: "slag_heaps", name: "Slag Heaps", rects: [[86, 106, 30, 26]], species: [{ monster_id: "mob_0081", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "South of the channel near camp: fleeing tenders scavenging on their own, a quieter farm for Tender materials (the focus-tonic recipe)." },
  ],
  npcs: [npc("npc_emb_forge_scout", "Causeway Scout Imra", [70, 126], "N", "scout")],
};

const magmaVents: MapDesign = {
  id: "emb_fld_04", name: "Magma Vents", type: "field", role: "A broken plain of live vents: the skink horde round the vent pool, Spitters on the fissure, skinks and Spitters together on the heat-tap ridge.",
  levels: [72, 77], size: [152, 116], arrival: [40, 104], ground: "ash", theme: "basalt columns and magma vents, Aethrion heat-taps still drilling into the lava",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[40, 115], [40, 92], [56, 70], [84, 62], [151, 58]], width: 4, kind: "dirt" },
    { points: [[84, 62], [90, 36], [110, 20]], width: 3, kind: "dirt" },
    { points: [[56, 70], [30, 50], [20, 24]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "lava", shape: { ellipse: [70, 30, 10, 7] } }, // the vent pool
    { kind: "lava", shape: { poly: [[96, 76], [120, 80], [140, 94], [146, 108], [134, 106], [116, 90], [98, 84]] } }, // southern fissure
    { kind: "lava", shape: { ellipse: [20, 84, 6, 5] } },
    { kind: "rock", shape: { ellipse: [52, 44, 3, 3] } },
    { kind: "rock", shape: { ellipse: [124, 30, 4, 3] } },
    { kind: "machine", shape: { rect: [104, 12, 8, 6] } }, // heat-tap drill
  ],
  props: [
    { kind: "tent", x: 34, y: 101, block: 2 }, { kind: "tent", x: 140, y: 52, block: 2 },
    { kind: "furnace", x: 108, y: 22, block: 0, scale: 1.2 },
    { kind: "brass_pipe", x: 96, y: 14, block: 0 }, { kind: "brass_pipe", x: 116, y: 16, block: 0 }, { kind: "brass_pipe", x: 80, y: 22, block: 0 },
    { kind: "aether_pylon", x: 88, y: 66, block: 1 },
    { kind: "lattice_obelisk", x: 60, y: 76, block: 2 },
    { kind: "rune_stone", x: 26, y: 60, block: 1 },
  ],
  scatter: [
    { kind: "boulder", count: 60, block: 1, scale: [0.9, 1.6] },
    { kind: "crystal", count: 16, area: [50, 10, 50, 40], block: 1, scale: [0.6, 1] },
    { kind: "rock", count: 80, block: 0, scale: [0.5, 1] },
    { kind: "dead_tree", count: 20, area: [8, 10, 40, 60], block: 1 },
  ],
  landmarks: [
    { id: "lm_emb_vents_camp", name: "Ventfoot Camp", kind: "camp", x: 40, y: 104, note: "Arrival from the Forge Approach." },
    { id: "lm_emb_vents_cross", name: "Vent Crossing", kind: "crossroads", x: 84, y: 62, note: "Roads to the ridge and east to Ironfall." },
    { id: "lm_emb_vents_pool", name: "The Vent Pool", kind: "farm", x: 70, y: 30, note: "Vent Skink colonies ring the magma pool." },
    { id: "lm_emb_vents_fissure", name: "Southern Fissure", kind: "farm", x: 116, y: 92, note: "Magma Spitters rooted along the lava." },
    { id: "lm_emb_vents_ridge", name: "Heat-Tap Ridge", kind: "ruin", x: 108, y: 18, note: "An Aethrion drill still running; skinks and Spitters crowd round it." },
    { id: "lm_emb_vents_wash", name: "Ash Wash", kind: "farm", x: 26, y: 36, note: "Vent Skinks in the western gully." },
    { id: "lm_emb_vents_east", name: "Canyon Road", kind: "gate", x: 146, y: 58, note: "To Ironfall (Lv76-81)." },
  ],
  safe_areas: [[32, 98, 16, 14], [133, 51, 15, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "vent_pool", name: "The Vent Pool", rects: [[56, 16, 34, 30]], species: [{ monster_id: "mob_0082", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature horde: 40 durable skinks circling the magma pool. The pool in the middle means a train loops round it naturally; crystal outcrops break line of sight." },
    { id: "southern_fissure", name: "Southern Fissure", rects: [[94, 84, 34, 22]], species: [{ monster_id: "mob_0083", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Ranged worms along the fissure: the lava sits between them and the road, so players must path round and pull them off the edge." },
    { id: "heat_tap_ridge", name: "Heat-Tap Ridge", rects: [[100, 6, 40, 28]], species: [{ monster_id: "mob_0082", weight: 50 }, { monster_id: "mob_0083", weight: 50 }], target_alive: 25, respawn_sec: [10, 20],
      design_note: "Skinks and ranged Spitters mixed round the drill: the skinks rush while the worms spit from behind the machinery, the hardest pocket on the map." },
    { id: "ash_wash", name: "Ash Wash", rects: [[8, 16, 36, 40]], species: [{ monster_id: "mob_0082", weight: 1 }], target_alive: 25, respawn_sec: [7, 15],
      design_note: "Skinks alone in the western gully, away from the Spitters: the catch-up pocket for players arriving under-levelled." },
  ],
  npcs: [npc("npc_emb_magma_scout", "Vent Scout Tollan", [45, 101], "N", "scout")],
};

const ironfall: MapDesign = {
  id: "emb_fld_05", name: "Ironfall", type: "field", role: "A canyon split by a lava river and crossed by two Aethrion iron spans; Knights hold the truss graveyard, Scraplings strip the girders.",
  levels: [76, 81], size: [144, 104], arrival: [11, 52], ground: "metal", theme: "a lava canyon littered with collapsed iron bridges, girders and rivets",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[0, 52], [30, 52], [58, 46], [86, 46], [110, 36], [143, 30]], width: 4, kind: "dirt" },
    { points: [[56, 46], [88, 46]], width: 4, kind: "bridge" }, // the High Span
    { points: [[30, 52], [40, 76], [60, 88], [88, 88], [112, 80]], width: 3, kind: "dirt" },
    { points: [[58, 88], [86, 88]], width: 3, kind: "bridge" }, // the Lower Span
    { points: [[110, 36], [118, 62], [116, 84]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "lava", shape: { poly: [[64, 4], [78, 4], [80, 30], [76, 60], [80, 100], [64, 100], [62, 60], [66, 30]] } },
    { kind: "machine", shape: { rect: [22, 18, 12, 3] } }, // fallen truss
    { kind: "machine", shape: { rect: [40, 24, 3, 10] } },
    { kind: "cliff", shape: { ellipse: [128, 60, 6, 8] } },
    { kind: "rock", shape: { ellipse: [36, 86, 3, 3] } },
  ],
  props: [
    { kind: "tent", x: 7, y: 47, block: 2 }, { kind: "tent", x: 136, y: 24, block: 2 },
    { kind: "gear_ruin", x: 16, y: 30, block: 2 }, { kind: "gear_ruin", x: 50, y: 14, block: 2 },
    { kind: "brass_pipe", x: 96, y: 66, block: 0 }, { kind: "brass_pipe", x: 104, y: 78, block: 0 },
    { kind: "statue", x: 54, y: 40, block: 2 }, // bridge-head statue
    { kind: "lamp_post", x: 90, y: 42, block: 1 }, { kind: "lamp_post", x: 56, y: 92, block: 1 },
    { kind: "anvil", x: 100, y: 58, block: 1 },
  ],
  scatter: [
    { kind: "gear_ruin", count: 24, block: 1, scale: [0.6, 1.1] },
    { kind: "boulder", count: 40, block: 1, scale: [0.8, 1.3] },
    { kind: "rock", count: 60, block: 0, scale: [0.5, 1] },
    { kind: "crate", count: 12, area: [86, 52, 28, 40], block: 1 },
  ],
  landmarks: [
    { id: "lm_emb_iron_camp", name: "Canyon Camp", kind: "camp", x: 11, y: 52, note: "Arrival from the Magma Vents." },
    { id: "lm_emb_iron_high", name: "The High Span", kind: "crossroads", x: 72, y: 46, note: "The last intact Aethrion bridge over the lava river." },
    { id: "lm_emb_iron_lower", name: "The Lower Span", kind: "crossroads", x: 72, y: 88, note: "A patched-up span, south." },
    { id: "lm_emb_iron_trusses", name: "Truss Graveyard", kind: "ruin", x: 32, y: 22, note: "Fallen trusses where Furnace Knights march." },
    { id: "lm_emb_iron_girders", name: "Girder Fields", kind: "farm", x: 100, y: 72, note: "Rivet Scrapling heaps." },
    { id: "lm_emb_iron_banks", name: "Lava Banks", kind: "farm", x: 98, y: 18, note: "Furnace Knights patrol the east bank." },
    { id: "lm_emb_iron_east", name: "Crucible Road", kind: "gate", x: 136, y: 30, note: "To the Red Crucible (Lv80-85)." },
  ],
  safe_areas: [[4, 45, 14, 14], [125, 25, 16, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "girder_fields", name: "Girder Fields", rects: [[86, 52, 28, 40]], species: [{ monster_id: "mob_0084", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature horde across the river: 40 assisting scraplings, so one hit rings the whole heap into a 30-40 train. Crates and gear scrap give a few corners to gather against." },
    { id: "truss_graveyard", name: "Truss Graveyard", rects: [[10, 8, 46, 30]], species: [{ monster_id: "mob_0031", weight: 1 }], target_alive: 30, respawn_sec: [9, 18],
      design_note: "Furnace Knights in their own ground: aggressive constructs among fallen trusses, ~40 cells each so they come in twos and threes, never all at once." },
    { id: "lava_banks", name: "Lava Banks", rects: [[84, 6, 30, 24]], species: [{ monster_id: "mob_0031", weight: 1 }], target_alive: 25, respawn_sec: [7, 15],
      design_note: "Lv77 knights patrolling the east bank above the High Span road: aggressive constructs spread along the ledge, so they come one or two at a time." },
    { id: "lower_span", name: "Lower Span Approach", rects: [[14, 64, 40, 30]], species: [{ monster_id: "mob_0084", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Assisting scraplings by the southern bridge: one ring pulls the heap round the corner of the span, a smaller overflow for the Girder Fields." },
  ],
  npcs: [npc("npc_emb_ironfall_scout", "Canyon Scout Dagny", [14, 47], "E", "scout")],
};

// Mould grid in the yard: rows of iron moulds the Brutes were cast in.
const moulds: Prop[] = [];
for (let x = 88; x <= 114; x += 9) for (let y = 10; y <= 24; y += 7) moulds.push({ kind: "anvil", x, y, block: 1, scale: 1.2 });

const redCrucible: MapDesign = {
  id: "emb_fld_06", name: "Red Crucible", type: "field", role: "The last field: a ring road round the Crucible's slag lake, wraiths in the pour channels, Brutes in the mould yard, the hatch to Furnace Zero.",
  levels: [80, 85], size: [124, 128], arrival: [11, 36], ground: "ash", theme: "an open-cast pour basin round a red slag lake, pour channels and casting moulds",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[0, 36], [28, 36], [46, 46]], width: 4, kind: "stone" },
    { points: [[46, 46], [78, 46], [92, 65], [78, 86], [46, 86], [33, 65], [46, 46]], width: 3, kind: "obsidian" },
    { points: [[78, 86], [86, 104], [86, 127]], width: 4, kind: "stone" },
    { points: [[78, 46], [96, 26], [110, 16]], width: 3, kind: "stone" },
  ],
  blockers: [
    { kind: "lava", shape: { ellipse: [62, 66, 14, 11] } }, // the Crucible
    { kind: "lava", shape: { rect: [94, 60, 26, 3] } }, // east pour channel
    { kind: "lava", shape: { rect: [8, 98, 30, 3] } }, // west pour channel
    { kind: "machine", shape: { rect: [100, 34, 8, 8] } }, // ladle crane
    { kind: "machine", shape: { rect: [14, 58, 6, 10] } },
    { kind: "cliff", shape: { ellipse: [110, 112, 8, 10] } },
  ],
  props: [
    ...moulds,
    { kind: "tent", x: 7, y: 31, block: 2 },
    { kind: "tent", x: 80, y: 109, block: 2 },
    { kind: "cave_mouth", x: 86, y: 126, block: 0, scale: 1.4 }, // the hatch
    { kind: "furnace", x: 104, y: 38, block: 0, scale: 1.3 },
    { kind: "brass_pipe", x: 96, y: 58, block: 0 }, { kind: "brass_pipe", x: 30, y: 96, block: 0 },
    { kind: "aether_pylon", x: 92, y: 106, block: 1 },
    { kind: "lattice_obelisk", x: 62, y: 50, block: 0 },
  ],
  scatter: [
    { kind: "boulder", count: 40, block: 1, scale: [0.8, 1.4] },
    { kind: "gear_ruin", count: 16, area: [8, 66, 30, 32], block: 1, scale: [0.6, 1] },
    { kind: "rock", count: 70, block: 0, scale: [0.5, 1] },
  ],
  landmarks: [
    { id: "lm_emb_crucible_camp", name: "Rimside Camp", kind: "camp", x: 11, y: 36, note: "Arrival from Ironfall." },
    { id: "lm_emb_crucible_lake", name: "The Red Crucible", kind: "lookout", x: 62, y: 66, note: "The slag lake; the ring road circles it." },
    { id: "lm_emb_crucible_channels", name: "Pour Channels", kind: "farm", x: 106, y: 78, note: "Pour Wraiths drift along the channels." },
    { id: "lm_emb_crucible_moraine", name: "Scrap Moraine", kind: "farm", x: 20, y: 82, note: "Slagforged Brutes lumber over the heaped scrap." },
    { id: "lm_emb_crucible_moulds", name: "Mould Yard", kind: "ruin", x: 100, y: 18, note: "Slagforged Brutes stand in their moulds." },
    { id: "lm_emb_crucible_hatch", name: "Furnace Hatch", kind: "gate", x: 86, y: 122, note: "The way down to Furnace Zero." },
  ],
  safe_areas: [[4, 29, 14, 14], [78, 108, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "pour_channels", name: "Pour Channels", rects: [[94, 64, 24, 30]], species: [{ monster_id: "mob_0086", weight: 1 }], target_alive: 35, respawn_sec: [5, 12],
      design_note: "Lv85 wraiths (top of band) between the channel and the ring road: fragile but hard-hitting, so packs die fast and refill fast." },
    { id: "scrap_moraine", name: "Scrap Moraine", rects: [[8, 70, 24, 26]], species: [{ monster_id: "mob_0085", weight: 1 }], target_alive: 35, respawn_sec: [5, 12],
      design_note: "Lv83 brutes packed on the scrap heap by the west channel: aggressive bruisers in the open, a steadier fight than the yard's aisles for players just arrived from Ironfall." },
    { id: "mould_yard", name: "Mould Yard", rects: [[84, 6, 34, 22]], species: [{ monster_id: "mob_0085", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Aggressive bruisers among the mould rows: the moulds split the yard into aisles, so Brutes come one aisle at a time." },
    { id: "crucible_rim", name: "Crucible Rim", rects: [[40, 92, 30, 18]], species: [{ monster_id: "mob_0086", weight: 50 }, { monster_id: "mob_0085", weight: 50 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Wraiths and Brutes mixed below the ring road: fast-dying hitters behind a bruiser wall, the last field test before Furnace Zero." },
  ],
  npcs: [
    npc("npc_emb_crucible_scout", "Rim Scout Oska", [14, 31], "E", "scout"),
    npc("npc_emb_crucible_medic", "Crucible Field Medic", [81, 112], "E", "healer"),
    npc("npc_emb_furnace_gatekeeper", "Furnace Hatch Keeper", [91, 116], "S", "guard"),
  ],
};

const furnaceZero: MapDesign = {
  id: "emb_dun_01", name: "Furnace Zero", type: "dungeon", role: "Emberfall's dungeon: the first Aethrion furnace, its pour gallery, coal pens and stoker halls, all worked by Zero Stokers, round Kiln Prime's Zero Core.",
  levels: [85, 90], size: [132, 112], arrival: [60, 11], ground: "metal", theme: "brass halls and pour galleries round the white-hot core of the first furnace",
  solid: true,
  carve: [
    { rect: [50, 0, 20, 20] },
    { ellipse: [30, 40, 20, 13] },
    { rect: [76, 30, 34, 22] },
    { rect: [14, 70, 40, 24] },
    { ellipse: [100, 88, 16, 14] },
  ],
  roads: [
    { points: [[60, 10], [60, 26], [40, 40]], width: 4, kind: "obsidian" },
    { points: [[60, 26], [80, 40], [93, 41]], width: 4, kind: "obsidian" },
    { points: [[40, 40], [34, 60], [34, 82]], width: 4, kind: "obsidian" },
    { points: [[34, 82], [64, 90], [86, 88]], width: 4, kind: "obsidian" },
    { points: [[93, 50], [100, 74]], width: 4, kind: "obsidian" },
  ],
  blockers: [
    { kind: "lava", shape: { ellipse: [30, 40, 4, 3] } }, // pour pit
    { kind: "machine", shape: { rect: [22, 76, 3, 3] } },
    { kind: "machine", shape: { rect: [46, 74, 3, 3] } },
  ],
  props: [
    { kind: "cave_mouth", x: 60, y: 1, block: 0, scale: 1.2 },
    { kind: "tent", x: 54, y: 8, block: 2 },
    { kind: "furnace", x: 100, y: 88, block: 0, scale: 2 },
    { kind: "brass_pipe", x: 84, y: 34, block: 0 }, { kind: "brass_pipe", x: 104, y: 34, block: 0 },
    { kind: "gear_ruin", x: 18, y: 88, block: 2 }, { kind: "anvil", x: 50, y: 88, block: 1 },
    { kind: "aether_pylon", x: 88, y: 80, block: 1 }, { kind: "aether_pylon", x: 112, y: 80, block: 1 },
  ],
  scatter: [
    { kind: "crystal", count: 20, block: 1, scale: [0.6, 1.1] },
    { kind: "brass_pipe", count: 20, block: 0, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_emb_zero_hatch", name: "Hatch Landing", kind: "camp", x: 60, y: 11, note: "Arrival; the Lift Keeper takes you back up." },
    { id: "lm_emb_zero_gallery", name: "Pour Gallery", kind: "farm", x: 30, y: 40, note: "Zero Stokers round the pour pit." },
    { id: "lm_emb_zero_pens", name: "Coal Pens", kind: "farm", x: 93, y: 41, note: "Zero Stokers guarding the coal stores." },
    { id: "lm_emb_zero_halls", name: "Stoker Halls", kind: "ruin", x: 34, y: 82, note: "Zero Stokers shovel coal into nothing." },
    { id: "lm_emb_zero_core", name: "The Zero Core", kind: "boss_arena", x: 100, y: 88, note: "Kiln Prime." },
  ],
  safe_areas: [[52, 5, 16, 12]],
  horde: { min_alive: 60, max_alive: 120 },
  pockets: [
    { id: "pour_gallery", name: "Pour Gallery", rects: [[14, 30, 32, 20]], species: [{ monster_id: "mob_0087", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The dungeon's main farm: 40 assisting stokers in an oval hall you can circle round the pour pit; one pull wakes the gallery, the densest construct horde in Emberfall." },
    { id: "coal_pens", name: "Coal Pens", rects: [[78, 32, 30, 18]], species: [{ monster_id: "mob_0087", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Assisting Lv88 stokers on the short route to the core: they answer as one, so clear the pens or go round through the halls." },
    { id: "stoker_halls", name: "Stoker Halls", rects: [[16, 72, 36, 20]], species: [{ monster_id: "mob_0087", weight: 1 }], target_alive: 30, respawn_sec: [10, 20],
      design_note: "Assisting constructs at the cap: one pull is the whole hall. The best Living Ember and Aetherite source in the region." },
    { id: "zero_core", name: "The Zero Core", rects: [[94, 82, 12, 12]], species: [{ monster_id: "mob_0088", weight: 1 }], target_alive: 1, respawn_sec: [300, 420],
      design_note: "Region boss, 5-7 minute respawn; two approaches (pens or halls) so a party can choose its fight on the way in." },
  ],
  npcs: [npc("npc_emb_furnace_lift", "Furnace Zero Lift Keeper", [65, 9], "S", "teleporter", { destinations: [["emb_town_01", 0], ["emb_fld_06", 0]] })],
};

// --- dialogue ------------------------------------------------------------------------

const dialogues: DialogueDef[] = [
  ["npc_emb_guild_registrar", "Cindervale chapter of the Wayfarer Guild. Everything here was built to make iron, and most of it still thinks that's its job.", "Start on the Ashfield flats past the East Bridge. Come back when the herds have thinned."],
  ["npc_emb_merchant", "Rations and tonics, hauled up from Vaelspire. Heat spoils everything, so I charge what it costs to keep them cool.", "Bring me Emberfall scrap; the foundries in the south buy all I can ship."],
  ["npc_emb_healer", "Burns, mostly. Hold still, the salve stings before it cools.", "Drink water out there. More Wayfarers fall to the heat than to the imps."],
  ["npc_emb_teleporter", "The lattice runs hot here, but it runs. Every camp in Emberfall, or Vaelspire and Umbracrest for the long haul.", "Umbracrest's beyond the Crucible. Nobody walks there twice."],
  ["npc_emb_craftsman", "Slag glands, vent bladders, cheap ash meat: I can turn your surplus into tonics for less than the shop asks.", "Don't sell me Living Embers. Keep them. You'll know why soon enough."],
  ["npc_emb_east_gate_guard", "East Bridge. Ashfield's beyond: grazers on the flats and the ridge, toads in the slag pools and round the old heat-sink.", "If the bridge rattles, something big is crossing it. Step aside."],
  ["npc_emb_north_gate_guard", "North Bridge, start of the old causeway. Forge country: hounds in the kennels, brass tenders in the cold forges, and the hounds still think they're on duty.", "Hounds are faster than you. Don't run; stand and swing."],
  ["npc_emb_ashfield_scout", "Ashcrawlers graze the flats and won't touch you. The toads in the slag pools will, and they bring their friends.", "More toads squat by the heat-sink east of the crossroads. Hit one and the rest come."],
  ["npc_emb_cinder_track_scout", "The haul road crosses the lava stream once, on the iron bridge. Imps on both banks, and every one of them bites.", "Imps fill the hollows west of the bridge, the scree under the falls and the old rail trestles."],
  ["npc_emb_forge_scout", "The causeway runs over the Great Channel. Kennels to the east, cold forges to the west.", "The brass spiders weld the hounds back together. Kill the spiders first."],
  ["npc_emb_magma_scout", "Skinks ring the vent pool; pull them round it and they bunch up nicely.", "The worms on the fissure spit from across the lava. Make them come to you."],
  ["npc_emb_ironfall_scout", "Two spans left over the river: the High Span on the road, the Lower Span south.", "Scraplings ring like bells when you hit one. Then all of them come."],
  ["npc_emb_crucible_scout", "The ring road goes round the lake. Don't take a short cut across it.", "Wraiths in the channels east, Brutes on the scrap heap west and up in the mould yard."],
  ["npc_emb_crucible_medic", "Everything down there answers to something in the Zero Core. The foundry has a mind, and it's awake.", "Clear the pour channels and the yard, then go down through the hatch."],
  ["npc_emb_furnace_gatekeeper", "Furnace Zero's below. The lift still works; the heat hits you at the bottom.", "The core's at the far end, past the pens or through the stoker halls."],
  ["npc_emb_furnace_lift", "Going up? Cindervale or the Crucible rim.", "Keep your hands off the rails; they're hotter than they look."],
].map(([npcId, ...lines]) => ({ id: npcId.replace(/^npc_/, "dlg_"), npc_id: npcId, lines }));

// --- the region ------------------------------------------------------------------------

export const emberfall: RegionDesign = {
  region: {
    id: "emb", name: "Emberfall", capital: "Cindervale", town_map_id: "emb_town_01", dungeon_map_id: "emb_dun_01", level_range: [60, 90],
    theme: "Lava, foundries and iron bridges: Aethrion's industrial heart, still running without anyone at the controls.",
    ecology: "Ash grazers and slag toads on the cooled plains, imps and skinks wherever the lava is live, foundry constructs from the forges to the bridges, and a molten foundry intelligence at the bottom of Furnace Zero driving them all.",
    palette: { grass: "#5a4a42", dirt: "#7a5a46", accent: "#ff7a2e", fog: "#2a1410" },
  },
  maps: [cindervale, ashfield, cinderTrack, forgeApproach, magmaVents, ironfall, redCrucible, furnaceZero],
  links: [
    { label: "Cindervale East Bridge ⇄ Ashfield", a: { map: "emb_town_01", trigger: [141, 69, 3, 7], landing: [132, 72] }, b: { map: "emb_fld_01", trigger: [0, 57, 3, 7], landing: [10, 60] } },
    { label: "Cindervale North Bridge ⇄ Forge Approach", a: { map: "emb_town_01", trigger: [59, 0, 7, 3], landing: [62, 11] }, b: { map: "emb_fld_03", trigger: [61, 137, 7, 3], landing: [64, 129] } },
    { label: "Ashfield ⇄ Cinder Track", a: { map: "emb_fld_01", trigger: [93, 0, 7, 3], landing: [96, 10] }, b: { map: "emb_fld_02", trigger: [53, 145, 7, 3], landing: [56, 137] } },
    { label: "Cinder Track ⇄ Forge Approach", a: { map: "emb_fld_02", trigger: [0, 37, 3, 7], landing: [11, 40] }, b: { map: "emb_fld_03", trigger: [125, 43, 3, 7], landing: [117, 48] } },
    { label: "Forge Approach ⇄ Magma Vents", a: { map: "emb_fld_03", trigger: [37, 0, 7, 3], landing: [40, 10] }, b: { map: "emb_fld_04", trigger: [37, 113, 7, 3], landing: [40, 104] } },
    { label: "Magma Vents ⇄ Ironfall", a: { map: "emb_fld_04", trigger: [149, 55, 3, 7], landing: [141, 58] }, b: { map: "emb_fld_05", trigger: [0, 49, 3, 7], landing: [11, 52] } },
    { label: "Ironfall ⇄ Red Crucible", a: { map: "emb_fld_05", trigger: [141, 27, 3, 7], landing: [133, 32] }, b: { map: "emb_fld_06", trigger: [0, 33, 3, 7], landing: [11, 36] } },
    { label: "Red Crucible ⇄ Furnace Zero", a: { map: "emb_fld_06", trigger: [83, 125, 7, 3], landing: [86, 116] }, b: { map: "emb_dun_01", trigger: [57, 0, 7, 3], landing: [60, 11] } },
  ],
  monsters,
  materials,
  items,
  shops: [{ id: "shop_emb_supply", npc_id: "npc_emb_merchant", items: [{ item_id: "itm_0075", base_price: 8 }, { item_id: "itm_0076", base_price: 25 }, { item_id: "itm_0077", base_price: 30 }] }],
  recipes,
  quests,
  dialogues,
};
