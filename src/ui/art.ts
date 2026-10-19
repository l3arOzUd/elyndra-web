import type { ItemDef } from '../data/schema';

/** Original painted atlases. Cells are rendered directly; source PNGs stay intact. */
export function paintedIcon(index: number, kind: 'item' | 'skill' = 'item'): HTMLElement {
  const e = document.createElement('span'), columns = kind === 'item' ? 6 : 2;
  e.className = 'painted-icon ' + (kind === 'skill' ? 'skill-art' : 'item-art');
  e.setAttribute('aria-hidden', 'true');
  e.style.backgroundPosition = `${index % columns / (columns - 1) * 100}% ${Math.floor(index / columns) / (columns - 1) * 100}%`;
  e.dataset.artCell = String(index);
  return e;
}
export function paintedItem(item?: ItemDef): HTMLElement {
  const name = item?.name.toLowerCase() ?? '';
  let cell = 35;
  const material = Number(item?.id.replace('itm_', ''));
  if (material >= 1 && material <= 22) cell = material + 11;
  else if (item?.category === 'totem') cell = 31;
  else if (item?.category === 'charm') cell = 19;
  else if (item?.equip) cell = item.equip.slot === 'boots' ? 4 : item.equip.slot === 'armor' ? 3 : item.equip.slot === 'head' ? 5 : item.equip.slot === 'accessory' ? 10 : /bow/.test(name) ? 1 : /rod|staff/.test(name) ? 2 : /gauntlet/.test(name) ? 33 : 0;
  else if (item?.use) cell = item.use.reset_stats ? 34 : /ration/.test(name) ? 9 : item.use.heal_sp_pct ? 7 : 6;
  else if (item?.category === 'quest') cell = 34;
  else {
    const families: [RegExp, number][] = [[/seed|husk|nut/,13],[/dust|powder|spore|mycelium/,14],[/fur|hide|pelt|cloth/,18],[/scale|shell|plate|gill/,20],[/fang|claw|spine|horn/,21],[/wing|feather|membrane/,24],[/sap|oil|gel|dew/,29],[/wood|root|bark/,30],[/gear|joint|cog|coil|spindle/,33],[/amber|crystal|shard|ore|gem|core/,10],[/moss|leaf|fiber/,12]];
    cell = families.find(([pattern]) => pattern.test(name))?.[1] ?? 35;
  }
  const e = paintedIcon(cell); e.classList.add('rarity-' + (item?.rarity ?? 'common'));
  return e;
}
