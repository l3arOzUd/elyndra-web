// THALASSIA — islands, harbours, tidewheels and a drowned relay (Lv 35-65).
//
// Follows the Lumeris conventions (see lum.ts): a harbour capital with the
// five services round a tide-clock plaza; one camp + scout at each field's
// main entrance; fields climb ~4 levels at a time; 3-4 pockets per field
// summing to 110-130 alive; every species placed by habitat.
//
// Geography (north up). Port Merrow sits on the main island; its East Gate
// opens onto the beach and its ferry pier crosses to Tidewheel Bay:
//
//   Port Merrow ── Saltwind Shore ── Coral Reach
//        ┆ ferry                         │
//        └──────── Tidewheel Bay ────────┘── Wreck Shoal
//                                              │
//                          Stormbreak ── Pearl Flats
//                              │ (intake hatch)
//                        Drowned Relay
//
// The region's ecology runs from the surf line inwards and downwards: shore
// animals and gulls on the beach, spitting coral on the reef, kelp and Aethrion
// pressure machinery round the tidewheels, wrecks and their borers on the
// shoal, pearl beds and the relay mast on the flats, storm-riders and turtles
// on the headland, and the relay's own drones and jellies in the flooded station.

import type { DialogueDef, ItemDef, NpcDef, Prop, QuestDef, RecipeDef } from "../../src/data/schema";
import { expToNext } from "../model";
import type { MapDesign, RegionDesign } from "../types";

const questExp = (level: number, share: number) => Math.round(expToNext(level) * share);

// --- monsters ------------------------------------------------------------------
// Fourteen species for a 30-level region: every field band (and the dungeon)
// needs 3-4 residents within ±2 levels, so the four seed monsters are kept at
// their seed levels and ten new ones fill the gaps between them.

const monsters: RegionDesign["monsters"] = [
  {
    id: "mob_0020", name: "Tidehopper", level: 36, archetype: "swarm", family: "amphibian", element: "water", behavior: "passive",
    drops: { common: "itm_0039", uncommon: "itm_0040" },
    ecology: "Spring-legged shore amphibians that feed in Saltwind's tidepools at low water. Passive: they hop out of the way of anything bigger, which makes them the region's warm-up herd.",
    art_brief: "A frog-sized blue-grey hopper with oversized hind legs, a shell-plate back and bulbous wet eyes; barnacle specks; sea-glass blue.",
  },
  {
    id: "mob_0060", name: "Gullwing Skimmer", level: 38, archetype: "swarm", family: "avian", element: "wind", behavior: "passive",
    mods: { hp: 0.9, speed: 0.75, atk: 1.1 }, why: "A diving sea-bird: hollow bones (-10% HP), fast on the wing (25% faster), hooked beak (+10% ATK). The first aggressive swarm in Thalassia, so a careless walk along the cliffs pulls a flock.",
    drops: { common: "itm_0160", uncommon: "itm_0161" },
    ecology: "Gulls that nest on the Saltwind cliffs and perch on the beached pump-buoy; they dive on anything that walks under the colony.",
    art_brief: "A long-winged gull with brass-tinted primaries, a hooked orange beak and a crest of storm-grey feathers; mid-dive pose.",
  },
  {
    id: "mob_0021", name: "Coral Claw", level: 40, archetype: "bruiser", family: "crustacean", element: "water", behavior: "aggressive",
    mods: { def: 1.3, speed: 1.15 }, why: "Coral-crusted carapace (+30% DEF) and a sideways scuttle (15% slower). The region's first bruiser: a wall to AoE down, not to chase.",
    drops: { common: "itm_0041", uncommon: "itm_0042", rare: "itm_0178" },
    ecology: "Crabs that wear living coral as armour; they patrol Saltwind's wrack line and pinch anything near their burrows. Their coral sometimes grows round a pearl.",
    art_brief: "A crab the size of a dog, its shell overgrown with pink and orange coral branches, one claw much larger than the other; wet teal legs.",
  },
  {
    id: "mob_0061", name: "Polyp Spitter", level: 42, archetype: "ranged", family: "coral", element: "water", behavior: "aggressive",
    mods: { range: 6, hp: 0.9 }, why: "Spits stinging barbs from 6 cells (one more than standard ranged) but is a soft colony (-10% HP). Mixed into reef packs so players learn to pull ranged mobs around coral heads.",
    drops: { common: "itm_0162", uncommon: "itm_0163" },
    ecology: "Walking coral colonies that root on Coral Reach's reef heads, kelp shallows and dead coral, spitting barbs at anything that disturbs the water.",
    art_brief: "A squat lump of polyps on stubby root-legs, a ring of open tube mouths on top glowing magenta; pink-violet with white tips.",
  },
  {
    id: "mob_0062", name: "Kelp Tender", level: 44, archetype: "support", family: "plant", element: "nature", behavior: "assist",
    mods: { hp: 1.1, speed: 1.2 }, why: "A rooted, fibrous forest-keeper: +10% HP, 20% slower. Support: it mends whatever it stands among, so it is the target to kill first in a mixed pull.",
    drops: { common: "itm_0164", uncommon: "itm_0165", rare: "itm_0178" },
    ecology: "Kelp creatures that tend the kelp beds of Tidewheel Bay and the weed on its tidewheels' barnacled paddles; they answer any of their bed's distress and pearl oysters grow on their fronds.",
    art_brief: "A tall swaying figure of braided kelp with a bulb head glowing soft green, frond arms trailing; small oysters clinging to its stalk.",
  },
  {
    id: "mob_0022", name: "Brine Automaton", level: 45, archetype: "construct", family: "construct", element: "water", behavior: "passive",
    mods: { atk: 1.1, attack_speed: 1.15 }, why: "Pressure-piston fists hit hard (+10% ATK) but each punch has to recharge (15% slower attacks). The first construct of the region and the tidewheels' Aetherite source.",
    drops: { common: "itm_0043", uncommon: "itm_0044", extra: [{ item_id: "itm_0073", rate_bp: 400 }] },
    ecology: "Copper pressure-maintenance frames that still service the tidewheel pumps and patch the old quay pilings of Tidewheel Bay; they treat every visitor as a fault to clear.",
    art_brief: "A barrel-chested copper automaton with piston arms, brine-crusted gauges for eyes and a tank on its back hissing steam; verdigris green and brass.",
  },
  {
    id: "mob_0063", name: "Hullborer", level: 49, archetype: "swarm", family: "mollusc", element: "water", behavior: "assist",
    mods: { hp: 1.1, def: 0.8, speed: 1.1 }, why: "Long soft bodies (+10% HP, -20% DEF) that drag along (10% slower). Assist: borers in one hull share a tunnel and boil out together, so Wreck Shoal's horde is the region's big AoE pull.",
    drops: { common: "itm_0166", uncommon: "itm_0167" },
    ecology: "Ship-worms grown huge on Aethrion hull-timber; they infest the wrecks, the sunken freighter, the buoy floats and the driftwood bars of Wreck Shoal.",
    art_brief: "A pale segmented worm with a drill-bit shell at its head, wood shavings stuck to its slime; bone-white with rust-red rasp.",
  },
  {
    id: "mob_0023", name: "Relay Guardian", level: 52, archetype: "construct", family: "construct", element: "water", behavior: "assist",
    mods: { range: 2, def: 1.1 }, why: "Sonar lash reaches 2 cells and heavier plate (+10% DEF). Assist: guardians on one buoy line share a sonar net, so one ping wakes the line. Kept at its seed level: it guards the relay's surface mast and cables on Pearl Flats, not the drowned station itself.",
    drops: { common: "itm_0045", uncommon: "itm_0046", extra: [{ item_id: "itm_0073", rate_bp: 600 }] },
    ecology: "Sonar sentries bolted to the Drowned Relay's surface buoys; they walk the relay mast and the buoy cables on the south strand of Pearl Flats.",
    art_brief: "A tall diving-suit construct with a dish-shaped sonar head, ribbed hoses and lead boots; dark bronze with pulsing cyan rings.",
  },
  {
    id: "mob_0064", name: "Pearl Skate", level: 53, archetype: "swarm", family: "fish", element: "water", behavior: "passive",
    mods: { hp: 0.95, atk: 0.85, speed: 0.75 }, why: "A flat, quick bottom-dweller: slightly frail (-5% HP), weak bite (-15% ATK), fast (25% faster). Flees when hit, so the pearl beds are a herding exercise, not a fight.",
    drops: { common: "itm_0168", uncommon: "itm_0169", rare: "itm_0178" },
    ecology: "Skates that bury in the warm mud of Pearl Flats' pearl beds and stilt ruins, cracking oysters; startled, they skim away across the shallows.",
    art_brief: "A wide diamond-shaped skate with a pearlescent back and a whip tail, skimming on its wing tips; sand-cream with nacre sheen.",
  },
  {
    id: "mob_0065", name: "Thunderhull Turtle", level: 56, archetype: "bruiser", family: "reptile", element: "earth", behavior: "assist",
    mods: { hp: 1.15, def: 1.3, speed: 1.3 }, why: "A sea turtle grown into a hull: +15% HP, +30% DEF, 30% slower. The late-region bruiser: tanky enough that single-target skills matter again.",
    drops: { common: "itm_0170", uncommon: "itm_0171" },
    ecology: "Great turtles that bask in the warm outflow of Stormbreak's intake vents and shelter behind its ruined breakwater; they wear salvaged hull plating grown into their shells and defend the herd.",
    art_brief: "A huge turtle whose shell is fused with riveted copper hull plates and a broken porthole; storm-grey skin, barnacles, glowing amber eyes.",
  },
  {
    id: "mob_0066", name: "Squall Ray", level: 58, archetype: "ranged", family: "fish", element: "wind", behavior: "passive",
    mods: { hp: 0.9, atk: 1.15, speed: 0.8 }, why: "Glides on storm winds: light (-10% HP), fast (20% faster), discharges stored lightning (+15% ATK). The hardest-hitting ranged monster in Thalassia, at the top field.",
    drops: { common: "itm_0172", uncommon: "itm_0173" },
    ecology: "Manta rays that leave the sea in a gale and ride the updraft round Stormbreak's lightning masts, charging their wings on the Aethrion conductors.",
    art_brief: "A manta ray with wing edges crackling blue, a long stinger tail with a copper tip; indigo back, white belly, floating above the ground.",
  },
  {
    id: "mob_0067", name: "Pressure Drone", level: 61, archetype: "swarm", family: "construct", element: "water", behavior: "aggressive",
    mods: { def: 1.4, hp: 1.05 }, why: "A riveted brass hull (+40% DEF, +5% HP). The dungeon's rank and file: a dense, armoured swarm that rewards high-multiplier AoE over basic attacks.",
    drops: { common: "itm_0174", uncommon: "itm_0175", extra: [{ item_id: "itm_0073", rate_bp: 300 }] },
    ecology: "Maintenance drones of the Drowned Relay; they keep the pressure halls sealed and crowd round the pump ring when the pumps surge.",
    art_brief: "A football-sized brass sphere with three propeller fins and a single red lamp eye, valves venting bubbles; pitted copper and red.",
  },
  {
    id: "mob_0068", name: "Gloom Medusa", level: 63, archetype: "support", family: "cnidarian", element: "shadow", behavior: "assist",
    mods: { range: 5, hp: 0.9 }, why: "Drifts at a distance (5-cell reach) and is mostly water (-10% HP). Support: its pulses shield the drones around it, so the flooded gallery punishes pulling without focusing it first.",
    drops: { common: "itm_0176", uncommon: "itm_0177", rare: "itm_0178" },
    ecology: "Deep-water jellyfish that bloomed in the relay's flooded gallery, feeding on the leaking aether; they float in the dark and defend the drones that keep their water warm.",
    art_brief: "A translucent violet bell trailing long glowing tendrils, an aether-blue nucleus pulsing inside; dark halo.",
  },
  {
    id: "mob_0069", name: "Drowned Signalmind", level: 65, archetype: "boss", family: "construct", element: "water", behavior: "aggressive",
    mods: { range: 4, atk: 0.9 }, why: "Attacks with sonar pulses from 4 cells, so melee and ranged both get hit; -10% ATK keeps that reach fair at the region's cap.",
    drops: { common: "itm_0174", uncommon: "itm_0175", rare: "itm_0179", extra: [{ item_id: "itm_0073", rate_bp: 10000, qty: [2, 4] }, { item_id: "itm_0178", rate_bp: 2500 }] },
    ecology: "The relay's control mind, which drowned with the station and kept broadcasting; it has grown a body of drone hulls and cable round its sonar array in the Sonar Chamber, and its pulses are what keep Thalassia's constructs hostile.",
    art_brief: "A colossal brass-and-coral head on cable tentacles, a ring of sonar dishes for a crown, one great cracked lens eye glowing cyan; bubbles and sparks.",
  },
];

// --- items -----------------------------------------------------------------------

const materials: RegionDesign["materials"] = [
  { id: "itm_0039", name: "Tidehopper Fragment", level: 36, tier: "common", description: "A chip of a Tidehopper's back-plate, sea-smoothed." },
  { id: "itm_0040", name: "Tidehopper Core", level: 36, tier: "uncommon", description: "The springy tendon-knot from a Tidehopper's hind leg; it still twitches." },
  { id: "itm_0041", name: "Coral Claw Fragment", level: 40, tier: "common", description: "A broken branch of the coral a Coral Claw wears." },
  { id: "itm_0042", name: "Coral Claw Core", level: 40, tier: "uncommon", description: "An intact crusher claw, coral and shell grown together." },
  { id: "itm_0043", name: "Brine Automaton Fragment", level: 45, tier: "common", description: "A verdigrised copper panel from a Brine Automaton." },
  { id: "itm_0044", name: "Brine Automaton Core", level: 45, tier: "uncommon", description: "A working pressure valve, still holding brine." },
  { id: "itm_0045", name: "Relay Guardian Fragment", level: 52, tier: "common", description: "A ribbed hose section from a Relay Guardian." },
  { id: "itm_0046", name: "Relay Guardian Core", level: 52, tier: "uncommon", description: "A sonar crystal that hums when held near water." },
  { id: "itm_0160", name: "Skimmer Plume", level: 38, tier: "common", description: "A brass-tinted flight feather from a Gullwing Skimmer." },
  { id: "itm_0161", name: "Storm Quill", level: 38, tier: "uncommon", description: "A crest feather that stiffens before a storm." },
  { id: "itm_0162", name: "Polyp Barb", level: 42, tier: "common", description: "A spent stinging barb; handle by the base." },
  { id: "itm_0163", name: "Stinging Polyp Sac", level: 42, tier: "uncommon", description: "A full venom sac from a Polyp Spitter's crown." },
  { id: "itm_0164", name: "Kelp Frond", level: 44, tier: "common", description: "A broad frond from a Kelp Tender. Edible, if you're hungry." },
  { id: "itm_0165", name: "Tender Bulb", level: 44, tier: "uncommon", description: "The glowing float bulb of a Kelp Tender's head." },
  { id: "itm_0166", name: "Borer Shell", level: 49, tier: "common", description: "The drill-shell from a Hullborer's head." },
  { id: "itm_0167", name: "Borer Rasp", level: 49, tier: "uncommon", description: "A Hullborer's rasping tooth-ribbon; it files copper." },
  { id: "itm_0168", name: "Skate Leather", level: 53, tier: "common", description: "Pearlescent skin from a Pearl Skate's back." },
  { id: "itm_0169", name: "Skate Barb", level: 53, tier: "uncommon", description: "The serrated tail barb of a Pearl Skate." },
  { id: "itm_0170", name: "Hull Scute", level: 56, tier: "common", description: "A shell scute with a rivet grown into it." },
  { id: "itm_0171", name: "Stormshell Plate", level: 56, tier: "uncommon", description: "A whole shell plate fused with Aethrion hull copper." },
  { id: "itm_0172", name: "Ray Wing Hide", level: 58, tier: "common", description: "A strip of Squall Ray wing that holds a static charge." },
  { id: "itm_0173", name: "Charged Stinger", level: 58, tier: "uncommon", description: "A copper-tipped stinger that sparks when tapped." },
  { id: "itm_0174", name: "Drone Valve", level: 61, tier: "common", description: "A brass vent valve from a Pressure Drone." },
  { id: "itm_0175", name: "Pressure Gauge Core", level: 61, tier: "uncommon", description: "A drone's sealed gauge, its needle still twitching with the relay's pressure." },
  { id: "itm_0176", name: "Gloom Jelly", level: 63, tier: "common", description: "A lump of Gloom Medusa bell that glows faintly in the dark." },
  { id: "itm_0177", name: "Medusa Bell", level: 63, tier: "uncommon", description: "An unbroken medusa bell, aether still pulsing in its nucleus." },
  { id: "itm_0178", name: "Abyssal Pearl", level: 50, tier: "rare", description: "A black pearl with a blue fire inside. Thalassia's prize: crabs, kelp, skates and medusae all carry them, one in hundreds." },
  { id: "itm_0179", name: "Signalmind Lens", level: 65, tier: "rare", description: "The Drowned Signalmind's eye-lens, still focusing a signal no one sends any more." },
];

// No new equipment beyond Lumeris (deferred); the region's items are its
// materials plus the shared consumables.
const items: ItemDef[] = [];

const recipes: RecipeDef[] = [
  // Kelp is the island's staple: four fronds dry into a stack of rations.
  { id: "rcp_tha_kelp_ration", npc_id: "npc_tha_craftsman", output: { item_id: "itm_0075", qty: 10 }, inputs: [{ item_id: "itm_0164", qty: 4 }], currency: 20 },
  // Hopper tendon gel binds wounds; kelp makes it drinkable.
  { id: "rcp_tha_hopper_tonic", npc_id: "npc_tha_craftsman", output: { item_id: "itm_0076", qty: 6 }, inputs: [{ item_id: "itm_0040", qty: 1 }, { item_id: "itm_0164", qty: 3 }], currency: 40 },
  // Diluted polyp venom and medusa jelly sharpen focus (in small doses).
  { id: "rcp_tha_medusa_focus", npc_id: "npc_tha_craftsman", output: { item_id: "itm_0077", qty: 6 }, inputs: [{ item_id: "itm_0176", qty: 2 }, { item_id: "itm_0162", qty: 3 }], currency: 40 },
];

// --- quests: a chain that walks the player through every map in level order ------

const R = "npc_tha_guild_registrar";
const quests: QuestDef[] = [
  { id: "q_tha_intro", title: "Thalassia: First Survey", region_id: "tha", giver_npc_id: R, turn_in_npc_id: R, min_level: 35, prerequisite: null,
    objectives: [{ type: "kill", monster_id: "mob_0020", count: 60 }],
    rewards: { base_exp: questExp(35, 0.5), currency: 1200, items: [{ item_id: "itm_0075", qty: 20 }, { item_id: "itm_0076", qty: 10 }] },
    summary: "Clear the Tidehopper herd in Saltwind's tidepools: a passive warm-up that shows a Wayfarer arriving from Solenia how dense Thalassian packs are." },
  { id: "q_tha_saltwind", title: "Gulls Over the Wrack", region_id: "tha", giver_npc_id: "npc_tha_saltwind_scout", turn_in_npc_id: "npc_tha_saltwind_scout", min_level: 37, prerequisite: "q_tha_intro",
    objectives: [{ type: "kill", monster_id: "mob_0060", count: 100 }, { type: "kill", monster_id: "mob_0021", count: 40 }],
    rewards: { base_exp: questExp(37, 0.45), currency: 1500, items: [{ item_id: "itm_0076", qty: 10 }] },
    summary: "Aggressive gull flocks on the cliffs and coral-armoured crabs on the wrack line: the region's first swarm-plus-bruiser lesson." },
  { id: "q_tha_coral_reach", title: "Reef Survey", region_id: "tha", giver_npc_id: "npc_tha_coral_reach_scout", turn_in_npc_id: "npc_tha_coral_reach_scout", min_level: 40, prerequisite: "q_tha_saltwind",
    objectives: [{ type: "visit", map_id: "tha_fld_02", count: 1 }, { type: "kill", monster_id: "mob_0061", count: 80 }, { type: "collect", item_id: "itm_0162", count: 15 }],
    rewards: { base_exp: questExp(40, 0.4), currency: 1800, items: [{ item_id: "itm_0077", qty: 10 }] },
    summary: "Cross the reef boardwalks, silence the Polyp Spitters and bring back their barbs as proof of the survey." },
  { id: "q_tha_tidewheel", title: "Faults in the Pumps", region_id: "tha", giver_npc_id: "npc_tha_tidewheel_scout", turn_in_npc_id: "npc_tha_tidewheel_scout", min_level: 43, prerequisite: "q_tha_coral_reach",
    objectives: [{ type: "kill", monster_id: "mob_0022", count: 60 }, { type: "kill", monster_id: "mob_0062", count: 60 }, { type: "collect", item_id: "itm_0044", count: 3 }],
    rewards: { base_exp: questExp(43, 0.4), currency: 2200, items: [{ item_id: "itm_0073", qty: 2 }] },
    summary: "Brine Automatons at the pumpworks and pilings, and the Kelp Tenders that mend each other in the kelp beds and on the paddles. Teaches focusing the support monster first." },
  { id: "q_tha_wreck_shoal", title: "Borers in the Hulks", region_id: "tha", giver_npc_id: "npc_tha_wreck_shoal_scout", turn_in_npc_id: "npc_tha_wreck_shoal_scout", min_level: 47, prerequisite: "q_tha_tidewheel",
    objectives: [{ type: "kill", monster_id: "mob_0063", count: 150 }],
    rewards: { base_exp: questExp(47, 0.4), currency: 2600, items: [{ item_id: "itm_0076", qty: 15 }] },
    summary: "The Hullborer horde is the region's signature pull: assist behaviour empties a whole wreck at once. 150 kills is three or four full trains." },
  { id: "q_tha_pearl_flats", title: "Buoys and Pearls", region_id: "tha", giver_npc_id: "npc_tha_pearl_flats_scout", turn_in_npc_id: "npc_tha_pearl_flats_scout", min_level: 51, prerequisite: "q_tha_wreck_shoal",
    objectives: [{ type: "kill", monster_id: "mob_0023", count: 50 }, { type: "kill", monster_id: "mob_0064", count: 80 }],
    rewards: { base_exp: questExp(51, 0.4), currency: 3000, items: [{ item_id: "itm_0073", qty: 3 }, { item_id: "itm_0077", qty: 10 }] },
    summary: "Break the Relay Guardians' sonar line at the mast and herd the fleeing skates on the pearl beds. The guardians' pings point toward the drowned relay." },
  { id: "q_tha_stormbreak", title: "Riders of the Gale", region_id: "tha", giver_npc_id: "npc_tha_stormbreak_scout", turn_in_npc_id: "npc_tha_stormbreak_scout", min_level: 55, prerequisite: "q_tha_pearl_flats",
    objectives: [{ type: "kill", monster_id: "mob_0066", count: 100 }, { type: "kill", monster_id: "mob_0065", count: 40 }],
    rewards: { base_exp: questExp(55, 0.4), currency: 3500, items: [{ item_id: "itm_0076", qty: 15 }] },
    summary: "Clear the Squall Rays from the lightning masts and the turtles from the breakwater so the hatch crew can reach the intake shaft." },
  { id: "q_tha_drowned_relay", title: "The Drowned Signal", region_id: "tha", giver_npc_id: "npc_tha_relay_hatch_keeper", turn_in_npc_id: R, min_level: 59, prerequisite: "q_tha_stormbreak",
    objectives: [{ type: "kill", monster_id: "mob_0069", count: 1 }],
    rewards: { base_exp: questExp(59, 0.8), currency: 7000, items: [{ item_id: "itm_0073", qty: 4 }, { item_id: "itm_0178", qty: 1 }] },
    summary: "Silence the Drowned Signalmind in the Sonar Chamber and report to Port Merrow. Its pulses kept Thalassia's constructs hostile; the road to Crystallis opens." },
];

// --- maps --------------------------------------------------------------------------

const npc = (id: string, name: string, position: [number, number], facing: NpcDef["facing"], role: NpcDef["role"], extra: Partial<NpcDef> = {}): Omit<NpcDef, "map_id"> =>
  ({ id, name, position, facing, role, dialogue_id: id.replace(/^npc_/, "dlg_"), shop_id: null, ...extra });

const fieldCost = (minLevel: number) => 10 + 4 * minLevel;
/** Capital-to-capital transit, priced by the destination region's minimum level. */
const capitalCost = (destMinLevel: number) => 300 + 15 * destMinLevel;

const portMerrow: MapDesign = {
  id: "tha_town_01", name: "Port Merrow", type: "town", role: "Region capital: harbour services, quest hub, crafting, the ferry to Tidewheel Bay and transit to Solenia and Crystallis.",
  levels: [35, 65], size: [136, 120], arrival: [64, 60], ground: "stone", theme: "whitewashed harbour town round a tide-clock plaza, quays and a ferry pier",
  border: { width: 3, kind: "cliff" },
  roads: [
    { points: [[64, 54], [135, 50]], width: 5, kind: "stone" }, // East Gate road
    { points: [[64, 54], [64, 92]], width: 5, kind: "stone" }, // Harbour Street
    { points: [[64, 92], [64, 119]], width: 4, kind: "boardwalk" }, // ferry pier
    { points: [[18, 90], [112, 90]], width: 3, kind: "boardwalk" }, // the quay
    { points: [[64, 54], [61, 25]], width: 4, kind: "stone" }, // Guild Street
    { points: [[64, 54], [22, 60]], width: 3, kind: "stone" }, // Beacon Lane
  ],
  blockers: [
    { kind: "water", shape: { poly: [[3, 96], [40, 94], [64, 95], [100, 93], [133, 92], [133, 117], [3, 117]] } }, // the harbour
    { kind: "building", shape: { rect: [50, 10, 22, 12] } }, // Guild Hall
    { kind: "building", shape: { rect: [26, 40, 14, 10] } }, // Harbour Medic
    { kind: "building", shape: { rect: [84, 60, 16, 12] } }, // Artificer's pump-works
    { kind: "building", shape: { rect: [20, 72, 16, 10] } }, // west warehouse
    { kind: "building", shape: { rect: [96, 76, 18, 10] } }, // east warehouse
    { kind: "building", shape: { rect: [96, 16, 14, 10] } },
    { kind: "building", shape: { rect: [16, 14, 12, 10] } },
    { kind: "building", shape: { rect: [110, 30, 12, 10] } },
    { kind: "building", shape: { rect: [36, 22, 12, 10] } },
    { kind: "building", shape: { rect: [74, 72, 10, 10] } },
  ],
  props: [
    { kind: "fountain", x: 64, y: 54, block: 3, scale: 1.3 }, // the tide clock
    { kind: "aether_pylon", x: 56, y: 47, block: 1 }, { kind: "aether_pylon", x: 72, y: 47, block: 1 },
    { kind: "aether_pylon", x: 56, y: 61, block: 1 }, { kind: "aether_pylon", x: 72, y: 61, block: 1 },
    { kind: "hall", x: 61, y: 16, block: 0, scale: 1.4 },
    { kind: "market_stall", x: 76, y: 46, block: 2 }, { kind: "market_stall", x: 82, y: 45, block: 2 }, { kind: "market_stall", x: 88, y: 46, block: 2 },
    { kind: "transit_gate", x: 46, y: 68, block: 3 },
    { kind: "workshop", x: 92, y: 66, block: 0 }, { kind: "furnace", x: 80, y: 68, block: 2 }, { kind: "anvil", x: 78, y: 64, block: 1 },
    { kind: "waterwheel", x: 104, y: 94, block: 2, scale: 1.3 },
    { kind: "dock", x: 36, y: 96, block: 0, scale: 1.3 }, { kind: "dock", x: 92, y: 96, block: 0, scale: 1.3 },
    { kind: "lattice_obelisk", x: 18, y: 62, block: 2, scale: 1.4 }, // Beacon Point
    { kind: "statue", x: 70, y: 32, block: 2 },
    { kind: "lamp_post", x: 58, y: 40, block: 1 }, { kind: "lamp_post", x: 69, y: 40, block: 1 }, { kind: "lamp_post", x: 100, y: 47, block: 1 },
    { kind: "lamp_post", x: 120, y: 47, block: 1 }, { kind: "lamp_post", x: 60, y: 86, block: 1 }, { kind: "lamp_post", x: 68, y: 86, block: 1 },
    { kind: "crate", x: 40, y: 87, block: 1 }, { kind: "crate", x: 42, y: 87, block: 1 }, { kind: "crate", x: 116, y: 87, block: 1 },
    { kind: "palm", x: 10, y: 50, block: 1 }, { kind: "palm", x: 12, y: 34, block: 1 }, { kind: "palm", x: 124, y: 70, block: 1 },
    { kind: "palm", x: 118, y: 62, block: 1 }, { kind: "palm", x: 44, y: 78, block: 1 }, { kind: "palm", x: 88, y: 30, block: 1 },
  ],
  scatter: [],
  landmarks: [
    { id: "lm_tha_merrow_plaza", name: "Tide-Clock Plaza", kind: "plaza", x: 64, y: 54, note: "Respawn point; an Aethrion tide clock in the fountain still keeps the harbour's hours." },
    { id: "lm_tha_merrow_guild", name: "Wayfarer Guild, Merrow Chapter", kind: "plaza", x: 61, y: 16, note: "Quest hub." },
    { id: "lm_tha_merrow_east_gate", name: "East Gate", kind: "gate", x: 130, y: 50, note: "To Saltwind Shore (Lv35-40)." },
    { id: "lm_tha_merrow_ferry", name: "Ferry Pier", kind: "gate", x: 64, y: 112, note: "The ferry crosses to Tidewheel Bay (Lv43-48)." },
    { id: "lm_tha_merrow_transit", name: "Transit Station", kind: "plaza", x: 46, y: 68, note: "Paid travel to field camps, Duskhar and Vaelspire." },
    { id: "lm_tha_merrow_pumpworks", name: "Artificer's Pump-Works", kind: "plaza", x: 92, y: 66, note: "Crafts consumables from island materials." },
    { id: "lm_tha_merrow_beacon", name: "Beacon Point", kind: "lookout", x: 18, y: 62, note: "A lattice obelisk that once guided relay ships." },
  ],
  safe_areas: [[0, 0, 136, 120]],
  pockets: [],
  npcs: [
    npc("npc_tha_guild_registrar", "Port Merrow Guild Registrar", [61, 25], "S", "guild_registrar"),
    npc("npc_tha_merchant", "Port Merrow Supply Merchant", [82, 48], "S", "merchant", { shop_id: "shop_tha_supply" }),
    npc("npc_tha_healer", "Port Merrow Field Medic", [42, 52], "E", "healer"),
    npc("npc_tha_teleporter", "Port Merrow Transit Operator", [50, 64], "SW", "teleporter", {
      destinations: [
        ["tha_fld_01", fieldCost(35)], ["tha_fld_02", fieldCost(39)], ["tha_fld_03", fieldCost(43)],
        ["tha_fld_04", fieldCost(47)], ["tha_fld_05", fieldCost(51)], ["tha_fld_06", fieldCost(55)],
        ["sol_town_01", capitalCost(25)], ["cry_town_01", capitalCost(45)],
      ],
    }),
    npc("npc_tha_craftsman", "Port Merrow Artificer", [82, 64], "E", "craftsman"),
    npc("npc_tha_east_gate_guard", "East Gate Warden", [126, 46], "W", "guard"),
    npc("npc_tha_harbourmaster", "Harbourmaster Quill", [58, 88], "S", "guard"),
  ],
};

const saltwind: MapDesign = {
  id: "tha_fld_01", name: "Saltwind Shore", type: "field", role: "First field: a long beach under gull cliffs; a passive herd in the tidepools, the first aggressive flock and the first bruisers.",
  levels: [35, 40], size: [144, 104], arrival: [10, 40], ground: "sand", theme: "black-sand beach under sea cliffs, palm dunes and a beached Aethrion pump-buoy",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[0, 40], [16, 40], [40, 44], [70, 40]], width: 4, kind: "dirt" },
    { points: [[70, 40], [100, 34], [130, 28], [143, 28]], width: 4, kind: "dirt" },
    { points: [[70, 40], [66, 62], [58, 76]], width: 3, kind: "boardwalk" },
    { points: [[70, 40], [80, 24], [96, 14]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { poly: [[4, 86], [30, 79], [60, 83], [90, 77], [120, 81], [140, 75], [144, 75], [144, 104], [0, 104], [0, 86]] } }, // the sea
    { kind: "water", shape: { ellipse: [46, 52, 7, 4] } }, // tidal lagoon
    { kind: "cliff", shape: { poly: [[118, 4], [140, 4], [140, 16], [124, 18]] } }, // north-east headland
    { kind: "rock", shape: { ellipse: [60, 24, 4, 3] } },
    { kind: "rock", shape: { ellipse: [124, 56, 4, 3] } },
  ],
  props: [
    { kind: "tent", x: 8, y: 35, block: 2 }, { kind: "crate", x: 15, y: 46, block: 1 }, { kind: "lamp_post", x: 18, y: 36, block: 1 },
    { kind: "tent", x: 137, y: 23, block: 2 },
    { kind: "aether_pylon", x: 72, y: 46, block: 1 },
    { kind: "rune_stone", x: 64, y: 34, block: 1 },
    { kind: "gear_ruin", x: 98, y: 12, block: 3, scale: 1.5 }, // the beached pump-buoy
    { kind: "brass_pipe", x: 106, y: 16, block: 0 }, { kind: "brass_pipe", x: 90, y: 18, block: 0 },
    { kind: "dock", x: 58, y: 80, block: 0, scale: 1.2 },
    { kind: "coral", x: 40, y: 74, block: 1 }, { kind: "coral", x: 52, y: 72, block: 1 },
  ],
  scatter: [
    { kind: "palm", count: 70, block: 1, scale: [0.9, 1.3] },
    { kind: "bush", count: 80, block: 0, scale: [0.6, 1] },
    { kind: "rock", count: 20, area: [84, 48, 40, 24], block: 1, scale: [0.7, 1.2] },
    { kind: "coral", count: 25, area: [24, 56, 44, 24], block: 1, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_tha_saltwind_camp", name: "Saltwind Camp", kind: "camp", x: 10, y: 40, note: "Arrival from Port Merrow; the scout knows the tides." },
    { id: "lm_tha_saltwind_crossroads", name: "Dune Crossroads", kind: "crossroads", x: 70, y: 40, note: "Roads to the tidepools, the buoy and the east camp." },
    { id: "lm_tha_tidepool_flats", name: "Tidepool Flats", kind: "farm", x: 46, y: 66, note: "40 passive Tidehoppers at the waterline." },
    { id: "lm_tha_gull_cliffs", name: "Gull Cliffs", kind: "farm", x: 40, y: 16, note: "The Gullwing colony under the north cliffs." },
    { id: "lm_tha_wrack_line", name: "Wrack Line", kind: "farm", x: 100, y: 60, note: "Coral Claws patrol the seaweed line." },
    { id: "lm_tha_beached_buoy", name: "Beached Pump-Buoy", kind: "ruin", x: 98, y: 12, note: "An Aethrion buoy thrown ashore by a storm." },
    { id: "lm_tha_saltwind_east", name: "Reef Path", kind: "gate", x: 134, y: 28, note: "To Coral Reach (Lv39-44)." },
  ],
  safe_areas: [[5, 33, 14, 15], [126, 21, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "tidepool_flats", name: "Tidepool Flats", rects: [[30, 58, 34, 18]], species: [{ monster_id: "mob_0020", weight: 1 }], target_alive: 40, respawn_sec: [6, 13],
      design_note: "Passive Tidehoppers on the sand between the lagoon and the surf: a dense (~14 cells each) but harmless herd to re-learn AoE pulls on arrival in the region." },
    { id: "gull_cliffs", name: "Gull Cliffs", rects: [[22, 6, 38, 22]], species: [{ monster_id: "mob_0060", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "The aggressive flock nests under the north cliffs, away from the road but within sight of the camp: players choose when to pull it." },
    { id: "wrack_line", name: "Wrack Line", rects: [[84, 50, 36, 20]], species: [{ monster_id: "mob_0021", weight: 1 }], target_alive: 30, respawn_sec: [8, 18],
      design_note: "Coral Claw bruisers on the east beach at the top of the band (Lv40); the seaweed rocks break their line so they arrive in twos and threes." },
    { id: "beached_buoy", name: "Beached Pump-Buoy", rects: [[84, 6, 30, 18]], species: [{ monster_id: "mob_0020", weight: 50 }, { monster_id: "mob_0060", weight: 50 }], target_alive: 20, respawn_sec: [8, 16],
      design_note: "Gulls perch on the stranded buoy while hoppers shelter in its shadow: an aggressive flock drags passive hoppers into the fight." },
  ],
  npcs: [npc("npc_tha_saltwind_scout", "Saltwind Scout Marro", [14, 37], "E", "scout")],
};

const coralReach: MapDesign = {
  id: "tha_fld_02", name: "Coral Reach", type: "field", role: "A reef left high by the tide, crossed on Aethrion boardwalks: Polyp Spitters rooted on every coral head, the region's ranged lesson.",
  levels: [39, 44], size: [120, 136], arrival: [10, 104], ground: "shore", theme: "exposed coral reef islands threaded by boardwalks over a tidal channel",
  border: { width: 4, kind: "water" },
  roads: [
    { points: [[0, 104], [22, 104], [40, 96]], width: 4, kind: "boardwalk" },
    { points: [[40, 96], [56, 94], [76, 94]], width: 4, kind: "bridge" },
    { points: [[76, 94], [84, 108], [84, 135]], width: 4, kind: "boardwalk" },
    { points: [[40, 96], [38, 64], [30, 30]], width: 3, kind: "boardwalk" },
    { points: [[76, 94], [90, 64], [96, 30]], width: 3, kind: "boardwalk" },
    { points: [[34, 44], [90, 44]], width: 3, kind: "bridge" },
  ],
  blockers: [
    { kind: "water", shape: { poly: [[56, 4], [64, 4], [62, 40], [70, 70], [66, 100], [72, 132], [64, 132], [58, 100], [62, 70], [54, 40]] } }, // the tidal channel
    { kind: "water", shape: { ellipse: [100, 106, 7, 5] } },
    { kind: "water", shape: { ellipse: [20, 124, 6, 4] } },
    { kind: "rock", shape: { ellipse: [100, 20, 4, 3] } },
    { kind: "rock", shape: { ellipse: [24, 76, 3, 3] } },
  ],
  props: [
    { kind: "tent", x: 7, y: 99, block: 2 }, { kind: "lamp_post", x: 18, y: 108, block: 1 },
    { kind: "tent", x: 90, y: 122, block: 2 },
    { kind: "coral", x: 30, y: 70, block: 2, scale: 1.4 }, { kind: "coral", x: 44, y: 78, block: 2, scale: 1.3 }, { kind: "coral", x: 86, y: 56, block: 2, scale: 1.5 },
    { kind: "coral", x: 104, y: 70, block: 2, scale: 1.3 }, { kind: "coral", x: 20, y: 24, block: 2, scale: 1.4 }, { kind: "coral", x: 102, y: 52, block: 2 },
    { kind: "aether_pylon", x: 40, y: 92, block: 1 },
    { kind: "rune_stone", x: 48, y: 40, block: 1 },
    { kind: "dock", x: 58, y: 100, block: 0, scale: 1.2 },
    { kind: "brass_pipe", x: 80, y: 40, block: 0 },
  ],
  scatter: [
    { kind: "coral", count: 90, block: 1, scale: [0.6, 1.2] },
    { kind: "palm", count: 30, block: 1, scale: [0.8, 1.2] },
    { kind: "bush", count: 40, block: 0, scale: [0.6, 1] },
    { kind: "rock", count: 20, block: 1, scale: [0.6, 1.1] },
  ],
  landmarks: [
    { id: "lm_tha_reach_camp", name: "Reef Camp", kind: "camp", x: 10, y: 104, note: "Arrival from Saltwind Shore." },
    { id: "lm_tha_reach_bridge", name: "Channel Bridge", kind: "crossroads", x: 60, y: 94, note: "The main crossing between the west and east reefs." },
    { id: "lm_tha_polyp_gardens", name: "Polyp Gardens", kind: "farm", x: 94, y: 64, note: "Ranged coral colonies on the east reef." },
    { id: "lm_tha_kelp_shallows", name: "Kelp Shallows", kind: "farm", x: 28, y: 26, note: "Polyp Spitters rooted in the north-west shallows." },
    { id: "lm_tha_claw_reef", name: "West Reef", kind: "farm", x: 30, y: 72, note: "Polyp Spitters on the old burrows near camp." },
    { id: "lm_tha_skimmer_roost", name: "Dead Coral Heads", kind: "farm", x: 92, y: 20, note: "Polyp Spitters crowd the dead coral heads." },
    { id: "lm_tha_reach_south", name: "Tidewheel Road", kind: "gate", x: 84, y: 128, note: "To Tidewheel Bay (Lv43-48)." },
  ],
  safe_areas: [[4, 96, 16, 14], [76, 118, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "polyp_gardens", name: "Polyp Gardens", rects: [[76, 50, 36, 30]], species: [{ monster_id: "mob_0061", weight: 1 }], target_alive: 35, respawn_sec: [7, 15],
      design_note: "Ranged Polyp Spitters among tall coral heads on the east reef: the heads break line of sight, so players pull spitters round them into melee." },
    { id: "kelp_shallows", name: "Kelp Shallows", rects: [[10, 12, 38, 30]], species: [{ monster_id: "mob_0061", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Polyp Spitters (Lv42) spread through the north-west shallows: the kelp screens their line of sight, so players learn to pull ranged fire out into the open." },
    { id: "west_reef", name: "West Reef", rects: [[12, 58, 38, 26]], species: [{ monster_id: "mob_0061", weight: 1 }], target_alive: 30, respawn_sec: [8, 18],
      design_note: "Polyp Spitters on the old crab burrows near the camp: aggressive ranged fire a short run from safety, for players who arrive at 39." },
    { id: "dead_coral_heads", name: "Dead Coral Heads", rects: [[72, 8, 40, 24]], species: [{ monster_id: "mob_0061", weight: 1 }], target_alive: 25, respawn_sec: [7, 15],
      design_note: "Polyp Spitters crowded on the north reef's dead coral heads: a dense ranged pack with little cover, so players must close the gap fast." },
  ],
  npcs: [npc("npc_tha_coral_reach_scout", "Reef Scout Ilsa", [14, 100], "E", "scout")],
};

const tidewheelBay: MapDesign = {
  id: "tha_fld_03", name: "Tidewheel Bay", type: "field", role: "A horseshoe bay ringed by giant tidewheels: pump constructs on the pumps and pilings, Kelp Tenders in the beds and on the barnacled paddles; the ferry from Port Merrow lands here.",
  levels: [43, 48], size: [136, 128], arrival: [10, 91], ground: "shore", theme: "a horseshoe bay of Aethrion tidewheels and pressure pumps over kelp shallows",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[40, 0], [40, 24], [52, 36]], width: 4, kind: "stone" },
    { points: [[0, 91], [16, 90], [30, 70], [38, 44], [52, 36], [70, 34], [96, 40], [110, 52], [135, 55]], width: 4, kind: "stone" }, // the rim road
    { points: [[110, 52], [112, 80], [104, 100]], width: 3, kind: "stone" },
    { points: [[52, 36], [66, 20]], width: 3, kind: "boardwalk" },
  ],
  blockers: [
    { kind: "water", shape: { ellipse: [70, 72, 28, 22] } }, // the bay
    { kind: "water", shape: { rect: [62, 92, 16, 20] } }, // bay mouth
    { kind: "water", shape: { poly: [[4, 112], [40, 108], [62, 110], [78, 110], [100, 106], [132, 110], [132, 124], [4, 124]] } }, // open sea
    { kind: "water", shape: { ellipse: [18, 58, 4, 3] } }, // kelp pools
    { kind: "water", shape: { ellipse: [14, 46, 3, 2] } },
    { kind: "machine", shape: { rect: [100, 10, 8, 6] } }, // pump house
    { kind: "rock", shape: { ellipse: [24, 28, 4, 3] } },
  ],
  props: [
    { kind: "waterwheel", x: 41, y: 72, block: 2, scale: 1.4 }, { kind: "waterwheel", x: 70, y: 49, block: 2, scale: 1.5 },
    { kind: "waterwheel", x: 99, y: 72, block: 2, scale: 1.4 }, { kind: "waterwheel", x: 70, y: 100, block: 2, scale: 1.3 },
    { kind: "brass_pipe", x: 96, y: 14, block: 0 }, { kind: "brass_pipe", x: 110, y: 20, block: 0 }, { kind: "brass_pipe", x: 116, y: 28, block: 0 },
    { kind: "aether_pylon", x: 48, y: 40, block: 1 },
    { kind: "dock", x: 6, y: 95, block: 0, scale: 1.3 }, { kind: "tent", x: 12, y: 86, block: 2 }, { kind: "lamp_post", x: 20, y: 94, block: 1 },
    { kind: "tent", x: 45, y: 7, block: 2 }, { kind: "tent", x: 126, y: 50, block: 2 },
    { kind: "gear_ruin", x: 60, y: 16, block: 2 }, { kind: "gear_ruin", x: 72, y: 10, block: 2 },
    { kind: "coral", x: 112, y: 70, block: 1 }, { kind: "coral", x: 118, y: 84, block: 1 },
  ],
  scatter: [
    { kind: "palm", count: 40, block: 1, scale: [0.8, 1.2] },
    { kind: "bush", count: 80, block: 0, scale: [0.6, 1.1] },
    { kind: "rock", count: 25, block: 1, scale: [0.7, 1.2] },
    { kind: "coral", count: 30, area: [8, 36, 26, 44], block: 1, scale: [0.5, 0.9] },
  ],
  landmarks: [
    { id: "lm_tha_bay_ferry", name: "Ferry Landing", kind: "camp", x: 10, y: 91, note: "The Port Merrow ferry ties up here; main camp of the bay." },
    { id: "lm_tha_bay_north_camp", name: "Reef Road Camp", kind: "camp", x: 40, y: 9, note: "Arrival from Coral Reach." },
    { id: "lm_tha_bay_crossroads", name: "Rim Crossroads", kind: "crossroads", x: 52, y: 36, note: "The rim road meets the reef road and the pilings path." },
    { id: "lm_tha_pumpworks", name: "Pumpworks", kind: "ruin", x: 104, y: 14, note: "Aethrion pressure pumps, still serviced by Brine Automatons." },
    { id: "lm_tha_kelp_beds", name: "Kelp Beds", kind: "farm", x: 18, y: 56, note: "Kelp Tenders in the west shallows." },
    { id: "lm_tha_paddles", name: "Barnacle Paddles", kind: "farm", x: 112, y: 80, note: "Kelp Tenders grown over the east tidewheels' paddles." },
    { id: "lm_tha_pilings", name: "Old Pilings", kind: "farm", x: 66, y: 16, note: "Brine Automatons patching the rotting quay." },
    { id: "lm_tha_bay_east", name: "Shoal Road", kind: "gate", x: 125, y: 55, note: "To Wreck Shoal (Lv47-52)." },
  ],
  safe_areas: [[4, 84, 14, 14], [32, 4, 16, 12], [118, 48, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "pumpworks", name: "Pumpworks", rects: [[84, 6, 40, 26]], species: [{ monster_id: "mob_0022", weight: 1 }], target_alive: 30, respawn_sec: [10, 20],
      design_note: "Brine Automatons round the pump house: constructs need room (~33 cells each) and the pump blocks the middle, so packs come round both sides." },
    { id: "kelp_beds", name: "Kelp Beds", rects: [[8, 38, 24, 40]], species: [{ monster_id: "mob_0062", weight: 1 }], target_alive: 35, respawn_sec: [7, 15],
      design_note: "Kelp Tenders among the west pools, straddling the rim road: assist means a careless walk pulls the bed, and supports heal each other, so focus fire matters." },
    { id: "barnacle_paddles", name: "Barnacle Paddles", rects: [[100, 66, 24, 32]], species: [{ monster_id: "mob_0062", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Kelp Tenders (Lv44) grown over the east tidewheels' paddles; the bay at their back means they can only be approached from the land side, and assist pulls the whole bed at once." },
    { id: "quay_pilings", name: "Old Pilings", rects: [[54, 6, 26, 24]], species: [{ monster_id: "mob_0022", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Brine Automatons patching the old quay timbers near the reef-road camp: a smaller construct pocket than the pumpworks, a second Aetherite source for players arriving from the reef." },
  ],
  npcs: [
    npc("npc_tha_tidewheel_scout", "Tidewheel Scout Brannoc", [13, 88], "E", "scout"),
    npc("npc_tha_tidewheel_medic", "Ferry Landing Medic", [8, 93], "N", "healer"),
  ],
};

const wreckShoal: MapDesign = {
  id: "tha_fld_04", name: "Wreck Shoal", type: "field", role: "Sandbars strewn with wrecks and a sunken Aethrion freighter: the Hullborer horde in every hull, buoy and driftwood bar.",
  levels: [47, 52], size: [150, 110], arrival: [10, 61], ground: "sand", theme: "sandbars between tidal channels, grounded hulls and a half-sunk freighter",
  border: { width: 4, kind: "water" },
  roads: [
    { points: [[0, 61], [20, 62], [44, 58]], width: 4, kind: "boardwalk" },
    { points: [[44, 58], [68, 56]], width: 4, kind: "bridge" },
    { points: [[68, 56], [86, 64], [110, 70], [121, 86], [121, 109]], width: 4, kind: "boardwalk" },
    { points: [[86, 64], [80, 30], [72, 14]], width: 3, kind: "boardwalk" },
    { points: [[20, 62], [22, 90]], width: 3, kind: "boardwalk" },
  ],
  blockers: [
    { kind: "water", shape: { poly: [[40, 4], [48, 4], [62, 50], [56, 106], [48, 106], [54, 50]] } }, // the deep channel
    { kind: "water", shape: { ellipse: [104, 38, 14, 9] } }, // the lagoon
    { kind: "ruin_wall", shape: { rect: [74, 84, 8, 2] } }, // hull ribs
    { kind: "ruin_wall", shape: { rect: [92, 76, 2, 8] } },
    { kind: "ruin_wall", shape: { rect: [24, 80, 2, 8] } },
  ],
  props: [
    { kind: "gear_ruin", x: 74, y: 14, block: 3, scale: 1.7 }, { kind: "brass_pipe", x: 82, y: 18, block: 0 }, { kind: "brass_pipe", x: 66, y: 10, block: 0 },
    { kind: "dock", x: 70, y: 78, block: 0, scale: 1.4 }, { kind: "dock", x: 90, y: 90, block: 0, scale: 1.4 }, { kind: "dock", x: 32, y: 92, block: 0, scale: 1.2 },
    { kind: "aether_pylon", x: 126, y: 14, block: 1 }, { kind: "aether_pylon", x: 138, y: 30, block: 1 }, { kind: "aether_pylon", x: 128, y: 42, block: 1 },
    { kind: "lattice_obelisk", x: 134, y: 20, block: 2 },
    { kind: "tent", x: 7, y: 56, block: 2 }, { kind: "tent", x: 125, y: 96, block: 2 },
    { kind: "crate", x: 84, y: 82, block: 1 }, { kind: "crate", x: 98, y: 86, block: 1 },
  ],
  scatter: [
    { kind: "coral", count: 40, block: 1, scale: [0.6, 1] },
    { kind: "rock", count: 30, block: 1, scale: [0.7, 1.2] },
    { kind: "crate", count: 15, area: [60, 70, 46, 28], block: 1 },
    { kind: "bush", count: 30, block: 0, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_tha_shoal_camp", name: "Shoal Camp", kind: "camp", x: 10, y: 61, note: "Arrival from Tidewheel Bay." },
    { id: "lm_tha_shoal_bridge", name: "Channel Bridge", kind: "crossroads", x: 56, y: 57, note: "The only crossing of the deep channel." },
    { id: "lm_tha_hulk_graveyard", name: "Hulk Graveyard", kind: "farm", x: 84, y: 84, note: "The Hullborer horde in the grounded wrecks." },
    { id: "lm_tha_freighter", name: "Sunken Freighter", kind: "ruin", x: 74, y: 14, note: "A half-sunk Aethrion freighter, its timbers riddled by Hullborers." },
    { id: "lm_tha_buoy_line", name: "Buoy Line", kind: "farm", x: 132, y: 28, note: "Hullborers bore into the buoys' timber floats." },
    { id: "lm_tha_drift_bar", name: "Drift Bar", kind: "farm", x: 26, y: 86, note: "Hullborers in the driftwood on the west sandbar." },
    { id: "lm_tha_shoal_south", name: "Flats Road", kind: "gate", x: 121, y: 100, note: "To Pearl Flats (Lv51-56)." },
  ],
  safe_areas: [[4, 54, 14, 14], [112, 94, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "hulk_graveyard", name: "Hulk Graveyard", rects: [[64, 72, 40, 24]], species: [{ monster_id: "mob_0063", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature horde: 40 assisting Hullborers among hull ribs, ~23 cells each. Assist empties a wreck at once; respawn is quick so the graveyard refills between trains." },
    { id: "salvage_field", name: "Sunken Freighter", rects: [[60, 6, 34, 22]], species: [{ monster_id: "mob_0063", weight: 1 }], target_alive: 25, respawn_sec: [10, 20],
      design_note: "Hullborers riddling the half-sunk freighter: a smaller assist swarm that boils out of the hull, away from the graveyard's crowds." },
    { id: "buoy_line", name: "Buoy Line", rects: [[120, 8, 26, 40]], species: [{ monster_id: "mob_0063", weight: 1 }], target_alive: 25, respawn_sec: [12, 24],
      design_note: "Hullborers in the timber floats of the relay buoys on the seaward bar; their shared tunnels (assist) make the whole line answer one pull." },
    { id: "drift_bar", name: "Drift Bar", rects: [[8, 74, 36, 26]], species: [{ monster_id: "mob_0063", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "West of the channel, close to camp: a quieter Hullborer pocket in the driftwood for small groups." },
  ],
  npcs: [npc("npc_tha_wreck_shoal_scout", "Salvage Scout Dunmore", [14, 57], "E", "scout")],
};

const stiltHouses: Prop[] = [[14, 40], [24, 50], [30, 38], [18, 58], [36, 54]].map(([x, y]) => ({ kind: "house" as const, x, y, block: 2, scale: 0.8 }));

const pearlFlats: MapDesign = {
  id: "tha_fld_05", name: "Pearl Flats", type: "field", role: "Mudflats and pearl beds under a relay mast: fleeing skates in the beds and ruins, the relay's guardians on the mast and the strand.",
  levels: [51, 56], size: [128, 120], arrival: [33, 9], ground: "shore", theme: "tidal mudflats and pearl beds fringed by mangroves, a relay mast and abandoned stilt houses",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[33, 0], [33, 20], [50, 30], [64, 56]], width: 4, kind: "boardwalk" },
    { points: [[64, 56], [90, 74], [110, 86], [127, 87]], width: 4, kind: "boardwalk" },
    { points: [[64, 56], [40, 62], [22, 90]], width: 3, kind: "boardwalk" },
    { points: [[64, 56], [100, 30]], width: 3, kind: "boardwalk" },
  ],
  blockers: [
    { kind: "water", shape: { ellipse: [60, 88, 6, 4] } }, // pearl-bed pools
    { kind: "water", shape: { ellipse: [74, 96, 5, 3] } },
    { kind: "water", shape: { ellipse: [96, 52, 7, 5] } },
    { kind: "water", shape: { ellipse: [16, 104, 8, 6] } },
    { kind: "forest", shape: { ellipse: [70, 20, 8, 6] } }, // mangrove island
  ],
  props: [
    ...stiltHouses,
    { kind: "lattice_obelisk", x: 100, y: 22, block: 2, scale: 1.6 }, // the relay mast
    { kind: "aether_pylon", x: 92, y: 16, block: 1 }, { kind: "aether_pylon", x: 110, y: 32, block: 1 },
    { kind: "dock", x: 20, y: 64, block: 0 },
    { kind: "tent", x: 37, y: 6, block: 2 }, { kind: "tent", x: 121, y: 82, block: 2 },
    { kind: "rune_stone", x: 58, y: 50, block: 1 },
  ],
  scatter: [
    { kind: "bush", count: 120, block: 0, scale: [0.6, 1.1] },
    { kind: "palm", count: 20, block: 1, scale: [0.8, 1.2] },
    { kind: "rock", count: 25, block: 1, scale: [0.6, 1] },
    { kind: "coral", count: 15, area: [44, 74, 40, 30], block: 0, scale: [0.4, 0.7] },
  ],
  landmarks: [
    { id: "lm_tha_flats_camp", name: "Mangrove Camp", kind: "camp", x: 33, y: 9, note: "Arrival from Wreck Shoal." },
    { id: "lm_tha_flats_crossroads", name: "Flats Crossroads", kind: "crossroads", x: 64, y: 56, note: "Boardwalks fan out across the mud." },
    { id: "lm_tha_pearl_beds", name: "Pearl Beds", kind: "farm", x: 64, y: 90, note: "Pearl Skates among the oyster pools." },
    { id: "lm_tha_relay_mast", name: "Relay Mast", kind: "ruin", x: 100, y: 22, note: "A surface mast of the drowned relay, still pinging." },
    { id: "lm_tha_turtle_strand", name: "South Strand", kind: "farm", x: 102, y: 106, note: "Relay Guardians walk the buoy cables here." },
    { id: "lm_tha_stilt_ruins", name: "Stilt Ruins", kind: "ruin", x: 24, y: 48, note: "Abandoned pearl-divers' houses; skates bury in the mud beneath." },
    { id: "lm_tha_flats_east", name: "Headland Road", kind: "gate", x: 117, y: 87, note: "To Stormbreak (Lv55-60)." },
  ],
  safe_areas: [[26, 4, 16, 12], [110, 80, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "pearl_beds", name: "Pearl Beds", rects: [[44, 74, 40, 30]], species: [{ monster_id: "mob_0064", weight: 1 }], target_alive: 40, respawn_sec: [6, 14],
      design_note: "Fleeing skates among oyster pools: the pools pen them in, so a player who herds from the open side gets them bunched for an AoE." },
    { id: "relay_mast", name: "Relay Mast", rects: [[84, 10, 34, 30]], species: [{ monster_id: "mob_0023", weight: 1 }], target_alive: 25, respawn_sec: [12, 24],
      design_note: "Relay Guardians (Lv52, low end of the band) guard the mast: the construct farm of the flats and a steady Aetherite source." },
    { id: "south_strand", name: "South Strand", rects: [[88, 98, 30, 16]], species: [{ monster_id: "mob_0023", weight: 1 }], target_alive: 25, respawn_sec: [10, 20],
      design_note: "Relay Guardians (Lv52) walking the buoy cables on the south strand, tucked against the mangroves so a pull comes from one direction; shared sonar (assist) wakes the whole cable." },
    { id: "stilt_ruins", name: "Stilt Ruins", rects: [[8, 30, 34, 36]], species: [{ monster_id: "mob_0064", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Skates (Lv53) buried in the mud under the stilt houses: fleeing targets that scatter through the pilings, an easy herding pocket next to the arrival camp." },
  ],
  npcs: [npc("npc_tha_pearl_flats_scout", "Pearl-Diver Scout Oona", [29, 12], "S", "scout")],
};

const masts: Prop[] = [[20, 20], [36, 30], [16, 34], [40, 16]].map(([x, y]) => ({ kind: "aether_pylon" as const, x, y, block: 1, scale: 1.6 }));

const stormbreak: MapDesign = {
  id: "tha_fld_06", name: "Stormbreak", type: "field", role: "The storm-lashed headland at the region's edge: Squall Rays on the lightning masts, turtles at the vents and the ruined breakwater, and the intake hatch down to the Drowned Relay.",
  levels: [55, 60], size: [116, 148], arrival: [10, 123], ground: "stone", theme: "a storm-lashed rocky headland with Aethrion lightning masts and a ruined breakwater",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[0, 123], [20, 122], [40, 112], [58, 96]], width: 4, kind: "stone" },
    { points: [[58, 96], [60, 70], [52, 44], [57, 20], [57, 0]], width: 4, kind: "stone" },
    { points: [[58, 96], [84, 104]], width: 3, kind: "stone" },
    { points: [[52, 44], [24, 36]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { poly: [[94, 4], [112, 4], [112, 144], [100, 144], [100, 120], [104, 80], [94, 50]] } }, // the sea
    { kind: "water", shape: { ellipse: [36, 78, 5, 4] } }, // storm pool
    { kind: "ruin_wall", shape: { rect: [88, 112, 10, 2] } }, // broken breakwater
    { kind: "ruin_wall", shape: { rect: [92, 120, 2, 10] } },
    { kind: "rock", shape: { ellipse: [20, 92, 6, 4] } },
    { kind: "cliff", shape: { poly: [[60, 120], [84, 116], [90, 140], [64, 142]] } },
  ],
  props: [
    ...masts,
    { kind: "lattice_obelisk", x: 28, y: 24, block: 2, scale: 1.5 },
    { kind: "cave_mouth", x: 60, y: 3, block: 0, scale: 1.3 }, // the intake hatch
    { kind: "brass_pipe", x: 78, y: 30, block: 0 }, { kind: "brass_pipe", x: 84, y: 20, block: 0 }, { kind: "gear_ruin", x: 82, y: 40, block: 2 },
    { kind: "tent", x: 8, y: 118, block: 2 }, { kind: "tent", x: 63, y: 10, block: 2 },
  ],
  scatter: [
    { kind: "rock", count: 60, block: 1, scale: [0.8, 1.4] },
    { kind: "bush", count: 60, block: 0, scale: [0.6, 1] },
    { kind: "dead_tree", count: 15, block: 1, scale: [0.7, 1.1] },
  ],
  landmarks: [
    { id: "lm_tha_storm_camp", name: "Headland Camp", kind: "camp", x: 10, y: 123, note: "Arrival from Pearl Flats." },
    { id: "lm_tha_storm_fork", name: "Breakwater Fork", kind: "crossroads", x: 58, y: 96, note: "The headland road splits for the breakwater." },
    { id: "lm_tha_lightning_masts", name: "Lightning Masts", kind: "farm", x: 28, y: 26, note: "Squall Rays charge on the conductors." },
    { id: "lm_tha_intake_vents", name: "Intake Vents", kind: "farm", x: 82, y: 28, note: "Thunderhull Turtles bask in the warm vent outflow." },
    { id: "lm_tha_breakwater", name: "Ruined Breakwater", kind: "farm", x: 78, y: 80, note: "Thunderhull Turtles shelter behind it." },
    { id: "lm_tha_storm_flats", name: "Storm Flats", kind: "farm", x: 36, y: 80, note: "Rays and turtles round the storm pool." },
    { id: "lm_tha_intake_hatch", name: "Intake Hatch", kind: "gate", x: 57, y: 6, note: "Shaft down to the Drowned Relay (Lv59-65)." },
  ],
  safe_areas: [[4, 116, 14, 14], [50, 4, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "lightning_masts", name: "Lightning Masts", rects: [[10, 12, 36, 30]], species: [{ monster_id: "mob_0066", weight: 1 }], target_alive: 35, respawn_sec: [7, 15],
      design_note: "Aggressive ranged rays circling the masts: the masts block, so players fight among them and pull rays into melee range one ring at a time." },
    { id: "intake_vents", name: "Intake Vents", rects: [[70, 14, 22, 30]], species: [{ monster_id: "mob_0065", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Thunderhull Turtles (Lv56) basking in the warm vent outflow beside the hatch camp: assist means the vent herd moves as one, a tanky last stop before going down." },
    { id: "breakwater", name: "Ruined Breakwater", rects: [[66, 60, 26, 40]], species: [{ monster_id: "mob_0065", weight: 1 }], target_alive: 30, respawn_sec: [10, 20],
      design_note: "Turtle herd (Lv56, low end) in the lee of the breakwater, the sea at their backs: assist means the herd moves as one." },
    { id: "storm_flats", name: "Storm Flats", rects: [[20, 60, 32, 40]], species: [{ monster_id: "mob_0066", weight: 50 }, { monster_id: "mob_0065", weight: 50 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Storm-wrack mix of rays and turtles round the storm pool: ranged and bruiser behaviours in one pull, the region's final mixed-AI test." },
  ],
  npcs: [
    npc("npc_tha_stormbreak_scout", "Stormbreak Scout Tallis", [13, 118], "E", "scout"),
    npc("npc_tha_stormbreak_medic", "Headland Medic", [16, 127], "N", "healer"),
    npc("npc_tha_relay_hatch_keeper", "Relay Hatch Keeper", [52, 12], "N", "guard"),
  ],
};

const drownedRelay: MapDesign = {
  id: "tha_dun_01", name: "Drowned Relay", type: "dungeon", role: "Thalassia's dungeon: a flooded Aethrion signal station under the seabed, round the Signalmind's Sonar Chamber.",
  levels: [59, 65], size: [132, 108], arrival: [13, 51], ground: "metal", theme: "flooded brass pressure halls and a sonar chamber under the sea",
  solid: true,
  carve: [
    { rect: [2, 42, 22, 20] }, // hatch lock
    { ellipse: [46, 30, 18, 14] }, // pressure hall
    { rect: [36, 64, 40, 26] }, // flooded gallery
    { ellipse: [94, 80, 14, 12] }, // pump ring
    { ellipse: [108, 30, 14, 13] }, // sonar chamber
  ],
  roads: [
    { points: [[2, 51], [24, 51], [46, 30]], width: 4, kind: "brass" },
    { points: [[46, 30], [80, 28], [108, 30]], width: 4, kind: "brass" },
    { points: [[24, 51], [40, 64], [56, 76]], width: 4, kind: "brass" },
    { points: [[56, 76], [92, 78]], width: 4, kind: "brass" },
    { points: [[92, 78], [106, 56], [108, 30]], width: 4, kind: "brass" },
  ],
  blockers: [
    { kind: "water", shape: { ellipse: [56, 84, 7, 3] } },
    { kind: "machine", shape: { rect: [96, 82, 5, 5] } },
  ],
  props: [
    { kind: "tent", x: 10, y: 46, block: 2 },
    { kind: "lattice_obelisk", x: 108, y: 30, block: 2, scale: 1.5 }, // the sonar array
    { kind: "brass_pipe", x: 40, y: 22, block: 0 }, { kind: "brass_pipe", x: 70, y: 82, block: 0 }, { kind: "brass_pipe", x: 86, y: 74, block: 0 },
    { kind: "gear_ruin", x: 58, y: 38, block: 2 },
    { kind: "waterwheel", x: 94, y: 70, block: 0, scale: 1.2 },
  ],
  scatter: [
    { kind: "coral", count: 30, block: 1, scale: [0.6, 1.1] },
    { kind: "crystal", count: 15, block: 1, scale: [0.6, 1] },
    { kind: "crate", count: 10, block: 1 },
  ],
  landmarks: [
    { id: "lm_tha_relay_lock", name: "Hatch Lock", kind: "camp", x: 13, y: 51, note: "Arrival; the diver takes you back up." },
    { id: "lm_tha_pressure_hall", name: "Pressure Hall", kind: "farm", x: 46, y: 30, note: "Pressure Drone nest." },
    { id: "lm_tha_flooded_gallery", name: "Flooded Gallery", kind: "farm", x: 56, y: 76, note: "Gloom Medusae drift over the flood." },
    { id: "lm_tha_pump_ring", name: "Pump Ring", kind: "ruin", x: 94, y: 80, note: "The relay's last working pump; drones and medusae together." },
    { id: "lm_tha_sonar_chamber", name: "Sonar Chamber", kind: "boss_arena", x: 108, y: 30, note: "The Drowned Signalmind." },
  ],
  safe_areas: [[8, 44, 14, 14]],
  horde: { min_alive: 60, max_alive: 120 },
  pockets: [
    { id: "pressure_hall", name: "Pressure Hall", rects: [[32, 20, 28, 20]], species: [{ monster_id: "mob_0067", weight: 1 }], target_alive: 40, respawn_sec: [6, 14],
      design_note: "The densest drone nest (~12 cells each) in a round hall players can kite around: the dungeon's main AoE farm." },
    { id: "flooded_gallery", name: "Flooded Gallery", rects: [[38, 66, 36, 22]], species: [{ monster_id: "mob_0068", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Medusae over a flooded floor: supports alone are slow to kill but safe, a breather between drone pulls." },
    { id: "pump_ring", name: "Pump Ring", rects: [[84, 70, 20, 18]], species: [{ monster_id: "mob_0067", weight: 50 }, { monster_id: "mob_0068", weight: 50 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Drones shielded by medusae on the way to the boss: the real test of focusing supports first." },
    { id: "sonar_chamber", name: "Sonar Chamber", rects: [[102, 24, 12, 12]], species: [{ monster_id: "mob_0069", weight: 1 }], target_alive: 1, respawn_sec: [300, 420],
      design_note: "Region boss, 5-7 minute respawn, alone in its chamber." },
  ],
  npcs: [npc("npc_tha_relay_diver", "Relay Hatch Diver", [17, 46], "S", "teleporter", { destinations: [["tha_town_01", 0], ["tha_fld_06", 0]] })],
};

// --- dialogue ------------------------------------------------------------------------

const dialogues: DialogueDef[] = [
  ["npc_tha_guild_registrar", "Merrow chapter of the Wayfarer Guild. Out here the sea took the Aethrion machines, and the sea gives them back broken.", "Start on Saltwind Shore through the East Gate. The Tidehoppers will show you how thick the packs run in Thalassia."],
  ["npc_tha_merchant", "Rations, tonics, the same Guild prices as the mainland, plus the cost of shipping them here.", "Bring me what the reef gives you. Merchants in Vaelspire pay well for anything from the sea."],
  ["npc_tha_healer", "Salt in a wound stings less than a Polyp barb. Hold still.", "If you're heading for the reef, bring more tonics than you think you need."],
  ["npc_tha_teleporter", "The lattice runs between every camp on the islands. The tide doesn't bother it.", "Duskhar and Vaelspire are further, and cost more. Crystal charge isn't cheap out here."],
  ["npc_tha_craftsman", "Kelp, hopper tendon, medusa jelly: all useful, once you know how to boil it.", "I make rations and tonics from what you bring. Cheaper than the merchant, if you do the gathering."],
  ["npc_tha_east_gate_guard", "East Gate. Saltwind Shore is past the dunes: hoppers at the tidepools, gulls on the cliffs.", "The crabs on the wrack line bite back. Don't wander into them looking up at the gulls."],
  ["npc_tha_harbourmaster", "Ferry to Tidewheel Bay leaves from the end of the pier. Walk on, the pilot knows the way.", "The bay's pumps still run, and so do the automatons that maintain them. Kelp tenders in the shallows, too."],
  ["npc_tha_saltwind_scout", "Tidehoppers won't trouble you. The Gullwings will, once you're under the cliffs.", "The reef path is past the east camp. Coral Reach starts where the sand turns pink."],
  ["npc_tha_coral_reach_scout", "Stay on the boardwalks where you can; the channel runs deep in the middle.", "Spitters behind the coral heads will pick you apart. Draw them round to you."],
  ["npc_tha_tidewheel_scout", "Those wheels have turned for a thousand years and the automatons won't let anyone stop them.", "Kill the kelp tenders first. They knit the others back together."],
  ["npc_tha_tidewheel_medic", "Off the ferry and straight into the kelp? Sit, let me look at you.", "The bay air's good for you. The pumps' brine spray isn't."],
  ["npc_tha_wreck_shoal_scout", "Every hull out there is full of borers. Hit one and the whole wreck comes out.", "The freighter's no better. The borers have eaten clean through to the cargo hold."],
  ["npc_tha_pearl_flats_scout", "The skates run when you hurt them. Come at them from the open mud and they'll pile up against the pools.", "That mast still pings something under the sea. The guardians around it don't like visitors."],
  ["npc_tha_stormbreak_scout", "Rays ride the storm round the masts. When the wind turns, so do they.", "The turtles behind the breakwater move as a herd. Take them all or none."],
  ["npc_tha_stormbreak_medic", "The lightning out here isn't natural. It comes up from the relay.", "Rest before you go to the hatch. There's no medic down there."],
  ["npc_tha_relay_hatch_keeper", "This hatch goes down to the Drowned Relay. The drones down there swarm the halls when the pumps surge.", "Something below is still sending. If you can stop it, the machines up here might calm."],
  ["npc_tha_relay_diver", "Going up? I can take you to the headland or all the way back to Merrow.", "Mind the gallery. The jellies shield the drones."],
].map(([npcId, ...lines]) => ({ id: npcId.replace(/^npc_/, "dlg_"), npc_id: npcId, lines }));

// --- the region ------------------------------------------------------------------------

export const thalassia: RegionDesign = {
  region: {
    id: "tha", name: "Thalassia", capital: "Port Merrow", town_map_id: "tha_town_01", dungeon_map_id: "tha_dun_01", level_range: [35, 65],
    theme: "Islands, harbours, tidewheels and drowned stations: Aethrion's sea-works, still turning under the waves.",
    ecology: "Shore animals, gull flocks and coral crabs on the beaches, spitting coral on the reef, kelp and pump constructs round the tidewheels, borers in the wrecks, skates and relay guardians on the flats, storm-riders and turtles on the headland, and the relay's drones and jellies below.",
    palette: { grass: "#7fb3a0", dirt: "#d8c79a", accent: "#3fd0e0", fog: "#16303a" },
  },
  maps: [portMerrow, saltwind, coralReach, tidewheelBay, wreckShoal, pearlFlats, stormbreak, drownedRelay],
  links: [
    { label: "Port Merrow East Gate ⇄ Saltwind Shore", a: { map: "tha_town_01", trigger: [133, 47, 3, 7], landing: [126, 50] }, b: { map: "tha_fld_01", trigger: [0, 37, 3, 7], landing: [10, 40] } },
    { label: "Port Merrow Ferry ⇄ Tidewheel Bay", a: { map: "tha_town_01", trigger: [62, 117, 4, 3], landing: [64, 108] }, b: { map: "tha_fld_03", trigger: [0, 88, 3, 7], landing: [10, 91] } },
    { label: "Saltwind Shore ⇄ Coral Reach", a: { map: "tha_fld_01", trigger: [141, 25, 3, 7], landing: [134, 28] }, b: { map: "tha_fld_02", trigger: [0, 101, 3, 7], landing: [10, 104] } },
    { label: "Coral Reach ⇄ Tidewheel Bay", a: { map: "tha_fld_02", trigger: [81, 133, 7, 3], landing: [84, 126] }, b: { map: "tha_fld_03", trigger: [37, 0, 7, 3], landing: [40, 9] } },
    { label: "Tidewheel Bay ⇄ Wreck Shoal", a: { map: "tha_fld_03", trigger: [133, 52, 3, 7], landing: [125, 55] }, b: { map: "tha_fld_04", trigger: [0, 58, 3, 7], landing: [10, 61] } },
    { label: "Wreck Shoal ⇄ Pearl Flats", a: { map: "tha_fld_04", trigger: [118, 107, 7, 3], landing: [121, 100] }, b: { map: "tha_fld_05", trigger: [30, 0, 7, 3], landing: [33, 9] } },
    { label: "Pearl Flats ⇄ Stormbreak", a: { map: "tha_fld_05", trigger: [125, 84, 3, 7], landing: [117, 87] }, b: { map: "tha_fld_06", trigger: [0, 120, 3, 7], landing: [10, 123] } },
    { label: "Stormbreak ⇄ Drowned Relay", a: { map: "tha_fld_06", trigger: [54, 0, 7, 3], landing: [57, 9] }, b: { map: "tha_dun_01", trigger: [2, 48, 3, 6], landing: [13, 51] } },
  ],
  monsters,
  materials,
  items,
  shops: [{ id: "shop_tha_supply", npc_id: "npc_tha_merchant", items: [{ item_id: "itm_0075", base_price: 8 }, { item_id: "itm_0076", base_price: 25 }, { item_id: "itm_0077", base_price: 30 }] }],
  recipes,
  quests,
  dialogues,
};
