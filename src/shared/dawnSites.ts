export const dawnSites = [
  { id: 'barn', name: 'Collapsed Granary', x: 90, z: 45, radius: 8 },
  { id: 'mill', name: 'Broken Watermill', x: 139, z: 112, radius: 10 },
  { id: 'garden', name: 'Old Orchard Well', x: 106, z: 131, radius: 7 },
];
export const siteReserved = (x: number, z: number) => dawnSites.some(s => Math.abs(x-s.x) < s.radius && Math.abs(z-s.z) < s.radius);
export const siteWalls: {x:number; z:number; height:number; site:string}[] = [];
for(let x=85;x<=94;x++)siteWalls.push({x,z:42,height:0.55,site:'barn'});
for(let z=43;z<=48;z++)for(const x of [85,94])siteWalls.push({x,z,height:0.55,site:'barn'});
for(const x of [86,87,88,92,93])siteWalls.push({x,z:48,height:0.45,site:'barn'});
for(let x=136;x<=142;x++)siteWalls.push({x,z:108,height:2.4,site:'mill'});
for(let z=109;z<=114;z++)for(const x of [136,142])siteWalls.push({x,z,height:x===136?1.6:2.1,site:'mill'});
for(const x of [137,138,141])siteWalls.push({x,z:114,height:0.7,site:'mill'});
for(let z=109;z<=113;z++)siteWalls.push({x:143,z,height:0,site:'wheel'});
for(let z=127;z<=133;z++)siteWalls.push({x:102,z,height:0.7,site:'garden'});
for(const x of [106,107])for(const z of [130,131])siteWalls.push({x,z,height:0,site:'well'});
export const siteWallCell=(x:number,z:number)=>siteWalls.some(w=>w.x===x&&w.z===z);
