import type { ItemDef } from '../data/schema';
import { paintedItem } from './art';

const paths: Record<string, string> = {
 crystal:'<path d="m16 3 9 11-9 15L7 14Z"/><path d="m16 3-3 11 3 15 4-15ZM7 14h18"/>',
 bow:'<path d="M8 3c24 9 24 17 0 26L8 3ZM3 16h26m-5-4 5 4-5 4"/>',
 staff:'<path d="m8 29 13-20M19 3l8 2 1 8-8-2ZM23 5l-2 4 5 1M10 24l4 2"/>',
 seed:'<path d="M15 28C1 23 4 9 22 4c7 11 7 21-7 24Z"/><path d="M12 25c-2-9 3-15 9-18M10 16l5 2M17 11l4 4"/>',
 dust:'<path d="m10 3 6 3 6-3-2 8c17 20-25 20-8 0Z"/><path d="M10 11h12M12 20h1m5 3h1m-1-7h1"/>',
 hide:'<path d="m7 3 8 5 10-5 4 7-7 6 7 10-7 3-7-5-9 5-4-7 7-6-6-7Z"/><path d="m10 12 3 3-1 5M18 10l-1 8 5 3"/>',
 scale:'<path d="M4 6c8-5 16-5 24 0v10L16 29 4 16Z"/><path d="M8 8v7l8 9 8-9V8M16 6v18"/>',
 fang:'<path d="M7 4c14 0 25 10 18 24-3-12-13-5-18-24Z"/><path d="M12 8c6 2 10 6 12 10"/>',
 wing:'<path d="M4 28 6 12 28 3l-3 14-8-2-1 9-7-4Z"/><path d="m4 28 24-25M9 20l19-17M17 15 28 3"/>',
 drop:'<path d="M16 3C12 11 5 15 5 21a11 8 0 0 0 22 0C27 15 20 11 16 3Z"/><path d="M10 19c-2 4 1 6 4 6"/>',
 wood:'<path d="m8 4 18 8v13L8 29 3 20V8Z"/><ellipse cx="8" cy="18" rx="5" ry="11"/><path d="M18 10v15M23 13v8M6 13v10"/>',
 gear:'<path d="m12 3 8 0 1 5 5 1 4 7-4 7-5 1-1 5h-8l-1-5-5-1-4-7 4-7 5-1Z"/><circle cx="16" cy="16" r="5"/>',
 ration:'<path d="M4 20C4 8 26 2 28 14v11L4 29Z"/><path d="M4 20l24-6M11 11l3 5M18 8l3 6M10 23l11-3"/>',
 sword:'<path d="m23 3 6 0-1 6-14 14-5-5Z"/><path d="m6 15 11 11M10 22l-6 6M3 25l4 4"/>',
 shield:'<path d="m16 3 11 4v10c0 6-11 12-11 12S5 23 5 17V7Z"/><path d="M16 8v15M10 13h12"/>',
 bag:'<path d="M10 10V7a6 6 0 0 1 12 0v3M7 10h18l3 18H4Z"/><path d="M11 18h10v6H11Z"/>',
 book:'<path d="M16 8C11 4 5 5 3 6v21c5-2 9-1 13 2 4-3 8-4 13-2V6c-2-1-8-2-13 2Z"/><path d="M16 8v21M7 11l5 1M7 16l5 1M20 12l5-1M20 17l5-1"/>',
 potion:'<path d="M12 3h8v7l6 8c6 12-26 12-20 0l6-8Z"/><path d="M11 3h10M8 19h16M12 23h3"/>',
 leaf:'<path d="M27 4C7 2 1 15 9 24 18 32 30 20 27 4Z"/><path d="M5 29 23 9M12 22l-1-9M17 17h8"/>',
 armor:'<path d="m10 4 6 4 6-4 7 7-5 5-3-2v15H11V14l-3 2-5-5Z"/><path d="M12 20h8M12 25h8"/>',
 boots:'<path d="M10 3h12l-1 17 7 3v6H5v-8l5-4Z"/><path d="M10 8h11M10 12h11M5 25h23"/>',
 coin:'<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="8"/><path d="m16 10 4 6-4 6-4-6Z"/>',
 wind:'<path d="M3 12h18c10 0 7-12 1-8M6 18h18c7 0 6 10 0 9M2 24h12M4 6h9"/>',
 anchor:'<circle cx="16" cy="6" r="3"/><path d="M16 9v20M9 13h14M4 19c0 13 24 13 24 0M4 19l-2 5M28 19l2 5"/>',
 burst:'<path d="m16 2 3 9 9-5-5 10 7 3-10 2-4 10-3-10-11-2 8-4-5-9 9 5Z"/>',
 hammer:'<path d="m10 4 17 8-4 7-6-3-8 14-5-3 8-14-5-3Z"/>',
 portal:'<path d="M5 29V15a11 11 0 0 1 22 0v14M10 29V15a6 6 0 0 1 12 0v14M3 29h26"/><path d="m14 18 4 3-4 3"/>',
 star:'<path d="m16 3 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1Z"/>',
 settings:'<path d="m12 3 8 0 1 5 5 2 4 6-4 6-5 2-1 5h-8l-1-5-5-2-4-6 4-6 5-2Z"/><circle cx="16" cy="16" r="5"/>',
 close:'<path d="m9 9 14 14M23 9 9 23"/>',
 search:'<circle cx="13" cy="13" r="8"/><path d="m19 19 9 9"/>',
 scroll:'<path d="M8 4h17v19H11V8a4 4 0 0 0-8 0v3h8M11 23c-8-3-9 6-3 6h15c5 0 5-6 2-6M15 10h6M15 15h6"/>',
 chat:'<path d="M4 5h24v18H13l-7 6v-6H4Z"/><path d="M9 11h14M9 17h10"/>'
};
export function icon(name: string, cls=''): HTMLElement {
 const span=document.createElement('span'); span.className='ui-icon '+cls;
 span.innerHTML=`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.crystal}</svg>`;
 return span;
}
/** rarity: a gear copy's rarity (Relic and Unique Charms have their own art). */
export function itemIcon(item?: ItemDef, rarity?: string): HTMLElement { return paintedItem(item, rarity); }
