
let imgGreenSlime, imgPinkSlime, imgEnemy, imgChain, imgFloor, imgHealth;

function preload() {
  imgGreenSlime = loadImage('assets/green_slime.png');
  imgPinkSlime = loadImage('assets/pink_slime.png');
  imgEnemy = loadImage('assets/enemy.png');
  imgChain = loadImage('assets/chain.png');
  imgFloor = loadImage('assets/floor.png');
  imgHealth = loadImage('assets/health.png');
}
let player1;
let player2;
let enemies = [];
let sharedEnergy = 100;
let maxSharedEnergy = 100;
let score = 0;
let spawnRate = 120;
let framesSinceLastSpawn = 0;
let enemiesSpawnedCount = 0;

// Constant for maximum chain distance
const TETHER_MAX_DIST = 300;

function setup() {
  // Create a canvas the size of the screen
  createCanvas(windowWidth, windowHeight);
  
  // Initialize players
  // left side, red
  player1 = new Player(width / 4, height / 2, imgPinkSlime); 
  // right side, blue
  player2 = new Player((width / 4) * 3, height / 2, imgGreenSlime); 
  
  // Initialize placeholder enemies
  for (let i = 0; i < 5; i++) {
    // spawn them near edges
    let ex = random() > 0.5 ? random(0, 100) : random(width - 100, width);
    let ey = random(height);
    enemies.push(new Enemy(ex, ey));
  }
}

function draw() {
  // Background acts as our "map" for now (green grass color)
  // Draw floor
  for (let x = 0; x < width; x += imgFloor.width) {
    for (let y = 0; y < height; y += imgFloor.height) {
      imageMode(CORNER);
      image(imgFloor, x, y);
    }
  }
  
  // Handle movement
  let boostActive = false;
  if (keyIsDown(69) && keyIsDown(79) && sharedEnergy > 0) { // E is 69, O is 79
    boostActive = true;
    sharedEnergy -= 1;
  }
  if (boostActive) {
    player1.speed = 3.0; // Boost speed
    player2.speed = 3.0;
  } else {
    player1.speed = 1.5; // Normal speed
    player2.speed = 1.5;
  }

  // Player 1 controls: W(87), S(83), A(65), D(68)
  player1.handleInput(87, 83, 65, 68);
  
  // Player 2 controls: I(73), K(75), J(74), L(76)
  player2.handleInput(73, 75, 74, 76);
  
  // Apply tugging physics if they step too far apart
  applyTether(player1, player2, TETHER_MAX_DIST);

  // Update position based on velocities
  player1.update();
  player2.update();

  // Draw the chain holding them together
  stroke(150); // Gray color
  strokeWeight(6);
  line(player1.x, player1.y, player2.x, player2.y);
  
  // Helper to calculate distance from point to segment
  function distToSegment(px, py, x1, y1, x2, y2) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return dist(px, py, x1, y1);
    
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    
    let projX = x1 + t * dx;
    let projY = y1 + t * dy;
    return dist(px, py, projX, projY);
  }

  // Update and display enemies
  framesSinceLastSpawn++;
  if (framesSinceLastSpawn >= spawnRate) {
    framesSinceLastSpawn = 0;
    
    // Speed up spawn rate, minimum 20 frames
    spawnRate = max(20, spawnRate - 2);
    enemiesSpawnedCount++;
    
    // Later enemies have more health
    let hp = 3 + floor(enemiesSpawnedCount / 5);
    
    let ex = random() > 0.5 ? random(0, 100) : random(width - 100, width);
    let ey = random(height);
    let newEnemy = new Enemy(ex, ey);
    newEnemy.health = hp;
    newEnemy.maxHealth = hp;
    enemies.push(newEnemy);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let enemy = enemies[i];
    
    enemy.chase(player1, player2);
    enemy.update();
    enemy.display();

    if (enemy.health <= 0) {
      if (enemy.deathTimer > 60) {
        enemies.splice(i, 1);
      }
      continue;
    }
    
    // Check if enemy hits the chain
    let dToChain = distToSegment(enemy.x, enemy.y, player1.x, player1.y, player2.x, player2.y);
    if (dToChain < enemy.size / 2 + 3) { // 3 is roughly half the chain stroke weight
      if (enemy.damageTimer <= 0) {
        enemy.health -= 1; // Or set to 0 for instant kill
        enemy.damageTimer = 10; // I-frames for enemy against chain
        if (enemy.health <= 0) {
          score += enemy.maxHealth * enemy.maxHealth;
          sharedEnergy = min(maxSharedEnergy, sharedEnergy + 10); // Give some shared energy
        }
      }
    }
  }

  // Display players
  player1.display();
  player2.display();
  
  // Handle overlapping bodies and damage
  handleCollisions();
  
  // Display UI Elements
  drawUI();
}

function handleCollisions() {
  // 1. Players can't go into each other
  resolveOverlap(player1, player2);

  // 2. Slimes can't go into each other
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      resolveOverlap(enemies[i], enemies[j]);
    }
  }

  // 3. Slime hits a player -> damage and knockback
  for (let i = 0; i < enemies.length; i++) {
    let enemy = enemies[i];
    
    // Check player 1
    let d1 = dist(player1.x, player1.y, enemy.x, enemy.y);
    let minDist1 = player1.size / 2 + enemy.size / 2;
    if (d1 < minDist1 && d1 > 0) {
      if (player1.invulnTimer <= 0) {
        player1.health -= 20;
        player1.invulnTimer = 30;
      }
      let dx = player1.x - enemy.x;
      let dy = player1.y - enemy.y;
      let forceX = (dx / d1) * 15;
      let forceY = (dy / d1) * 15;
      player1.vx += forceX;
      player1.vy += forceY;
      enemy.vx -= forceX;
      enemy.vy -= forceY;
    }

    // Check player 2
    let d2 = dist(player2.x, player2.y, enemy.x, enemy.y);
    let minDist2 = player2.size / 2 + enemy.size / 2;
    if (d2 < minDist2 && d2 > 0) {
      if (player2.invulnTimer <= 0) {
        player2.health -= 20;
        player2.invulnTimer = 30;
      }
      let dx = player2.x - enemy.x;
      let dy = player2.y - enemy.y;
      let forceX = (dx / d2) * 15;
      let forceY = (dy / d2) * 15;
      player2.vx += forceX;
      player2.vy += forceY;
      enemy.vx -= forceX;
      enemy.vy -= forceY;
    }
  }
}

function resolveOverlap(obj1, obj2) {
  let dx = obj2.x - obj1.x;
  let dy = obj2.y - obj1.y;
  let distance = sqrt(dx * dx + dy * dy);
  let minDistance = obj1.size / 2 + obj2.size / 2;

  if (distance < minDistance && distance > 0) {
    let overlap = minDistance - distance;
    let pushX = (dx / distance) * (overlap / 2);
    let pushY = (dy / distance) * (overlap / 2);
    
    obj1.x -= pushX;
    obj1.y -= pushY;
    obj2.x += pushX;
    obj2.y += pushY;
  }
}

function drawUI() {
  push();
  noStroke();
  
  // Health Sprite parameters
  let numFrames = 6;
  let fw = imgHealth.width / numFrames;
  let fh = imgHealth.height;

  // Player 1 Health (Top Left)
  fill(255);
  textSize(16);
  textAlign(LEFT, CENTER);
  text("Player 1 Health", 20, 20);
  imageMode(CORNER);
  
  // Calculate which frame to show (0 to 5)
  // Assuming player health goes from 0 to 100.
  // 5 hearts = 100 health, 0 hearts = 0 health
  let p1HealthStage = constrain(ceil(player1.health / 20), 0, 5);
  // Assuming frames are ordered 5, 4, 3, 2, 1, 0
  let p1Frame = 5 - p1HealthStage;
  // Scale down the huge 1000x1000 sprite
  let drawSize = 100; // adjust this if it's still too large or small
  image(imgHealth, 20, 35, drawSize, drawSize, p1Frame * fw, 0, fw, fh);
  
  // Player 2 Health (Top Right)
  fill(255);
  textAlign(RIGHT, CENTER);
  text("Player 2 Health", width - 20, 20);
  
  let p2HealthStage = constrain(ceil(player2.health / 20), 0, 5);
  let p2Frame = 5 - p2HealthStage;
  // Draw aligned to the right
  image(imgHealth, width - 20 - drawSize, 35, drawSize, drawSize, p2Frame * fw, 0, fw, fh);
  
  // Shared Energy Pool (Bottom Center)
  let energyWidth = 300;
  fill(70, 70, 70); // Dark gray background
  rect(width / 2 - energyWidth / 2, height - 30, energyWidth, 20);
  fill(0, 150, 255); // Blue energy
  let currentEnergyWidth = map(sharedEnergy, 0, maxSharedEnergy, 0, energyWidth);
  rect(width / 2 - energyWidth / 2, height - 30, currentEnergyWidth, 20);
  fill(255);
  textAlign(CENTER, CENTER);
  text("Shared Energy", width / 2, height - 40);
  
  // Score display (Top Center)
  fill(255);
  textAlign(CENTER, TOP);
  textSize(24);
  text("Score: " + score, width / 2, 20);
  
  pop();
}

function applyTether(p1, p2, maxDist) {
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;
  let dist = sqrt(dx*dx + dy*dy);
  
  if (dist > maxDist) {
    // If further apart than allowed, pull them back toward each other
    let difference = dist - maxDist;
    let springStrength = 0.05; // Makes the constraint elastic and tuggy
    
    let forceX = (dx / dist) * difference * springStrength;
    let forceY = (dy / dist) * difference * springStrength;
    
    // Apply the "tugging" force evenly to both players' velocities
    p1.vx += forceX;
    p1.vy += forceY;
    
    p2.vx -= forceX;
    p2.vy -= forceY;
  }
}

// Adjust canvas if window is resized
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Classes have been moved to separate files: player.js, enemy.js

