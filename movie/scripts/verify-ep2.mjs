import { chromium } from 'playwright-core';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch({executablePath:EXE,args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/api\/tts|Failed to load resource/.test(m.text()))errs.push('CON: '+m.text());});
await p.goto('http://localhost:5180/episode2.html?seed=eden',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.__ep2&&window.__ep2.script,{timeout:15000});
const info=await p.evaluate(()=>({cues:window.__ep2.script.cues.length,living:window.__ep2.script.living,world:window.__ep2.world?.full}));
// wait for surface prewarm (poll readiness)
await p.waitForFunction(()=>{const s=window.__ep2.stage.scenes.get('surface'); return s&&s.ready;},{timeout:60000}).catch(()=>{});
// drive the whole cue list through the real director, fast
const seen=await p.evaluate(async()=>{
  const {script,director,stage}=window.__ep2; const seen={};
  window.__ep2.narrator.muted=true;
  for(let i=0;i<script.cues.length;i++){
    try{ await director(script.cues[i]); }catch(e){ return {error:'director cue '+i+': '+e.message}; }
    const n=stage.active?.constructor?.name??'none'; seen[n]=(seen[n]||0)+1;
    await new Promise(r=>setTimeout(r,60));
  }
  return {seen};
});
await b.close();
console.log('script:',JSON.stringify(info));
console.log('scenes activated across cues:',JSON.stringify(seen.seen||seen));
if(seen.error){console.error('FAIL:',seen.error);process.exit(2);}
if(errs.length){console.log('ERRORS:');errs.slice(0,10).forEach(e=>console.log('  '+e));process.exit(1);}
console.log('OK: all',info.cues,'cues staged through the director, no runtime errors.');
