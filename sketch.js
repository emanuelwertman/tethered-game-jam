
let imgGreenSlime, imgPinkSlime, imgEnemy, imgChain, imgFloor;

function preload() {
  imgGreenSlime = loadImage('assets/green_slime.png');
  imgPinkSlime = loadImage('assets/pink_slime.png');
  imgEnemy = loadImage('assets/enemy.png');
  imgChain = loadImage('assets/chain.png');
  imgFloor = loadImage('assets/floor.png');
}
let player1;
let player2;
let enemies = [];
let sharedEnergy = 100;
let maxSharedEnergy = 100;

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
  // Player 1 controls: W(87), S(83), A(65), D(68)
  player1.handleInput(87, 83, 65, 68);
  
  // Player 2 controls: UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW
  player2.handleInput(UP_ARROW, DOWN_ARROW, LEFT_ARROW, RIGHT_ARROW);
  
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
  for (let i = enemies.length - 1; i >= 0; i--) {
    let enemy = enemies[i];
    if (enemy.health <= 0) {
      enemies.splice(i, 1);
      continue;
    }
    enemy.chase(player1, player2);
    enemy.update();
    enemy.display();
    
    // Check if enemy hits the chain
    let dToChain = distToSegment(enemy.x, enemy.y, player1.x, player1.y, player2.x, player2.y);
    if (dToChain < enemy.size / 2 + 3) { // 3 is roughly half the chain stroke weight
      enemy.health -= 1; // Or set to 0 for instant kill
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
        player1.health -= 10;
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
        player2.health -= 10;
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
  
  // Player 1 Health Bar (Top Left)
  fill(150, 0, 0); // Dark red background
  rect(20, 20, 200, 20);
  fill(0, 200, 0); // Green health
  let p1HealthWidth = map(max(0, player1.health), 0, player1.maxHealth, 0, 200);
  rect(20, 20, p1HealthWidth, 20);
  fill(255);
  textSize(16);
  textAlign(LEFT, CENTER);
  text("Player 1 Health", 20, 10);
  
  // Player 2 Health Bar (Top Right)
  fill(150, 0, 0);
  rect(width - 220, 20, 200, 20);
  fill(0, 200, 0);
  let p2HealthWidth = map(max(0, player2.health), 0, player2.maxHealth, 0, 200);
  rect(width - 200 + (200 - p2HealthWidth) - 20, 20, p2HealthWidth, 20); // Scale from right to left
  fill(255);
  textAlign(RIGHT, CENTER);
  text("Player 2 Health", width - 20, 10);
  
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

