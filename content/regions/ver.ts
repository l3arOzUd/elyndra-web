// VERDANTIS — the giant-tree forest (Lv 15-40), following the Lumeris conventions.
//
// Theme: forest floors under trees a hundred metres tall, Aethrion bio-machines
// that were built to tend them and never stopped, and the jade light of sap
// that still carries aether. Everything here is grafted: wood onto brass,
// moss onto gears, spores onto engines.
//
// Level ladder: seven fields climbing 3 levels at a time (15 → 37) and the
// Heartwood Engine on top (36-40). Each field's species sit within ±2 of its
// band (the elite and the boss within ±4).
//
// Geography (north up):
//
//   Canopy Steps ── Graftwood
//        │              │
//    Mossbridge ── Fernreach      Vineworks ── Elderroot
//        │          │                              │
//        └─ Sylvara ┘                         Spore Basin ── Heartwood Engine
//
// Sylvara's North Gate opens on Mossbridge and its East Gate on Fernreach;
// Fernreach's north path also climbs into Mossbridge. From Canopy Steps the
// road runs east to Graftwood, then south to Vineworks, east to Elderroot,
// south down into the Spore Basin, and east into the Heartwood Engine.

import type { DialogueDef, ItemDef, NpcDef, Prop, QuestDef, RecipeDef } from "../../src/data/schema";
import { expToNext, hourlyIncome } from "../model";
import type { MapDesign, RegionDesign } from "../types";

const questExp = (level: number, share: number) => Math.round(expToNext(level) * share);
/** Quest coin is priced as minutes of farming income at that level (Lumeris pays ~1.5-3 min). */
const questGold = (level: number, minutes: number) => Math.round((hourlyIncome(level) * minutes) / 60 / 50) * 50;

// --- monsters ------------------------------------------------------------------

const monsters: RegionDesign["monsters"] = [
  {
    id: "mob_0012", name: "Graftling", level: 16, archetype: "swarm", family: "bio-machine", element: "nature", behavior: "passive",
    mods: { hp: 1.1, speed: 1.1 }, why: "A twig body on folding brass hinges: the hinges make it sturdier than a plain sapling (+10% HP) and stiff-legged (10% slower). Passive: the region's welcome mat, a herd to gather after the Lumeris dungeon.",
    drops: { common: "itm_0023", uncommon: "itm_0024" },
    ecology: "Fallen branches that the old Aethrion grafting frames bolted hinges onto; they wander the fern floor near Sylvara, rooting for a few hours at a time, and ignore anyone who leaves them be.",
    art_brief: "A knee-high bundle of living twigs on three folding brass hinge-legs, a jade sap bead glowing at the joint; leaf tufts for a head; bark brown, brass, jade.", sprite: "graftling_2d",
  },
  {
    id: "mob_0040", name: "Mossback Newt", level: 18, archetype: "swarm", family: "amphibian", element: "water", behavior: "assist",
    mods: { def: 1.25, atk: 0.85 }, why: "Its back is a thick moss mantle that soaks up blows (+25% DEF) and it has no real teeth (-15% ATK). Assist: one croak brings the whole bank, the region's first pack-pull of water mobs.",
    drops: { common: "itm_0100", uncommon: "itm_0101" },
    ecology: "Cat-sized newts that live under the moss of Mossbridge's creek, on the south shallows and round the obelisk; they bask in rows on the banks and croak for help when one is hurt.",
    art_brief: "A plump newt with a carpet of green moss on its back, a pale belly and round jade eyes; small water droplets glinting on the moss.",
  },
  {
    id: "mob_0013", name: "Sapdrone", level: 20, archetype: "swarm", family: "bio-machine", element: "nature", behavior: "passive",
    mods: { hp: 0.85, speed: 0.75, atk: 1.15 }, why: "A flying sap-harvester: a hollow shell (-15% HP), fast wings (25% faster) and a tapping needle that stings (+15% ATK). The first aggressive horde in Verdantis, and it guards the trees it taps.",
    drops: { common: "itm_0025", uncommon: "itm_0026", rare: "itm_0118" },
    ecology: "Aethrion harvesting drones that still tap the giant trunks for sap; they hang in clouds round the tapped trunks of Mossbridge, north of the creek and on the north-west slope, and dive on anything that comes near the taps. A drone that drank too long sometimes carries a bead of Living Jade.",
    art_brief: "A fist-sized brass beetle-drone with four glassy wings and a long needle proboscis, its belly tank sloshing with glowing jade sap.", sprite: "sapdrone_2d",
  },
  {
    id: "mob_0041", name: "Jadewing Moth", level: 22, archetype: "ranged", family: "insect", element: "wind", behavior: "passive",
    mods: { range: 6, hp: 0.9 }, why: "It hovers out of reach and flicks glowdust bolts from 6 cells (+1 range); papery wings (-10% HP). Ranged lesson for the region: pull the moths into the melee pack.",
    drops: { common: "itm_0102", uncommon: "itm_0103" },
    ecology: "Large moths that live in the canopy galleries where the jade light is strongest; they drift down to the middle and upper terraces of Canopy Steps to hunt.",
    art_brief: "A moth the size of a hawk with translucent jade wings veined like circuitry, glowing eyespots and trailing luminous dust.",
  },
  {
    id: "mob_0042", name: "Barkhound", level: 23, archetype: "bruiser", family: "beast", element: "earth", behavior: "assist",
    mods: { speed: 0.85, def: 1.2 }, why: "A hunting hound with bark armour (+20% DEF) that runs faster than other bruisers (15% faster). Assist: the den answers one hound's howl, so a pull is a pack.",
    drops: { common: "itm_0104", uncommon: "itm_0105" },
    ecology: "Wolf-like beasts whose hides grow bark plates; they den on the lower terrace of Canopy Steps and range up to the top terrace by the Graftwood road.",
    art_brief: "A lean wolf with overlapping bark plates on its back and shoulders, moss on its tail, jade-green eyes; heavy jaws with wooden fangs.",
  },
  {
    id: "mob_0014", name: "Vinecrawler", level: 25, archetype: "construct", family: "construct", element: "nature", behavior: "passive",
    mods: { speed: 0.85, def: 0.8 }, why: "Vines dragging a gear-frame: quicker than a frame on its own legs (15% faster), but vine is softer than plate (-20% DEF). The first construct horde: quick enough to train, tough enough to need AoE.",
    drops: { common: "itm_0027", uncommon: "itm_0028" },
    ecology: "Vines that strangled a crawling Aethrion maintenance frame and now drive it; they tend the trellises, grafting yard and wild woods of Graftwood and attack anything that cuts a vine.",
    art_brief: "A spider-shaped brass gear-frame wrapped and pulled by thick green vines, leaves sprouting from the gear teeth, a cracked jade lens at the core.",
  },
  {
    id: "mob_0043", name: "Pruning Tender", level: 27, archetype: "support", family: "bio-machine", element: "nature", behavior: "assist",
    mods: { range: 5, def: 1.2 }, why: "A brass-shelled gardening machine (+20% DEF) that sprays grafting sap from 5 cells (+1 range). It hangs back behind its own pack and patches it, so players learn to dive the support first.",
    drops: { common: "itm_0106", uncommon: "itm_0107", rare: "itm_0118" },
    ecology: "The Aethrion gardener machines that grafted Verdantis; they still prune and seal cuts on the Vineworks terraces and conduits, and rush to any machine in trouble. Their sap tanks sometimes set into Living Jade.",
    art_brief: "A barrel-bodied brass gardener on three spindly legs with shear-arms and a sap nozzle, a glass tank of jade sap on its back, moss on the lid.",
  },
  {
    id: "mob_0044", name: "Thistlehare", level: 29, archetype: "swarm", family: "beast", element: "wind", behavior: "passive",
    mods: { hp: 0.8, atk: 0.75, speed: 0.7 }, why: "A burr-coated hare: frail (-20% HP, -25% ATK) and very fast (30% faster) so it bolts when hit. A chase target that rewards cornering a herd against the vine terraces.",
    drops: { common: "itm_0108", uncommon: "itm_0109" },
    ecology: "Hares that graze the vine terraces of Vineworks and burrow round its old water pump; their thistle coats spread seed wherever they run.",
    art_brief: "A long-eared hare whose fur is a mass of purple-green thistle burrs, a white cotton tail, huge dark eyes; mid-leap pose.",
  },
  {
    id: "mob_0015", name: "Root Sentinel", level: 32, archetype: "construct", family: "construct", element: "nature", behavior: "aggressive",
    mods: { hp: 1.15, speed: 1.2 }, why: "A giant sentinel frame sheathed in roots: deep root armour (+15% HP), heavy root-feet (20% slower). Slow and thick, the region's signature big-AoE horde before the Spore Basin.",
    drops: { common: "itm_0029", uncommon: "itm_0030", rare: "itm_0118" },
    ecology: "Aethrion guard frames that the elder trees' roots grew through; they walk the root ridges, old warrens and Basin slope of Elderroot. Their core is jade-stained, sometimes solid Living Jade.",
    art_brief: "A three-metre humanoid guard of brass and stone, completely laced with thick roots, a lantern-like jade eye under a hood of bark.",
  },
  {
    id: "mob_0045", name: "Antlered Engine", level: 34, archetype: "elite", family: "bio-machine", element: "earth", behavior: "aggressive",
    mods: { atk: 1.1, speed: 0.9 }, why: "Elite: a stag-shaped engine whose charges hit hard (+10% ATK) and come fast (10% faster). Only four roam the Engine Glade; a two-to-three minute fight for a solo player, a quest target in Elderroot.",
    drops: { common: "itm_0110", uncommon: "itm_0111", extra: [{ item_id: "itm_0073", rate_bp: 1500 }] },
    ecology: "Aethrion survey engines built in the shape of the forest's great stags; four still graze the Engine Glade beneath the Eldest and charge any intruder. Their antler coils hold Aetherite.",
    art_brief: "A huge stag of brass ribs and living wood, antlers made of coiled copper and branches hung with moss, a furnace-glow of jade in its chest.",
  },
  {
    id: "mob_0046", name: "Sporebloat", level: 35, archetype: "swarm", family: "fungus", element: "shadow", behavior: "passive",
    mods: { hp: 1.25, speed: 1.25 }, why: "A drifting gas-bag of spores: bloated (+25% HP) and slow (25% slower). Aggressive but slow, so the Spore Basin is a place for 50+ trains and big pulls.",
    drops: { common: "itm_0112", uncommon: "itm_0113" },
    ecology: "Fungal sacs that grow in the Heartwood Engine's exhaust; they drift out of the vents and fill the Spore Basin from rim to pool.",
    art_brief: "A floating puffball the size of a barrel, dark violet with glowing jade spore-vents, short root tendrils hanging below.",
  },
  {
    id: "mob_0047", name: "Spore Matron", level: 36, archetype: "support", family: "fungus", element: "nature", behavior: "assist",
    mods: { hp: 1.2, range: 5 }, why: "A thick-stalked mother fungus (+20% HP) that spits spores from 5 cells (+1 range). It stands in rings inside the Heartwood Engine and wakes its sisters, so a pull rewards killing the nearest matrons first.",
    drops: { common: "itm_0114", uncommon: "itm_0115" },
    ecology: "The mother fungi that seed the Sporebloats; they stand in rings in the Engine's sap conduits and line its spore lung, and their spores drift out to the Basin.",
    art_brief: "A tall mushroom with a wide frilled cap, a stalk like a robed figure, jade spore-lanterns hanging under the cap.",
  },
  {
    id: "mob_0048", name: "Heartwood Pistonguard", level: 38, archetype: "construct", family: "construct", element: "earth", behavior: "assist",
    mods: { def: 1.2, atk: 1.15, attack_speed: 1.15 }, why: "Piston-driven guards: heartwood plating (+20% DEF), slow heavy piston strikes (+15% ATK, 15% slower attacks). Assist: the halls answer as one, which makes the Piston Hall a single big pull.",
    drops: { common: "itm_0116", uncommon: "itm_0117" },
    ecology: "The guard engines of the Heartwood Engine; they hold the Piston Hall round the main piston and never leave it.",
    art_brief: "A squat brass guardian with pistons for arms, its body cased in polished heartwood, steam and spores venting from its back.",
  },
  {
    id: "mob_0049", name: "Heartwood Regent", level: 40, archetype: "boss", family: "bio-machine", element: "nature", behavior: "aggressive",
    mods: { range: 3 }, why: "Region boss with lashing root-arms that reach 3 cells (+1 range): standing just out of melee is not enough.",
    drops: { common: "itm_0116", uncommon: "itm_0117", rare: "itm_0119", extra: [{ item_id: "itm_0073", rate_bp: 10000, qty: [3, 5] }, { item_id: "itm_0118", rate_bp: 2500 }] },
    ecology: "The Engine's heart: an Aethrion pump fused with the oldest tree in Verdantis. It drives the sap that lights the forest and the spores that are now choking it.",
    art_brief: "A towering figure of living wood grown round a brass pump-heart, a crown of branches, roots for legs, jade light pulsing through its veins with each pump stroke.",
  },
];

// --- items -----------------------------------------------------------------------

const materials: RegionDesign["materials"] = [
  { id: "itm_0023", name: "Graftling Fragment", level: 16, tier: "common", description: "A hinged twig from a Graftling. Kindling, or a cheap splint." },
  { id: "itm_0024", name: "Graftling Core", level: 16, tier: "uncommon", description: "The brass hinge at a Graftling's heart, still oiled with sap." },
  { id: "itm_0025", name: "Sapdrone Fragment", level: 20, tier: "common", description: "A glassy wing panel from a Sapdrone." },
  { id: "itm_0026", name: "Sapdrone Core", level: 20, tier: "uncommon", description: "A Sapdrone's sap tank, half full and still warm." },
  { id: "itm_0027", name: "Vinecrawler Fragment", level: 25, tier: "common", description: "A length of vine wound round a brass gear." },
  { id: "itm_0028", name: "Vinecrawler Core", level: 25, tier: "uncommon", description: "The cracked jade lens that steered a Vinecrawler." },
  { id: "itm_0029", name: "Root Sentinel Fragment", level: 32, tier: "common", description: "A root-laced stone plate from a Root Sentinel." },
  { id: "itm_0030", name: "Root Sentinel Core", level: 32, tier: "uncommon", description: "A Root Sentinel's lantern eye, jade light still flickering." },
  { id: "itm_0100", name: "Newt Slick", level: 18, tier: "common", description: "Slippery skin-oil from a Mossback Newt. Tonic makers' base." },
  { id: "itm_0101", name: "Moss Mantle", level: 18, tier: "uncommon", description: "An intact moss pelt from a Newt's back; it never dries out." },
  { id: "itm_0102", name: "Jadewing Scale", level: 22, tier: "common", description: "A scale of jade wing-dust that glows for days." },
  { id: "itm_0103", name: "Glowdust Sac", level: 22, tier: "uncommon", description: "The gland a Jadewing Moth fires its bolts from." },
  { id: "itm_0104", name: "Barkhound Plate", level: 23, tier: "common", description: "A bark plate shed from a Barkhound's shoulder." },
  { id: "itm_0105", name: "Ironbark Fang", level: 23, tier: "uncommon", description: "A wooden fang as hard as iron." },
  { id: "itm_0106", name: "Pruning Blade", level: 27, tier: "common", description: "A worn shear-blade from a Pruning Tender." },
  { id: "itm_0107", name: "Graft Spindle", level: 27, tier: "uncommon", description: "The spindle that winds a Tender's grafting tape; precise Aethrion work." },
  { id: "itm_0108", name: "Thistle Fur", level: 29, tier: "common", description: "A tuft of burr-studded Thistlehare fur." },
  { id: "itm_0109", name: "Cottontail Burr", level: 29, tier: "uncommon", description: "A Thistlehare's tail burr, packed with seeds." },
  { id: "itm_0110", name: "Antler Coil", level: 34, tier: "common", description: "A copper coil grown through a branch of antler." },
  { id: "itm_0111", name: "Engine Antler", level: 34, tier: "uncommon", description: "A whole antler tine, coils intact; it hums when held." },
  { id: "itm_0112", name: "Bloat Membrane", level: 35, tier: "common", description: "Violet skin from a burst Sporebloat." },
  { id: "itm_0113", name: "Spore Bladder", level: 35, tier: "uncommon", description: "A sealed Sporebloat bladder. Handle gently." },
  { id: "itm_0114", name: "Matron Mycelium", level: 36, tier: "common", description: "A felt of threads from a Spore Matron's stalk." },
  { id: "itm_0115", name: "Spore Lantern", level: 36, tier: "uncommon", description: "One of the jade lanterns that hang under a Matron's cap." },
  { id: "itm_0116", name: "Piston Bark", level: 38, tier: "common", description: "Polished heartwood plate from a Pistonguard." },
  { id: "itm_0117", name: "Heartwood Piston", level: 38, tier: "uncommon", description: "A working piston, sleeved in heartwood." },
  { id: "itm_0118", name: "Living Jade", level: 27, tier: "rare", description: "Sap that has set into glowing jade around a thread of aether. Verdantis's prize; Sapdrones, Tenders and Sentinels carry it." },
  { id: "itm_0119", name: "Regent's Heartspring", level: 40, tier: "rare", description: "The mainspring of the Heartwood Engine's pump, grown through with living wood." },
];

const items: ItemDef[] = [];

// Craft prices: each recipe uses less value than the shop price of what it makes,
// so it is a cheaper way to stock up that turns field drops into supplies.
const recipes: RecipeDef[] = [
  { id: "rcp_ver_field_ration", npc_id: "npc_ver_craftsman", output: { item_id: "itm_0075", qty: 6 }, inputs: [{ item_id: "itm_0023", qty: 2 }], currency: 10 },
  { id: "rcp_ver_vital_tonic", npc_id: "npc_ver_craftsman", output: { item_id: "itm_0076", qty: 4 }, inputs: [{ item_id: "itm_0100", qty: 4 }], currency: 20 },
  { id: "rcp_ver_focus_tonic", npc_id: "npc_ver_craftsman", output: { item_id: "itm_0077", qty: 3 }, inputs: [{ item_id: "itm_0102", qty: 3 }, { item_id: "itm_0025", qty: 1 }], currency: 25 },
];

// --- quests: a chain that walks the player through every map in level order ------

const R = "npc_ver_guild_registrar";
const quests: QuestDef[] = [
  { id: "q_ver_intro", title: "Verdantis: First Survey", region_id: "ver", giver_npc_id: R, turn_in_npc_id: R, min_level: 15, prerequisite: null,
    objectives: [{ type: "kill", monster_id: "mob_0012", count: 40 }],
    rewards: { base_exp: questExp(15, 0.6), currency: questGold(15, 1.5), items: [{ item_id: "itm_0075", qty: 10 }] },
    summary: "Herd and clear the Graftlings of Fernreach through the East Gate. A gentle first horde after Hollowroot." },
  { id: "q_ver_mossbridge", title: "Croaks Under the Bridges", region_id: "ver", giver_npc_id: "npc_ver_mossbridge_scout", turn_in_npc_id: "npc_ver_mossbridge_scout", min_level: 18, prerequisite: "q_ver_intro",
    objectives: [{ type: "visit", map_id: "ver_fld_02", count: 1 }, { type: "kill", monster_id: "mob_0040", count: 60 }, { type: "collect", item_id: "itm_0100", count: 10 }],
    rewards: { base_exp: questExp(18, 0.45), currency: questGold(18, 2), items: [{ item_id: "itm_0076", qty: 8 }] },
    summary: "Mossback Newts call their whole bank: learn to pull a pack. Newt Slick is the Artificer's tonic base." },
  { id: "q_ver_canopy", title: "Lights in the Canopy", region_id: "ver", giver_npc_id: "npc_ver_canopy_scout", turn_in_npc_id: "npc_ver_canopy_scout", min_level: 21, prerequisite: "q_ver_mossbridge",
    objectives: [{ type: "kill", monster_id: "mob_0041", count: 80 }, { type: "kill", monster_id: "mob_0042", count: 30 }],
    rewards: { base_exp: questExp(21, 0.4), currency: questGold(21, 2), items: [{ item_id: "itm_0077", qty: 8 }] },
    summary: "Ranged moths over bruiser hound packs: pull the moths into the melee, then cleave the den." },
  { id: "q_ver_graftwood", title: "Trellis Trouble", region_id: "ver", giver_npc_id: "npc_ver_graftwood_scout", turn_in_npc_id: "npc_ver_graftwood_scout", min_level: 24, prerequisite: "q_ver_canopy",
    objectives: [{ type: "kill", monster_id: "mob_0014", count: 100 }, { type: "collect", item_id: "itm_0027", count: 15 }],
    rewards: { base_exp: questExp(24, 0.4), currency: questGold(24, 2), items: [{ item_id: "itm_0073", qty: 1 }] },
    summary: "The first construct horde: trains of Vinecrawlers down the trellis rows." },
  { id: "q_ver_vineworks", title: "The Press Still Turns", region_id: "ver", giver_npc_id: "npc_ver_vineworks_scout", turn_in_npc_id: "npc_ver_vineworks_scout", min_level: 27, prerequisite: "q_ver_graftwood",
    objectives: [{ type: "kill", monster_id: "mob_0043", count: 60 }, { type: "kill", monster_id: "mob_0044", count: 80 }],
    rewards: { base_exp: questExp(27, 0.4), currency: questGold(27, 2), items: [{ item_id: "itm_0076", qty: 10 }] },
    summary: "Pruning Tenders work the presses in packs: pull them together and clear them. Then corner the fleeing Thistlehares on the terraces." },
  { id: "q_ver_elderroot", title: "Antlers Under the Eldest", region_id: "ver", giver_npc_id: "npc_ver_elderroot_scout", turn_in_npc_id: "npc_ver_elderroot_scout", min_level: 30, prerequisite: "q_ver_vineworks",
    objectives: [{ type: "kill", monster_id: "mob_0015", count: 100 }, { type: "kill", monster_id: "mob_0045", count: 2 }],
    rewards: { base_exp: questExp(30, 0.4), currency: questGold(30, 2), items: [{ item_id: "itm_0073", qty: 2 }] },
    summary: "Root Sentinel trains on the ridges, then two Antlered Engines in the glade: the region's first elite fight." },
  { id: "q_ver_spore_basin", title: "Breath of the Engine", region_id: "ver", giver_npc_id: "npc_ver_spore_basin_scout", turn_in_npc_id: "npc_ver_spore_basin_scout", min_level: 33, prerequisite: "q_ver_elderroot",
    objectives: [{ type: "kill", monster_id: "mob_0046", count: 150 }, { type: "collect", item_id: "itm_0112", count: 12 }],
    rewards: { base_exp: questExp(33, 0.4), currency: questGold(33, 2), items: [{ item_id: "itm_0073", qty: 2 }, { item_id: "itm_0077", qty: 10 }] },
    summary: "The Basin's spores come from the Engine's vents. Thin the Sporebloats and bring back their membranes to prove it." },
  { id: "q_ver_heartwood", title: "Heart of the Engine", region_id: "ver", giver_npc_id: "npc_ver_engine_watch", turn_in_npc_id: R, min_level: 37, prerequisite: "q_ver_spore_basin",
    objectives: [{ type: "kill", monster_id: "mob_0049", count: 1 }],
    rewards: { base_exp: questExp(37, 0.8), currency: questGold(37, 4), items: [{ item_id: "itm_0073", qty: 3 }, { item_id: "itm_0118", qty: 1 }] },
    summary: "Stop the Heartwood Regent and report to Sylvara. Opens the transit to Solenia's Duskhar." },
];

// --- maps --------------------------------------------------------------------------

const npc = (id: string, name: string, position: [number, number], facing: NpcDef["facing"], role: NpcDef["role"], extra: Partial<NpcDef> = {}): Omit<NpcDef, "map_id"> =>
  ({ id, name, position, facing, role, dialogue_id: id.replace(/^npc_/, "dlg_"), shop_id: null, ...extra });

const fieldCost = (minLevel: number) => 10 + 4 * minLevel;
/** Capital-to-capital transit: 300 + 15 x the destination region's starting level. */
const capitalCost = (destMinLevel: number) => 300 + 15 * destMinLevel;

const sylvara: MapDesign = {
  id: "ver_town_01", name: "Sylvara", type: "town", role: "Region capital among the roots of the Mother Bough: services, quest hub, crafting, transit to Verdantis fields, Avelorn and Duskhar.",
  levels: [15, 40], size: [136, 124], arrival: [68, 69], ground: "moss", theme: "a root-town of timber halls and jade lanterns at the foot of a giant tree",
  border: { width: 3, kind: "forest" },
  roads: [
    { points: [[68, 64], [135, 66]], width: 5, kind: "stone" },
    { points: [[68, 64], [70, 40], [74, 0]], width: 5, kind: "stone" },
    { points: [[68, 64], [30, 70]], width: 3, kind: "stone" },
    { points: [[68, 64], [64, 96], [56, 110]], width: 3, kind: "stone" },
    { points: [[68, 64], [96, 40]], width: 3, kind: "stone" },
  ],
  blockers: [
    { kind: "building", shape: { rect: [92, 22, 22, 14] } }, // Guild Hall
    { kind: "building", shape: { rect: [36, 48, 14, 10] } }, // Medic's lodge
    { kind: "building", shape: { rect: [70, 92, 16, 12] } }, // Artificer's graftshop
    { kind: "building", shape: { rect: [16, 16, 14, 10] } },
    { kind: "building", shape: { rect: [104, 46, 12, 8] } },
    { kind: "building", shape: { rect: [112, 92, 14, 12] } },
    { kind: "building", shape: { rect: [18, 96, 14, 10] } },
    { kind: "building", shape: { rect: [94, 104, 12, 10] } },
    { kind: "water", shape: { ellipse: [114, 80, 6, 4] } },
  ],
  props: [
    { kind: "giant_tree", x: 50, y: 36, block: 5, scale: 2.6 }, // the Mother Bough
    { kind: "fountain", x: 68, y: 64, block: 3, scale: 1.3 },
    { kind: "aether_pylon", x: 60, y: 56, block: 1 }, { kind: "aether_pylon", x: 77, y: 56, block: 1 },
    { kind: "aether_pylon", x: 60, y: 74, block: 1 }, { kind: "aether_pylon", x: 77, y: 74, block: 1 },
    { kind: "hall", x: 103, y: 29, block: 0, scale: 1.4 },
    { kind: "market_stall", x: 82, y: 71, block: 2 }, { kind: "market_stall", x: 88, y: 71, block: 2 }, { kind: "market_stall", x: 94, y: 71, block: 2 },
    { kind: "transit_gate", x: 26, y: 74, block: 3 },
    { kind: "furnace", x: 74, y: 88, block: 2 }, { kind: "anvil", x: 79, y: 88, block: 1 },
    { kind: "workshop", x: 78, y: 97, block: 0 },
    { kind: "lamp_post", x: 84, y: 60, block: 1 }, { kind: "lamp_post", x: 104, y: 61, block: 1 }, { kind: "lamp_post", x: 66, y: 30, block: 1 },
    { kind: "lamp_post", x: 77, y: 14, block: 1 }, { kind: "lamp_post", x: 40, y: 66, block: 1 },
    { kind: "brass_pipe", x: 44, y: 42, block: 0 }, // sap line from the Mother Bough
    { kind: "crate", x: 98, y: 70, block: 1 }, { kind: "crate", x: 99, y: 71, block: 1 },
  ],
  scatter: [
    { kind: "tree", count: 24, area: [6, 6, 30, 34], block: 1, scale: [0.9, 1.3] },
    { kind: "tree", count: 20, area: [100, 104, 32, 16], block: 1, scale: [0.9, 1.3] },
    { kind: "giant_tree", count: 3, area: [6, 104, 40, 16], block: 3, scale: [1.6, 2.1] },
    { kind: "bush", count: 50, block: 0, scale: [0.7, 1.1] },
  ],
  landmarks: [
    { id: "lm_ver_town_plaza", name: "Rootfall Plaza", kind: "plaza", x: 68, y: 64, note: "Respawn point; the service NPCs face the jade fountain." },
    { id: "lm_ver_town_bough", name: "The Mother Bough", kind: "shrine", x: 50, y: 36, note: "The giant tree Sylvara grew round; an Aethrion sap line still taps it." },
    { id: "lm_ver_town_guild", name: "Wayfarer Guild Hall", kind: "plaza", x: 103, y: 29, note: "Quest hub." },
    { id: "lm_ver_town_east_gate", name: "East Gate", kind: "gate", x: 130, y: 66, note: "To Fernreach (Lv15-19)." },
    { id: "lm_ver_town_north_gate", name: "North Gate", kind: "gate", x: 74, y: 6, note: "To Mossbridge (Lv18-22)." },
    { id: "lm_ver_town_transit", name: "Transit Station", kind: "plaza", x: 26, y: 74, note: "Paid travel to field camps, Avelorn and Duskhar." },
    { id: "lm_ver_town_graftshop", name: "Artificer's Graftshop", kind: "plaza", x: 76, y: 90, note: "Turns field drops into supplies." },
  ],
  safe_areas: [[0, 0, 136, 124]],
  pockets: [],
  npcs: [
    npc("npc_ver_guild_registrar", "Sylvara Guild Registrar", [102, 39], "S", "guild_registrar"),
    npc("npc_ver_merchant", "Sylvara Supply Merchant", [88, 69], "N", "merchant", { shop_id: "shop_ver" }),
    npc("npc_ver_healer", "Sylvara Field Medic", [53, 58], "E", "healer"),
    npc("npc_ver_teleporter", "Sylvara Transit Operator", [31, 73], "W", "teleporter", {
      destinations: [
        ["ver_fld_01", fieldCost(15)], ["ver_fld_02", fieldCost(18)], ["ver_fld_03", fieldCost(21)], ["ver_fld_04", fieldCost(24)],
        ["ver_fld_05", fieldCost(27)], ["ver_fld_06", fieldCost(30)], ["ver_fld_07", fieldCost(33)],
        ["lum_town_01", capitalCost(1)], ["sol_town_01", capitalCost(25)],
      ],
    }),
    npc("npc_ver_craftsman", "Sylvara Artificer", [71, 85], "N", "craftsman"),
    npc("npc_ver_east_gate_guard", "East Gate Warden", [126, 60], "W", "guard"),
    npc("npc_ver_north_gate_guard", "North Gate Warden", [68, 12], "S", "guard"),
  ],
};

const fernreach: MapDesign = {
  id: "ver_fld_01", name: "Fernreach", type: "field", role: "First Verdantis field: passive Graftling herds everywhere, in the hollow, the tapped groves, by the stream and in the grafting ruins.",
  levels: [15, 19], size: [140, 112], arrival: [10, 55], ground: "moss", theme: "a fern-carpeted forest floor between giant trunks, jade fireflies, half-buried grafting ruins",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 55], [24, 56], [48, 62], [70, 60]], width: 4, kind: "dirt" },
    { points: [[70, 60], [92, 40], [104, 18], [103, 0]], width: 4, kind: "dirt" },
    { points: [[70, 60], [86, 78], [108, 90]], width: 3, kind: "dirt" },
    { points: [[70, 60], [58, 84], [44, 98]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "cliff", shape: { poly: [[12, 8], [36, 6], [34, 18], [14, 22]] } },
    { kind: "forest", shape: { ellipse: [26, 100, 10, 6] } },
    { kind: "water", shape: { ellipse: [120, 92, 8, 6] } },
    { kind: "rock", shape: { ellipse: [80, 100, 5, 4] } },
    { kind: "forest", shape: { ellipse: [124, 14, 10, 8] } },
  ],
  props: [
    { kind: "tent", x: 7, y: 50, block: 2 }, { kind: "crate", x: 13, y: 62, block: 1 }, { kind: "lamp_post", x: 17, y: 60, block: 1 },
    { kind: "tent", x: 100, y: 8, block: 2 },
    { kind: "aether_pylon", x: 66, y: 54, block: 1 },
    { kind: "gear_ruin", x: 54, y: 30, block: 2 }, { kind: "rune_stone", x: 46, y: 24, block: 1 }, { kind: "rune_stone", x: 62, y: 38, block: 1 },
    { kind: "brass_pipe", x: 58, y: 22, block: 0 }, { kind: "brass_pipe", x: 30, y: 74, block: 0 },
    { kind: "giant_tree", x: 16, y: 84, block: 4, scale: 2.2 }, { kind: "giant_tree", x: 128, y: 64, block: 4, scale: 2.4 },
    { kind: "giant_tree", x: 86, y: 92, block: 4, scale: 2 },
  ],
  scatter: [
    { kind: "tree", count: 80, block: 1, scale: [0.8, 1.3] },
    { kind: "bush", count: 140, block: 0, scale: [0.6, 1.1] },
    { kind: "giant_tree", count: 6, block: 2, scale: [1.6, 2.2] },
    { kind: "crystal", count: 10, area: [40, 20, 28, 22], block: 1, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_ver_fern_camp", name: "Fernreach Camp", kind: "camp", x: 10, y: 55, note: "Arrival from Sylvara's East Gate; the scout gives field tips." },
    { id: "lm_ver_fern_crossing", name: "Fernreach Crossing", kind: "crossroads", x: 70, y: 60, note: "Four paths meet under the pylon." },
    { id: "lm_ver_fern_hollow", name: "Fern Hollow", kind: "farm", x: 38, y: 80, note: "Passive Graftling herds in tall ferns." },
    { id: "lm_ver_fern_grove", name: "Sap Grove", kind: "farm", x: 120, y: 40, note: "Tapped trunks; Graftlings root round the taps." },
    { id: "lm_ver_fern_run", name: "Glimmer Run", kind: "farm", x: 110, y: 88, note: "Stream and pond; Graftlings wander the banks." },
    { id: "lm_ver_fern_ruins", name: "Grafted Ruins", kind: "ruin", x: 54, y: 30, note: "An Aethrion grafting yard; the first Graftlings were bolted together here." },
    { id: "lm_ver_fern_north", name: "North Path", kind: "gate", x: 103, y: 6, note: "Climbs to Mossbridge (Lv18-22)." },
  ],
  safe_areas: [[4, 47, 14, 16], [96, 4, 14, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "fern_hollow", name: "Fern Hollow", rects: [[22, 68, 32, 26]], species: [{ monster_id: "mob_0012", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "Passive Graftlings on open fern floor at the bottom of the band, a short walk from camp: ~21 cells each, room to gather a 40-herd with Anchor Shout." },
    { id: "sap_grove", name: "Sap Grove", rects: [[108, 28, 26, 26]], species: [{ monster_id: "mob_0012", weight: 1 }], target_alive: 30, respawn_sec: [6, 14],
      design_note: "Tapped trunks in the north-east, beside the road to Mossbridge: passive Graftlings rooting round the taps, a safe 30-herd on the way north." },
    { id: "glimmer_run", name: "Glimmer Run", rects: [[96, 74, 32, 28]], species: [{ monster_id: "mob_0012", weight: 1 }], target_alive: 30, respawn_sec: [6, 14],
      design_note: "Graftlings on the banks of the stream and pond (the water takes ~16% of the rect); passive, so the banks are a slow, safe herd to gather along the water." },
    { id: "grafted_ruins", name: "Grafted Ruins", rects: [[40, 20, 28, 22]], species: [{ monster_id: "mob_0012", weight: 1 }], target_alive: 20, respawn_sec: [8, 16],
      design_note: "Gear ruins and rune stones break the yard into lanes; passive Graftlings wander where they were first bolted together, a herd that has to be gathered round obstacles." },
  ],
  npcs: [npc("npc_ver_fernreach_scout", "Fernreach Scout Ilka", [14, 50], "E", "scout")],
};

const mossbridge: MapDesign = {
  id: "ver_fld_02", name: "Mossbridge", type: "field", role: "A creek valley crossed by two moss-grown Aethrion bridges: newt banks south and by the obelisk, drone hives north and on the north-west slope.",
  levels: [18, 22], size: [120, 136], arrival: [59, 125], ground: "moss", theme: "a mossy creek valley under old Aethrion bridges and an idle waterwheel",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[59, 135], [59, 100], [58, 74]], width: 4, kind: "dirt" },
    { points: [[58, 74], [58, 56]], width: 4, kind: "bridge" },
    { points: [[58, 56], [46, 30], [33, 0]], width: 4, kind: "dirt" },
    { points: [[119, 44], [100, 46], [96, 58]], width: 4, kind: "dirt" },
    { points: [[96, 58], [96, 76]], width: 4, kind: "bridge" },
    { points: [[96, 76], [80, 92], [59, 100]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { poly: [[4, 58], [30, 62], [60, 58], [90, 64], [116, 60], [116, 68], [90, 72], [60, 66], [30, 70], [4, 66]] } },
    { kind: "rock", shape: { ellipse: [84, 124, 5, 3] } },
    { kind: "forest", shape: { ellipse: [16, 112, 10, 8] } },
  ],
  props: [
    { kind: "tent", x: 54, y: 122, block: 2 }, { kind: "lamp_post", x: 62, y: 128, block: 1 },
    { kind: "tent", x: 112, y: 40, block: 2 },
    { kind: "tent", x: 42, y: 12, block: 2 },
    { kind: "aqueduct", x: 58, y: 64, block: 0, scale: 1.3 },
    { kind: "waterwheel", x: 108, y: 64, block: 2 },
    { kind: "lattice_obelisk", x: 88, y: 104, block: 2 },
    { kind: "gear_ruin", x: 22, y: 98, block: 2 },
    { kind: "brass_pipe", x: 70, y: 60, block: 0 },
    { kind: "giant_tree", x: 36, y: 112, block: 4, scale: 2.2 }, { kind: "giant_tree", x: 100, y: 124, block: 4, scale: 2 },
    { kind: "giant_tree", x: 80, y: 8, block: 4, scale: 2.3 },
  ],
  scatter: [
    { kind: "tree", count: 70, block: 1, scale: [0.8, 1.2] },
    { kind: "bush", count: 150, block: 0, scale: [0.6, 1.2] },
    { kind: "rock", count: 15, area: [6, 70, 44, 24], block: 1, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_ver_moss_camp", name: "Bridgefoot Camp", kind: "camp", x: 59, y: 124, note: "Arrival from Sylvara's North Gate." },
    { id: "lm_ver_moss_east", name: "East Camp", kind: "camp", x: 109, y: 45, note: "Arrival from Fernreach." },
    { id: "lm_ver_moss_west_bridge", name: "Old Span", kind: "crossroads", x: 58, y: 64, note: "Aethrion aqueduct bridge over the creek." },
    { id: "lm_ver_moss_east_bridge", name: "Wheel Span", kind: "crossroads", x: 96, y: 66, note: "Bridge by the idle waterwheel." },
    { id: "lm_ver_moss_shallows", name: "Newt Shallows", kind: "farm", x: 28, y: 80, note: "Mossback Newts bask on the south bank." },
    { id: "lm_ver_moss_hives", name: "Bridge Hives", kind: "farm", x: 80, y: 30, note: "Sapdrones tap the north trunks." },
    { id: "lm_ver_moss_rise", name: "Drone Rise", kind: "farm", x: 20, y: 32, note: "Sapdrones tap the trunks of the north-west slope." },
    { id: "lm_ver_moss_north", name: "Canopy Path", kind: "gate", x: 35, y: 6, note: "To Canopy Steps (Lv21-25)." },
  ],
  safe_areas: [[50, 116, 18, 14], [102, 38, 14, 14], [30, 4, 14, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "newt_shallows", name: "Newt Shallows", rects: [[8, 70, 40, 22]], species: [{ monster_id: "mob_0040", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "The main Newt bank, on the south shore at the bottom of the band. Banks are long and thin, so assist pulls string out along the water into a line." },
    { id: "bridge_hives", name: "Bridge Hives", rects: [[62, 16, 36, 26]], species: [{ monster_id: "mob_0013", weight: 1 }], target_alive: 30, respawn_sec: [6, 14],
      design_note: "North of the creek between the two bridges: an aggressive drone cloud mid-band that players cross on the way to Canopy Steps." },
    { id: "mossfield", name: "Mossfield", rects: [[72, 90, 34, 24]], species: [{ monster_id: "mob_0040", weight: 1 }], target_alive: 25, respawn_sec: [7, 16],
      design_note: "A quieter Newt bank by the obelisk, looser than the Shallows: small assist pulls for players arriving at the bottom of the band." },
    { id: "drone_rise", name: "Drone Rise", rects: [[8, 18, 24, 30]], species: [{ monster_id: "mob_0013", weight: 1 }], target_alive: 25, respawn_sec: [7, 16],
      design_note: "Lv20 drones mid-band on the slope under the canopy, kept off the main road: a second aggressive cloud away from the bridge traffic." },
  ],
  npcs: [npc("npc_ver_mossbridge_scout", "Mossbridge Scout Teodor", [64, 120], "N", "scout")],
};

const canopySteps: MapDesign = {
  id: "ver_fld_03", name: "Canopy Steps", type: "field", role: "Three terraces cut into a giant trunk and joined by Aethrion lift-ramps: hounds below, moths mid-way, moths and hounds again on top.",
  levels: [21, 25], size: [152, 104], arrival: [28, 93], ground: "grass", theme: "terraced platforms on the flank of a colossal tree, brass lift-rails and jade lanterns",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[27, 103], [28, 88], [52, 78], [70, 68], [76, 52], [100, 44], [124, 36], [151, 33]], width: 4, kind: "dirt" },
    { points: [[52, 78], [100, 84], [128, 80]], width: 3, kind: "dirt" },
    { points: [[76, 52], [62, 30], [40, 16]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "cliff", shape: { rect: [4, 62, 144, 3] } }, // lower terrace wall
    { kind: "cliff", shape: { rect: [4, 36, 112, 3] } }, // upper terrace wall
    { kind: "rock", shape: { ellipse: [100, 20, 4, 3] } },
  ],
  props: [
    { kind: "tent", x: 24, y: 92, block: 2 }, { kind: "lamp_post", x: 34, y: 96, block: 1 },
    { kind: "tent", x: 144, y: 29, block: 2 },
    { kind: "giant_tree", x: 130, y: 52, block: 5, scale: 2.4 },
    { kind: "giant_tree", x: 12, y: 78, block: 4, scale: 2 },
    { kind: "brass_pipe", x: 72, y: 58, block: 0, scale: 1.3 }, { kind: "brass_pipe", x: 64, y: 34, block: 0, scale: 1.3 },
    { kind: "gear_ruin", x: 84, y: 56, block: 2 },
    { kind: "aether_pylon", x: 64, y: 42, block: 1 },
    { kind: "lattice_obelisk", x: 28, y: 20, block: 2 },
  ],
  scatter: [
    { kind: "tree", count: 70, block: 1, scale: [0.8, 1.2] },
    { kind: "bush", count: 140, block: 0, scale: [0.6, 1.1] },
    { kind: "lamp_post", count: 10, area: [8, 40, 110, 20], block: 1 },
  ],
  landmarks: [
    { id: "lm_ver_canopy_camp", name: "Lower Landing", kind: "camp", x: 28, y: 93, note: "Arrival from Mossbridge." },
    { id: "lm_ver_canopy_ramp", name: "First Lift", kind: "crossroads", x: 72, y: 62, note: "Brass lift-ramp between the lower and middle terraces." },
    { id: "lm_ver_canopy_den", name: "Barkhound Den", kind: "farm", x: 104, y: 82, note: "Hound packs on the lower terrace." },
    { id: "lm_ver_canopy_galleries", name: "Jadewing Galleries", kind: "farm", x: 30, y: 50, note: "Moths in the jade light of the middle terrace." },
    { id: "lm_ver_canopy_lifts", name: "Sap Lifts", kind: "farm", x: 28, y: 20, note: "Old sap lifts; Jadewing Moths roost in the rails." },
    { id: "lm_ver_canopy_vines", name: "Vine Terrace", kind: "farm", x: 92, y: 20, note: "Barkhound packs on the top terrace." },
    { id: "lm_ver_canopy_tree", name: "Stair Tree", kind: "lookout", x: 130, y: 52, note: "The trunk the terraces were cut from." },
    { id: "lm_ver_canopy_east", name: "Canopy Road", kind: "gate", x: 146, y: 34, note: "To Graftwood (Lv24-28)." },
  ],
  safe_areas: [[20, 86, 16, 14], [134, 27, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "barkhound_den", name: "Barkhound Den", rects: [[84, 68, 40, 26]], species: [{ monster_id: "mob_0042", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Bruiser packs on the lower terrace; ~40 cells each because hounds come in assist packs and need room to be kited round the den." },
    { id: "jadewing_galleries", name: "Jadewing Galleries", rects: [[8, 40, 48, 20]], species: [{ monster_id: "mob_0041", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "The main moth farm on the middle terrace: the terrace walls above and below cut line of sight, so ranged moths must be pulled along the shelf." },
    { id: "sap_lifts", name: "Sap Lifts", rects: [[10, 8, 36, 24]], species: [{ monster_id: "mob_0041", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Moths alone on the upper terrace among the old lift-rails: the rails break line of sight, so the ranged pack must be pulled round them." },
    { id: "vine_terrace", name: "Vine Terrace", rects: [[72, 8, 40, 24]], species: [{ monster_id: "mob_0042", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Lv23 hound packs mid-band on the top terrace, where the road leaves for Graftwood: a second assist den, ~40 cells each to kite round." },
  ],
  npcs: [npc("npc_ver_canopy_scout", "Canopy Scout Maren", [32, 89], "N", "scout")],
};

// Graftwood trellis rows: fence lines with gaps at both ends.
const trellisPosts: Prop[] = [];
for (let y = 36; y <= 54; y += 6) for (let x = 76; x <= 108; x += 8) trellisPosts.push({ kind: "brass_pipe", x, y, block: 0, scale: 0.8 });

const graftwood: MapDesign = {
  id: "ver_fld_04", name: "Graftwood", type: "field", role: "An Aethrion grafting orchard overrun by Vinecrawlers: trellis rows, the stalled grafting yard and wild graft-stock woods to the south.",
  levels: [24, 28], size: [128, 140], arrival: [10, 63], ground: "grass", theme: "rows of grafted trees on brass trellises around a stalled grafting engine",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 63], [30, 64], [58, 70]], width: 4, kind: "dirt" },
    { points: [[58, 70], [80, 96], [97, 120], [97, 139]], width: 4, kind: "dirt" },
    { points: [[58, 70], [64, 40], [86, 20]], width: 3, kind: "dirt" },
    { points: [[58, 70], [30, 100], [24, 124]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "fence", shape: { rect: [74, 36, 36, 1] } }, { kind: "fence", shape: { rect: [74, 42, 36, 1] } },
    { kind: "fence", shape: { rect: [74, 48, 36, 1] } }, { kind: "fence", shape: { rect: [74, 54, 36, 1] } },
    { kind: "machine", shape: { rect: [26, 24, 8, 6] } }, // the grafting engine
    { kind: "water", shape: { ellipse: [108, 100, 7, 5] } },
    { kind: "forest", shape: { ellipse: [112, 14, 10, 8] } },
  ],
  props: [
    ...trellisPosts,
    { kind: "tent", x: 8, y: 58, block: 2 }, { kind: "crate", x: 6, y: 67, block: 1 },
    { kind: "tent", x: 102, y: 128, block: 2 },
    { kind: "workshop", x: 30, y: 27, block: 0, scale: 1.2 },
    { kind: "gear_ruin", x: 20, y: 40, block: 2 },
    { kind: "aether_pylon", x: 54, y: 64, block: 1 },
    { kind: "waterwheel", x: 100, y: 100, block: 2 },
    { kind: "giant_tree", x: 104, y: 80, block: 4, scale: 2.2 }, { kind: "giant_tree", x: 60, y: 128, block: 4, scale: 2 },
    { kind: "brass_pipe", x: 40, y: 30, block: 0 },
  ],
  scatter: [
    { kind: "tree", count: 100, block: 1, scale: [0.8, 1.2] },
    { kind: "bush", count: 120, block: 0, scale: [0.6, 1.1] },
    { kind: "fence_post", count: 30, area: [70, 30, 44, 32], block: 0 },
  ],
  landmarks: [
    { id: "lm_ver_graft_camp", name: "Orchard Gate Camp", kind: "camp", x: 10, y: 63, note: "Arrival from Canopy Steps." },
    { id: "lm_ver_graft_cross", name: "Pylon Cross", kind: "crossroads", x: 58, y: 70, note: "Where the orchard paths meet." },
    { id: "lm_ver_graft_rows", name: "Trellis Rows", kind: "farm", x: 92, y: 46, note: "Vinecrawlers between brass trellises." },
    { id: "lm_ver_graft_yard", name: "Grafting Yard", kind: "ruin", x: 30, y: 27, note: "The stalled grafting engine, overrun by Vinecrawlers." },
    { id: "lm_ver_graft_hounds", name: "Stockwood", kind: "farm", x: 26, y: 100, note: "Vinecrawlers among old graft-stock." },
    { id: "lm_ver_graft_overgrown", name: "Overgrown Graft", kind: "farm", x: 64, y: 106, note: "Vinecrawlers in a run-wild corner." },
    { id: "lm_ver_graft_south", name: "Press Road", kind: "gate", x: 97, y: 132, note: "To Vineworks (Lv27-31)." },
  ],
  safe_areas: [[4, 56, 14, 14], [90, 122, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "trellis_rows", name: "Trellis Rows", rects: [[70, 30, 44, 32]], species: [{ monster_id: "mob_0014", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "The signature construct horde: fence rows (open at both ends) channel a Vinecrawler train into lanes, ideal for cones and lines." },
    { id: "grafting_yard", name: "Grafting Yard", rects: [[14, 12, 36, 32]], species: [{ monster_id: "mob_0014", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Vinecrawlers still crawl round the stalled engine they once served: a construct train that has to be kited round a central obstacle." },
    { id: "stockwood", name: "Stockwood", rects: [[10, 84, 34, 34]], species: [{ monster_id: "mob_0014", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Vinecrawlers in the south-west woods among old graft-stock: the trees break up the train, a quieter farm for players arriving at the bottom of the band." },
    { id: "overgrown_graft", name: "Overgrown Graft", rects: [[52, 96, 26, 22]], species: [{ monster_id: "mob_0014", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Vinecrawlers in a run-wild corner beside the south road: a small, dense construct pocket, the last stop before Vineworks." },
  ],
  npcs: [npc("npc_ver_graftwood_scout", "Graftwood Scout Oriel", [14, 59], "E", "scout")],
};

const vineworks: MapDesign = {
  id: "ver_fld_05", name: "Vineworks", type: "field", role: "The Aethrion vine-press works: Tender terraces and conduits, hare-grazed vine slopes and Thistlehare warrens round the old water pump.",
  levels: [27, 31], size: [144, 120], arrival: [67, 9], ground: "moss", theme: "terraced vineyards on brass frames round a great press and long sap conduits",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[67, 0], [66, 24], [72, 50]], width: 4, kind: "dirt" },
    { points: [[72, 50], [100, 64], [120, 82], [143, 87]], width: 4, kind: "dirt" },
    { points: [[72, 50], [40, 62], [22, 84]], width: 3, kind: "dirt" },
    { points: [[72, 50], [76, 80], [70, 104]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "machine", shape: { rect: [80, 34, 12, 8] } }, // the Vine Press
    { kind: "machine", shape: { rect: [104, 14, 4, 30] } }, // sap conduit
    { kind: "cliff", shape: { poly: [[4, 100], [30, 98], [38, 116], [4, 116]] } },
    { kind: "water", shape: { ellipse: [112, 66, 4, 3] } },
  ],
  props: [
    { kind: "tent", x: 62, y: 8, block: 2 }, { kind: "lamp_post", x: 74, y: 13, block: 1 },
    { kind: "tent", x: 134, y: 80, block: 2 },
    { kind: "workshop", x: 86, y: 38, block: 0, scale: 1.4 },
    { kind: "gear_ruin", x: 96, y: 30, block: 2 },
    { kind: "brass_pipe", x: 100, y: 58, block: 0 }, { kind: "brass_pipe", x: 106, y: 46, block: 0 },
    { kind: "aether_pylon", x: 68, y: 46, block: 1 },
    { kind: "aqueduct", x: 120, y: 100, block: 0, scale: 1.2 },
    { kind: "giant_tree", x: 20, y: 70, block: 4, scale: 2.2 },
    { kind: "waterwheel", x: 54, y: 88, block: 2 },
  ],
  scatter: [
    { kind: "tree", count: 70, block: 1, scale: [0.8, 1.2] },
    { kind: "bush", count: 120, block: 0, scale: [0.6, 1.1] },
    { kind: "fence_post", count: 40, area: [10, 26, 40, 26], block: 0 },
    { kind: "crate", count: 10, area: [74, 44, 30, 16], block: 1 },
  ],
  landmarks: [
    { id: "lm_ver_vine_camp", name: "Press Gate Camp", kind: "camp", x: 67, y: 9, note: "Arrival from Graftwood; a medic keeps the camp." },
    { id: "lm_ver_vine_yard", name: "Press Yard", kind: "crossroads", x: 72, y: 50, note: "Hub below the press." },
    { id: "lm_ver_vine_press", name: "The Vine Press", kind: "ruin", x: 86, y: 38, note: "An Aethrion press the size of a hall, still turning slowly." },
    { id: "lm_ver_vine_terraces", name: "Press Terraces", kind: "farm", x: 104, y: 102, note: "Pruning Tenders work the lower vines." },
    { id: "lm_ver_vine_hares", name: "Hare Terraces", kind: "farm", x: 30, y: 38, note: "Thistlehares on the vine slopes." },
    { id: "lm_ver_vine_conduits", name: "Tender Conduits", kind: "farm", x: 124, y: 28, note: "Pruning Tenders along the conduit." },
    { id: "lm_ver_vine_pump", name: "Pump Warren", kind: "farm", x: 52, y: 86, note: "Thistlehares burrow round the old water pump." },
    { id: "lm_ver_vine_east", name: "Root Road", kind: "gate", x: 136, y: 86, note: "To Elderroot (Lv30-34)." },
  ],
  safe_areas: [[58, 4, 18, 12], [126, 78, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "press_terraces", name: "Press Terraces", rects: [[86, 92, 36, 22]], species: [{ monster_id: "mob_0043", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Tenders alone on their own terraces at the bottom of the band: low damage, assist pulls, a calm place to learn their 5-cell spray." },
    { id: "hare_terraces", name: "Hare Terraces", rects: [[10, 26, 40, 26]], species: [{ monster_id: "mob_0044", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "Mid-band flee swarm: the terraces are fenced on the west and north by forest, so fleeing hares pile into the corner for a clean AoE." },
    { id: "tender_conduits", name: "Tender Conduits", rects: [[110, 12, 28, 32]], species: [{ monster_id: "mob_0043", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Tenders along the conduit wall at the bottom of the band: the wall stops the assist pack spreading, so one pull is a line you can sweep." },
    { id: "pump_warren", name: "Pump Warren", rects: [[40, 74, 26, 24]], species: [{ monster_id: "mob_0044", weight: 1 }], target_alive: 15, respawn_sec: [14, 28],
      design_note: "A few Thistlehares round the waterwheel pump: sparse (~40 cells each) and quick to bolt, so the pump and wheel are the corners to trap them against." },
  ],
  npcs: [
    npc("npc_ver_vineworks_scout", "Vineworks Scout Bramm", [72, 10], "S", "scout"),
    npc("npc_ver_vineworks_medic", "Press Gate Medic", [62, 13], "S", "healer"),
  ],
};

const elderroot: MapDesign = {
  id: "ver_fld_06", name: "Elderroot", type: "field", role: "The oldest trees in Verdantis, their roots fused with Aethrion conduits: Root Sentinels on the ridges, in the old warrens and on the Basin slope, and the Antlered Engines' glade.",
  levels: [30, 34], size: [132, 132], arrival: [10, 43], ground: "moss", theme: "elder trees with roots like walls, brass conduits running through them, jade light in the bark",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 43], [28, 46], [52, 60]], width: 4, kind: "dirt" },
    { points: [[52, 60], [66, 84], [90, 100], [103, 120], [103, 131]], width: 4, kind: "dirt" },
    { points: [[52, 60], [80, 40], [104, 24]], width: 3, kind: "dirt" },
    { points: [[52, 60], [30, 90], [24, 112]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "cliff", shape: { poly: [[84, 54], [110, 48], [118, 56], [92, 64]] } }, // root ridge
    { kind: "forest", shape: { ellipse: [20, 70, 9, 7] } },
    { kind: "rock", shape: { ellipse: [40, 122, 6, 3] } },
  ],
  props: [
    { kind: "giant_tree", x: 72, y: 64, block: 6, scale: 2.8 }, // the Eldest
    { kind: "tent", x: 8, y: 40, block: 2 }, { kind: "crate", x: 15, y: 48, block: 1 },
    { kind: "tent", x: 108, y: 118, block: 2 },
    { kind: "brass_pipe", x: 90, y: 30, block: 0, scale: 1.3 }, { kind: "brass_pipe", x: 100, y: 52, block: 0, scale: 1.2 },
    { kind: "aether_pylon", x: 36, y: 58, block: 1 },
    { kind: "gear_ruin", x: 100, y: 76, block: 2 },
    { kind: "rune_stone", x: 64, y: 70, block: 1 }, { kind: "rune_stone", x: 80, y: 70, block: 1 },
    { kind: "lattice_obelisk", x: 70, y: 112, block: 2 },
  ],
  scatter: [
    { kind: "tree", count: 110, block: 1, scale: [0.9, 1.4] },
    { kind: "bush", count: 120, block: 0, scale: [0.6, 1.1] },
    { kind: "giant_tree", count: 8, block: 3, scale: [1.6, 2.4] },
    { kind: "rock", count: 20, block: 1, scale: [0.7, 1.2] },
  ],
  landmarks: [
    { id: "lm_ver_elder_camp", name: "Rootgate Camp", kind: "camp", x: 10, y: 43, note: "Arrival from Vineworks." },
    { id: "lm_ver_elder_eldest", name: "The Eldest", kind: "shrine", x: 72, y: 64, note: "The oldest tree in Verdantis; conduits run through its roots." },
    { id: "lm_ver_elder_roots", name: "Sentinel Roots", kind: "farm", x: 94, y: 26, note: "Root Sentinels walk the ridges." },
    { id: "lm_ver_elder_burrows", name: "Root Burrows", kind: "farm", x: 26, y: 98, note: "Root Sentinels among the old warrens." },
    { id: "lm_ver_elder_drift", name: "Spore Drift", kind: "farm", x: 72, y: 112, note: "Root Sentinels on the slope where the Basin's spores drift up." },
    { id: "lm_ver_elder_glade", name: "Engine Glade", kind: "farm", x: 98, y: 78, note: "Four Antlered Engines graze here." },
    { id: "lm_ver_elder_south", name: "Basin Descent", kind: "gate", x: 103, y: 126, note: "Down to the Spore Basin (Lv33-37)." },
  ],
  safe_areas: [[4, 36, 14, 14], [96, 114, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "sentinel_roots", name: "Sentinel Roots", rects: [[74, 12, 42, 30]], species: [{ monster_id: "mob_0015", weight: 1 }], target_alive: 36, respawn_sec: [7, 16],
      design_note: "The region's main Root Sentinel farm at mid-band: slow, aggressive and thick, so a 30+ train walks into one big Sundering Pulse." },
    { id: "root_burrows", name: "Root Burrows", rects: [[8, 82, 40, 32]], species: [{ monster_id: "mob_0015", weight: 1 }], target_alive: 42, respawn_sec: [5, 12],
      design_note: "Sentinels in soft ground between the elder roots: a second slow, thick horde with room to gather a train, nearer the camp than the ridges." },
    { id: "spore_drift", name: "Spore Drift", rects: [[58, 100, 30, 24]], species: [{ monster_id: "mob_0015", weight: 1 }], target_alive: 28, respawn_sec: [7, 16],
      design_note: "Sentinels next to the descent to the Basin, where the Engine's spores have drifted up: the last Sentinel train before the next field." },
    { id: "engine_glade", name: "Engine Glade", rects: [[84, 68, 30, 22]], species: [{ monster_id: "mob_0045", weight: 1 }], target_alive: 4, respawn_sec: [120, 180],
      design_note: "Four Lv34 elites in an open glade under the root ridge: room to circle a charging stag. Slow respawn so the glade is a hunt, not a farm." },
  ],
  npcs: [npc("npc_ver_elderroot_scout", "Elderroot Scout Hesk", [14, 39], "E", "scout")],
};

const sporeBasin: MapDesign = {
  id: "ver_fld_07", name: "Spore Basin", type: "field", role: "A sunken basin under the Heartwood Engine's vents, given over to Sporebloats: dense hordes under the vents, round the obelisk, by the spore pool and at the Engine's mouth.",
  levels: [33, 37], size: [136, 116], arrival: [43, 9], ground: "moss", theme: "a sunken basin of giant glowing fungi and brass exhaust vents, jade spore-haze",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[43, 0], [44, 30], [62, 52]], width: 4, kind: "dirt" },
    { points: [[62, 52], [90, 62], [112, 72], [135, 73]], width: 4, kind: "dirt" },
    { points: [[62, 52], [36, 72], [24, 96]], width: 3, kind: "dirt" },
    { points: [[62, 52], [70, 86], [92, 100]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { ellipse: [88, 82, 8, 5] } }, // spore pool
    { kind: "cliff", shape: { poly: [[4, 26], [22, 22], [28, 40], [4, 50]] } },
    { kind: "rock", shape: { ellipse: [120, 24, 6, 5] } },
  ],
  props: [
    { kind: "cave_mouth", x: 134, y: 73, block: 0, scale: 1.4 },
    { kind: "tent", x: 40, y: 10, block: 2 },
    { kind: "tent", x: 124, y: 78, block: 2 }, { kind: "aether_pylon", x: 116, y: 67, block: 1 },
    { kind: "brass_pipe", x: 100, y: 30, block: 0, scale: 1.4 }, { kind: "brass_pipe", x: 106, y: 52, block: 0, scale: 1.4 }, { kind: "brass_pipe", x: 60, y: 96, block: 0 },
    { kind: "lattice_obelisk", x: 30, y: 76, block: 2 },
    { kind: "giant_tree", x: 18, y: 104, block: 4, scale: 2 },
  ],
  scatter: [
    { kind: "crystal", count: 30, block: 1, scale: [0.6, 1.2] },
    { kind: "dead_tree", count: 20, block: 1, scale: [0.7, 1.1] },
    { kind: "giant_tree", count: 10, block: 3, scale: [1.4, 2.2] },
    { kind: "bush", count: 60, block: 0, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_ver_basin_camp", name: "Rim Camp", kind: "camp", x: 43, y: 9, note: "Arrival from Elderroot." },
    { id: "lm_ver_basin_floor", name: "Basin Floor", kind: "crossroads", x: 62, y: 52, note: "Where the paths down the rim meet." },
    { id: "lm_ver_basin_bloat", name: "Bloat Fields", kind: "farm", x: 92, y: 28, note: "Sporebloats drift under the vents." },
    { id: "lm_ver_basin_ring", name: "Obelisk Ring", kind: "shrine", x: 30, y: 76, note: "Sporebloats drift in a ring round an Aethrion obelisk." },
    { id: "lm_ver_basin_drift", name: "Pool Drift", kind: "farm", x: 110, y: 98, note: "Sporebloats crowd the spore pool." },
    { id: "lm_ver_basin_vents", name: "Engine Vents", kind: "ruin", x: 108, y: 52, note: "Brass exhausts of the Heartwood Engine; Sporebloats gather in the exhaust." },
    { id: "lm_ver_basin_mouth", name: "Engine Mouth", kind: "gate", x: 130, y: 73, note: "Into the Heartwood Engine (Lv36-40)." },
  ],
  safe_areas: [[36, 4, 16, 12], [118, 66, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "bloat_fields", name: "Bloat Fields", rects: [[70, 14, 44, 30]], species: [{ monster_id: "mob_0046", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The Basin's signature horde: 40 slow aggressive bloats on open ground under the vents, sized for 50+ trains with quick refill." },
    { id: "obelisk_ring", name: "Obelisk Ring", rects: [[12, 56, 38, 40]], species: [{ monster_id: "mob_0046", weight: 1 }], target_alive: 35, respawn_sec: [7, 16],
      design_note: "Bloats round the obelisk in a wide pocket: the obelisk splits the train, so drag them round it into one stack before the AoE." },
    { id: "pool_drift", name: "Pool Drift", rects: [[96, 88, 30, 20]], species: [{ monster_id: "mob_0046", weight: 1 }], target_alive: 25, respawn_sec: [8, 18],
      design_note: "Bloats by the spore pool: a smaller, quieter farm away from the main field for players at the bottom of the band." },
    { id: "engine_vents", name: "Engine Vents", rects: [[94, 46, 28, 14]], species: [{ monster_id: "mob_0046", weight: 1 }], target_alive: 20, respawn_sec: [10, 20],
      design_note: "Bloats crowding the Engine's vents beside the mouth: a narrow strip that packs a train tight, the last farm before the dungeon." },
  ],
  npcs: [
    npc("npc_ver_spore_basin_scout", "Basin Scout Wylla", [48, 8], "S", "scout"),
    npc("npc_ver_engine_watch", "Engine Mouth Watch", [122, 69], "E", "guard"),
  ],
};

const heartwoodEngine: MapDesign = {
  id: "ver_dun_01", name: "Heartwood Engine", type: "dungeon", role: "Verdantis's dungeon: the sap conduits, piston hall and spore lung of the Aethrion engine that drives the forest, round the Regent's heart chamber.",
  levels: [36, 40], size: [112, 120], arrival: [13, 60], ground: "cave", theme: "living wood grown through a buried brass engine; pistons, sap conduits, jade light",
  solid: true,
  carve: [
    { rect: [2, 53, 20, 15] },
    { ellipse: [38, 34, 16, 12] },
    { rect: [50, 70, 34, 22] },
    { ellipse: [28, 96, 15, 11] },
    { ellipse: [92, 30, 13, 13] },
  ],
  roads: [
    { points: [[2, 60], [20, 60], [38, 34]], width: 4, kind: "stone" },
    { points: [[38, 34], [70, 30], [92, 30]], width: 4, kind: "stone" },
    { points: [[38, 34], [42, 66], [56, 80]], width: 4, kind: "stone" },
    { points: [[42, 66], [28, 96]], width: 4, kind: "stone" },
    { points: [[80, 80], [96, 58], [92, 30]], width: 4, kind: "stone" },
  ],
  blockers: [
    { kind: "machine", shape: { rect: [64, 78, 6, 5] } },
  ],
  props: [
    { kind: "cave_mouth", x: 2, y: 60, block: 0, scale: 1.2 },
    { kind: "tent", x: 10, y: 56, block: 2 },
    { kind: "aether_pylon", x: 92, y: 30, block: 2, scale: 1.6 },
    { kind: "brass_pipe", x: 58, y: 74, block: 0 }, { kind: "brass_pipe", x: 78, y: 74, block: 0 },
    { kind: "gear_ruin", x: 76, y: 88, block: 2 },
    { kind: "giant_tree", x: 30, y: 104, block: 3, scale: 1.4 },
  ],
  scatter: [
    { kind: "crystal", count: 30, block: 1, scale: [0.6, 1.2] },
    { kind: "dead_tree", count: 20, block: 1, scale: [0.6, 1] },
    { kind: "brass_pipe", count: 12, block: 0, scale: [0.8, 1.2] },
  ],
  landmarks: [
    { id: "lm_ver_engine_landing", name: "Root Landing", kind: "camp", x: 13, y: 60, note: "Arrival; the Root-Keeper sends you back up." },
    { id: "lm_ver_engine_conduits", name: "Sap Conduits", kind: "farm", x: 38, y: 34, note: "Spore colonies in the sap lines." },
    { id: "lm_ver_engine_pistons", name: "Piston Hall", kind: "ruin", x: 67, y: 81, note: "The Pistonguards' hall round the main piston." },
    { id: "lm_ver_engine_lung", name: "Spore Lung", kind: "farm", x: 28, y: 96, note: "Where the Engine breathes out its spores." },
    { id: "lm_ver_engine_heart", name: "Heart Chamber", kind: "boss_arena", x: 92, y: 30, note: "The Heartwood Regent." },
  ],
  safe_areas: [[7, 54, 14, 12]],
  horde: { min_alive: 60, max_alive: 120 },
  pockets: [
    { id: "sap_conduits", name: "Sap Conduits", rects: [[26, 26, 26, 18]], species: [{ monster_id: "mob_0047", weight: 1 }], target_alive: 40, respawn_sec: [6, 14],
      design_note: "The densest Matron nest in the region (~12 cells each) in a round cavern you can circle; assist supports spitting from 5 cells, so pull them into a stack." },
    { id: "piston_hall", name: "Piston Hall", rects: [[54, 72, 28, 18]], species: [{ monster_id: "mob_0048", weight: 1 }], target_alive: 30, respawn_sec: [10, 22],
      design_note: "Assist constructs round the central piston: one pull is the hall, a 30-construct fight at mid-band." },
    { id: "spore_lung", name: "Spore Lung", rects: [[18, 89, 22, 14]], species: [{ monster_id: "mob_0047", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Matrons in a side cavern off the main hall: a smaller assist pull, quieter and closer to the landing." },
    { id: "heart_chamber", name: "Heart Chamber", rects: [[86, 24, 12, 12]], species: [{ monster_id: "mob_0049", weight: 1 }], target_alive: 1, respawn_sec: [300, 420],
      design_note: "Region boss, 5-7 minute respawn, alone in its chamber." },
  ],
  npcs: [npc("npc_ver_heartwood_keeper", "Heartwood Root-Keeper", [16, 56], "S", "teleporter", { destinations: [["ver_town_01", 0], ["ver_fld_07", 0]] })],
};

// --- dialogue ------------------------------------------------------------------------

const dialogues: DialogueDef[] = [
  ["npc_ver_guild_registrar", "Welcome to Sylvara, Wayfarer. The forest grows over everything here, machines included.", "Start in Fernreach through the East Gate. The Graftlings there won't fight back; Mossbridge's newts and drones will."],
  ["npc_ver_merchant", "Rations and tonics, carried up from Avelorn and marked up for the climb.", "Bring me sap and scales; Duskhar's alchemists pay well for anything green."],
  ["npc_ver_healer", "Hold still. Spore rash, sap burns... nothing the lodge hasn't seen.", "If you go down to the Basin, breathe through cloth."],
  ["npc_ver_teleporter", "The lattice runs between every camp in Verdantis, and to Avelorn and Duskhar beyond.", "The further the jump, the more crystal it burns. Coin first."],
  ["npc_ver_craftsman", "Field drops make better supplies than the merchant's, if you bring enough of them.", "Newt slick for vital tonic, moth scale for focus. Graftling twigs make decent bread ovens, too."],
  ["npc_ver_east_gate_guard", "East Gate. Fernreach is ferns and Graftlings, nothing else.", "The Graftlings won't touch you. Herd them up; it's good practice for Mossbridge."],
  ["npc_ver_north_gate_guard", "North Gate to Mossbridge. Two old bridges over the creek; take either.", "Newts croak for their whole bank, and the drones dive at anyone near their taps."],
  ["npc_ver_fernreach_scout", "Graftlings everywhere here, and none of them fight. Gather a big herd before you swing.", "The ruins up north are where the Aethrion grafted the first ones."],
  ["npc_ver_mossbridge_scout", "Hit one newt and the whole bank comes for you. Use that.", "Hives are north of the creek, more drones on the north-west slope. Canopy Steps is up the north path."],
  ["npc_ver_canopy_scout", "Three terraces, two kinds of trouble. Hounds down here, moths in the middle, both on top.", "Pull moths along the terrace; they can't shoot you through the walls."],
  ["npc_ver_graftwood_scout", "The grafting engine stalled years ago. The Tenders went down to the Vineworks; the crawlers stayed.", "The trellis rows funnel Vinecrawlers. Use that."],
  ["npc_ver_vineworks_scout", "The press still turns, slowly. Something in it still wants grapes.", "Tenders spray from range and patch each other up. Kill the ones at the back first."],
  ["npc_ver_vineworks_medic", "Sit. Vine-lash and sap burns are most of my work.", "The hares at the pump bolt the moment you touch them. Corner them first."],
  ["npc_ver_elderroot_scout", "These are the oldest trees in Verdantis. The Aethrion ran their conduits through the roots.", "Four Antlered Engines graze under the Eldest. Don't fight two at once."],
  ["npc_ver_spore_basin_scout", "The haze comes from the Engine's vents in the east. The bloats are born in it.", "The Matrons that seed them live inside the Engine. Bring me bloat membranes and I'll prove it."],
  ["npc_ver_engine_watch", "The Heartwood Engine's mouth. The Guild's been watching it since the spores thickened.", "The Regent's in the heart chamber, past the piston hall. End it and the Basin will clear."],
  ["npc_ver_heartwood_keeper", "Root lift's working. Sylvara or the Basin?", "Don't touch the sap lines; they bite."],
].map(([npcId, ...lines]) => ({ id: npcId.replace(/^npc_/, "dlg_"), npc_id: npcId, lines }));

// --- the region ------------------------------------------------------------------------

export const verdantis: RegionDesign = {
  region: {
    id: "ver", name: "Verdantis", capital: "Sylvara", town_map_id: "ver_town_01", dungeon_map_id: "ver_dun_01", level_range: [15, 40],
    theme: "Giant-tree forest, bio-machines and jade light: where Aethrion grafted its machines into the living wood.",
    ecology: "Grafted bio-machines on the forest floor, amphibians and sap drones on Mossbridge's creek, moths and hounds on the canopy terraces, vine constructs in the orchards, gardeners and hares at the presses, root sentinels and antlered engines under the elder trees, and spores spreading from the failing Heartwood Engine in the east.",
    palette: { grass: "#3f7a4a", dirt: "#7a6648", accent: "#5cf0a8", fog: "#0f2a1f" },
  },
  maps: [sylvara, fernreach, mossbridge, canopySteps, graftwood, vineworks, elderroot, sporeBasin, heartwoodEngine],
  links: [
    { label: "Sylvara East Gate ⇄ Fernreach", a: { map: "ver_town_01", trigger: [133, 63, 3, 7], landing: [124, 66] }, b: { map: "ver_fld_01", trigger: [0, 52, 3, 7], landing: [10, 55] } },
    { label: "Sylvara North Gate ⇄ Mossbridge", a: { map: "ver_town_01", trigger: [71, 0, 7, 3], landing: [73, 10] }, b: { map: "ver_fld_02", trigger: [56, 133, 7, 3], landing: [59, 125] } },
    { label: "Fernreach ⇄ Mossbridge", a: { map: "ver_fld_01", trigger: [100, 0, 7, 3], landing: [103, 10] }, b: { map: "ver_fld_02", trigger: [117, 41, 3, 7], landing: [109, 45] } },
    { label: "Mossbridge ⇄ Canopy Steps", a: { map: "ver_fld_02", trigger: [30, 0, 7, 3], landing: [37, 9] }, b: { map: "ver_fld_03", trigger: [24, 101, 7, 3], landing: [28, 93] } },
    { label: "Canopy Steps ⇄ Graftwood", a: { map: "ver_fld_03", trigger: [149, 30, 3, 7], landing: [141, 34] }, b: { map: "ver_fld_04", trigger: [0, 60, 3, 7], landing: [10, 63] } },
    { label: "Graftwood ⇄ Vineworks", a: { map: "ver_fld_04", trigger: [94, 137, 7, 3], landing: [97, 129] }, b: { map: "ver_fld_05", trigger: [64, 0, 7, 3], landing: [67, 9] } },
    { label: "Vineworks ⇄ Elderroot", a: { map: "ver_fld_05", trigger: [141, 84, 3, 7], landing: [133, 85] }, b: { map: "ver_fld_06", trigger: [0, 40, 3, 7], landing: [10, 43] } },
    { label: "Elderroot ⇄ Spore Basin", a: { map: "ver_fld_06", trigger: [100, 129, 7, 3], landing: [103, 121] }, b: { map: "ver_fld_07", trigger: [40, 0, 7, 3], landing: [43, 9] } },
    // No requirement: the Engine's mouth is an open root tunnel. The Basin's Lv33-37 hordes are the gate.
    { label: "Spore Basin ⇄ Heartwood Engine", a: { map: "ver_fld_07", trigger: [133, 70, 3, 7], landing: [125, 73] }, b: { map: "ver_dun_01", trigger: [2, 57, 3, 6], landing: [13, 60] } },
  ],
  monsters,
  materials,
  items,
  shops: [{ id: "shop_ver", npc_id: "npc_ver_merchant", items: [{ item_id: "itm_0075", base_price: 8 }, { item_id: "itm_0076", base_price: 25 }, { item_id: "itm_0077", base_price: 30 }] }],
  recipes,
  quests,
  dialogues,
};
