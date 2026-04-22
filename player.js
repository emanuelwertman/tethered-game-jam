class Player {
  constructor(x, y, playerColor) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = 40;
    this.speed = 1.5; // Acceleration per frame
    this.friction = 0.8; // Damping
    this.color = playerColor;
    this.health = 100;
    this.maxHealth = 100;
    this.shootTimer = 0;
    this.fireRate = 30; // frames between shots
    this.invulnTimer = 0;
  }
  
  autoShoot(enemies) {
    this.shootTimer--;
    if (this.shootTimer <= 0 && enemies.length > 0) {
      // Find nearest enemy
      let nearestDist = Infinity;
      let nearestEnemy = null;
      for (let enemy of enemies) {
        if (enemy.health <= 0) continue; // Don't shoot dead enemies
        let d = dist(this.x, this.y, enemy.x, enemy.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = enemy;
        }
      }
      
      if (nearestEnemy) {
        // Calculate direction to enemy
        let dx = nearestEnemy.x - this.x;
        let dy = nearestEnemy.y - this.y;
        let distance = sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          let projectileSpeed = 8;
          let vx = (dx / distance) * projectileSpeed;
          let vy = (dy / distance) * projectileSpeed;
          
          projectiles.push(new Projectile(this.x, this.y, vx, vy, this.color));
          this.shootTimer = this.fireRate;
        }
      }
    }
  }

  handleInput(upKey, downKey, leftKey, rightKey) {
    if (keyIsDown(upKey)) {
      this.vy -= this.speed;
    }
    if (keyIsDown(downKey)) {
      this.vy += this.speed;
    }
    if (keyIsDown(leftKey)) {
      this.vx -= this.speed;
    }
    if (keyIsDown(rightKey)) {
      this.vx += this.speed;
    }
  }

  update() {
    if (this.invulnTimer > 0) {
      this.invulnTimer--;
    }

    // Apply friction to slow down over time
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Apply velocity
    this.x += this.vx;
    this.y += this.vy;
    
    // Keep character within screen bounds
    this.x = constrain(this.x, this.size / 2, width - this.size / 2);
    this.y = constrain(this.y, this.size / 2, height - this.size / 2);
  }
  
  display() {
    push();
    if (this.invulnTimer > 0 && frameCount % 10 < 5) {
      fill(255); // Flash white when hit
    } else {
      fill(this.color);
    }
    stroke(255);
    strokeWeight(2);
    // Draw placeholder sprite (a circle)
    ellipse(this.x, this.y, this.size, this.size);
    
    // Draw a little "nose" so we know which way it could face
    fill(0);
    noStroke();
    ellipse(this.x, this.y - this.size/4, this.size/4);
    pop();
  }
}
