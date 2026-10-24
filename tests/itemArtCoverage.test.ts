import { expect,it } from 'vitest';
import { readFileSync,existsSync } from 'node:fs';
import type { ItemDef } from '../src/data/schema';
it('ships valid atlas cells for every drop-pool equipment base and unique',()=>{
  const items:ItemDef[]=JSON.parse(readFileSync('public/data/items.json','utf8'));
  for(const item of items){
    if(item.equip && (item.drop_pool || item.equip.unique))expect(item.icon,item.name).toBeTruthy();
    if(!item.icon)continue;
    const [sheet,cell,cols,rows]=item.icon.split(':').map(Number);
    expect(cell).toBeGreaterThanOrEqual(0);expect(cell).toBeLessThan(cols*rows);
    expect(existsSync(`public/ui/painted/items-v3-${String(sheet).padStart(2,'0')}.png`),item.name).toBe(true);
  }
});
