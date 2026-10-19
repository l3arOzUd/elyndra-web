import "./style.css";
import { loadContent } from "./data/content";
import { Game } from "./game";
import { Connection } from "./net/connection";
import { buildHeroSprite } from "./render/heroSprite";
import { loadPaperDoll, setPaperDollKit, wayfarerSprite } from "./render/paperDoll";
import { loadSprite, type SpriteDef } from "./render/spriteDef";
import { Hud } from "./ui/hud";
import { Inspector } from "./ui/inspector";
import { NpcDialog } from "./ui/npcDialog";

const params = new URLSearchParams(location.search);
const DEFAULT_SERVER = params.get("server") ?? `ws://${location.hostname || "localhost"}:7101/ws`;

const $ = (id: string) => document.getElementById(id)!;

function remember(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function main() {
  const status = $("loading");
  try {
    status.textContent = "Loading world data...";
    const content = await loadContent();
    status.textContent = "Loading sprites...";
    const sheetIds = new Set([content.sprites.fallback.sprite, ...Object.values(content.sprites.monsters).map((b) => b.sprite)]);
    sheetIds.delete("wayfarer");
    // Players are paper dolls dressed by their equipment; the drawn stand-in
    // is only a fallback if the parts fail to load.
    let wayfarer: SpriteDef;
    try {
      setPaperDollKit(await loadPaperDoll());
      wayfarer = wayfarerSprite()!;
    } catch (err) {
      console.warn("paper doll unavailable, using the stand-in hero", err);
      wayfarer = buildHeroSprite();
    }
    const sprites: Record<string, SpriteDef> = { wayfarer };
    for (const id of sheetIds) sprites[id] = await loadSprite(id);
    status.remove();

    const inspector = new Inspector($("inspector"), sprites);
    $("toggle-inspector").onclick = () => { $("inspector").hidden = !$("inspector").hidden; };

    // Login.
    const form = $("login") as HTMLFormElement;
    const nameInput = $("login-name") as HTMLInputElement;
    const serverInput = $("login-server") as HTMLInputElement;
    nameInput.value = params.get("name") ?? remember("elyndra.name") ?? "";
    serverInput.value = remember("elyndra.server") ?? DEFAULT_SERVER;
    const start = async () => {
      const name = nameInput.value.trim();
      $("login-error").textContent = "";
      const conn = new Connection(serverInput.value.trim());
      const hud = new Hud(content);
      const dialog = new NpcDialog(content, hud);
      const game = new Game($("view"), conn, content, sprites, hud, dialog);
      try {
        await conn.connect(name);
      } catch (e) {
        $("login-error").textContent = (e as Error).message;
        game.renderer.domElement.remove();
        return;
      }
      remember("elyndra.name", name);
      remember("elyndra.server", serverInput.value.trim());
      form.hidden = true;
      $("hud").hidden = false;
      conn.onClose((reason) => {
        hud.log(`Disconnected: ${reason}. Reload to reconnect.`, "bad");
        $("disconnected").hidden = false;
        $("disconnected-reason").textContent = reason;
      });
      hud.log(`Welcome, ${name}. Click the ground to walk, monsters to attack, NPCs to talk. Skills 1-4, items 5-7, I inventory, Z pick up, F3 debug.`, "info");
      (window as unknown as { elyndra: object }).elyndra = { game, conn, content, hud };
      let last = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        game.frame(dt);
        inspector.update(dt * 1000);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };
    form.onsubmit = (ev) => { ev.preventDefault(); void start(); };
    if (params.get("auto") === "1" && nameInput.value) void start();
  } catch (err) {
    console.error(err);
    status.textContent = `Could not load: ${(err as Error).message}`;
    status.classList.add("error");
  }
}

main();
