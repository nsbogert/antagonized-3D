const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(process.env.ANTAGONIZED_URL||'http://localhost:3000/fps/index.html');url.searchParams.set('debug','1');await page.goto(url.href);await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'antagonized-title.png')});await page.click('#start');
 await page.keyboard.down('KeyW');await page.waitForTimeout(450);await page.keyboard.up('KeyW');
 const move=await page.evaluate(()=>window.antagonized.snapshot());assert.ok(move.player.z<17,'W moves forward');
 await page.keyboard.press('Space');await page.waitForTimeout(150);assert.ok((await page.evaluate(()=>window.antagonized.snapshot())).player.y>.2,'Space jumps');
 await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.locator('#pause').isVisible(),true,'Escape pauses');
 console.log('PASS keyboard movement, jump, and pause');
 const report=await page.evaluate(()=>{
  const g=window.antagonized,results=[];function ok(value,msg){if(!value)throw new Error(msg);results.push(msg);}function reset(){g.reset();g.state.paused=true;}
  if(g.state.chapter>=2){
    const isWalls=g.state.chapter===3,exitX=isWalls?0:-13;
    reset();ok(g.state.gear&&g.state.cannon&&g.state.ammo===3,'Direct kitchen entry provides loaded equipment');
    g.teleport(exitX,0,-11.7);g.interact();ok(!g.state.ended,'Wall breach is locked before objectives');
    g.teleport(g.world.clue.x,0,g.world.clue.z);g.interact();ok(!g.state.clue,'Counter clue cannot be inspected from the floor');
    for(const a of g.ants)if(a.type==='worker'){a.x=22;a.z=22;}
    for(const cache of g.world.caches){g.teleport(cache.x,0,cache.z);g.interact();}
    ok(g.state.secured===3,'All kitchen food caches can be secured');
    const soldier=g.ants.find(a=>a.type==='soldier');g.hit(soldier,1,'foam');g.hit(soldier,3,'carcass');
    g.teleport(soldier.x,0,soldier.z);g.interact();ok(g.state.ride===soldier,'Kitchen soldier can be mounted');
    const approachX=isWalls?9.7:12.6,approachZ=g.world.clue.z;g.teleport(approachX,0,approachZ,Math.PI/2);soldier.x=approachX;soldier.z=approachZ;g.setKeys('KeyW');
    for(let i=0;i<100;i++)g.step();g.setKeys();ok(g.player.y>=3&&g.player.x>(isWalls?11:14),'Soldier climbs sink counter');
    g.interact();g.teleport(g.world.clue.x,g.world.clue.y,g.world.clue.z);g.interact();ok(g.state.clue,'Counter trail unlocks the breach');
    g.teleport(exitX,0,-11.7);g.interact();ok(g.state.ended,'Wall breach completes the kitchen');
    return results;
  }
  reset();g.teleport(g.world.bench.x,0,g.world.bench.z);g.interact();ok(g.state.gear&&g.state.weapon===1&&g.state.tank===100,'Kit is available immediately, fully loaded and equipped');ok(!g.world.gearPickup.isEnabled(),'Collecting kit removes the world pickup');reset();ok(g.world.gearPickup.isEnabled()&&!g.state.gear,'Restart restores kit and clears inventory');let worker=g.ants.find(a=>a.type==='worker');worker.x=0;worker.z=16;worker.job='food';g.teleport(0,1.5,16);g.player.vy=-6;g.state.paused=false;
  for(let i=0;i<15&&worker.state==='alive';i++)g.step();ok(worker.state==='dead'&&g.state.stomps===1,'Downward stomp defeats worker and bounces');ok(g.player.vy>0,'Stomp gives upward bounce');
  worker.deadTime=1;g.teleport(worker.x,0,worker.z);g.state.weapon=1;g.interact();ok(g.state.ammo===0&&g.state.weapon===1,'E does not pick up or switch weapons for carcasses');g.state.weapon=0;g.step();ok(g.state.ammo===1,'Walking over carcass becomes ammo');g.interact();ok(g.state.ammo===1,'Hand capacity remains one');
  const flyer=g.ants.find(a=>a.type==='flyer');flyer.x=0;flyer.y=2;flyer.z=10;flyer.root.position.set(0,2,10);g.teleport(0,0,16);g.camera.setTarget(new BABYLON.Vector3(0,2.5,10));g.primaryAction();for(let i=0;i<90;i++)g.effectsStep();ok(flyer.state==='dead','Thrown worker hits and defeats a flyer');ok(g.state.ammo===0,'Throw consumes ammunition');
  reset();const soldier=g.ants.find(a=>a.type==='soldier');g.hit(soldier,5,'carcass');ok(soldier.state==='alive','Armor resists unprepared throw');g.hit(soldier,1,'foam');g.hit(soldier,3,'carcass');ok(soldier.state==='subdued','Foam plus carcass subdues soldier');g.teleport(soldier.x,0,soldier.z);g.interact();ok(g.state.ride===soldier,'Subdued soldier can be mounted');
  g.teleport(12.5,0,-6,Math.PI/2);soldier.x=12.5;soldier.z=-6;g.setKeys('KeyW');for(let i=0;i<95;i++)g.step();g.setKeys();ok(g.player.y>=3&&g.player.x>13.5,'Soldier climbs onto ivy planter');
  g.teleport(17,3.05,-5.8);g.interact();ok(!g.state.ride,'Dismount works on planter');g.teleport(17,3.05,-5.8);g.interact();ok(g.state.clue,'Elevated nest clue can be inspected');
  reset();const c=g.world.caches[0];g.teleport(c.x,0,c.z+1);g.interact();ok(!c.secured,'Nearby live workers prevent sealing food');
  g.teleport(c.x+7,0,c.z,Math.PI/2);g.dropBait();ok(g.state.baits===0,'Placing trap spends the single bait');const near=g.ants.filter(a=>a.type==='worker'&&a.cacheIndex===0);const before=near.reduce((n,a)=>n+Math.abs(a.x-(c.x+9)),0);for(let i=0;i<240;i++)g.step();const after=near.reduce((n,a)=>n+Math.abs(a.x-(c.x+9)),0);ok(after<before,'Workers leave food trails toward bait');
  g.teleport(c.x,0,c.z);g.interact();ok(c.secured,'Distracted workers allow securing food without kills');
  g.teleport(g.world.bench.x,0,g.world.bench.z);g.interact();ok(g.state.gear,'Bench pickup grants gear without mandatory kills');ok(g.state.tank===100&&g.state.baits===1,'Bench refills resources');
  g.state.kills=3;g.interact();ok(g.state.cannon,'Three defeats unlock cannon at bench');
  for(const cache of g.world.caches){for(const a of g.ants)if(a.type==='worker'&&a.state==='alive'){a.x=20;a.z=20;}g.teleport(cache.x,0,cache.z);g.interact();}ok(g.state.secured===3,'All three food caches can be secured');
  g.teleport(g.world.bench.x,0,g.world.bench.z);g.interact();ok(g.state.mist,'Mist unlocks after food objectives');
  g.teleport(0,0,15);g.state.paused=false;g.selectWeapon(2);for(let i=0;i<12;i++)g.step();g.primaryAction();ok(g.state.tank===92,'Foam spends eight shared tank units');
  g.selectWeapon(3);for(let i=0;i<12;i++)g.step();g.primaryAction();ok(g.state.tank===67,'Mist spends twenty-five shared tank units');
  g.teleport(0,0,-12);g.interact();ok(!g.state.ended,'Door does not complete mission before clue');
  g.teleport(17,3.05,-5.8);g.interact();ok(g.state.clue,'Clue completes investigation');g.teleport(0,0,-12);g.interact();ok(g.state.ended,'Kitchen door completes backyard mission');
  return results;
 });
 console.log(report.map(r=>'PASS '+r).join('\n'));await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'antagonized-ending.png')});
 await page.evaluate(()=>{window.antagonized.reset();window.antagonized.teleport(0,0,14);window.antagonized.camera.rotation.x=.12;});await page.waitForTimeout(300);await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'antagonized-play.png')});
 assert.deepEqual(errors,[]);console.log('PASS no browser exceptions');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
