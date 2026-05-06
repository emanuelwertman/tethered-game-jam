class Player {
  constructor(x, y, playerColor) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = 60;
    this.speed = 1.5; // Acceleration per frame
    this.friction = 0.8; // Damping
    this.img = playerColor; this.color = color(255); this.frame = 0; this.frameTimer = 0;
    this.health = 300;
    this.maxHealth = 100;
    this.invulnTimer = 0;
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
      fill(255); // not used
    }
    stroke(255);
    strokeWeight(2);
    // Draw placeholder sprite (a circle)
    // Sprite rendering
    let fw = this.img.height; // assuming square frames based on height
    let maxFrames = this.img.width / fw;
    
    if (this.invulnTimer > 0) {
      this.frame = maxFrames - 1; // Last frame is damage animation
    } else {
      this.frameTimer++;
      if (this.frameTimer > 5) {
        this.frame = (this.frame + 1) % (maxFrames - 1);
        this.frameTimer = 0;
      }
    }
    
    imageMode(CENTER);
    image(this.img, this.x, this.y, this.size * 2, this.size * 2, this.frame * fw, 0, fw, fw);

    pop();
  }
}
