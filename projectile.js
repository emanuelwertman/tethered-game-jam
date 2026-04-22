class Projectile {
  constructor(x, y, vx, vy, pColor) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = pColor;
    this.size = 10;
    this.markedForDeletion = false;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // remove if offscreen to prevent memory leaks
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
      this.markedForDeletion = true;
    }
  }
  
  display() {
    push();
    fill(this.color);
    noStroke();
    ellipse(this.x, this.y, this.size, this.size);
    pop();
  }
}
