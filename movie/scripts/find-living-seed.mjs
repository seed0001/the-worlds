import { Cosmos } from '../src/cosmos/Cosmos.js';
const out=[];
for(const s of ['verdant','eden','gaia','terra','life','ocean','world1','aria','kelune','bloom','seed42','haven','origin','pandora','avalon','elysium','1234','abcd','living','green']){
  try{ const c=new Cosmos(s); if(c.livingWorlds.length){ const w=c.livingWorlds[0].world; out.push({seed:s,n:c.livingWorlds.length,world:w.full,biome:w.biome.label,fauna:w.fauna.map(f=>f.species).join('/')}); } }catch(e){ out.push({seed:s,err:e.message}); }
}
console.log(JSON.stringify(out,null,1));
