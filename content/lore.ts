// The story as the player meets it (LORE_BIBLE.md is the source; keep the two in step).
//
// Everything here is text the game shows: who each NPC is and what they say,
// the card shown on entering a map, each boss's story in the Monster Book,
// every quest summary, and the monster ecology lines that had to change when
// the world turned hostile (the Quickening) or a species became its field's
// passive Gorged bounty. world.ts applies it while building the v3 world.

/** A named person: their name, the title shown under it, and what they say. */
export interface CastMember { name: string; title: string; lines: string[] }

/** Field camp staff by field id. Titles are generated ("Dawnmeadow Scout"). The scout's
 * zone guide is appended by world.ts after these lines. */
export const FIELD_CAST: Record<string, Record<"scout" | "medic" | "transit" | "post", { name: string; lines: string[] }>> = {
  lum_fld_01: {
    scout: { name: "Tamsin Reed", lines: [
      "First camp I've ever run, so humour me: survey, clear, report. That's the whole Guild in three words.",
      "The Mosskin used to graze round your boots. Since the Quickening they charge anything on two legs. Pull them into a heap and swing.",
      "See a fat, slow Lunari that doesn't come at you? A Gorged one. The Guild pays well for those, and you'll feel why when it drops.",
    ] },
    medic: { name: "Brother Aled", lines: [
      "Lantern Hospice, Dawnmeadow post. Sit, sit. I patch quickly and I talk quicker.",
      "Nothing out here stops at the camp fence any more. Keep your blade where you can reach it.",
    ] },
    transit: { name: "Nim Calloway", lines: [
      "Oh! A traveller. The crystal's warm, it's always warm, it likes being used. Avelorn whenever you want it, the Guild pays.",
    ] },
    post: { name: "Hobb Marlow", lines: [
      "Aldric Venn stood right where you're standing, seven years back, and asked me which way the wind was blowing. East, I said. It always is, out here.",
      "Moonbrook Vale's past me, Lv 11 and up. Or I can send you home.",
    ] },
  },
  lum_fld_02: {
    scout: { name: "Orla Fenwick", lines: [
      "Listen to the frogs. When they go quiet, the Reedstalkers are close.",
      "The southern orchard is rotting from the roots up, and the water from the pump-house smells of copper. Something down there is pulling the water the wrong way.",
      "The Graftlings in the marsh that just stand there rooting are Gorged. Leave them for last, or first. They're worth it either way.",
    ] },
    medic: { name: "Sister Ivy Ames", lines: [
      "Wash the marsh off before I look at you. Rot gets into cuts.",
      "Drag them as far as you like, but come back breathing.",
    ] },
    transit: { name: "Teodor Pike", lines: [
      "Avelorn on the Guild's coin. Mind the step, the crystal kicks.",
    ] },
    post: { name: "Wren Halloway", lines: [
      "My aunt runs the Hospice in Avelorn, so if you die out east, she'll hear about it from me.",
      "East is Graftwood Wilds, Lv 21 and up. Sylvara's woods, what's left of them.",
    ] },
  },
  ver_fld_01: {
    scout: { name: "Cassius Vale", lines: [
      "I was born in Sylvara. We left these woods two years ago and the machines kept gardening without us. They still prune. They prune people now.",
      "The gardeners mend each other: drop the Pruning Tenders first or the whole press keeps getting back up.",
      "Sandcoils that just bask and don't strike are Gorged. Thirty of them on the dunes at most. The Guild has a bounty on every one.",
    ] },
    medic: { name: "Brother Joss", lines: [
      "Thorns, moth dust, jackal bites. Graftwood has a little of everything. Hold still.",
      "Come back breathing. That's the only rule I care about.",
    ] },
    transit: { name: "Elsabet Moor", lines: [
      "Avelorn, on the Guild. The Sylvarans all went through this crystal once. It remembers them, I think.",
    ] },
    post: { name: "Dunstan Kerr", lines: [
      "Elderroot Expanse is east of here, Lv 31 and up. The spores get thick past the ridge. Breathe through cloth.",
      "Or I can send you back to Avelorn.",
    ] },
  },
  ver_fld_02: {
    scout: { name: "Rhosyn Ap-Tarr", lines: [
      "Look at an Antlered Engine some time before it charges you. Aethrion built that to look like our stags. It is beautiful. It will also kill you.",
      "The spores in the Drift come from the Heartwood Engine below us. Its Regent has started breathing them out instead of sap.",
      "The Tidehoppers that never jump at you are Gorged on sap and aether. Slow, tough, and worth more than a dozen of anything else here.",
    ] },
    medic: { name: "Sister Hale Corrin", lines: [
      "Spore cough? Drink this. Don't ask what's in it.",
      "Drag them as far as you like, but come back breathing.",
    ] },
    transit: { name: "Pim Wexley", lines: [
      "Back to Avelorn, free. The Rootwardens send their thanks for every Wayfarer who comes this far.",
    ] },
    post: { name: "Ansel Rook", lines: [
      "Saffron Wastes are east, Lv 41 and up. Fill every waterskin you own.",
      "Or home to Avelorn. No shame in it.",
    ] },
  },
  sol_fld_01: {
    scout: { name: "Yusuf Qarim", lines: [
      "I tell time by shadows. Out here the shadows are wrong: the mirrors throw sunlight at night too. The Heliostat never sleeps.",
      "The wrapped ones on the causeway were surveyors once. They sealed the Vault and died in it. Now they guard the road they built.",
      "Frost Mites that sit on the seep and ignore you are Gorged. Crack them. Thirty on the whole map and the Guild pays for each.",
    ] },
    medic: { name: "Sister Noor Elzari", lines: [
      "Heatstroke first, wounds second. Drink.",
      "Come back breathing, Wayfarer. The desert keeps what it kills.",
    ] },
    transit: { name: "Bastian Coil", lines: [
      "Avelorn? Gladly. Anywhere cooler than this.",
    ] },
    post: { name: "Leda Sunmarch", lines: [
      "Pearl Coast is east, Lv 51 and up. The Heliostat Vault opens under its cliffs, if you ever find the Key Prism.",
      "I can send you back to Avelorn.",
    ] },
  },
  tha_fld_01: {
    scout: { name: "Marisol Tidewell", lines: [
      "Put your ear to the water at night. You'll hear it singing. The Drowned Signalmind. Every time the song changes, the constructs get worse.",
      "Relay Guardians ping the mast; the rams answer anyone who touches the terraces. Pull both into the surf and hit hard.",
      "The Pearl Skates lying still in the mud are Gorged. Big as doors. The Guild pays a bounty on every one.",
    ] },
    medic: { name: "Brother Finn Salter", lines: [
      "Salt water cleans a wound, but it stings like a Squall Ray. Here, let me.",
      "Drag them as far as you like, but come back breathing.",
    ] },
    transit: { name: "Gwyn Harrow", lines: [
      "The crystal's damp, but it works. Avelorn, on the Guild.",
    ] },
    post: { name: "Old Pellam", lines: [
      "Frostfire Divide's east, Lv 61 and up. Ice on one side, fire on the other, and the Signalmind surfaces in the vents.",
      "Or I send you home. Your choice, lad, lass, whoever you are.",
    ] },
  },
  cry_fld_01: {
    scout: { name: "Sigrun Vale", lines: [
      "My brother went into the Archive with the Vaelspire researchers. He didn't come out. If you go down there, look for a blue scarf.",
      "The Drowned Signalmind surfaces at the Sentry Vents. Its song is what turned everything hostile. Silence it and the whole coast goes quiet for a while.",
      "Hoarfrost Behemoths that keep grazing while you walk past are Gorged. They hit back like avalanches. The Guild pays for them anyway.",
    ] },
    medic: { name: "Sister Agathe Lind", lines: [
      "Frostbite on one hand, burns on the other. Only on the Divide.",
      "Come back breathing.",
    ] },
    transit: { name: "Corvin Ashgrove", lines: [
      "Avelorn. The crystal hums louder out here; it doesn't like the cold either.",
    ] },
    post: { name: "Torvald Ice", lines: [
      "Cinder Expanse is east, Lv 71 and up. The Cryocore Archive lies under it, under the ash.",
      "Or back to Avelorn.",
    ] },
  },
  emb_fld_01: {
    scout: { name: "Branwen Coalridge", lines: [
      "I worked the foundries in Cindervale. Kiln Prime used to answer us. Now it answers someone else, and it's walking.",
      "Crucible Tenders weld the hounds and knights back together. Kill the tenders first or you'll fight the same knight three times.",
      "Null Wisps that just drift and drink the light are Gorged. Pop them. The Guild pays.",
    ] },
    medic: { name: "Brother Emrys", lines: [
      "Burn salve, burn salve, more burn salve. Hold out your arm.",
      "Drag them as far as you like, but come back breathing.",
    ] },
    transit: { name: "Fen Ashcombe", lines: [
      "Avelorn on the Guild. Shake the ash off first, the crystal sneezes.",
    ] },
    post: { name: "Magda Cinder", lines: [
      "East is the Veil Rift, Lv 81 and up. Don't look into the tear for long. Idris did, and he still sees violet.",
      "Or home. I would.",
    ] },
  },
  noc_fld_01: {
    scout: { name: "Idris Lowe", lines: [
      "I fell into the Rift once. Halfway. Everything has been a little violet since.",
      "Kiln Prime walks the Stoker Heights. The stokers still shovel for it. Someone made it forge a key, and I think I know who.",
      "The Sparkwings that won't lift off the dishes are Gorged with static. Bring one down and you'll feel it in your teeth. Bounty's posted.",
    ] },
    medic: { name: "Sister Celeste Morrow", lines: [
      "Lie down. If you see violet at the edge of your eyes, tell me. Don't tell Idris; he gets excited.",
      "Come back breathing.",
    ] },
    transit: { name: "Quill Hadley", lines: [
      "Avelorn. The crystal won't hold a line any further east than this one. The Lattice drowns it out.",
    ] },
    post: { name: "Harlan Grey", lines: [
      "Meridian Gate is east, Lv 91 and up. The end of the road.",
      "Or I send you home.",
    ] },
  },
  noc_fld_02: {
    scout: { name: "Ser Aveline Crow", lines: [
      "My father is the Guildmaster. I asked to hold this camp so someone would be here when a Wayfarer finally went down after Aldric.",
      "The Executors guard the plaza. Their masks are pieces of the Keysigil. Take enough of them and the Lattice Heart opens.",
      "The Array Sentinels standing idle in the colonnade are Gorged and half asleep. They wake when struck. The bounty is the richest on the road.",
    ] },
    medic: { name: "Brother Tomas Vey", lines: [
      "This is the last Hospice lantern on the road. I keep it lit so you can find your way back to it.",
      "Come back breathing. Please.",
    ] },
    transit: { name: "Ilse Marrow", lines: [
      "Avelorn. It's a long way. The crystal manages, just.",
    ] },
    post: { name: "Jory Penn", lines: [
      "They call me the Last Lantern. Nothing is east of me but the Lattice.",
      "I can send you back to Avelorn.",
    ] },
  },
};

/** Avelorn's people, the market stalls of the six abandoned cities, and the dungeon lift keepers. */
export const TOWN_CAST: Record<string, CastMember> = {
  npc_lum_guild_registrar: { name: "Wenna Lark", title: "Guild Registrar", lines: [
    "Welcome to the Wayfarer Guild, Avelorn chapter. Survey, clear, report. I keep the reports.",
    "I walked with Aldric Venn's survey until my knee gave out. If you find his pages out east, bring them to me. All of them.",
    "Start in Dawnmeadow through the East Gate. The Mosskin there have turned mean since the Quickening.",
  ] },
  npc_lum_merchant: { name: "Dobbin Reyes", title: "Avelorn Supply Merchant", lines: [
    "Rations, tonics, feathers, all fresh. Prices are Guild-fixed, more's the pity, so don't haggle.",
    "Sell me your field materials, one by one or the whole bag at once.",
  ] },
  npc_lum_healer: { name: "Sister Maren Holloway", title: "Lantern Hospice", lines: [
    "Sit down, let me look at you. There. Good as new, and don't make me do it again today.",
    "Every camp on the road has one of my Hospice lanterns. Come back to one breathing.",
  ] },
  npc_lum_teleporter: { name: "Pell Ostrander", title: "Collegium Transit Warden", lines: [
    "The transit crystals are the only piece of the Lattice we ever tamed. Treat them kindly. They run to the camp of every field.",
    "A little coin keeps them charged. The further the field, the more it costs.",
  ] },
  npc_lum_craftsman: { name: "Master Tobias Fenn", title: "Avelorn Artificer", lines: [
    "Bring me materials and I'll make you something that keeps you alive.",
    "Copper gears? Craglets swallow them. And mind who you talk to in the Collegium. Not everyone with a lamp is on our side.",
  ] },
  npc_lum_east_gate_guard: { name: "Garrick Stone", title: "East Gate Warden", lines: [
    "East Gate. Dawnmeadow lies beyond, and past it every field in turn, each ten levels harder.",
    "If you see three dozen of anything chasing you, run for the town. The camps will not save you.",
  ] },
  npc_lum_north_gate_guard: { name: "Ottilie Brand", title: "North Gate Warden", lines: [
    "The North Gate's been shut since the Long Retreat. Every road runs east through the fields now.",
    "One day I'll open it again. Take the East Gate, or the transit by the square.",
  ] },
  npc_ver_merchant: { name: "Fennick Ivyhand", title: "Sylvara Supply Merchant", lines: [
    "I sold sap candles under the Eldest once. Now I sell rations in a stall. Marked up for the long road, sorry.",
    "Bring me sap and scales; the alchemists pay well for anything green.",
  ] },
  npc_ver_craftsman: { name: "Liesl Thornquist", title: "Sylvara Artificer", lines: [
    "The forest isn't dying on its own. The Heartwood Engine is breathing spores into it. I grafted that wood; I know its sickness.",
    "Newt slick for vital tonic, moth scale for focus. Field drops make better supplies than the merchant's, if you bring enough.",
  ] },
  npc_sol_merchant: { name: "Rasha al-Duun", title: "Duskhar Supply Merchant", lines: [
    "Water's dear out in the Wastes, and everything else costs too. Duskhar taught me to bargain; the Guild won't let me.",
    "Rations and tonics at Guild prices. Sell me your glass; the old observatory buyers still want it.",
  ] },
  npc_sol_craftsman: { name: "Khalid Sandmere", title: "Duskhar Artificer", lines: [
    "I polished lenses for the Duskhar observatory. Every mirror out there points east now. Someone turned them.",
    "Jackal pelts render down for vital tonic. Scarab glass makes a decent focus draught.",
  ] },
  npc_tha_merchant: { name: "Captain Odo Brine", title: "Port Merrow Supply Merchant", lines: [
    "My ship went down with the harbour. Now I sell tonics at Guild prices, plus the cost of shipping them.",
    "Bring me what the reef gives you. Inland buyers pay well for anything from the sea.",
  ] },
  npc_tha_craftsman: { name: "Nessa Kelpwright", title: "Port Merrow Artificer", lines: [
    "Kelp, hopper tendon, medusa jelly: all useful, once you know how to boil it.",
    "We heard the Signalmind singing every night before we left. It sang louder the week before the Retreat.",
  ] },
  npc_cry_merchant: { name: "Ingrid Frostmantle", title: "Vaelspire Supply Merchant", lines: [
    "Rations and tonics, Guild prices plus the cost of hauling them down a mountain.",
    "Anything crystal sells. Vaelspire found the first Aetherite, and we still can't leave it alone.",
  ] },
  npc_cry_craftsman: { name: "Corin Glassbrook", title: "Vaelspire Artificer", lines: [
    "Archon Ysra Callow warned them not to open the Gate. Her warnings are in the Cryocore Archive, and the Curator won't let anyone read them.",
    "Hare haunch, mite gel, wisp dust. I'll make rations and tonics from your materials, cheaper than the merchant.",
  ] },
  npc_emb_merchant: { name: "Brannoc Ashby", title: "Cindervale Supply Merchant", lines: [
    "Rations and tonics, hauled a long way. Heat spoils everything, so I charge what it costs to keep them cool.",
    "Bring me Emberfall scrap; somebody always wants it.",
  ] },
  npc_emb_craftsman: { name: "Vala Embersmith", title: "Cindervale Artificer", lines: [
    "Slag glands, vent bladders, cheap ash meat: I can turn your surplus into tonics for less than the shop asks.",
    "Don't sell me your Living Embers. Keep them. Kiln Prime is coming up out of the ground, and you'll want every one.",
  ] },
  npc_noc_merchant: { name: "Silas Nightway", title: "Umbracrest Supply Merchant", lines: [
    "I was the last one out of Umbracrest. Locked the gate behind me. Funny thing to do in a dead city.",
    "Rations and tonics, brought in on the transit. Bring me lattice scrap.",
  ] },
  npc_noc_craftsman: { name: "Mirela Voss", title: "Umbracrest Artificer", lines: [
    "I studied under Ilvane Thorne. She was the best of us. If she's done what I think she's done, it's partly my fault for not seeing it.",
    "Blooms, wisp cores, lurk bristles: I make tonics from what the city leaves us. Hold on to your Lattice Nodes.",
  ] },
  npc_lum_hollowroot_lift: { name: "Mabry Rootfoot", title: "Hollowroot Lift Keeper", lines: [
    "My orchard's up there, rotting. I came down to find out why and stayed to run the lift.",
    "Going up? Avelorn or the orchard. Mind your head on the roots.",
  ] },
  npc_ver_heartwood_keeper: { name: "Rootwarden Sorrel", title: "Heartwood Root-Keeper", lines: [
    "Ten generations of my family tended this Engine. It's sick, not wicked. Put it to sleep gently, if you can.",
    "Root lift's working. Avelorn, or back up to Elderroot Expanse? Don't touch the sap lines; they bite.",
  ] },
  npc_sol_vault_keeper: { name: "Vault Keeper Amon Reth", title: "Heliostat Vault Keeper", lines: [
    "I wear these dark lenses for a reason. Don't look straight into the mirrors.",
    "The lift runs to Avelorn or back up to Pearl Coast.",
  ] },
  npc_cry_archive_lift_keeper: { name: "Archivist Hesper Quill", title: "Archive Lift Keeper", lines: [
    "I still catalogue the books no one can read. Somebody should.",
    "Going up? Back to Cinder Expanse or all the way to Avelorn. The lancers past the index gallery shoot far.",
  ] },
  npc_noc_heart_lift: { name: "Ferrin Hask", title: "Lattice Heart Lift Keeper", lines: [
    "Aldric Venn went down this lift three years ago. Alone. He told me to keep it running for whoever came next. That's you.",
    "Back up? Avelorn or the Gate. Don't look at the lattice too long. It looks back.",
  ] },
};

/** Shown on entering a map: one or two sentences of what this place is now. */
export const MAP_INTRO: Record<string, string> = {
  lum_town_01: "The last city with people in it. Seven markets crowd the square where the Aether Fountain still runs clean.",
  lum_fld_01: "Aethrion irrigation still seeps under the grass. Since the Quickening, even the Mosskin herds charge travellers.",
  lum_fld_02: "Brooks, reeds and a dying orchard. Something below the pump-house is pulling the water the wrong way.",
  lum_dun_01: "Root-choked tunnels round a buried pump. The Hollowroot Warden waters nothing but itself now.",
  ver_fld_01: "Sylvara's grafted woods, abandoned two years ago. The garden machines kept working without their gardeners.",
  ver_fld_02: "Under the elder trees, spores drift up from the Heartwood Engine below. The forest is choking.",
  ver_dun_01: "Sap conduits and the Engine's spore lung. Its Regent breathes rot where it once breathed light.",
  sol_fld_01: "A desert that was farmland before the mirrors turned. The dead surveyors still walk the causeway they built.",
  sol_dun_01: "A sealed vault of mirrors. Every beam in Solenia ends here, and from here it is sent east.",
  tha_fld_01: "Terraces, pearl beds and lightning masts. At night the Drowned Signalmind sings under the water.",
  cry_fld_01: "Where the snowline meets the first lava. The Signalmind has grown a body and surfaces at the vents.",
  cry_dun_01: "Aethrion's memory, frozen solid. The Curator guards Archon Ysra Callow's warnings from everyone.",
  emb_fld_01: "Ash and rivets over Emberfall's buried foundries. The Cryocore Archive lies beneath.",
  noc_fld_01: "The edge of the tear in the Veil. Kiln Prime walks the heights, and its stokers still feed it.",
  noc_fld_02: "The plazas before the Meridian Gate, thick with the Lattice's glyphs. The Heart lies below.",
  noc_dun_01: "The Lattice Heart. The Sovereign waits behind its last door, and Aldric Venn's ward is failing.",
};

/** Each Heart's and elite's story, shown in the Monster Book once one has been defeated. */
export const BOSS_STORY: Record<string, string> = {
  "Hollowroot Warden": "Lumeris's Heart: the pump-mind that watered a whole province. After the Sundering it never stopped watering, until the roots swallowed it. The Choir turned its valves to send the deep water east, and what was left went foul. Aldric's first survey page lay in its chamber: \"The pump pulls the wrong way. Someone turned the valve.\"",
  "Heartwood Regent": "Verdantis's Heart: a sap pump fused with the oldest tree in the forest, once the source of its jade light. Tuned by the Choir, it breathes spores instead of sap to push its power further east. The Rootwardens believe it knows, and hurts. Aldric wrote: \"Ilvane says trees can't feel. I'm not sure any more.\"",
  "Heliostat Sovereign": "Solenia's Heart: the mind that aims every mirror in the desert at one point. Its last order was to gather all the light it could for the Ascension, so it has burned Solenia for three hundred years. Aldric wrote: \"All the light goes east. None of it was ever meant for us.\"",
  "Drowned Signalmind": "Thalassia's Heart: the relay that carried the Lattice's orders across Elyndra. It drowned with its station and kept broadcasting, grew a body of drone hulls and cable, and rose through the vents of Frostfire Divide. Its song is the Quickening itself. Aldric wrote: \"It isn't talking to us. It's talking to the Gate.\"",
  "Cryocore Curator": "Crystallis's Heart: keeper of Aethrion's memory, including Archon Ysra Callow's warnings against the Ascension. It freezes anyone who comes near, believing it still protects her words. Silenced, it lets them be read: the Gate needs the power of the six Hearts, and whoever stands in it becomes its voice.",
  "Kiln Prime": "Emberfall's Heart: the mind of Furnace Zero, the first furnace of Aethrion, which runs every hound, knight and stoker in the province as one body. The Choir set it to forge the Keysigil that opens the Lattice Heart, then it climbed to the Stoker Heights on its own. Aldric wrote: \"The key is forged. She is two days ahead of me.\"",
  "Lattice Sovereign": "The mind of the whole Meridian Lattice, still carrying out High Archon Maelis Orlenne's last order: open the Gate until the light is enough. The six Hearts feed it, so it can only be reached once they sleep, and only with the Keysigil. Inside, it speaks with Ilvane Thorne's voice, and Aldric Venn's ward still holds the Gate half shut. Silenced, it closes the Gate partway and the Rift stops growing. It always wakes again. Hence the Long Watch.",
  "Antlered Engine": "Survey engines built in the shape of the forest's great stags. Sylvarans once rode them in the spring parade. Now they charge anything that enters the glade.",
  "Sand-buried Colossus": "Road-builders buried to the chest when the dunes moved. They still try to dig themselves free and go back to work.",
  "Glacier Juggernaut": "Snow ploughs that still run their old timetable over the coast road, crushing whatever stands on it.",
  "Meridian Executor": "The Lattice's executioners, built to remove anyone who tampers with the network. Their masks are pieces of the Keysigil that opens the Lattice Heart.",
};

/** Every quest's summary (giver, objectives and rewards stay in the region files). */
export const QUEST_SUMMARY: Record<string, string> = {
  q_lum_intro: "The Mosskin of Dawnmeadow have turned on travellers since the Quickening. Thin the herds and learn to fight.",
  q_lum_registration: "Bring Wenna Lark field samples to earn your Guild Pass, the warrant that opens Hollowroot's lift. Loot what you kill.",
  q_lum_amber_trail: "Walk to Moonbrook Vale's edge, then clear the Ambermite swarms in Sporeling Hollow. Your first train of twenty or more.",
  q_lum_scree: "Craglets swallow Aethrion gears as gizzard stones. Recover three for the Artificer's Copper Saber.",
  q_lum_windmill: "The Dustwing swarm settles on Bramble Mill's stones and only rises when struck. Wake them a few at a time and drag them into one train: Dawnmeadow's first real horde.",
  q_lum_moonbrook: "Reedstalkers spit from range among the Brookfin on the banks. Pull the spitters into the pack, then clear both.",
  q_lum_orchard: "The southern orchard is rotting from the roots. Clear the Rotroot and bring back rotwood: the rot leads down to the pump-house cave.",
  q_lum_hollowroot: "Chapter 1. Something below Hollowroot pulls the water the wrong way. Silence the Hollowroot Warden and carry what you find to Wenna Lark.",
  q_ver_intro: "Bounty: the Gorged Graftlings rooting in Reed Marsh are slow, tough and full of aether. Claim the bounty.",
  q_ver_mossbridge: "Visit Elderroot Expanse, then thin the Mossback Newts that croak whole banks into a fight. Newt Slick makes the Sylvaran tonic.",
  q_ver_canopy: "Wound one Barkhound and its pack rushes in; the Jadewing Moths overhead only spit back when struck. Pull the moths into the melee and cleave the lot.",
  q_ver_graftwood: "Vine-driven Vinecrawlers still tend the Trellis Dunes. Your first construct horde: train them down the rows and bring back their fragments.",
  q_ver_vineworks: "The Pruning Tenders mend everything around them. Kill them first, then the Thistlehares that rush the terraces.",
  q_ver_elderroot: "Root Sentinel trains on the ridges, then two Antlered Engines in the glade: Verdantis's first elite fight.",
  q_ver_spore_basin: "The Drift's spores come from the Heartwood Engine's vents. Thin the Sporebloats and bring their membranes as proof.",
  q_ver_heartwood: "Chapter 2. The Heartwood Regent breathes spores where it once breathed light. Silence it beneath Elderroot and report to Wenna Lark.",
  q_sol_intro: "Bounty: the Gorged Sandcoils basking on the Trellis Dunes barely notice you, until struck. Claim the bounty.",
  q_sol_caravan: "Visit Graftwood Wilds, then clear the Brass Kites shooting from Elderroot's Root Ridge and the Glass Scarabs of Graftwood's Glass Burrows.",
  q_sol_glass_flats: "A big, slow construct train of Dune Sentries, then the Glasstail Basilisk packs: Elderroot's hardest pulls.",
  q_sol_sun_dial: "Gnomon Acolytes on Elderroot's Coral Steps keep the old machines running; Sun Wardens hold the Saffron causeway. Kill the acolytes first.",
  q_sol_aqueduct: "Canal Striders skate the last water in the Wastes and dart at anything on the banks. Clear the shallows and bring back their legs.",
  q_sol_causeway: "Clear the Dust Revenants, the surveyors who died sealing the Vault, and bring down two Colossi. The Guild hands over the Key Prism.",
  q_sol_heliostat: "Chapter 3. Every mirror in Solenia points east. Silence the Heliostat Sovereign in the Vault beneath Pearl Coast and report to Wenna Lark.",
  q_tha_intro: "Bounty: the Gorged Tidehoppers of the Spore Drift sit fat on sap and aether. Claim the bounty.",
  q_tha_saltwind: "Gullwing Skimmers squabble on the cliffs and peck back only when struck; Coral Claws hold the flats. Pull the flocks into the crabs and clear both.",
  q_tha_coral_reach: "Visit Elderroot Expanse, then silence the Polyp Spitters on the causeway and bring back their barbs.",
  q_tha_tidewheel: "Brine Automatons pump at Frost Seep and Kelp Tenders mend each other in the Canal Shallows. Kill the tenders first, and recover three automaton cores.",
  q_tha_wreck_shoal: "The Hullborer horde fills Prism Reach. Three or four full trains of borers.",
  q_tha_pearl_flats: "Break the Relay Guardians' sonar line, then claim the bounty on the Gorged Pearl Skates of the pearl beds. Their pings point to the drowned relay.",
  q_tha_stormbreak: "Clear the Squall Rays from the point and the Thunderhull Turtles from the coils so a crew can reach the intake shaft.",
  q_tha_drowned_relay: "Chapter 4. The Signalmind's song is the Quickening itself. Silence it where it surfaces at Frostfire Divide's Sentry Vents and report to Wenna Lark.",
  q_cry_intro: "Bounty: the Gorged Frost Mites at Frost Seep feed and ignore you, until struck. Claim the bounty.",
  q_cry_frostline: "Rimehares nibble moss in the drifts of Colossus Sands and Prism Wisps hang over the mirrors of Prism Reach; neither strikes first. Wake them, gather them, clear both.",
  q_cry_blueglass: "Visit the Saffron Wastes, then take on the Glassback Ram flocks. Their fleece insulates the Vaelspire labs.",
  q_cry_snowcoil: "The Frostcoil Serpent horde is Pearl Coast's signature train. Three or four full pulls, and the Icegears with them.",
  q_cry_prism_pass: "Break the Archive Keepers' alarm in the Drowned Archive and stop the Glacier Juggernauts of Squall Point that crush caravans.",
  q_cry_mirror_ice: "Kill the Mirrorshades that mend everything round them, then claim the bounty on the Gorged Hoarfrost Behemoths. Silvered shards go to the lens researchers.",
  q_cry_white_circuit: "Clear the Cryo Sentries and the specters seeping from the vents. The breach leads to the Archive door.",
  q_cry_cryocore: "Chapter 5. Archon Ysra Callow's warnings lie frozen in the Archive, and Sigrun Vale's brother went in after them. Silence the Cryocore Curator beneath Cinder Expanse and report to Wenna Lark.",
  q_emb_intro: "The Ashcrawler herds of Frostfire Divide's Ash Flats charge anyone on the ash since the Quickening. Thin them.",
  q_emb_slag_pools: "Break the Slagback Toad pools; their warts are the base of the Cindervale tonic.",
  q_emb_cinder_track: "Visit Frostfire Divide, then clear the Cinder Imp horde: three full trains through the hollows.",
  q_emb_forge_approach: "Smelt Hounds run the Sentry Vents; the Crucible Tenders of Cinder Expanse weld their kind back together. Clear both.",
  q_emb_magma_vents: "Skink trains along the lava channels, then pull the ranged Magma Spitters off the vent edges.",
  q_emb_ironfall: "Break the Furnace Knight patrols and recover the rivets the Scraplings stole from the bridges.",
  q_emb_red_crucible: "Clear the pour channels and the brute pens. The stokers' tracks lead up to Kiln Prime's heights.",
  q_emb_furnace_zero: "Chapter 6. Kiln Prime forged the Keysigil, then walked out of the ground. Silence it on the Veil Rift's Stoker Heights and report to Wenna Lark.",
  q_noc_intro: "Bounty: the Gorged Null Wisps of Cinder Expanse drift and drink the light. Claim the bounty.",
  q_noc_dusk_verge: "Gutter Lurks hide under the old road and pour out together when one is struck. Clear them and bring back Null Wisp fragments for the Umbracrest tonic.",
  q_noc_nullgarden: "Visit Meridian Gate, then burn the Nullbloom beds and stop the Shade Carriers on the moraine.",
  q_noc_silent_tracks: "Coupler Mite crews in the yards, Lattice Drones on the gantries: pull the drones into the mite packs.",
  q_noc_veil_rift: "Riftling trains along the tear. The Veil-Eyes go to the Guild's scholars, who want to know how wide the Rift has grown.",
  q_noc_black_array: "Claim the bounty on the Gorged Array Sentinels half asleep in the colonnade and the Gorged Sparkwings on Stoker Heights.",
  q_noc_meridian_gate: "Clear the Executor court and the glyph plaza. The Keysigil cut from their masks opens the Lattice Heart.",
  q_noc_lattice_heart: "Final chapter. Ilvane Thorne went down to finish the Ascension; Aldric Venn went after her. Silence the Lattice Sovereign and bring the last page home to Wenna Lark.",
};

/** Ecology lines rewritten for the Quickening (now hostile) or the Gorged bounty (now passive). */
export const ECOLOGY: Record<string, string> = {
  "Crucible Tender": "Repair automata that once tended the forges; they still patch every hound they find and pick over the slag heaps for scrap, and lash out only when struck.",
  "Vent Skink": "Lizards that bask on vent rims and dive into the lava to cool off; colonies ring the Vents' magma pool and bite back only when struck.",
  "Gullwing Skimmer": "Gulls that nest on the Saltwind cliffs and perch on the beached pump-buoy; they squabble among themselves and peck back only when struck.",
  Dustwing: "Dust moths that ride the updraft of the old windmill's sails and settle on the mill stones; they only swarm whoever has struck one of them.",
  Mosskin: "Seed-pods that grew legs where the old Aethrion irrigation still seeps. They grazed the meadow in peace until the Quickening; now a herd charges anyone who walks into it.",
  Sporeling: "Walking mushrooms that crowd the damp grove by the meadow pond. They share one spore cloud, and since the Quickening the whole cloud rushes anyone who comes near.",
  Ashcrawler: "Woodlouse-like grazers that eat the warm ash blown off Emberfall's vents. Once harmless, the herds on the Ash Flats now swarm anything that crosses them.",
  "Canal Strider": "Skaters that live on the last water in the Saffron Wastes, along the Canal Shallows' channel and sluices. Since the Quickening they dart at anything on the banks.",
  Rimehare: "Hares of the open snowfields that burrow in drifts and nibble the frozen moss; they kick back only when struck.",
  "Mossback Newt": "Cat-sized newts that live under the moss of the creek banks. They bask in rows, and when one is struck it croaks the whole bank into the fight.",
  Lunari: "Leaf-eared gliders nesting in the hollows of Dawnmeadow's Glider Rise. The Gorged ones have soaked up so much leaked aether they hardly fly; they ignore travellers but fight back hard when struck.",
  Graftling: "Fallen branches that the old Aethrion grafting frames bolted hinges onto. The Gorged ones root for days, swollen with jade sap; they ignore anyone who leaves them be and fight back when struck.",
  Sandcoil: "Sand serpents that bask on warm dune crests and burrow along the buried Aethrion pipes. The Gorged ones are bloated with pipe-heat and aether; they only bite when struck.",
  Tidehopper: "Spring-legged shore amphibians that feed in the tidepools. The Gorged ones sit fat in the Spore Drift, too full of sap and aether to bother anyone, until struck.",
  "Frost Mite": "Crystal-shelled mites that cluster where the Aethrion heat pipes thaw the ground. The Gorged ones feed and ignore everything else, until struck.",
  "Pearl Skate": "Skates that bury in the warm mud of the pearl beds, cracking oysters. The Gorged ones are as big as doors and too heavy to skim away; they fight back when struck.",
  "Hoarfrost Behemoth": "Woolly grazers that dig lichen from the ice shores. Gorged on aether from the vents, they keep grazing while you walk past, and hit back like avalanches when struck.",
  "Null Wisp": "Knots of violet energy that bled out of the cracked conduits. The Gorged ones drift where any light is left and drink it until it goes dark; they ignore the living until struck.",
  Sparkwing: "Birds that roost on the receiver dishes and feed on the static arcing between the masts. The Gorged ones are too charged to lift off and fight back only when struck.",
  "Array Sentinel": "Umbracrest's guard automatons. The Gorged ones stand idle in rings round the colonnade, drowsy with stored aether; they wake and fight only when struck.",
  Thornback: "Hedgehog-boars that root in the brambles round Dawnmeadow's old mill. Wound one and the whole sounder charges out of the thicket after you.",
  Brookfin: "Amphibious fish that crawl up the banks of Moonbrook Vale's Brookbed to sun their clear fins. They flop out of the way of travellers and bite back only when struck.",
  Reedstalker: "Reed-camouflaged hunters of Moonbrook Vale's Reed Marsh; they spit from the reeds at anything on the banks.",
  Sapdrone: "Aethrion harvesting drones that still tap the giant trunks of Moonbrook Vale's Sap Groves. They ignore anyone who leaves the taps alone and fight back only when struck. A drone that drank too long sometimes carries a bead of Living Jade.",
  "Jadewing Moth": "Large moths that live in the canopy where the jade light is strongest; they drift down into Graftwood Wilds' Jadewing Glade to feed, and spit back only when struck.",
  Barkhound: "Wolf-like beasts whose hides grow bark plates; their packs den in Graftwood Wilds' Jadewing Glade and let travellers pass, but wound one and the pack runs you down.",
  Vinecrawler: "Vines that strangled a crawling Aethrion maintenance frame and now drive it; they tend the trellises of Graftwood Wilds' Trellis Dunes and lash out only when struck.",
  "Pruning Tender": "The Aethrion gardener machines that grafted Verdantis; they still prune and seal cuts on Graftwood Wilds' Press Terraces, and rush to any machine in trouble. Their sap tanks sometimes set into Living Jade.",
  Thistlehare: "Hares that burrow in Graftwood Wilds' Glass Burrows; their thistle coats spread seed wherever they run, and since the Quickening they run at people.",
  "Root Sentinel": "Aethrion guard frames that the elder trees' roots grew through; they walk Elderroot Expanse's Root Ridge. Their core is jade-stained, sometimes solid Living Jade.",
  Sporebloat: "Fungal sacs that grow in the Heartwood Engine's exhaust; they drift out of the vents and fill Elderroot Expanse's Spore Drift from rim to pool, bursting at you only when struck.",
  "Glass Scarab": "Beetles that roll lightning-glass into their shells across the fused sand of Graftwood Wilds' Glass Burrows, and nip back only when struck. Old shells sometimes set into Sunfire Glass.",
  "Brass Kite": "Survey kites that still map the old routes; they circle Elderroot Expanse's Root Ridge, firing on anything that crosses their survey lines.",
  "Dune Sentry": "Sandstone sentries that once guarded Solenia's glass works; they walked east with the sand and now hold Elderroot Expanse's Antler Glade.",
  "Glasstail Basilisk": "Lizards that lick lightning-glass and grow it along their tails; they bask in packs on Elderroot Expanse's Basilisk Flats. The tail tip sometimes hardens into Sunfire Glass.",
  "Gnomon Acolyte": "Robed brass automata that once recalibrated Solenia's sun dials; they tend the crab packs and broken machines on Elderroot Expanse's Coral Steps and rush to any that are attacked.",
  "Sun Warden": "Guardians of the solar ring network; they patrol the Saffron Wastes' Warden Causeway.",
  "Prism Lens-drone": "Focusing drones of the Heliostat Vault; they guard the Lens Foundry where Solenia's light is gathered and sent east. Their lenses can fuse sand into Sunfire Glass.",
  "Polyp Spitter": "Walking coral colonies that root along the old canal of the Saffron Wastes' Warden Causeway, spitting barbs at anything that comes near the water.",
  "Kelp Tender": "Kelp creatures that tend the weed of the Saffron Wastes' Canal Shallows; they answer any of their bed's distress, and pearl oysters grow on their fronds.",
  "Brine Automaton": "Copper pressure-maintenance frames that still service the pumps at the Saffron Wastes' Frost Seep; they keep to their rounds and treat you as a fault to clear only once struck.",
  Hullborer: "Ship-worms grown huge on Aethrion hull-timber; they infest the old hulls of the Saffron Wastes' Prism Reach.",
  "Relay Guardian": "Sonar sentries bolted to the Drowned Relay's surface buoys; they walk the buoy cables of Pearl Coast's Relay Strand, and when one is struck every guardian on the line answers.",
  "Thunderhull Turtle": "Great turtles that bask in the warm outflow of Pearl Coast's Turtle Coils; they wear salvaged hull plating grown into their shells and defend the herd.",
  "Squall Ray": "Manta rays that leave the sea in a gale and ride the updraft round the lightning masts of Pearl Coast's Squall Point, charging their wings on the Aethrion conductors. They loose their sparks at you only when struck.",
  "Pressure Drone": "Maintenance drones of the Drowned Relay that followed the Signalmind's song inland; they swarm Frostfire Divide's Ash Flats.",
  "Prism Wisp": "Floating lights that gather where glass refracts the most sun: over the mirrors of the Saffron Wastes' Prism Reach. They beam back only when struck. Their frames sometimes set into a flawless prism.",
  "Glassback Ram": "Mountain rams that graze lichen on Pearl Coast's Ram Terraces; their horns grow volcanic glass, and old rams carry prisms in their horn cores.",
  Icegear: "Many-legged gear walkers that maintained the coolant pumps; their frozen joints keep them circling the frozen pumps of Pearl Coast's Pearl Beds, and they turn on you only when struck.",
  "Frostcoil Serpent": "Serpents that drank leaking coolant and grew cold-blooded beyond nature; they nest in the coil trenches of Pearl Coast's Turtle Coils.",
  "Archive Keeper": "Data-keeping automatons of the Cryocore Archive's outlying vaults; they guard the flooded wing of Frostfire Divide's Drowned Archive.",
  Mirrorshade: "Reflections that stepped out of polished ice where the lens array focused aether; they drift over Frostfire Divide's Slag Mirrors and defend whatever stands near them.",
  "Cryo Sentry": "Security frames of the ring conduit that powers the Archive; they patrol Frostfire Divide's Sentry Vents and chase whatever leaks from them.",
  "Archive Specter": "Fragments of recorded minds that leaked out of the Cryocore Archive's cracked data-cores; they drift between its data stacks and index shelves.",
  "Slagback Toad": "Toads that soak in cooling slag; the slag sets on their backs as armour. They crowd the pools of Frostfire Divide's Slag Mirrors.",
  "Smelt Hound": "Aethrion foundry hounds still loose from their kennels; packs hunt heat round Frostfire Divide's Sentry Vents.",
  "Furnace Knight": "The foundry guard of Aethrion, still marching patrols along Cinder Expanse's Knight's Road. A live furnace burns in each breastplate.",
  "Rivet Scrapling": "Scrap-built drones that strip the collapsed bridges for rivets and hoard them in heaps on Cinder Expanse's Rivet Moraine.",
  "Slagforged Brute": "Slag that set in the crucible moulds and walked off; brutes stand in the Veil Rift's Brute Pens where they were first cast, and swing only when struck.",
  "Pour Wraith": "Molten metal that kept its shape after the last pour; wraiths drift along the Veil Rift's Wraith Pour beside the tear, and flare up only when struck.",
  "Zero Stoker": "The stokers of Furnace Zero, the first Aethrion furnace, still shovelling into a fire that no longer needs feeding. They followed Kiln Prime up onto the Veil Rift's Stoker Heights.",
  "Kiln Prime": "The governing intelligence of Furnace Zero, the first furnace of Aethrion. It runs the whole of Emberfall's foundry as one body, and now walks the Veil Rift's Stoker Heights itself.",
  "Sand-buried Colossus": "Causeway builders, buried to the chest when the dunes moved; three still dig themselves free in the Saffron Wastes' Colossus Sands. Their gear-hearts run on Aetherite.",
  "Glacier Juggernaut": "Aethrion plough mechs that still clear the road on their old schedule, crushing anything on it; they hold Pearl Coast's Squall Point, by the way to the Heliostat Vault.",
};

/** v2 maps that no longer exist: player-facing text must not send anyone there
 * (validate:data lore.places). Lore places that still stand, such as the six
 * abandoned cities, Furnace Zero and the Drowned Relay, are not listed. */
export const RETIRED_PLACES = [
  "Amber Trail", "Whispergrass", "Old Windmill", "Broken Orchard", "Fernreach", "Mossbridge", "Canopy Steps", "Vineworks",
  "Spore Basin", "Saffron Dunes", "Caravan Verge", "Glass Flats", "Sun Dial", "Dust Aqueduct", "Buried Causeway", "Saltwind Shore",
  "Coral Reach", "Tidewheel Bay", "Wreck Shoal", "Pearl Flats", "Stormbreak", "Frostline", "Blueglass Ridge", "Snowcoil", "Prism Pass",
  "Mirror Ice", "White Circuit", "Ashfield", "Cinder Track", "Forge Approach", "Magma Vents", "Ironfall", "Red Crucible", "Dusk Verge",
  "Nullgarden", "Silent Tracks", "Black Array",
];

/** Dungeon zones as the Monster Book shows them ("Found in"), by "map id/zone name". */
export const DUNGEON_ZONE_NOTE: Record<string, string> = {
  "lum_dun_01/Root Tunnels": "The largest Barkwarden patrol under Lumeris, in a cavern you can circle while they close in as one wall.",
  "lum_dun_01/Pump Hall": "The buried Aethrion pump hall; the Barkwardens still guard it, and one pull empties the hall.",
  "lum_dun_01/Root Burrows": "A quieter side cavern of Barkwardens among the roots.",
  "lum_dun_01/Heart Chamber": "Where the Hollowroot Warden sits fused with the roots, pulling the water east. It wakes again minutes after it is silenced.",
  "ver_dun_01/Sap Conduits": "Spore Matrons stand in rings along the Engine's sap conduits, spitting from range. Pull them into a stack.",
  "ver_dun_01/Piston Hall": "Pistonguards hold the hall round the main piston: one pull brings thirty of them.",
  "ver_dun_01/Spore Lung": "A smaller nest of Matrons in the Engine's spore lung, close to the root lift.",
  "ver_dun_01/Heart Chamber": "The Heartwood Regent's chamber, alone at the Engine's heart. It wakes again minutes after it is silenced.",
  "sol_dun_01/Mirror Gallery": "Mirrorguards shoulder to shoulder among the mirrors they keep aligned; a round hall to circle.",
  "sol_dun_01/Lens Foundry": "Lens-drones round the focusing engine that sends Solenia's light east.",
  "sol_dun_01/Shaft of Noon": "Mirrorguards in the light-shaft; drag them into the corridor where they bunch up.",
  "sol_dun_01/Heliostat Core": "The Heliostat Sovereign, alone under the great mirror. It wakes again minutes after it is silenced.",
  "cry_dun_01/Cold Stacks": "Archive Specters drift between the data-stack rows; the rows make lanes for line skills.",
  "cry_dun_01/Cryo Wards": "Cryo Lancers shoot across a round ward; pillars and crystal give cover, so close in.",
  "cry_dun_01/Index Gallery": "Specters among the index shelves on the way to the vault, taken shelf by shelf.",
  "cry_dun_01/Curator's Vault": "The Cryocore Curator guards Archon Ysra Callow's warnings here. It wakes again minutes after it is silenced.",
  "noc_dun_01/Lattice Conduits": "Lattice Weavers string new lines round a crystal; circle it to break their line of fire.",
  "noc_dun_01/The Loom": "Weavers at work on the short route to the Sovereign; pull them back into the corridor.",
  "noc_dun_01/Spindle Hall": "Weavers in the long machine hall on the far route; the best Lattice Node farm.",
  "noc_dun_01/Sovereign's Chamber": "The Lattice Sovereign, speaking with Ilvane Thorne's voice, and Aldric Venn's failing ward. The Long Watch keeps it silenced.",
};

/** What people say as the story moves on: each stage replaces the NPC's lines once the
 * player has finished its quest. Stages run in story order; the latest finished one speaks. */
export const STORY_STAGES: Record<string, { after: string; lines: string[] }[]> = {
  npc_lum_guild_registrar: [
    { after: "q_lum_hollowroot", lines: [
      "A Choir sigil, bolted to the Warden's valves. And this page is Aldric's hand. \"Someone turned the valve.\" So he knew, even then.",
      "Go east. Sylvara's woods are choking, and I'd wager the same hand is behind it.",
    ] },
    { after: "q_ver_heartwood", lines: [
      "Another sigil, another page. Aldric writes that Ilvane said trees can't feel. Ilvane Thorne. His second on the survey.",
      "She told us he fell into the Rift. I filed that report myself. Find out what else she lied about.",
    ] },
    { after: "q_sol_heliostat", lines: [
      "\"All the light goes east.\" The mirrors, the water, the sap. Everything the Hearts make is being sent to the Gate.",
      "The Signalmind's song is next. Marisol at Pearl Coast swears it gets louder every night.",
    ] },
    { after: "q_tha_drowned_relay", lines: [
      "The machines went quiet for a whole day after the Signalmind fell. The first quiet day since the Quickening.",
      "\"It's talking to the Gate.\" Aldric again. The Archive under Cinder Expanse holds Ysra Callow's warnings. We need them.",
    ] },
    { after: "q_cry_cryocore", lines: [
      "Callow's warning: the Gate needs the six Hearts, and whoever stands in it becomes its voice. Ilvane means to stand in it.",
      "Kiln Prime is forging something for her. Stop it before it's finished.",
    ] },
    { after: "q_emb_furnace_zero", lines: [
      "Too late for the key, then. \"She is two days ahead of me.\" Aldric's last dated page, three years old.",
      "Ser Aveline holds the camp at Meridian Gate. Take the Keysigil from the Executors and go down.",
    ] },
    { after: "q_noc_lattice_heart", lines: [
      "His last page. He held the Gate shut for three years with a Guild ward and nothing else. I'll put his name on the wall myself.",
      "The Sovereign will wake again. They all will. That's the Long Watch now, and you're the first name on its roster. Survey, clear, report.",
    ] },
  ],
  npc_lum_craftsman: [
    { after: "q_lum_hollowroot", lines: [
      "That sigil is Collegium work. Resonance keys: we made them to tune transit crystals. Someone took the design east.",
      "Bring me materials and I'll make you something that keeps you alive. We're going to need it.",
    ] },
    { after: "q_noc_lattice_heart", lines: [
      "The Collegium has cleared out every Choir lamp in Avelorn. Too late, but cleared.",
      "Bring me materials. The Long Watch needs gear as much as any war.",
    ] },
  ],
  npc_lum_healer: [
    { after: "q_noc_lattice_heart", lines: [
      "You came back breathing from the bottom of the world. Sit. That's an order from the Hospice.",
      "Every lantern on the road burns a little brighter tonight. People know what you did.",
    ] },
  ],
  npc_lum_east_gate_guard: [
    { after: "q_noc_lattice_heart", lines: [
      "Wayfarer. I won't say much, but the road east feels lighter. Thank you.",
      "The fields are still wild. Mind the herds, same as always.",
    ] },
  ],
  npc_lum_dawnmeadow_post: [
    { after: "q_noc_lattice_heart", lines: [
      "So Aldric held the Gate all that time. I told him the wind always blows east. Seems he blew back.",
      "Moonbrook Vale's past me, Lv 11 and up. Or I can send you home.",
    ] },
  ],
  npc_lum_hollowroot_lift: [
    { after: "q_lum_hollowroot", lines: [
      "The water's running clear down here for the first time in years. My orchard might live.",
      "Going up? Avelorn or the orchard. Mind your head on the roots.",
    ] },
  ],
  npc_ver_heartwood_keeper: [
    { after: "q_ver_heartwood", lines: [
      "It's sleeping. Breathing sap again, not spores. Thank you for putting it down gently.",
      "Root lift's working. Avelorn, or back up to Elderroot Expanse?",
    ] },
  ],
  npc_ver_craftsman: [
    { after: "q_ver_heartwood", lines: [
      "The jade light came back over Elderroot last night. Faint, but back. I cried, a little.",
      "Newt slick for vital tonic, moth scale for focus. Bring me what you find.",
    ] },
  ],
  npc_sol_craftsman: [
    { after: "q_sol_heliostat", lines: [
      "The mirrors stopped turning east. For one noon the Wastes were only hot, not burning.",
      "Jackal pelts render down for vital tonic. Scarab glass makes a decent focus draught.",
    ] },
  ],
  npc_tha_craftsman: [
    { after: "q_tha_drowned_relay", lines: [
      "The sea's quiet at night now. No song. My mother would have liked to hear that.",
      "Kelp, hopper tendon, medusa jelly: bring them and I'll boil you something useful.",
    ] },
  ],
  npc_tha_pearl_coast_scout: [
    { after: "q_tha_drowned_relay", lines: [
      "The song stopped. I put my ear to the water all night and heard only water. It'll start again, but for now: quiet.",
      "The Pearl Skates are still Gorged and the bounty still stands.",
    ] },
  ],
  npc_cry_craftsman: [
    { after: "q_cry_cryocore", lines: [
      "You read Callow's warnings. Three hundred years late, but someone finally read them.",
      "Hare haunch, mite gel, wisp dust. I'll make rations and tonics from your materials.",
    ] },
  ],
  npc_cry_frostfire_divide_scout: [
    { after: "q_cry_cryocore", lines: [
      "A blue scarf. You found it in the Archive. He's not coming back, is he. Thank you for bringing it.",
      "The Divide is no safer for it. Keep your blade close.",
    ] },
  ],
  npc_emb_craftsman: [
    { after: "q_emb_furnace_zero", lines: [
      "The furnaces in the Expanse went cold for an hour after Kiln Prime fell. An hour. First time since the Sundering.",
      "Keep your Living Embers. You'll need them at the Gate.",
    ] },
  ],
  npc_noc_veil_rift_scout: [
    { after: "q_emb_furnace_zero", lines: [
      "The key's gone, then. Ilvane has it, or had it. The Executors guard the rest at the Gate.",
      "The Sparkwings are still Gorged on the dishes. Bounty's posted.",
    ] },
  ],
  npc_noc_craftsman: [
    { after: "q_cry_cryocore", lines: [
      "\"Whoever stands in the Gate becomes its voice.\" Ilvane read that warning years ago. In my class. She asked me what it meant.",
      "Blooms, wisp cores, lurk bristles: I make tonics from what the city leaves us.",
    ] },
    { after: "q_noc_lattice_heart", lines: [
      "You heard her voice down there. Was it still her? Don't answer. I don't want to know.",
      "Hold on to your Lattice Nodes. The Watch will need them.",
    ] },
  ],
  npc_noc_meridian_gate_scout: [
    { after: "q_noc_meridian_gate", lines: [
      "You have the Keysigil. Then go down. Ferrin keeps the lift; he saw Aldric go. Bring him home, one way or another.",
      "Gorged sentinels still stand in the colonnade. Bounty stands too.",
    ] },
    { after: "q_noc_lattice_heart", lines: [
      "My father says the Long Watch starts here, at this camp. I asked to keep it. Someone should be here when you come back.",
      "The Executors will gather again. So will the glyphs. We'll be ready.",
    ] },
  ],
  npc_noc_heart_lift: [
    { after: "q_noc_lattice_heart", lines: [
      "You came back up. He never did. But you brought his page, and that's more than I hoped for.",
      "Back up? Avelorn or the Gate. The Sovereign will wake again; I'll keep the lift for whoever goes down next.",
    ] },
  ],
};

/** Aldric Venn's survey pages: a quest item from each chapter's boss quest, readable in the
 * inventory and in the Monster Book's Survey tab. Ids itm_0950 and up, in story order. */
export const SURVEY_PAGES: { quest: string; title: string; text: string }[] = [
  { quest: "q_lum_hollowroot", title: "Survey Page I: Hollowroot", text: "Day 12. The Warden pulls the deep water east instead of up into the fields. There is a sigil on the main valve, fresh brass, Collegium work. Ilvane says it is old. It is not old. The pump pulls the wrong way. Someone turned the valve." },
  { quest: "q_ver_heartwood", title: "Survey Page II: The Heartwood Engine", text: "Day 40. The Regent breathes spores into its own forest. The Rootwardens say it weeps sap at night. Ilvane says trees can't feel. I'm not sure any more. Another sigil on the pump-heart. She was alone with it for an hour while I mapped the conduits." },
  { quest: "q_sol_heliostat", title: "Survey Page III: The Heliostat Vault", text: "Day 77. Every mirror in Solenia turns to one point, and that point sends its light east. All the light goes east. None of it was ever meant for us. I asked Ilvane where east ends. She said: \"Where it began.\"" },
  { quest: "q_tha_drowned_relay", title: "Survey Page IV: The Drowned Signal", text: "Day 120. The Signalmind's song is the Quickening. Every construct on the coast moves to its rhythm. It isn't talking to us. It's talking to the Gate. Ilvane hums along. She thinks I don't hear." },
  { quest: "q_cry_cryocore", title: "Survey Page V: Callow's Warning", text: "Day 161. I read Archon Callow's warning in the Archive: the Gate needs the six Hearts, and whoever stands in it becomes its voice. Ilvane read it over my shoulder and smiled. I am writing this where she can't see. Sigrun Vale's brother came down with the Vaelspire researchers. He stayed to hold the vault door." },
  { quest: "q_emb_furnace_zero", title: "Survey Page VI: The Keysigil", text: "Day 203. Kiln Prime has forged the Keysigil, and it is walking. Ilvane is gone, and the key with her. She is two days ahead of me. If anyone finds this: tell Wenna I'm sorry about the knee, and that she was right about everything." },
  { quest: "q_noc_lattice_heart", title: "Survey Page VII: The Gate", text: "Last page. She stands in the Gate and the Sovereign speaks with her voice. I have driven the Guild ward into the threshold. It will hold the door half shut for a while, maybe years, as long as I hold the ward. Survey, clear, report. Report: I held. Whoever reads this, finish it." },
];

/** The main story's last quest; after it every NPC has something to say (AFTER_ENDING). */
export const FINAL_QUEST = "q_noc_lattice_heart";

/** What everyone else says once the story is over (the final quest is done). */
export const AFTER_ENDING: Record<"scout" | "healer" | "teleporter" | "merchant" | "craftsman" | "guard", string> = {
  scout: "Word came down the road: the Gate is half shut and the Long Watch has begun. The herds out here haven't heard yet.",
  healer: "The Hospice lit every lantern on the road the night the Sovereign fell. Sit; you've earned the quiet.",
  teleporter: "The crystal hummed all night when the Sovereign went silent. Like it was relieved.",
  merchant: "They say the Gate is half shut. People are talking about going home. Not yet, but talking.",
  craftsman: "The Lattice went quiet for a whole day. Every artificer in Avelorn stopped work just to listen.",
  guard: "The Long Watch, they're calling it. I've stood watch my whole life. Welcome to it.",
};
