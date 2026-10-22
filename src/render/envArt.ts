// Painted environment art made outside the code (sprite/ENV_ART_FIELDS.md):
// prop sprites and ground textures. data/env_art.json (written by
// build:content) says which files exist; loadEnvArt() loads them all before
// the first map is built, and whatever is missing is painted by code
// (paintedProps.ts, terrainTiles.ts) as before.

export interface EnvArt {
  /** look ("any", "green", "dry", "snow", "dark") -> prop kind -> loaded variants. */
  sprites: Map<string, Map<string, HTMLImageElement[]>>;
  /** Ground texture name -> image. */
  textures: Map<string, HTMLImageElement>;
}

export const envArt: EnvArt = { sprites: new Map(), textures: new Map() };

function image(src: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { console.warn(`Environment art unavailable: ${src}`); resolve(undefined); };
    img.src = src;
  });
}

let loading: Promise<void> | null = null;

/** Loads every painted environment file listed in data/env_art.json (once). */
export function loadEnvArt(): Promise<void> {
  return (loading ??= (async () => {
    const base = import.meta.env.BASE_URL;
    let manifest: { sprites: Record<string, Record<string, string[]>>; textures: string[] };
    try {
      const r = await fetch(`${base}data/env_art.json`);
      if (!r.ok) return;
      manifest = await r.json();
    } catch {
      return;
    }
    const jobs: Promise<void>[] = [];
    for (const [look, kinds] of Object.entries(manifest.sprites ?? {})) {
      const byKind = new Map<string, HTMLImageElement[]>();
      envArt.sprites.set(look, byKind);
      for (const [kind, files] of Object.entries(kinds)) {
        jobs.push(Promise.all(files.map((f) => image(`${base}sprites/env/${f}`))).then((imgs) => {
          const ok = imgs.filter((i): i is HTMLImageElement => !!i);
          if (ok.length) byKind.set(kind, ok);
        }));
      }
    }
    for (const name of manifest.textures ?? []) {
      jobs.push(image(`${base}textures/env/${name}.png`).then((img) => { if (img) envArt.textures.set(name, img); }));
    }
    await Promise.all(jobs);
  })());
}

/** The painted variants of a prop kind for a look, if any were made. */
export function envSprites(look: string, kind: string): HTMLImageElement[] | undefined {
  return envArt.sprites.get(look)?.get(kind) ?? envArt.sprites.get("any")?.get(kind);
}
