// LUMERIS — the production reference region (Lv 1-20).
//
// Every other region follows the conventions set here:
//  * a town with the five service NPCs laid out around a real plaza, plus
//    gate guards; one field camp (safe area + scout) at each field entrance
//  * fields climb ~3 levels at a time; each field has 3-4 spawn pockets
//    whose species fit the terrain they sit on, summing to 110-130 alive
//  * every link is two warps with distinct triggers on opposite edges and
//    landings 7+ cells inside, in a safe camp
//  * every monster spawns somewhere; every item drops, sells, crafts or is a
//    quest reward; each monster's stat departures are argued in `why`
//
// Geography (north up):
//
//   Whispergrass ─── Old Windmill ─── Moonbrook
//        │                │               │
//     Avelorn ── Dawnmeadow ── Amber Trail  Broken Orchard ── Hollowroot Cavern
//
// Amber Trail climbs north into Old Windmill; Moonbrook runs south into the
// Broken Orchard, whose old pump-house cave is Hollowroot.

import type { DialogueDef, ItemDef, NpcDef, Prop, QuestDef, RecipeDef } from "../../src/data/schema";
import { expToNext } from "../model";
import type { MapDesign, RegionDesign } from "../types";

const questExp = (level: number, share: number) => Math.round(expToNext(level) * share);

// --- monsters ------------------------------------------------------------------

const monsters: RegionDesign["monsters"] = [
  {
    id: "mob_0001", name: "Mosskin", level: 1, archetype: "swarm", family: "plant", element: "earth", behavior: "passive",
    drops: { common: "itm_0001", uncommon: "itm_0002", rare: "itm_0071" },
    ecology: "Seed-pods that grew legs where the old Aethrion irrigation still seeps; they graze the open meadow and ignore travellers until struck.",
    art_brief: "A round four-legged seed with a mossy shell and two twig antennae; friendly face; earth-green palette.", sprite: "mosskin_2d",
  },
  {
    id: "mob_0002", name: "Sporeling", level: 2, archetype: "swarm", family: "fungus", element: "nature", behavior: "assist",
    mods: { hp: 0.9, atk: 1.1 }, why: "Soft caps break easily (-10% HP) but the spores sting (+10% ATK). Assist: a struck Sporeling's spore cloud wakes the whole cluster, which is how a new player first pulls a pack.",
    drops: { common: "itm_0003", uncommon: "itm_0004", rare: "itm_0072" },
    ecology: "Walking mushrooms that crowd the damp grove by the meadow pond; they share one spore cloud, so they answer each other's distress.",
    art_brief: "A waddling mushroom with a speckled cream-and-rust cap, stubby root feet, puffs of glowing spores.", sprite: "sporeling_2d",
  },
  {
    id: "mob_0003", name: "Ambermite", level: 3, archetype: "swarm", family: "insect", element: "earth", behavior: "aggressive",
    mods: { def: 1.3, hp: 0.95, speed: 0.9 }, why: "Resin shell (+30% DEF), quick legs (10% faster). The first aggressive monster: it guards the resin trees along the trail and teaches players to watch where they walk.",
    drops: { common: "itm_0005", uncommon: "itm_0006", rare: "itm_0084" },
    ecology: "Six-legged mites that farm amber resin from the trail-side trees and swarm anything that comes near the sap.",
    art_brief: "A beetle-sized six-legged mite under a translucent amber shell with a glowing core; honey-orange.", sprite: "p_ambermite",
  },
  {
    id: "mob_0004", name: "Lunari", level: 3, archetype: "swarm", family: "beast", element: "wind", behavior: "flee",
    mods: { hp: 0.8, atk: 0.8, speed: 0.75 }, why: "A skittish glider: frail (-20% HP, -20% ATK) and fast (25% faster) so it bolts when hit. A chase target, not a threat.",
    drops: { common: "itm_0007", uncommon: "itm_0008" },
    ecology: "Leaf-eared gliders nesting in the hollows of Amber Trail; they scatter from anything that hurts them.",
    art_brief: "A sugar-glider-like beast with leaf-shaped ears and a banded tail, membrane glide flaps; moonlit silver-green.", sprite: "p_lunari",
  },
  {
    id: "mob_0005", name: "Craglet", level: 5, archetype: "bruiser", family: "reptile", element: "earth", behavior: "assist",
    mods: { def: 1.4, speed: 1.2, atk: 0.9 }, why: "Stone-plated (+40% DEF), heavy (20% slower), blunt bite (-10% ATK). The first bruiser: a wall that rewards AoE over single hits.",
    drops: { common: "itm_0009", uncommon: "itm_0010", extra: [{ item_id: "itm_0074", rate_bp: 250 }, { item_id: "itm_0073", rate_bp: 60 }] },
    ecology: "Rock lizards on the scree outcrops; they swallow Aethrion gears and shards as gizzard stones, which is where old copper gears turn up.",
    art_brief: "A squat lizard covered in slate plates, quartz flecks along the spine, a gear glinting in its belly seam.",
  },
  {
    id: "mob_0006", name: "Thornback", level: 8, archetype: "bruiser", family: "beast", element: "nature", behavior: "assist",
    mods: { atk: 1.1 }, why: "Spined back (+10% ATK). Packs defend each other on the bramble ridge.",
    drops: { common: "itm_0011", uncommon: "itm_0012" },
    ecology: "Hedgehog-boars that root in the brambles of Whispergrass, north of Avelorn.",
    art_brief: "A stocky boar with a back of woody thorns and bark-like hide; mossy tusks.",
  },
  {
    id: "mob_0007", name: "Dustwing", level: 9, archetype: "swarm", family: "insect", element: "wind", behavior: "aggressive",
    mods: { hp: 0.85, speed: 0.7, attack_speed: 0.85 }, why: "A flyer: light (-15% HP), fast (30% faster), quick stings. The aggressive swarm that makes the windmill fields a natural 30-60 mob train.",
    drops: { common: "itm_0013", uncommon: "itm_0014" },
    ecology: "Dust moths that ride the updraft of the old windmill's sails and dive on anything moving below.",
    art_brief: "A large moth with sandy, powder-dusted wings and brass-coloured eyespots; trailing dust motes.",
  },
  {
    id: "mob_0008", name: "Brookfin", level: 12, archetype: "swarm", family: "aquatic", element: "water", behavior: "passive",
    mods: { hp: 1.1 }, why: "Slick scales (+10% HP). Passive: Moonbrook's banks are a place to gather with Anchor Shout, not to be ambushed.",
    drops: { common: "itm_0015", uncommon: "itm_0016" },
    ecology: "Amphibious fish that crawl up Moonbrook's banks and out onto its dry flats to sun their clear fins.",
    art_brief: "A fat fish on stubby fin-legs, glass-clear fins showing faint aether veins; blue-green.",
  },
  {
    id: "mob_0009", name: "Reedstalker", level: 14, archetype: "ranged", family: "plant", element: "water", behavior: "aggressive",
    mods: { range: 4 }, why: "Spits reed darts from 4 cells: the region's ranged lesson, mixed into melee packs so players learn to pull them in.",
    drops: { common: "itm_0017", uncommon: "itm_0018" },
    ecology: "Reed-camouflaged hunters of the Moonbrook marsh and its moonlit banks.",
    art_brief: "A lanky stalk-creature woven from reeds, a seed-pod head that opens to spit darts; marsh green and brown.", sprite: "p_reedstalker",
  },
  {
    id: "mob_0010", name: "Rotroot", level: 17, archetype: "swarm", family: "plant", element: "nature", behavior: "aggressive",
    mods: { hp: 1.2, speed: 1.15 }, why: "Fibrous (+20% HP), dragging roots (15% slower): a dense, slow horde that suits big AoE pulls before the dungeon.",
    drops: { common: "itm_0019", uncommon: "itm_0020" },
    ecology: "Roots of the dying orchard, animated by aether leaking from the pump house; they grow thickest round its broken machine.",
    art_brief: "A knot of rotting roots with a glowing sap core, crawling on root-legs; dark wood, sickly teal glow.", sprite: "p_rotroot",
  },
  {
    id: "mob_0011", name: "Barkwarden", level: 20, archetype: "construct", family: "construct", element: "earth", behavior: "assist",
    drops: { common: "itm_0021", uncommon: "itm_0022", extra: [{ item_id: "itm_0074", rate_bp: 800 }, { item_id: "itm_0073", rate_bp: 400 }] },
    ecology: "Aethrion maintenance frames that grew bark over their copper joints; they still patrol Hollowroot's tunnels and buried pump hall.",
    art_brief: "A man-high wooden guardian with copper-jointed limbs, a cracked lens eye and moss in the seams.", sprite: "p_barkwarden",
  },
  {
    id: "mob_0036", name: "Hollowroot Warden", level: 20, archetype: "boss", family: "construct", element: "earth", behavior: "aggressive",
    drops: { common: "itm_0021", uncommon: "itm_0020", rare: "itm_0085", extra: [{ item_id: "itm_0073", rate_bp: 10000, qty: [2, 4] }] },
    ecology: "The pump-house core, fused with the root mass it was built to water. It sits in the Heart Chamber and is why the orchard rots.",
    art_brief: "A hulking root-and-copper colossus around a pulsing aetherite heart; pipes for arms, roots for legs.",
  },
];

// --- items -----------------------------------------------------------------------

const materials: RegionDesign["materials"] = [
  { id: "itm_0001", name: "Moss Fiber", level: 1, tier: "common", description: "Springy moss stripped from a Mosskin shell. Weaving stock." },
  { id: "itm_0002", name: "Seed Husk", level: 1, tier: "uncommon", description: "The hard outer husk of a Mosskin seed." },
  { id: "itm_0003", name: "Spore Dust", level: 2, tier: "common", description: "Fine luminous spores. Alchemists' filler." },
  { id: "itm_0004", name: "Soft Mycelium", level: 2, tier: "uncommon", description: "A felt of fungal threads; light padding." },
  { id: "itm_0005", name: "Amber Fragment", level: 3, tier: "common", description: "A chip of Ambermite shell resin." },
  { id: "itm_0006", name: "Resin Shell", level: 3, tier: "uncommon", description: "An intact Ambermite carapace plate." },
  { id: "itm_0007", name: "Glider Fur", level: 3, tier: "common", description: "Silky fur from a Lunari's glide membrane." },
  { id: "itm_0008", name: "Moonleaf", level: 3, tier: "uncommon", description: "A Lunari ear-leaf that shines faintly at night." },
  { id: "itm_0009", name: "Crag Scale", level: 5, tier: "common", description: "A slate plate from a Craglet's back." },
  { id: "itm_0010", name: "Dry Claw", level: 5, tier: "uncommon", description: "A sun-dried Craglet claw; tough as flint." },
  { id: "itm_0011", name: "Briar Spine", level: 8, tier: "common", description: "A woody thorn from a Thornback." },
  { id: "itm_0012", name: "Thick Hide", level: 8, tier: "uncommon", description: "Bark-tough Thornback hide." },
  { id: "itm_0013", name: "Wing Membrane", level: 9, tier: "common", description: "A dusty Dustwing wing panel." },
  { id: "itm_0014", name: "Dust Powder", level: 9, tier: "uncommon", description: "Wing powder that drifts upward on its own." },
  { id: "itm_0015", name: "Brook Scale", level: 12, tier: "common", description: "A clear, coin-sized Brookfin scale." },
  { id: "itm_0016", name: "Clear Gill", level: 12, tier: "uncommon", description: "A Brookfin gill veined with faint aether." },
  { id: "itm_0017", name: "Reed Fiber", level: 14, tier: "common", description: "Tough fibre from a Reedstalker's body." },
  { id: "itm_0018", name: "Marsh Sap", level: 14, tier: "uncommon", description: "Sticky sap that hardens in air." },
  { id: "itm_0019", name: "Rotwood", level: 17, tier: "common", description: "Spongy root wood, oddly warm." },
  { id: "itm_0020", name: "Sap Core", level: 17, tier: "uncommon", description: "The glowing knot at a Rotroot's heart." },
  { id: "itm_0021", name: "Bark Plate", level: 20, tier: "common", description: "Bark grown over Aethrion armour plate." },
  { id: "itm_0022", name: "Copper Joint", level: 20, tier: "uncommon", description: "A working Aethrion copper joint." },
  { id: "itm_0071", name: "Dew Pearl", level: 1, tier: "rare", description: "A pearl of condensed aether dew, found in one Mosskin in hundreds." },
  { id: "itm_0072", name: "Fungal Core", level: 2, tier: "rare", description: "The dense heart of an old Sporeling colony." },
  { id: "itm_0073", name: "Aetherite Shard", level: 10, tier: "uncommon", description: "A splinter of Aetherite, the crystal that ran Aethrion. Every artificer wants them." },
  { id: "itm_0074", name: "Copper Gear", level: 6, tier: "uncommon", description: "A small Aethrion gear, still true. Craglets swallow them; Barkwardens are made of them." },
  { id: "itm_0084", name: "Resin Heart", level: 3, tier: "rare", description: "A perfect amber bead from the core of an Ambermite colony." },
  { id: "itm_0085", name: "Hollowroot Heartwood", level: 20, tier: "rare", description: "Wood from the Warden's core, still pulsing with aether." },
];

const items: ItemDef[] = [
  { id: "itm_0075", name: "Field Ration", category: "consumable", rarity: "common", sell_price: 3, stack_max: 99, description: "Hard bread and dried fruit. Restores 10% HP.", use: { heal_hp_pct: 10, cooldown_ms: 1000 } },
  { id: "itm_0076", name: "Minor Vital Tonic", category: "consumable", rarity: "common", sell_price: 8, stack_max: 99, description: "A bitter green draught. Restores 25% HP.", use: { heal_hp_pct: 25, cooldown_ms: 1500 } },
  { id: "itm_0077", name: "Minor Focus Tonic", category: "consumable", rarity: "common", sell_price: 10, stack_max: 99, description: "A cool blue draught. Restores 30% SP.", use: { heal_sp_pct: 30, cooldown_ms: 1500 } },
  { id: "itm_0078", name: "Traveler Boots", category: "equipment", rarity: "common", sell_price: 40, stack_max: 1, description: "Moss-lined boots. The first thing every Wayfarer crafts.", equip: { slot: "boots", defense: 3, max_hp: 20, min_level: 1 } },
  { id: "itm_0079", name: "Leafweave Coat", category: "equipment", rarity: "common", sell_price: 150, stack_max: 1, description: "Glider fur woven on mycelium felt.", equip: { slot: "armor", defense: 7, max_hp: 60, min_level: 5 } },
  { id: "itm_0080", name: "Copper Saber", category: "equipment", rarity: "uncommon", sell_price: 180, stack_max: 1, description: "Crag-scale blade on a copper-gear hilt. Vanguard.", equip: { slot: "weapon", job: "vanguard", attack: 14, min_level: 7 } },
  { id: "itm_0081", name: "Surveyor Bow", category: "equipment", rarity: "uncommon", sell_price: 260, stack_max: 1, description: "Briar-spine bow strung with wing membrane. Strider.", equip: { slot: "weapon", job: "strider", attack: 13, min_level: 9 } },
  { id: "itm_0082", name: "Aether Rod", category: "equipment", rarity: "uncommon", sell_price: 360, stack_max: 1, description: "A brook-scale rod tipped with Aetherite. Arcanist.", equip: { slot: "weapon", job: "arcanist", attack: 12, min_level: 12 } },
  { id: "itm_0083", name: "Guild Pass", category: "quest", rarity: "uncommon", sell_price: 0, stack_max: 1, description: "Wayfarer Guild warrant. Opens Hollowroot Cavern's lift." },
];

const recipes: RecipeDef[] = [
  { id: "rcp_lum_traveler_boots", npc_id: "npc_lum_craftsman", output: { item_id: "itm_0078", qty: 1 }, inputs: [{ item_id: "itm_0001", qty: 12 }, { item_id: "itm_0002", qty: 3 }], currency: 60 },
  { id: "rcp_lum_leafweave_coat", npc_id: "npc_lum_craftsman", output: { item_id: "itm_0079", qty: 1 }, inputs: [{ item_id: "itm_0007", qty: 10 }, { item_id: "itm_0008", qty: 4 }, { item_id: "itm_0004", qty: 6 }], currency: 250 },
  { id: "rcp_lum_copper_saber", npc_id: "npc_lum_craftsman", output: { item_id: "itm_0080", qty: 1 }, inputs: [{ item_id: "itm_0009", qty: 10 }, { item_id: "itm_0074", qty: 3 }, { item_id: "itm_0005", qty: 12 }], currency: 400 },
  { id: "rcp_lum_surveyor_bow", npc_id: "npc_lum_craftsman", output: { item_id: "itm_0081", qty: 1 }, inputs: [{ item_id: "itm_0011", qty: 10 }, { item_id: "itm_0013", qty: 8 }, { item_id: "itm_0010", qty: 4 }], currency: 600 },
  { id: "rcp_lum_aether_rod", npc_id: "npc_lum_craftsman", output: { item_id: "itm_0082", qty: 1 }, inputs: [{ item_id: "itm_0015", qty: 10 }, { item_id: "itm_0018", qty: 4 }, { item_id: "itm_0073", qty: 2 }], currency: 900 },
];

// --- quests: a chain that walks the player through every map in level order ------

const R = "npc_lum_guild_registrar";
const quests: QuestDef[] = [
  { id: "q_lum_intro", title: "Lumeris: First Survey", region_id: "lum", giver_npc_id: R, turn_in_npc_id: R, min_level: 1, prerequisite: null,
    objectives: [{ type: "kill", monster_id: "mob_0001", count: 30 }],
    rewards: { base_exp: questExp(1, 0.6), currency: 60, items: [{ item_id: "itm_0075", qty: 10 }] },
    summary: "Thin the Mosskin herds in Dawnmeadow. Teaches movement and basic attacks." },
  { id: "q_lum_registration", title: "Wayfarer Registration", region_id: "lum", giver_npc_id: R, turn_in_npc_id: R, min_level: 2, prerequisite: "q_lum_intro",
    objectives: [{ type: "collect", item_id: "itm_0001", count: 10 }, { type: "collect", item_id: "itm_0003", count: 10 }],
    rewards: { base_exp: questExp(2, 0.5), currency: 120, items: [{ item_id: "itm_0083", qty: 1 }, { item_id: "itm_0076", qty: 5 }] },
    summary: "Bring field samples to earn the Guild Pass (needed for Hollowroot). Teaches looting and inventory." },
  { id: "q_lum_amber_trail", title: "Resin on the Trail", region_id: "lum", giver_npc_id: "npc_lum_amber_trail_scout", turn_in_npc_id: "npc_lum_amber_trail_scout", min_level: 4, prerequisite: "q_lum_registration",
    objectives: [{ type: "visit", map_id: "lum_fld_02", count: 1 }, { type: "kill", monster_id: "mob_0003", count: 60 }],
    rewards: { base_exp: questExp(4, 0.45), currency: 200, items: [{ item_id: "itm_0076", qty: 8 }] },
    summary: "Clear the aggressive Ambermite swarms. First quest that expects a train of 20+." },
  { id: "q_lum_scree", title: "Stones That Bite", region_id: "lum", giver_npc_id: "npc_lum_whispergrass_scout", turn_in_npc_id: "npc_lum_whispergrass_scout", min_level: 6, prerequisite: "q_lum_amber_trail",
    objectives: [{ type: "kill", monster_id: "mob_0005", count: 40 }, { type: "collect", item_id: "itm_0074", count: 3 }],
    rewards: { base_exp: questExp(6, 0.45), currency: 320, items: [{ item_id: "itm_0073", qty: 1 }] },
    summary: "Craglets swallow Aethrion gears; recover three. Points the player at the Copper Saber recipe." },
  { id: "q_lum_windmill", title: "Sails in the Dust", region_id: "lum", giver_npc_id: "npc_lum_windmill_scout", turn_in_npc_id: "npc_lum_windmill_scout", min_level: 9, prerequisite: "q_lum_scree",
    objectives: [{ type: "kill", monster_id: "mob_0007", count: 120 }],
    rewards: { base_exp: questExp(9, 0.4), currency: 450, items: [{ item_id: "itm_0077", qty: 8 }] },
    summary: "The Dustwing swarm is the region's first real horde: 120 kills is two or three full trains." },
  { id: "q_lum_moonbrook", title: "Reeds at Moonrise", region_id: "lum", giver_npc_id: "npc_lum_moonbrook_scout", turn_in_npc_id: "npc_lum_moonbrook_scout", min_level: 12, prerequisite: "q_lum_windmill",
    objectives: [{ type: "kill", monster_id: "mob_0009", count: 60 }, { type: "kill", monster_id: "mob_0008", count: 60 }],
    rewards: { base_exp: questExp(12, 0.4), currency: 600, items: [{ item_id: "itm_0076", qty: 10 }] },
    summary: "Mixed packs: ranged Reedstalkers among passive Brookfin. Teaches pulling ranged mobs into the pack." },
  { id: "q_lum_orchard", title: "The Rotting Rows", region_id: "lum", giver_npc_id: "npc_lum_orchard_medic", turn_in_npc_id: "npc_lum_orchard_medic", min_level: 15, prerequisite: "q_lum_moonbrook",
    objectives: [{ type: "kill", monster_id: "mob_0010", count: 150 }, { type: "collect", item_id: "itm_0019", count: 20 }],
    rewards: { base_exp: questExp(15, 0.4), currency: 800, items: [{ item_id: "itm_0073", qty: 2 }] },
    summary: "Find where the rot comes from. Leads to the pump-house cave." },
  { id: "q_lum_hollowroot", title: "Heart of Hollowroot", region_id: "lum", giver_npc_id: "npc_lum_orchard_medic", turn_in_npc_id: R, min_level: 18, prerequisite: "q_lum_orchard",
    objectives: [{ type: "kill", monster_id: "mob_0036", count: 1 }],
    rewards: { base_exp: questExp(18, 0.8), currency: 2000, items: [{ item_id: "itm_0073", qty: 3 }, { item_id: "itm_0076", qty: 10 }] },
    summary: "Destroy the Hollowroot Warden and report to Avelorn. Opens the road to Verdantis." },
];

// --- maps --------------------------------------------------------------------------

const npc = (id: string, name: string, position: [number, number], facing: NpcDef["facing"], role: NpcDef["role"], extra: Partial<NpcDef> = {}): Omit<NpcDef, "map_id"> =>
  ({ id, name, position, facing, role, dialogue_id: id.replace(/^npc_/, "dlg_"), shop_id: null, ...extra });

const fieldCost = (minLevel: number) => 10 + 4 * minLevel;

const avelorn: MapDesign = {
  id: "lum_town_01", name: "Avelorn", type: "town", role: "Region capital: services, quest hub, crafting, transit to Lumeris fields and Sylvara.",
  levels: [1, 20], size: [120, 120], arrival: [60, 66], ground: "stone", theme: "cream-stone town round an Aetherite fountain",
  border: { width: 3, kind: "ruin_wall" },
  roads: [
    { points: [[60, 60], [119, 60]], width: 5, kind: "stone" },
    { points: [[60, 60], [60, 0]], width: 5, kind: "stone" },
    { points: [[60, 60], [42, 78], [32, 96]], width: 3, kind: "stone" },
    { points: [[60, 60], [74, 74]], width: 3, kind: "stone" },
    { points: [[60, 60], [24, 60]], width: 3, kind: "stone" },
  ],
  blockers: [
    { kind: "building", shape: { rect: [66, 28, 22, 14] } }, // Guild Hall
    { kind: "building", shape: { rect: [30, 49, 14, 9] } }, // Medic house
    { kind: "building", shape: { rect: [76, 77, 16, 12] } }, // Artificer workshop
    { kind: "building", shape: { rect: [16, 16, 14, 10] } },
    { kind: "building", shape: { rect: [94, 20, 14, 10] } },
    { kind: "building", shape: { rect: [16, 98, 12, 10] } },
    { kind: "building", shape: { rect: [92, 94, 14, 12] } },
    { kind: "building", shape: { rect: [36, 20, 12, 10] } },
    { kind: "water", shape: { ellipse: [98, 76, 6, 5] } },
  ],
  props: [
    { kind: "fountain", x: 60, y: 60, block: 3, scale: 1.3 },
    { kind: "aether_pylon", x: 52, y: 52, block: 1 }, { kind: "aether_pylon", x: 68, y: 52, block: 1 },
    { kind: "aether_pylon", x: 52, y: 68, block: 1 }, { kind: "aether_pylon", x: 68, y: 68, block: 1 },
    { kind: "hall", x: 77, y: 35, block: 0, scale: 1.4 },
    { kind: "market_stall", x: 78, y: 67, block: 2 }, { kind: "market_stall", x: 84, y: 67, block: 2 }, { kind: "market_stall", x: 90, y: 67, block: 2 },
    { kind: "transit_gate", x: 38, y: 86, block: 3 },
    { kind: "furnace", x: 80, y: 74, block: 2 }, { kind: "anvil", x: 86, y: 74, block: 1 },
    { kind: "statue", x: 60, y: 46, block: 2 },
    { kind: "lamp_post", x: 70, y: 57, block: 1 }, { kind: "lamp_post", x: 100, y: 57, block: 1 }, { kind: "lamp_post", x: 63, y: 30, block: 1 },
    { kind: "lamp_post", x: 63, y: 14, block: 1 }, { kind: "lamp_post", x: 85, y: 57, block: 1 },
    { kind: "crate", x: 94, y: 66, block: 1 }, { kind: "crate", x: 95, y: 67, block: 1 },
    { kind: "workshop", x: 84, y: 83, block: 0 },
  ],
  scatter: [
    { kind: "tree", count: 26, area: [6, 6, 50, 36], block: 1, scale: [0.9, 1.2] },
    { kind: "tree", count: 22, area: [64, 88, 50, 26], block: 1, scale: [0.9, 1.2] },
    { kind: "bush", count: 40, block: 0, scale: [0.7, 1.1] },
  ],
  landmarks: [
    { id: "lm_avelorn_fountain", name: "Aether Fountain", kind: "plaza", x: 60, y: 60, note: "Respawn point; the five service NPCs face it." },
    { id: "lm_avelorn_guild", name: "Wayfarer Guild Hall", kind: "plaza", x: 77, y: 35, note: "Quest hub." },
    { id: "lm_avelorn_east_gate", name: "East Gate", kind: "gate", x: 114, y: 60, note: "To Dawnmeadow (Lv1-4)." },
    { id: "lm_avelorn_north_gate", name: "North Gate", kind: "gate", x: 60, y: 6, note: "To Whispergrass (Lv5-9)." },
    { id: "lm_avelorn_transit", name: "Transit Station", kind: "plaza", x: 38, y: 86, note: "Paid travel to field camps and Sylvara." },
    { id: "lm_avelorn_forge", name: "Artificer's Forge", kind: "plaza", x: 84, y: 80, note: "Crafts Lumeris equipment." },
  ],
  safe_areas: [[0, 0, 120, 120]],
  pockets: [],
  npcs: [
    npc("npc_lum_guild_registrar", "Avelorn Guild Registrar", [77, 45], "S", "guild_registrar"),
    npc("npc_lum_merchant", "Avelorn Supply Merchant", [84, 64], "N", "merchant", { shop_id: "shop_lum_supply" }),
    npc("npc_lum_healer", "Avelorn Field Medic", [47, 56], "E", "healer"),
    npc("npc_lum_teleporter", "Avelorn Transit Operator", [43, 83], "NE", "teleporter", {
      destinations: [["lum_fld_01", fieldCost(1)], ["lum_fld_02", fieldCost(3)], ["lum_fld_03", fieldCost(5)], ["lum_fld_04", fieldCost(8)], ["lum_fld_05", fieldCost(11)], ["lum_fld_06", fieldCost(14)], ["ver_town_01", 300 + 15 * 15]],
    }),
    npc("npc_lum_craftsman", "Avelorn Artificer", [73, 72], "NW", "craftsman"),
    npc("npc_lum_east_gate_guard", "East Gate Warden", [110, 55], "W", "guard"),
    npc("npc_lum_north_gate_guard", "North Gate Warden", [55, 9], "S", "guard"),
  ],
};

const dawnmeadow: MapDesign = {
  id: "lum_fld_01", name: "Dawnmeadow", type: "field", role: "First field: two gentle swarms, passive and assisting, on open ground; learn to pull and AoE.",
  levels: [1, 4], size: [128, 128], arrival: [9, 63], ground: "grass", theme: "rolling meadow over Aethrion irrigation ruins",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 63], [18, 63], [40, 60], [56, 64]], width: 4, kind: "dirt" },
    { points: [[56, 64], [78, 52], [100, 46], [127, 44]], width: 4, kind: "dirt" },
    { points: [[56, 64], [54, 82], [50, 100]], width: 3, kind: "dirt" },
    { points: [[56, 64], [46, 46], [38, 30]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { ellipse: [88, 106, 9, 6] } },
    { kind: "ruin_wall", shape: { rect: [34, 96, 2, 10] } },
    { kind: "ruin_wall", shape: { rect: [42, 110, 12, 2] } },
    { kind: "ruin_wall", shape: { rect: [60, 94, 2, 8] } },
    { kind: "rock", shape: { ellipse: [106, 80, 5, 4] } },
    { kind: "forest", shape: { ellipse: [110, 100, 10, 12] } },
    { kind: "cliff", shape: { ellipse: [112, 16, 10, 8] } },
    { kind: "forest", shape: { ellipse: [16, 92, 9, 14] } },
  ],
  props: [
    { kind: "tent", x: 8, y: 58, block: 2 }, { kind: "crate", x: 14, y: 69, block: 1 },
    { kind: "aether_pylon", x: 51, y: 69, block: 1 },
    { kind: "rune_stone", x: 60, y: 70, block: 1 },
    { kind: "aqueduct", x: 46, y: 100, block: 0, scale: 1.2 },
    { kind: "gear_ruin", x: 40, y: 104, block: 2 }, { kind: "gear_ruin", x: 56, y: 108, block: 2 },
    { kind: "brass_pipe", x: 66, y: 100, block: 0 },
    { kind: "lamp_post", x: 18, y: 59, block: 1 },
  ],
  scatter: [
    { kind: "tree", count: 90, block: 1, scale: [0.8, 1.3] },
    { kind: "bush", count: 120, block: 0, scale: [0.6, 1.1] },
    { kind: "rock", count: 25, block: 1, scale: [0.7, 1.2] },
    { kind: "crystal", count: 8, area: [28, 90, 40, 28], block: 1, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_dawn_camp", name: "Wayfarer Camp", kind: "camp", x: 10, y: 63, note: "Arrival from Avelorn; scout gives field tips." },
    { id: "lm_dawn_crossroads", name: "Meadow Crossroads", kind: "crossroads", x: 56, y: 64, note: "Roads to every pocket meet here." },
    { id: "lm_dawn_meadow", name: "Mosskin Meadow", kind: "farm", x: 33, y: 29, note: "40 passive Mosskin on open grass." },
    { id: "lm_dawn_grove", name: "Sporeling Grove", kind: "farm", x: 85, y: 85, note: "35 assisting Sporelings by the pond." },
    { id: "lm_dawn_amber", name: "Amber Rise", kind: "farm", x: 83, y: 32, note: "30 assisting Sporelings under resin trees." },
    { id: "lm_dawn_ruins", name: "Old Irrigation Ruins", kind: "ruin", x: 47, y: 103, note: "Aethrion channel works; 25 passive Mosskin among the walls." },
    { id: "lm_dawn_east", name: "East Road", kind: "gate", x: 116, y: 44, note: "To Amber Trail (Lv3-7)." },
  ],
  safe_areas: [[4, 55, 14, 16], [108, 38, 12, 13]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "mosskin_meadow", name: "Mosskin Meadow", rects: [[16, 14, 34, 30]], species: [{ monster_id: "mob_0001", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "Open grass, few trees: passive Mosskin to learn movement and the basic attack loop. ~25 cells per mob so new players are never surrounded." },
    { id: "sporeling_grove", name: "Sporeling Grove", rects: [[70, 72, 30, 26]], species: [{ monster_id: "mob_0002", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "Damp ground by the pond. Assist behaviour: hitting one pulls its neighbours, the first 'pack'." },
    { id: "amber_rise", name: "Amber Rise", rects: [[66, 24, 34, 18]], species: [{ monster_id: "mob_0002", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Beside the road east: assisting Sporelings cluster under the resin trees, so one stray hit from the road pulls the cluster; path around or pull deliberately." },
    { id: "irrigation_ruins", name: "Old Irrigation Ruins", rects: [[30, 92, 34, 24]], species: [{ monster_id: "mob_0001", weight: 1 }], target_alive: 25, respawn_sec: [8, 18],
      design_note: "Walls make chokepoints: herd passive Mosskin through a gap and AoE them. Construct prototype planned here once art exists." },
  ],
  npcs: [npc("npc_lum_dawnmeadow_scout", "Dawnmeadow Scout", [13, 58], "E", "scout")],
};

const amberTrail: MapDesign = {
  id: "lum_fld_02", name: "Amber Trail", type: "field", role: "A long trail east then north: resin thickets, a glider hollow and a mite-infested rock outcrop.",
  levels: [3, 7], size: [160, 96], arrival: [9, 48], ground: "grass", theme: "amber-resin woodland along an old Aethrion pipeline",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 48], [30, 50], [60, 46], [90, 51], [120, 46], [146, 42], [150, 30], [149, 0]], width: 4, kind: "dirt" },
    { points: [[90, 51], [84, 64], [80, 74]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "cliff", shape: { poly: [[104, 4], [136, 4], [134, 18], [112, 22]] } },
    { kind: "rock", shape: { ellipse: [126, 72, 5, 4] } },
    { kind: "rock", shape: { ellipse: [114, 62, 3, 3] } },
    { kind: "forest", shape: { ellipse: [40, 78, 14, 10] } },
    { kind: "water", shape: { ellipse: [18, 80, 7, 5] } },
  ],
  props: [
    { kind: "tent", x: 7, y: 42, block: 2 },
    { kind: "tent", x: 153, y: 8, block: 2 },
    { kind: "aether_pylon", x: 62, y: 40, block: 1 },
    { kind: "brass_pipe", x: 40, y: 55, block: 0 }, { kind: "brass_pipe", x: 80, y: 57, block: 0 }, { kind: "brass_pipe", x: 112, y: 40, block: 0 },
    { kind: "rune_stone", x: 100, y: 58, block: 1 },
    { kind: "giant_tree", x: 34, y: 20, block: 3 }, { kind: "giant_tree", x: 84, y: 18, block: 3 },
  ],
  scatter: [
    { kind: "tree", count: 120, block: 1, scale: [0.8, 1.3] },
    { kind: "bush", count: 120, block: 0, scale: [0.6, 1.1] },
    { kind: "rock", count: 40, area: [104, 50, 50, 40], block: 1, scale: [0.7, 1.3] },
  ],
  landmarks: [
    { id: "lm_amber_camp_w", name: "Trailhead Camp", kind: "camp", x: 10, y: 48, note: "Arrival from Dawnmeadow." },
    { id: "lm_amber_thicket", name: "Resin Thicket", kind: "farm", x: 38, y: 22, note: "Ambermite colony under the giant resin tree." },
    { id: "lm_amber_hollow", name: "Glider Hollow", kind: "farm", x: 80, y: 72, note: "Lunari warren; they flee, so corner them." },
    { id: "lm_amber_crag", name: "Crag Outcrop", kind: "farm", x: 126, y: 70, note: "Ambermite swarming among the rocks." },
    { id: "lm_amber_pipeline", name: "Pipeline Marker", kind: "ruin", x: 80, y: 57, note: "Exposed Aethrion pipe; the trail follows it." },
    { id: "lm_amber_climb", name: "North Climb", kind: "gate", x: 150, y: 8, note: "To Old Windmill (Lv8-12)." },
  ],
  safe_areas: [[4, 40, 14, 16], [142, 4, 14, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "resin_thicket", name: "Resin Thicket", rects: [[20, 8, 36, 30]], species: [{ monster_id: "mob_0003", weight: 1 }], target_alive: 40, respawn_sec: [6, 14],
      design_note: "Dense aggressive mites under resin trees: a ready-made 30-mob train for players who just unlocked Iron Cyclone at Lv5." },
    { id: "glider_hollow", name: "Glider Hollow", rects: [[60, 60, 40, 28]], species: [{ monster_id: "mob_0004", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "Lunari flee when hit; the hollow is ringed by forest so fleeing gliders bunch against the trees for a clean AoE." },
    { id: "crag_outcrop", name: "Crag Outcrop", rects: [[106, 54, 38, 32]], species: [{ monster_id: "mob_0003", weight: 1 }], target_alive: 30, respawn_sec: [8, 18],
      design_note: "Rock-strewn ground splits the aggressive mites into small packs that pour out of the gaps; walk in carelessly and the whole outcrop comes to you." },
    { id: "trailside_grove", name: "Trailside Grove", rects: [[64, 8, 36, 26]], species: [{ monster_id: "mob_0003", weight: 50 }, { monster_id: "mob_0004", weight: 50 }], target_alive: 20, respawn_sec: [8, 16],
      design_note: "Mixed aggressive + fleeing: an aggressive pack drags fleeing gliders along, a small lesson in mixed AI." },
  ],
  npcs: [npc("npc_lum_amber_trail_scout", "Trail Scout Wren", [13, 43], "E", "scout")],
};

const runeRing: Prop[] = Array.from({ length: 6 }, (_, i) => ({
  kind: "rune_stone" as const, x: Math.round(24 + 6 * Math.cos((i * Math.PI) / 3)), y: Math.round(68 + 6 * Math.sin((i * Math.PI) / 3)), block: 1,
}));

const whispergrass: MapDesign = {
  id: "lum_fld_03", name: "Whispergrass", type: "field", role: "North of Avelorn: tall-grass plains with a rune circle; the first bruiser field.",
  levels: [5, 9], size: [128, 128], arrival: [63, 117], ground: "grass", theme: "wind-combed tall grass, standing stones, scree",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[63, 127], [62, 100], [54, 76], [62, 58], [84, 48], [127, 43]], width: 4, kind: "dirt" },
    { points: [[54, 76], [32, 70], [24, 62]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "rock", shape: { ellipse: [30, 30, 4, 3] } },
    { kind: "rock", shape: { ellipse: [42, 20, 3, 3] } },
    { kind: "water", shape: { ellipse: [96, 106, 10, 7] } },
    { kind: "forest", shape: { ellipse: [20, 106, 12, 10] } },
    { kind: "cliff", shape: { poly: [[104, 60], [122, 58], [122, 80], [110, 84]] } },
  ],
  props: [
    ...runeRing,
    { kind: "lattice_obelisk", x: 24, y: 68, block: 2 },
    { kind: "aether_pylon", x: 68, y: 82, block: 1 },
    { kind: "tent", x: 68, y: 114, block: 2 },
    { kind: "tent", x: 112, y: 38, block: 2 },
  ],
  scatter: [
    { kind: "bush", count: 220, block: 0, scale: [0.7, 1.3] },
    { kind: "tree", count: 50, block: 1, scale: [0.8, 1.2] },
    { kind: "rock", count: 40, area: [10, 10, 44, 40], block: 1, scale: [0.7, 1.4] },
  ],
  landmarks: [
    { id: "lm_whisper_camp_s", name: "South Camp", kind: "camp", x: 63, y: 114, note: "Arrival from Avelorn." },
    { id: "lm_whisper_circle", name: "Rune Circle", kind: "shrine", x: 24, y: 68, note: "Aethrion standing stones round a lattice obelisk." },
    { id: "lm_whisper_run", name: "Cliffside Run", kind: "farm", x: 90, y: 80, note: "Open grass under the cliff where Craglets roam." },
    { id: "lm_whisper_scree", name: "Scree Slope", kind: "farm", x: 32, y: 30, note: "Craglet nests among fallen rock." },
    { id: "lm_whisper_brambles", name: "Bramble Ridge", kind: "farm", x: 84, y: 24, note: "Thornback herds." },
    { id: "lm_whisper_east", name: "East Path", kind: "gate", x: 118, y: 43, note: "To Old Windmill (Lv8-12)." },
  ],
  safe_areas: [[54, 108, 18, 14], [106, 36, 13, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "cliffside_run", name: "Cliffside Run", rects: [[70, 64, 32, 28]], species: [{ monster_id: "mob_0005", weight: 1 }], target_alive: 30, respawn_sec: [6, 14],
      design_note: "Wide-open grass bounded by the east cliff: assisting Craglets answer each other's calls, so a pull here becomes a slow wall of bruisers backed against the cliff face." },
    { id: "craglet_scree", name: "Scree Slope", rects: [[14, 14, 36, 32]], species: [{ monster_id: "mob_0005", weight: 1 }], target_alive: 35, respawn_sec: [7, 16],
      design_note: "Main Craglet farm at the low end of the band; rocks break line so packs come in waves." },
    { id: "thornback_brambles", name: "Bramble Ridge", rects: [[64, 10, 40, 28]], species: [{ monster_id: "mob_0006", weight: 1 }], target_alive: 30, respawn_sec: [9, 18],
      design_note: "Thornback at the top of the band (Lv8): the step-up before Old Windmill." },
    { id: "rune_circle", name: "Rune Circle", rects: [[10, 54, 28, 28]], species: [{ monster_id: "mob_0005", weight: 50 }, { monster_id: "mob_0006", weight: 50 }], target_alive: 20, respawn_sec: [9, 18],
      design_note: "Standing stones split a mixed bruiser pack; good practice for cone skills through gaps." },
  ],
  npcs: [npc("npc_lum_whispergrass_scout", "Whispergrass Scout", [58, 112], "N", "scout")],
};

const oldWindmill: MapDesign = {
  id: "lum_fld_04", name: "Old Windmill", type: "field", role: "Mid-region hub field with a rest camp; the Dustwing swarm is Lumeris's signature horde.",
  levels: [8, 12], size: [144, 112], arrival: [72, 66], ground: "grass", theme: "an Aethrion windmill still turning over bramble fields and a millrace",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 55], [30, 56], [62, 57]], width: 4, kind: "dirt" },
    { points: [[73, 111], [73, 90], [70, 72], [66, 60]], width: 4, kind: "dirt" },
    { points: [[80, 58], [110, 44], [143, 33]], width: 4, kind: "dirt" },
    { points: [[62, 57], [80, 58]], width: 4, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { rect: [86, 62, 4, 40] } },
    { kind: "water", shape: { ellipse: [108, 98, 8, 5] } },
    { kind: "fence", shape: { rect: [10, 62, 44, 1] } },
    { kind: "forest", shape: { ellipse: [124, 78, 10, 14] } },
  ],
  props: [
    { kind: "windmill", x: 72, y: 49, block: 5, scale: 1.5 },
    { kind: "gear_ruin", x: 20, y: 22, block: 3 }, { kind: "gear_ruin", x: 32, y: 32, block: 2 }, { kind: "gear_ruin", x: 14, y: 34, block: 2 },
    { kind: "brass_pipe", x: 86, y: 58, block: 0 },
    { kind: "waterwheel", x: 91, y: 70, block: 2 },
    { kind: "tent", x: 66, y: 68, block: 2 },
    { kind: "aether_pylon", x: 80, y: 66, block: 1 },
    { kind: "tent", x: 7, y: 50, block: 2 }, { kind: "tent", x: 137, y: 27, block: 2 },
  ],
  scatter: [
    { kind: "bush", count: 160, block: 0, scale: [0.7, 1.2] },
    { kind: "tree", count: 50, block: 1, scale: [0.8, 1.2] },
    { kind: "fence_post", count: 30, area: [10, 64, 44, 34], block: 0 },
    { kind: "crate", count: 8, area: [8, 10, 34, 30], block: 1 },
  ],
  landmarks: [
    { id: "lm_mill_windmill", name: "The Old Windmill", kind: "lookout", x: 72, y: 49, note: "Its sails' updraft is why the Dustwing swarm gathers here." },
    { id: "lm_mill_camp", name: "Miller's Camp", kind: "camp", x: 72, y: 66, note: "Rest camp with a medic, at the hub of three roads." },
    { id: "lm_mill_brambles", name: "Bramble Fields", kind: "farm", x: 30, y: 82, note: "Fenced bramble pasture overrun by Dustwings." },
    { id: "lm_mill_sails", name: "Sail Hill", kind: "farm", x: 72, y: 28, note: "Dustwing horde under the sails." },
    { id: "lm_mill_gears", name: "Gear Yard", kind: "ruin", x: 24, y: 24, note: "Scrapped Aethrion gearing." },
    { id: "lm_mill_race", name: "Millrace", kind: "farm", x: 104, y: 78, note: "Dustwings skim the channel." },
  ],
  safe_areas: [[64, 62, 18, 10], [4, 48, 12, 14], [66, 96, 14, 12], [124, 26, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "bramble_fields", name: "Bramble Fields", rects: [[10, 66, 44, 32]], species: [{ monster_id: "mob_0007", weight: 1 }], target_alive: 35, respawn_sec: [8, 16],
      design_note: "Aggressive Dustwings over the fenced pasture: the fence funnels a diving swarm through the gate into one tight train." },
    { id: "mill_sails", name: "Sail Hill", rects: [[48, 12, 48, 30]], species: [{ monster_id: "mob_0007", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature horde: 40 aggressive, fast Dustwings that will happily form a 30-60 train. Respawn is quick so the hill refills between trains." },
    { id: "gear_yard", name: "Gear Yard", rects: [[8, 10, 34, 28]], species: [{ monster_id: "mob_0007", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Scrap piles break the ground into lanes; Dustwing packs dive down each lane at once." },
    { id: "millrace", name: "Millrace", rects: [[92, 64, 26, 30]], species: [{ monster_id: "mob_0007", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Dustwings hunting over the channel by the waterwheel: the water splits the pocket, so trains have to loop round it." },
  ],
  npcs: [
    npc("npc_lum_windmill_medic", "Miller's Camp Medic", [70, 65], "S", "healer"),
    npc("npc_lum_windmill_scout", "Windmill Scout Hale", [76, 65], "S", "scout"),
  ],
};

const moonbrook: MapDesign = {
  id: "lum_fld_05", name: "Moonbrook", type: "field", role: "A brook running north-south; amphibians on the banks, ranged hunters in the marsh.",
  levels: [11, 15], size: [112, 144], arrival: [9, 33], ground: "moss", theme: "moonlit brook, reed marsh and an Aethrion waterwheel",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 33], [30, 36], [52, 46], [60, 70], [70, 100], [58, 125], [57, 143]], width: 4, kind: "dirt" },
    { points: [[52, 46], [66, 46]], width: 4, kind: "bridge" },
    { points: [[64, 92], [74, 100]], width: 4, kind: "bridge" },
  ],
  blockers: [
    { kind: "water", shape: { poly: [[56, 0], [64, 0], [66, 30], [58, 60], [64, 90], [52, 120], [48, 144], [40, 144], [44, 120], [56, 90], [50, 60], [58, 30]] } },
    { kind: "water", shape: { ellipse: [22, 84, 4, 3] } },
    { kind: "water", shape: { ellipse: [36, 98, 3, 4] } },
    { kind: "forest", shape: { ellipse: [96, 64, 10, 12] } },
  ],
  props: [
    { kind: "waterwheel", x: 67, y: 40, block: 2 },
    { kind: "aqueduct", x: 58, y: 80, block: 0, scale: 1.3 },
    { kind: "lattice_obelisk", x: 84, y: 56, block: 2 },
    { kind: "tent", x: 7, y: 28, block: 2 }, { kind: "tent", x: 62, y: 129, block: 2 },
    { kind: "rune_stone", x: 30, y: 60, block: 1 },
  ],
  scatter: [
    { kind: "bush", count: 140, area: [6, 66, 44, 44], block: 0, scale: [0.8, 1.4] },
    { kind: "tree", count: 70, block: 1, scale: [0.8, 1.2] },
    { kind: "bush", count: 80, block: 0, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_moon_camp", name: "West Camp", kind: "camp", x: 9, y: 33, note: "Arrival from Old Windmill." },
    { id: "lm_moon_ford", name: "Brook Ford", kind: "crossroads", x: 59, y: 46, note: "Bridge by the waterwheel." },
    { id: "lm_moon_wheel", name: "Aethrion Waterwheel", kind: "ruin", x: 67, y: 40, note: "Still turning; powers nothing." },
    { id: "lm_moon_brookbed", name: "Brookbed", kind: "farm", x: 82, y: 26, note: "Brookfin bask on the east bank." },
    { id: "lm_moon_marsh", name: "Reed Marsh", kind: "farm", x: 26, y: 88, note: "Reedstalker hunting ground." },
    { id: "lm_moon_banks", name: "Moonlit Banks", kind: "farm", x: 84, y: 110, note: "Mixed amphibians and hunters." },
    { id: "lm_moon_flats", name: "Dust Flats", kind: "farm", x: 24, y: 124, note: "Brookfin sunning on the dry flats." },
    { id: "lm_moon_south", name: "Orchard Road", kind: "gate", x: 57, y: 133, note: "To Broken Orchard (Lv14-18)." },
  ],
  safe_areas: [[4, 26, 14, 14], [50, 124, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "brookbed", name: "Brookbed", rects: [[66, 10, 34, 34]], species: [{ monster_id: "mob_0008", weight: 1 }], target_alive: 40, respawn_sec: [6, 14],
      design_note: "Passive Brookfin on the east bank: gather them with Anchor Shout (unlocked Lv8) for the first deliberate taunt-pull." },
    { id: "reed_marsh", name: "Reed Marsh", rects: [[8, 68, 36, 38]], species: [{ monster_id: "mob_0009", weight: 1 }], target_alive: 35, respawn_sec: [7, 16],
      design_note: "Aggressive ranged Reedstalkers among marsh pools: players learn to break line of sight and pull them into melee." },
    { id: "moonlit_banks", name: "Moonlit Banks", rects: [[70, 94, 32, 30]], species: [{ monster_id: "mob_0008", weight: 50 }, { monster_id: "mob_0009", weight: 50 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Mixed passive + ranged: the region's most efficient pack if pulled correctly." },
    { id: "dust_flats", name: "Dust Flats", rects: [[8, 110, 32, 26]], species: [{ monster_id: "mob_0008", weight: 1 }], target_alive: 20, respawn_sec: [6, 14],
      design_note: "Passive Brookfin sunning on the dry southern flats: a quiet, easy gather for under-levelled arrivals." },
  ],
  npcs: [npc("npc_lum_moonbrook_scout", "Moonbrook Scout", [12, 28], "E", "scout")],
};

// Orchard: rows of fruit trees every 4 cells, gaps every 6 rows of cells.
const orchardRows: Prop[] = [];
for (let y = 22; y < 58; y += 6) for (let x = 22; x < 68; x += 4) if ((x + y) % 12 !== 0) orchardRows.push({ kind: "dead_tree", x, y, block: 1, scale: 0.9 });

const brokenOrchard: MapDesign = {
  id: "lum_fld_06", name: "Broken Orchard", type: "field", role: "The region's last field: dense rot hordes, a rot-choked pump house, and the cave down to Hollowroot.",
  levels: [14, 18], size: [136, 136], arrival: [63, 9], ground: "grass", theme: "a dying Aethrion orchard and its broken pump house",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[63, 0], [63, 30], [72, 46], [74, 62], [60, 90], [90, 96], [120, 99], [130, 99]], width: 4, kind: "dirt" },
    { points: [[60, 90], [40, 92], [30, 94]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { rect: [80, 22, 40, 2] } },
    { kind: "water", shape: { rect: [80, 34, 40, 2] } },
    { kind: "machine", shape: { rect: [88, 66, 10, 8] } },
    { kind: "ruin_wall", shape: { rect: [16, 80, 2, 14] } },
    { kind: "ruin_wall", shape: { rect: [24, 104, 16, 2] } },
    { kind: "ruin_wall", shape: { rect: [46, 78, 2, 10] } },
    { kind: "cliff", shape: { rect: [126, 84, 6, 12] } },
    { kind: "cliff", shape: { rect: [126, 103, 6, 12] } },
  ],
  props: [
    ...orchardRows,
    { kind: "cave_mouth", x: 131, y: 99, block: 0, scale: 1.4 },
    { kind: "brass_pipe", x: 100, y: 70, block: 0 }, { kind: "gear_ruin", x: 84, y: 62, block: 2 },
    { kind: "crystal", x: 30, y: 96, block: 1 }, { kind: "crystal", x: 40, y: 84, block: 1 },
    { kind: "tent", x: 68, y: 6, block: 2 }, { kind: "tent", x: 112, y: 103, block: 2 },
    { kind: "aether_pylon", x: 120, y: 94, block: 1 },
  ],
  scatter: [
    { kind: "dead_tree", count: 60, block: 1, scale: [0.8, 1.2] },
    { kind: "bush", count: 120, block: 0, scale: [0.6, 1.1] },
    { kind: "tree", count: 30, block: 1 },
  ],
  landmarks: [
    { id: "lm_orch_gate", name: "Orchard Gate", kind: "gate", x: 63, y: 8, note: "Arrival from Moonbrook." },
    { id: "lm_orch_rows", name: "Rotting Rows", kind: "farm", x: 44, y: 40, note: "Rotroot among dead fruit trees." },
    { id: "lm_orch_ditch", name: "Irrigation Ditch", kind: "farm", x: 100, y: 28, note: "Rotroot creeping along the old channels." },
    { id: "lm_orch_greenhouse", name: "Collapsed Greenhouse", kind: "ruin", x: 34, y: 94, note: "Aethrion glasshouse ruins." },
    { id: "lm_orch_pump", name: "Old Pump House", kind: "ruin", x: 92, y: 70, note: "Rotroot knot round the leaking machine." },
    { id: "lm_orch_mouth", name: "Hollowroot Mouth", kind: "gate", x: 128, y: 99, note: "Cave lift to Hollowroot Cavern; Guild Pass required." },
  ],
  safe_areas: [[56, 4, 14, 12], [108, 92, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "rotting_rows", name: "Rotting Rows", rects: [[20, 20, 46, 40]], species: [{ monster_id: "mob_0010", weight: 1 }], target_alive: 40, respawn_sec: [6, 14],
      design_note: "Slow, dense Rotroot in tree rows: rows channel a 40-60 train into lines for Meridian-style line skills." },
    { id: "irrigation_ditch", name: "Irrigation Ditch", rects: [[80, 12, 40, 30]], species: [{ monster_id: "mob_0010", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Rotroot strung out across water channels: the channels cut a slow horde into short lines." },
    { id: "collapsed_greenhouse", name: "Collapsed Greenhouse", rects: [[14, 76, 38, 34]], species: [{ monster_id: "mob_0010", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Aggressive Rotroot among broken walls; pull them through a gap for a tight AoE." },
    { id: "old_pump_house", name: "Old Pump House", rects: [[82, 60, 22, 18]], species: [{ monster_id: "mob_0010", weight: 1 }], target_alive: 25, respawn_sec: [7, 16],
      design_note: "Rotroot packed thickest round the leaking pump: a small, dense pocket and a taste of the rot that feeds from Hollowroot below." },
  ],
  npcs: [
    npc("npc_lum_orchard_scout", "Orchard Scout", [59, 7], "S", "scout"),
    npc("npc_lum_orchard_medic", "Orchard Field Medic", [114, 95], "E", "healer"),
    npc("npc_lum_hollowroot_gatekeeper", "Hollowroot Gatekeeper", [121, 100], "E", "guard"),
  ],
};

const hollowroot: MapDesign = {
  id: "lum_dun_01", name: "Hollowroot Cavern", type: "dungeon", role: "Lumeris's dungeon: root tunnels and an Aethrion pump hall around the Warden's Heart Chamber.",
  levels: [17, 20], size: [120, 120], arrival: [14, 60], ground: "cave", theme: "root-choked tunnels round a buried Aethrion pump",
  solid: true,
  carve: [
    { rect: [3, 52, 20, 16] },
    { ellipse: [40, 40, 18, 14] },
    { rect: [60, 70, 30, 22] },
    { ellipse: [30, 92, 16, 12] },
    { ellipse: [96, 36, 14, 14] },
  ],
  roads: [
    { points: [[4, 60], [24, 58], [40, 40]], width: 4, kind: "stone" },
    { points: [[40, 40], [75, 40], [96, 36]], width: 4, kind: "stone" },
    { points: [[40, 40], [44, 70], [62, 80]], width: 4, kind: "stone" },
    { points: [[44, 70], [30, 92]], width: 4, kind: "stone" },
    { points: [[88, 76], [100, 58], [96, 36]], width: 4, kind: "stone" },
  ],
  blockers: [
    { kind: "machine", shape: { rect: [72, 78, 6, 6] } },
    { kind: "rock", shape: { ellipse: [44, 36, 3, 2] } },
  ],
  props: [
    { kind: "cave_mouth", x: 2, y: 60, block: 0, scale: 1.2 },
    { kind: "tent", x: 11, y: 55, block: 2 },
    { kind: "aether_pylon", x: 96, y: 36, block: 2, scale: 1.4 },
    { kind: "brass_pipe", x: 66, y: 74, block: 0 }, { kind: "brass_pipe", x: 84, y: 88, block: 0 },
    { kind: "gear_ruin", x: 64, y: 88, block: 2 },
  ],
  scatter: [
    { kind: "crystal", count: 30, block: 1, scale: [0.6, 1.2] },
    { kind: "dead_tree", count: 25, block: 1, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_hollow_lift", name: "Lift Landing", kind: "camp", x: 14, y: 60, note: "Arrival; the Lift Keeper takes you back up." },
    { id: "lm_hollow_tunnels", name: "Root Tunnels", kind: "farm", x: 40, y: 40, note: "Barkwarden patrols in the root tunnels." },
    { id: "lm_hollow_pump", name: "Pump Hall", kind: "ruin", x: 75, y: 81, note: "Barkwarden patrols round the pump." },
    { id: "lm_hollow_burrows", name: "Root Burrows", kind: "farm", x: 30, y: 92, note: "Barkwardens in a quiet side cavern." },
    { id: "lm_hollow_heart", name: "Heart Chamber", kind: "boss_arena", x: 96, y: 36, note: "The Hollowroot Warden." },
  ],
  safe_areas: [[8, 53, 14, 14]],
  horde: { min_alive: 60, max_alive: 120 },
  pockets: [
    { id: "root_tunnels", name: "Root Tunnels", rects: [[26, 30, 30, 22]], species: [{ monster_id: "mob_0011", weight: 1 }], target_alive: 40, respawn_sec: [6, 14],
      design_note: "The largest Barkwarden patrol in the region, in a cavern you can circle; assist behaviour brings them in as one wall." },
    { id: "pump_hall", name: "Pump Hall", rects: [[62, 72, 26, 18]], species: [{ monster_id: "mob_0011", weight: 1 }], target_alive: 25, respawn_sec: [12, 24],
      design_note: "Construct hall at the cap level; assist behaviour means one pull is the whole hall." },
    { id: "root_burrows", name: "Root Burrows", rects: [[20, 84, 22, 16]], species: [{ monster_id: "mob_0011", weight: 1 }], target_alive: 25, respawn_sec: [8, 18],
      design_note: "Barkwarden side cavern, a quieter construct farm." },
    { id: "heart_chamber", name: "Heart Chamber", rects: [[90, 30, 12, 12]], species: [{ monster_id: "mob_0036", weight: 1 }], target_alive: 1, respawn_sec: [300, 420],
      design_note: "Region boss, 5-7 minute respawn." },
  ],
  npcs: [npc("npc_lum_hollowroot_lift", "Hollowroot Lift Keeper", [18, 55], "S", "teleporter", { destinations: [["lum_town_01", 0], ["lum_fld_06", 0]] })],
};

// --- dialogue ------------------------------------------------------------------------

const dialogues: DialogueDef[] = [
  ["npc_lum_guild_registrar", "Welcome to the Wayfarer Guild, Avelorn chapter. The Sundering left machines running wild out there; we survey, we clear, we report.", "Start in Dawnmeadow through the East Gate. Come back when the Mosskin herds are thinner."],
  ["npc_lum_merchant", "Rations, tonics, all fresh. Prices are Guild-fixed, so don't haggle.", "Sell me your field materials; I ship them to Sylvara."],
  ["npc_lum_healer", "Sit down, let me look at you. There, good as new.", "The tonics I can't give you away, but the Merchant sells them."],
  ["npc_lum_teleporter", "The transit lattice still runs between camps. A little coin keeps the crystals charged.", "Sylvara is further, and costs more."],
  ["npc_lum_craftsman", "Bring me materials and I'll make you something that keeps you alive.", "Copper gears? Craglets swallow them. Don't ask me why."],
  ["npc_lum_east_gate_guard", "East Gate. Dawnmeadow lies beyond: Mosskin and Sporelings. The amber mites are further east, on the Amber Trail.", "If you see three dozen of anything chasing you, run back here."],
  ["npc_lum_north_gate_guard", "North Gate to Whispergrass. Craglets and Thornbacks; not for a first day out.", "The rune circle out there hums at night."],
  ["npc_lum_dawnmeadow_scout", "Mosskin graze north-west and won't bother you. Sporelings by the pond answer each other's cries.", "Past the east road the Amber Trail is Ambermite country. They come to you."],
  ["npc_lum_amber_trail_scout", "The trail follows the old pipeline all the way to the windmill hills.", "Gliders bolt when hurt; drive them against the trees."],
  ["npc_lum_whispergrass_scout", "Craglets nest in the scree, and they swallow gears. Bring me some back.", "Thornbacks on the ridge travel in herds; take them together."],
  ["npc_lum_windmill_medic", "Rest a while. The Dustwings never stop coming while the sails turn.", "I patch up more Wayfarers here than anywhere in Lumeris."],
  ["npc_lum_windmill_scout", "Sail Hill is all Dustwing. Pull forty and spin, if you're brave.", "The millrace goes east to Moonbrook."],
  ["npc_lum_moonbrook_scout", "Brookfin won't bite unless you start it. The reeds in the marsh, though, spit.", "Pull the Reedstalkers round a corner; they'll follow you into reach."],
  ["npc_lum_orchard_scout", "This was the finest orchard in Lumeris before the pump went wrong.", "Mind the pump house. The rot grows thickest round it."],
  ["npc_lum_orchard_medic", "The rot comes from below. Something in Hollowroot is feeding it.", "Clear the rows, then go down. You'll need the Guild Pass for the lift."],
  ["npc_lum_hollowroot_gatekeeper", "Guild Pass only beyond this point. Guild orders.", "The Warden's in the Heart Chamber, east of the pump hall."],
  ["npc_lum_hollowroot_lift", "Going up? The lift reaches Avelorn or the orchard.", "Mind your head on the roots."],
].map(([npcId, ...lines]) => ({ id: npcId.replace(/^npc_/, "dlg_"), npc_id: npcId, lines }));

// --- the region ------------------------------------------------------------------------

export const lumeris: RegionDesign = {
  region: {
    id: "lum", name: "Lumeris", capital: "Avelorn", town_map_id: "lum_town_01", dungeon_map_id: "lum_dun_01", level_range: [1, 20],
    theme: "Meadows, windmills, energy pipes and cream-stone towns: the gentle edge of Aethrion's ruin.",
    ecology: "Seed and spore swarms on irrigated meadow, resin mites and gliders along the trail, reptiles and boars in the uplands, dust moths at the windmill, amphibians along Moonbrook, and rot spreading from a failing pump in the south.",
    palette: { grass: "#6a9a5c", dirt: "#b4a37c", accent: "#5ed8e6", fog: "#1d2f27" },
  },
  maps: [avelorn, dawnmeadow, amberTrail, whispergrass, oldWindmill, moonbrook, brokenOrchard, hollowroot],
  links: [
    { label: "Avelorn East Gate ⇄ Dawnmeadow", a: { map: "lum_town_01", trigger: [117, 57, 3, 7], landing: [110, 60] }, b: { map: "lum_fld_01", trigger: [0, 60, 3, 7], landing: [9, 63] } },
    { label: "Avelorn North Gate ⇄ Whispergrass", a: { map: "lum_town_01", trigger: [57, 0, 7, 3], landing: [60, 9] }, b: { map: "lum_fld_03", trigger: [60, 125, 7, 3], landing: [63, 117] } },
    { label: "Dawnmeadow ⇄ Amber Trail", a: { map: "lum_fld_01", trigger: [125, 41, 3, 7], landing: [117, 44] }, b: { map: "lum_fld_02", trigger: [0, 45, 3, 7], landing: [9, 48] } },
    { label: "Amber Trail ⇄ Old Windmill", a: { map: "lum_fld_02", trigger: [146, 0, 7, 3], landing: [149, 10] }, b: { map: "lum_fld_04", trigger: [70, 109, 7, 3], landing: [73, 101] } },
    { label: "Whispergrass ⇄ Old Windmill", a: { map: "lum_fld_03", trigger: [125, 40, 3, 7], landing: [117, 43] }, b: { map: "lum_fld_04", trigger: [0, 52, 3, 7], landing: [9, 55] } },
    { label: "Old Windmill ⇄ Moonbrook", a: { map: "lum_fld_04", trigger: [141, 30, 3, 7], landing: [133, 33] }, b: { map: "lum_fld_05", trigger: [0, 30, 3, 7], landing: [9, 33] } },
    { label: "Moonbrook ⇄ Broken Orchard", a: { map: "lum_fld_05", trigger: [54, 141, 7, 3], landing: [57, 133] }, b: { map: "lum_fld_06", trigger: [60, 0, 7, 3], landing: [63, 9] } },
    { label: "Broken Orchard ⇄ Hollowroot Cavern", requirements: ["item:itm_0083"], a: { map: "lum_fld_06", trigger: [128, 96, 3, 7], landing: [118, 99] }, b: { map: "lum_dun_01", trigger: [3, 57, 3, 6], landing: [14, 60] } },
  ],
  monsters,
  materials,
  items,
  shops: [{ id: "shop_lum_supply", npc_id: "npc_lum_merchant", items: [{ item_id: "itm_0075", base_price: 8 }, { item_id: "itm_0076", base_price: 25 }, { item_id: "itm_0077", base_price: 30 }] }],
  recipes,
  quests,
  dialogues,
};
