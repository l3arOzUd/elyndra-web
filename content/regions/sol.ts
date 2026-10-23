// SOLENIA — the desert of brass observatories and ancient canals (Lv 25-55),
// following the Lumeris conventions.
//
// Theme: saffron dunes over an Aethrion solar network. Observatories, mirrors
// and sundials once focused sunlight into the Heliostat Vault; canals and an
// aqueduct carried water across the sand. The Sundering left the machines
// tracking a sun nobody needs them to follow.
//
// Level ladder: six fields climbing 4 levels at a time (25 → 50) and the
// Heliostat Vault on top (50-55). The region is 30 levels deep over 7 maps,
// so the step is 4 rather than Lumeris's 3. Each field's species sit within
// ±2 of its band (the elite and the boss within ±4).
//
// Geography (north up):
//
//   Glass Flats ── Sun Dial ── Dust Aqueduct
//        │                          │
//   Caravan Verge ─┐          Buried Causeway
//        │         │                │
//   Saffron Dunes ── Duskhar   Heliostat Vault (below the causeway)
//
// Duskhar's West Gate opens on the Saffron Dunes and its North Gate on the
// caravan road into Caravan Verge. From the Verge the road climbs north to the
// Glass Flats, runs east across the Sun Dial to the Dust Aqueduct, follows the
// aqueduct south onto the Buried Causeway and ends at the Vault's sealed door.

import type { DialogueDef, ItemDef, NpcDef, Prop, QuestDef, RecipeDef } from "../../src/data/schema";
import { expToNext, hourlyIncome } from "../model";
import type { MapDesign, RegionDesign } from "../types";

const questExp = (level: number, share: number) => Math.round(expToNext(level) * share);
/** Quest coin is priced as minutes of farming income at that level (Lumeris pays ~1.5-3 min). */
const questGold = (level: number, minutes: number) => Math.round((hourlyIncome(level) * minutes) / 60 / 50) * 50;

// --- monsters ------------------------------------------------------------------

const monsters: RegionDesign["monsters"] = [
  {
    id: "mob_0016", name: "Sandcoil", level: 26, archetype: "swarm", family: "reptile", element: "fire", behavior: "passive",
    mods: { def: 1.3, speed: 1.1 }, why: "Sand-grain scales (+30% DEF); sluggish in the midday heat (10% slower). Passive: Solenia's welcome herd, gathered on open dunes.",
    drops: { common: "itm_0031", uncommon: "itm_0032" },
    ecology: "Sand serpents that bask coiled on the warm dune crests of the Saffron Dunes and burrow along the buried Aethrion pipes for their heat; they only bite if dug up.",
    art_brief: "A thick, short serpent coiled like a spring, scales the colour and grain of saffron sand, ember-orange belly, heat shimmer above it.",
  },
  {
    id: "mob_0050", name: "Ochre Jackal", level: 28, archetype: "swarm", family: "beast", element: "earth", behavior: "assist",
    mods: { speed: 0.8, hp: 0.9 }, why: "Lean desert runners: quick (20% faster) and thin (-10% HP). Assist: the pack answers one yelp, so a pull is the whole draw.",
    drops: { common: "itm_0130", uncommon: "itm_0131" },
    ecology: "Pack hunters that den by the Saffron oasis and along the buried pipeline, living off caravan scraps and Sandcoil eggs.",
    art_brief: "A rangy jackal with ochre fur, huge ears, a dark stripe down the spine and a brass tag from a long-gone caravan on its collar.",
  },
  {
    id: "mob_0017", name: "Glass Scarab", level: 30, archetype: "swarm", family: "insect", element: "fire", behavior: "passive",
    mods: { def: 1.4, attack_speed: 0.9 }, why: "A shell of fused desert glass (+40% DEF) and quick mandibles (10% faster attacks). The first aggressive horde in Solenia; its shell is why AoE beats single hits here.",
    drops: { common: "itm_0033", uncommon: "itm_0034", rare: "itm_0148" },
    ecology: "Beetles that roll lightning-glass into their shells; they swarm the dry washes of Caravan Verge and the broken walls of its caravanserai. Old shells sometimes set into Sunfire Glass.",
    art_brief: "A dog-sized scarab whose shell is clear amber glass with a glowing ember core showing through, legs of dark chitin.",
  },
  {
    id: "mob_0051", name: "Brass Kite", level: 32, archetype: "ranged", family: "construct", element: "wind", behavior: "aggressive",
    mods: { range: 6, speed: 0.8, hp: 0.85 }, why: "An Aethrion survey kite: it circles and fires sun-bolts from 6 cells (+1 range), flies fast (20% faster) and is light brass foil (-15% HP). Solenia's ranged lesson.",
    drops: { common: "itm_0132", uncommon: "itm_0133" },
    ecology: "Survey kites that still map the caravan routes; they circle the heights and the old checkpoint of Caravan Verge, firing on anything that crosses their survey lines.",
    art_brief: "A diamond-shaped kite of brass foil and cloth on a gear-driven frame, a single focusing lens in its nose, ribbon tails streaming.",
  },
  {
    id: "mob_0018", name: "Dune Sentry", level: 35, archetype: "construct", family: "construct", element: "fire", behavior: "aggressive",
    mods: { def: 1.2, hp: 1.1, speed: 1.15 }, why: "Sandstone sentries: thick blocks (+20% DEF, +10% HP), grinding gait (15% slower). The first construct horde: slow trains that need AoE.",
    drops: { common: "itm_0035", uncommon: "itm_0036" },
    ecology: "Sandstone sentries that guarded the glass works and the heliograph towers; they still walk their old lines across the Glass Flats, from the glass works to the fused scar.",
    art_brief: "A blocky humanoid of carved sandstone with brass bands at the joints, a slit visor glowing orange, sand pouring from its cracks.",
  },
  {
    id: "mob_0052", name: "Glasstail Basilisk", level: 37, archetype: "bruiser", family: "reptile", element: "fire", behavior: "assist",
    mods: { atk: 1.15, attack_speed: 1.1 }, why: "Heavy glass-tail swipes: hard (+15% ATK) and slow to wind up (10% slower attacks). Assist packs on the open glass make it the region's bruiser lesson.",
    drops: { common: "itm_0134", uncommon: "itm_0135", rare: "itm_0148" },
    ecology: "Lizards that lick lightning-glass and grow it along their tails; they bask in packs on the open glass of the Glass Flats, round its mirrors and in its fused scar. The tail tip sometimes hardens into Sunfire Glass.",
    art_brief: "A low, heavy basilisk with a tail ending in a club of glowing glass, ridged sandy scales, a frilled crest that flares orange.",
  },
  {
    id: "mob_0053", name: "Gnomon Acolyte", level: 39, archetype: "support", family: "construct", element: "fire", behavior: "assist",
    mods: { range: 5, hp: 0.9 }, why: "A light maintenance automaton (-10% HP) that focuses sunlight from 5 cells (+1 range). It stands behind the Wardens; kill it first or the pack keeps coming.",
    drops: { common: "itm_0136", uncommon: "itm_0137" },
    ecology: "Robed brass automata that recalibrate the Sun Dial and tend the broken sentries in its graveyard; they move with the machines they tend and rush to any that are attacked.",
    art_brief: "A slim brass automaton in sun-bleached robes, a gnomon-shaped crest on its head, mirror-plate hands that catch the light.",
  },
  {
    id: "mob_0019", name: "Sun Warden", level: 42, archetype: "construct", family: "construct", element: "fire", behavior: "aggressive",
    mods: { atk: 1.15, def: 1.15, speed: 1.1 }, why: "The solar ring on its back flares on each blow (+15% ATK); bronze plate (+15% DEF); heavy (10% slower). The Sun Dial's signature construct.",
    drops: { common: "itm_0037", uncommon: "itm_0038" },
    ecology: "Guardians of the solar ring network; they patrol the face of the Sun Dial and the causeway on its eastern approach.",
    art_brief: "A tall bronze guardian with a halo-ring of sun mirrors on its back, a faceless polished face, a long spear-gnomon.",
  },
  {
    id: "mob_0054", name: "Canal Strider", level: 44, archetype: "swarm", family: "insect", element: "water", behavior: "passive",
    mods: { hp: 0.8, atk: 0.8, speed: 0.7 }, why: "A long-legged water-skater: frail (-20% HP, -20% ATK) and very fast (30% faster), so it skates away when hit. Herd them against the canal walls.",
    drops: { common: "itm_0138", uncommon: "itm_0139" },
    ecology: "Skaters that live on the last water in the Dust Aqueduct: its channel, its sluices and its cistern; they scatter at any threat.",
    art_brief: "A water-strider the size of a pony, stilt legs tipped with silver pads, a slim teal body and silt-pearl eyes.",
  },
  {
    id: "mob_0055", name: "Dust Revenant", level: 47, archetype: "swarm", family: "spirit", element: "shadow", behavior: "aggressive",
    mods: { hp: 0.9, atk: 1.2, speed: 0.9 }, why: "Dry wrappings over nothing (-10% HP), a draining touch (+20% ATK), drifting quickly (10% faster). The late-region aggressive horde.",
    drops: { common: "itm_0140", uncommon: "itm_0141" },
    ecology: "The wrapped shades of Aethrion surveyors who died sealing the Vault; they walk the causeway they built and escort the lens array before the Vault door.",
    art_brief: "A floating figure in sand-coloured burial wraps trailing dust, an empty hood lit by a dim surveyor's lamp held in a bony hand.",
  },
  {
    id: "mob_0056", name: "Sand-buried Colossus", level: 49, archetype: "elite", family: "construct", element: "earth", behavior: "aggressive",
    mods: { hp: 1.2, speed: 1.3, atk: 0.9 }, why: "Elite: a half-buried giant, huge (+20% HP), dragging itself through sand (30% slower), its blows blunted by grit (-10% ATK). Three lie in the Colossus Bed; a quest target before the Vault.",
    drops: { common: "itm_0142", uncommon: "itm_0143", extra: [{ item_id: "itm_0073", rate_bp: 1500 }] },
    ecology: "Causeway builders, buried to the chest when the dunes moved; three still dig themselves free in the Colossus Bed beside the Buried Causeway. Their gear-hearts run on Aetherite.",
    art_brief: "A giant sandstone-and-brass figure buried to the waist, one arm free and dragging, a cracked sun-disc face glowing orange.",
  },
  {
    id: "mob_0057", name: "Prism Lens-drone", level: 50, archetype: "ranged", family: "construct", element: "fire", behavior: "aggressive",
    mods: { range: 7, hp: 0.85, atk: 1.1 }, why: "A hovering lens that fires focused sunlight from 7 cells (+2 range), hot (+10% ATK) and fragile (-15% HP). It outranges every earlier ranged mob: pull it round corners.",
    drops: { common: "itm_0144", uncommon: "itm_0145", rare: "itm_0148" },
    ecology: "Focusing drones from the Heliostat Vault; they guard the lens array outside its door and hover over the Buried Causeway's seep sinks. Their lenses can fuse sand into Sunfire Glass.",
    art_brief: "A floating ring of brass holding a large prism, three small fins, a beam of orange light idling from its centre.",
  },
  {
    id: "mob_0058", name: "Vault Mirrorguard", level: 53, archetype: "construct", family: "construct", element: "earth", behavior: "assist",
    mods: { def: 1.3, hp: 0.95 }, why: "Polished mirror plate turns blows (+30% DEF) over a lighter frame (-5% HP). Assist: the foundry answers as one.",
    drops: { common: "itm_0146", uncommon: "itm_0147" },
    ecology: "The Vault's guards, built to keep its mirrors aligned; they hold the Mirror Gallery, the Lens Foundry and the Shaft of Noon.",
    art_brief: "A knight-shaped construct plated in polished mirror bronze, a round shield that is a heliostat mirror, a visor like a lens.",
  },
  {
    id: "mob_0059", name: "Heliostat Sovereign", level: 55, archetype: "boss", family: "construct", element: "fire", behavior: "aggressive",
    mods: { range: 4, attack_speed: 1.1 }, why: "Region boss: it attacks with focused sunbeams that reach 4 cells (+2 range) but take longer to charge (10% slower attacks).",
    drops: { common: "itm_0146", uncommon: "itm_0147", rare: "itm_0149", extra: [{ item_id: "itm_0073", rate_bp: 10000, qty: [4, 6] }, { item_id: "itm_0148", rate_bp: 2500 }] },
    ecology: "The Vault's controller: an Aethrion mind built to aim every mirror in Solenia at one point. It still focuses the desert's sun into the Heliostat Core, which is why Solenia is burning.",
    art_brief: "A colossal throne-machine of brass rings and mirrors around a burning sun-core, arms of articulated mirror panels, a crown of lenses.",
  },
];

// --- items -----------------------------------------------------------------------

const materials: RegionDesign["materials"] = [
  { id: "itm_0031", name: "Sandcoil Fragment", level: 26, tier: "common", description: "A gritty scale from a Sandcoil, warm to the touch." },
  { id: "itm_0032", name: "Sandcoil Core", level: 26, tier: "uncommon", description: "The ember-bright gland that keeps a Sandcoil warm at night." },
  { id: "itm_0033", name: "Glass Scarab Fragment", level: 30, tier: "common", description: "A chip of amber-glass shell." },
  { id: "itm_0034", name: "Glass Scarab Core", level: 30, tier: "uncommon", description: "The glowing ember a Glass Scarab rolls its glass around." },
  { id: "itm_0035", name: "Dune Sentry Fragment", level: 35, tier: "common", description: "A carved sandstone block, brass band still attached." },
  { id: "itm_0036", name: "Dune Sentry Core", level: 35, tier: "uncommon", description: "A Sentry's visor-lamp, still glowing orange." },
  { id: "itm_0037", name: "Sun Warden Fragment", level: 42, tier: "common", description: "A bronze plate from a Sun Warden, sun-hot." },
  { id: "itm_0038", name: "Sun Warden Core", level: 42, tier: "uncommon", description: "One mirror from a Warden's solar ring." },
  { id: "itm_0130", name: "Ochre Pelt", level: 28, tier: "common", description: "A dusty jackal pelt. Tonic makers render it for oil." },
  { id: "itm_0131", name: "Caravan Tag", level: 28, tier: "uncommon", description: "A brass tag from a long-lost caravan, worn by a jackal. Collectors pay for them." },
  { id: "itm_0132", name: "Kite Foil", level: 32, tier: "common", description: "A sheet of brass foil from a Brass Kite's wing." },
  { id: "itm_0133", name: "Survey Lens", level: 32, tier: "uncommon", description: "A Brass Kite's nose lens, still focused." },
  { id: "itm_0134", name: "Basilisk Scale", level: 37, tier: "common", description: "A ridged, sun-baked basilisk scale." },
  { id: "itm_0135", name: "Glasstail Club", level: 37, tier: "uncommon", description: "The glowing glass club from a basilisk's tail." },
  { id: "itm_0136", name: "Gnomon Wire", level: 39, tier: "common", description: "Fine brass wire from an Acolyte's calibrating arms." },
  { id: "itm_0137", name: "Mirror Palm", level: 39, tier: "uncommon", description: "An Acolyte's mirror-plate hand." },
  { id: "itm_0138", name: "Strider Leg", level: 44, tier: "common", description: "A long, hollow Canal Strider leg." },
  { id: "itm_0139", name: "Silt Pearl", level: 44, tier: "uncommon", description: "A pearl a Strider grows from canal silt." },
  { id: "itm_0140", name: "Grave Wrap", level: 47, tier: "common", description: "A strip of a Revenant's burial wrapping." },
  { id: "itm_0141", name: "Surveyor's Lamp", level: 47, tier: "uncommon", description: "The dim lamp a Dust Revenant carries. It never goes out." },
  { id: "itm_0142", name: "Colossus Sandstone", level: 49, tier: "common", description: "A slab of the Colossus's body, carved with causeway marks." },
  { id: "itm_0143", name: "Colossus Gear-Heart", level: 49, tier: "uncommon", description: "The gear that drives a Colossus, big as a shield." },
  { id: "itm_0144", name: "Prism Shard", level: 50, tier: "common", description: "A splinter of a Lens-drone's prism." },
  { id: "itm_0145", name: "Focusing Lens", level: 50, tier: "uncommon", description: "A whole Lens-drone prism, focused to a pinpoint." },
  { id: "itm_0146", name: "Mirror Plate", level: 53, tier: "common", description: "A polished mirror-bronze plate from a Mirrorguard." },
  { id: "itm_0147", name: "Mirrorguard Gimbal", level: 53, tier: "uncommon", description: "The gimbal that aims a Mirrorguard's shield-mirror." },
  { id: "itm_0148", name: "Sunfire Glass", level: 39, tier: "rare", description: "Desert glass that trapped a bolt of focused sunlight; it glows by itself. Solenia's prize: Glass Scarabs, Basilisks and Lens-drones carry it." },
  { id: "itm_0149", name: "Sovereign's Crown Lens", level: 55, tier: "rare", description: "The master lens from the Heliostat Sovereign's crown." },
];

const items: ItemDef[] = [
  { id: "itm_0150", name: "Heliostat Key Prism", category: "quest", rarity: "uncommon", sell_price: 0, stack_max: 1, description: "A prism cut to the Heliostat Vault's lock. The Guild gives it to Wayfarers who clear the Causeway." },
];

// Craft prices: each recipe uses less value than the shop price of what it makes,
// so it is a cheaper way to stock up that turns field drops into supplies.
const recipes: RecipeDef[] = [
  { id: "rcp_sol_field_ration", npc_id: "npc_sol_craftsman", output: { item_id: "itm_0075", qty: 8 }, inputs: [{ item_id: "itm_0031", qty: 2 }], currency: 10 },
  { id: "rcp_sol_vital_tonic", npc_id: "npc_sol_craftsman", output: { item_id: "itm_0076", qty: 5 }, inputs: [{ item_id: "itm_0130", qty: 3 }], currency: 20 },
  { id: "rcp_sol_focus_tonic", npc_id: "npc_sol_craftsman", output: { item_id: "itm_0077", qty: 4 }, inputs: [{ item_id: "itm_0033", qty: 3 }], currency: 25 },
];

// --- quests: a chain that walks the player through every map in level order ------

const R = "npc_sol_guild_registrar";
const quests: QuestDef[] = [
  { id: "q_sol_intro", title: "Solenia: First Survey", region_id: "sol", giver_npc_id: R, turn_in_npc_id: R, min_level: 25, prerequisite: null,
    objectives: [{ type: "kill", monster_id: "mob_0016", count: 40 }],
    rewards: { base_exp: questExp(25, 0.6), currency: questGold(25, 1.5), items: [{ item_id: "itm_0075", qty: 10 }] },
    summary: "Clear the Sandcoils basking on the Saffron Dunes beyond the West Gate. A gentle first horde in the heat." },
  { id: "q_sol_caravan", title: "Kites over the Verge", region_id: "sol", giver_npc_id: "npc_sol_verge_scout", turn_in_npc_id: "npc_sol_verge_scout", min_level: 29, prerequisite: "q_sol_intro",
    objectives: [{ type: "visit", map_id: "sol_fld_02", count: 1 }, { type: "kill", monster_id: "mob_0051", count: 60 }, { type: "kill", monster_id: "mob_0017", count: 40 }],
    rewards: { base_exp: questExp(29, 0.45), currency: questGold(29, 2), items: [{ item_id: "itm_0076", qty: 8 }] },
    summary: "Brass Kites shoot from range over the caravan road. Pull them into the scarab packs." },
  { id: "q_sol_glass_flats", title: "Sentries on the Glass", region_id: "sol", giver_npc_id: "npc_sol_flats_scout", turn_in_npc_id: "npc_sol_flats_scout", min_level: 33, prerequisite: "q_sol_caravan",
    objectives: [{ type: "kill", monster_id: "mob_0018", count: 100 }, { type: "kill", monster_id: "mob_0052", count: 30 }],
    rewards: { base_exp: questExp(33, 0.4), currency: questGold(33, 2), items: [{ item_id: "itm_0073", qty: 1 }] },
    summary: "The first construct horde, then the basilisk packs: big slow trains and bruisers that answer each other." },
  { id: "q_sol_sun_dial", title: "Recalibrating the Dial", region_id: "sol", giver_npc_id: "npc_sol_dial_scout", turn_in_npc_id: "npc_sol_dial_scout", min_level: 37, prerequisite: "q_sol_glass_flats",
    objectives: [{ type: "kill", monster_id: "mob_0053", count: 60 }, { type: "kill", monster_id: "mob_0019", count: 60 }],
    rewards: { base_exp: questExp(37, 0.4), currency: questGold(37, 2), items: [{ item_id: "itm_0077", qty: 10 }] },
    summary: "Acolytes keep the Wardens running. Kill the supports first, then the Wardens on the Dial's face." },
  { id: "q_sol_aqueduct", title: "Striders in the Channel", region_id: "sol", giver_npc_id: "npc_sol_aqueduct_scout", turn_in_npc_id: "npc_sol_aqueduct_scout", min_level: 41, prerequisite: "q_sol_sun_dial",
    objectives: [{ type: "kill", monster_id: "mob_0054", count: 120 }, { type: "collect", item_id: "itm_0138", count: 15 }],
    rewards: { base_exp: questExp(41, 0.4), currency: questGold(41, 2), items: [{ item_id: "itm_0076", qty: 10 }, { item_id: "itm_0073", qty: 1 }] },
    summary: "A fleeing swarm along the canal: herd the Striders against the channel walls before they scatter." },
  { id: "q_sol_causeway", title: "The Sealed Door", region_id: "sol", giver_npc_id: "npc_sol_causeway_scout", turn_in_npc_id: "npc_sol_causeway_scout", min_level: 45, prerequisite: "q_sol_aqueduct",
    objectives: [{ type: "kill", monster_id: "mob_0055", count: 150 }, { type: "kill", monster_id: "mob_0056", count: 2 }],
    rewards: { base_exp: questExp(45, 0.4), currency: questGold(45, 2), items: [{ item_id: "itm_0150", qty: 1 }, { item_id: "itm_0073", qty: 2 }] },
    summary: "Clear the Revenants off the causeway and bring down two Colossi. The Guild hands over the Key Prism that opens the Vault." },
  { id: "q_sol_heliostat", title: "Noon in the Vault", region_id: "sol", giver_npc_id: "npc_sol_vault_gatekeeper", turn_in_npc_id: R, min_level: 50, prerequisite: "q_sol_causeway",
    objectives: [{ type: "kill", monster_id: "mob_0059", count: 1 }],
    rewards: { base_exp: questExp(50, 0.8), currency: questGold(50, 4), items: [{ item_id: "itm_0073", qty: 3 }, { item_id: "itm_0148", qty: 1 }] },
    summary: "Shut down the Heliostat Sovereign and report to Duskhar. Opens the transit to Thalassia's Port Merrow." },
];

// --- maps --------------------------------------------------------------------------

const npc = (id: string, name: string, position: [number, number], facing: NpcDef["facing"], role: NpcDef["role"], extra: Partial<NpcDef> = {}): Omit<NpcDef, "map_id"> =>
  ({ id, name, position, facing, role, dialogue_id: id.replace(/^npc_/, "dlg_"), shop_id: null, ...extra });

const fieldCost = (minLevel: number) => 10 + 4 * minLevel;
/** Capital-to-capital transit: 300 + 15 x the destination region's starting level. */
const capitalCost = (destMinLevel: number) => 300 + 15 * destMinLevel;

const duskhar: MapDesign = {
  id: "sol_town_01", name: "Duskhar", type: "town", role: "Region capital on an Aethrion canal: services, quest hub, crafting, transit to Solenia's fields, Sylvara and Port Merrow.",
  levels: [25, 55], size: [128, 140], arrival: [64, 78], ground: "sand", theme: "a walled desert city of sandstone and brass domes astride an ancient canal, with an observatory over the guild",
  border: { width: 3, kind: "ruin_wall" },
  roads: [
    { points: [[64, 72], [0, 72]], width: 5, kind: "stone" },
    { points: [[64, 72], [52, 40], [45, 0]], width: 5, kind: "stone" },
    { points: [[64, 72], [100, 72], [116, 90]], width: 3, kind: "stone" },
    { points: [[86, 72], [102, 72]], width: 4, kind: "bridge" },
    { points: [[64, 72], [64, 112]], width: 3, kind: "stone" },
    { points: [[64, 72], [86, 48]], width: 3, kind: "stone" },
  ],
  blockers: [
    { kind: "water", shape: { rect: [92, 3, 5, 134] } }, // the canal
    { kind: "building", shape: { rect: [74, 22, 16, 14] } }, // Guild observatory
    { kind: "building", shape: { rect: [28, 46, 14, 10] } }, // Medic house
    { kind: "building", shape: { rect: [70, 100, 16, 12] } }, // Artificer's workshop
    { kind: "building", shape: { rect: [8, 10, 14, 10] } },
    { kind: "building", shape: { rect: [12, 96, 14, 12] } },
    { kind: "building", shape: { rect: [104, 12, 14, 10] } },
    { kind: "building", shape: { rect: [102, 36, 12, 10] } },
    { kind: "building", shape: { rect: [104, 112, 14, 12] } },
    { kind: "building", shape: { rect: [30, 116, 12, 10] } },
  ],
  props: [
    { kind: "fountain", x: 64, y: 72, block: 3, scale: 1.3 },
    { kind: "lattice_obelisk", x: 64, y: 61, block: 2, scale: 1.4 }, // the plaza gnomon
    { kind: "observatory", x: 82, y: 28, block: 0, scale: 1.6 },
    { kind: "aether_pylon", x: 56, y: 82, block: 1 }, { kind: "aether_pylon", x: 72, y: 82, block: 1 },
    { kind: "market_stall", x: 40, y: 80, block: 2 }, { kind: "market_stall", x: 46, y: 80, block: 2 }, { kind: "market_stall", x: 52, y: 80, block: 2 },
    { kind: "transit_gate", x: 118, y: 100, block: 3 },
    { kind: "furnace", x: 70, y: 95, block: 2 }, { kind: "anvil", x: 75, y: 95, block: 1 },
    { kind: "workshop", x: 78, y: 105, block: 0 },
    { kind: "aqueduct", x: 94, y: 30, block: 0, scale: 1.5 }, { kind: "waterwheel", x: 94, y: 56, block: 2 },
    { kind: "lamp_post", x: 30, y: 68, block: 1 }, { kind: "lamp_post", x: 12, y: 77, block: 1 }, { kind: "lamp_post", x: 58, y: 24, block: 1 },
    { kind: "lamp_post", x: 106, y: 78, block: 1 }, { kind: "lamp_post", x: 68, y: 116, block: 1 },
    { kind: "dock", x: 90, y: 90, block: 0 },
    { kind: "crate", x: 36, y: 84, block: 1 }, { kind: "crate", x: 37, y: 85, block: 1 },
  ],
  scatter: [
    { kind: "palm", count: 28, block: 1, scale: [0.9, 1.3] },
    { kind: "bush", count: 30, block: 0, scale: [0.6, 1] },
    { kind: "crate", count: 8, area: [100, 80, 24, 24], block: 1 },
  ],
  landmarks: [
    { id: "lm_sol_town_plaza", name: "Gnomon Plaza", kind: "plaza", x: 64, y: 72, note: "Respawn point; the service NPCs face the canal fountain." },
    { id: "lm_sol_town_guild", name: "Observatory Guild Hall", kind: "plaza", x: 82, y: 28, note: "Quest hub under the brass dome." },
    { id: "lm_sol_town_canal", name: "Old Canal", kind: "crossroads", x: 94, y: 72, note: "The Aethrion canal that Duskhar was built on; one bridge crosses it." },
    { id: "lm_sol_town_west_gate", name: "West Gate", kind: "gate", x: 6, y: 72, note: "To the Saffron Dunes (Lv25-30)." },
    { id: "lm_sol_town_north_gate", name: "Caravan Gate", kind: "gate", x: 45, y: 6, note: "The caravan road to Caravan Verge (Lv29-34)." },
    { id: "lm_sol_town_transit", name: "Transit Station", kind: "plaza", x: 118, y: 100, note: "Paid travel to field camps, Sylvara and Port Merrow." },
    { id: "lm_sol_town_bazaar", name: "Bazaar Row", kind: "plaza", x: 46, y: 80, note: "The supply merchant's stalls." },
  ],
  safe_areas: [[0, 0, 128, 140]],
  pockets: [],
  npcs: [
    npc("npc_sol_guild_registrar", "Duskhar Guild Registrar", [84, 40], "S", "guild_registrar"),
    npc("npc_sol_merchant", "Duskhar Supply Merchant", [46, 77], "N", "merchant", { shop_id: "shop_sol" }),
    npc("npc_sol_healer", "Duskhar Field Medic", [44, 59], "E", "healer"),
    npc("npc_sol_teleporter", "Duskhar Transit Operator", [112, 96], "SE", "teleporter", {
      destinations: [
        ["sol_fld_01", fieldCost(25)], ["sol_fld_02", fieldCost(29)], ["sol_fld_03", fieldCost(33)],
        ["sol_fld_04", fieldCost(37)], ["sol_fld_05", fieldCost(41)], ["sol_fld_06", fieldCost(45)],
        ["ver_town_01", capitalCost(15)], ["tha_town_01", capitalCost(35)],
      ],
    }),
    npc("npc_sol_craftsman", "Duskhar Artificer", [73, 91], "S", "craftsman"),
    npc("npc_sol_west_gate_guard", "West Gate Warden", [10, 66], "E", "guard"),
    npc("npc_sol_north_gate_guard", "Caravan Gate Warden", [52, 10], "S", "guard"),
  ],
};

const saffronDunes: MapDesign = {
  id: "sol_fld_01", name: "Saffron Dunes", type: "field", role: "First Solenia field: basking Sandcoils on the crests and the mesa glass, a jackal pack at the oasis and a buried pipeline where both meet.",
  levels: [25, 30], size: [148, 116], arrival: [137, 53], ground: "sand", theme: "rolling saffron dunes over a buried Aethrion pipeline, a mesa with a ruined observatory, one oasis",
  border: { width: 4, kind: "rock" },
  roads: [
    { points: [[147, 53], [112, 56], [84, 62]], width: 4, kind: "dirt" },
    { points: [[84, 62], [60, 40], [34, 22], [28, 0]], width: 4, kind: "dirt" },
    { points: [[84, 62], [70, 90], [50, 100]], width: 3, kind: "dirt" },
    { points: [[84, 62], [110, 90]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "rock", shape: { ellipse: [118, 22, 10, 7] } }, // mesa
    { kind: "cliff", shape: { poly: [[6, 40], [26, 44], [24, 58], [6, 62]] } },
    { kind: "water", shape: { ellipse: [30, 90, 7, 5] } }, // the oasis
    { kind: "rock", shape: { ellipse: [126, 108, 6, 3] } },
  ],
  props: [
    { kind: "tent", x: 138, y: 47, block: 2 }, { kind: "crate", x: 132, y: 58, block: 1 },
    { kind: "tent", x: 34, y: 10, block: 2 },
    { kind: "observatory", x: 118, y: 22, block: 0, scale: 1.2 },
    { kind: "brass_pipe", x: 56, y: 46, block: 0, scale: 1.2 }, { kind: "brass_pipe", x: 64, y: 52, block: 0, scale: 1.2 }, { kind: "brass_pipe", x: 100, y: 84, block: 0 },
    { kind: "gear_ruin", x: 50, y: 40, block: 2 },
    { kind: "aether_pylon", x: 88, y: 58, block: 1 },
    { kind: "rune_stone", x: 40, y: 90, block: 1 },
    { kind: "palm", x: 22, y: 86, block: 1, scale: 1.2 }, { kind: "palm", x: 38, y: 96, block: 1, scale: 1.1 },
  ],
  scatter: [
    { kind: "palm", count: 14, area: [16, 80, 30, 22], block: 1, scale: [0.9, 1.3] },
    { kind: "rock", count: 40, block: 1, scale: [0.7, 1.3] },
    { kind: "dead_tree", count: 15, block: 1, scale: [0.7, 1.1] },
    { kind: "bush", count: 40, block: 0, scale: [0.5, 0.9] },
  ],
  landmarks: [
    { id: "lm_sol_dunes_camp", name: "West Gate Camp", kind: "camp", x: 137, y: 53, note: "Arrival from Duskhar's West Gate." },
    { id: "lm_sol_dunes_crossing", name: "Pipe Crossing", kind: "crossroads", x: 84, y: 62, note: "Where the trails meet over the buried pipeline." },
    { id: "lm_sol_dunes_coil", name: "Coil Dunes", kind: "farm", x: 112, y: 88, note: "Sandcoils bask on the dune crests." },
    { id: "lm_sol_dunes_oasis", name: "Jackal Draw", kind: "farm", x: 30, y: 90, note: "The oasis and its jackal pack." },
    { id: "lm_sol_dunes_glass", name: "Mesa Glass", kind: "farm", x: 86, y: 22, note: "Lightning-glass patches under the mesa; Sandcoils bask on the warm glass." },
    { id: "lm_sol_dunes_pipeline", name: "Buried Pipeline", kind: "ruin", x: 56, y: 46, note: "Exposed Aethrion pipe; Sandcoils sleep along its heat." },
    { id: "lm_sol_dunes_mesa", name: "Mesa Observatory", kind: "lookout", x: 118, y: 22, note: "A ruined brass observatory on the mesa." },
    { id: "lm_sol_dunes_north", name: "Verge Trail", kind: "gate", x: 28, y: 6, note: "To Caravan Verge (Lv29-34)." },
  ],
  safe_areas: [[130, 46, 14, 14], [23, 4, 14, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "coil_dunes", name: "Coil Dunes", rects: [[92, 74, 40, 28]], species: [{ monster_id: "mob_0016", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "Passive Sandcoils on open dunes beside the camp, at the bottom of the band: ~28 cells each, room to gather 40 with Anchor Shout." },
    { id: "jackal_draw", name: "Jackal Draw", rects: [[10, 68, 44, 32]], species: [{ monster_id: "mob_0050", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "Jackals den round the oasis (the water takes ~8% of the rect); assist packs come in from all sides of the water." },
    { id: "mesa_glass", name: "Mesa Glass", rects: [[70, 10, 34, 26]], species: [{ monster_id: "mob_0016", weight: 1 }], target_alive: 25, respawn_sec: [7, 16],
      design_note: "More passive Sandcoils basking on the lightning-glass below the mesa, off the main trail: a quieter second gathering ground away from the camp." },
    { id: "buried_pipeline", name: "Buried Pipeline", rects: [[42, 36, 28, 20]], species: [{ monster_id: "mob_0016", weight: 50 }, { monster_id: "mob_0050", weight: 50 }], target_alive: 20, respawn_sec: [8, 16],
      design_note: "Sandcoils sleeping on the warm pipe with jackals hunting them, astride the trail north: a mixed passive/assist pack." },
  ],
  npcs: [npc("npc_sol_dunes_scout", "Dunes Scout Rasha", [134, 49], "W", "scout")],
};

const caravanVerge: MapDesign = {
  id: "sol_fld_02", name: "Caravan Verge", type: "field", role: "The caravan crossroads round a ruined caravanserai: kites over the heights and the old checkpoint, glass scarabs in the washes and west of the serai.",
  levels: [29, 34], size: [124, 136], arrival: [73, 125], ground: "sand", theme: "the desert's edge where caravan roads meet at a ruined caravanserai; brass survey towers",
  border: { width: 4, kind: "rock" },
  roads: [
    { points: [[73, 135], [72, 108], [60, 80]], width: 4, kind: "dirt" },
    { points: [[60, 80], [90, 82], [123, 83]], width: 4, kind: "dirt" },
    { points: [[60, 80], [50, 50], [40, 24], [39, 0]], width: 4, kind: "dirt" },
    { points: [[60, 80], [24, 96]], width: 3, kind: "dirt" },
    { points: [[50, 50], [86, 36]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "ruin_wall", shape: { rect: [44, 66, 10, 2] } },
    { kind: "ruin_wall", shape: { rect: [66, 66, 10, 2] } },
    { kind: "ruin_wall", shape: { rect: [44, 92, 32, 2] } },
    { kind: "ruin_wall", shape: { rect: [44, 68, 2, 12] } },
    { kind: "rock", shape: { ellipse: [100, 112, 8, 6] } },
    { kind: "cliff", shape: { ellipse: [16, 40, 8, 10] } },
  ],
  props: [
    { kind: "tent", x: 68, y: 122, block: 2 }, { kind: "lamp_post", x: 80, y: 127, block: 1 },
    { kind: "tent", x: 116, y: 79, block: 2 },
    { kind: "tent", x: 44, y: 12, block: 2 },
    { kind: "market_stall", x: 54, y: 74, block: 2 }, { kind: "crate", x: 68, y: 74, block: 1 }, { kind: "crate", x: 70, y: 75, block: 1 },
    { kind: "observatory", x: 90, y: 30, block: 0, scale: 1.2 }, // survey tower
    { kind: "aqueduct", x: 30, y: 72, block: 0 },
    { kind: "gear_ruin", x: 104, y: 100, block: 2 },
    { kind: "rune_stone", x: 22, y: 64, block: 1 },
  ],
  scatter: [
    { kind: "rock", count: 40, block: 1, scale: [0.7, 1.3] },
    { kind: "palm", count: 16, block: 1, scale: [0.9, 1.2] },
    { kind: "dead_tree", count: 20, block: 1, scale: [0.7, 1.1] },
    { kind: "bush", count: 50, block: 0, scale: [0.5, 0.9] },
  ],
  landmarks: [
    { id: "lm_sol_verge_camp", name: "Southgate Camp", kind: "camp", x: 73, y: 125, note: "Arrival from the Saffron Dunes." },
    { id: "lm_sol_verge_east", name: "Caravan Road Camp", kind: "camp", x: 113, y: 83, note: "Arrival from Duskhar's Caravan Gate." },
    { id: "lm_sol_verge_serai", name: "Ruined Caravanserai", kind: "crossroads", x: 60, y: 80, note: "Three caravan roads meet inside its broken walls." },
    { id: "lm_sol_verge_heights", name: "Kite Heights", kind: "farm", x: 90, y: 32, note: "Brass Kites circle the survey tower." },
    { id: "lm_sol_verge_wash", name: "Scarab Wash", kind: "farm", x: 28, y: 114, note: "A dry wash full of glass." },
    { id: "lm_sol_verge_checkpoint", name: "Kite Checkpoint", kind: "ruin", x: 98, y: 106, note: "An old caravan checkpoint; Brass Kites still circle it." },
    { id: "lm_sol_verge_jackals", name: "Serai Scarabs", kind: "farm", x: 24, y: 68, note: "Glass Scarabs swarm the serai's west side." },
    { id: "lm_sol_verge_north", name: "Glass Road", kind: "gate", x: 39, y: 6, note: "To the Glass Flats (Lv33-38)." },
  ],
  safe_areas: [[66, 118, 16, 12], [106, 76, 14, 14], [32, 4, 14, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "kite_heights", name: "Kite Heights", rects: [[70, 18, 40, 28]], species: [{ monster_id: "mob_0051", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Ranged kites mid-band round the survey tower, ~37 cells each so a player can break line and pull them in a few at a time." },
    { id: "scarab_wash", name: "Scarab Wash", rects: [[8, 100, 40, 28]], species: [{ monster_id: "mob_0017", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "The main Scarab farm in a dry wash: aggressive, dense, quick refill — the Verge's horde for 30+ trains." },
    { id: "kite_checkpoint", name: "Kite Checkpoint", rects: [[84, 94, 30, 26]], species: [{ monster_id: "mob_0051", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Aggressive ranged kites over the old checkpoint between the two camps: break line on the ruined walls and pull them in a few at a time." },
    { id: "serai_scarabs", name: "Serai Scarabs", rects: [[10, 54, 28, 30]], species: [{ monster_id: "mob_0017", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Lv30 scarabs near the bottom of the band west of the serai: a smaller aggressive swarm for players arriving from the Dunes." },
  ],
  npcs: [npc("npc_sol_verge_scout", "Verge Scout Haddo", [78, 122], "N", "scout")],
};

const glassFlats: MapDesign = {
  id: "sol_fld_03", name: "Glass Flats", type: "field", role: "A plain of lightning-fused glass under heliograph mirrors: Sentry fields, basilisk packs, and sentries and basilisks round the mirrors and the glass scar.",
  levels: [33, 38], size: [160, 100], arrival: [44, 89], ground: "sand", theme: "a wide, glittering plain of fused glass, heliograph mirrors on lattice towers, a scorched survey dome",
  border: { width: 4, kind: "rock" },
  roads: [
    { points: [[43, 99], [46, 70], [80, 56]], width: 4, kind: "dirt" },
    { points: [[80, 56], [120, 44], [159, 33]], width: 4, kind: "dirt" },
    { points: [[80, 56], [100, 80], [130, 84]], width: 3, kind: "dirt" },
    { points: [[80, 56], [60, 30], [30, 20]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "crystal", shape: { ellipse: [100, 22, 8, 5] } },
    { kind: "crystal", shape: { ellipse: [24, 60, 6, 8] } },
    { kind: "crystal", shape: { ellipse: [120, 66, 5, 4] } },
    { kind: "chasm", shape: { ellipse: [146, 80, 6, 5] } },
  ],
  props: [
    { kind: "tent", x: 38, y: 86, block: 2 },
    { kind: "tent", x: 152, y: 29, block: 2 },
    { kind: "lattice_obelisk", x: 70, y: 16, block: 2 }, { kind: "lattice_obelisk", x: 84, y: 22, block: 2 },
    { kind: "observatory", x: 126, y: 24, block: 0, scale: 1.3 },
    { kind: "gear_ruin", x: 30, y: 26, block: 2 },
    { kind: "aether_pylon", x: 76, y: 64, block: 1 },
    { kind: "brass_pipe", x: 112, y: 58, block: 0 },
  ],
  scatter: [
    { kind: "crystal", count: 50, block: 1, scale: [0.6, 1.3] },
    { kind: "rock", count: 30, block: 1, scale: [0.7, 1.2] },
    { kind: "dead_tree", count: 10, block: 1 },
    { kind: "bush", count: 30, block: 0, scale: [0.5, 0.8] },
  ],
  landmarks: [
    { id: "lm_sol_flats_camp", name: "Glass Gate Camp", kind: "camp", x: 44, y: 89, note: "Arrival from Caravan Verge." },
    { id: "lm_sol_flats_cross", name: "Shard Cross", kind: "crossroads", x: 80, y: 56, note: "The four glass roads meet." },
    { id: "lm_sol_flats_glare", name: "Basilisk Glare", kind: "farm", x: 122, y: 62, note: "Basilisk packs on the brightest glass." },
    { id: "lm_sol_flats_sentries", name: "Sentry Field", kind: "farm", x: 30, y: 22, note: "Dune Sentries walk the old glass works." },
    { id: "lm_sol_flats_mirrors", name: "Heliograph Mirrors", kind: "ruin", x: 76, y: 18, note: "Lattice towers that flashed messages to the Sun Dial; sentries and basilisks still guard them." },
    { id: "lm_sol_flats_scar", name: "Glass Scar", kind: "farm", x: 72, y: 80, note: "A fused trench; sentries and basilisks." },
    { id: "lm_sol_flats_east", name: "Dial Road", kind: "gate", x: 152, y: 34, note: "To the Sun Dial (Lv37-42)." },
  ],
  safe_areas: [[36, 82, 16, 14], [142, 28, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "basilisk_glare", name: "Basilisk Glare", rects: [[104, 50, 38, 26]], species: [{ monster_id: "mob_0052", weight: 1 }], target_alive: 30, respawn_sec: [9, 18],
      design_note: "Assist bruisers at mid-band on the open glass east of the crossroads; ~30 cells each so packs can be kited round the crystal outcrop." },
    { id: "sentry_field", name: "Sentry Field", rects: [[8, 8, 44, 30]], species: [{ monster_id: "mob_0018", weight: 1 }], target_alive: 35, respawn_sec: [7, 16],
      design_note: "The signature construct horde of the Flats: slow aggressive Sentries in a wide open corner, made for 30+ trains." },
    { id: "heliograph_mirrors", name: "Heliograph Mirrors", rects: [[56, 6, 34, 24]], species: [{ monster_id: "mob_0018", weight: 50 }, { monster_id: "mob_0052", weight: 50 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Lv35 Sentries with Lv37 basilisks among the mirror towers mid-band: slow constructs and assist bruisers, so pull round the towers to split the pack." },
    { id: "glass_scar", name: "Glass Scar", rects: [[58, 70, 30, 22]], species: [{ monster_id: "mob_0018", weight: 50 }, { monster_id: "mob_0052", weight: 50 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Mixed constructs and bruisers near the camp: a heavier pack for the top of the band." },
  ],
  npcs: [npc("npc_sol_flats_scout", "Flats Scout Imre", [49, 86], "N", "scout")],
};

// The Dial: twelve rune stones in a ring round the great gnomon.
const dialRing: Prop[] = Array.from({ length: 12 }, (_, i) => ({
  kind: "rune_stone" as const, x: Math.round(68 + 14 * Math.cos((i * Math.PI) / 6)), y: Math.round(64 + 14 * Math.sin((i * Math.PI) / 6)), block: 1,
}));

const sunDial: MapDesign = {
  id: "sol_fld_04", name: "Sun Dial", type: "field", role: "A colossal Aethrion sundial: Wardens and Acolytes on its face, Acolyte sands, a Warden causeway and a graveyard of broken sentries the Acolytes tend.",
  levels: [37, 42], size: [136, 136], arrival: [10, 98], ground: "stone", theme: "a stone dial-face a hundred metres across, a lattice gnomon, brass paths and a graveyard of broken sentries",
  border: { width: 4, kind: "rock" },
  roads: [
    { points: [[0, 99], [30, 96], [48, 82]], width: 4, kind: "stone" },
    { points: [[48, 82], [44, 64], [50, 46], [68, 40], [86, 46], [100, 34], [135, 27]], width: 4, kind: "brass" },
    { points: [[48, 82], [68, 88], [92, 82], [96, 66]], width: 3, kind: "brass" },
    { points: [[48, 82], [40, 110]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "rock", shape: { ellipse: [112, 108, 8, 6] } },
    { kind: "cliff", shape: { poly: [[96, 4], [130, 4], [130, 14], [104, 16]] } },
    { kind: "rock", shape: { ellipse: [18, 60, 5, 7] } },
  ],
  props: [
    ...dialRing,
    { kind: "lattice_obelisk", x: 68, y: 64, block: 4, scale: 2.6 }, // the great gnomon
    { kind: "tent", x: 8, y: 94, block: 2 },
    { kind: "tent", x: 128, y: 24, block: 2 },
    { kind: "observatory", x: 110, y: 40, block: 0, scale: 1.3 },
    { kind: "statue", x: 40, y: 120, block: 2 },
    { kind: "gear_ruin", x: 110, y: 120, block: 2 },
    { kind: "brass_pipe", x: 100, y: 100, block: 0 },
    { kind: "aether_pylon", x: 30, y: 88, block: 1 },
  ],
  scatter: [
    { kind: "rock", count: 40, block: 1, scale: [0.7, 1.3] },
    { kind: "palm", count: 10, block: 1 },
    { kind: "dead_tree", count: 15, block: 1 },
    { kind: "bush", count: 40, block: 0, scale: [0.5, 0.9] },
    { kind: "rune_stone", count: 10, area: [24, 108, 44, 20], block: 1 },
  ],
  landmarks: [
    { id: "lm_sol_dial_camp", name: "Dial Camp", kind: "camp", x: 10, y: 98, note: "Arrival from the Glass Flats; a medic keeps the camp." },
    { id: "lm_sol_dial_gnomon", name: "The Great Gnomon", kind: "shrine", x: 68, y: 64, note: "The dial's lattice gnomon; its shadow still marks Aethrion hours." },
    { id: "lm_sol_dial_face", name: "Dial Face", kind: "farm", x: 68, y: 72, note: "Wardens and Acolytes on the ring." },
    { id: "lm_sol_dial_sands", name: "Acolyte Sands", kind: "farm", x: 32, y: 26, note: "Acolytes recalibrate the survey marks west of the dial." },
    { id: "lm_sol_dial_causeway", name: "Warden Causeway", kind: "farm", x: 110, y: 66, note: "Wardens patrol the east approach." },
    { id: "lm_sol_dial_graveyard", name: "Sentry Graveyard", kind: "ruin", x: 46, y: 118, note: "Broken sentries the Acolytes still try to mend." },
    { id: "lm_sol_dial_east", name: "Aqueduct Road", kind: "gate", x: 128, y: 28, note: "To the Dust Aqueduct (Lv41-46)." },
  ],
  safe_areas: [[4, 92, 14, 14], [118, 22, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "dial_face", name: "Dial Face", rects: [[54, 50, 28, 28]], species: [{ monster_id: "mob_0019", weight: 40 }, { monster_id: "mob_0053", weight: 60 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Acolytes tending Wardens round the gnomon: the stone ring and gnomon split the pack, so the supports must be hunted inside it." },
    { id: "acolyte_sands", name: "Acolyte Sands", rects: [[12, 12, 40, 30]], species: [{ monster_id: "mob_0053", weight: 1 }], target_alive: 35, respawn_sec: [7, 16],
      design_note: "Lv39 assist Acolytes mid-band on open sand with no Wardens to hide behind: the main support farm for new arrivals." },
    { id: "warden_causeway", name: "Warden Causeway", rects: [[94, 52, 32, 30]], species: [{ monster_id: "mob_0019", weight: 1 }], target_alive: 20, respawn_sec: [10, 20],
      design_note: "Lv42 Wardens at the top of the band on the east approach: hard-hitting constructs in smaller numbers (~48 cells each)." },
    { id: "sentry_graveyard", name: "Sentry Graveyard", rects: [[24, 108, 44, 20]], species: [{ monster_id: "mob_0053", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Lv39 Acolytes among grave markers, mending broken sentries that never rise: an easier assist farm south of the camp." },
  ],
  npcs: [
    npc("npc_sol_dial_scout", "Dial Scout Oren", [14, 94], "E", "scout"),
    npc("npc_sol_dial_medic", "Dial Camp Medic", [6, 103], "E", "healer"),
  ],
};

// Aqueduct arches stride the canal from end to end.
const aqueductArches: Prop[] = Array.from({ length: 8 }, (_, i) => ({ kind: "aqueduct" as const, x: 60, y: 20 + 16 * i, block: 0, scale: 1.4 }));

const dustAqueduct: MapDesign = {
  id: "sol_fld_05", name: "Dust Aqueduct", type: "field", role: "A ruined aqueduct over the last canal water: Canal Striders on the channel, round the piers, in the dry sluices and at the cistern.",
  levels: [41, 46], size: [116, 148], arrival: [10, 34], ground: "sand", theme: "a broken Aethrion aqueduct striding north to south over a narrow canal, sluices and a cistern",
  border: { width: 4, kind: "rock" },
  roads: [
    { points: [[0, 33], [30, 36], [56, 42]], width: 4, kind: "dirt" },
    { points: [[54, 42], [66, 42]], width: 4, kind: "bridge" },
    { points: [[66, 42], [90, 60], [96, 90], [84, 120], [83, 147]], width: 4, kind: "dirt" },
    { points: [[30, 36], [28, 80], [40, 110], [54, 112]], width: 3, kind: "dirt" },
    { points: [[54, 112], [66, 112]], width: 4, kind: "bridge" },
    { points: [[66, 112], [84, 120]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { rect: [58, 4, 5, 140] } }, // the canal
    { kind: "water", shape: { ellipse: [102, 108, 4, 3] } }, // cistern
    { kind: "cliff", shape: { poly: [[4, 90], [16, 86], [20, 104], [4, 108]] } },
  ],
  props: [
    ...aqueductArches,
    { kind: "tent", x: 8, y: 29, block: 2 },
    { kind: "tent", x: 88, y: 134, block: 2 },
    { kind: "waterwheel", x: 60, y: 60, block: 2 }, { kind: "waterwheel", x: 60, y: 96, block: 2 },
    { kind: "brass_pipe", x: 80, y: 70, block: 0 },
    { kind: "gear_ruin", x: 20, y: 60, block: 2 },
    { kind: "lattice_obelisk", x: 100, y: 22, block: 2 },
  ],
  scatter: [
    { kind: "palm", count: 20, area: [40, 40, 50, 100], block: 1, scale: [0.9, 1.3] },
    { kind: "rock", count: 40, block: 1, scale: [0.7, 1.2] },
    { kind: "dead_tree", count: 15, block: 1 },
    { kind: "bush", count: 40, block: 0, scale: [0.5, 0.9] },
  ],
  landmarks: [
    { id: "lm_sol_aqueduct_camp", name: "Westbank Camp", kind: "camp", x: 10, y: 34, note: "Arrival from the Sun Dial." },
    { id: "lm_sol_aqueduct_bridge", name: "North Sluice Bridge", kind: "crossroads", x: 60, y: 42, note: "Bridge over the canal under the aqueduct." },
    { id: "lm_sol_aqueduct_canal", name: "Strider Canal", kind: "farm", x: 60, y: 70, note: "The last running water; Striders skate here." },
    { id: "lm_sol_aqueduct_piers", name: "North Piers", kind: "ruin", x: 88, y: 22, note: "Striders skate the pools round the aqueduct's head." },
    { id: "lm_sol_aqueduct_sluice", name: "South Sluice", kind: "farm", x: 28, y: 128, note: "Dry sluices where Striders skitter between the last puddles." },
    { id: "lm_sol_aqueduct_cistern", name: "Old Cistern", kind: "farm", x: 100, y: 106, note: "Striders skate on the cistern water." },
    { id: "lm_sol_aqueduct_south", name: "Causeway Steps", kind: "gate", x: 83, y: 140, note: "To the Buried Causeway (Lv45-50)." },
  ],
  safe_areas: [[4, 27, 14, 14], [76, 130, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "strider_canal", name: "Strider Canal", rects: [[40, 54, 40, 34]], species: [{ monster_id: "mob_0054", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature flee swarm mid-band, straddling the canal (~12% water): fleeing Striders run along the channel walls, so herd them down its length." },
    { id: "north_piers", name: "North Piers", rects: [[72, 8, 36, 28]], species: [{ monster_id: "mob_0054", weight: 1 }], target_alive: 25, respawn_sec: [9, 18],
      design_note: "Lv44 Striders mid-band round the aqueduct's head beside the bridge from camp: pin the fleeing swarm against the piers." },
    { id: "south_sluice", name: "South Sluice", rects: [[8, 116, 40, 26]], species: [{ monster_id: "mob_0054", weight: 1 }], target_alive: 30, respawn_sec: [7, 16],
      design_note: "Striders in the dry south sluices: the sluice walls stop the fleeing swarm scattering, so herd them into the corners." },
    { id: "old_cistern", name: "Old Cistern", rects: [[90, 92, 22, 30]], species: [{ monster_id: "mob_0054", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Striders round the cistern by the south road: a fast, low-threat fleeing pack, easy to pin against the cistern rim." },
  ],
  npcs: [npc("npc_sol_aqueduct_scout", "Aqueduct Scout Sefa", [14, 29], "E", "scout")],
};

const buriedCauseway: MapDesign = {
  id: "sol_fld_06", name: "Buried Causeway", type: "field", role: "A raised Aethrion causeway half-swallowed by sand, leading to the Vault's sealed door: Revenants on the road, Lens-drones over the sinks, Colossi in the sand, a lens array at the door.",
  levels: [45, 50], size: [152, 120], arrival: [113, 9], ground: "sand", theme: "a broad paved causeway sinking into the dunes, fallen statues, a lens array before a sealed vault door",
  border: { width: 4, kind: "rock" },
  roads: [
    { points: [[113, 0], [112, 30], [90, 52], [60, 70], [44, 90], [43, 119]], width: 5, kind: "stone" },
    { points: [[90, 52], [130, 70], [140, 96]], width: 3, kind: "dirt" },
    { points: [[60, 70], [24, 50], [16, 24]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "chasm", shape: { ellipse: [80, 92, 10, 6] } }, // a collapsed span
    { kind: "water", shape: { ellipse: [26, 88, 6, 4] } }, // seep sink
    { kind: "rock", shape: { ellipse: [130, 30, 8, 6] } },
    { kind: "cliff", shape: { poly: [[4, 104], [24, 100], [30, 116], [4, 116]] } },
  ],
  props: [
    { kind: "tent", x: 118, y: 8, block: 2 },
    { kind: "tent", x: 49, y: 106, block: 2 },
    { kind: "cave_mouth", x: 43, y: 118, block: 0, scale: 1.4 }, // the Vault door
    { kind: "statue", x: 70, y: 44, block: 2 }, { kind: "statue", x: 100, y: 22, block: 2 },
    { kind: "gear_ruin", x: 120, y: 84, block: 2 },
    { kind: "observatory", x: 140, y: 44, block: 0, scale: 1.2 },
    { kind: "aether_pylon", x: 100, y: 108, block: 1 },
    { kind: "lattice_obelisk", x: 84, y: 106, block: 2 },
  ],
  scatter: [
    { kind: "rock", count: 40, block: 1, scale: [0.7, 1.3] },
    { kind: "dead_tree", count: 20, block: 1 },
    { kind: "palm", count: 10, block: 1 },
    { kind: "bush", count: 30, block: 0, scale: [0.5, 0.9] },
    { kind: "brass_pipe", count: 14, block: 0, scale: [0.8, 1.2] },
  ],
  landmarks: [
    { id: "lm_sol_causeway_camp", name: "Causeway Head Camp", kind: "camp", x: 113, y: 9, note: "Arrival from the Dust Aqueduct." },
    { id: "lm_sol_causeway_road", name: "Revenant Road", kind: "farm", x: 72, y: 38, note: "Revenants walk the causeway they built." },
    { id: "lm_sol_causeway_sinks", name: "Seep Sinks", kind: "farm", x: 26, y: 86, note: "Seep pools where Lens-drones hover." },
    { id: "lm_sol_causeway_bed", name: "Colossus Bed", kind: "farm", x: 118, y: 82, note: "Three half-buried Colossi." },
    { id: "lm_sol_causeway_array", name: "Lens Array", kind: "ruin", x: 92, y: 108, note: "Lens-drones guard the approach to the Vault." },
    { id: "lm_sol_causeway_span", name: "Collapsed Span", kind: "lookout", x: 80, y: 92, note: "Where the causeway fell into the sand." },
    { id: "lm_sol_causeway_door", name: "Vault Door", kind: "gate", x: 43, y: 112, note: "Into the Heliostat Vault (Lv50-55); Key Prism required." },
  ],
  safe_areas: [[106, 4, 16, 12], [36, 102, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "revenant_road", name: "Revenant Road", rects: [[56, 24, 34, 28]], species: [{ monster_id: "mob_0055", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The Causeway's signature horde mid-band, on and beside the road: fast aggressive Revenants that form 40+ trains along the paving." },
    { id: "seep_sinks", name: "Seep Sinks", rects: [[8, 72, 36, 30]], species: [{ monster_id: "mob_0057", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "Lv50 Lens-drones at the top of the band round the seep pools in the west: a 7-cell ranged pocket, pulled out of line of sight so they bunch up." },
    { id: "colossus_bed", name: "Colossus Bed", rects: [[104, 70, 30, 26]], species: [{ monster_id: "mob_0056", weight: 1 }], target_alive: 3, respawn_sec: [150, 210],
      design_note: "Three Lv49 elites in open sand off the side road: slow giants with room to kite. Slow respawn makes them a hunt, and the Key Prism quest needs two." },
    { id: "lens_array", name: "Lens Array", rects: [[72, 100, 40, 16]], species: [{ monster_id: "mob_0057", weight: 60 }, { monster_id: "mob_0055", weight: 40 }], target_alive: 35, respawn_sec: [7, 16],
      design_note: "Lv50 Lens-drones (top of band) with Revenant escorts in a long strip before the Vault door: a 7-cell ranged threat that must be pulled behind the collapsed span." },
  ],
  npcs: [
    npc("npc_sol_causeway_scout", "Causeway Scout Liane", [108, 12], "S", "scout"),
    npc("npc_sol_vault_gatekeeper", "Vault Gatekeeper", [38, 105], "S", "guard"),
  ],
};

const heliostatVault: MapDesign = {
  id: "sol_dun_01", name: "Heliostat Vault", type: "dungeon", role: "Solenia's dungeon: a sealed vault of mirrors and lenses that focuses the desert sun, round the Sovereign's core chamber.",
  levels: [50, 55], size: [124, 108], arrival: [61, 11], ground: "metal", theme: "brass-lined halls of mirrors and light-shafts under the sand, a burning heliostat core",
  solid: true,
  carve: [
    { rect: [52, 0, 18, 22] },
    { ellipse: [30, 40, 18, 12] },
    { rect: [70, 34, 36, 22] },
    { ellipse: [40, 84, 16, 12] },
    { ellipse: [96, 84, 14, 14] },
  ],
  roads: [
    { points: [[61, 0], [61, 22], [48, 30], [30, 40]], width: 4, kind: "brass" },
    { points: [[61, 22], [80, 40], [88, 44]], width: 4, kind: "brass" },
    { points: [[30, 40], [36, 70], [40, 84]], width: 4, kind: "brass" },
    { points: [[40, 84], [70, 86], [96, 84]], width: 4, kind: "brass" },
    { points: [[88, 44], [96, 70], [96, 84]], width: 4, kind: "brass" },
  ],
  blockers: [
    { kind: "machine", shape: { rect: [76, 46, 6, 4] } }, // the focusing engine
  ],
  props: [
    { kind: "cave_mouth", x: 61, y: 1, block: 0, scale: 1.2 },
    { kind: "observatory", x: 96, y: 84, block: 0, scale: 1.8 }, // the heliostat
    { kind: "lattice_obelisk", x: 92, y: 80, block: 2 },
    { kind: "brass_pipe", x: 74, y: 40, block: 0 }, { kind: "brass_pipe", x: 100, y: 40, block: 0 },
    { kind: "aether_pylon", x: 56, y: 8, block: 1 },
  ],
  scatter: [
    { kind: "crystal", count: 30, block: 1, scale: [0.6, 1.2] },
    { kind: "brass_pipe", count: 15, block: 0, scale: [0.8, 1.2] },
    { kind: "gear_ruin", count: 8, block: 2 },
  ],
  landmarks: [
    { id: "lm_sol_vault_landing", name: "Vault Antechamber", kind: "camp", x: 61, y: 11, note: "Arrival; the Vault Keeper opens the way back." },
    { id: "lm_sol_vault_gallery", name: "Mirror Gallery", kind: "farm", x: 30, y: 40, note: "Mirrorguards packed among the mirrors." },
    { id: "lm_sol_vault_foundry", name: "Lens Foundry", kind: "ruin", x: 88, y: 44, note: "Where the Vault's lenses were ground; Mirrorguards hold it." },
    { id: "lm_sol_vault_shaft", name: "Shaft of Noon", kind: "farm", x: 40, y: 84, note: "A light-shaft held by Mirrorguards." },
    { id: "lm_sol_vault_core", name: "Heliostat Core", kind: "boss_arena", x: 96, y: 84, note: "The Heliostat Sovereign." },
  ],
  safe_areas: [[54, 5, 14, 12]],
  horde: { min_alive: 60, max_alive: 120 },
  pockets: [
    { id: "mirror_gallery", name: "Mirror Gallery", rects: [[18, 32, 26, 16]], species: [{ monster_id: "mob_0058", weight: 1 }], target_alive: 40, respawn_sec: [6, 14],
      design_note: "The densest pocket (~10 cells each): assist Mirrorguards shoulder to shoulder among the mirrors; a round hall to circle while AoE does the work." },
    { id: "lens_foundry", name: "Lens Foundry", rects: [[74, 37, 28, 16]], species: [{ monster_id: "mob_0058", weight: 1 }], target_alive: 30, respawn_sec: [10, 22],
      design_note: "Assist constructs round the focusing engine: one pull is the foundry, a 30-construct fight at the top of the band." },
    { id: "shaft_of_noon", name: "Shaft of Noon", rects: [[28, 77, 24, 14]], species: [{ monster_id: "mob_0058", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Assist Mirrorguards in the light-shaft: one pull brings the whole shaft, so drag them into the corridor where they bunch up." },
    { id: "heliostat_core", name: "Heliostat Core", rects: [[90, 78, 12, 12]], species: [{ monster_id: "mob_0059", weight: 1 }], target_alive: 1, respawn_sec: [300, 420],
      design_note: "Region boss, 5-7 minute respawn, alone under the heliostat." },
  ],
  npcs: [npc("npc_sol_vault_keeper", "Heliostat Vault Keeper", [65, 8], "S", "teleporter", { destinations: [["sol_town_01", 0], ["sol_fld_06", 0]] })],
};

// --- dialogue ------------------------------------------------------------------------

const dialogues: DialogueDef[] = [
  ["npc_sol_guild_registrar", "Welcome to Duskhar, Wayfarer. Every mirror in Solenia still turns to follow the sun, and something is aiming them.", "Start with the Saffron Dunes past the West Gate. The Sandcoils there won't trouble you unless you trouble them."],
  ["npc_sol_merchant", "Water's free in Duskhar, thanks to the canal. Everything else costs.", "Rations and tonics, brought up from Sylvara. Sell me your glass; the observatory buys it all."],
  ["npc_sol_healer", "Sunburn, glass cuts, heatstroke. Sit in the shade and drink this.", "Out there, rest at the camps. The sand gives nothing back."],
  ["npc_sol_teleporter", "The lattice reaches every camp in Solenia, back to Sylvara, and on to Port Merrow.", "Duskhar to the coast costs more. The crystals don't like salt air."],
  ["npc_sol_craftsman", "Sand and glass make good supplies if you know what to do with them.", "Jackal pelts render down for vital tonic. Scarab glass makes a decent focus draught."],
  ["npc_sol_west_gate_guard", "West Gate. The Saffron Dunes: Sandcoils on the crests and the glass, and jackals at the oasis.", "Keep to the pipeline trail and you'll find the way north."],
  ["npc_sol_north_gate_guard", "Caravan Gate. The road runs to Caravan Verge: brass kites overhead, glass scarabs in the washes.", "Watch the sky there. The kites still survey the road, and the scarabs come for anyone."],
  ["npc_sol_dunes_scout", "Sandcoils bask on the crests and won't bite unless you start it.", "Jackals at the oasis hunt as a pack. More Sandcoils sun themselves on the glass under the mesa."],
  ["npc_sol_verge_scout", "The caravanserai is where three roads meet. Nobody's traded there in years.", "Kites shoot from the heights. Pull them round the walls into reach."],
  ["npc_sol_flats_scout", "Lightning fused this whole plain to glass. The Sentries still walk their old lines on it.", "Basilisks call each other. Fight them one pack at a time."],
  ["npc_sol_dial_scout", "The Dial still keeps Aethrion time. The Acolytes keep the Wardens running.", "Kill the Acolytes first, or the Wardens just keep standing up."],
  ["npc_sol_dial_medic", "Rest in the shade of the tent. The Dial's stone holds the heat all night.", "The graveyard south of here is quieter if you need to catch your breath."],
  ["npc_sol_aqueduct_scout", "The canal's the last running water for leagues. The Striders live on it.", "Herd them along the channel walls before they scatter. They skate the sluices and the cistern too."],
  ["npc_sol_causeway_scout", "The causeway runs to the Vault. The surveyors who sealed it never left.", "Clear the Revenants and bring down two Colossi, and the Guild will trust you with the Key Prism."],
  ["npc_sol_vault_gatekeeper", "Key Prism only. Guild orders, and the door's orders too.", "The Sovereign sits under the heliostat, past the foundry. Shut it down."],
  ["npc_sol_vault_keeper", "The lift runs to Duskhar or the causeway.", "Don't look straight into the mirrors."],
].map(([npcId, ...lines]) => ({ id: npcId.replace(/^npc_/, "dlg_"), npc_id: npcId, lines }));

// --- the region ------------------------------------------------------------------------

export const solenia: RegionDesign = {
  region: {
    id: "sol", name: "Solenia", capital: "Duskhar", town_map_id: "sol_town_01", dungeon_map_id: "sol_dun_01", level_range: [25, 55],
    theme: "Desert, brass observatories and ancient canals: Aethrion's solar network, still aiming the sun.",
    ecology: "Reptiles and jackals on the dunes, glass insects and survey kites on the caravan roads, sandstone sentries and basilisks where lightning fused the sand, bronze constructs and their acolytes round the Sun Dial, water-striders on the last canal, and the dead surveyors and lens-drones of the Heliostat Vault on its causeway.",
    palette: { grass: "#c9a45c", dirt: "#d8b77a", accent: "#f0c050", fog: "#3a2a18" },
  },
  maps: [duskhar, saffronDunes, caravanVerge, glassFlats, sunDial, dustAqueduct, buriedCauseway, heliostatVault],
  links: [
    { label: "Duskhar West Gate ⇄ Saffron Dunes", a: { map: "sol_town_01", trigger: [0, 69, 3, 7], landing: [10, 72] }, b: { map: "sol_fld_01", trigger: [145, 50, 3, 7], landing: [137, 53] } },
    { label: "Duskhar Caravan Gate ⇄ Caravan Verge", a: { map: "sol_town_01", trigger: [43, 0, 7, 3], landing: [47, 10] }, b: { map: "sol_fld_02", trigger: [121, 80, 3, 7], landing: [113, 83] } },
    { label: "Saffron Dunes ⇄ Caravan Verge", a: { map: "sol_fld_01", trigger: [25, 0, 7, 3], landing: [30, 9] }, b: { map: "sol_fld_02", trigger: [70, 133, 7, 3], landing: [73, 125] } },
    { label: "Caravan Verge ⇄ Glass Flats", a: { map: "sol_fld_02", trigger: [36, 0, 7, 3], landing: [39, 9] }, b: { map: "sol_fld_03", trigger: [40, 97, 7, 3], landing: [44, 89] } },
    { label: "Glass Flats ⇄ Sun Dial", a: { map: "sol_fld_03", trigger: [157, 30, 3, 7], landing: [149, 35] }, b: { map: "sol_fld_04", trigger: [0, 96, 3, 7], landing: [10, 98] } },
    { label: "Sun Dial ⇄ Dust Aqueduct", a: { map: "sol_fld_04", trigger: [133, 24, 3, 7], landing: [125, 29] }, b: { map: "sol_fld_05", trigger: [0, 30, 3, 7], landing: [10, 34] } },
    { label: "Dust Aqueduct ⇄ Buried Causeway", a: { map: "sol_fld_05", trigger: [80, 145, 7, 3], landing: [83, 137] }, b: { map: "sol_fld_06", trigger: [110, 0, 7, 3], landing: [113, 9] } },
    // The Vault is sealed: the Key Prism from "The Sealed Door" opens it, so the boss comes after the Causeway chain.
    { label: "Buried Causeway ⇄ Heliostat Vault", requirements: ["item:itm_0150"], a: { map: "sol_fld_06", trigger: [40, 117, 7, 3], landing: [43, 109] }, b: { map: "sol_dun_01", trigger: [58, 0, 7, 3], landing: [61, 11] } },
  ],
  monsters,
  materials,
  items,
  shops: [{ id: "shop_sol", npc_id: "npc_sol_merchant", items: [{ item_id: "itm_0075", base_price: 8 }, { item_id: "itm_0076", base_price: 25 }, { item_id: "itm_0077", base_price: 30 }] }],
  recipes,
  quests,
  dialogues,
};
