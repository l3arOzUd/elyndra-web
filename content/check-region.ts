// Builds Lumeris plus one region into a scratch folder and validates it,
// without touching public/data. For authoring regions in parallel:
//
//   npx tsx content/check-region.ts ver [--all]
//
// Teleporter destinations into regions not in the build are dropped from
// the scratch copy only (they are checked for real by the full build).

import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildContent } from "./build";
import { lumeris } from "./regions/lum";
import type { RegionDesign } from "./types";

const id = process.argv[2];
if (!id) throw new Error("usage: check-region.ts <region id>");
const mod = await import(`./regions/${id}.ts`);
const region: RegionDesign = Object.values(mod).find((v): v is RegionDesign => !!v && typeof v === "object" && "region" in v)!;
const regions = id === "lum" ? [lumeris] : [lumeris, region];
const present = new Set(regions.flatMap((r) => r.maps.map((m) => m.id)));
const trimmed = regions.map((r) => ({
  ...r,
  maps: r.maps.map((m) => ({ ...m, npcs: m.npcs.map((n) => (n.destinations ? { ...n, destinations: n.destinations.filter(([d]) => present.has(d)) } : n)) })),
}));
const dir = mkdtempSync(join(tmpdir(), `elyndra-${id}-`));
console.log(buildContent(trimmed, join(dir, "data"), join(dir, "sprites", "index.json")));
try {
  execFileSync(process.execPath, [join("node_modules", "tsx", "dist", "cli.mjs"), "scripts/validate-data.ts", "--data", join(dir, "data"), ...process.argv.slice(3)], { stdio: "inherit" });
} catch (e) {
  process.exit((e as { status?: number }).status ?? 1);
}
