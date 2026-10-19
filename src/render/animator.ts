import type { AnimDef, AnimName } from "./spriteDef";

export interface PlayOptions {
  /** Fit the whole animation into this long (an attack timed to the attack speed). */
  durationMs?: number;
  onEvent?: (name: string) => void;
  onDone?: () => void;
}

interface OneShot {
  name: AnimName;
  rate: number;
  opts: PlayOptions;
  fired: Set<string>;
}

/** An attack with no "hit" frame given lands halfway through. */
function eventsOf(name: AnimName, def: AnimDef | undefined): Record<string, number> {
  if (def?.events) return def.events;
  if (name === "attack" && def) return { hit: Math.floor(def.frames / 2) };
  return {};
}

/** Which one-shot may cut off which: a flinch never cuts off a swing. */
const PRIORITY: Record<AnimName, number> = { idle: 0, walk: 0, hit: 1, attack: 2, death: 3 };

/**
 * Picks the frame to show. A looping base animation (idle or walk) plays
 * under one-shots (attack, hit, death); when a one-shot ends the base
 * resumes. Events are never lost: a one-shot cut short, or one whose art is
 * missing, fires its remaining events at once, so damage always lands.
 *
 * No Three.js in here, so it is tested on its own.
 */
export class Animator {
  private base: AnimName = "idle";
  private baseRate = 1;
  private shot: OneShot | null = null;
  private time = 0;
  private held = false;

  constructor(private readonly anims: Partial<Record<AnimName, AnimDef>>) {}

  get current(): AnimName {
    return this.shot?.name ?? (this.held ? "death" : this.base);
  }

  get isDead(): boolean {
    return this.held || this.shot?.name === "death";
  }

  /** The looping animation under everything: idle or walk at a speed. */
  setBase(name: AnimName, rate = 1) {
    if (this.base !== name && !this.shot && !this.held) this.time = 0;
    this.base = name;
    this.baseRate = rate;
  }

  /** Plays a one-shot. Returns false if something more important is playing. */
  play(name: AnimName, opts: PlayOptions = {}): boolean {
    if (this.held) return false;
    if (this.shot && PRIORITY[this.shot.name] > PRIORITY[name]) return false;
    if (this.shot) this.finish(this.shot);
    const def = this.anims[name];
    if (!def) {
      // No art for it: an attack still has to land.
      if (name === "attack") opts.onEvent?.("hit");
      opts.onDone?.();
      if (name === "death") this.held = true;
      return true;
    }
    const natural = (def.frames * 1000) / def.fps;
    const rate = opts.durationMs ? Math.min(3, Math.max(0.5, natural / opts.durationMs)) : 1;
    this.shot = { name, rate, opts, fired: new Set() };
    this.time = 0;
    return true;
  }

  /** Back to life (a revive). */
  reset() {
    this.shot = null;
    this.held = false;
    this.time = 0;
  }

  /** Advances by dtMs and returns the frame to show. */
  update(dtMs: number): { anim: AnimName; frame: number; progress: number } {
    if (this.shot) {
      const shot = this.shot;
      const def = this.anims[shot.name]!;
      this.time += dtMs * shot.rate;
      const frame = Math.floor((this.time * def.fps) / 1000);
      for (const [ev, at] of Object.entries(eventsOf(shot.name, def))) {
        if (frame >= at && !shot.fired.has(ev)) {
          shot.fired.add(ev);
          shot.opts.onEvent?.(ev);
        }
      }
      if (frame < def.frames) return { anim: shot.name, frame, progress: Math.min(1, (this.time * def.fps) / 1000 / def.frames) };
      this.shot = null;
      if (def.hold || shot.name === "death") this.held = true;
      shot.opts.onDone?.();
      this.time = 0;
      if (this.held) return { anim: shot.name, frame: def.frames - 1, progress: 1 };
    }
    if (this.held) {
      const def = this.anims.death;
      return { anim: "death", frame: def ? def.frames - 1 : 0, progress: 1 };
    }
    const def = this.anims[this.base] ?? this.anims.idle!;
    const name = this.anims[this.base] ? this.base : "idle";
    this.time += dtMs * this.baseRate;
    const frame = Math.floor((this.time * def.fps) / 1000);
    const cycle = (this.time * def.fps) / 1000 / def.frames;
    return { anim: name, frame: def.loop === false ? Math.min(frame, def.frames - 1) : frame % def.frames, progress: def.loop === false ? Math.min(1, cycle) : cycle % 1 };
  }

  /** Fires whatever a cut-short one-shot still owed. */
  private finish(shot: OneShot) {
    const def = this.anims[shot.name];
    for (const ev of Object.keys(eventsOf(shot.name, def))) {
      if (!shot.fired.has(ev)) {
        shot.fired.add(ev);
        shot.opts.onEvent?.(ev);
      }
    }
    shot.opts.onDone?.();
    this.shot = null;
  }
}
