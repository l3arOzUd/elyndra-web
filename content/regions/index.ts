import type { RegionDesign } from "../types";
import { crystallis } from "./cry";
import { emberfall } from "./emb";
import { lumeris } from "./lum";
import { nocthaven } from "./noc";
import { solenia } from "./sol";
import { thalassia } from "./tha";
import { verdantis } from "./ver";

/** Regions in level order. Lumeris is the production reference. */
export const REGIONS: RegionDesign[] = [lumeris, verdantis, solenia, thalassia, crystallis, emberfall, nocthaven];
