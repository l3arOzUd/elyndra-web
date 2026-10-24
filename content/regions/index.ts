import type { RegionDesign } from "../types";
import { addConsumables } from "../consumables";
import { buildWorld } from "../world";
import { compactRoster } from '../compactRoster';
import { crystallis } from "./cry";
import { emberfall } from "./emb";
import { lumeris } from "./lum";
import { nocthaven } from "./noc";
import { solenia } from "./sol";
import { thalassia } from "./tha";
import { verdantis } from "./ver";

/** The seven region designs as written: monsters, items, quests and the v2 maps. */
export const REGIONS_V2: RegionDesign[] = [lumeris, verdantis, solenia, thalassia, crystallis, emberfall, nocthaven];

/** The world the game runs (WORLD_V3_PLAN.md): one town, ten large fields, five dungeons, and the horde-run consumables. */
export const REGIONS: RegionDesign[] = compactRoster(addConsumables(buildWorld(REGIONS_V2)));
