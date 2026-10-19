// NOCTHAVEN — the abandoned megacity of the Meridian Lattice (Lv 75-99, the endgame).
//
// Follows the Lumeris conventions (content/regions/lum.ts):
//  * Umbracrest has the five service NPCs round a real plaza, plus two gate
//    guards; every field has a camp (safe area + scout) at its main entrance
//  * fields climb ~3-4 levels at a time (75 → 97): 24 levels across six fields
//    and a dungeon leave less room than Emberfall's 30, and the last band has
//    to stop at the Lv99 cap. Lattice Heart tops it at 99.
//  * each field has 3-4 pockets summing to 114-120 alive
//  * every link is two warps with distinct edge triggers and landings 7+
//    cells inside, in a safe camp
//  * species follow the city: scavengers and light-eaters in the dark
//    outskirts, possessed haulers on the old routes, lattice constructs
//    thicker the closer you get to the Meridian Gate
//
// Geography (north up):
//
//   Meridian Gate ── Black Array ── Veil Rift
//        │                              │
//   Lattice Heart      Umbracrest ── Silent Tracks
//    (below the Gate)      │               │
//                      Dusk Verge ──── Nullgarden
//
// Umbracrest's South Gate opens on the Dusk Verge outskirts; its East Gate is
// the old rail station onto the Silent Tracks. The outskirts run east into
// the Nullgarden park, which climbs north to the rail yards. The tracks lead
// north into the Veil Rift, the Rift west into the Black Array, the Array
// west to the Meridian Gate, and the Gate down into the Lattice Heart.

import type { DialogueDef, ItemDef, NpcDef, Prop, QuestDef, RecipeDef } from "../../src/data/schema";
import { expToNext } from "../model";
import type { MapDesign, RegionDesign } from "../types";

const questExp = (level: number, share: number) => Math.round(expToNext(level) * share);

// --- monsters ------------------------------------------------------------------

const LATTICE_NODE = "itm_0266";
const KEYSIGIL = "itm_0268";

const monsters: RegionDesign["monsters"] = [
  {
    id: "mob_0032", name: "Null Wisp", level: 76, archetype: "swarm", family: "spirit", element: "shadow", behavior: "passive",
    mods: { hp: 1.1, speed: 1.2 }, why: "Swollen with drained light (+10% HP), drifting (20% slower). Passive: wisps only feed, so the first Nocthaven field can be gathered with a taunt like Lumeris's meadows, at endgame numbers.",
    drops: { common: "itm_0063", uncommon: "itm_0064" },
    ecology: "Knots of violet energy that bled out of the city's cracked conduits; they drift where any light is left (streetlamps, conduit glow) and drink it until it goes dark.",
    art_brief: "A floating smudge of violet-black light with a hollow white core, trailing wisps that dim everything they pass; no face.",
  },
  {
    id: "mob_0090", name: "Gutter Lurk", level: 77, archetype: "swarm", family: "beast", element: "shadow", behavior: "assist",
    mods: { atk: 1.1, speed: 0.85 }, why: "Scavenger teeth (+10% ATK), quick (15% faster). Assist: lurk packs answer a squeal from anywhere in the underpass, the region's first 'one hit pulls the street' lesson.",
    drops: { common: "itm_0250", uncommon: "itm_0251" },
    ecology: "Pale, long-limbed scavengers that live under the fallen overpasses and in the drowned gutters of the outskirts, picking over what the wisps leave behind.",
    art_brief: "A hairless grey cat-sized scavenger with long fingers, huge reflective eyes and a ridge of violet-lit bristles along the spine.",
  },
  {
    id: "mob_0033", name: "Shade Carrier", level: 80, archetype: "bruiser", family: "construct", element: "shadow", behavior: "aggressive",
    mods: { hp: 1.1, speed: 0.9 }, why: "A cargo hauler's chassis (+10% HP) that still runs at route speed (10% faster for a bruiser). Aggressive: the shadow inside keeps the old delivery schedule and rams whatever stands on its route.",
    drops: { common: "itm_0065", uncommon: "itm_0066" },
    ecology: "City haulers whose drivers are long gone; a shadow took the cabs and drives the old delivery loop round the park promenade and the dead pond.",
    art_brief: "A boxy six-wheeled freight hauler with a smashed cab full of moving shadow, violet headlamps, cargo doors that open like a jaw.",
  },
  {
    id: "mob_0091", name: "Nullbloom", level: 80, archetype: "support", family: "plant", element: "nature", behavior: "assist",
    mods: { hp: 1.1, speed: 1.6 }, why: "Rooted (60% slower: it barely shuffles) and fibrous (+10% HP). Support + assist: blooms shade the haulers and blooms fighting near them, so the Nullgarden rewards burning the flowerbeds first.",
    drops: { common: "itm_0252", uncommon: "itm_0253" },
    ecology: "Flowers that grew under Aethrion grow-lamps after the lamps turned to null light; they drink colour itself and spread through the park beds and black glasshouses.",
    art_brief: "A waist-high flower with petals of matte black glass, a violet light-drinking eye at the centre, roots that leave grey patches where they walk.",
  },
  {
    id: "mob_0092", name: "Coupler Mite", level: 83, archetype: "swarm", family: "construct", element: "earth", behavior: "assist",
    mods: { def: 1.4, hp: 0.9 }, why: "Rail-steel carapace (+40% DEF) on a small body (-10% HP). Assist: mites work in crews, so the sidings empty in one pull. The tracks' signature horde.",
    drops: { common: "itm_0254", uncommon: "itm_0255" },
    ecology: "Track-maintenance mites that still couple and uncouple dead carriages in the rail yards; crews strip loose rail off the stalled line and the junction pit.",
    art_brief: "A beetle-sized steel mite shaped like a rail coupler, pincer jaws, a single violet status light blinking on its back.",
  },
  {
    id: "mob_0034", name: "Lattice Drone", level: 85, archetype: "ranged", family: "construct", element: "shadow", behavior: "aggressive",
    mods: { range: 6, hp: 0.9, speed: 0.85 }, why: "A hexagonal survey drone: fires lattice bolts from 6 cells (+1), light frame (-10% HP), hovers quickly (15% faster). The ranged lesson of the endgame, mixed into mite packs.",
    drops: { common: "itm_0067", uncommon: "itm_0068", rare: LATTICE_NODE },
    ecology: "Lattice survey drones that patrol the signal gantries and the junction pit over the rail yards, firing on anything that breaks the grid.",
    art_brief: "A floating hexagonal frame of dark metal around a violet lattice core, six thin vanes, a lens that tracks before it fires.",
  },
  {
    id: "mob_0093", name: "Riftling", level: 87, archetype: "swarm", family: "spirit", element: "shadow", behavior: "aggressive",
    mods: { atk: 1.15 }, why: "Made of the Veil's edge (+15% ATK). The horde of the Rift: aggressive, unremarkable in bulk, deadly if you let fifty of them circle you.",
    drops: { common: "itm_0256", uncommon: "itm_0257" },
    ecology: "Shadow that spilled from the tear in the Veil and took the shapes of the city's lost pets; they swarm the rift's edges and have overrun the whole district, from the tilted blocks to the leaning spires.",
    art_brief: "A dog-shaped hole in the world: a black silhouette with violet edges and white pinpoint eyes, flickering at the outline.",
  },
  {
    id: "mob_0094", name: "Sparkwing", level: 90, archetype: "swarm", family: "bird", element: "wind", behavior: "flee",
    mods: { hp: 0.9, speed: 0.7 }, why: "Hollow-boned (-10% HP) and the fastest thing in Nocthaven (30% faster); flees when hit, a chase target that scatters off the dishes and lands again. Rewards cone and line skills over circles.",
    drops: { common: "itm_0258", uncommon: "itm_0259" },
    ecology: "Birds that roost on the Black Array's receiver dishes and feed on the static arcing between the masts; a flock lifts when anything strikes it.",
    art_brief: "A crow-sized bird with feathers like copper foil, sparks crackling between the wingtips, violet arcs jumping when it lands.",
  },
  {
    id: "mob_0095", name: "Array Sentinel", level: 91, archetype: "construct", family: "construct", element: "shadow", behavior: "assist",
    mods: { def: 1.2, speed: 1.1 }, why: "Lattice-plated (+20% DEF), heavy (10% slower). Assist: sentinels hold formation, so one engaged means the ring. The sentinel automatons of the region's theme.",
    drops: { common: "itm_0260", uncommon: "itm_0261", rare: LATTICE_NODE, extra: [{ item_id: "itm_0073", rate_bp: 800 }] },
    ecology: "The city's guard automatons; the ones still powered stand in rings round the Black Array's great dish and pace the control lines north of it.",
    art_brief: "A tall, faceless sentinel in layered dark plate, a halberd of lattice light, a violet ring rotating behind its head.",
  },
  {
    id: "mob_0035", name: "Meridian Executor", level: 92, archetype: "elite", family: "construct", element: "shadow", behavior: "aggressive",
    mods: { attack_speed: 0.8, atk: 0.9 }, why: "Four blade-arms: it strikes 20% more often but each cut is lighter (-10% ATK). Elite: few in number, met in small courts, the region's mid-boss tier.",
    drops: { common: "itm_0069", uncommon: "itm_0070", rare: LATTICE_NODE },
    ecology: "The lattice's executioners, built to remove anything that tampers with the Meridian network. A single court of them guards the Meridian Gate.",
    art_brief: "A gaunt four-armed automaton in black ceramic, each arm ending in a long violet blade, a mask with a single vertical slit of light.",
  },
  {
    id: "mob_0096", name: "Glyph Swarm", level: 95, archetype: "swarm", family: "construct", element: "shadow", behavior: "aggressive",
    mods: { hp: 0.95, attack_speed: 0.85, speed: 0.85 }, why: "Living script: light (-5% HP), quick (15% faster, 15% quicker strikes). The densest horde in the game, round the Gate's convergence plaza, colonnade and verge.",
    drops: { common: "itm_0262", uncommon: "itm_0263" },
    ecology: "Floating glyphs of the Meridian Lattice's own language, policing the plazas where its lines converge; they thicken round the Gate, where the lines meet above the Heart.",
    art_brief: "A cloud of glowing violet glyphs that hangs together in the shape of a sigil, spinning when it attacks.",
  },
  {
    id: "mob_0097", name: "Lattice Weaver", level: 97, archetype: "ranged", family: "construct", element: "shadow", behavior: "aggressive",
    mods: { hp: 1.1, range: 6, attack_speed: 1.1 }, why: "Spins lattice threads across 6 cells (+1 range), sturdier than a drone (+10% HP), slower to fire (10% slower attacks). The last ranged test, holding every hall of the Heart.",
    drops: { common: "itm_0264", uncommon: "itm_0265", rare: LATTICE_NODE },
    ecology: "Spider-frames that repair the Meridian Lattice itself; they work the loom chamber inside the Heart and string new lines through its conduits and halls.",
    art_brief: "A long-legged spider of dark brass with a violet spinneret, drawing lines of light between its legs as it moves.",
  },
  {
    id: "mob_0098", name: "Lattice Sovereign", level: 99, archetype: "boss", family: "construct", element: "shadow", behavior: "aggressive",
    drops: { common: "itm_0262", uncommon: "itm_0265", rare: "itm_0267", extra: [{ item_id: LATTICE_NODE, rate_bp: 10000, qty: [1, 2] }, { item_id: "itm_0073", rate_bp: 10000, qty: [4, 6] }] },
    ecology: "The Meridian Lattice's own mind, woken by the Sundering. From the Heart it runs every drone, sentinel and glyph in Nocthaven; the violet grid across the city is its nervous system.",
    art_brief: "A vast crowned lattice of violet light suspended over the chamber floor, a dark crystalline core inside, sentinel-like arms unfolding from the grid.",
  },
];

// --- items -----------------------------------------------------------------------

const materials: RegionDesign["materials"] = [
  { id: "itm_0063", name: "Null Wisp Fragment", level: 76, tier: "common", description: "A dim shard of condensed null light. Cold to the touch." },
  { id: "itm_0064", name: "Null Wisp Core", level: 76, tier: "uncommon", description: "The hollow white heart of a Null Wisp, still drinking the light around it." },
  { id: "itm_0065", name: "Shade Carrier Fragment", level: 80, tier: "common", description: "A dented panel from a Shade Carrier's cargo hull." },
  { id: "itm_0066", name: "Shade Carrier Core", level: 80, tier: "uncommon", description: "A hauler's route computer, still murmuring stop names." },
  { id: "itm_0067", name: "Lattice Drone Fragment", level: 85, tier: "common", description: "A hexagonal frame segment from a Lattice Drone." },
  { id: "itm_0068", name: "Lattice Drone Core", level: 85, tier: "uncommon", description: "A drone's lattice core, faintly humming." },
  { id: "itm_0069", name: "Meridian Executor Fragment", level: 92, tier: "common", description: "A shard of an Executor's black ceramic shell." },
  { id: "itm_0070", name: "Meridian Executor Core", level: 92, tier: "uncommon", description: "The slit-mask lens of an Executor, its light gone out." },
  { id: "itm_0250", name: "Lurk Bristle", level: 77, tier: "common", description: "A violet-lit spine bristle from a Gutter Lurk." },
  { id: "itm_0251", name: "Lurk Eye-Lens", level: 77, tier: "uncommon", description: "The reflective lens from a Gutter Lurk's eye; it sees in the dark." },
  { id: "itm_0252", name: "Nullbloom Petal", level: 80, tier: "common", description: "A black glass petal that dims anything held behind it." },
  { id: "itm_0253", name: "Nullbloom Bulb", level: 80, tier: "uncommon", description: "The light-drinking bulb of a Nullbloom. Alchemists use it to draw out fatigue." },
  { id: "itm_0254", name: "Mite Coupler Pin", level: 83, tier: "common", description: "A rail-steel pin from a Coupler Mite's jaw." },
  { id: "itm_0255", name: "Mite Signal Chip", level: 83, tier: "uncommon", description: "The status-light chip from a Coupler Mite's back." },
  { id: "itm_0256", name: "Riftling Shadowhide", level: 87, tier: "common", description: "A scrap of Riftling outline. It folds smaller than it should." },
  { id: "itm_0257", name: "Riftling Veil-Eye", level: 87, tier: "uncommon", description: "A Riftling's pinpoint eye; looking through it shows the Veil." },
  { id: "itm_0258", name: "Sparkwing Quill", level: 90, tier: "common", description: "A copper-foil feather that crackles with static." },
  { id: "itm_0259", name: "Sparkwing Arc Gland", level: 90, tier: "uncommon", description: "The organ that stores a Sparkwing's charge. Handle by the edges." },
  { id: "itm_0260", name: "Sentinel Lattice Plate", level: 91, tier: "common", description: "A layered plate of sentinel armour." },
  { id: "itm_0261", name: "Sentinel Halo Relay", level: 91, tier: "uncommon", description: "The rotating ring from behind a sentinel's head." },
  { id: "itm_0262", name: "Glyph Shard", level: 95, tier: "common", description: "One glyph of the Lattice's language, fixed in crystal when its swarm broke." },
  { id: "itm_0263", name: "Glyph Seal", level: 95, tier: "uncommon", description: "A whole sigil, intact. Scholars in Umbracrest pay well to read them." },
  { id: "itm_0264", name: "Weaver Filament", level: 97, tier: "common", description: "A thread of solid lattice light from a Weaver's spinneret." },
  { id: "itm_0265", name: "Weaver Spinneret", level: 97, tier: "uncommon", description: "A Lattice Weaver's spinneret, still warm with violet light." },
  { id: "itm_0266", name: "Violet Lattice Node", level: 90, tier: "rare", description: "A junction of the Meridian Lattice, cut free and still carrying current. Drones, sentinels, executors and weavers are built round them." },
  { id: "itm_0267", name: "Sovereign Heart", level: 99, tier: "rare", description: "A shard of the Lattice Sovereign's crystalline core, the rarest thing a Wayfarer can carry out of Nocthaven." },
];

const items: ItemDef[] = [
  { id: KEYSIGIL, name: "Meridian Keysigil", category: "quest", rarity: "rare", sell_price: 0, stack_max: 1, description: "A glyph-key cut from an Executor's mask. The Heart Warden lets its bearer descend into the Lattice Heart." },
];

// Crafting turns surplus field materials into supplies cheaper than the shop
// (shop prices here are 7.25x Lumeris). Inputs always sell for more than the
// output, so crafting is never a money printer.
const recipes: RecipeDef[] = [
  { id: "rcp_noc_bristle_ration", npc_id: "npc_noc_craftsman", output: { item_id: "itm_0075", qty: 10 }, inputs: [{ item_id: "itm_0250", qty: 3 }], currency: 80 },
  { id: "rcp_noc_wisp_tonic", npc_id: "npc_noc_craftsman", output: { item_id: "itm_0076", qty: 8 }, inputs: [{ item_id: "itm_0064", qty: 1 }, { item_id: "itm_0063", qty: 2 }], currency: 150 },
  { id: "rcp_noc_bulb_focus", npc_id: "npc_noc_craftsman", output: { item_id: "itm_0077", qty: 8 }, inputs: [{ item_id: "itm_0253", qty: 1 }, { item_id: "itm_0252", qty: 2 }], currency: 180 },
];

// --- quests: a chain that walks the player through every map in level order ------

const R = "npc_noc_guild_registrar";
const quests: QuestDef[] = [
  { id: "q_noc_intro", title: "Nocthaven: First Survey", region_id: "noc", giver_npc_id: R, turn_in_npc_id: R, min_level: 75, prerequisite: null,
    objectives: [{ type: "kill", monster_id: "mob_0032", count: 60 }],
    rewards: { base_exp: questExp(75, 0.6), currency: 2600, items: [{ item_id: "itm_0075", qty: 15 }] },
    summary: "Put out the Null Wisps drinking the last streetlamps of the Dusk Verge." },
  { id: "q_noc_dusk_verge", title: "Under the Overpass", region_id: "noc", giver_npc_id: "npc_noc_dusk_scout", turn_in_npc_id: "npc_noc_dusk_scout", min_level: 76, prerequisite: "q_noc_intro",
    objectives: [{ type: "kill", monster_id: "mob_0090", count: 120 }, { type: "collect", item_id: "itm_0063", count: 15 }],
    rewards: { base_exp: questExp(76, 0.5), currency: 3200, items: [{ item_id: "itm_0076", qty: 8 }] },
    summary: "Assisting lurk packs pull the whole underpass; the wisp fragments point at the Artificer's tonic recipe." },
  { id: "q_noc_nullgarden", title: "The Garden That Drinks Light", region_id: "noc", giver_npc_id: "npc_noc_nullgarden_scout", turn_in_npc_id: "npc_noc_nullgarden_scout", min_level: 78, prerequisite: "q_noc_dusk_verge",
    objectives: [{ type: "visit", map_id: "noc_fld_02", count: 1 }, { type: "kill", monster_id: "mob_0091", count: 80 }, { type: "kill", monster_id: "mob_0033", count: 40 }],
    rewards: { base_exp: questExp(78, 0.45), currency: 3800, items: [{ item_id: "itm_0077", qty: 10 }] },
    summary: "Burn the Nullbloom beds and stop the haulers on the promenade." },
  { id: "q_noc_silent_tracks", title: "Dead Line, Live Signal", region_id: "noc", giver_npc_id: "npc_noc_tracks_scout", turn_in_npc_id: "npc_noc_tracks_scout", min_level: 81, prerequisite: "q_noc_nullgarden",
    objectives: [{ type: "kill", monster_id: "mob_0092", count: 150 }, { type: "kill", monster_id: "mob_0034", count: 60 }],
    rewards: { base_exp: questExp(81, 0.45), currency: 4500, items: [{ item_id: "itm_0076", qty: 10 }] },
    summary: "Mite crews in the sidings, drones on the gantries: pull the ranged drones into the mite packs." },
  { id: "q_noc_veil_rift", title: "Mind the Rift", region_id: "noc", giver_npc_id: "npc_noc_rift_scout", turn_in_npc_id: "npc_noc_rift_scout", min_level: 85, prerequisite: "q_noc_silent_tracks",
    objectives: [{ type: "kill", monster_id: "mob_0093", count: 150 }, { type: "collect", item_id: "itm_0257", count: 5 }],
    rewards: { base_exp: questExp(85, 0.4), currency: 5400, items: [{ item_id: "itm_0077", qty: 12 }] },
    summary: "Riftling trains on both sides of the chasm; the Veil-Eyes go to the Guild's scholars." },
  { id: "q_noc_black_array", title: "Listening Post", region_id: "noc", giver_npc_id: "npc_noc_array_scout", turn_in_npc_id: "npc_noc_array_scout", min_level: 89, prerequisite: "q_noc_veil_rift",
    objectives: [{ type: "kill", monster_id: "mob_0095", count: 60 }, { type: "kill", monster_id: "mob_0094", count: 120 }],
    rewards: { base_exp: questExp(89, 0.4), currency: 6400, items: [{ item_id: "itm_0076", qty: 12 }] },
    summary: "Break the sentinel ring round the great dish and scatter the Sparkwing flocks." },
  { id: "q_noc_meridian_gate", title: "Executioners at the Gate", region_id: "noc", giver_npc_id: "npc_noc_gate_scout", turn_in_npc_id: "npc_noc_gate_medic", min_level: 93, prerequisite: "q_noc_black_array",
    objectives: [{ type: "kill", monster_id: "mob_0035", count: 12 }, { type: "kill", monster_id: "mob_0096", count: 150 }],
    rewards: { base_exp: questExp(93, 0.4), currency: 7600, items: [{ item_id: KEYSIGIL, qty: 1 }, { item_id: LATTICE_NODE, qty: 1 }] },
    summary: "Clear the Executor court and the glyph plaza; the Keysigil cut from their masks opens the Lattice Heart." },
  { id: "q_noc_lattice_heart", title: "The Lattice Heart", region_id: "noc", giver_npc_id: "npc_noc_gate_medic", turn_in_npc_id: R, min_level: 96, prerequisite: "q_noc_meridian_gate",
    objectives: [{ type: "kill", monster_id: "mob_0098", count: 1 }],
    rewards: { base_exp: questExp(96, 0.8), currency: 15000, items: [{ item_id: LATTICE_NODE, qty: 2 }, { item_id: "itm_0076", qty: 15 }] },
    summary: "Silence the Lattice Sovereign and report to Umbracrest. The end of the Wayfarer's road through Elyndra." },
];

// --- maps --------------------------------------------------------------------------

const npc = (id: string, name: string, position: [number, number], facing: NpcDef["facing"], role: NpcDef["role"], extra: Partial<NpcDef> = {}): Omit<NpcDef, "map_id"> =>
  ({ id, name, position, facing, role, dialogue_id: id.replace(/^npc_/, "dlg_"), shop_id: null, ...extra });

const fieldCost = (minLevel: number) => 10 + 4 * minLevel;
/** Capital-to-capital transit, priced on the destination region's starting level. */
const capitalCost = (destMinLevel: number) => 300 + 15 * destMinLevel;

const umbracrest: MapDesign = {
  id: "noc_town_01", name: "Umbracrest", type: "town", role: "Region capital: services, quest hub, crafting, transit to Nocthaven fields and Cindervale.",
  levels: [75, 99], size: [150, 128], arrival: [72, 70], ground: "metal", theme: "the last lit district of the dead megacity: a walled plaza of dark towers round a still-working lattice obelisk",
  border: { width: 3, kind: "ruin_wall" },
  roads: [
    { points: [[72, 62], [72, 100], [80, 127]], width: 5, kind: "stone" },
    { points: [[72, 62], [110, 62], [149, 56]], width: 5, kind: "brass" },
    { points: [[72, 62], [40, 62], [32, 44]], width: 3, kind: "stone" },
    { points: [[72, 62], [72, 30], [88, 16]], width: 3, kind: "stone" },
    { points: [[72, 100], [54, 102]], width: 3, kind: "stone" },
  ],
  blockers: [
    { kind: "building", shape: { rect: [22, 26, 22, 14] } }, // Guild tower
    { kind: "building", shape: { rect: [96, 70, 14, 10] } }, // Medic house
    { kind: "building", shape: { rect: [34, 78, 18, 12] } }, // Artificer's workshop
    { kind: "building", shape: { rect: [6, 96, 18, 26] } },
    { kind: "building", shape: { rect: [108, 92, 30, 24] } },
    { kind: "building", shape: { rect: [100, 16, 22, 16] } },
    { kind: "building", shape: { rect: [126, 6, 18, 30] } },
    { kind: "building", shape: { rect: [6, 6, 14, 12] } },
    { kind: "building", shape: { rect: [48, 6, 16, 10] } },
  ],
  props: [
    { kind: "lattice_obelisk", x: 72, y: 62, block: 3, scale: 1.6 },
    { kind: "aether_pylon", x: 64, y: 54, block: 1 }, { kind: "aether_pylon", x: 80, y: 54, block: 1 },
    { kind: "aether_pylon", x: 64, y: 70, block: 1 }, { kind: "aether_pylon", x: 80, y: 70, block: 1 },
    { kind: "hall", x: 33, y: 33, block: 0, scale: 1.4 },
    { kind: "market_stall", x: 84, y: 50, block: 2 }, { kind: "market_stall", x: 90, y: 50, block: 2 }, { kind: "market_stall", x: 96, y: 50, block: 2 },
    { kind: "transit_gate", x: 52, y: 104, block: 3 },
    { kind: "workshop", x: 43, y: 84, block: 0 }, { kind: "anvil", x: 50, y: 93, block: 1 },
    { kind: "observatory", x: 88, y: 12, block: 0, scale: 1.2 },
    { kind: "statue", x: 58, y: 44, block: 2 },
    { kind: "lamp_post", x: 76, y: 90, block: 1 }, { kind: "lamp_post", x: 100, y: 59, block: 1 }, { kind: "lamp_post", x: 125, y: 54, block: 1 },
    { kind: "lamp_post", x: 69, y: 40, block: 1 }, { kind: "lamp_post", x: 48, y: 59, block: 1 },
    { kind: "crate", x: 102, y: 48, block: 1 }, { kind: "crate", x: 103, y: 49, block: 1 },
  ],
  scatter: [
    { kind: "gear_ruin", count: 16, block: 1, scale: [0.6, 1] },
    { kind: "dead_tree", count: 20, block: 1, scale: [0.8, 1.1] },
    { kind: "rock", count: 30, block: 0, scale: [0.5, 0.9] },
  ],
  landmarks: [
    { id: "lm_noc_obelisk", name: "The Last Obelisk", kind: "plaza", x: 72, y: 62, note: "Respawn point; the only lattice obelisk in the city still lighting the streets. The services face it." },
    { id: "lm_noc_guild", name: "Wayfarer Guild, Umbracrest Tower", kind: "plaza", x: 33, y: 33, note: "Quest hub." },
    { id: "lm_noc_south_gate", name: "South Gate", kind: "gate", x: 80, y: 122, note: "To the Dusk Verge (Lv75-79)." },
    { id: "lm_noc_station", name: "East Station", kind: "gate", x: 144, y: 56, note: "The rail platform onto the Silent Tracks (Lv81-86)." },
    { id: "lm_noc_transit", name: "Transit Station", kind: "plaza", x: 52, y: 104, note: "Paid travel to field camps and Cindervale." },
    { id: "lm_noc_workshop", name: "Artificer's Workshop", kind: "plaza", x: 43, y: 84, note: "Turns field materials into supplies." },
    { id: "lm_noc_north", name: "Sealed North Gate", kind: "lookout", x: 88, y: 12, note: "Faces the Black Array; sealed since the Sundering." },
  ],
  safe_areas: [[0, 0, 150, 128]],
  pockets: [],
  npcs: [
    npc("npc_noc_guild_registrar", "Umbracrest Guild Registrar", [36, 42], "S", "guild_registrar"),
    npc("npc_noc_merchant", "Umbracrest Supply Merchant", [88, 55], "S", "merchant", { shop_id: "shop_noc_supply" }),
    npc("npc_noc_healer", "Umbracrest Field Medic", [103, 82], "NW", "healer"),
    npc("npc_noc_teleporter", "Umbracrest Transit Operator", [58, 99], "SW", "teleporter", {
      destinations: [
        ["noc_fld_01", fieldCost(75)], ["noc_fld_02", fieldCost(78)], ["noc_fld_03", fieldCost(81)],
        ["noc_fld_04", fieldCost(85)], ["noc_fld_05", fieldCost(89)], ["noc_fld_06", fieldCost(93)],
        ["emb_town_01", capitalCost(60)],
      ],
    }),
    npc("npc_noc_craftsman", "Umbracrest Artificer", [44, 92], "N", "craftsman"),
    npc("npc_noc_south_gate_guard", "South Gate Sentry", [70, 114], "S", "guard"),
    npc("npc_noc_east_gate_guard", "Station Sentry", [136, 52], "W", "guard"),
  ],
};

const duskVerge: MapDesign = {
  id: "noc_fld_01", name: "Dusk Verge", type: "field", role: "First field: the collapsed outskirts. Passive wisps on the boulevard and the fallen overpass, lurk packs in the underpass, both mixed in the conduit square.",
  levels: [75, 79], size: [132, 120], arrival: [60, 11], ground: "stone", theme: "the megacity's fallen outskirts at permanent dusk: toppled overpasses, dead streetlamps, violet light leaking from cracked conduits",
  border: { width: 4, kind: "ruin_wall" },
  roads: [
    { points: [[60, 0], [60, 30], [48, 56], [66, 74]], width: 4, kind: "stone" },
    { points: [[66, 74], [100, 80], [131, 80]], width: 4, kind: "stone" },
    { points: [[66, 74], [60, 100], [40, 112]], width: 3, kind: "dirt" },
    { points: [[48, 56], [22, 40], [14, 20]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "building", shape: { rect: [80, 18, 18, 14] } },
    { kind: "building", shape: { rect: [104, 40, 14, 18] } },
    { kind: "building", shape: { rect: [20, 66, 12, 10] } },
    { kind: "chasm", shape: { poly: [[76, 92], [110, 96], [124, 108], [96, 114], [80, 104]] } }, // collapsed street
    { kind: "ruin_wall", shape: { rect: [36, 30, 2, 14] } },
    { kind: "ruin_wall", shape: { rect: [90, 60, 14, 2] } },
    { kind: "rock", shape: { ellipse: [22, 98, 3, 2] } },
  ],
  props: [
    { kind: "tent", x: 55, y: 8, block: 2 }, { kind: "tent", x: 124, y: 74, block: 2 },
    { kind: "lamp_post", x: 56, y: 40, block: 1 }, { kind: "lamp_post", x: 40, y: 104, block: 1 }, { kind: "lamp_post", x: 30, y: 92, block: 1 },
    { kind: "lamp_post", x: 84, y: 82, block: 1 },
    { kind: "lattice_obelisk", x: 58, y: 86, block: 2 },
    { kind: "brass_pipe", x: 74, y: 52, block: 0 }, { kind: "brass_pipe", x: 92, y: 40, block: 0 },
    { kind: "gear_ruin", x: 16, y: 34, block: 2 }, { kind: "statue", x: 28, y: 18, block: 2 },
  ],
  scatter: [
    { kind: "gear_ruin", count: 30, block: 1, scale: [0.6, 1.1] },
    { kind: "boulder", count: 30, block: 1, scale: [0.8, 1.2] },
    { kind: "dead_tree", count: 30, block: 1, scale: [0.7, 1.1] },
    { kind: "rock", count: 60, block: 0, scale: [0.5, 1] },
  ],
  landmarks: [
    { id: "lm_noc_dusk_camp", name: "Gate Camp", kind: "camp", x: 60, y: 11, note: "Arrival from Umbracrest's South Gate." },
    { id: "lm_noc_dusk_cross", name: "Conduit Crossing", kind: "crossroads", x: 66, y: 74, note: "Three streets meet under a cracked conduit." },
    { id: "lm_noc_dusk_boulevard", name: "Wisp Boulevard", kind: "farm", x: 24, y: 98, note: "Null Wisps drink the last streetlamps." },
    { id: "lm_noc_dusk_underpass", name: "The Underpass", kind: "farm", x: 87, y: 47, note: "Gutter Lurk packs under the fallen overpass." },
    { id: "lm_noc_dusk_overpass", name: "Overpass Fall", kind: "ruin", x: 21, y: 30, note: "Null Wisps drift along the broken route." },
    { id: "lm_noc_dusk_chasm", name: "Sunken Street", kind: "lookout", x: 100, y: 104, note: "A whole street fell into the undercity here." },
    { id: "lm_noc_dusk_east", name: "Park Gate", kind: "gate", x: 124, y: 80, note: "To the Nullgarden (Lv78-82)." },
  ],
  safe_areas: [[52, 4, 16, 14], [113, 72, 15, 15]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "wisp_boulevard", name: "Wisp Boulevard", rects: [[6, 84, 36, 28]], species: [{ monster_id: "mob_0032", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "Open boulevard of passive wisps (~25 cells each): the safe first horde of the endgame, gathered with a taunt." },
    { id: "lurk_underpass", name: "The Underpass", rects: [[72, 36, 30, 22]], species: [{ monster_id: "mob_0090", weight: 1 }], target_alive: 35, respawn_sec: [6, 13],
      design_note: "Assisting scavengers between two tower stumps: one squeal pulls the underpass, so it is sized for a 20-30 train with walls on two sides to stack against." },
    { id: "overpass_fall", name: "Overpass Fall", rects: [[8, 10, 26, 40]], species: [{ monster_id: "mob_0032", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Passive wisps drifting along the fallen overpass by the west road: a quieter second boulevard, gathered with a taunt well away from the lurk packs." },
    { id: "conduit_square", name: "Conduit Square", rects: [[46, 80, 24, 18]], species: [{ monster_id: "mob_0032", weight: 50 }, { monster_id: "mob_0090", weight: 50 }], target_alive: 20, respawn_sec: [7, 15],
      design_note: "Lurks hunt among the wisps under the obelisk: assisting scavengers drag passive wisps into a fight, the mixed-AI lesson of the region." },
  ],
  npcs: [npc("npc_noc_dusk_scout", "Verge Scout Ilse", [64, 10], "S", "scout")],
};

const nullgarden: MapDesign = {
  id: "noc_fld_02", name: "Nullgarden", type: "field", role: "A city park gone colourless: Nullbloom beds and black glasshouses, haulers on the promenade and round the dead pond.",
  levels: [78, 82], size: [120, 136], arrival: [11, 96], ground: "moss", theme: "a megacity park under null-light grow-lamps: black glass greenhouses, grey trees, beds of light-drinking blooms",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 96], [30, 96], [52, 84], [60, 60], [70, 30], [70, 0]], width: 4, kind: "stone" },
    { points: [[52, 84], [80, 100], [100, 118]], width: 3, kind: "dirt" },
    { points: [[60, 60], [30, 44], [20, 24]], width: 3, kind: "dirt" },
    { points: [[60, 60], [86, 58]], width: 3, kind: "boardwalk" },
  ],
  blockers: [
    { kind: "water", shape: { ellipse: [98, 50, 10, 12] } }, // the dead pond
    { kind: "crystal", shape: { rect: [92, 100, 10, 8] } }, // black glasshouse
    { kind: "crystal", shape: { rect: [16, 110, 12, 8] } },
    { kind: "forest", shape: { ellipse: [34, 70, 8, 6] } },
    { kind: "fence", shape: { rect: [10, 48, 26, 1] } },
    { kind: "fence", shape: { rect: [44, 14, 1, 20] } },
  ],
  props: [
    { kind: "tent", x: 7, y: 90, block: 2 }, { kind: "tent", x: 76, y: 8, block: 2 },
    { kind: "fountain", x: 60, y: 60, block: 2, scale: 1.1 },
    { kind: "lamp_post", x: 24, y: 30, block: 1 }, { kind: "lamp_post", x: 36, y: 20, block: 1 }, { kind: "lamp_post", x: 84, y: 72, block: 1 },
    { kind: "aether_pylon", x: 94, y: 88, block: 1 },
    { kind: "statue", x: 74, y: 44, block: 2 },
    { kind: "dock", x: 87, y: 58, block: 0 },
    { kind: "brass_pipe", x: 70, y: 116, block: 0 },
  ],
  scatter: [
    { kind: "dead_tree", count: 70, block: 1, scale: [0.8, 1.3] },
    { kind: "bush", count: 120, block: 0, scale: [0.6, 1.1] },
    { kind: "crystal", count: 20, area: [62, 100, 44, 28], block: 1, scale: [0.6, 1] },
    { kind: "tree", count: 30, block: 1, scale: [0.8, 1.2] },
  ],
  landmarks: [
    { id: "lm_noc_garden_camp", name: "Park Gate Camp", kind: "camp", x: 11, y: 96, note: "Arrival from the Dusk Verge." },
    { id: "lm_noc_garden_fountain", name: "Dry Fountain", kind: "crossroads", x: 60, y: 60, note: "The park's paths meet at a dry Aethrion fountain." },
    { id: "lm_noc_garden_beds", name: "Nullbloom Beds", kind: "farm", x: 25, y: 29, note: "Flowerbeds of black glass blooms." },
    { id: "lm_noc_garden_pond", name: "Dead Pond", kind: "farm", x: 95, y: 76, note: "Shade Carriers loop the boardwalk shore." },
    { id: "lm_noc_garden_glass", name: "Black Glasshouses", kind: "ruin", x: 84, y: 114, note: "Blooms crowd the aisles under black glass." },
    { id: "lm_noc_garden_promenade", name: "Promenade", kind: "farm", x: 35, y: 64, note: "Shade Carriers still make park deliveries." },
    { id: "lm_noc_garden_north", name: "Yard Gate", kind: "gate", x: 70, y: 8, note: "North to the Silent Tracks (Lv81-86)." },
  ],
  safe_areas: [[4, 89, 15, 14], [62, 4, 16, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "nullbloom_beds", name: "Nullbloom Beds", rects: [[8, 14, 34, 30]], species: [{ monster_id: "mob_0091", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Rooted supports in fenced beds: they barely move, so the beds are a static AoE farm. Sized at ~33 cells each so a cone clears a row at a time." },
    { id: "pond_shore", name: "Dead Pond", rects: [[78, 64, 34, 28]], species: [{ monster_id: "mob_0033", weight: 1 }], target_alive: 35, respawn_sec: [5, 12],
      design_note: "Haulers on the boardwalk shore: aggressive bruisers on an open loop round the water, met one or two at a time." },
    { id: "black_glasshouses", name: "Black Glasshouses", rects: [[62, 100, 44, 28]], species: [{ monster_id: "mob_0091", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Blooms shade each other in packs: burn a row before the next one wakes. Glass and crystal break the hall into aisles." },
    { id: "promenade", name: "Promenade", rects: [[20, 52, 30, 26]], species: [{ monster_id: "mob_0033", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Haulers run a loop round the grey copse: aggressive bruisers that come one at a time round the trees." },
  ],
  npcs: [npc("npc_noc_nullgarden_scout", "Park Scout Merrin", [14, 91], "E", "scout")],
};

const silentTracks: MapDesign = {
  id: "noc_fld_03", name: "Silent Tracks", type: "field", role: "The elevated rail yards east of Umbracrest: mite crews in the sidings and on the stalled line, drones on the signal gantries.",
  levels: [81, 86], size: [156, 100], arrival: [11, 50], ground: "metal", theme: "elevated maglev yards on violet-lit pylons over the undercity: dead tracks, stalled carriages, signal towers",
  border: { width: 4, kind: "chasm" },
  roads: [
    { points: [[0, 50], [40, 50], [80, 46], [120, 48]], width: 4, kind: "brass" },
    { points: [[120, 48], [120, 0]], width: 4, kind: "brass" },
    { points: [[40, 50], [40, 99]], width: 4, kind: "brass" },
    { points: [[80, 46], [108, 74], [140, 82]], width: 3, kind: "brass" },
  ],
  blockers: [
    { kind: "chasm", shape: { poly: [[52, 60], [72, 62], [74, 94], [50, 96]] } }, // gap between viaducts
    { kind: "machine", shape: { rect: [60, 30, 14, 4] } }, // stalled carriages
    { kind: "machine", shape: { rect: [96, 56, 16, 4] } },
    { kind: "machine", shape: { rect: [128, 88, 14, 4] } },
    { kind: "building", shape: { rect: [14, 12, 8, 8] } }, // signal tower
  ],
  props: [
    { kind: "tent", x: 7, y: 45, block: 2 }, { kind: "tent", x: 34, y: 84, block: 2 }, { kind: "tent", x: 126, y: 8, block: 2 },
    { kind: "lattice_obelisk", x: 18, y: 16, block: 0, scale: 1.3 },
    { kind: "aether_pylon", x: 60, y: 42, block: 1 }, { kind: "aether_pylon", x: 100, y: 42, block: 1 }, { kind: "aether_pylon", x: 116, y: 54, block: 1 },
    { kind: "lamp_post", x: 36, y: 56, block: 1 }, { kind: "lamp_post", x: 124, y: 30, block: 1 },
    { kind: "brass_pipe", x: 80, y: 20, block: 0 }, { kind: "brass_pipe", x: 140, y: 40, block: 0 },
  ],
  scatter: [
    { kind: "crate", count: 30, block: 1, scale: [0.8, 1.2] },
    { kind: "gear_ruin", count: 24, block: 1, scale: [0.6, 1] },
    { kind: "brass_pipe", count: 30, block: 0, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_noc_tracks_camp", name: "Platform Camp", kind: "camp", x: 11, y: 50, note: "Arrival from Umbracrest's East Station." },
    { id: "lm_noc_tracks_junction", name: "Main Junction", kind: "crossroads", x: 80, y: 46, note: "The main line meets the siding." },
    { id: "lm_noc_tracks_sidings", name: "Coupler Sidings", kind: "farm", x: 104, y: 76, note: "Mite crews coupling dead carriages." },
    { id: "lm_noc_tracks_gantries", name: "Signal Gantries", kind: "farm", x: 78, y: 22, note: "Lattice Drones patrol the signals." },
    { id: "lm_noc_tracks_stalled", name: "Stalled Line", kind: "ruin", x: 28, y: 22, note: "Mite crews strip the dead route for rail." },
    { id: "lm_noc_tracks_south", name: "Park Stair", kind: "gate", x: 40, y: 92, note: "Down to the Nullgarden (Lv78-82)." },
    { id: "lm_noc_tracks_north", name: "Rift Viaduct", kind: "gate", x: 120, y: 8, note: "North to the Veil Rift (Lv85-90)." },
  ],
  safe_areas: [[4, 43, 14, 14], [32, 80, 16, 14], [112, 4, 16, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "coupler_sidings", name: "Coupler Sidings", rects: [[84, 62, 40, 30]], species: [{ monster_id: "mob_0092", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature horde: 40 assisting mite crews in the open sidings (~30 cells each); one pull is the yard, a 30-40 train for the big AoE." },
    { id: "stalled_line", name: "Stalled Line", rects: [[8, 8, 40, 30]], species: [{ monster_id: "mob_0092", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Assisting mite crews on the stalled line behind the signal tower: a smaller yard next to the camp, one crew to a pull." },
    { id: "signal_gantries", name: "Signal Gantries", rects: [[56, 8, 44, 30]], species: [{ monster_id: "mob_0034", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Ranged drones among stalled carriages: the carriages block their line of fire, so players break LOS and pull them in." },
    { id: "junction_pit", name: "Junction Pit", rects: [[132, 20, 20, 50]], species: [{ monster_id: "mob_0092", weight: 60 }, { monster_id: "mob_0034", weight: 40 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "A long narrow strip at the yard's east end: mites rush along it while drones fire down its length, a corridor fight." },
  ],
  npcs: [npc("npc_noc_tracks_scout", "Yard Scout Corvin", [14, 45], "E", "scout")],
};

const veilRift: MapDesign = {
  id: "noc_fld_04", name: "Veil Rift", type: "field", role: "A district torn by a rift in the Veil: Riftlings swarm both banks of the chasm, the tilted blocks and the spires above.",
  levels: [85, 90], size: [128, 132], arrival: [96, 121], ground: "stone", theme: "tilted streets on either side of a violet tear in the Veil, rubble hanging in the air above it",
  border: { width: 4, kind: "ruin_wall" },
  roads: [
    { points: [[96, 131], [96, 100], [80, 74], [60, 56], [30, 40], [0, 40]], width: 4, kind: "stone" },
    { points: [[86, 84], [66, 60]], width: 4, kind: "bridge" }, // Rift Bridge
    { points: [[96, 100], [50, 110], [26, 96], [20, 70]], width: 3, kind: "dirt" },
    { points: [[25, 100], [22, 86]], width: 3, kind: "bridge" }, // the narrow crossing
    { points: [[60, 56], [70, 30], [88, 16]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "chasm", shape: { poly: [[4, 96], [40, 80], [70, 64], [100, 40], [124, 28], [124, 40], [104, 52], [74, 76], [44, 92], [4, 108]] } },
    { kind: "building", shape: { rect: [98, 8, 14, 12] } }, // tilted tower
    { kind: "rock", shape: { ellipse: [40, 24, 6, 4] } },
    { kind: "crystal", shape: { ellipse: [60, 112, 4, 3] } },
    { kind: "building", shape: { rect: [10, 82, 6, 6] } },
  ],
  props: [
    { kind: "tent", x: 90, y: 116, block: 2 }, { kind: "tent", x: 9, y: 35, block: 2 },
    { kind: "lattice_obelisk", x: 76, y: 92, block: 2 },
    { kind: "crystal", x: 84, y: 66, block: 0, scale: 1.4 }, { kind: "crystal", x: 50, y: 78, block: 0, scale: 1.2 }, { kind: "crystal", x: 110, y: 46, block: 0, scale: 1.3 },
    { kind: "statue", x: 30, y: 60, block: 2 },
    { kind: "lamp_post", x: 92, y: 104, block: 1 }, { kind: "lamp_post", x: 56, y: 52, block: 1 },
    { kind: "gear_ruin", x: 84, y: 30, block: 2 },
  ],
  scatter: [
    { kind: "boulder", count: 50, block: 1, scale: [0.8, 1.5] },
    { kind: "crystal", count: 30, block: 1, scale: [0.6, 1.2] },
    { kind: "gear_ruin", count: 16, block: 1, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_noc_rift_camp", name: "Viaduct Camp", kind: "camp", x: 96, y: 121, note: "Arrival from the Silent Tracks." },
    { id: "lm_noc_rift_bridge", name: "Rift Bridge", kind: "crossroads", x: 76, y: 72, note: "The main crossing of the tear." },
    { id: "lm_noc_rift_narrow", name: "Narrow Crossing", kind: "crossroads", x: 24, y: 93, note: "A plank bridge at the rift's west end." },
    { id: "lm_noc_rift_riftside", name: "Riftside", kind: "farm", x: 84, y: 91, note: "Riftlings pour out of the tear." },
    { id: "lm_noc_rift_blocks", name: "Tilted Blocks", kind: "ruin", x: 27, y: 63, note: "Riftlings prowl the tilted streets." },
    { id: "lm_noc_rift_spires", name: "Leaning Spires", kind: "farm", x: 72, y: 23, note: "Riftlings circle the leaning spires." },
    { id: "lm_noc_rift_west", name: "Array Road", kind: "gate", x: 8, y: 40, note: "West to the Black Array (Lv89-94)." },
  ],
  safe_areas: [[88, 113, 16, 13], [4, 33, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "riftside", name: "Riftside", rects: [[64, 80, 40, 22]], species: [{ monster_id: "mob_0093", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature horde on the south bank where the tear is widest: 40 aggressive Riftlings with the chasm at their back, so trains are pulled south, away from the edge." },
    { id: "tilted_blocks", name: "Tilted Blocks", rects: [[10, 50, 34, 26]], species: [{ monster_id: "mob_0093", weight: 1 }], target_alive: 30, respawn_sec: [6, 14],
      design_note: "Riftlings on the north bank by the Array road: a smaller pack away from the tear, a breather between Riftside trains." },
    { id: "leaning_spires", name: "Leaning Spires", rects: [[54, 8, 36, 30]], species: [{ monster_id: "mob_0093", weight: 1 }], target_alive: 25, respawn_sec: [7, 15],
      design_note: "Riftlings charge down from among the spires: the spires break up the pack, so trains arrive in strings." },
    { id: "lower_rift", name: "Lower Rift", rects: [[10, 110, 30, 16]], species: [{ monster_id: "mob_0093", weight: 1 }], target_alive: 20, respawn_sec: [8, 16],
      design_note: "A quiet south-west corner past the narrow crossing: a small Riftling pack for players who want a lighter pull." },
  ],
  npcs: [npc("npc_noc_rift_scout", "Rift Scout Tamsin", [101, 116], "N", "scout")],
};

// Receiver masts across the Array: a regular grid where it doesn't sit on a road.
const masts: Prop[] = [
  [108, 70], [124, 70], [108, 86], [124, 86], [132, 78], [116, 94],
  [40, 18], [46, 36], [20, 40], [36, 28],
  [56, 70], [84, 70], [68, 90], [86, 88],
  [104, 30], [128, 20],
].map(([x, y]) => ({ kind: "lattice_obelisk" as const, x, y, block: 1, scale: 0.9 }));

const blackArray: MapDesign = {
  id: "noc_fld_05", name: "Black Array", type: "field", role: "A receiver field of dishes and lattice masts still listening to the Meridian Lattice; sentinels ring the great dish and pace the control lines, Sparkwing flocks roost on the dishes and masts.",
  levels: [89, 94], size: [148, 112], arrival: [137, 44], ground: "metal", theme: "black receiver dishes and lattice masts with violet arcs jumping between them",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[147, 44], [120, 44], [96, 56], [60, 56], [30, 70], [0, 70]], width: 4, kind: "brass" },
    { points: [[96, 56], [96, 90], [110, 104]], width: 3, kind: "brass" },
    { points: [[60, 56], [60, 22], [80, 12]], width: 3, kind: "brass" },
  ],
  blockers: [
    { kind: "machine", shape: { rect: [70, 74, 10, 10] } }, // the great dish
    { kind: "machine", shape: { rect: [112, 16, 10, 10] } },
    { kind: "machine", shape: { rect: [24, 24, 10, 10] } },
    { kind: "building", shape: { rect: [84, 4, 14, 9] } }, // control house
    { kind: "chasm", shape: { rect: [40, 90, 40, 3] } }, // cable trench
  ],
  props: [
    ...masts,
    { kind: "observatory", x: 75, y: 79, block: 0, scale: 1.8 },
    { kind: "observatory", x: 117, y: 21, block: 0, scale: 1.3 },
    { kind: "observatory", x: 29, y: 29, block: 0, scale: 1.3 },
    { kind: "tent", x: 140, y: 38, block: 2 }, { kind: "tent", x: 7, y: 64, block: 2 },
    { kind: "aether_pylon", x: 100, y: 52, block: 1 },
    { kind: "lamp_post", x: 64, y: 60, block: 1 },
  ],
  scatter: [
    { kind: "crate", count: 20, block: 1, scale: [0.8, 1.1] },
    { kind: "brass_pipe", count: 40, block: 0, scale: [0.6, 1] },
    { kind: "rock", count: 50, block: 0, scale: [0.5, 1] },
    { kind: "boulder", count: 20, block: 1, scale: [0.8, 1.2] },
  ],
  landmarks: [
    { id: "lm_noc_array_camp", name: "Array Camp", kind: "camp", x: 137, y: 44, note: "Arrival from the Veil Rift." },
    { id: "lm_noc_array_junction", name: "Cable Junction", kind: "crossroads", x: 96, y: 56, note: "Three cable roads meet." },
    { id: "lm_noc_array_masts", name: "Mast Field", kind: "farm", x: 120, y: 80, note: "Sparkwing flocks among the masts." },
    { id: "lm_noc_array_dish", name: "The Great Dish", kind: "ruin", x: 75, y: 79, note: "Ringed by Array Sentinels." },
    { id: "lm_noc_array_static", name: "Static Dishes", kind: "farm", x: 34, y: 28, note: "Sparkwing flocks on the western dishes." },
    { id: "lm_noc_array_walk", name: "Control Walk", kind: "lookout", x: 118, y: 25, note: "Sentinels pace the control lines." },
    { id: "lm_noc_array_west", name: "Gate Road", kind: "gate", x: 8, y: 70, note: "West to the Meridian Gate (Lv93-97)." },
  ],
  safe_areas: [[128, 37, 16, 14], [4, 63, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "mast_field", name: "Mast Field", rects: [[100, 64, 40, 34]], species: [{ monster_id: "mob_0094", weight: 1 }], target_alive: 45, respawn_sec: [5, 12],
      design_note: "Fleeing flocks spread through the masts: the main horde, ~30 cells each; they scatter between the pillars when hit, so line skills down the mast rows pay best." },
    { id: "static_dishes", name: "Static Dishes", rects: [[16, 12, 36, 32]], species: [{ monster_id: "mob_0094", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "Fleeing flocks round the western dish: they scatter when hit and land again nearby, so cone and line skills that catch a whole flock pay best." },
    { id: "sentinel_ring", name: "Sentinel Ring", rects: [[52, 64, 36, 30]], species: [{ monster_id: "mob_0095", weight: 1 }], target_alive: 25, respawn_sec: [10, 20],
      design_note: "Assisting constructs round the great dish: engage one and the ring closes. Lattice Node and Aetherite source." },
    { id: "control_walk", name: "Control Walk", rects: [[100, 14, 36, 22]], species: [{ monster_id: "mob_0095", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Assisting sentinels pacing the control lines north of camp: engage one and the patrol closes, the ring's lesson stretched along a strip." },
  ],
  npcs: [npc("npc_noc_array_scout", "Array Scout Brannoc", [133, 39], "W", "scout")],
};

// Convergence ring: six obelisks round the plaza where the lattice lines meet.
const convergence: Prop[] = Array.from({ length: 6 }, (_, i) => ({
  kind: "lattice_obelisk" as const, x: Math.round(60 + 11 * Math.cos(((i + 0.5) * Math.PI) / 3)), y: Math.round(56 + 11 * Math.sin(((i + 0.5) * Math.PI) / 3)), block: 1,
}));

const meridianGate: MapDesign = {
  id: "noc_fld_06", name: "Meridian Gate", type: "field", role: "The last field: the monumental gate where Nocthaven's lattice lines converge. Glyph swarms on the plaza, colonnade and verge, the Executor court, and the sealed descent to the Heart.",
  levels: [93, 97], size: [120, 120], arrival: [109, 64], ground: "stone", theme: "glyph-lit plazas and colonnades round the convergence of the Meridian Lattice",
  border: { width: 4, kind: "ruin_wall" },
  roads: [
    { points: [[119, 64], [90, 64], [60, 56], [56, 80], [56, 119]], width: 5, kind: "stone" },
    { points: [[60, 56], [60, 24], [40, 12]], width: 3, kind: "stone" },
    { points: [[60, 56], [24, 48], [14, 70]], width: 3, kind: "stone" },
  ],
  blockers: [
    { kind: "ruin_wall", shape: { rect: [52, 12, 2, 4] } }, { kind: "ruin_wall", shape: { rect: [52, 22, 2, 4] } }, { kind: "ruin_wall", shape: { rect: [52, 30, 2, 4] } },
    { kind: "ruin_wall", shape: { rect: [67, 12, 2, 4] } }, { kind: "ruin_wall", shape: { rect: [67, 22, 2, 4] } }, { kind: "ruin_wall", shape: { rect: [67, 30, 2, 4] } },
    { kind: "building", shape: { rect: [8, 8, 20, 14] } },
    { kind: "crystal", shape: { ellipse: [96, 28, 8, 6] } },
    { kind: "chasm", shape: { ellipse: [92, 100, 12, 9] } },
  ],
  props: [
    ...convergence,
    { kind: "lattice_obelisk", x: 60, y: 56, block: 0, scale: 2 },
    { kind: "statue", x: 76, y: 20, block: 2 }, { kind: "statue", x: 44, y: 20, block: 2 },
    { kind: "tent", x: 112, y: 58, block: 2 }, { kind: "tent", x: 62, y: 110, block: 2 },
    { kind: "aether_pylon", x: 50, y: 98, block: 1 }, { kind: "aether_pylon", x: 63, y: 98, block: 1 },
    { kind: "rune_stone", x: 28, y: 86, block: 1 }, { kind: "rune_stone", x: 18, y: 96, block: 1 },
  ],
  scatter: [
    { kind: "rune_stone", count: 24, block: 1, scale: [0.7, 1.1] },
    { kind: "crystal", count: 24, block: 1, scale: [0.6, 1.2] },
    { kind: "rock", count: 50, block: 0, scale: [0.5, 1] },
  ],
  landmarks: [
    { id: "lm_noc_gate_camp", name: "Outer Camp", kind: "camp", x: 109, y: 64, note: "Arrival from the Black Array." },
    { id: "lm_noc_gate_convergence", name: "Convergence Plaza", kind: "crossroads", x: 60, y: 56, note: "Where every lattice line in Nocthaven meets." },
    { id: "lm_noc_gate_colonnade", name: "Great Colonnade", kind: "ruin", x: 60, y: 20, note: "Glyph swarms between the columns." },
    { id: "lm_noc_gate_court", name: "Executor Court", kind: "farm", x: 98, y: 22, note: "A court of Executors round the violet crystal." },
    { id: "lm_noc_gate_verge", name: "Lattice Verge", kind: "farm", x: 26, y: 88, note: "Glyph swarms drift among the rune stones." },
    { id: "lm_noc_gate_descent", name: "The Descent", kind: "gate", x: 56, y: 114, note: "Sealed stair to the Lattice Heart; the Warden opens it for the Keysigil." },
  ],
  safe_areas: [[101, 57, 16, 14], [48, 100, 16, 13]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "glyph_plaza", name: "Convergence Plaza", rects: [[36, 38, 44, 32]], species: [{ monster_id: "mob_0096", weight: 1 }], target_alive: 45, respawn_sec: [5, 12],
      design_note: "The densest swarm in the game (Lv95) round the obelisk ring at the crossroads: every road passes through it, so the plaza is the fight." },
    { id: "glyph_colonnade", name: "Great Colonnade", rects: [[44, 8, 34, 24]], species: [{ monster_id: "mob_0096", weight: 1 }], target_alive: 28, respawn_sec: [10, 20],
      design_note: "Aggressive glyph swarms between the columns: the columns split them into lanes, so the colonnade is fought one lane at a time." },
    { id: "executor_court", name: "Executor Court", rects: [[84, 12, 30, 26]], species: [{ monster_id: "mob_0035", weight: 1 }], target_alive: 6, respawn_sec: [60, 120],
      design_note: "Six elites round the violet crystal: the Keysigil quest's target, fought one or two at a time." },
    { id: "lattice_verge", name: "Lattice Verge", rects: [[10, 74, 34, 30]], species: [{ monster_id: "mob_0096", weight: 1 }], target_alive: 35, respawn_sec: [7, 15],
      design_note: "Glyph swarms among the rune stones in the south-west: a smaller swarm farm off the plaza, and the last stop before the Heart." },
  ],
  npcs: [
    npc("npc_noc_gate_scout", "Gate Scout Halvard", [106, 59], "W", "scout"),
    npc("npc_noc_gate_medic", "Gate Field Medic", [51, 104], "E", "healer"),
    npc("npc_noc_heart_warden", "Heart Warden", [61, 104], "S", "guard"),
  ],
};

const latticeHeart: MapDesign = {
  id: "noc_dun_01", name: "Lattice Heart", type: "dungeon", role: "Nocthaven's dungeon and the game's last: hexagonal conduits round the Lattice Sovereign's chamber.",
  levels: [96, 99], size: [124, 124], arrival: [56, 11], ground: "metal", theme: "conduits of violet light woven round the Meridian Lattice's crystalline heart",
  solid: true,
  carve: [
    { rect: [46, 0, 20, 20] },
    { ellipse: [28, 44, 20, 14] },
    { rect: [74, 34, 36, 22] },
    { rect: [20, 76, 36, 22] },
    { ellipse: [92, 94, 16, 14] },
  ],
  roads: [
    { points: [[56, 10], [56, 26], [30, 44]], width: 4, kind: "obsidian" },
    { points: [[56, 26], [80, 44], [92, 45]], width: 4, kind: "obsidian" },
    { points: [[30, 44], [36, 62], [38, 86]], width: 4, kind: "obsidian" },
    { points: [[38, 86], [64, 94], [78, 94]], width: 4, kind: "obsidian" },
    { points: [[92, 55], [92, 82]], width: 4, kind: "obsidian" },
  ],
  blockers: [
    { kind: "crystal", shape: { ellipse: [28, 44, 3, 2] } },
    { kind: "machine", shape: { rect: [26, 82, 3, 3] } },
    { kind: "machine", shape: { rect: [48, 79, 3, 3] } },
  ],
  props: [
    { kind: "cave_mouth", x: 56, y: 1, block: 0, scale: 1.2 },
    { kind: "tent", x: 50, y: 8, block: 2 },
    { kind: "lattice_obelisk", x: 92, y: 94, block: 0, scale: 2.2 },
    { kind: "lattice_obelisk", x: 80, y: 38, block: 1 }, { kind: "lattice_obelisk", x: 106, y: 52, block: 1 },
    { kind: "aether_pylon", x: 82, y: 88, block: 1 }, { kind: "aether_pylon", x: 102, y: 88, block: 1 },
    { kind: "rune_stone", x: 22, y: 92, block: 1 },
  ],
  scatter: [
    { kind: "crystal", count: 26, block: 1, scale: [0.6, 1.2] },
    { kind: "brass_pipe", count: 16, block: 0, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_noc_heart_landing", name: "Descent Landing", kind: "camp", x: 56, y: 11, note: "Arrival; the Lift Keeper takes you back up." },
    { id: "lm_noc_heart_conduits", name: "Lattice Conduits", kind: "farm", x: 28, y: 44, note: "Lattice Weavers string lines round a crystal." },
    { id: "lm_noc_heart_loom", name: "The Loom", kind: "farm", x: 92, y: 45, note: "Lattice Weavers at work." },
    { id: "lm_noc_heart_hall", name: "Spindle Hall", kind: "ruin", x: 38, y: 86, note: "Weavers guard the long route." },
    { id: "lm_noc_heart_chamber", name: "Sovereign's Chamber", kind: "boss_arena", x: 92, y: 94, note: "The Lattice Sovereign." },
  ],
  safe_areas: [[48, 5, 16, 12]],
  horde: { min_alive: 60, max_alive: 120 },
  pockets: [
    { id: "lattice_conduits", name: "Lattice Conduits", rects: [[12, 34, 32, 20]], species: [{ monster_id: "mob_0097", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The dungeon's main farm: 40 ranged Weavers in an oval chamber; circle the crystal to break their line of fire and pull them together." },
    { id: "weaver_loom", name: "The Loom", rects: [[76, 36, 32, 18]], species: [{ monster_id: "mob_0097", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "A hall of ranged Weavers on the short route to the chamber: line of sight is long, so players pull them back into the corridor." },
    { id: "spindle_hall", name: "Spindle Hall", rects: [[22, 78, 32, 18]], species: [{ monster_id: "mob_0097", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Weavers in a long machine hall on the far route to the chamber: pull them round the machines to close the range. The best Lattice Node farm." },
    { id: "sovereign_chamber", name: "Sovereign's Chamber", rects: [[86, 88, 12, 12]], species: [{ monster_id: "mob_0098", weight: 1 }], target_alive: 1, respawn_sec: [300, 420],
      design_note: "The final boss, 5-7 minute respawn; reached from the loom or the hall." },
  ],
  npcs: [npc("npc_noc_heart_lift", "Lattice Heart Lift Keeper", [61, 8], "S", "teleporter", { destinations: [["noc_town_01", 0], ["noc_fld_06", 0]] })],
};

// --- dialogue ------------------------------------------------------------------------

const dialogues: DialogueDef[] = [
  ["npc_noc_guild_registrar", "Umbracrest chapter, the last one on the road. Everything past these walls belongs to the Lattice now.", "Start in the Dusk Verge, through the South Gate. Put out the wisps before they drink our last lamps."],
  ["npc_noc_merchant", "Rations and tonics, brought in on the Cindervale transit. Nothing grows here any more, so nothing's cheap.", "Bring me lattice scrap. The scholars upstairs pay in coin they don't need."],
  ["npc_noc_healer", "Shadow burns don't bleed; they go cold. Sit by the lamp while I work.", "If you start seeing violet at the edge of your eyes, come straight back."],
  ["npc_noc_teleporter", "The lattice still carries us, for now. Every camp out there, or Cindervale if you need the heat.", "Don't ask me who else is listening on the line."],
  ["npc_noc_craftsman", "Blooms, wisp cores, lurk bristles: I make tonics from what the city leaves us.", "Lattice Nodes are the real treasure. Hold on to them."],
  ["npc_noc_south_gate_guard", "South Gate. The Verge is all wisps and lurks; the wisps leave you be, but one squealing lurk brings the whole street.", "If the lamps out there go dark, run toward the gate."],
  ["npc_noc_east_gate_guard", "East Station. No trains have run since the Sundering, but the yards are busy all the same.", "Mites in the sidings, drones on the gantries. Mind both."],
  ["npc_noc_dusk_scout", "Wisps drift on the boulevard and won't bother you. Lurks under the overpass will, all at once.", "Mind the square under the obelisk: lurks there drag the wisps into the fight."],
  ["npc_noc_nullgarden_scout", "The flowers drink colour. Burn the beds first, or they shade everything fighting near them.", "The glasshouses south are thick with blooms, and haulers circle the dead pond."],
  ["npc_noc_tracks_scout", "Coupler crews work the sidings; hit one and the whole yard comes.", "Drones on the gantries can't shoot through the carriages. Use that."],
  ["npc_noc_rift_scout", "Two ways across the tear: the bridge in the middle, the planks at the west end.", "Riftlings come out of the edge faster than you'd like. Pull them away from it."],
  ["npc_noc_array_scout", "The Array still listens to the Lattice. Sentinels ring the great dish and walk the lines north of here.", "The birds scatter when you hit them. Catch the whole flock in one swing."],
  ["npc_noc_gate_scout", "Every lattice line in the city meets on that plaza. So do the glyphs.", "Cut a Keysigil from the Executors in the court; the Warden won't open the Descent without one."],
  ["npc_noc_gate_medic", "Whatever is in the Heart runs all of this. Every drone, every glyph.", "Bring me the Keysigil, rest, and then go down. I'll be here when you come back up."],
  ["npc_noc_heart_warden", "The Descent opens for the Keysigil and nothing else.", "The Sovereign's chamber lies past the loom or through the spindle hall."],
  ["npc_noc_heart_lift", "Back up? Umbracrest or the Gate.", "Don't look at the lattice too long. It looks back."],
].map(([npcId, ...lines]) => ({ id: npcId.replace(/^npc_/, "dlg_"), npc_id: npcId, lines }));

// --- the region ------------------------------------------------------------------------

export const nocthaven: RegionDesign = {
  region: {
    id: "noc", name: "Nocthaven", capital: "Umbracrest", town_map_id: "noc_town_01", dungeon_map_id: "noc_dun_01", level_range: [75, 99],
    theme: "An abandoned megacity under a violet energy grid, guarded by sentinel automatons: the seat of the Meridian Lattice and the end of the Wayfarer's road.",
    ecology: "Light-eaters and scavengers in the dark outskirts, possessed haulers on the old routes, maintenance constructs in the rail yards, shadow spilling from the Veil Rift, and the Lattice's own sentinels, executioners and glyphs thickening toward the Heart.",
    palette: { grass: "#3c3a52", dirt: "#55506a", accent: "#a86bff", fog: "#120e22" },
  },
  maps: [umbracrest, duskVerge, nullgarden, silentTracks, veilRift, blackArray, meridianGate, latticeHeart],
  links: [
    { label: "Umbracrest South Gate ⇄ Dusk Verge", a: { map: "noc_town_01", trigger: [77, 125, 7, 3], landing: [77, 116] }, b: { map: "noc_fld_01", trigger: [57, 0, 7, 3], landing: [60, 11] } },
    { label: "Umbracrest East Station ⇄ Silent Tracks", a: { map: "noc_town_01", trigger: [147, 53, 3, 7], landing: [138, 58] }, b: { map: "noc_fld_03", trigger: [0, 47, 3, 7], landing: [11, 50] } },
    { label: "Dusk Verge ⇄ Nullgarden", a: { map: "noc_fld_01", trigger: [129, 77, 3, 7], landing: [121, 80] }, b: { map: "noc_fld_02", trigger: [0, 93, 3, 7], landing: [11, 96] } },
    { label: "Nullgarden ⇄ Silent Tracks", a: { map: "noc_fld_02", trigger: [67, 0, 7, 3], landing: [70, 11] }, b: { map: "noc_fld_03", trigger: [37, 97, 7, 3], landing: [40, 88] } },
    { label: "Silent Tracks ⇄ Veil Rift", a: { map: "noc_fld_03", trigger: [117, 0, 7, 3], landing: [120, 10] }, b: { map: "noc_fld_04", trigger: [93, 129, 7, 3], landing: [96, 121] } },
    { label: "Veil Rift ⇄ Black Array", a: { map: "noc_fld_04", trigger: [0, 37, 3, 7], landing: [11, 40] }, b: { map: "noc_fld_05", trigger: [145, 41, 3, 7], landing: [137, 44] } },
    { label: "Black Array ⇄ Meridian Gate", a: { map: "noc_fld_05", trigger: [0, 67, 3, 7], landing: [11, 70] }, b: { map: "noc_fld_06", trigger: [117, 61, 3, 7], landing: [109, 64] } },
    // The endgame dungeon opens only for the Keysigil from q_noc_meridian_gate:
    // it keeps players from wandering into Lv99 content before they have
    // fought the Executors, and gives the chain a door to earn.
    { label: "Meridian Gate ⇄ Lattice Heart", requirements: [`item:${KEYSIGIL}`], a: { map: "noc_fld_06", trigger: [53, 117, 7, 3], landing: [56, 108] }, b: { map: "noc_dun_01", trigger: [53, 0, 7, 3], landing: [56, 11] } },
  ],
  monsters,
  materials,
  items,
  shops: [{ id: "shop_noc_supply", npc_id: "npc_noc_merchant", items: [{ item_id: "itm_0075", base_price: 8 }, { item_id: "itm_0076", base_price: 25 }, { item_id: "itm_0077", base_price: 30 }] }],
  recipes,
  quests,
  dialogues,
};
