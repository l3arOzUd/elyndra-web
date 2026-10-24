# Elyndra — current world roster (40 species)

Implemented roster; supersedes the 94-species production plan. Source: `content/compactRoster.ts`.

- 10 fields × 3 species + 5 dungeons × 2 species = 40, including all 7 bosses. Avelorn has no monsters.
- 21 bound existing sprite bundles; 19 remain placeholders and need art. No new image generation in this change.
- All 13 previously bound paintings are retained. One home map per species; levels are fitted to the destination.
- Existing spawn areas, target counts, roads, collision and warp links are retained. Fewer species does not mean fewer enemies.
- Former Gorged residents now join ordinary packs without bounty HP/EXP multipliers. Passive/fleeing retained regulars assist their packs.
- Retired kill objectives are redirected locally. Material access stays in its old map/level band; consolidated drop chances are population-weighted. Boss loot and unique drops are retained.
- Existing quest IDs, objective order/counts, prerequisite chains, recipes and item IDs remain stable. Server quest progress is stored by objective index, so current progress is preserved. Retired Monster Book records stay saved but are not shown in the active roster.

| Map | Level | Residents | Art |
|---|---|---|---|
| Avelorn (lum_town_01) | 1–20 | None | 0/0 |
| Dawnmeadow (lum_fld_01) | 1–10 | Mosskin Lv1, Sporeling Lv3, Ambermite Lv8 | 3/3 |
| Moonbrook Vale (lum_fld_02) | 11–20 | Brookfin Lv11, Reedstalker Lv15, Rotroot Lv20 | 3/3 |
| Hollowroot Cavern (lum_dun_01) | 17–20 | Barkwarden Lv18, Hollowroot Warden Lv20 | 2/2 |
| Graftwood Wilds (ver_fld_01) | 21–30 | Dustwing Lv21, Craglet Lv25, Thornback Lv30 | 3/3 |
| Elderroot Expanse (ver_fld_02) | 31–40 | Lunari Lv31, Graftling Lv35, Sapdrone Lv40 | 3/3 |
| Heartwood Engine (ver_dun_01) | 36–40 | Spore Matron Lv38, Heartwood Regent Lv40 | 1/2 |
| Saffron Wastes (sol_fld_01) | 41–50 | Sun Warden Lv41, Dust Revenant Lv45, Prism Wisp Lv50 | 3/3 |
| Heliostat Vault (sol_dun_01) | 50–55 | Vault Mirrorguard Lv52, Heliostat Sovereign Lv55 | 0/2 |
| Pearl Coast (tha_fld_01) | 51–60 | Pearl Skate Lv51, Thunderhull Turtle Lv55, Squall Ray Lv60 | 1/3 |
| Frostfire Divide (cry_fld_01) | 61–70 | Frost Mite Lv61, Cryo Sentry Lv70, Drowned Signalmind Lv65 | 1/3 |
| Cryocore Archive (cry_dun_01) | 69–75 | Archive Specter Lv72, Cryocore Curator Lv75 | 0/2 |
| Cinder Expanse (emb_fld_01) | 71–80 | Vent Skink Lv71, Furnace Knight Lv75, Rivet Scrapling Lv80 | 1/3 |
| Veil Rift (noc_fld_01) | 81–90 | Riftling Lv81, Lattice Drone Lv90, Kiln Prime Lv90 | 0/3 |
| Meridian Gate (noc_fld_02) | 91–99 | Array Sentinel Lv91, Meridian Executor Lv95, Glyph Swarm Lv99 | 0/3 |
| Lattice Heart (noc_dun_01) | 96–99 | Lattice Weaver Lv97, Lattice Sovereign Lv99 | 0/2 |

## Existing art reused

| Game identity | Sprite |
|---|---|
| Mosskin | mosskin_2d |
| Sporeling | sporeling_2d |
| Ambermite | ambermite_2d |
| Lunari | lunari_2d |
| Craglet | craglet_2d |
| Thornback | thornback_2d |
| Dustwing | dustwing_2d |
| Brookfin | brookfin_2d |
| Reedstalker | reedstalker_2d |
| Rotroot | rotroot_2d |
| Barkwarden | barkwarden_2d |
| Graftling | graftling_2d |
| Sapdrone | sapdrone_2d |
| Sun Warden | ruin_golem_2d |
| Frost Mite | crystal_mite_2d |
| Prism Wisp | gust_wisp_2d |
| Hollowroot Warden | aether_treant_2d |
| Spore Matron | terrabloom_2d |
| Dust Revenant | aether_wraith_2d |
| Squall Ray | sky_manta_2d |
| Rivet Scrapling | gearling_2d |

## Parked production backlog

54 retired species remain archived in the region source files. Do not generate their art unless explicitly restored to WORLD_ROSTER.

Mossback Newt, Jadewing Moth, Barkhound, Vinecrawler, Pruning Tender, Thistlehare, Root Sentinel, Antlered Engine, Sporebloat, Heartwood Pistonguard, Sandcoil, Ochre Jackal, Glass Scarab, Brass Kite, Dune Sentry, Glasstail Basilisk, Gnomon Acolyte, Canal Strider, Sand-buried Colossus, Prism Lens-drone, Tidehopper, Gullwing Skimmer, Coral Claw, Polyp Spitter, Kelp Tender, Brine Automaton, Hullborer, Relay Guardian, Pressure Drone, Gloom Medusa, Rimehare, Glassback Ram, Icegear, Frostcoil Serpent, Glacier Juggernaut, Archive Keeper, Mirrorshade, Hoarfrost Behemoth, Cryo Lancer, Ashcrawler, Slagback Toad, Cinder Imp, Smelt Hound, Crucible Tender, Magma Spitter, Slagforged Brute, Pour Wraith, Zero Stoker, Null Wisp, Gutter Lurk, Shade Carrier, Nullbloom, Coupler Mite, Sparkwing
