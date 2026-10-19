import { DIRS, type Dir } from "../shared/dir";
import { Animator } from "../render/animator";
import { resolveFacing, validateSprite, type AnimName, type SpriteDef } from "../render/spriteDef";

// The Animation Inspector: plays any sprite's animations in any facing on a
// 2D canvas, with the pivot and frame box drawn, so an artist can check a
// new sheet without playing the game.

const ANIMS: AnimName[] = ["idle", "walk", "attack", "hit", "death"];

export class Inspector {
  private sprite: SpriteDef;
  private anim: AnimName = "idle";
  private dir: Dir = "S";
  private spin = false;
  private spinTime = 0;
  private animator: Animator;
  private paused = false;
  private stepFrame = 0;
  private lastEvent = "";
  /** Bumped on every restart, so a replay timer from before is ignored. */
  private generation = 0;
  private readonly g: CanvasRenderingContext2D;

  constructor(private readonly root: HTMLElement, private readonly sprites: Record<string, SpriteDef>) {
    this.sprite = Object.values(sprites)[0];
    this.animator = this.makeAnimator();
    const canvas = root.querySelector("canvas")!;
    this.g = canvas.getContext("2d")!;
    this.buildControls();
  }

  private makeAnimator() {
    return new Animator(Object.fromEntries(Object.entries(this.sprite.sheets).map(([k, s]) => [k, s!.def])));
  }

  private buildControls() {
    const bar = (cls: string) => this.root.querySelector<HTMLElement>(cls)!;
    const button = (text: string, onClick: () => void, group: HTMLElement, active = false) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.classList.toggle("on", active);
      b.onclick = () => {
        group.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        onClick();
      };
      group.append(b);
    };
    const sprites = bar(".insp-sprites");
    for (const [id, s] of Object.entries(this.sprites)) {
      button(id, () => { this.sprite = s; this.restart(); this.report(); }, sprites, s === this.sprite);
    }
    const anims = bar(".insp-anims");
    for (const a of ANIMS) button(a, () => { this.anim = a; this.restart(); }, anims, a === this.anim);
    const dirs = bar(".insp-dirs");
    for (const d of DIRS) button(d, () => { this.dir = d; this.spin = false; }, dirs, d === this.dir);
    button("⟳ หมุน", () => { this.spin = true; }, dirs);
    bar(".insp-pause").onclick = () => { this.paused = !this.paused; };
    bar(".insp-step").onclick = () => { this.paused = true; this.stepFrame++; };
    this.report();
  }

  private restart() {
    this.animator = this.makeAnimator();
    this.generation++;
    this.lastEvent = "";
    if (this.anim === "walk" || this.anim === "idle") this.animator.setBase(this.anim);
    else this.play();
  }

  private play() {
    const gen = this.generation;
    const again = (ms: number, reset = false) => setTimeout(() => {
      if (gen !== this.generation) return;
      if (reset) this.animator.reset();
      this.play();
    }, ms);
    this.animator.play(this.anim, {
      onEvent: (e) => { this.lastEvent = `event "${e}"`; },
      onDone: () => {
        // Replay one-shots on a loop so they can be watched.
        if (this.anim !== "death") again(350);
        else again(900, true);
      },
    });
  }

  private report() {
    const problems = validateSprite(this.sprite.json, Object.fromEntries(Object.entries(this.sprite.sheets).map(([k, s]) => [k, s!.image])));
    const el = this.root.querySelector(".insp-problems")!;
    el.textContent = problems.length ? "⚠ " + problems.join(" · ") : "✓ sheet ตรงกับ JSON";
  }

  update(dtMs: number) {
    if (this.root.hidden) return;
    let step = this.paused ? 0 : dtMs;
    if (this.stepFrame > 0) {
      const def = this.sprite.sheets[this.anim]?.def;
      step = def ? 1000 / def.fps : 0;
      this.stepFrame--;
    }
    if (this.spin) {
      this.spinTime += dtMs;
      this.dir = DIRS[Math.floor(this.spinTime / 600) % 8];
    }
    const { anim, frame } = this.animator.update(step);
    const sheet = this.sprite.sheets[anim] ?? this.sprite.sheets.idle!;
    const { json } = this.sprite;
    const { row, flip } = resolveFacing(json, this.dir);
    const g = this.g;
    const W = g.canvas.width, H = g.canvas.height;
    g.clearRect(0, 0, W, H);
    // Checkerboard shows transparency.
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) {
      g.fillStyle = (x + y) % 32 ? "#1f2d38" : "#26363f";
      g.fillRect(x, y, 16, 16);
    }
    const scale = Math.min((W - 20) / json.frame.w, (H - 40) / json.frame.h);
    const dw = json.frame.w * scale, dh = json.frame.h * scale;
    const ox = (W - dw) / 2, oy = 10;
    g.save();
    g.imageSmoothingEnabled = false;
    if (flip) {
      g.translate(ox + dw, oy);
      g.scale(-1, 1);
    } else g.translate(ox, oy);
    g.drawImage(sheet.image, frame * json.frame.w, row * json.frame.h, json.frame.w, json.frame.h, 0, 0, dw, dh);
    g.restore();
    g.strokeStyle = "#c9a96e88";
    g.strokeRect(ox + 0.5, oy + 0.5, dw, dh);
    const px = ox + (flip ? json.frame.w - json.pivot.x : json.pivot.x) * scale;
    const py = oy + json.pivot.y * scale;
    g.strokeStyle = "#ff6a6a";
    g.beginPath();
    g.moveTo(px - 10, py); g.lineTo(px + 10, py);
    g.moveTo(px, py - 10); g.lineTo(px, py + 10);
    g.stroke();
    g.fillStyle = "#e8dcc4";
    g.font = "12px system-ui, sans-serif";
    g.fillText(`${anim} · frame ${Math.min(frame, sheet.def.frames - 1) + 1}/${sheet.def.frames} · ${this.dir} → row ${row}${flip ? " (mirror)" : ""}`, 8, H - 22);
    g.fillText(`${sheet.def.fps} fps${this.lastEvent ? " · " + this.lastEvent : ""}`, 8, H - 7);
  }
}
