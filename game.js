let players=[], enemies=[], projectiles=[], particles=[], powerups=[];
let energy=100, maxEnergy=100, wave=1, score=0, killCount=0;
let playerBaseSpeed = 5.0, projectileDamage = 8, energyRegenRate = 0.025, healthRegenRate = 0;
let playerMaxHP = 100, attackCooldown = 18;
let spawnTimer=0, spawnInterval=90, gameState='title';
let upgradesAvailable = [], selectedUpgradeIndex = 0;
let shakeAmt=0, flashAlpha=0;
let boostP1=false, boostP2=false, boostTimer=0, speedBoostActive=0;
let anchorMode=false, anchorPlayer=-1, spinAngle=0, spinSpeed=0.08, anchorCooldown=0;
let camX=0, camY=0, worldScale=1.0;
// Gravity Well state
let gwActive=false, gwTimer=0, gwX=0, gwY=0;
let gwP1=0, gwP2=0; // sync timers
// Shield Pulse state
let shieldCooldown=0;
// Bungee Slam state
let slamActive=false, slamTimer=0;
let slamP1=0, slamP2=0; // sync timers

// Assets
let pinkSlimeImg, greenSlimeImg, powerupsImg, healthImg, floorImg;

let BUNGEE_REST=120, BUNGEE_MAX=350, BUNGEE_STIFF=0.004, BUNGEE_DAMP=0.92;
const ARENA_W=1600, ARENA_H=1000;

function preload(){
  pinkSlimeImg = loadImage('assets/pink_slime.png');
  greenSlimeImg = loadImage('assets/green_slime.png');
  powerupsImg = loadImage('assets/powerups.png');
  healthImg = loadImage('assets/health.png');
  floorImg = loadImage('assets/floor.png');
}

function setup(){
  createCanvas(windowWidth,windowHeight);
  textFont('Outfit'); noStroke();
  resetGame();
}
function resetGame(){
  playerMaxHP = 100; playerBaseSpeed = 5.0; projectileDamage = 8; energyRegenRate = 0.025; healthRegenRate = 0;
  attackCooldown = 18; BUNGEE_MAX = 350;
  players=[
    {x:ARENA_W/2-80,y:ARENA_H/2,vx:0,vy:0,r:22,col:[80,220,160],trail:[],hp:playerMaxHP,shootCD:0,id:0,img:greenSlimeImg,damageTimer:0},
    {x:ARENA_W/2+80,y:ARENA_H/2,vx:0,vy:0,r:22,col:[100,160,255],trail:[],hp:playerMaxHP,shootCD:0,id:1,img:pinkSlimeImg,damageTimer:0}
  ];
  enemies=[]; projectiles=[]; particles=[]; powerups=[];
  energy=100; wave=1; score=0; killCount=0;
  spawnTimer=0; spawnInterval=90;
  speedBoostActive=0; anchorMode=false; anchorCooldown=0;
  boostP1=false; boostP2=false;
  gwActive=false; gwTimer=0; gwP1=0; gwP2=0;
  shieldCooldown=0;
  slamActive=false; slamTimer=0; slamP1=0; slamP2=0;
  spawnWave();
}
function windowResized(){ resizeCanvas(windowWidth,windowHeight); }

// --- INPUT ---
let keys={};
function keyPressed(){
  keys[key.toLowerCase()]=true; keys[keyCode]=true;
  if(gameState==='title'){ gameState='play'; return; }
  if(gameState==='over' && (key===' '||key==='Enter')){ gameState='play'; resetGame(); return; }
  if(gameState==='upgrade'){
    if(key==='1') selectUpgrade(0);
    if(key==='2') selectUpgrade(1);
    if(key==='3') selectUpgrade(2);
    if(keyCode===LEFT_ARROW) selectedUpgradeIndex = (selectedUpgradeIndex + 2) % 3;
    if(keyCode===RIGHT_ARROW) selectedUpgradeIndex = (selectedUpgradeIndex + 1) % 3;
    if(keyCode===ENTER || key===' ') selectUpgrade(selectedUpgradeIndex);
    return;
  }
  if(gameState!=='play') return;
  // Speed boost: E for P1, O for P2 (Wave 1)
  if(key.toLowerCase()==='e' && wave>=1) boostP1=12;
  if(key.toLowerCase()==='o' && wave>=1) boostP2=12;
  // Shield Pulse: Shift (Wave 2)
  if(keyCode===SHIFT && wave>=2 && shieldCooldown<=0 && energy>=20){
    triggerShieldPulse();
  }
  // Gravity Well: R for P1, P for P2 (Wave 3)
  if(key.toLowerCase()==='r' && wave>=3) gwP1=12;
  if(key.toLowerCase()==='p' && wave>=3) gwP2=12;
  // Bungee Slam: X for P1, . for P2 (Wave 4)
  if(key.toLowerCase()==='x' && wave>=4) slamP1=12;
  if(key==='.' && wave>=4) slamP2=12;
  // Anchor-spin: spacebar (Wave 5)
  if(key===' ' && wave>=5 && energy>=50 && !anchorMode && anchorCooldown<=0){
    anchorMode=true;
    let v0=mag(players[0].vx,players[0].vy), v1=mag(players[1].vx,players[1].vy);
    anchorPlayer=v0<=v1?0:1;
    spinAngle=atan2(players[1-anchorPlayer].y-players[anchorPlayer].y,players[1-anchorPlayer].x-players[anchorPlayer].x);
    spinSpeed=0.08; energy-=50;
  }
}
function keyReleased(){
  keys[key.toLowerCase()]=false; keys[keyCode]=false;
  if(key===' ' && anchorMode){ anchorMode=false; anchorCooldown=30; }
}

// --- MAIN LOOP ---
function draw(){
  if(gameState==='title'){ drawTitle(); return; }
  if(gameState==='over'){ drawGameOver(); return; }
  if(gameState==='upgrade'){ drawUpgradeMenu(); return; }
  updateGame();
  drawGame();
}

// --- UPDATE ---
function updateGame(){
  let spd=playerBaseSpeed+(speedBoostActive>0?3.5:0);
  // P1 WASD
  if(keys['a']) players[0].vx-=1.3;
  if(keys['d']) players[0].vx+=1.3;
  if(keys['w']) players[0].vy-=1.3;
  if(keys['s']) players[0].vy+=1.3;
  // P2 IJKL
  if(keys['j']) players[1].vx-=1.3;
  if(keys['l']) players[1].vx+=1.3;
  if(keys['i']) players[1].vy-=1.3;
  if(keys['k']) players[1].vy+=1.3;

  // Speed boost sync check
  if(boostP1>0) boostP1--;
  if(boostP2>0) boostP2--;
  if(boostP1>0 && boostP2>0 && energy>=15){
    speedBoostActive=150; boostP1=0; boostP2=0; energy-=15;
    shakeAmt=8; flashAlpha=80;
    for(let p of players) for(let i=0;i<20;i++) particles.push(mkPart(p.x,p.y,[255,255,100],3));
  }
  if(speedBoostActive>0) speedBoostActive--;

  // Cooldowns
  if(anchorCooldown>0) anchorCooldown--;
  if(shieldCooldown>0) shieldCooldown--;

  // Gravity Well sync check
  if(gwP1>0) gwP1--;
  if(gwP2>0) gwP2--;
  if(gwP1>0 && gwP2>0 && energy>=25 && !gwActive){
    gwActive=true; gwTimer=180; // 3 seconds
    gwX=(players[0].x+players[1].x)/2; gwY=(players[0].y+players[1].y)/2;
    gwP1=0; gwP2=0; energy-=25;
    shakeAmt=6;
    for(let i=0;i<15;i++) particles.push(mkPart(gwX,gwY,[160,100,255],3));
  }

  // Bungee Slam sync check
  if(slamP1>0) slamP1--;
  if(slamP2>0) slamP2--;
  if(slamP1>0 && slamP2>0 && energy>=35 && !slamActive){
    slamActive=true; slamTimer=20;
    slamP1=0; slamP2=0; energy-=35;
    shakeAmt=10; flashAlpha=60;
    for(let p of players) for(let i=0;i<15;i++) particles.push(mkPart(p.x,p.y,[255,120,60],3));
  }

  // Anchor-spin
  if(anchorMode && keys[' ']){
    let anc=players[anchorPlayer], orb=players[1-anchorPlayer];
    let rd=dist(anc.x,anc.y,orb.x,orb.y);
    rd=max(rd,80);
    spinAngle+=spinSpeed; spinSpeed=min(spinSpeed+0.002,0.18);
    orb.x=anc.x+cos(spinAngle)*rd;
    orb.y=anc.y+sin(spinAngle)*rd;
    orb.vx=0; orb.vy=0;
    energy-=0.45;
    if(energy<=0){ anchorMode=false; anchorCooldown=45; energy=0; }
  } else if(anchorMode){ anchorMode=false; anchorCooldown=45; spinSpeed=0.08; }

  // Bungee Slam: yank players toward each other
  if(slamActive){
    slamTimer--;
    let mx=(players[0].x+players[1].x)/2, my=(players[0].y+players[1].y)/2;
    for(let p of players){
      let a=atan2(my-p.y,mx-p.x);
      p.vx+=cos(a)*4; p.vy+=sin(a)*4;
    }
    // Slam damage: enemies touching cord or players
    let sp0=players[0], sp1=players[1];
    for(let i=enemies.length-1;i>=0;i--){
      let e=enemies[i];
      let onCord=ptSegDist(e.x,e.y,sp0.x,sp0.y,sp1.x,sp1.y)<e.r+12;
      let onP=dist(e.x,e.y,sp0.x,sp0.y)<e.r+sp0.r+15||dist(e.x,e.y,sp1.x,sp1.y)<e.r+sp1.r+15;
      if(onCord||onP){
        enemies[i].hp-=40;
        let pa=atan2(e.y-my,e.x-mx);
        e.vx+=cos(pa)*12; e.vy+=sin(pa)*12;
        for(let k=0;k<10;k++) particles.push(mkPart(e.x,e.y,[255,180,60],3));
        shakeAmt=max(shakeAmt,6);
        if(enemies[i].hp<=0) killEnemy(i);
      }
    }
    if(slamTimer<=0) slamActive=false;
  }

  // Gravity Well update
  if(gwActive){
    gwTimer--;
    for(let e of enemies){
      let dd=dist(e.x,e.y,gwX,gwY);
      if(dd<150){
        let a=atan2(gwY-e.y,gwX-e.x);
        let pull=map(dd,0,150,2.5,0.3);
        e.vx+=cos(a)*pull; e.vy+=sin(a)*pull;
        if(dd<30){ e.hp-=2; }
      }
    }
    if(frameCount%3===0) particles.push(mkPart(gwX+random(-20,20),gwY+random(-20,20),[160,100,255],2));
    if(gwTimer<=0) gwActive=false;
  }

  // Physics
  for(let p of players){
    p.vx*=0.90; p.vy*=0.90;
    let ms=spd;
    p.vx=constrain(p.vx,-ms,ms); p.vy=constrain(p.vy,-ms,ms);
    p.x+=p.vx; p.y+=p.vy;
    // Arena bounds
    p.x=constrain(p.x,p.r,ARENA_W-p.r);
    p.y=constrain(p.y,p.r,ARENA_H-p.r);
    // Trail
    p.trail.push({x:p.x,y:p.y,a:1});
    if(p.trail.length>20) p.trail.shift();
    for(let t of p.trail) t.a*=0.9;
  }

  // Bungee constraint
  let dx=players[1].x-players[0].x, dy=players[1].y-players[0].y;
  let d=sqrt(dx*dx+dy*dy)||1;
  if(d>BUNGEE_REST){
    let f=(d-BUNGEE_REST)*BUNGEE_STIFF;
    let nx=dx/d, ny=dy/d;
    if(!anchorMode){
      players[0].vx+=nx*f; players[0].vy+=ny*f;
      players[1].vx-=nx*f; players[1].vy-=ny*f;
    }
    if(d>BUNGEE_MAX){
      let mid={x:(players[0].x+players[1].x)/2,y:(players[0].y+players[1].y)/2};
      players[0].x=mid.x-nx*BUNGEE_MAX/2; players[0].y=mid.y-ny*BUNGEE_MAX/2;
      players[1].x=mid.x+nx*BUNGEE_MAX/2; players[1].y=mid.y+ny*BUNGEE_MAX/2;
    }
  }

  // Auto-shoot
  for(let p of players){
    p.shootCD--;
    if(p.shootCD<=0 && enemies.length>0){
      let nearest=null, nd=Infinity;
      for(let e of enemies){ let dd=dist(p.x,p.y,e.x,e.y); if(dd<nd){nd=dd;nearest=e;}}
      if(nearest && nd<500){
        let a=atan2(nearest.y-p.y,nearest.x-p.x);
        projectiles.push({x:p.x,y:p.y,vx:cos(a)*8,vy:sin(a)*8,dmg:projectileDamage,life:60,col:p.col,r:4});
        p.shootCD=attackCooldown;
      }
    }
  }

  // Powerups spawning
  if(frameCount % 400 === 0 && powerups.length < 5){
    let type = floor(random(3)); // 0: speed, 1: energy, 2: heal
    powerups.push({
      x: random(100, ARENA_W-100),
      y: random(100, ARENA_H-100),
      type: type,
      r: 20,
      life: 600
    });
  }

  // Update Powerups
  for(let i=powerups.length-1; i>=0; i--){
    let pu = powerups[i];
    pu.life--;
    if(pu.life <= 0){ powerups.splice(i,1); continue; }
    for(let p of players){
      if(dist(p.x, p.y, pu.x, pu.y) < p.r + pu.r){
        applyPowerup(p, pu.type);
        powerups.splice(i,1);
        break;
      }
    }
  }

  // Update projectiles
  for(let i=projectiles.length-1;i>=0;i--){
    let b=projectiles[i];
    b.x+=b.vx; b.y+=b.vy; b.life--;
    if(b.life<=0||b.x<0||b.x>ARENA_W||b.y<0||b.y>ARENA_H){ projectiles.splice(i,1); continue; }
    if(b.enemy){
      // Enemy projectile: hits players
      for(let p of players){
        if(dist(b.x,b.y,p.x,p.y)<p.r+b.r){
          p.hp-=b.eDmg;
          p.damageTimer = 15;
          let pa=atan2(p.y-b.y,p.x-b.x);
          p.vx+=cos(pa)*3; p.vy+=sin(pa)*3;
          for(let k=0;k<4;k++) particles.push(mkPart(b.x,b.y,[255,100,100],2));
          projectiles.splice(i,1);
          break;
        }
      }
    } else {
      // Player projectile: hits enemies
      for(let j=enemies.length-1;j>=0;j--){
        if(dist(b.x,b.y,enemies[j].x,enemies[j].y)<enemies[j].r+b.r){
          enemies[j].hp-=b.dmg;
          for(let k=0;k<5;k++) particles.push(mkPart(b.x,b.y,enemies[j].col,2));
          projectiles.splice(i,1);
          if(enemies[j].hp<=0) killEnemy(j);
          break;
        }
      }
    }
  }

  // Bungee-kill: enemies crossing the line between players
  let p0=players[0], p1=players[1];
  for(let i=enemies.length-1;i>=0;i--){
    let e=enemies[i];
    if(ptSegDist(e.x,e.y,p0.x,p0.y,p1.x,p1.y)<e.r+6){
      // Insta-kill with bungee
      for(let k=0;k<15;k++) particles.push(mkPart(e.x,e.y,[255,220,60],3));
      shakeAmt=max(shakeAmt,5);
      score+=e.score*2;
      killCount++; energy=min(energy+8,maxEnergy);
      enemies.splice(i,1);
    }
  }

  // Enemy AI
  let cx=(p0.x+p1.x)/2, cy=(p0.y+p1.y)/2;
  for(let e of enemies){
    // Target nearest player
    let tgt=(dist(e.x,e.y,p0.x,p0.y)<dist(e.x,e.y,p1.x,p1.y))?p0:p1;
    let a=atan2(tgt.y-e.y,tgt.x-e.x);

    // --- Tier-specific AI ---
    if(e.tier===2){ // Shooter: keep distance and fire
      let dd=dist(e.x,e.y,tgt.x,tgt.y);
      if(dd<200){ // back away
        e.vx-=cos(a)*e.spd*0.12;
        e.vy-=sin(a)*e.spd*0.12;
      } else if(dd>350){
        e.vx+=cos(a)*e.spd*0.1;
        e.vy+=sin(a)*e.spd*0.1;
      }
      e.shootCD=(e.shootCD||0)-1;
      if(e.shootCD<=0 && dd<450){
        let ba=atan2(tgt.y-e.y,tgt.x-e.x);
        projectiles.push({x:e.x,y:e.y,vx:cos(ba)*5,vy:sin(ba)*5,dmg:0,life:80,
          col:e.col,r:5,enemy:true,eDmg:8});
        e.shootCD=70;
      }
    } else if(e.tier===3){ // Dasher: charges at player
      e.dashCD=(e.dashCD||60)-1;
      if(e.dashing){
        e.dashTimer--;
        if(e.dashTimer<=0) e.dashing=false;
      } else if(e.dashCD<=0 && dist(e.x,e.y,tgt.x,tgt.y)<300){
        e.dashing=true; e.dashTimer=15; e.dashCD=120;
        e.vx=cos(a)*e.spd*6; e.vy=sin(a)*e.spd*6;
      } else {
        e.vx+=cos(a)*e.spd*0.1;
        e.vy+=sin(a)*e.spd*0.1;
      }
    } else if(e.tier===5){ // Tank: slow, AoE slam
      e.vx+=cos(a)*e.spd*0.08;
      e.vy+=sin(a)*e.spd*0.08;
      e.slamCD=(e.slamCD||90)-1;
      if(e.slamCD<=0){
        e.slamCD=150;
        e.slamFlash=15;
        // AoE damage to players in range
        for(let p of players){
          if(dist(e.x,e.y,p.x,p.y)<100){
            p.hp-=12;
            let pa=atan2(p.y-e.y,p.x-e.x);
            p.vx+=cos(pa)*8; p.vy+=sin(pa)*8;
            shakeAmt=max(shakeAmt,6);
          }
        }
        for(let k=0;k<12;k++) particles.push(mkPart(e.x,e.y,[255,160,60],3));
      }
    } else if(e.tier===6){ // Sprite Elite: chase with wobble
      e.vx+=cos(a)*e.spd*0.14 + cos(frameCount*0.05)*0.2;
      e.vy+=sin(a)*e.spd*0.14 + sin(frameCount*0.05)*0.2;
    } else { // Basic (0), Brute (1), Splitter (4): chase
      e.vx+=cos(a)*e.spd*0.15;
      e.vy+=sin(a)*e.spd*0.15;
    }

    e.vx*=0.95; e.vy*=0.95;
    e.x+=e.vx; e.y+=e.vy;
    e.x=constrain(e.x,e.r,ARENA_W-e.r);
    e.y=constrain(e.y,e.r,ARENA_H-e.r);
    // Damage players on contact
    let contactDmg=e.tier===3&&e.dashing?1.2:(e.tier===5?0.5:0.3);
    for(let p of players){
      if(dist(e.x,e.y,p.x,p.y)<e.r+p.r){
        p.hp-=contactDmg;
        p.damageTimer = 15;
        let pushA=atan2(p.y-e.y,p.x-e.x);
        p.vx+=cos(pushA)*2; p.vy+=sin(pushA)*2;
      }
    }
    // Enemy-enemy repulsion
    for(let e2 of enemies){
      if(e===e2) continue;
      let dd=dist(e.x,e.y,e2.x,e2.y);
      if(dd<e.r+e2.r+5 && dd>0){
        let na=atan2(e.y-e2.y,e.x-e2.x);
        e.vx+=cos(na)*0.5; e.vy+=sin(na)*0.5;
      }
    }
    // Decay slam flash
    if(e.slamFlash>0) e.slamFlash--;
  }

  // Anchor-spin kills enemies on contact with orbiting player
  if(anchorMode){
    let orb=players[1-anchorPlayer];
    for(let i=enemies.length-1;i>=0;i--){
      if(dist(orb.x,orb.y,enemies[i].x,enemies[i].y)<orb.r+enemies[i].r+10){
        enemies[i].hp-=12;
        let pa=atan2(enemies[i].y-orb.y,enemies[i].x-orb.x);
        enemies[i].vx+=cos(pa)*8; enemies[i].vy+=sin(pa)*8;
        for(let k=0;k<8;k++) particles.push(mkPart(enemies[i].x,enemies[i].y,orb.col,2));
        if(enemies[i].hp<=0) killEnemy(i);
      }
    }
  }

  // Particles
  for(let i=particles.length-1;i>=0;i--){
    let pt=particles[i];
    pt.x+=pt.vx; pt.y+=pt.vy; pt.vy+=0.05; pt.life--;
    if(pt.life<=0) particles.splice(i,1);
  }

  // Spawn
  spawnTimer++;
  if(enemies.length===0 && spawnTimer>60){
    if(wave % 3 === 0) {
      gameState = 'upgrade';
      generateUpgrades();
    } else {
      wave++; spawnInterval=max(40,spawnInterval-5); spawnWave();
    }
  }

  // Check death
  for(let p of players) if(p.hp<=0){ gameState='over'; shakeAmt=15; }

  // Energy regen
  energy=min(energy+energyRegenRate,maxEnergy);
  // Health regen
  for(let p of players) p.hp = min(playerMaxHP, p.hp + healthRegenRate);
  if(shakeAmt>0) shakeAmt*=0.9;
  if(flashAlpha>0) flashAlpha-=2;

  // Camera
  let targetW = 1400; 
  let targetH = 900;
  worldScale = min(width / targetW, height / targetH);
  if(worldScale > 1.2) worldScale = 1.2; // Cap max zoom
  if(worldScale < 0.6) worldScale = 0.6; // Cap min zoom

  let viewW = width / worldScale;
  let viewH = height / worldScale;

  camX=lerp(camX,(p0.x+p1.x)/2 - viewW/2, 0.08);
  camY=lerp(camY,(p0.y+p1.y)/2 - viewH/2, 0.08);

  // Handle camera bounds and centering
  if (viewW > ARENA_W) {
    camX = (ARENA_W - viewW) / 2;
  } else {
    camX = constrain(camX, 0, ARENA_W - viewW);
  }

  if (viewH > ARENA_H) {
    camY = (ARENA_H - viewH) / 2;
  } else {
    camY = constrain(camY, 0, ARENA_H - viewH);
  }

  for(let p of players) if(p.damageTimer > 0) p.damageTimer--;
}

function applyPowerup(p, type){
  shakeAmt = 5;
  if(type === 0){ // Apple: Heal
    p.hp = min(playerMaxHP, p.hp + 25);
    for(let i=0; i<15; i++) particles.push(mkPart(p.x, p.y, [255,100,100], 3));
  } else if(type === 1){ // Golden Apple: Energy Refill
    energy = min(maxEnergy, energy + 45);
    for(let i=0; i<15; i++) particles.push(mkPart(p.x, p.y, [255,220,100], 3));
  } else if(type === 2){ // Banana: Speed Boost
    speedBoostActive = 300;
    for(let i=0; i<15; i++) particles.push(mkPart(p.x, p.y, [255,255,150], 3));
  }
}

function triggerShieldPulse(){
  shieldCooldown=90; energy-=20;
  shakeAmt=8;
  for(let p of players){
    for(let i=0;i<20;i++) particles.push(mkPart(p.x+random(-20,20),p.y+random(-20,20),[100,200,255],2.5));
    for(let j=enemies.length-1;j>=0;j--){
      let e=enemies[j];
      let dd=dist(p.x,p.y,e.x,e.y);
      if(dd<120){
        e.hp-=10;
        let pa=atan2(e.y-p.y,e.x-p.x);
        e.vx+=cos(pa)*10; e.vy+=sin(pa)*10;
        for(let k=0;k<6;k++) particles.push(mkPart(e.x,e.y,[100,200,255],2));
        if(e.hp<=0) killEnemy(j);
      }
    }
  }
}

function killEnemy(i){
  let e=enemies[i];
  for(let k=0;k<12;k++) particles.push(mkPart(e.x,e.y,e.col,2.5));
  score+=e.score; killCount++; energy=min(energy+5,maxEnergy);
  shakeAmt=max(shakeAmt,3);
  // Splitter: spawn 2 smaller enemies
  if(e.tier===4){
    for(let s=0;s<2;s++){
      let off=s===0?-15:15;
      enemies.push({
        x:e.x+off,y:e.y+off,vx:random(-2,2),vy:random(-2,2),
        r:8, hp:12, maxHp:12, spd:2.2+random(0.3), score:8,
        col:[140,220,100], tier:0
      });
    }
  }
  enemies.splice(i,1);
}

function spawnWave(){
  spawnTimer=0;
  let count=4+wave*2;
  for(let i=0;i<count;i++){
    let side=floor(random(4));
    let sx,sy;
    if(side===0){sx=random(ARENA_W);sy=-30;}
    else if(side===1){sx=random(ARENA_W);sy=ARENA_H+30;}
    else if(side===2){sx=-30;sy=random(ARENA_H);}
    else{sx=ARENA_W+30;sy=random(ARENA_H);}
    // Pick tier based on wave
    let r=random();
    let tier=0;
    if(wave>=5 && r<0.08) tier=5;       // Tank
    else if(wave>=4 && r<0.18) tier=4;   // Splitter
    else if(wave>=3 && r<0.26) tier=3;   // Dasher
    else if(wave>=2 && r<0.36) tier=6;   // Sprite Elite
    else if(wave>=2 && r<0.48) tier=2;   // Shooter
    else if(r<0.15+wave*0.02) tier=1;    // Brute

    let def=mkEnemyDef(tier);
    enemies.push({
      x:sx,y:sy,vx:0,vy:0,...def
    });
  }
}

function mkEnemyDef(tier){
  switch(tier){
    case 1: return {r:18,hp:50,maxHp:50,spd:1,score:30,col:[220,80,80],tier:1};
    case 2: return {r:14,hp:28,maxHp:28,spd:1.2,score:25,col:[255,180,60],tier:2,shootCD:40};
    case 3: return {r:12,hp:22,maxHp:22,spd:2,score:20,col:[60,220,220],tier:3,dashCD:60,dashing:false,dashTimer:0};
    case 4: return {r:16,hp:35,maxHp:35,spd:1.4,score:35,col:[120,220,80],tier:4};
    case 5: return {r:26,hp:120,maxHp:120,spd:0.6,score:60,col:[255,120,40],tier:5,slamCD:90,slamFlash:0};
    case 6: return {r:20,hp:45,maxHp:45,spd:1.3,score:40,col:[180,60,255],tier:6}; // Sprite Enemy
    default: return {r:13,hp:20,maxHp:20,spd:1.5+random(0.5),score:10,col:[200,100+floor(random(80)),200],tier:0};
  }
}

// --- DRAW ---
function drawGame(){
  background(12,12,22);
  push();
  let sx=0,sy=0;
  if(shakeAmt>0.5){sx=random(-shakeAmt,shakeAmt);sy=random(-shakeAmt,shakeAmt);}
  
  scale(worldScale);
  translate(-camX+sx,-camY+sy);

  // Arena bg
  drawArena();

  // Particles behind
  for(let pt of particles){
    let a=map(pt.life,0,pt.maxLife,0,200);
    fill(pt.col[0],pt.col[1],pt.col[2],a);
    circle(pt.x,pt.y,pt.r*map(pt.life,0,pt.maxLife,0.3,1));
  }

  // Bungee cord
  drawBungee();

  // Powerups
  for(let pu of powerups) drawPowerup(pu);

  // Enemies
  for(let e of enemies) drawEnemy(e);

  // Projectiles
  for(let b of projectiles){
    if(b.enemy){
      fill(255, 100, 50, 200);
      circle(b.x, b.y, b.r * 2.2);
      fill(255, 255, 255, 180);
      circle(b.x, b.y, b.r * 1.1);
    } else {
      fill(b.col[0],b.col[1],b.col[2],200);
      circle(b.x,b.y,b.r*2);
      fill(255,255,255,150);
      circle(b.x,b.y,b.r);
    }
  }

  // Players
  for(let p of players) drawPlayer(p);

  // Gravity Well visual
  if(gwActive){
    push(); translate(gwX,gwY);
    let pulse=sin(frameCount*0.1)*0.15+1;
    noFill();
    for(let i=0;i<5;i++){
      let r=(150-i*25)*pulse;
      stroke(160,100,255,60-i*10);
      strokeWeight(2);
      let rotOff=frameCount*0.03*(i%2===0?1:-1);
      arc(0,0,r*2,r*2,rotOff,rotOff+PI*1.5);
    }
    fill(160,100,255,40); noStroke();
    circle(0,0,60*pulse);
    fill(255,255,255,80);
    circle(0,0,12);
    pop();
  }

  // Shield pulse visual ring
  if(shieldCooldown>75){
    let t=map(shieldCooldown,90,75,0,1);
    let rad=120*t;
    noFill(); strokeWeight(3);
    for(let p of players){
      stroke(100,200,255,200*(1-t));
      circle(p.x,p.y,rad*2);
    }
    noStroke();
  }

  pop();

  // Flash overlay
  if(flashAlpha>0){ fill(255,255,200,flashAlpha); rect(0,0,width,height); }

  // HUD
  drawHUD();
}

function drawArena(){
  // Grid
  stroke(30,30,50,80); strokeWeight(1);
  let gs=60;
  for(let x=0;x<=ARENA_W;x+=gs) line(x,0,x,ARENA_H);
  for(let y=0;y<=ARENA_H;y+=gs) line(0,y,ARENA_W,y);
  noStroke();
  // Border glow
  let bw=4;
  fill(60,200,160,40);
  rect(0,0,ARENA_W,bw); rect(0,ARENA_H-bw,ARENA_W,bw);
  rect(0,0,bw,ARENA_H); rect(ARENA_W-bw,0,bw,ARENA_H);
}

function drawPowerup(pu){
  let bounce = sin(frameCount * 0.1) * 5;
  let s = 45;
  imageMode(CENTER);
  // Type 0: Apple, Type 1: Golden Apple, Type 2: Banana
  let sw = powerupsImg.width / 3;
  let sh = powerupsImg.height;
  image(powerupsImg, pu.x, pu.y + bounce, s, s, pu.type * sw, 0, sw, sh);
  // Glow
  fill(255, 255, 255, 30);
  circle(pu.x, pu.y + bounce, pu.r * 1.5);
}

function drawBungee(){
  let p0=players[0],p1=players[1];
  let d=dist(p0.x,p0.y,p1.x,p1.y);
  let tension=constrain(map(d,BUNGEE_REST,BUNGEE_MAX,0,1),0,1);
  // Draw catenary-like curve
  let segs=20;
  let sag=map(tension,0,1,30,2);
  strokeWeight(map(tension,0,1,4,2));
  for(let i=0;i<segs;i++){
    let t1=i/segs, t2=(i+1)/segs;
    let x1=lerp(p0.x,p1.x,t1), y1=lerp(p0.y,p1.y,t1)+sin(t1*PI)*sag;
    let x2=lerp(p0.x,p1.x,t2), y2=lerp(p0.y,p1.y,t2)+sin(t2*PI)*sag;
    let pulse=(sin(frameCount*0.1+i*0.3)+1)/2;
    let r_=lerp(p0.col[0],p1.col[0],t1);
    let g_=lerp(p0.col[1],p1.col[1],t1);
    let b_=lerp(p0.col[2],p1.col[2],t1);
    stroke(r_,g_,b_,150+pulse*80);
    line(x1,y1,x2,y2);
  }
  // Glow
  strokeWeight(map(tension,0,1,8,4));
  for(let i=0;i<segs;i++){
    let t1=i/segs, t2=(i+1)/segs;
    let x1=lerp(p0.x,p1.x,t1), y1=lerp(p0.y,p1.y,t1)+sin(t1*PI)*sag;
    let x2=lerp(p0.x,p1.x,t2), y2=lerp(p0.y,p1.y,t2)+sin(t2*PI)*sag;
    let r_=lerp(p0.col[0],p1.col[0],t1);
    let g_=lerp(p0.col[1],p1.col[1],t1);
    let b_=lerp(p0.col[2],p1.col[2],t1);
    stroke(r_,g_,b_,30);
    line(x1,y1,x2,y2);
  }
  noStroke();
}

function drawPlayer(p){
  // Trail
  for(let t of p.trail){
    fill(p.col[0],p.col[1],p.col[2],t.a*40);
    circle(t.x,t.y,p.r*2*t.a);
  }
  // Shadow
  fill(0,0,0,40);
  ellipse(p.x,p.y+p.r*0.7,p.r*2.2,p.r*0.8);
  
  // Sprite Animation
  let frame = 0;
  if(p.damageTimer > 0){
    frame = 3; // Damage frame
  } else {
    // Moving animation (first 3 frames)
    let moveSpeed = dist(0,0,p.vx,p.vy);
    if(moveSpeed > 0.5){
      frame = floor(frameCount * 0.15) % 3;
    }
  }

  push(); translate(p.x,p.y);
  // Glow
  fill(p.col[0],p.col[1],p.col[2],30);
  circle(0,0,p.r*3.5);
  // Image
  imageMode(CENTER);
  let sw = p.img.width / 4;
  let sh = p.img.height;
  image(p.img, 0, 0, p.r*3, p.r*3, frame * sw, 0, sw, sh);
  
  // Speed lines
  if(speedBoostActive>0){
    stroke(255,255,200,100); strokeWeight(2);
    for(let i=0;i<3;i++){
      let ly=-10+i*10;
      line(-p.r-8-random(5),ly,-p.r-15-random(10),ly);
    }
    noStroke();
  }
  pop();
  // HP bar
  if(p.hp<playerMaxHP){
    let bw=30;
    fill(40,40,40,180); rect(p.x-bw/2,p.y-p.r-14,bw,4,2);
    fill(80,220,120); rect(p.x-bw/2,p.y-p.r-14,bw*(p.hp/playerMaxHP),4,2);
  }
}

function drawEnemy(e){
  let pulse = sin(frameCount * 0.08 + e.x * 0.01) * 0.1 + 1;
  // Glow
  fill(e.col[0], e.col[1], e.col[2], 20);
  circle(e.x, e.y, e.r * 3 * pulse);
  // Shadow
  fill(0, 0, 0, 30);
  ellipse(e.x, e.y + e.r * 0.6, e.r * 2, e.r * 0.6);
  
  // Tank Slam Flash
  if(e.slamFlash > 0){
    fill(255, 200, 100, e.slamFlash * 10);
    circle(e.x, e.y, 100 * (1 - e.slamFlash/15));
  }

  // Body
  fill(e.col[0], e.col[1], e.col[2]);
  push(); translate(e.x, e.y);
  if (e.tier === 1) { // Brute: spiky
    rotate(frameCount * 0.02);
    beginShape();
    for (let i = 0; i < 8; i++) {
      let a = TWO_PI / 8 * i;
      let rr = (i % 2 === 0) ? e.r * 1.3 : e.r * 0.8;
      vertex(cos(a) * rr, sin(a) * rr);
    }
    endShape(CLOSE);
  } else if (e.tier === 2) { // Shooter: Diamond
    rotate(frameCount * 0.03);
    rectMode(CENTER);
    rect(0, 0, e.r * 1.8, e.r * 1.8, 4);
    fill(255, 255, 255, 100);
    rect(0, 0, e.r * 0.8, e.r * 0.8, 2);
  } else if (e.tier === 3) { // Dasher: Sleek Triangle
    rotate(atan2(e.vy, e.vx) + PI/2);
    if(e.dashing) scale(1, 1.5);
    triangle(-e.r, e.r, e.r, e.r, 0, -e.r * 1.5);
  } else if (e.tier === 4) { // Splitter: Blobby
    for(let i=0; i<4; i++){
      let a = frameCount*0.05 + i*HALF_PI;
      circle(cos(a)*e.r*0.4, sin(a)*e.r*0.4, e.r*1.2);
    }
  } else if (e.tier === 5) { // Tank: Heavy Octagon
    rotate(frameCount * 0.01);
    beginShape();
    for(let i=0; i<8; i++){
      let a = TWO_PI/8*i;
      vertex(cos(a)*e.r, sin(a)*e.r);
    }
    endShape(CLOSE);
    fill(0,0,0,50);
    circle(0,0, e.r*0.6);
  } else if (e.tier === 6) { // Elite: Star
    rotate(frameCount * 0.05);
    beginShape();
    for (let i = 0; i < 10; i++) {
      let a = TWO_PI / 10 * i;
      let rr = (i % 2 === 0) ? e.r * 1.5 : e.r * 0.6;
      vertex(cos(a) * rr, sin(a) * rr);
    }
    endShape(CLOSE);
  } else { // Basic
    circle(0, 0, e.r * 2);
  }
  pop();

  // Angry eyes
  fill(255, 255, 255, 200);
  let ex = e.x, ey = e.y - 2;
  if(e.tier === 5) { ex = e.x; ey = e.y - 4; } // Adjust for tank size
  circle(ex - 3, ey, 5); circle(ex + 3, ey, 5);
  fill(30);
  circle(ex - 3, ey, 2.5); circle(ex + 3, ey, 2.5);

  // HP bar
  if (e.hp < e.maxHp) {
    let bw = e.r * 2.5;
    fill(40, 40, 40, 180); rect(e.x - bw / 2, e.y - e.r - 12, bw, 5, 2);
    fill(220, 60, 60); rect(e.x - bw / 2, e.y - e.r - 12, bw * (e.hp / e.maxHp), 5, 2);
  }
}

// --- UPGRADES ---
const UPGRADE_POOL = [
  { id: 'speed', name: 'Agility Boost', desc: '+15% Move Speed', icon: '⚡' },
  { id: 'regen', name: 'Vitality', desc: '+0.03 HP Regen/sec', icon: '❤️' },
  { id: 'damage', name: 'Power Surge', desc: '+25% Projectile Damage', icon: '🔥' },
  { id: 'tether', name: 'Elastic Bond', desc: '+30% Max Tether Length', icon: '🔗' },
  { id: 'energy', name: 'Efficiency', desc: '+35% Energy Regen Rate', icon: '🔋' },
  { id: 'maxhp', name: 'Hardened Shell', desc: '+20 Max HP & Full Heal', icon: '🛡️' },
  { id: 'attack_speed', name: 'Rapid Fire', desc: '-20% Attack Cooldown', icon: '🔫' }
];

function generateUpgrades() {
  upgradesAvailable = [];
  let pool = [...UPGRADE_POOL];
  for (let i = 0; i < 3; i++) {
    let idx = floor(random(pool.length));
    upgradesAvailable.push(pool.splice(idx, 1)[0]);
  }
  selectedUpgradeIndex = 1;
}

function selectUpgrade(idx) {
  applyUpgrade(upgradesAvailable[idx]);
  gameState = 'play';
  wave++;
  spawnInterval = max(40, spawnInterval - 5);
  spawnWave();
  shakeAmt = 10;
  flashAlpha = 100;
}

function applyUpgrade(upgrade) {
  switch (upgrade.id) {
    case 'speed': playerBaseSpeed *= 1.15; break;
    case 'regen': healthRegenRate += 0.0005; break; // 0.0005 * 60 fps = 0.03 hp/sec
    case 'damage': projectileDamage *= 1.25; break;
    case 'tether': BUNGEE_MAX *= 1.30; break;
    case 'energy': energyRegenRate *= 1.35; break;
    case 'maxhp': 
      playerMaxHP += 20; 
      for(let p of players) p.hp = playerMaxHP; 
      break;
    case 'attack_speed': attackCooldown = max(5, attackCooldown * 0.8); break;
  }
}

function drawUpgradeMenu() {
  drawGame(); // Draw game in background
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);

  push();
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(42);
  textStyle(BOLD);
  text("CHOOSE AN UPGRADE", width / 2, height * 0.15);
  textSize(18);
  textStyle(NORMAL);
  fill(200);
  text("Wave " + wave + " Cleared! Pick one to become stronger.", width / 2, height * 0.2);

  let cardW = 280, cardH = 380, gap = 40;
  let totalW = cardW * 3 + gap * 2;
  let startX = (width - totalW) / 2;

  for (let i = 0; i < upgradesAvailable.length; i++) {
    let x = startX + i * (cardW + gap);
    let y = height / 2 - cardH / 2 + 20;
    let upg = upgradesAvailable[i];
    let isSelected = selectedUpgradeIndex === i;
    
    // Hover effect (simulated by selectedUpgradeIndex)
    if (isSelected) {
      y -= 15;
      stroke(255, 255, 100, 150);
      strokeWeight(2.5);
      drawingContext.shadowBlur = 20;
      drawingContext.shadowColor = 'rgba(255, 255, 100, 0.4)';
    } else {
      noStroke();
      drawingContext.shadowBlur = 0;
    }

    // Card background
    fill(25, 25, 45);
    rect(x, y, cardW, cardH, 15);
    
    // Reset shadow for inner elements
    drawingContext.shadowBlur = 0;

    // Inner glow
    if (isSelected) {
      fill(255, 255, 100, 15);
      rect(x, y, cardW, cardH, 15);
    }

    // Icon
    textSize(80);
    text(upg.icon, x + cardW / 2, y + 100);

    // Title
    fill(255);
    textSize(26);
    textStyle(BOLD);
    text(upg.name, x + cardW / 2, y + 200);

    // Description
    fill(180);
    textSize(16);
    textStyle(NORMAL);
    text(upg.desc, x + 20, y + 250, cardW - 40);

    // Key Hint
    fill(255, 255, 100, 150);
    textSize(24);
    text("[" + (i + 1) + "]", x + cardW / 2, y + cardH - 40);
  }
  pop();
}

function drawHUD(){
  // --- Top-left: Score panel ---
  fill(15, 15, 25, 220);
  rect(20, 20, 280, 120, 15);
  fill(80, 220, 160); textAlign(LEFT, TOP); textSize(22);
  text('SCORE', 40, 30);
  fill(255); textSize(42);
  text(score, 40, 55);
  fill(160); textSize(18);
  text('WAVE ' + wave + '  •  ' + enemies.length + ' enemies', 40, 100);

  // --- Top-center: Energy bar ---
  let bw = 550, bh = 30, bx = width / 2 - bw / 2, by = 25;
  fill(15, 15, 25, 220);
  rect(bx - 8, by - 8, bw + 16, bh + 16, 12);
  let ec = lerpColor(color(220, 60, 60), color(60, 220, 180), energy / maxEnergy);
  fill(ec);
  rect(bx, by, bw * (energy / maxEnergy), bh, 8);
  // Shimmer
  let shimX = (frameCount * 2.5) % (bw + 100) - 50;
  push(); drawingContext.save();
  drawingContext.beginPath(); drawingContext.roundRect(bx, by, bw * (energy / maxEnergy), bh, 8);
  drawingContext.clip();
  fill(255, 255, 255, 50);
  quad(bx + shimX, by, bx + shimX + 40, by, bx + shimX + 25, by + bh, bx + shimX - 15, by + bh);
  drawingContext.restore(); pop();
  fill(255, 255, 255, 200); textAlign(CENTER, CENTER); textSize(16); textStyle(BOLD);
  text('ENERGY', width / 2, by + bh / 2); textStyle(NORMAL);

  // --- Bottom-center: Ability bar ---
  let abilities = [
    { name: 'SPEED', icon: '⚡', keys: 'E+O', cost: 15, active: speedBoostActive > 0, cd: 0, maxCd: 1, ready: energy >= 15, unlockWave: 1, color: [255, 255, 100] },
    { name: 'SHIELD', icon: '🛡️', keys: 'SHIFT', cost: 20, active: false, cd: shieldCooldown, maxCd: 90, ready: energy >= 20 && shieldCooldown <= 0, unlockWave: 2, color: [100, 200, 255] },
    { name: 'VORTEX', icon: '🔮', keys: 'R+P', cost: 25, active: gwActive, cd: 0, maxCd: 1, ready: energy >= 25 && !gwActive, unlockWave: 3, color: [160, 100, 255] },
    { name: 'SLAM', icon: '💥', keys: 'X+.', cost: 35, active: slamActive, cd: 0, maxCd: 1, ready: energy >= 35 && !slamActive, unlockWave: 4, color: [255, 120, 60] },
    { name: 'ANCHOR', icon: '🌀', keys: 'SPACE', cost: 50, active: anchorMode, cd: anchorCooldown, maxCd: 45, ready: energy >= 50 && anchorCooldown <= 0, unlockWave: 5, color: [100, 200, 255] }
  ];
  let aw = 115, ah = 105, gap = 16;
  let totalW = abilities.length * aw + (abilities.length - 1) * gap;
  let ax = width / 2 - totalW / 2, ay = height - ah - 25;
  // Background panel
  fill(10, 10, 20, 230);
  rect(ax - 15, ay - 12, totalW + 30, ah + 24, 18);
  for (let i = 0; i < abilities.length; i++) {
    let ab = abilities[i];
    let x = ax + i * (aw + gap), y = ay;
    let isUnlocked = wave >= ab.unlockWave;

    if (!isUnlocked) {
      fill(20, 20, 35, 180); noStroke();
      rect(x, y, aw, ah, 12);
      textAlign(CENTER, CENTER); textSize(38);
      fill(80); text('🔒', x + aw/2, y + 35);
      textSize(12); textStyle(BOLD); fill(100);
      text('WAVE ' + ab.unlockWave, x + aw/2, y + 75);
      textStyle(NORMAL);
      continue;
    }

    // Card bg
    if (ab.active) {
      fill(ab.color[0], ab.color[1], ab.color[2], 60);
      stroke(ab.color[0], ab.color[1], ab.color[2], 200); strokeWeight(2.5);
    } else if (!ab.ready) {
      fill(20, 20, 35, 200); noStroke();
    } else {
      fill(35, 35, 55, 230); noStroke();
    }
    rect(x, y, aw, ah, 12);
    noStroke();
    // Cooldown overlay
    if (ab.cd > 0 && ab.maxCd > 1) {
      fill(0, 0, 0, 160);
      let cdH = ah * (ab.cd / ab.maxCd);
      rect(x, y + ah - cdH, aw, cdH, 0, 0, 12, 12);
    }
    // Icon
    textAlign(CENTER, CENTER); textSize(38);
    fill(ab.ready || ab.active ? 255 : 80);
    text(ab.icon, x + aw / 2, y + 26);
    // Name
    textSize(15); textStyle(BOLD);
    fill(ab.ready || ab.active ? 220 : 70);
    text(ab.name, x + aw / 2, y + 54); textStyle(NORMAL);
    // Key hint
    textSize(14);
    fill(ab.ready ? [200, 200, 200] : [70, 70, 70]);
    text(ab.keys, x + aw / 2, y + 72);
    // Cost
    textSize(14);
    fill(ab.ready ? [80, 255, 200] : [50, 100, 80]);
    text(ab.cost + '⚡', x + aw / 2, y + 88);
  }

  // --- Active ability banners ---
  let bannerY = 80;
  textAlign(CENTER, CENTER); textSize(26); textStyle(BOLD);
  if (speedBoostActive > 0) {
    fill(255, 255, 100, map(speedBoostActive, 0, 150, 80, 255));
    text('⚡ SPEED BOOST ⚡', width / 2, bannerY);
    bannerY += 25;
  }
  if (anchorMode) {
    fill(100, 200, 255, 230);
    text('🌀 ANCHOR SPIN 🌀', width / 2, bannerY);
    bannerY += 25;
  }
  if (gwActive) {
    fill(160, 100, 255, 230);
    text('🔮 GRAVITY VORTEX 🔮', width / 2, bannerY);
    bannerY += 25;
  }
  if (slamActive) {
    fill(255, 120, 60, 230);
    text('💥 BUNGEE SLAM 💥', width / 2, bannerY);
  }
  textStyle(NORMAL);

  // --- Player HP panels ---
  drawPlayerHUD(0, 30, height - 160);
  drawPlayerHUD(1, width - 250, height - 160);
}

function drawPlayerHUD(id, x, y) {
  let p = players[id];
  fill(10, 10, 20, 220);
  rect(x, y, 220, 60, 15);
  // Slime icon
  fill(p.col[0], p.col[1], p.col[2]);
  circle(x + 35, y + 30, 36);
  fill(255, 255, 255, 150);
  circle(x + 31, y + 25, 10);
  // Label
  fill(255); textAlign(LEFT, CENTER); textSize(18); textStyle(BOLD);
  text('P' + (id + 1), x + 65, y + 15); textStyle(NORMAL);
  // HP bar
  let hpW = 130;
  fill(30, 30, 45); rect(x + 65, y + 30, hpW, 14, 7);
  let hpCol = p.hp > 50 ? [80, 220, 120] : (p.hp > 25 ? [255, 200, 60] : [255, 80, 80]);
  fill(hpCol[0], hpCol[1], hpCol[2]);
  rect(x + 65, y + 30, hpW * (p.hp / playerMaxHP), 14, 7);
}

// --- TITLE ---
function drawTitle(){
  background(12,12,22);
  let cx=width/2, cy=height/2;
  // Animated bg circles
  noFill();
  for(let i=0;i<8;i++){
    let r=100+i*50+sin(frameCount*0.02+i)*20;
    stroke(60,200,160,30-i*3); strokeWeight(1);
    circle(cx,cy,r*2);
  }
  noStroke();
  // Title
  textAlign(CENTER,CENTER);
  fill(80,220,160); textSize(52);
  text('BUNGEE SLIMES',cx,cy-80);
  fill(100,160,255); textSize(18);
  text('Co-op Arena',cx,cy-42);
  // Controls table
  fill(180); textSize(13);
  text('Player 1: WASD  •  Player 2: IJKL',cx,cy+10);
  text('Speed Boost: E + O  •  Anchor Spin: SPACE',cx,cy+32);
  text('Gravity Vortex: R + P  •  Shield Pulse: SHIFT',cx,cy+54);
  text('Bungee Slam: X + .  •  Bungee Kill: cross enemies!',cx,cy+76);
  fill(255,255,255,120+sin(frameCount*0.05)*80); textSize(16);
  text('Press any key to start',cx,cy+120);
}

// --- GAME OVER ---
function drawGameOver(){
  background(12,12,22,20);
  textAlign(CENTER,CENTER);
  fill(220,60,60); textSize(48);
  text('GAME OVER',width/2,height/2-40);
  fill(200); textSize(20);
  text('Score: '+score+'  •  Wave: '+wave,width/2,height/2+10);
  fill(150); textSize(14);
  text('Press SPACE or ENTER to restart',width/2,height/2+50);
}

// --- UTILS ---
function mkPart(x,y,col,r){
  return {x:x,y:y,vx:random(-2,2),vy:random(-3,0),col:col,r:r,life:30+random(20),maxLife:50};
}

function ptSegDist(px,py,ax,ay,bx,by){
  let dx=bx-ax, dy=by-ay;
  let t=constrain(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy),0,1);
  let cx=ax+t*dx, cy=ay+t*dy;
  return dist(px,py,cx,cy);
}
