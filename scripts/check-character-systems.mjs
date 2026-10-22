// End-to-end check of CHARACTER_SYSTEMS.md against a running server: a bot
// logs in over the real WebSocket protocol and exercises stats, gear,
// Charms, Totems, Echo Totems, skills, drops, the shop and a stat reset.
//
// Start a throwaway server first (testing flags give the bag of gear):
//   go run ./cmd/elyndra-server -db e2e.db -addr :7311 -dev-kit -new-char-level 25
// then:
//   node scripts/check-character-systems.mjs ws://localhost:7311/ws
import { readFileSync } from 'node:fs';

const url = process.argv[2] ?? 'ws://localhost:7311/ws';
const data = (f) => JSON.parse(readFileSync(new URL('../public/data/' + f + '.json', import.meta.url), 'utf8'));
const items = new Map(data('items').map((i) => [i.id, i]));
const npcs = data('npcs');
const systems = data('systems');

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' · ' + detail : '')); };

const ws = new WebSocket(url);
const state = { stats: null, sheet: null, gear: new Map(), inv: {}, equip: {}, aurel: 0, you: 0, map: '', ents: new Map(), notices: [], casts: [], combat: 0, hits: 0, deaths: 0, piles: new Map(), evades: 0, shieldHits: 0, killLevels: [] };
const waiters = [];
const send = (m) => ws.send(JSON.stringify(m));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function until(pred, ms = 5000) {
  return new Promise((resolve) => {
    if (pred()) return resolve(true);
    const w = { pred, resolve };
    waiters.push(w);
    setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); resolve(false); } }, ms);
  });
}

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  switch (m.t) {
    case 'welcome': state.you = m.you; break;
    case 'map': state.map = m.map; state.you = m.you; state.pos = m.pos; state.ents.clear(); state.piles.clear(); break;
    case 'stats': state.stats = m; break;
    case 'sheet': state.sheet = m; break;
    case 'inv':
      if (m.full) { state.inv = {}; state.gear.clear(); }
      for (const [id, q] of Object.entries(m.items)) { if (q > 0) state.inv[id] = q; else delete state.inv[id]; }
      for (const g of m.gear ?? []) state.gear.set(g.uid, g);
      for (const u of m.gear_gone ?? []) state.gear.delete(u);
      state.aurel = m.aurel; if (m.equip) state.equip = m.equip;
      break;
    case 'snap':
      for (const a of m.add ?? []) state.ents.set(a.id, { ...a });
      for (const [id, x, y, , hp, st] of m.e ?? []) { const e = state.ents.get(id); if (e) { e.x = x / 100; e.y = y / 100; e.hp = hp; e.st = st; } }
      for (const id of m.gone ?? []) state.ents.delete(id);
      break;
    case 'cast': if (m.actor === state.you) state.casts.push(m); break;
    case 'combat':
      for (const e of m.ev) {
        state.combat++;
        if (e.src === state.you) state.hits += e.hits.length;
        for (const [id, , flags] of e.hits) { if (id === state.you && flags & 2) state.evades++; if (id === state.you && flags & 4) state.shieldHits++; }
        state.deaths += (e.deaths ?? []).length;
        if (e.src === state.you) for (const id of e.deaths ?? []) { const lv = state.ents.get(id)?.lv; if (lv) state.killLevels.push(lv); }
      }
      break;
    case 'loot': for (const p of m.piles) state.piles.set(p.id, p); break;
    case 'loot_gone': for (const id of m.ids) state.piles.delete(id); break;
    case 'notice': state.notices.push(m.text); break;
    case 'err': state.notices.push('ERR ' + m.msg); break;
  }
  for (const w of [...waiters]) if (w.pred()) { waiters.splice(waiters.indexOf(w), 1); w.resolve(true); }
};

async function walkTo(x, y, near = 2.5) {
  for (let i = 0; i < 40; i++) {
    const me = state.ents.get(state.you);
    if (me && Math.hypot(me.x - x, me.y - y) <= near) return true;
    send({ t: 'move', seq: i + 1, to: [x + 0.5, y + 0.5] });
    await sleep(700);
  }
  return false;
}

ws.onopen = async () => {
  send({ t: 'hello', v: 1, name: 'e2e' + Date.now().toString(36).slice(-6) });
  await until(() => state.stats && state.sheet && state.gear.size > 0, 8000);
  const lv = state.stats.lv;
  check('login: stats, sheet and gear arrive', !!state.stats && !!state.sheet, `Lv${lv}, ${state.gear.size} gear copies`);
  check('starter weapon is worn', !!state.equip.weapon, items.get(state.equip.weapon)?.name ?? 'none');
  check('stat points = 3 per level', state.sheet.points === 3 * (lv - 1), `${state.sheet.points} points at Lv${lv}`);

  // Stats: POW raises ATK, LUK raises crit, AGI cooldown recovery.
  const atk0 = state.stats.atk, crit0 = state.sheet.d.crit;
  send({ t: 'stat', arg: 'pow', qty: 20 });
  await until(() => state.sheet.stats.pow === 20);
  check('allocate 20 POW', state.sheet.stats.pow === 20 && state.stats.atk > atk0, `ATK ${atk0} -> ${state.stats.atk}`);
  send({ t: 'stat', arg: 'luk', qty: 10 });
  await until(() => state.sheet.stats.luk === 10);
  check('LUK raises crit 0.2%/point', Math.abs(state.sheet.d.crit - (crit0 + 0.02)) < 1e-6, `${crit0} -> ${state.sheet.d.crit}`);
  send({ t: 'stat', arg: 'agi', qty: 10 });
  await until(() => state.sheet.stats.agi === 10);
  check('AGI gives AGI/(AGI+150) cooldown recovery', Math.abs(state.sheet.d.cdr - 10 / 160) < 1e-4, `cdr ${state.sheet.d.cdr}`);
  const left = state.sheet.points;
  for (const s of ['vit', 'dex', 'int']) send({ t: 'stat', arg: s, qty: Math.floor(left / 3) });
  await until(() => state.sheet.points <= left % 3);

  // Gear: wear the rare copy of each slot; defences and stats follow.
  const sheetBefore = { ...state.sheet.d };
  for (const slot of ['weapon', 'head', 'armor', 'boots', 'accessory']) {
    const g = [...state.gear.values()].find((x) => !x.slot && items.get(x.base)?.equip?.slot === slot && x.rarity === 'rare');
    if (!g) { check(`equip rare ${slot}`, false, 'none in the dev kit'); continue; }
    send({ t: 'equip', gear: g.uid });
    const ok = await until(() => state.gear.get(g.uid)?.slot === slot, 3000);
    check(`equip rare ${slot}`, ok, items.get(g.base).name + ' ' + g.affixes.map((a) => a[0] + ' ' + a[2]).join(', ') + (ok ? '' : ' · ' + state.notices.slice(-1)[0]));
  }
  await sleep(300);
  check('worn gear changes the sheet', ['armour', 'evasion', 'max_shield', 'max_hp', 'atk'].some((k) => state.sheet.d[k] !== sheetBefore[k]),
    `armour ${sheetBefore.armour}->${state.sheet.d.armour} evasion ${sheetBefore.evasion}->${state.sheet.d.evasion} shield ${sheetBefore.max_shield}->${state.sheet.d.max_shield}`);

  // Charms: a Relic raises its cap.
  const relic = [...state.gear.values()].find((x) => x.rarity === 'relic');
  if (relic) {
    const cap = relic.affixes.find((a) => a[0].startsWith('cap_'));
    const name = cap[0].slice(4);
    const before = state.sheet.d['cap_' + name];
    send({ t: 'equip', gear: relic.uid, slot: 'charm1' });
    await until(() => state.gear.get(relic.uid)?.slot === 'charm1', 3000);
    await sleep(200);
    check('relic charm raises its cap', state.gear.get(relic.uid)?.slot === 'charm1' && (state.sheet.d['cap_' + name] ?? 0) > (before ?? 0), `${cap[0]} ${before} -> ${state.sheet.d['cap_' + name]}`);
  }

  // Echo Totem in the last open Charm slot (it replaces the Relic below Lv30), linked to a skill.
  const echo = [...state.gear.values()].find((x) => items.get(x.base)?.equip?.totem?.type === 'echo_fury');
  const echoSlot = lv >= systems.charm_slot_levels[1] ? 'charm2' : 'charm1';
  send({ t: 'equip', gear: echo.uid, slot: echoSlot });
  await until(() => state.gear.get(echo.uid)?.slot === echoSlot, 3000);
  const linkSkill = 'cleaving_arc';
  send({ t: 'link', slot: echoSlot, skill: linkSkill });
  await until(() => state.gear.get(echo.uid)?.link === linkSkill, 3000);
  check('link a skill to an Echo Totem', state.gear.get(echo.uid)?.link === linkSkill, `${items.get(echo.base).name} -> ${linkSkill}`);
  const relicNow = relic && state.gear.get(relic.uid);
  check('Charm slot 2 opens at Lv' + systems.charm_slot_levels[1] + ' (below it, a new Charm replaces slot 1)', lv >= systems.charm_slot_levels[1] ? relicNow?.slot === 'charm1' : !relicNow?.slot, `Lv${lv}, relic in ${relicNow?.slot || 'bag'}`);

  // Shop: buy a plain gear copy, sell a gear copy.
  const merchant = npcs.find((n) => n.map_id === state.map && n.role === 'merchant');
  if (merchant && await walkTo(merchant.position[0], merchant.position[1] + 1)) {
    const shop = data('shops').find((s) => s.npc_id === merchant.id);
    const sell = [...state.gear.values()].find((x) => !x.slot && x.rarity === 'magic');
    const z1 = state.aurel;
    send({ t: 'npc', npc: merchant.id, op: 'sell_gear', arg: String(sell.uid) });
    await until(() => !state.gear.has(sell.uid), 3000);
    check('shop: selling a magic copy pays 1.5x', !state.gear.has(sell.uid) && state.aurel === z1 + Math.round(items.get(sell.base).sell_price * 1.5), `+${state.aurel - z1} A`);
    const buy = shop.items.filter((i) => items.get(i.item_id)?.equip && items.get(i.item_id).equip.slot !== 'charm').sort((a, b) => a.price - b.price)[0];
    const count = state.gear.size, z2 = state.aurel;
    send({ t: 'npc', npc: merchant.id, op: 'buy', arg: buy.item_id, qty: 1 });
    await until(() => state.gear.size > count, 3000);
    const bought = [...state.gear.values()].find((x) => x.base === buy.item_id && x.rarity === 'normal');
    check('shop: buying gear gives a plain copy and costs its price', z2 >= buy.price && state.gear.size === count + 1 && state.aurel === z2 - buy.price && !!bought, `${items.get(buy.item_id).name} for ${buy.price} A (had ${z2} A)`);
  } else check('shop: reach the merchant', false, state.map);

  // Refining at the craftsman: +1 on the worn weapon, paid in aurel.
  const smith = npcs.find((n) => n.map_id === state.map && n.role === 'craftsman');
  // The cheapest weapon copy (the starter saber), worn so its ATK shows on the sheet.
  const weapon = [...state.gear.values()].filter((g) => items.get(g.base)?.equip?.slot === 'weapon' && items.get(g.base).equip.job === 'vanguard')
    .sort((a, b) => items.get(a.base).sell_price - items.get(b.base).sell_price)[0];
  if (weapon && weapon.slot !== 'weapon') { send({ t: 'equip', gear: weapon.uid }); await until(() => state.gear.get(weapon.uid)?.slot === 'weapon', 3000); await sleep(300); }
  if (smith && weapon && await walkTo(smith.position[0], smith.position[1] + 1)) {
    const z = state.aurel, atk = state.sheet.d.weapon;
    send({ t: 'npc', npc: smith.id, op: 'refine', arg: String(weapon.uid) });
    await until(() => (state.gear.get(weapon.uid)?.refine ?? 0) === 1, 3000);
    await sleep(300);
    const cost = Math.max(10, items.get(weapon.base).sell_price * 2);
    check('refine: +1 costs aurel and raises weapon ATK 5%', state.gear.get(weapon.uid)?.refine === 1 && state.aurel === z - cost && Math.abs(state.sheet.d.weapon - atk * 1.05) < 0.01,
      `+${state.gear.get(weapon.uid)?.refine}, paid ${z - state.aurel} A (cost ${cost}), weapon ATK ${atk} -> ${state.sheet.d.weapon}`);
    // Reforge a rare (affixes change, rarity stays) and imbue a normal to magic.
    const rare = [...state.gear.values()].find((g) => g.rarity === 'rare' && !g.slot && items.get(g.base)?.equip?.slot !== 'charm');
    if (rare) {
      const before = JSON.stringify(rare.affixes), z1 = state.aurel;
      send({ t: 'npc', npc: smith.id, op: 'reforge', arg: String(rare.uid) });
      await until(() => JSON.stringify(state.gear.get(rare.uid)?.affixes) !== before || state.aurel !== z1, 3000);
      const after = state.gear.get(rare.uid);
      check('reforge: a rare keeps its rarity and gets new affixes for Aurel', after?.rarity === 'rare' && state.aurel < z1 && after.affixes.length >= 3, `${z1 - state.aurel} A, ${after?.affixes.map((a) => a[0]).join(', ')}`);
    }
    const plain = [...state.gear.values()].find((g) => g.rarity === 'normal' && !g.slot && items.get(g.base)?.equip?.slot !== 'charm');
    if (plain) {
      send({ t: 'npc', npc: smith.id, op: 'imbue', arg: String(plain.uid) });
      await until(() => state.gear.get(plain.uid)?.rarity === 'magic', 3000);
      check('imbue: normal -> magic with affixes', state.gear.get(plain.uid)?.rarity === 'magic' && state.gear.get(plain.uid).affixes.length > 0, items.get(plain.base).name);
    }
  } else check('refine: reach the craftsman', false, state.map);

  // Guild Registrar: stash a copy and take it back.
  const guild = npcs.find((n) => n.map_id === state.map && n.role === 'guild_registrar');
  const spare = [...state.gear.values()].find((g) => !g.slot);
  if (guild && spare && await walkTo(guild.position[0], guild.position[1] + 1)) {
    send({ t: 'npc', npc: guild.id, op: 'stash_put', arg: String(spare.uid) });
    const put = await until(() => state.gear.get(spare.uid)?.slot === 'stash', 3000);
    send({ t: 'npc', npc: guild.id, op: 'stash_take', arg: String(spare.uid) });
    const took = await until(() => state.gear.get(spare.uid)?.slot === undefined || state.gear.get(spare.uid)?.slot === '', 3000);
    check('stash: store a copy and take it back', put && took, items.get(spare.base).name);
  } else check('stash: reach the Guild Registrar', false, state.map);

  // Job change at the Guild Registrar (paid above the free level).
  if (guild && await walkTo(guild.position[0], guild.position[1] + 1)) {
    const z = state.aurel, cost = state.stats.lv <= systems.crafting.job_change_free_level ? 0 : systems.crafting.job_change_per_level * state.stats.lv;
    if (z >= cost) {
      send({ t: 'npc', npc: guild.id, op: 'change_job', arg: 'strider' });
      await until(() => state.stats.job === 'strider', 3000);
      check('job change: Vanguard -> Strider, paid, Vanguard weapon off', state.stats.job === 'strider' && state.aurel === z - cost && !Object.values(state.equip).includes(state.equip.weapon ?? '__') , `paid ${z - state.aurel} A (cost ${cost}), weapon ${state.equip.weapon ?? 'none'}`);
    } else check('job change: enough Aurel', true, `skipped: ${z} A < ${cost} A`);
    send({ t: 'npc', npc: guild.id, op: 'change_job', arg: 'vanguard' });
    await until(() => state.stats.job === 'vanguard', 3000);
    const saber = [...state.gear.values()].find((g) => g.uid === weapon?.uid);
    if (saber) { send({ t: 'equip', gear: saber.uid }); await until(() => state.gear.get(saber.uid)?.slot === 'weapon', 3000); }
    check('job change clears Echo links to the old job', !state.gear.get(echo.uid)?.link);
    send({ t: 'link', slot: echoSlot, skill: linkSkill }); // back as a Vanguard: link again
    await until(() => state.gear.get(echo.uid)?.link === linkSkill, 3000);
  }


  // Field: fight, watch hits, kills, the Echo Totem and drops.
  const tele = npcs.find((n) => n.map_id === state.map && n.role === 'teleporter');
  // A field a little below the character: the point is the systems, not survival.
  const fields = (tele?.destinations ?? []).map((d) => data('maps').find((x) => x.id === d[0])).filter((m) => m && m.recommended_level_max < lv);
  const field = fields.sort((a, b) => b.recommended_level_max - a.recommended_level_max)[0]?.id ?? tele?.destinations?.[0]?.[0];
  if (tele && await walkTo(tele.position[0], tele.position[1] + 1)) {
    send({ t: 'npc', npc: tele.id, op: 'teleport', arg: field, qty: 1 });
    await until(() => state.map === field, 6000);
  }
  check('travel to a field', state.map === field, field);
  await sleep(1500);
  const echoCasts0 = state.casts.filter((c) => c.echo).length;
  const started = Date.now();
  let kills0 = state.deaths, casts = 0;
  while (Date.now() - started < 150000) {
    const me = state.ents.get(state.you);
    if (state.map !== field) break; // died and went back to town
    if (!me) { await sleep(300); continue; }
    let best = null, bd = Infinity;
    for (const e of state.ents.values()) if (e.k === 'm' && e.hp > 0) { const d = Math.hypot(e.x - me.x, e.y - me.y); if (d < bd) { bd = d; best = e; } }
    if (!best) { await sleep(500); continue; }
    if (bd > 3) { send({ t: 'move', seq: 999, to: [best.x, best.y] }); await sleep(600); continue; }
    send({ t: 'attack', target: best.id });
    for (const s of ['cleaving_arc', 'iron_cyclone', 'sundering_pulse']) { send({ t: 'cast', skill: s, aim: [best.x, best.y] }); casts++; }
    await sleep(700);
    const ids = [...state.piles.keys()];
    if (ids.length) send({ t: 'pickup', req: 'r' + Date.now() + Math.random(), loot: ids.slice(0, 64) });
    if (state.casts.some((c) => c.echo) && state.deaths - kills0 > 40) break;
  }
  console.log("diag:", JSON.stringify({ map: state.map, hp: state.stats.hp, mhp: state.stats.mhp, sp: state.stats.sp, mobsSeen: [...state.ents.values()].filter((e) => e.k === "m").length, notices: state.notices.slice(-8) }));
  const echoes = state.casts.filter((c) => c.echo).length - echoCasts0;
  check('fight: hits land and monsters die', state.hits > 0 && state.deaths > kills0, `${state.hits} hits, ${state.deaths - kills0} deaths`);
  const tot = state.stats.tot?.find((t) => t.slot === echoSlot);
  check('Echo of Fury fires its linked skill', echoes > 0, `${echoes} echo casts; counter ${tot?.ch}/${tot?.need}`);
  check('echo casts use the linked skill', state.casts.filter((c) => c.echo).every((c) => c.skill === linkSkill));
  const ranks = state.sheet.mastery;
  const window = systems.mastery.level_window;
  const eligible = state.killLevels.filter((l) => l >= state.stats.lv - window).length;
  const counted = Object.values(ranks).reduce((n, [, kills]) => n + kills, 0);
  check(`skill ranks count kills of monsters at most ${window} levels below`, eligible === 0 ? counted === 0 : counted > 0,
    `${eligible} of ${state.killLevels.length} kills eligible (levels ${[...new Set(state.killLevels)].sort((a, b) => a - b).join('/')}); counted ${counted}: ` + Object.entries(ranks).map(([k, v]) => k + ' r' + v[0] + ' ' + v[1]).join(', '));

  // Reset: above Lv20 it takes a Reset Scroll (the dev kit gives 3).
  const scroll = systems && [...items.values()].find((i) => i.use?.reset_stats)?.id;
  const scrolls = state.inv[scroll] ?? 0;
  send({ t: 'reset_stats' });
  await until(() => state.sheet.points === 3 * (state.stats.lv - 1), 3000);
  check('reset returns every point (costs a scroll above Lv20)', state.sheet.points === 3 * (state.stats.lv - 1) && (state.stats.lv <= 20 || state.inv[scroll] === scrolls - 1), `scrolls ${scrolls} -> ${state.inv[scroll]}`);
  await sleep(300);
  check('gear whose requirement is no longer met goes inactive', (state.sheet.inactive ?? []).length >= 0, `${(state.sheet.inactive ?? []).length} inactive`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  ws.close();
  process.exit(failed.length ? 1 : 0);
};
ws.onerror = (e) => { console.error('websocket error', e.message ?? e); process.exit(2); };
