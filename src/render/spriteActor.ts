import * as THREE from "three";
import { viewDir, type Dir } from "../shared/dir";
import { Animator, type PlayOptions } from "./animator";
import { resolveFacing, type AnimName, type SpriteDef } from "./spriteDef";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 uvOffset;
  uniform vec2 uvScale;
  uniform vec3 tint;
  uniform float flash;
  uniform float opacity;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(map, uvOffset + vUv * uvScale);
    if (c.a < 0.04) discard;
    c.rgb = mix(c.rgb * tint, vec3(1.0, 0.92, 0.85), flash);
    gl_FragColor = vec4(c.rgb, c.a * opacity);
    #include <colorspace_fragment>
  }
`;

const tmpRight = new THREE.Vector3();
let shadowTexture: THREE.Texture | null = null;
function softShadow(): THREE.Texture {
  if (shadowTexture) return shadowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(10,20,15,0.55)");
  grad.addColorStop(0.6, "rgba(10,20,15,0.3)");
  grad.addColorStop(1, "rgba(10,20,15,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  shadowTexture = new THREE.CanvasTexture(c);
  return shadowTexture;
}

/**
 * One character on screen: a camera-facing card anchored at its feet,
 * showing the frame its Animator picks from the row its facing resolves to.
 */
export class SpriteActor {
  readonly root = new THREE.Group();
  readonly animator: Animator;
  /** World heading, radians clockwise from north. */
  heading = Math.PI;
  /** The facing last drawn, as the viewer sees it (for the inspector). */
  shownDir: Dir = "S";
  private readonly card: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly baseScale: THREE.Vector2;
  private flash = 0;
  private fade: { ms: number; left: number; done?: () => void } | null = null;

  constructor(readonly sprite: SpriteDef, opts: { tint?: [number, number, number]; scale?: number } = {}) {
    const { json } = sprite;
    this.animator = new Animator(Object.fromEntries(Object.entries(sprite.sheets).map(([k, s]) => [k, s!.def])));
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        map: { value: sprite.sheets.idle!.texture },
        uvOffset: { value: new THREE.Vector2() },
        uvScale: { value: new THREE.Vector2(1, 1) },
        tint: { value: new THREE.Color(...(opts.tint ?? [1, 1, 1])) },
        flash: { value: 0 },
        opacity: { value: 1 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });
    // A unit card moved so the pivot (the feet) sits at the origin.
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0.5 - json.pivot.x / json.frame.w, json.pivot.y / json.frame.h - 0.5, 0);
    this.card = new THREE.Mesh(geo, this.material);
    const k = opts.scale ?? 1;
    this.baseScale = new THREE.Vector2((json.frame.w / json.pixelsPerCell) * k, (json.frame.h / json.pixelsPerCell) * k);
    this.card.scale.set(this.baseScale.x, this.baseScale.y, 1);
    this.root.add(this.card);
    if (!json.bakedShadow) {
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9 * k, 0.5 * k).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }),
      );
      shadow.position.y = 0.02;
      shadow.renderOrder = -1;
      this.root.add(shadow);
    }
  }

  /** On-screen height in world units, for labels above the head. */
  get height(): number {
    const { json } = this.sprite;
    return this.baseScale.y * (json.pivot.y / json.frame.h) * 0.85;
  }

  setBase(name: "idle" | "walk", msPerCell?: number) {
    const ref = this.sprite.json.animations.walk?.refMsPerCell;
    this.animator.setBase(name, name === "walk" && ref && msPerCell ? ref / msPerCell : 1);
  }

  play(name: AnimName, opts?: PlayOptions): boolean {
    return this.animator.play(name, opts);
  }

  hitFlash() {
    this.flash = 1;
  }

  fadeOut(ms: number, done?: () => void) {
    this.fade = { ms, left: ms, done };
  }

  update(dtMs: number, camera: THREE.Camera, cameraYaw: number) {
    const { anim, frame, progress } = this.animator.update(dtMs);
    if (this.sprite.puppet) this.updatePuppet(anim, progress, dtMs, camera, cameraYaw);
    else this.updateSheet(anim, frame, camera, cameraYaw);
    const u = this.material.uniforms;
    this.flash = Math.max(0, this.flash - dtMs / 160);
    u.flash.value = this.flash * 0.75;
    if (this.fade) {
      this.fade.left -= dtMs;
      u.opacity.value = Math.max(0, this.fade.left / this.fade.ms);
      if (this.fade.left <= 0) {
        const done = this.fade.done;
        this.fade = null;
        done?.();
      }
    }
  }

  private puppetTime = Math.random() * 10;

  /**
   * One painted image, moved by the engine: breathing at idle, a hop or
   * stride when walking, wind-up and lunge to attack, a squash when hit,
   * a topple on death. The art is assumed to face the viewer, turned a
   * little to screen-left; facings to the east mirror it, facings away use
   * the back view when there is one.
   */
  private updatePuppet(anim: AnimName, p: number, dtMs: number, camera: THREE.Camera, cameraYaw: number) {
    const pp = this.sprite.puppet!;
    const motion = this.sprite.json.puppet!.motion;
    this.puppetTime += dtMs / 1000;
    const t = this.puppetTime;
    this.shownDir = viewDir(this.heading, cameraYaw);
    const away = (this.shownDir === "N" || this.shownDir === "NE" || this.shownDir === "NW") && !!pp.backTex;
    const east = this.shownDir === "NE" || this.shownDir === "E" || this.shownDir === "SE";
    const flip = away ? !east : east;
    const fwd = flip ? 1 : -1; // screen direction the creature faces
    const u = this.material.uniforms;
    u.map.value = away ? pp.backTex : pp.frontTex;
    u.uvScale.value.set(1, 1);
    u.uvOffset.value.set(0, 0);

    let sx = 1, sy = 1, dx = 0, dy = 0, rot = 0;
    const TAU = Math.PI * 2;
    const floating = motion === "float";
    if (floating) dy = 0.12 + 0.05 * Math.sin(t * 2.1);
    switch (anim) {
      case "idle": {
        const b = Math.sin(t * TAU * (motion === "heavy" ? 0.5 : 0.85));
        sy = 1 + 0.035 * b;
        sx = 1 - 0.022 * b;
        break;
      }
      case "walk": {
        const ph = p * TAU;
        if (motion === "hop") {
          const air = Math.abs(Math.sin(ph));
          dy += 0.2 * air;
          sy = 0.88 + 0.18 * air; // squashed on landing, stretched in the air
          sx = 1 / Math.sqrt(sy);
          rot = 0.07 * Math.sin(ph);
        } else if (motion === "heavy") {
          dy += 0.03 * Math.abs(Math.sin(ph * 2));
          rot = 0.05 * Math.sin(ph);
          sx = 1 + 0.03 * Math.abs(Math.sin(ph * 2));
        } else if (floating) {
          rot = 0.06 * Math.sin(ph);
          dy += 0.04 * Math.sin(ph * 2);
        } else {
          dy += 0.06 * Math.abs(Math.sin(ph * 2));
          rot = 0.09 * Math.sin(ph);
        }
        break;
      }
      case "attack": {
        if (p < 0.35) { // wind up: lean back and crouch
          const k = p / 0.35;
          dx = -0.12 * k; rot = -0.14 * k; sy = 1 - 0.08 * k; sx = 1 + 0.05 * k;
        } else if (p < 0.55) { // strike: lunge forward, stretched
          const k = (p - 0.35) / 0.2;
          dx = -0.12 + 0.47 * k; rot = -0.14 + 0.32 * k; sx = 1.12; sy = 0.95;
        } else { // recover
          const k = 1 - (p - 0.55) / 0.45;
          dx = 0.35 * k; rot = 0.18 * k; sx = 1 + 0.12 * k; sy = 1 - 0.05 * k;
        }
        break;
      }
      case "hit": {
        const k = 1 - p;
        sx = 1 + 0.16 * k; sy = 1 - 0.16 * k;
        dx = -0.1 * k + 0.05 * Math.sin(p * Math.PI * 6) * k;
        break;
      }
      case "death": {
        const k = 1 - (1 - p) * (1 - p); // ease out
        rot = -1.45 * k; // topple backwards
        dy = floating ? dy * (1 - k) : -0.05 * k;
        sy = 1 - 0.25 * k;
        break;
      }
    }
    const w = this.baseScale.x, h = this.baseScale.y;
    this.card.scale.set((flip ? -w : w) * sx, h * sy, 1);
    this.card.quaternion.copy(camera.quaternion);
    this.card.rotateZ(rot * fwd);
    const right = tmpRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.card.position.set(0, dy * h, 0).addScaledVector(right, dx * fwd * w * 0.6);
  }

  private updateSheet(anim: AnimName, frame: number, camera: THREE.Camera, cameraYaw: number) {
    const sheet = this.sprite.sheets[anim] ?? this.sprite.sheets.idle!;
    const { json } = this.sprite;
    this.shownDir = viewDir(this.heading, cameraYaw);
    const { row, flip } = resolveFacing(json, this.shownDir);
    const u = this.material.uniforms;
    u.map.value = sheet.texture;
    const sw = json.frame.w / sheet.image.width;
    const sh = json.frame.h / sheet.image.height;
    u.uvScale.value.set(sw, sh);
    u.uvOffset.value.set(Math.min(frame, sheet.def.frames - 1) * sw, 1 - (row + 1) * sh);
    // Mirroring the card (not the texture) mirrors about the pivot, so
    // off-centre feet stay put.
    this.card.scale.x = flip ? -this.baseScale.x : this.baseScale.x;
    this.card.quaternion.copy(camera.quaternion);
  }

  revive() {
    this.animator.reset();
    this.fade = null;
    this.material.uniforms.opacity.value = 1;
  }

  dispose() {
    this.root.removeFromParent();
    this.card.geometry.dispose();
    this.material.dispose();
  }
}
