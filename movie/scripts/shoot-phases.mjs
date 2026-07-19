import { chromium } from 'playwright-core';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT='/tmp/claude-0/-home-user-the-worlds/cd4004b3-36f8-5985-a22c-e6c8006fae13/scratchpad/ep2';
const b=await chromium.launch({executablePath:EXE,args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:720}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:4319/soup.html?seed=verdant',{waitUntil:'domcontentloaded'});
await p.waitForSelector('#start');
await p.evaluate(()=>{document.getElementById('start').style.display='none';});
for(const ph of ['pantry','replicator','membrane','cell','split','mats']){
  await p.evaluate(x=>window.__soup.soup.setPhase(x),ph);
  await p.waitForTimeout(1600);
  try{await p.screenshot({path:`${OUT}/soup-${ph}.png`,timeout:8000});}catch(e){console.log('shot fail',ph);}
}
await b.close(); console.log('errors:',errs.length?errs:'none');
