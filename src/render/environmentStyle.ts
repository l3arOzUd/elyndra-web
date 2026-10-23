export interface EnvironmentStyle { sky:number; bounce:number; sun:number; ambient:number; strength:number; foliage:number; stone:number; }
const styles:Record<string,EnvironmentStyle>={
 lum:{sky:0xe6f2ff,bounce:0x596443,sun:0xffefd0,ambient:1.35,strength:1.65,foliage:0xa7b78d,stone:0xbdb397},
 ver:{sky:0xc4e4db,bounce:0x375747,sun:0xe9edbe,ambient:1.3,strength:1.25,foliage:0x8eb59a,stone:0x8eaa9a},
 sol:{sky:0xdbeafa,bounce:0x877052,sun:0xffdfaa,ambient:1.35,strength:1.7,foliage:0xc2b187,stone:0xccb78a},
 tha:{sky:0xd4f1f4,bounce:0x557e79,sun:0xffefd0,ambient:1.4,strength:1.5,foliage:0xa6c2a0,stone:0xaac1b8},
 cry:{sky:0xdceafa,bounce:0x64758d,sun:0xe9f0ff,ambient:1.45,strength:1.3,foliage:0xc3d6df,stone:0xaabeca},
 emb:{sky:0xc5c7dc,bounce:0x645049,sun:0xffc28b,ambient:1.15,strength:1.35,foliage:0xa99d8e,stone:0xa69a96},
 noc:{sky:0xc3c4e6,bounce:0x4d4b70,sun:0xd4dcff,ambient:1.3,strength:1.15,foliage:0xa9adc9,stone:0xa4a6c1},
};
export function environmentStyle(id:string):EnvironmentStyle{
 const base=styles[id.slice(0,3)]??styles.lum;
 return id.includes('_dun_')?{...base,ambient:1.1,strength:0.85,sun:id.startsWith('sol')?0xffd093:base.sun}:base;
}
