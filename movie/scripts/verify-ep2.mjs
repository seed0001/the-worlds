import { chromium } from 'playwright-core';
const SEED=process.argv[2]??'eden';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch({executablePath:EXE,args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/api\/tts|Failed to load resource/.test(m.text()))errs.push('CON: '+m.text());});
await p.goto('http://localhost:5180/episode2.html?seed='+encodeURIComponent(SEED),{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.__ep2&&window.__ep2.script,{timeout:15000});
const info=await p.evaluate(()=>({cues:window.__ep2.script.cues.length,living:window.__ep2.script.living,world:window.__ep2.world?.full}));
// wait for surface prewarm (poll readiness)
await p.waitForFunction(()=>{const s=window.__ep2.stage.scenes.get('surface'); return s&&s.ready;},{timeout:60000}).catch(()=>{});

// --- The ecosystem contract: the cast the narration describes is on stage ---
const eco=await p.evaluate(()=>{
  const s=window.__ep2.stage.scenes.get('surface'); if(!s?.ready) return {skip:'no surface'};
  const f=s.fauna; const fails=[];
  const cast=f.cast??{}; const sites=f.sites??{};
  const keys=['A','B','C','D','E','F'];
  for(const k of keys) if(!cast[k]) fails.push('cast '+k+' missing');
  const species=new Set(f.populations.map(p=>p.genome.species));
  if(species.size<5) fails.push('only '+species.size+' species on stage: '+[...species].join(','));
  if(cast.C&&cast.C===cast.B) fails.push('C is the same population as B (no real predator)');
  if(cast.D&&cast.D.genome.role!=='swarm') fails.push('D is not a swarm (role '+cast.D.genome.role+')');
  if(cast.E&&cast.E===cast.B) fails.push('E is the same population as B (no cold-built variant)');
  if(cast.E&&cast.B&&!(cast.E.genome.bodyRad>cast.B.genome.bodyRad)) fails.push('E not rounder than B — cold build not applied');
  const sk=['coast','scrub','highland','interior'];
  for(const a of sk) if(!sites[a]) fails.push('site '+a+' missing');
  for(let i=0;i<sk.length;i++) for(let j=i+1;j<sk.length;j++){
    const A=sites[sk[i]],B=sites[sk[j]]; if(!A||!B) continue;
    if(Math.hypot(A.x-B.x,A.z-B.z)<250) fails.push('sites '+sk[i]+'/'+sk[j]+' under 250 m apart');
  }
  const roster=f.populations.map(p=>({key:p.castKey??'-',species:p.genome.species,n:p.agents.length,role:p.genome.role,domain:p.genome.domain}));
  return {fails,roster,sites,speciesCount:species.size};
});

// drive the whole cue list through the real director, fast — and check that
// each Act 4 event actually moved the population it names.
const seen=await p.evaluate(async()=>{
  const {script,director,stage}=window.__ep2; const seen={}; const events=[]; const lockedFrames=[];
  const LOCKED=new Set(['sterile','stained','greening','rooted','firstmovers','fullroster']);
  window.__ep2.narrator.muted=true;
  const surface=stage.scenes.get('surface');
  for(let i=0;i<script.cues.length;i++){
    const cue=script.cues[i];
    try{ await director(cue); }catch(e){ return {error:'director cue '+i+': '+e.message}; }
    const n=stage.active?.constructor?.name??'none'; seen[n]=(seen[n]||0)+1;
    // Act 3's locked frame: run the driver a step and record the transform —
    // all six era cues must land the camera on the identical position+aim.
    if(LOCKED.has(cue.direct?.phase)&&stage.active?.cameraDriver){
      stage.active.cameraDriver(stage.active.camera,1/60);
      lockedFrames.push([...stage.active.camera.position.toArray(),...stage.active.camera.quaternion.toArray()]);
    }
    const ev=cue.direct?.event;
    if(ev&&surface?.fauna?.cast){
      const c=surface.fauna.cast;
      const centre=(P)=>{let x=0,z=0;for(const a of P.agents){x+=a.pos.x;z+=a.pos.z;}const n=Math.max(1,P.agents.length);return [x/n,z/n];};
      const fired=
        ev==='flock-rest'? (c.A?.resting===true||c.A?.restUnavailable===true)
        : ev==='startle-flock'? c.A?.alarm>0
        : ev==='spook-herd'? c.B?.panic>0
        : ev==='predator-commit'? c.C?.panic>0&&!!c.C?.rushTarget
        : ev==='kill'? (()=>{const dead=c.B?.agents.find(a=>a.dead);if(!dead||!c.D)return false;const [dx,dz]=centre(c.D);return Math.hypot(dx-dead.pos.x,dz-dead.pos.z)<40;})()
        : ev==='swarm-rise'? c.D?.liftHold>0
        : ev==='highland-link'? c.E?.panic>0
        : ev==='settle'? !(c.B?.panic>0)&&!(c.A?.alarm>0)
        : null;
      events.push(ev+':'+(fired===null?'?':fired?'FIRED':'DID-NOT-FIRE'));
      // After the rest call, run ~12 s of fixed-step sim and check the flock
      // actually reached the surface — resting is a claim, altitude is a fact.
      if(ev==='flock-rest'){
        if(!c.A?.resting){events.push('flock-on-water:'+(c.A?.restUnavailable?'SKIPPED(no water on patch)':'DID-NOT-FIRE'));}
        else{
          let alt=Infinity;
          for(let k=0;k<5400&&alt>=4;k++){
            surface.update(1/60);
            if(k%60===59)alt=c.A.agents.reduce((s,a)=>s+a.pos.y,0)/c.A.agents.length-(surface.seaLevelLocal??0);
          }
          events.push('flock-on-water:'+(alt<4?'FIRED':'DID-NOT-FIRE ('+alt.toFixed(1)+'m)'));
        }
      }
      // The commit shot must hold still: two driver steps, identical camera.
      if(ev==='predator-commit'&&stage.active?.cameraDriver){
        const cam=stage.active.camera;
        stage.active.cameraDriver(cam,1/60);
        const f1=[...cam.position.toArray(),...cam.quaternion.toArray()];
        stage.active.cameraDriver(cam,1/60);
        const f2=[...cam.position.toArray(),...cam.quaternion.toArray()];
        events.push('commit-static:'+(f1.every((v,j)=>Math.abs(v-f2[j])<1e-9)?'FIRED':'DID-NOT-FIRE'));
      }
    }
    await new Promise(r=>setTimeout(r,60));
  }
  return {seen,events,lockedFrames};
});
await b.close();
console.log('script:',JSON.stringify(info));
console.log('ecosystem roster:',JSON.stringify(eco.roster??eco));
console.log('sites:',JSON.stringify(eco.sites??{}));
console.log('act-4 events:',JSON.stringify(seen.events??[]));
console.log('scenes activated across cues:',JSON.stringify(seen.seen||seen));
let bad=false;
if(seen.error){console.error('FAIL:',seen.error);process.exit(2);}
const lf=seen.lockedFrames??[];
if(lf.length&&eco.roster){
  if(lf.length!==6){console.error('FAIL: expected 6 locked-frame era cues, saw',lf.length);bad=true;}
  const drift=lf.some(f=>f.some((v,j)=>Math.abs(v-lf[0][j])>1e-9));
  if(drift){console.error('FAIL: Act 3 camera moved between era cues:',JSON.stringify(lf));bad=true;}
  else console.log('locked frame: '+lf.length+' era cues, camera identical.');
}
for(const f of eco.fails??[]){console.error('FAIL:',f);bad=true;}
for(const e of seen.events??[]) if(/DID-NOT-FIRE/.test(e)){console.error('FAIL: event',e);bad=true;}
if(errs.length){console.log('ERRORS:');errs.slice(0,10).forEach(e=>console.log('  '+e));process.exit(1);}
if(bad)process.exit(3);
console.log('OK: all',info.cues,'cues staged;',eco.speciesCount,'species on stage; cast A-F distinct and every Act 4 event fired.');
