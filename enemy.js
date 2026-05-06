class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = 45; // slightly smaller than players
    this.speed = 0.5; // Acceleration per frame (slower than player)
    this.friction = 0.8; // Damping
    this.health = 3; 
    this.maxHealth = 3;
    this.frame = 0; 
    this.frameTimer = 0; 
    this.damageTimer = 0;
    this.deathTimer = 0;
  }

  chase(p1, p2) {
    if (this.health <= 0) return;
    // Calculate distance to both players
    let dist1 = dist(this.x, this.y, p1.x, p1.y);
    let dist2 = dist(this.x, this.y, p2.x, p2.y);
    
    // Choose the closest player as the target
    let target = (dist1 < dist2) ? p1 : p2;
    
    // Calculate vector toward target
    let dx = target.x - this.x;
    let dy = target.y - this.y;
    let distance = sqrt(dx * dx + dy * dy);
    
    // Move toward target
    if (distance > 0) {
      this.vx += (dx / distance) * this.speed;
      this.vy += (dy / distance) * this.speed;
    }
  }

  update() {
    if (this.damageTimer > 0) {
      this.damageTimer--;
    }

    if (this.health <= 0) {
      this.deathTimer++;
    } else {
      // Apply friction
      this.vx *= this.friction;
      this.vy *= this.friction;

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;
    }
    
    // Boundaries (optional, depending on desired behavior)
    // this.x = constrain(this.x, this.size / 2, width - this.size / 2);
    // this.y = constrain(this.y, this.size / 2, height - this.size / 2);
  }

  display() {
    push();
    if (this.health <= 0 || this.damageTimer > 0) {
      tint(255, 150, 150); // Reddish hue
    }
    // Render enemy sprite
    let fw = imgEnemy.height;
    let maxFrames = imgEnemy.width / fw;
    
    if (this.health <= 0) {
      this.frame = maxFrames - 1; // Death frame
    } else if (this.damageTimer > 0) {
      this.frame = maxFrames - 2; // Damage frame
    } else {
      this.frameTimer++;
      if (this.frameTimer > 5) {
        this.frame = (this.frame + 1) % (maxFrames - 2);
        this.frameTimer = 0;
      }
    }
    
    imageMode(CENTER);
    image(imgEnemy, this.x, this.y, this.size * 2, this.size * 2, this.frame * fw, 0, fw, fw);

    pop();
  }
}
