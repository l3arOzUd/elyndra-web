import '../style.css';
import './uiPreview.css';
import * as THREE from 'three';
import { loadContent, loadLayout } from '../data/content';
import type { RecipeDef, ShopDef } from '../data/schema';
import type { GearView, MsgOf, QuestView } from '../net/protocol';
import { mountShell } from '../ui/shell';
import { Hud } from '../ui/hud';
import { NpcDialog } from '../ui/npcDialog';
import { Minimap } from '../ui/minimap';
import { Inspector } from '../ui/inspector';
import { buildHeroSprite } from '../render/heroSprite';
import { buildMap, animate } from '../render/terrain';
import { IsoCamera } from '../render/camera';

mountShell();
document.body.classList.add('ui-preview');
const $ = (id: string) => document.getElementById(id)!;
async function main() {
  const c = await loadContent();
  const [shops, recipes] = await Promise.all([
    fetch('/data/shops.json').then(r => r.json() as Promise<ShopDef[]>),
    fetch('/data/recipes.json').then(r => r.json() as Promise<RecipeDef[]>),
  ]);
  const hud = new Hud(c), dialog = new NpcDialog(c, hud);
  const inspector = new Inspector($('inspector'), { wayfarer: buildHeroSprite() });
  $('login').hidden = true; $('hud').hidden = false;
  $('player-name').textContent = $('equipment-name').textContent = 'Aeloria';
  // Sample character systems data (CHARACTER_SYSTEMS.md): copies of gear with
  // rolled affixes, worn Charms and Totems, and a character sheet.
  const items = [...c.items.values()];
  const base = (f: (it: typeof items[number]) => boolean) => items.find(f)!;
  const tier = (slot: string, kind?: string) => base(it => it.equip?.slot === slot && it.equip.item_level === 30 && (!kind || it.equip.kind === kind) && (slot !== 'weapon' || it.equip.job === 'vanguard'));
  const totemBase = (type: string, grade = 2) => base(it => it.equip?.totem?.type === type && it.equip.totem.grade === grade);
  const charmBase = (type: string, grade = 2) => base(it => it.equip?.charm?.type === type && it.equip.charm.grade === grade);
  let uid = 1;
  const copy = (it: typeof items[number], rarity: GearView['rarity'], affixes: GearView['affixes'] = [], slot?: string, link?: string): GearView => ({ uid: uid++, base: it.id, rarity, ilvl: it.equip?.item_level ?? 30, affixes, slot, link });
  const sampleGear: GearView[] = [
    { ...copy(tier('weapon'), 'rare', [['inc_damage', 4, 11], ['crit_mult', 3, 11], ['chance_burn', 3, 6], ['inc_crit', 3, 28]], 'weapon'), refine: 4 },
    copy(tier('head', 'armour'), 'magic', [['inc_area', 3, 8]], 'head'),
    copy(tier('armor', 'armour'), 'rare', [['inc_local_defense', 3, 27], ['flat_hp', 3, 74], ['res_fire', 3, 15]], 'armor'),
    copy(tier('boots', 'armour_evasion'), 'magic', [['inc_move_speed', 3, 9], ['stat_vit', 2, 4]], 'boots'),
    copy(tier('accessory'), 'normal', [], 'accessory'),
    copy(charmBase('clover'), 'relic', [['stat_luk', 3, 4], ['cap_crit', 2, 53]], 'charm1'),
    copy(totemBase('fury'), 'magic', [['totem_duration', 2, 17]], 'charm2'),
    copy(totemBase('echo_fury', 3), 'rare', [['totem_charges', 3, 18], ['totem_effect', 2, 14]], 'charm3', 'iron_cyclone'),
    copy(tier('weapon'), 'magic', [['leech', 3, 0.55]]),
    copy(tier('armor', 'evasion_shield'), 'rare', [['inc_local_defense', 4, 34], ['res_cold', 3, 14], ['inc_shield_recharge', 2, 13]]),
    copy(totemBase('echo_slaughter', 1), 'normal'),
    copy(base(it => it.equip?.unique === 'glass_ember'), 'unique'),
  ];
  hud.setStats({ t:'stats', lv:30, job:'vanguard', hp:1980, mhp:2240, sp:186, msp:300, sh:160, msh:410, atk:412, def:268, exp:684, next:1200,
    tot:[{ slot:'charm2', ch:31, need:40, left:0 }, { slot:'charm3', ch:62, need:98, left:0, trigger:'hits', link:'iron_cyclone' }],
    ail:[{ kind:'burn', left:2400 }, { kind:'chill', left:1300 }] });
  const bag: Record<string, number> = {};
  items.filter(it => !it.equip).slice(0, 18).forEach((it, i) => bag[it.id] = 3 + i * 2);
  for (const it of items.filter(it => it.use)) bag[it.id] = 24;
  const equip: Record<string, string> = {};
  for (const g of sampleGear) if (g.slot) equip[g.slot] = g.base;
  hud.setInventory({ t:'inv', ver:1, full:true, items:bag, zeny:2480, equip, gear:sampleGear });
  hud.setSheet({ t:'sheet', stats:{ pow:40, luk:20, agi:12, dex:0, int:0, vit:15 }, bonus:{ pow:9, luk:4, vit:4 }, points:0, free_reset:false,
    d:{ atk:412, atk_base:343, weapon:138, inc_damage:0.11, more_damage:1, crit:0.2, crit_mult:1.69, cdr:0.074, cast:0, attack_ms:748, max_hp:2240, max_sp:300, max_shield:410,
      armour:268, evasion:41, poise:0.159, leech:0, leech_cap:0.1, hp_on_kill:0, sp_on_kill:0, hp_regen:0, sp_regen_inc:0, move:0.09, grip:0, magnet:0, area:0.08, area_more:1,
      duration:0, shield_recharge:0.3, exp_bonus:0, cap_crit:0.53, cap_cdr:0.4, cap_cast:0.55, cap_poise:0.5, cap_evasion:0.6,
      res_fire:0.15, res_cold:0, res_nature:0, res_shadow:0, cap_res_fire:0.75, cap_res_cold:0.75, cap_res_nature:0.75, cap_res_shadow:0.75 },
    mastery:{ basic:[3, 1210, 1800], cleaving_arc:[5, 3410, 5000], iron_cyclone:[4, 1950, 3200], anchor_shout:[1, 40, 200], sundering_pulse:[2, 260, 800] } });
  const quests: QuestView[] = [...c.quests.values()].slice(0, 3).map((q, i) => ({
    id:q.id, title:q.title, summary:q.summary, turn_in:q.turn_in_npc_id, state:i === 1 ? 'ready' : 'active',
    goals:q.objectives.map(o => o.count), progress:q.objectives.map(o => i === 1 ? o.count : Math.floor(o.count * .6)),
  }));
  hud.setQuests(quests);
  hud.log('A new chapter begins in Lumeris.');
  hud.log('Obtained Moss Fiber ×3', 'info');
  hud.log('Quest progress: the meadow is growing quieter.', 'info');
  hud.log('Preview mode · sample inventory and stats.', 'info');

  const notice = document.createElement('div'); notice.className = 'preview-notice'; notice.setAttribute('role', 'status'); notice.hidden = true; document.body.append(notice);
  let noticeTimer = 0;
  const feedback = (text: string) => {
    notice.textContent = 'Preview only · ' + text; notice.hidden = false;
    clearTimeout(noticeTimer); noticeTimer = window.setTimeout(() => notice.hidden = true, 3500);
    hud.log(text, 'good');
  };
  // UI examples never connect to the server or alter a player's inventory.
  hud.onUse = id => feedback('Use ' + c.items.get(id)?.name);
  hud.onEquip = uid => feedback('Equip ' + (c.items.get(hud.gear.get(uid)?.base ?? '')?.name ?? uid));
  hud.onUnequip = slot => feedback('Unequip ' + slot);
  hud.onStat = (stat, n) => feedback('+' + n + ' ' + stat.toUpperCase());
  hud.onResetStats = () => feedback('Reset stat points');
  hud.onTotem = slot => feedback('Use Totem in ' + slot);
  hud.onLink = (slot, skill) => feedback('Link ' + (c.skills.get(skill)?.name ?? skill) + ' to ' + slot);
  hud.onDiscard = uid => feedback('Discard ' + (c.items.get(hud.gear.get(uid)?.base ?? '')?.name ?? uid));
  hud.onSkill = id => { feedback(c.skills.get(id)?.name ?? id); hud.startCooldown(id); };
  dialog.onOp = (_npc, op, arg, qty) => feedback(op + (arg ? ' · ' + (c.items.get(arg)?.name ?? c.maps.get(arg)?.name ?? arg) : '') + (qty ? ' ×' + qty : ''));

  const baseNpc = (role: string): MsgOf<'npc'> => {
    const npc = [...c.npcs.values()].find(n => n.role === role && n.id.startsWith('npc_lum_')) ?? [...c.npcs.values()].find(n => n.role === role)!;
    return { t:'npc', npc:npc.id, name:npc.name, role:npc.role, lines:[] };
  };
  const merchant = baseNpc('merchant');
  merchant.lines = ['A well-packed satchel is the beginning of a good adventure. What can I find for you?'];
  merchant.shop = shops.find(s => s.npc_id === merchant.npc)?.items.map(i => [i.item_id, i.price]);
  const craft = baseNpc('craftsman'); craft.lines = ['There is a story in every material. Let us make something worthy of yours.']; craft.recipes = recipes.filter(r => r.npc_id === craft.npc);
  const travel = baseNpc('teleporter'); travel.lines = ['The Aether paths are open. Where will your story take you next?']; travel.dest = c.npcs.get(travel.npc)?.destinations;
  const healer = baseNpc('healer'); healer.lines = ['Rest a moment, wayfarer. Even the strongest roots need water.'];
  const guild = baseNpc('guild_registrar'); guild.lines = ['Lumeris needs people with a little courage. I have a few tasks that might suit you.']; guild.offer = [quests[0]]; guild.ready = [quests[1].id];
  const services: Record<string, MsgOf<'npc'>> = { shop:merchant, craft, travel, healer, guild };
  const toolbar = document.createElement('nav'); toolbar.className = 'preview-toolbar'; toolbar.setAttribute('aria-label', 'Interface preview');
  toolbar.innerHTML = '<div><strong>INTERFACE ATELIER</strong><small>Sample data · no server changes</small></div><select id="preview-mode" aria-label="Preview window"><option value="hud">HUD / In-game</option><option value="bag">Satchel</option><option value="equipment">Equipment</option><option value="character">Character</option><option value="gear">Gear detail</option><option value="journal">Quest journal</option><option value="shop">Shop / Buy & sell</option><option value="craft">Crafting</option><option value="travel">Travel</option><option value="healer">Healer</option><option value="guild">NPC quests</option><option value="menu">Camp menu</option><option value="login">Login</option><option value="disconnected">Disconnected</option><option value="inspector">Animation studio</option><option value="debug">Diagnostics</option></select><a href="/">Play ↗</a>';
  $('view').append(toolbar);
  const open = (mode: string) => {
    ($('preview-mode') as HTMLSelectElement).value = mode;
    notice.hidden = true; $('ui-toast').hidden = true;
    hud.closeWindows(); dialog.close();
    $('login').hidden = mode !== 'login'; $('hud').hidden = mode === 'login'; $('disconnected').hidden = mode !== 'disconnected'; $('debug-win').hidden = mode !== 'debug';
    if (mode === 'bag' || mode === 'equipment') {
      hud.toggle('inv-win', true);
      (document.querySelector('[data-bag-tab="' + (mode === 'bag' ? 'items' : 'equipment') + '"]') as HTMLButtonElement).click();
    } else if (mode === 'character') hud.toggle('char-win', true);
    else if (mode === 'gear') {
      hud.toggle('inv-win', true);
      (document.querySelector('[data-bag-tab="items"]') as HTMLButtonElement).click();
      (document.querySelector('#inventory .item-cell.rarity-rare') as HTMLButtonElement | null)?.click();
    } else if (mode === 'journal') hud.toggle('journal-win', true);
    else if (mode === 'menu') hud.toggle('menu-win', true);
    else if (mode === 'inspector') $('inspector').hidden = false;
    else if (services[mode]) dialog.show(services[mode]);
    hud.setTarget(mode === 'hud' ? { name:'Thornback', level:18, hp:1840, mhp:2400 } : null);
    $('disconnected-reason').textContent = 'Sample connection state. Reload to reconnect.';
    $('debug-text').textContent = 'PREVIEW · EXAMPLE VALUES\nMap: Dawnmeadow\nTick p50 / p95: 1.2 / 2.5 ms\nMobs: 130 · Chasing: 30\nPlayers: 1 · Network: 8.2 KB/s';
  };
  $('login').onsubmit = ev => { ev.preventDefault(); open('hud'); ($('preview-mode') as HTMLSelectElement).value = 'hud'; };
  $('login-name').setAttribute('value', 'Aeloria'); ($('login-server') as HTMLInputElement).value = 'Preview · offline';
  $('preview-mode').onchange = () => open(($('preview-mode') as HTMLSelectElement).value);
  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { open('hud'); (document.activeElement as HTMLElement)?.blur(); return; }
    const target = ev.target as HTMLElement;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;
    if (ev.code === 'KeyI') hud.toggle('inv-win');
    if (ev.code === 'KeyQ') hud.toggle('journal-win');
    if (ev.code === 'KeyC') hud.toggle('char-win');
  });

  const map = [...c.maps.values()].find(m => m.name === 'Dawnmeadow') ?? [...c.maps.values()].find(m => m.type === 'field')!;
  const layout = await loadLayout(c, map.id), region = c.regions.get(map.region_id);
  const warps = c.warps.filter(w => w.from_map === map.id), built = buildMap(layout, region, warps);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(region?.palette.fog ?? '#72805a');
  scene.add(built.group, new THREE.HemisphereLight(0xe6f2ff,0x4b5b3a,1.5));
  const sun = new THREE.DirectionalLight(0xfff0d0,1.8); sun.position.set(-40,80,30); scene.add(sun);
  const renderer = new THREE.WebGLRenderer({ antialias:true }); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; $('view').prepend(renderer.domElement);
  const camera = new IsoCamera(innerWidth/innerHeight);
  const landmark = layout.landmarks.find(l => l.kind === 'crossroads') ?? layout.landmarks[0];
  const at = new THREE.Vector3(landmark?.x ?? map.arrival[0],0,landmark?.y ?? map.arrival[1]);
  camera.target.copy(at); camera.zoom(3); camera.update(1,at);
  const minimap = new Minimap($('minimap') as HTMLCanvasElement); minimap.setMap(layout); minimap.draw({x:at.x,y:at.z},[],[],[],warps);
  hud.setMap(map.name, 'Lumeris · Field · Lv ' + map.recommended_level_min + '–' + map.recommended_level_max);
  const resize = () => { renderer.setSize(innerWidth,innerHeight); camera.camera.aspect = innerWidth/innerHeight; camera.camera.updateProjectionMatrix(); };
  window.addEventListener('resize',resize); resize();
  const panel = new URLSearchParams(location.search).get('panel') ?? 'hud';
  ($('preview-mode') as HTMLSelectElement).value = panel; open(panel);
  $('loading').remove();
  let last = performance.now();
  const frame = (now: number) => { const dt = Math.min(.05,(now-last)/1000); last=now; animate(built,dt); camera.update(dt,at); inspector.update(dt*1000); hud.refreshHotbar(); renderer.render(scene,camera.camera); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  Object.assign(window, { uiPreview:{ hud, dialog, content:c, open, services } });
}
main().catch(e => { $('loading').textContent = 'Preview could not load: ' + (e as Error).message; $('loading').classList.add('error'); console.error(e); });
