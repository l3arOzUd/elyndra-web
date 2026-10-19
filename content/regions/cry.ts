// CRYSTALLIS — snow mountains, research labs and ice crystal (Lv 45-75).
//
// Follows the Lumeris conventions (see lum.ts): a research-city capital with
// the five services round a heat-vent plaza; one camp + scout at each field's
// main entrance; fields climb ~4 levels at a time; 3-4 pockets per field
// summing to 110-130 alive; every species placed by habitat.
//
// Geography (north up). Vaelspire is terraced up a frozen spire; its West
// Gate opens onto the treeline and its cable lift climbs to Snowcoil:
//
//   Blueglass Ridge ── Snowcoil ── (north) Prism Pass ── Mirror Ice
//         │               ┆ cable lift                      │
//     Frostline ──── Vaelspire                        White Circuit
//                                                           │ (archive door)
//                                                    Cryocore Archive
//
// The ecology climbs with altitude and with the Aethrion research works:
// insects, hares and light-wisps at the treeline; rams on the glass ridge;
// coolant serpents and gear-walkers in the coil valley; the pass's plough
// mech and archive vault keepers; reflections and great grazers on the
// mirror lake; conduit sentries and leaking data-ghosts round the White
// Circuit; and the Archive's own lancers and its Curator below.

import type { DialogueDef, ItemDef, NpcDef, Prop, QuestDef, RecipeDef } from "../../src/data/schema";
import { expToNext } from "../model";
import type { MapDesign, RegionDesign } from "../types";

const questExp = (level: number, share: number) => Math.round(expToNext(level) * share);

// --- monsters ------------------------------------------------------------------
// Fourteen species for a 30-level region (every band needs 3-4 residents
// within ±2): the four seed monsters at their seed levels, nine new regulars
// filling the gaps, one elite on the pass and the Archive's boss.

const monsters: RegionDesign["monsters"] = [
  {
    id: "mob_0024", name: "Frost Mite", level: 46, archetype: "swarm", family: "insect", element: "ice", behavior: "passive",
    mods: { hp: 0.9, def: 1.3 }, why: "A brittle crystal carapace: hard to cut (+30% DEF) but it shatters once cracked (-10% HP). Passive: the region's warm-up herd, grazing frost along the heat pipes.",
    drops: { common: "itm_0047", uncommon: "itm_0048" },
    ecology: "Crystal-shelled mites that cluster on Frostline's thawed strip where the Aethrion heat pipes keep moss alive; they feed and ignore everything else.",
    art_brief: "A palm-sized mite whose shell is a cluster of clear ice crystals, six thin blue legs, a faint glow inside; frost-white and pale cyan.",
  },
  {
    id: "mob_0070", name: "Rimehare", level: 48, archetype: "swarm", family: "beast", element: "wind", behavior: "flee",
    mods: { hp: 0.85, atk: 0.8, speed: 0.7 }, why: "A snow hare: frail (-15% HP), barely bites (-20% ATK), very fast (30% faster). Flees when hit, so packs scatter across the snow unless driven against the pines.",
    drops: { common: "itm_0190", uncommon: "itm_0191" },
    ecology: "Hares of Frostline's open snowfields above the treeline; they burrow in drifts and bolt from anything that hurts them.",
    art_brief: "A big white hare with frost-tipped ears and long whiskers rimed with ice, hind legs built for bounding; snow-white, silver-blue shadows.",
  },
  {
    id: "mob_0025", name: "Prism Wisp", level: 50, archetype: "ranged", family: "elemental", element: "ice", behavior: "aggressive",
    mods: { range: 6, def: 0.8 }, why: "A light caught in a crystal frame: it fires refracted beams from 6 cells, but the hollow frame is thin (-20% DEF). The region's first ranged threat.",
    drops: { common: "itm_0049", uncommon: "itm_0050", rare: "itm_0208" },
    ecology: "Floating lights that gather where ice refracts the most sun: over Frostline's frozen lake. Their frames sometimes set into a flawless prism.",
    art_brief: "A glowing orb inside an open lattice of hexagonal crystal, casting rainbow beams; white core, prismatic edges.",
  },
  {
    id: "mob_0071", name: "Glassback Ram", level: 52, archetype: "bruiser", family: "beast", element: "earth", behavior: "assist",
    mods: { atk: 1.15, speed: 0.9 }, why: "Charges downhill: +15% ATK and 10% faster than a standard bruiser. Assist: the flock defends its terraces together, the region's first bruiser pack.",
    drops: { common: "itm_0192", uncommon: "itm_0193", rare: "itm_0208" },
    ecology: "Mountain rams that graze lichen on Blueglass Ridge's terraces, spines and drifts; their horns grow volcanic glass, and old rams carry prisms in their horn cores.",
    art_brief: "A shaggy grey ram with curled horns of translucent blue glass and a back of glassy plates; breath steaming.",
  },
  {
    id: "mob_0026", name: "Icegear", level: 55, archetype: "construct", family: "construct", element: "ice", behavior: "aggressive",
    mods: { speed: 1.2, attack_speed: 0.85 }, why: "Walks on many slow legs (20% slower) but its grinding teeth bite fast (15% quicker attacks). The region's workhorse construct and an Aetherite source.",
    drops: { common: "itm_0051", uncommon: "itm_0052", extra: [{ item_id: "itm_0073", rate_bp: 400 }] },
    ecology: "Many-legged gear walkers that maintained Snowcoil's pumps and coolant huts; frozen joints made them hostile, and they cluster round the pump yard and wander the valley's lower slopes.",
    art_brief: "A spider-like walker with a body of stacked frozen gears and eight jointed brass legs, icicles hanging from the cogs; steel blue and brass.",
  },
  {
    id: "mob_0072", name: "Frostcoil Serpent", level: 57, archetype: "swarm", family: "reptile", element: "ice", behavior: "aggressive",
    mods: { hp: 1.15, speed: 0.85 }, why: "Long muscular bodies (+15% HP) that slither fast on ice (15% faster). The mid-region horde: aggressive and dense, the classic 40-mob train.",
    drops: { common: "itm_0194", uncommon: "itm_0195" },
    ecology: "Serpents that drank leaking coolant from Snowcoil's frozen coils and grew cold-blooded beyond nature; they nest in Snowcoil's coil trenches and its abandoned research huts.",
    art_brief: "A long pale-blue serpent with frost-ridged scales and a hood of thin ice fins, glowing coolant-cyan veins along its belly.",
  },
  {
    id: "mob_0073", name: "Glacier Juggernaut", level: 60, archetype: "elite", family: "construct", element: "earth", behavior: "aggressive",
    mods: { def: 1.2, atk: 1.1, speed: 1.3 }, why: "A snowplough mech: heavy plating (+20% DEF), crushing blade (+10% ATK), lumbering (30% slower) so players can kite it. The region's elite: two of them, on a long respawn.",
    drops: { common: "itm_0196", uncommon: "itm_0197", extra: [{ item_id: "itm_0073", rate_bp: 5000 }] },
    ecology: "Aethrion plough mechs that still clear Prism Pass on their old schedule, crushing anything on the road; they rest in the plough shed at the pass's east end.",
    art_brief: "A tracked mech twice a man's height with a huge wedge plough blade, a furnace glowing in its chest and frost-crusted armour; rust-red and steel.",
  },
  {
    id: "mob_0027", name: "Archive Keeper", level: 62, archetype: "construct", family: "construct", element: "ice", behavior: "assist",
    mods: { def: 1.3, hp: 0.9 }, why: "Crystal armour (+30% DEF) over a thin frame (-10% HP). Assist: keepers share an index, so one alarm calls the vault. Kept at its seed level: it guards the Archive's outlying vaults on the pass, not the Archive itself.",
    drops: { common: "itm_0053", uncommon: "itm_0054", extra: [{ item_id: "itm_0073", rate_bp: 600 }] },
    ecology: "Data-keeping automatons that tend the Archive's outlying vaults on Prism Pass: the sealed doors, the hollow below the road and the plough route itself.",
    art_brief: "A tall slender construct in faceted crystal armour, a glowing data-slate for a face, long fingers made for handling cores; ice-blue and silver.",
  },
  {
    id: "mob_0074", name: "Mirrorshade", level: 64, archetype: "support", family: "spirit", element: "shadow", behavior: "assist",
    mods: { hp: 0.85, range: 5 }, why: "A reflection given substance: thin (-15% HP) and it acts from 5 cells away. Support: it mends the grazers it walks among, so it must be killed first.",
    drops: { common: "itm_0198", uncommon: "itm_0199", rare: "itm_0208" },
    ecology: "Reflections that stepped out of Mirror Ice's polished surface where the lens array focused aether; they drift over the lake and its lens islands and defend whatever stands near them.",
    art_brief: "A humanoid silhouette of dark mirror glass, reflecting its surroundings warped, edges smoking into shadow; one bright eye-glint.",
  },
  {
    id: "mob_0075", name: "Hoarfrost Behemoth", level: 66, archetype: "bruiser", family: "beast", element: "ice", behavior: "passive",
    mods: { hp: 1.3, atk: 1.1, speed: 1.25 }, why: "A grazing giant: +30% HP, heavy tusks (+10% ATK), slow (25% slower). Passive: the herd ignores travellers, so players choose when to start a long bruiser fight.",
    drops: { common: "itm_0200", uncommon: "itm_0201" },
    ecology: "Woolly grazers that dig lichen from the shores of Mirror Ice and the edges of its open leads, where the moving water keeps the snow soft.",
    art_brief: "A mammoth-sized beast with a hump of frost-matted wool, four curling tusks and icicles in its fur; white and slate grey.",
  },
  {
    id: "mob_0076", name: "Cryo Sentry", level: 68, archetype: "construct", family: "construct", element: "ice", behavior: "aggressive",
    mods: { range: 3, atk: 0.9 }, why: "A frost-lance turret on legs: reaches 3 cells, -10% ATK to keep the reach fair. Guards the White Circuit's pylons, its west arc and the vent breach.",
    drops: { common: "itm_0202", uncommon: "itm_0203", extra: [{ item_id: "itm_0073", rate_bp: 500 }] },
    ecology: "Security frames of the White Circuit, the ring conduit that powers the Archive; they patrol its pylons and arcs and chase whatever leaks from the vent breach.",
    art_brief: "A tripod construct with a long frost lance for a head, a cryo cell glowing in its chest, frost venting from its joints; white enamel and cyan.",
  },
  {
    id: "mob_0077", name: "Archive Specter", level: 71, archetype: "swarm", family: "spirit", element: "shadow", behavior: "aggressive",
    mods: { hp: 0.9, speed: 0.8 }, why: "Data ghosts: insubstantial (-10% HP), fast (20% faster). The White Circuit's dense aggressive swarm and the region's main open-field AoE farm.",
    drops: { common: "itm_0204", uncommon: "itm_0205" },
    ecology: "Fragments of recorded minds that leaked out of the Archive's cracked data-cores; they seep out through the White Circuit's vent breach and swarm the warm snowdrifts over the conduit.",
    art_brief: "A flickering translucent figure made of scrolling glyph-light, trailing like smoke, face a blank of static; violet and cold white.",
  },
  {
    id: "mob_0078", name: "Cryo Lancer", level: 73, archetype: "ranged", family: "construct", element: "ice", behavior: "aggressive",
    mods: { range: 7, attack_speed: 1.2 }, why: "Fires ice lances from 7 cells but must recharge (20% slower attacks). The region's top ranged threat, in the Archive's cryo wards where pillars give cover.",
    drops: { common: "itm_0206", uncommon: "itm_0207" },
    ecology: "Guardian frames of the Archive; they hold the cryo wards, the cold stacks and the index gallery against anything that moves.",
    art_brief: "A slim armoured construct with a long rifle-like lance arm, a prism focus at its tip, frosted visor; white and pale blue.",
  },
  {
    id: "mob_0079", name: "Cryocore Curator", level: 75, archetype: "boss", family: "construct", element: "ice", behavior: "aggressive",
    mods: { def: 1.2, hp: 1.1 }, why: "The Archive's armoured heart: +20% DEF and +10% HP make it the longest fight in the game so far, at the region's cap.",
    drops: { common: "itm_0204", uncommon: "itm_0054", rare: "itm_0209", extra: [{ item_id: "itm_0073", rate_bp: 10000, qty: [3, 5] }, { item_id: "itm_0208", rate_bp: 2500 }] },
    ecology: "The Archive's curator intelligence, wound round the cryocore in the Curator's Vault; it freezes anything that might disturb its records, which is why Crystallis's machines turned hostile.",
    art_brief: "A towering construct of crystal shelving and brass arms around a glowing blue cryocore, data-slates orbiting it like moons, a frost crown.",
  },
];

// --- items -----------------------------------------------------------------------

const materials: RegionDesign["materials"] = [
  { id: "itm_0047", name: "Frost Mite Fragment", level: 46, tier: "common", description: "A crystal splinter from a Frost Mite's shell." },
  { id: "itm_0048", name: "Frost Mite Core", level: 46, tier: "uncommon", description: "A mite's glowing core, full of a slow-thawing gel." },
  { id: "itm_0049", name: "Prism Wisp Fragment", level: 50, tier: "common", description: "A shard of a wisp's crystal frame; it splits light." },
  { id: "itm_0050", name: "Prism Wisp Core", level: 50, tier: "uncommon", description: "A wisp's caught light, still warm in its frame." },
  { id: "itm_0051", name: "Icegear Fragment", level: 55, tier: "common", description: "A frozen cog from an Icegear's body." },
  { id: "itm_0052", name: "Icegear Core", level: 55, tier: "uncommon", description: "An Icegear's drive gear-train, still meshing." },
  { id: "itm_0053", name: "Archive Keeper Fragment", level: 62, tier: "common", description: "A facet of a keeper's crystal armour." },
  { id: "itm_0054", name: "Archive Keeper Core", level: 62, tier: "uncommon", description: "A keeper's data-slate; glyphs still scroll across it." },
  { id: "itm_0190", name: "Rimehare Haunch", level: 48, tier: "common", description: "Lean frozen meat. The hunters' staple on the treeline." },
  { id: "itm_0191", name: "Frost Whisker", level: 48, tier: "uncommon", description: "A Rimehare whisker rimed with ice that never melts." },
  { id: "itm_0192", name: "Glassback Fleece", level: 52, tier: "common", description: "Coarse ram wool, glass chips caught in it." },
  { id: "itm_0193", name: "Blueglass Horn", level: 52, tier: "uncommon", description: "A ram's horn grown of clear blue volcanic glass." },
  { id: "itm_0194", name: "Coilscale", level: 57, tier: "common", description: "A frost-ridged serpent scale, cold to the touch." },
  { id: "itm_0195", name: "Coolant Gland", level: 57, tier: "uncommon", description: "A serpent gland full of Aethrion coolant." },
  { id: "itm_0196", name: "Plough Plate", level: 60, tier: "common", description: "A dented armour plate from a Glacier Juggernaut." },
  { id: "itm_0197", name: "Juggernaut Drive Coil", level: 60, tier: "uncommon", description: "The furnace coil that drives a plough mech's tracks." },
  { id: "itm_0198", name: "Silvered Shard", level: 64, tier: "common", description: "A splinter of a Mirrorshade; it reflects things that are not there." },
  { id: "itm_0199", name: "Shade Mirror", level: 64, tier: "uncommon", description: "An unbroken palm of mirror-glass from a Mirrorshade's heart." },
  { id: "itm_0200", name: "Hoarfrost Wool", level: 66, tier: "common", description: "Frost-matted wool from a Behemoth's hump." },
  { id: "itm_0201", name: "Behemoth Tusk", level: 66, tier: "uncommon", description: "A curling tusk, ivory veined with ice." },
  { id: "itm_0202", name: "Sentry Casing", level: 68, tier: "common", description: "White enamel casing from a Cryo Sentry." },
  { id: "itm_0203", name: "Cryo Cell", level: 68, tier: "uncommon", description: "A sentry's power cell, frost forming on it in warm air." },
  { id: "itm_0204", name: "Data Strand", level: 71, tier: "common", description: "A thread of glyph-light that an Archive Specter left behind." },
  { id: "itm_0205", name: "Specter Memory Core", level: 71, tier: "uncommon", description: "A tiny crystal holding someone's recorded memory." },
  { id: "itm_0206", name: "Lancer Icetip", level: 73, tier: "common", description: "A spent ice lance, sharp as glass." },
  { id: "itm_0207", name: "Focus Prism", level: 73, tier: "uncommon", description: "A Cryo Lancer's aiming prism." },
  { id: "itm_0208", name: "Everfrost Prism", level: 55, tier: "rare", description: "A prism of ice that never melts. Crystallis's prize: wisps, rams and mirrorshades carry them, one in hundreds." },
  { id: "itm_0209", name: "Cryocore Heart", level: 75, tier: "rare", description: "A shard of the Archive's cryocore, holding a cold no furnace can touch." },
];

// No new equipment beyond Lumeris (deferred); the region's items are its
// materials plus the shared consumables.
const items: ItemDef[] = [];

const recipes: RecipeDef[] = [
  // Frozen hare haunch, smoked over the heat vents.
  { id: "rcp_cry_hare_ration", npc_id: "npc_cry_craftsman", output: { item_id: "itm_0075", qty: 10 }, inputs: [{ item_id: "itm_0190", qty: 4 }], currency: 20 },
  // Mite-core thaw gel seals wounds; hare broth carries it.
  { id: "rcp_cry_thawgel_tonic", npc_id: "npc_cry_craftsman", output: { item_id: "itm_0076", qty: 6 }, inputs: [{ item_id: "itm_0048", qty: 1 }, { item_id: "itm_0190", qty: 2 }], currency: 40 },
  // Wisp crystal dust, the researchers' focus draught.
  { id: "rcp_cry_wisp_focus", npc_id: "npc_cry_craftsman", output: { item_id: "itm_0077", qty: 6 }, inputs: [{ item_id: "itm_0049", qty: 3 }], currency: 40 },
];

// --- quests: a chain that walks the player through every map in level order ------

const R = "npc_cry_guild_registrar";
const quests: QuestDef[] = [
  { id: "q_cry_intro", title: "Crystallis: First Survey", region_id: "cry", giver_npc_id: R, turn_in_npc_id: R, min_level: 45, prerequisite: null,
    objectives: [{ type: "kill", monster_id: "mob_0024", count: 60 }],
    rewards: { base_exp: questExp(45, 0.5), currency: 1600, items: [{ item_id: "itm_0075", qty: 20 }, { item_id: "itm_0076", qty: 10 }] },
    summary: "Thin the Frost Mites on Frostline's thaw strip: a passive warm-up that shows a newcomer from Thalassia how the cold changes a fight." },
  { id: "q_cry_frostline", title: "Lights on the Lake", region_id: "cry", giver_npc_id: "npc_cry_frostline_scout", turn_in_npc_id: "npc_cry_frostline_scout", min_level: 47, prerequisite: "q_cry_intro",
    objectives: [{ type: "kill", monster_id: "mob_0070", count: 80 }, { type: "kill", monster_id: "mob_0025", count: 60 }],
    rewards: { base_exp: questExp(47, 0.45), currency: 1900, items: [{ item_id: "itm_0077", qty: 10 }] },
    summary: "Herd the fleeing Rimehares on the snowfield and break the Prism Wisps' beams over the frozen lake: flee and ranged in one field." },
  { id: "q_cry_blueglass", title: "Glass Horns", region_id: "cry", giver_npc_id: "npc_cry_blueglass_scout", turn_in_npc_id: "npc_cry_blueglass_scout", min_level: 50, prerequisite: "q_cry_frostline",
    objectives: [{ type: "visit", map_id: "cry_fld_02", count: 1 }, { type: "kill", monster_id: "mob_0071", count: 60 }, { type: "collect", item_id: "itm_0192", count: 15 }],
    rewards: { base_exp: questExp(50, 0.4), currency: 2300, items: [{ item_id: "itm_0076", qty: 12 }] },
    summary: "Climb the ridge and take on the assisting ram flocks; the fleece is the researchers' insulation." },
  { id: "q_cry_snowcoil", title: "Coolant in the Trenches", region_id: "cry", giver_npc_id: "npc_cry_snowcoil_scout", turn_in_npc_id: "npc_cry_snowcoil_scout", min_level: 54, prerequisite: "q_cry_blueglass",
    objectives: [{ type: "kill", monster_id: "mob_0072", count: 150 }, { type: "kill", monster_id: "mob_0026", count: 40 }],
    rewards: { base_exp: questExp(54, 0.4), currency: 2800, items: [{ item_id: "itm_0073", qty: 2 }, { item_id: "itm_0077", qty: 10 }] },
    summary: "The Frostcoil Serpent horde is the region's signature train: 150 kills is three or four full pulls through the coil trenches." },
  { id: "q_cry_prism_pass", title: "Keep the Pass Open", region_id: "cry", giver_npc_id: "npc_cry_prism_pass_scout", turn_in_npc_id: "npc_cry_prism_pass_scout", min_level: 58, prerequisite: "q_cry_snowcoil",
    objectives: [{ type: "kill", monster_id: "mob_0027", count: 50 }, { type: "kill", monster_id: "mob_0073", count: 2 }],
    rewards: { base_exp: questExp(58, 0.45), currency: 3300, items: [{ item_id: "itm_0073", qty: 3 }] },
    summary: "Break the keepers' alarm at the vault doors and stop the plough mechs that crush caravans: the region's elite fight." },
  { id: "q_cry_mirror_ice", title: "What the Lake Reflects", region_id: "cry", giver_npc_id: "npc_cry_mirror_ice_scout", turn_in_npc_id: "npc_cry_mirror_ice_scout", min_level: 62, prerequisite: "q_cry_prism_pass",
    objectives: [{ type: "kill", monster_id: "mob_0074", count: 80 }, { type: "kill", monster_id: "mob_0075", count: 40 }, { type: "collect", item_id: "itm_0198", count: 10 }],
    rewards: { base_exp: questExp(62, 0.4), currency: 3800, items: [{ item_id: "itm_0076", qty: 15 }] },
    summary: "Kill the Mirrorshades that heal everything around them, then the passive Behemoths they protect. Silvered shards go to the lens researchers." },
  { id: "q_cry_white_circuit", title: "Breach in the Circuit", region_id: "cry", giver_npc_id: "npc_cry_white_circuit_scout", turn_in_npc_id: "npc_cry_white_circuit_scout", min_level: 66, prerequisite: "q_cry_mirror_ice",
    objectives: [{ type: "kill", monster_id: "mob_0076", count: 80 }, { type: "kill", monster_id: "mob_0077", count: 60 }],
    rewards: { base_exp: questExp(66, 0.4), currency: 4400, items: [{ item_id: "itm_0073", qty: 3 }, { item_id: "itm_0077", qty: 15 }] },
    summary: "Clear the conduit sentries and the specters seeping from the vent breach. The breach leads to the Archive door." },
  { id: "q_cry_cryocore", title: "The Curator's Vault", region_id: "cry", giver_npc_id: "npc_cry_archive_door_warden", turn_in_npc_id: R, min_level: 70, prerequisite: "q_cry_white_circuit",
    objectives: [{ type: "kill", monster_id: "mob_0079", count: 1 }],
    rewards: { base_exp: questExp(70, 0.8), currency: 9000, items: [{ item_id: "itm_0073", qty: 5 }, { item_id: "itm_0208", qty: 1 }] },
    summary: "Shut down the Cryocore Curator and report to Vaelspire. The thaw it brings opens the passes down to Emberfall." },
];

// --- maps --------------------------------------------------------------------------

const npc = (id: string, name: string, position: [number, number], facing: NpcDef["facing"], role: NpcDef["role"], extra: Partial<NpcDef> = {}): Omit<NpcDef, "map_id"> =>
  ({ id, name, position, facing, role, dialogue_id: id.replace(/^npc_/, "dlg_"), shop_id: null, ...extra });

const fieldCost = (minLevel: number) => 10 + 4 * minLevel;
/** Capital-to-capital transit, priced by the destination region's minimum level. */
const capitalCost = (destMinLevel: number) => 300 + 15 * destMinLevel;

const vaelspire: MapDesign = {
  id: "cry_town_01", name: "Vaelspire", type: "town", role: "Region capital: research city with services, quest hub, crafting, the cable lift to Snowcoil and transit to Port Merrow and Cindervale.",
  levels: [45, 75], size: [124, 140], arrival: [62, 85], ground: "snow", theme: "a research city terraced up a frozen spire, heated brass streets round a heat-vent plaza",
  border: { width: 3, kind: "cliff" },
  roads: [
    { points: [[62, 78], [0, 82]], width: 5, kind: "brass" }, // West Gate street
    { points: [[62, 78], [62, 40], [66, 0]], width: 4, kind: "brass" }, // Lift Street
    { points: [[62, 78], [96, 96], [104, 120]], width: 3, kind: "stone" }, // lab quarter
    { points: [[62, 78], [40, 110]], width: 3, kind: "stone" },
    { points: [[62, 40], [92, 34]], width: 3, kind: "stone" }, // Observatory Terrace
  ],
  blockers: [
    { kind: "building", shape: { rect: [70, 50, 18, 12] } }, // Guild Hall
    { kind: "building", shape: { rect: [28, 60, 14, 10] } }, // Medic house
    { kind: "building", shape: { rect: [86, 72, 16, 12] } }, // Artificer's lab-forge
    { kind: "building", shape: { rect: [76, 106, 16, 12] } }, // research lab
    { kind: "building", shape: { rect: [12, 20, 14, 10] } },
    { kind: "building", shape: { rect: [30, 30, 12, 10] } },
    { kind: "building", shape: { rect: [96, 14, 14, 10] } },
    { kind: "building", shape: { rect: [12, 98, 14, 10] } },
    { kind: "building", shape: { rect: [100, 46, 14, 10] } },
    { kind: "building", shape: { rect: [26, 118, 12, 10] } },
    { kind: "ice", shape: { ellipse: [104, 128, 8, 5] } },
  ],
  props: [
    { kind: "fountain", x: 62, y: 78, block: 3, scale: 1.3 }, // the heat vent
    { kind: "aether_pylon", x: 54, y: 70, block: 1 }, { kind: "aether_pylon", x: 70, y: 70, block: 1 },
    { kind: "aether_pylon", x: 54, y: 86, block: 1 }, { kind: "aether_pylon", x: 70, y: 86, block: 1 },
    { kind: "hall", x: 79, y: 55, block: 0, scale: 1.4 },
    { kind: "observatory", x: 100, y: 32, block: 4, scale: 1.6 },
    { kind: "market_stall", x: 44, y: 72, block: 2 }, { kind: "market_stall", x: 48, y: 72, block: 2 },
    { kind: "transit_gate", x: 44, y: 96, block: 3 },
    { kind: "furnace", x: 82, y: 76, block: 2 }, { kind: "anvil", x: 84, y: 80, block: 1 }, { kind: "workshop", x: 94, y: 78, block: 0 },
    { kind: "crystal", x: 20, y: 60, block: 1 }, { kind: "crystal", x: 110, y: 70, block: 1 }, { kind: "ice_spike", x: 10, y: 40, block: 1 },
    { kind: "lamp_post", x: 56, y: 60, block: 1 }, { kind: "lamp_post", x: 68, y: 60, block: 1 }, { kind: "lamp_post", x: 30, y: 85, block: 1 },
    { kind: "lamp_post", x: 69, y: 20, block: 1 }, { kind: "lamp_post", x: 18, y: 77, block: 1 },
    { kind: "statue", x: 62, y: 92, block: 2 },
    { kind: "pine", x: 14, y: 50, block: 1 }, { kind: "pine", x: 20, y: 42, block: 1 }, { kind: "pine", x: 110, y: 100, block: 1 },
    { kind: "pine", x: 116, y: 60, block: 1 }, { kind: "pine", x: 8, y: 130, block: 1 }, { kind: "pine", x: 46, y: 130, block: 1 }, { kind: "pine", x: 116, y: 132, block: 1 },
  ],
  scatter: [],
  landmarks: [
    { id: "lm_cry_vael_plaza", name: "Heat-Vent Plaza", kind: "plaza", x: 62, y: 78, note: "Respawn point; Aethrion heat rises from the vent and keeps the plaza clear of snow." },
    { id: "lm_cry_vael_guild", name: "Wayfarer Guild, Vaelspire Chapter", kind: "plaza", x: 79, y: 55, note: "Quest hub." },
    { id: "lm_cry_vael_observatory", name: "Spire Observatory", kind: "lookout", x: 100, y: 32, note: "The researchers' telescope, trained on the Archive." },
    { id: "lm_cry_vael_west_gate", name: "West Gate", kind: "gate", x: 6, y: 82, note: "To Frostline (Lv45-50)." },
    { id: "lm_cry_vael_lift", name: "Cable Lift", kind: "gate", x: 66, y: 6, note: "Up to Snowcoil (Lv53-58)." },
    { id: "lm_cry_vael_transit", name: "Transit Station", kind: "plaza", x: 44, y: 96, note: "Paid travel to field camps, Port Merrow and Cindervale." },
    { id: "lm_cry_vael_labforge", name: "Lab-Forge", kind: "plaza", x: 94, y: 78, note: "The Artificer's workshop." },
  ],
  safe_areas: [[0, 0, 124, 140]],
  pockets: [],
  npcs: [
    npc("npc_cry_guild_registrar", "Vaelspire Guild Registrar", [79, 64], "N", "guild_registrar"),
    npc("npc_cry_merchant", "Vaelspire Supply Merchant", [51, 74], "N", "merchant", { shop_id: "shop_cry_supply" }),
    npc("npc_cry_healer", "Vaelspire Field Medic", [44, 64], "W", "healer"),
    npc("npc_cry_teleporter", "Vaelspire Transit Operator", [48, 92], "SW", "teleporter", {
      destinations: [
        ["cry_fld_01", fieldCost(45)], ["cry_fld_02", fieldCost(49)], ["cry_fld_03", fieldCost(53)],
        ["cry_fld_04", fieldCost(57)], ["cry_fld_05", fieldCost(61)], ["cry_fld_06", fieldCost(65)],
        ["tha_town_01", capitalCost(35)], ["emb_town_01", capitalCost(60)],
      ],
    }),
    npc("npc_cry_craftsman", "Vaelspire Artificer", [83, 85], "NE", "craftsman"),
    npc("npc_cry_west_gate_guard", "West Gate Warden", [9, 76], "E", "guard"),
    npc("npc_cry_lift_warden", "Cable Lift Warden", [58, 8], "S", "guard"),
  ],
};

const heatPipes: Prop[] = [[82, 66], [90, 70], [98, 74], [106, 78], [86, 80]].map(([x, y]) => ({ kind: "brass_pipe" as const, x, y, block: 0 }));

const frostline: MapDesign = {
  id: "cry_fld_01", name: "Frostline", type: "field", role: "First field: the treeline where pines give way to snow; passive mites on the thaw strip, fleeing hares, wisps over the lake.",
  levels: [45, 50], size: [148, 100], arrival: [137, 55], ground: "snow", theme: "the treeline above Vaelspire, a frozen lake and a strip of moss kept thawed by Aethrion heat pipes",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[147, 55], [120, 56], [96, 50], [74, 58]], width: 4, kind: "dirt" },
    { points: [[74, 58], [50, 40], [30, 22], [27, 0]], width: 4, kind: "dirt" },
    { points: [[74, 58], [78, 84]], width: 3, kind: "dirt" },
    { points: [[96, 50], [104, 20]], width: 3, kind: "dirt" },
  ],
  blockers: [
    { kind: "water", shape: { ellipse: [38, 78, 10, 6] } }, // the spring-fed lake centre that never freezes
    { kind: "forest", shape: { ellipse: [116, 84, 12, 8] } },
    { kind: "forest", shape: { ellipse: [12, 40, 6, 8] } },
    { kind: "rock", shape: { ellipse: [62, 22, 4, 3] } },
  ],
  props: [
    ...heatPipes,
    { kind: "aether_pylon", x: 100, y: 22, block: 1 }, // survey pylon
    { kind: "rune_stone", x: 70, y: 64, block: 1 },
    { kind: "house", x: 44, y: 24, block: 2 }, // survey hut
    { kind: "gear_ruin", x: 66, y: 14, block: 2 },
    { kind: "tent", x: 140, y: 50, block: 2 }, { kind: "tent", x: 33, y: 7, block: 2 },
    { kind: "lamp_post", x: 132, y: 60, block: 1 },
  ],
  scatter: [
    { kind: "pine", count: 110, block: 1, scale: [0.8, 1.4] },
    { kind: "rock", count: 30, block: 1, scale: [0.7, 1.2] },
    { kind: "ice_spike", count: 25, area: [12, 56, 50, 36], block: 1, scale: [0.6, 1] },
    { kind: "bush", count: 40, block: 0, scale: [0.6, 1] },
  ],
  landmarks: [
    { id: "lm_cry_frost_camp", name: "Treeline Camp", kind: "camp", x: 137, y: 55, note: "Arrival from Vaelspire's West Gate." },
    { id: "lm_cry_frost_crossroads", name: "Survey Crossroads", kind: "crossroads", x: 74, y: 58, note: "The old survey line meets the lake path." },
    { id: "lm_cry_thaw_strip", name: "Thaw Strip", kind: "farm", x: 94, y: 74, note: "Frost Mites on the heat-pipe moss." },
    { id: "lm_cry_snowfield", name: "Snowfield", kind: "farm", x: 116, y: 24, note: "Rimehare burrows." },
    { id: "lm_cry_frozen_lake", name: "Frozen Lake", kind: "farm", x: 38, y: 78, note: "Prism Wisps hover over the ice." },
    { id: "lm_cry_survey_line", name: "Survey Line", kind: "ruin", x: 66, y: 14, note: "Aethrion survey gear, half buried." },
    { id: "lm_cry_frost_north", name: "Ridge Path", kind: "gate", x: 27, y: 9, note: "To Blueglass Ridge (Lv49-54)." },
  ],
  safe_areas: [[130, 48, 14, 14], [20, 4, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "thaw_strip", name: "Thaw Strip", rects: [[78, 62, 32, 24]], species: [{ monster_id: "mob_0024", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "Passive mites packed along the heat pipes (~19 cells each), close to the arrival camp: the warm-up herd for players arriving from Thalassia." },
    { id: "snowfield", name: "Snowfield", rects: [[96, 10, 40, 30]], species: [{ monster_id: "mob_0070", weight: 1 }], target_alive: 35, respawn_sec: [6, 14],
      design_note: "Open snow bounded by the north forest edge: fleeing hares run into the trees and bunch there." },
    { id: "lake_shore", name: "Frozen Lake", rects: [[14, 58, 48, 32]], species: [{ monster_id: "mob_0025", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Ranged wisps at the top of the band (Lv50) over the ice; the open water in the middle breaks their line, so players pull them round the shore." },
    { id: "survey_line", name: "Survey Line", rects: [[50, 8, 40, 22]], species: [{ monster_id: "mob_0024", weight: 50 }, { monster_id: "mob_0070", weight: 50 }], target_alive: 20, respawn_sec: [8, 16],
      design_note: "Mites and hares among the survey ruins on the way north: a quieter mixed pocket of passive and fleeing monsters." },
  ],
  npcs: [npc("npc_cry_frostline_scout", "Frostline Scout Edda", [134, 51], "W", "scout")],
};

const blueglassRidge: MapDesign = {
  id: "cry_fld_02", name: "Blueglass Ridge", type: "field", role: "A knife-edge ridge of blue volcanic glass held by Glassback Ram flocks: on the terraces, among the crystal spines, in the windscour drifts and round the obelisks.",
  levels: [49, 54], size: [108, 142], arrival: [43, 132], ground: "snow", theme: "a wind-scoured ridge of blue volcanic glass with crystal spines and lattice obelisks",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[43, 141], [44, 120], [52, 100], [50, 76]], width: 4, kind: "obsidian" },
    { points: [[50, 76], [66, 58], [80, 44], [107, 43]], width: 4, kind: "obsidian" },
    { points: [[50, 76], [34, 60], [38, 30]], width: 3, kind: "obsidian" },
    { points: [[50, 76], [78, 96], [90, 118]], width: 3, kind: "obsidian" },
  ],
  blockers: [
    { kind: "cliff", shape: { poly: [[4, 20], [22, 30], [18, 80], [24, 100], [16, 120], [4, 124]] } }, // west flank
    { kind: "chasm", shape: { ellipse: [82, 70, 7, 9] } },
    { kind: "crystal", shape: { ellipse: [62, 30, 4, 3] } },
    { kind: "crystal", shape: { ellipse: [86, 112, 4, 3] } },
    { kind: "crystal", shape: { ellipse: [94, 86, 5, 4] } },
  ],
  props: [
    { kind: "lattice_obelisk", x: 84, y: 18, block: 2, scale: 1.4 }, { kind: "lattice_obelisk", x: 92, y: 26, block: 2, scale: 1.2 },
    { kind: "crystal", x: 40, y: 22, block: 1, scale: 1.4 }, { kind: "crystal", x: 52, y: 18, block: 1, scale: 1.2 },
    { kind: "rune_stone", x: 58, y: 76, block: 1 },
    { kind: "aether_pylon", x: 46, y: 90, block: 1 },
    { kind: "tent", x: 49, y: 129, block: 2 }, { kind: "tent", x: 99, y: 38, block: 2 },
  ],
  scatter: [
    { kind: "crystal", count: 60, block: 1, scale: [0.6, 1.3] },
    { kind: "pine", count: 40, block: 1, scale: [0.8, 1.2] },
    { kind: "rock", count: 40, block: 1, scale: [0.7, 1.3] },
    { kind: "ice_spike", count: 30, block: 1, scale: [0.6, 1.1] },
  ],
  landmarks: [
    { id: "lm_cry_ridge_camp", name: "Ridge Foot Camp", kind: "camp", x: 43, y: 132, note: "Arrival from Frostline." },
    { id: "lm_cry_ridge_saddle", name: "Glass Saddle", kind: "crossroads", x: 50, y: 76, note: "Four paths meet on the saddle." },
    { id: "lm_cry_ram_terraces", name: "Ram Terraces", kind: "farm", x: 78, y: 112, note: "Glassback Ram flocks." },
    { id: "lm_cry_glass_spines", name: "Glass Spines", kind: "farm", x: 46, y: 24, note: "Glassback Rams among crystal spines." },
    { id: "lm_cry_windscour", name: "Windscour", kind: "farm", x: 36, y: 98, note: "Glassback Rams in the drifts below the west cliffs." },
    { id: "lm_cry_obelisk_field", name: "Obelisk Field", kind: "ruin", x: 86, y: 20, note: "Aethrion lattice obelisks; Glassback Rams shelter among them." },
    { id: "lm_cry_ridge_chasm", name: "Glass Chasm", kind: "lookout", x: 82, y: 70, note: "A rift in the ridge, blue light far below." },
    { id: "lm_cry_ridge_east", name: "Coil Road", kind: "gate", x: 97, y: 43, note: "To Snowcoil (Lv53-58)." },
  ],
  safe_areas: [[36, 126, 16, 12], [90, 36, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "ram_terraces", name: "Ram Terraces", rects: [[60, 100, 38, 28]], species: [{ monster_id: "mob_0071", weight: 1 }], target_alive: 35, respawn_sec: [8, 18],
      design_note: "Assisting ram flocks on the south terraces, mid-band (Lv52): the region's first bruiser pack, best pulled whole and burned with AoE." },
    { id: "glass_spines", name: "Glass Spines", rects: [[26, 12, 40, 26]], species: [{ monster_id: "mob_0071", weight: 1 }], target_alive: 30, respawn_sec: [7, 15],
      design_note: "Assisting rams among crystal spines, mid-band (Lv52); the spines split the flock into small groups, so players pull them a few at a time." },
    { id: "windscour", name: "Windscour", rects: [[26, 82, 22, 34]], species: [{ monster_id: "mob_0071", weight: 1 }], target_alive: 25, respawn_sec: [6, 14],
      design_note: "Rams (Lv52) in a narrow strip between the west cliff and the road: the assisting flock charges as one and pins itself against the cliff." },
    { id: "obelisk_field", name: "Obelisk Field", rects: [[70, 8, 30, 24]], species: [{ monster_id: "mob_0071", weight: 1 }], target_alive: 30, respawn_sec: [10, 20],
      design_note: "Assisting rams sheltering round the obelisks near the east exit: the last flock before Snowcoil, pulled whole between the stones." },
  ],
  npcs: [npc("npc_cry_blueglass_scout", "Ridge Scout Haldor", [47, 128], "N", "scout")],
};

const coilRibs: Prop[] = [[84, 48], [84, 60], [96, 48], [96, 60], [108, 54]].map(([x, y]) => ({ kind: "gear_ruin" as const, x, y, block: 0, scale: 1.2 }));

const snowcoil: MapDesign = {
  id: "cry_fld_03", name: "Snowcoil", type: "field", role: "A valley wound with frozen Aethrion coolant coils: the serpent horde in the trenches and gear walkers at the pump yard and on the lower slopes. The cable lift from Vaelspire arrives here.",
  levels: [53, 58], size: [138, 130], arrival: [69, 120], ground: "snow", theme: "a valley of giant frozen coolant coils round a dead pump, steam vents and research huts",
  border: { width: 4, kind: "ice" },
  roads: [
    { points: [[0, 63], [30, 64], [56, 70]], width: 4, kind: "brass" },
    { points: [[69, 129], [69, 100], [56, 70]], width: 4, kind: "brass" },
    { points: [[56, 70], [60, 40], [90, 24], [103, 0]], width: 4, kind: "brass" },
    { points: [[69, 100], [100, 90], [124, 96]], width: 3, kind: "stone" },
  ],
  blockers: [
    { kind: "machine", shape: { rect: [64, 52, 12, 12] } }, // the dead central pump
    { kind: "machine", shape: { rect: [84, 46, 2, 18] } }, // frozen coils
    { kind: "machine", shape: { rect: [96, 46, 2, 18] } },
    { kind: "ice", shape: { rect: [80, 74, 24, 3] } },
    { kind: "rock", shape: { ellipse: [20, 100, 5, 4] } },
    { kind: "ice", shape: { ellipse: [116, 74, 6, 4] } },
  ],
  props: [
    ...coilRibs,
    { kind: "brass_pipe", x: 80, y: 44, block: 0 }, { kind: "brass_pipe", x: 92, y: 66, block: 0 }, { kind: "brass_pipe", x: 104, y: 50, block: 0 },
    { kind: "aether_pylon", x: 30, y: 60, block: 1 },
    { kind: "house", x: 106, y: 100, block: 2 }, { kind: "house", x: 116, y: 108, block: 2 }, { kind: "house", x: 100, y: 112, block: 2 },
    { kind: "transit_gate", x: 74, y: 122, block: 3 }, // cable lift station
    { kind: "tent", x: 8, y: 58, block: 2 }, { kind: "tent", x: 109, y: 8, block: 2 },
    { kind: "gear_ruin", x: 30, y: 22, block: 2 },
  ],
  scatter: [
    { kind: "ice_spike", count: 50, block: 1, scale: [0.6, 1.2] },
    { kind: "pine", count: 50, block: 1, scale: [0.8, 1.3] },
    { kind: "rock", count: 30, block: 1, scale: [0.7, 1.2] },
    { kind: "crate", count: 12, area: [96, 96, 34, 24], block: 1 },
  ],
  landmarks: [
    { id: "lm_cry_coil_lift", name: "Lift Station", kind: "camp", x: 69, y: 120, note: "The cable lift from Vaelspire; main camp of the valley." },
    { id: "lm_cry_coil_west_camp", name: "Ridge Road Camp", kind: "camp", x: 10, y: 63, note: "Arrival from Blueglass Ridge." },
    { id: "lm_cry_coil_pump", name: "Dead Pump", kind: "crossroads", x: 58, y: 70, note: "The valley's roads meet below the frozen pump." },
    { id: "lm_cry_coil_trenches", name: "Coil Trenches", kind: "farm", x: 96, y: 56, note: "The Frostcoil Serpent horde." },
    { id: "lm_cry_pumphouse_yard", name: "Pumphouse Yard", kind: "ruin", x: 30, y: 24, note: "Icegears still tending dead pumps." },
    { id: "lm_cry_lower_slopes", name: "Lower Slopes", kind: "farm", x: 30, y: 94, note: "Icegears wandering the south slopes." },
    { id: "lm_cry_research_huts", name: "Research Huts", kind: "ruin", x: 110, y: 106, note: "Abandoned coolant-research station." },
    { id: "lm_cry_coil_north", name: "Pass Road", kind: "gate", x: 99, y: 9, note: "To Prism Pass (Lv57-62)." },
  ],
  safe_areas: [[4, 56, 14, 14], [60, 112, 18, 14], [96, 4, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "coil_trenches", name: "Coil Trenches", rects: [[78, 40, 36, 30]], species: [{ monster_id: "mob_0072", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The signature horde: 40 aggressive serpents in trenches between frozen coils. The coils split the pocket into lanes that funnel a train into lines; quick respawn refills it." },
    { id: "pumphouse_yard", name: "Pumphouse Yard", rects: [[12, 10, 40, 30]], species: [{ monster_id: "mob_0026", weight: 1 }], target_alive: 30, respawn_sec: [10, 20],
      design_note: "Icegears at the low end of the band in the old pump yard: constructs at ~40 cells each, a steady Aetherite farm." },
    { id: "lower_slopes", name: "Lower Slopes", rects: [[10, 80, 40, 30]], species: [{ monster_id: "mob_0026", weight: 1 }], target_alive: 30, respawn_sec: [8, 18],
      design_note: "Icegears (Lv55, low end) wandering the south slopes near the lift: aggressive constructs on open ground, an easier Aetherite farm for players who took the lift up early." },
    { id: "research_huts", name: "Research Huts", rects: [[96, 96, 34, 24]], species: [{ monster_id: "mob_0072", weight: 50 }, { monster_id: "mob_0026", weight: 50 }], target_alive: 20, respawn_sec: [8, 16],
      design_note: "Serpents and gear walkers among abandoned huts: crates and walls break the ground into rooms, a mixed swarm-plus-construct pull." },
  ],
  npcs: [
    npc("npc_cry_snowcoil_scout", "Snowcoil Scout Varra", [64, 116], "N", "scout"),
    npc("npc_cry_snowcoil_medic", "Lift Station Medic", [74, 116], "N", "healer"),
  ],
};

const prismPass: MapDesign = {
  id: "cry_fld_04", name: "Prism Pass", type: "field", role: "A high pass through prism-crystal cliffs: Archive Keepers in the hollow, at the outer vault doors and along the plough road, and the Glacier Juggernaut elite.",
  levels: [57, 62], size: [164, 88], arrival: [23, 78], ground: "snow", theme: "a long high pass between prism-crystal cliffs, an Aethrion plough road and sealed vault doors",
  border: { width: 4, kind: "cliff" },
  roads: [
    { points: [[23, 87], [24, 64], [50, 46], [90, 44], [120, 40], [163, 43]], width: 5, kind: "stone" }, // the plough road
    { points: [[90, 44], [96, 70]], width: 3, kind: "stone" },
    { points: [[50, 46], [44, 18]], width: 3, kind: "stone" },
    { points: [[120, 40], [132, 58]], width: 3, kind: "stone" },
  ],
  blockers: [
    { kind: "crystal", shape: { poly: [[60, 4], [112, 4], [102, 20], [72, 24]] } },
    { kind: "crystal", shape: { ellipse: [140, 74, 8, 5] } },
    { kind: "crystal", shape: { ellipse: [14, 34, 5, 8] } },
    { kind: "crystal", shape: { poly: [[40, 84], [60, 74], [70, 84]] } },
    { kind: "ice", shape: { ellipse: [112, 72, 6, 4] } },
    { kind: "ruin_wall", shape: { rect: [124, 6, 12, 2] } }, // vault facade
  ],
  props: [
    { kind: "gear_ruin", x: 132, y: 60, block: 3, scale: 1.4 }, { kind: "brass_pipe", x: 126, y: 56, block: 0 }, { kind: "workshop", x: 138, y: 56, block: 0 }, // plough shed
    { kind: "lattice_obelisk", x: 130, y: 14, block: 2, scale: 1.3 }, { kind: "lattice_obelisk", x: 142, y: 20, block: 2 },
    { kind: "crystal", x: 70, y: 30, block: 1, scale: 1.5 }, { kind: "crystal", x: 100, y: 30, block: 1, scale: 1.3 }, { kind: "crystal", x: 40, y: 70, block: 1 },
    { kind: "aether_pylon", x: 52, y: 40, block: 1 },
    { kind: "observatory", x: 40, y: 14, block: 3 }, // north shelf lookout
    { kind: "tent", x: 18, y: 76, block: 2 }, { kind: "tent", x: 156, y: 38, block: 2 },
  ],
  scatter: [
    { kind: "crystal", count: 70, block: 1, scale: [0.6, 1.4] },
    { kind: "ice_spike", count: 40, block: 1, scale: [0.6, 1.1] },
    { kind: "rock", count: 40, block: 1, scale: [0.7, 1.3] },
    { kind: "pine", count: 20, block: 1, scale: [0.8, 1.1] },
  ],
  landmarks: [
    { id: "lm_cry_pass_camp", name: "Pass Foot Camp", kind: "camp", x: 23, y: 78, note: "Arrival from Snowcoil." },
    { id: "lm_cry_pass_bend", name: "Plough Bend", kind: "crossroads", x: 50, y: 46, note: "The plough road turns east; a path climbs to the shelf." },
    { id: "lm_cry_serpent_hollow", name: "Vault Hollow", kind: "farm", x: 90, y: 68, note: "Archive Keepers massed below the road." },
    { id: "lm_cry_vault_doors", name: "Vault Doors", kind: "ruin", x: 132, y: 16, note: "Sealed outer vaults of the Archive, kept by Archive Keepers." },
    { id: "lm_cry_plough_road", name: "Plough Road", kind: "farm", x: 48, y: 66, note: "Archive Keepers patrol the plough's route." },
    { id: "lm_cry_plough_shed", name: "Plough Shed", kind: "boss_arena", x: 132, y: 58, note: "Where the Glacier Juggernauts rest between runs." },
    { id: "lm_cry_prism_shelf", name: "Prism Shelf", kind: "lookout", x: 40, y: 14, note: "Light splits into beams across the pass." },
    { id: "lm_cry_pass_east", name: "Lake Road", kind: "gate", x: 153, y: 43, note: "To Mirror Ice (Lv61-66)." },
  ],
  safe_areas: [[16, 72, 16, 12], [146, 36, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "vault_hollow", name: "Vault Hollow", rects: [[70, 56, 40, 26]], species: [{ monster_id: "mob_0027", weight: 1 }], target_alive: 45, respawn_sec: [5, 12],
      design_note: "The pass's horde: assisting keepers (Lv62, top of the band) packed in a hollow below the road, ~22 cells each; one pull wakes the hollow, and the south cliff pins the train." },
    { id: "vault_doors", name: "Vault Doors", rects: [[116, 8, 32, 22]], species: [{ monster_id: "mob_0027", weight: 1 }], target_alive: 30, respawn_sec: [12, 24],
      design_note: "Keepers at the top of the band guard the sealed doors; assist means the whole facade answers one pull." },
    { id: "plough_road", name: "Plough Road", rects: [[34, 54, 30, 26]], species: [{ monster_id: "mob_0027", weight: 1 }], target_alive: 40, respawn_sec: [8, 16],
      design_note: "Keepers (Lv62) strung along the plough route near the arrival camp: assist means a careless pull from the road brings the whole line." },
    { id: "plough_shed", name: "Plough Shed", rects: [[124, 50, 18, 16]], species: [{ monster_id: "mob_0073", weight: 1 }], target_alive: 2, respawn_sec: [120, 200],
      design_note: "The region's elite: two Glacier Juggernauts on a 2-3 minute respawn, slow enough to kite round the shed; worth a group pull for the Aetherite." },
  ],
  npcs: [npc("npc_cry_prism_pass_scout", "Pass Scout Inge", [28, 76], "N", "scout")],
};

const mirrorIce: MapDesign = {
  id: "cry_fld_05", name: "Mirror Ice", type: "field", role: "A frozen lake polished to a mirror: reflections that heal on the open ice and the lens islands, and great passive grazers on the shore.",
  levels: [61, 66], size: [132, 124], arrival: [10, 93], ground: "snow", theme: "a frozen lake polished to a mirror, open leads in the ice and signal-lens islands",
  border: { width: 4, kind: "forest" },
  roads: [
    { points: [[0, 93], [30, 92], [56, 80]], width: 4, kind: "ice" },
    { points: [[56, 80], [70, 50], [89, 24], [89, 0]], width: 4, kind: "ice" },
    { points: [[56, 80], [90, 96], [110, 104]], width: 3, kind: "ice" },
    { points: [[70, 50], [34, 30]], width: 3, kind: "ice" },
  ],
  blockers: [
    { kind: "water", shape: { ellipse: [44, 62, 12, 2] } }, // open leads in the ice
    { kind: "water", shape: { ellipse: [100, 56, 2, 12] } },
    { kind: "water", shape: { ellipse: [36, 110, 10, 3] } },
    { kind: "rock", shape: { ellipse: [24, 20, 4, 3] } },
    { kind: "rock", shape: { ellipse: [18, 12, 3, 2] } },
    { kind: "forest", shape: { ellipse: [120, 30, 8, 10] } },
  ],
  props: [
    { kind: "observatory", x: 40, y: 16, block: 3, scale: 1.2 }, // signal lens
    { kind: "lattice_obelisk", x: 30, y: 26, block: 2 }, { kind: "aether_pylon", x: 20, y: 30, block: 1 },
    { kind: "ice_spike", x: 80, y: 60, block: 1, scale: 1.4 }, { kind: "ice_spike", x: 110, y: 46, block: 1, scale: 1.3 },
    { kind: "crystal", x: 60, y: 90, block: 1 },
    { kind: "tent", x: 8, y: 88, block: 2 }, { kind: "tent", x: 95, y: 8, block: 2 },
  ],
  scatter: [
    { kind: "ice_spike", count: 50, block: 1, scale: [0.6, 1.2] },
    { kind: "pine", count: 60, block: 1, scale: [0.8, 1.3] },
    { kind: "crystal", count: 30, block: 1, scale: [0.5, 1] },
    { kind: "rock", count: 20, block: 1, scale: [0.6, 1.1] },
  ],
  landmarks: [
    { id: "lm_cry_mirror_camp", name: "Lakeshore Camp", kind: "camp", x: 10, y: 93, note: "Arrival from Prism Pass." },
    { id: "lm_cry_mirror_junction", name: "Ice Road Junction", kind: "crossroads", x: 56, y: 80, note: "Ice roads to the islands, the north shore and the grazing grounds." },
    { id: "lm_cry_mirror_field", name: "Mirror Field", kind: "farm", x: 96, y: 54, note: "Mirrorshades step out of the polished ice." },
    { id: "lm_cry_lens_islands", name: "Lens Islands", kind: "ruin", x: 32, y: 22, note: "Aethrion signal lenses, haunted by Mirrorshades." },
    { id: "lm_cry_grazing", name: "Lakeshore Grazing", kind: "farm", x: 98, y: 108, note: "Hoarfrost Behemoth herd." },
    { id: "lm_cry_shatter_line", name: "Shatter Line", kind: "farm", x: 32, y: 62, note: "Mixed pocket along an open lead." },
    { id: "lm_cry_mirror_north", name: "Circuit Road", kind: "gate", x: 89, y: 9, note: "To White Circuit (Lv65-70)." },
  ],
  safe_areas: [[4, 86, 14, 14], [82, 4, 16, 12]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "mirror_field", name: "Mirror Field", rects: [[76, 40, 40, 30]], species: [{ monster_id: "mob_0074", weight: 1 }], target_alive: 35, respawn_sec: [7, 15],
      design_note: "Mirrorshades alone on the polished centre: supports that heal each other, so the pocket teaches burst AoE over steady damage." },
    { id: "lens_islands", name: "Lens Islands", rects: [[12, 8, 40, 30]], species: [{ monster_id: "mob_0074", weight: 1 }], target_alive: 30, respawn_sec: [12, 24],
      design_note: "Mirrorshades (Lv64, mid-band) on the lens islands among rocks, ~38 cells each: supports that mend each other, so players burst them an island at a time." },
    { id: "lakeshore_grazing", name: "Lakeshore Grazing", rects: [[76, 98, 44, 20]], species: [{ monster_id: "mob_0075", weight: 1 }], target_alive: 30, respawn_sec: [10, 20],
      design_note: "Passive Behemoths at the top of the band on the south shore: players gather them with taunts at their own pace." },
    { id: "shatter_line", name: "Shatter Line", rects: [[14, 48, 36, 30]], species: [{ monster_id: "mob_0074", weight: 50 }, { monster_id: "mob_0075", weight: 50 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Mirrorshades healing grazers along an open lead: the support-first lesson in a real mixed pack." },
  ],
  npcs: [npc("npc_cry_mirror_ice_scout", "Lake Scout Sorrel", [13, 89], "E", "scout")],
};

const circuitPylons: Prop[] = [[70, 26], [106, 38], [26, 64], [46, 96], [104, 92]].map(([x, y]) => ({ kind: "aether_pylon" as const, x, y, block: 1, scale: 1.3 }));

const whiteCircuit: MapDesign = {
  id: "cry_fld_06", name: "White Circuit", type: "field", role: "The region's last field: a ring conduit buried under a glacier, guarded by sentries, with specters leaking from the breach by the Archive door and haunting the snowdrifts.",
  levels: [65, 70], size: [140, 128], arrival: [33, 118], ground: "snow", theme: "a ring of heated brass conduit round a frozen hub, pylons and a vent breach by the Archive door",
  border: { width: 4, kind: "ice" },
  roads: [
    { points: [[70, 30], [100, 40], [110, 64], [100, 90], [70, 100], [40, 90], [30, 64], [40, 40], [70, 30]], width: 3, kind: "brass" }, // the Circuit
    { points: [[33, 127], [34, 100], [40, 90]], width: 4, kind: "brass" },
    { points: [[110, 64], [124, 40], [139, 33]], width: 4, kind: "brass" },
  ],
  blockers: [
    { kind: "ice", shape: { ellipse: [70, 64, 22, 18] } }, // the frozen hub
    { kind: "crystal", shape: { ellipse: [120, 110, 6, 4] } },
    { kind: "rock", shape: { ellipse: [16, 100, 5, 4] } },
  ],
  props: [
    ...circuitPylons,
    { kind: "lattice_obelisk", x: 70, y: 64, block: 0, scale: 2 }, // the circuit core
    { kind: "brass_pipe", x: 112, y: 80, block: 0 }, { kind: "brass_pipe", x: 30, y: 50, block: 0 },
    { kind: "gear_ruin", x: 120, y: 72, block: 2 }, // the vent breach
    { kind: "cave_mouth", x: 138, y: 33, block: 0, scale: 1.3 }, // Archive door
    { kind: "tent", x: 39, y: 115, block: 2 }, { kind: "tent", x: 125, y: 28, block: 2 },
  ],
  scatter: [
    { kind: "ice_spike", count: 50, block: 1, scale: [0.6, 1.2] },
    { kind: "crystal", count: 40, block: 1, scale: [0.6, 1.2] },
    { kind: "rock", count: 30, block: 1, scale: [0.7, 1.2] },
    { kind: "pine", count: 30, block: 1, scale: [0.8, 1.2] },
  ],
  landmarks: [
    { id: "lm_cry_circuit_camp", name: "Circuit Camp", kind: "camp", x: 33, y: 118, note: "Arrival from Mirror Ice." },
    { id: "lm_cry_circuit_ring", name: "The White Circuit", kind: "crossroads", x: 40, y: 90, note: "The ring conduit; walking it reaches every pocket." },
    { id: "lm_cry_frozen_hub", name: "Frozen Hub", kind: "lookout", x: 70, y: 64, note: "The circuit's core under a glacier cap." },
    { id: "lm_cry_snowdrift_pasture", name: "Haunted Drifts", kind: "farm", x: 104, y: 108, note: "Archive Specters drifting over the warm conduit." },
    { id: "lm_cry_conduit_pylons", name: "Conduit Pylons", kind: "farm", x: 66, y: 16, note: "Cryo Sentry patrols." },
    { id: "lm_cry_west_arc", name: "West Arc", kind: "farm", x: 18, y: 58, note: "Cryo Sentries guard the west arc." },
    { id: "lm_cry_vent_breach", name: "Vent Breach", kind: "ruin", x: 120, y: 72, note: "Specters seep out of a cracked Archive vent." },
    { id: "lm_cry_archive_door", name: "Archive Door", kind: "gate", x: 129, y: 33, note: "Into the Cryocore Archive (Lv69-75)." },
  ],
  safe_areas: [[26, 112, 16, 12], [122, 26, 14, 14]],
  horde: { min_alive: 80, max_alive: 150 },
  pockets: [
    { id: "snowdrift_pasture", name: "Haunted Drifts", rects: [[84, 96, 40, 24]], species: [{ monster_id: "mob_0077", weight: 1 }], target_alive: 30, respawn_sec: [10, 20],
      design_note: "Aggressive specters (Lv71, +1 over the band) swarming the soft snow over the warm conduit: a dense open-field AoE farm away from the Archive door." },
    { id: "conduit_pylons", name: "Conduit Pylons", rects: [[44, 6, 44, 22]], species: [{ monster_id: "mob_0076", weight: 1 }], target_alive: 35, respawn_sec: [10, 20],
      design_note: "Aggressive sentries along the north arc's pylons, ~27 cells each: walking the ring here pulls them, by design." },
    { id: "west_arc", name: "West Arc", rects: [[6, 36, 26, 46]], species: [{ monster_id: "mob_0076", weight: 1 }], target_alive: 25, respawn_sec: [7, 15],
      design_note: "Aggressive sentries (Lv68, mid-band) on the west arc nearest the arrival camp: their lances reach 3 cells, so players close in before they pull." },
    { id: "vent_breach", name: "Vent Breach", rects: [[104, 62, 30, 26]], species: [{ monster_id: "mob_0077", weight: 60 }, { monster_id: "mob_0076", weight: 40 }], target_alive: 30, respawn_sec: [6, 14],
      design_note: "Lv71 specters (+1 over the band) leaking from the breach with sentries chasing them: the Archive's leak boiling out beside its door." },
  ],
  npcs: [
    npc("npc_cry_white_circuit_scout", "Circuit Scout Brenn", [36, 120], "N", "scout"),
    npc("npc_cry_archive_door_warden", "Archive Door Warden", [127, 36], "E", "guard"),
  ],
};

const cryocoreArchive: MapDesign = {
  id: "cry_dun_01", name: "Cryocore Archive", type: "dungeon", role: "Crystallis's dungeon: the frozen Aethrion archive of data-cores and cryo wards round the Curator's Vault.",
  levels: [69, 75], size: [116, 124], arrival: [12, 105], ground: "metal", theme: "frozen halls of crystal data-stacks and cryo wards round the Archive's cryocore",
  solid: true,
  carve: [
    { rect: [2, 96, 20, 18] }, // vestibule
    { rect: [30, 78, 36, 30] }, // cold stacks
    { ellipse: [32, 36, 20, 16] }, // cryo wards
    { rect: [70, 52, 32, 24] }, // index gallery
    { ellipse: [86, 20, 14, 12] }, // Curator's Vault
  ],
  roads: [
    { points: [[2, 105], [22, 105], [30, 94]], width: 4, kind: "brass" },
    { points: [[30, 94], [66, 92]], width: 4, kind: "brass" },
    { points: [[48, 78], [40, 52]], width: 4, kind: "brass" },
    { points: [[66, 92], [86, 74]], width: 4, kind: "brass" },
    { points: [[86, 52], [86, 30]], width: 4, kind: "brass" },
    { points: [[52, 36], [72, 22]], width: 4, kind: "brass" },
  ],
  blockers: [
    { kind: "machine", shape: { rect: [36, 84, 24, 2] } }, // data stacks
    { kind: "machine", shape: { rect: [36, 100, 24, 2] } },
    { kind: "machine", shape: { rect: [78, 58, 2, 12] } }, // index shelves
    { kind: "machine", shape: { rect: [92, 58, 2, 12] } },
  ],
  props: [
    { kind: "tent", x: 9, y: 100, block: 2 },
    { kind: "aether_pylon", x: 86, y: 20, block: 2, scale: 1.4 }, // the cryocore
    { kind: "lattice_obelisk", x: 36, y: 36, block: 2 },
    { kind: "brass_pipe", x: 50, y: 90, block: 0 }, { kind: "brass_pipe", x: 76, y: 80, block: 0 },
    { kind: "crystal", x: 24, y: 30, block: 1, scale: 1.3 }, { kind: "crystal", x: 44, y: 44, block: 1, scale: 1.2 },
  ],
  scatter: [
    { kind: "crystal", count: 30, block: 1, scale: [0.6, 1.2] },
    { kind: "ice_spike", count: 25, block: 1, scale: [0.6, 1] },
    { kind: "crate", count: 10, block: 1 },
  ],
  landmarks: [
    { id: "lm_cry_archive_vestibule", name: "Vestibule", kind: "camp", x: 12, y: 105, note: "Arrival; the lift keeper takes you back up." },
    { id: "lm_cry_cold_stacks", name: "Cold Stacks", kind: "farm", x: 48, y: 92, note: "Cryo Lancers among the data stacks." },
    { id: "lm_cry_cryo_wards", name: "Cryo Wards", kind: "farm", x: 32, y: 36, note: "Cryo Lancers guard the frozen sleepers." },
    { id: "lm_cry_index_gallery", name: "Index Gallery", kind: "ruin", x: 86, y: 64, note: "Cryo Lancers among the index shelves." },
    { id: "lm_cry_curators_vault", name: "Curator's Vault", kind: "boss_arena", x: 86, y: 20, note: "The Cryocore Curator." },
  ],
  safe_areas: [[7, 98, 14, 14]],
  horde: { min_alive: 60, max_alive: 120 },
  pockets: [
    { id: "cold_stacks", name: "Cold Stacks", rects: [[32, 80, 32, 26]], species: [{ monster_id: "mob_0078", weight: 1 }], target_alive: 40, respawn_sec: [5, 12],
      design_note: "The Archive's main horde: 40 lancers between data-stack rows, ~18 cells each. The rows break their lines of fire and make lanes for line skills." },
    { id: "cryo_wards", name: "Cryo Wards", rects: [[18, 26, 30, 22]], species: [{ monster_id: "mob_0078", weight: 1 }], target_alive: 30, respawn_sec: [8, 16],
      design_note: "Long-range lancers in a round ward: pillars and crystal give cover, so players close in rather than trade shots." },
    { id: "index_gallery", name: "Index Gallery", rects: [[72, 54, 28, 20]], species: [{ monster_id: "mob_0078", weight: 1 }], target_alive: 25, respawn_sec: [8, 16],
      design_note: "Lancers between index shelves on the way to the vault: the shelves block their shots, a ranged gauntlet taken shelf by shelf." },
    { id: "curators_vault", name: "Curator's Vault", rects: [[80, 14, 12, 12]], species: [{ monster_id: "mob_0079", weight: 1 }], target_alive: 1, respawn_sec: [300, 420],
      design_note: "Region boss, 5-7 minute respawn, alone in the vault." },
  ],
  npcs: [npc("npc_cry_archive_lift_keeper", "Archive Lift Keeper", [16, 100], "S", "teleporter", { destinations: [["cry_town_01", 0], ["cry_fld_06", 0]] })],
};

// --- dialogue ------------------------------------------------------------------------

const dialogues: DialogueDef[] = [
  ["npc_cry_guild_registrar", "Vaelspire chapter. The researchers here built half of what's trying to kill you out there, and they'd like it back in one piece.", "Start at Frostline through the West Gate. The mites on the thaw strip are harmless; learn the cold on them."],
  ["npc_cry_merchant", "Rations and tonics, Guild prices plus the cost of hauling them up the mountain.", "Anything crystal sells well here. The labs buy everything."],
  ["npc_cry_healer", "Frostbite first, then the cuts. Hold your hands near the vent.", "Stay out of the open snow at night. The cold does more than the monsters."],
  ["npc_cry_teleporter", "The lattice is clearer up here than anywhere. Cold crystals hold a charge.", "Port Merrow and Cindervale cost more, but the crystals don't freeze."],
  ["npc_cry_craftsman", "Hare haunch, mite gel, wisp dust. The mountain feeds you if you know what to boil.", "I'll make rations and tonics from your materials, cheaper than the merchant."],
  ["npc_cry_west_gate_guard", "West Gate. Frostline's past the pines: mites, hares, and lights over the lake.", "The lights shoot. Don't stand on open ice while they're watching."],
  ["npc_cry_lift_warden", "The cable lift goes up to Snowcoil. Hold the rail, the wind is strong at the top.", "The serpents up there came out of the coils, and the gear walkers still tend the dead pumps. Nobody knows how many serpents there are."],
  ["npc_cry_frostline_scout", "Hares run when they're hurt. Drive them north into the trees and they'll pile up.", "Wisps over the lake hit from far off. Use the shore."],
  ["npc_cry_blueglass_scout", "Rams on the terraces defend each other. Hit one, fight the flock.", "Mind the chasm on the saddle. It's further down than it looks."],
  ["npc_cry_snowcoil_scout", "Welcome to the coils. The serpents fill those trenches faster than we can clear them.", "The pump yard's gear walkers are slow. Don't let them corner you anyway."],
  ["npc_cry_snowcoil_medic", "Off the lift and into the cold. Let me warm those hands.", "The steam vents are warm, but don't drink from them."],
  ["npc_cry_prism_pass_scout", "The plough mechs still run the road. Two of them, and they don't stop for anyone.", "The vault doors at the east end are sealed. The keepers would like to keep it that way."],
  ["npc_cry_mirror_ice_scout", "The reflections step out of the ice. Kill them first; they mend everything around them.", "The big grazers on the south shore won't touch you unless you start it."],
  ["npc_cry_white_circuit_scout", "The ring conduit still carries power to the Archive. The sentries guard every pylon.", "Specters are seeping out of the breach by the door. That's new."],
  ["npc_cry_archive_door_warden", "This is the Archive door. Beyond it, the Curator keeps the records, and freezes anything that disturbs them.", "If you mean to go in, go ready: the lancers inside shoot far. The lift keeper below can bring you back."],
  ["npc_cry_archive_lift_keeper", "Going up? Back to the Circuit or all the way to Vaelspire.", "The vault is past the index gallery. The lancers there shoot far."],
].map(([npcId, ...lines]) => ({ id: npcId.replace(/^npc_/, "dlg_"), npc_id: npcId, lines }));

// --- the region ------------------------------------------------------------------------

export const crystallis: RegionDesign = {
  region: {
    id: "cry", name: "Crystallis", capital: "Vaelspire", town_map_id: "cry_town_01", dungeon_map_id: "cry_dun_01", level_range: [45, 75],
    theme: "Snowy mountains, research labs and ice crystal: Aethrion's archive, frozen with its machines still running.",
    ecology: "Crystal insects, hares and light-wisps at the treeline, glass-horned rams on the ridge, coolant serpents and gear walkers in the coil valley, a plough mech and vault keepers on the pass, reflections and grazers on the mirror lake, and the Archive's sentries and data-ghosts round the White Circuit.",
    palette: { grass: "#cfe0ea", dirt: "#9fb4c4", accent: "#8fe8ff", fog: "#1b2636" },
  },
  maps: [vaelspire, frostline, blueglassRidge, snowcoil, prismPass, mirrorIce, whiteCircuit, cryocoreArchive],
  links: [
    { label: "Vaelspire West Gate ⇄ Frostline", a: { map: "cry_town_01", trigger: [0, 79, 3, 7], landing: [9, 82] }, b: { map: "cry_fld_01", trigger: [145, 52, 3, 7], landing: [137, 55] } },
    { label: "Vaelspire Cable Lift ⇄ Snowcoil", a: { map: "cry_town_01", trigger: [63, 0, 7, 3], landing: [65, 9] }, b: { map: "cry_fld_03", trigger: [66, 127, 7, 3], landing: [69, 120] } },
    { label: "Frostline ⇄ Blueglass Ridge", a: { map: "cry_fld_01", trigger: [24, 0, 7, 3], landing: [27, 9] }, b: { map: "cry_fld_02", trigger: [40, 139, 7, 3], landing: [43, 132] } },
    { label: "Blueglass Ridge ⇄ Snowcoil", a: { map: "cry_fld_02", trigger: [105, 40, 3, 7], landing: [97, 43] }, b: { map: "cry_fld_03", trigger: [0, 60, 3, 7], landing: [10, 63] } },
    { label: "Snowcoil ⇄ Prism Pass", a: { map: "cry_fld_03", trigger: [100, 0, 7, 3], landing: [99, 9] }, b: { map: "cry_fld_04", trigger: [20, 85, 7, 3], landing: [23, 78] } },
    { label: "Prism Pass ⇄ Mirror Ice", a: { map: "cry_fld_04", trigger: [161, 40, 3, 7], landing: [153, 43] }, b: { map: "cry_fld_05", trigger: [0, 90, 3, 7], landing: [10, 93] } },
    { label: "Mirror Ice ⇄ White Circuit", a: { map: "cry_fld_05", trigger: [86, 0, 7, 3], landing: [89, 9] }, b: { map: "cry_fld_06", trigger: [30, 125, 7, 3], landing: [33, 118] } },
    { label: "White Circuit ⇄ Cryocore Archive", a: { map: "cry_fld_06", trigger: [137, 30, 3, 7], landing: [129, 33] }, b: { map: "cry_dun_01", trigger: [2, 102, 3, 6], landing: [12, 105] } },
  ],
  monsters,
  materials,
  items,
  shops: [{ id: "shop_cry_supply", npc_id: "npc_cry_merchant", items: [{ item_id: "itm_0075", base_price: 8 }, { item_id: "itm_0076", base_price: 25 }, { item_id: "itm_0077", base_price: 30 }] }],
  recipes,
  quests,
  dialogues,
};
