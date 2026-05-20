class Player {
  constructor(x, y, col, img, id) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = 22;
    this.col = col;
    this.trail = [];
    this.hp = 100;
    this.shootCD = 0;
    this.id = id;
    this.img = img;
    this.damageTimer = 0;
  }

  update(keys, spd, enemies, projectiles) {
    // Movement logic
    if (this.id === 0) { // P1 WASD
      if (keys['a']) this.vx -= 1.3;
      if (keys['d']) this.vx += 1.3;
      if (keys['w']) this.vy -= 1.3;
      if (keys['s']) this.vy += 1.3;
    } else { // P2 IJKL
      if (keys['j']) this.vx -= 1.3;
      if (keys['l']) this.vx += 1.3;
      if (keys['i']) this.vy -= 1.3;
      if (keys['k']) this.vy += 1.3;
    }

    this.vx *= 0.90;
    this.vy *= 0.90;
    this.vx = constrain(this.vx, -spd, spd);
    this.vy = constrain(this.vy, -spd, spd);
    this.x += this.vx;
    this.y += this.vy;

    // Arena bounds
    this.x = constrain(this.x, this.r, ARENA_W - this.r);
    this.y = constrain(this.y, this.r, ARENA_H - this.r);

    // Trail
    this.trail.push({ x: this.x, y: this.y, a: 1 });
    if (this.trail.length > 20) this.trail.shift();
    for (let t of this.trail) t.a *= 0.9;

    // Auto-shoot
    this.shootCD--;
    if (this.shootCD <= 0 && enemies.length > 0) {
      let nearest = null, nd = Infinity;
      for (let e of enemies) {
        let dd = dist(this.x, this.y, e.x, e.y);
        if (dd < nd) { nd = dd; nearest = e; }
      }
      if (nearest && nd < 500) {
        let a = atan2(nearest.y - this.y, nearest.x - this.x);
        projectiles.push(new Projectile(this.x, this.y, cos(a) * 8, sin(a) * 8, 8, 60, this.col, 4));
        this.shootCD = 18;
      }
    }

    if (this.damageTimer > 0) this.damageTimer--;
  }

  draw(speedBoostActive) {
    // Trail
    for (let t of this.trail) {
      fill(this.col[0], this.col[1], this.col[2], t.a * 40);
      circle(t.x, t.y, this.r * 2 * t.a);
    }
    // Shadow
    fill(0, 0, 0, 40);
    ellipse(this.x, this.y + this.r * 0.7, this.r * 2.2, this.r * 0.8);

    // Sprite Animation
    let frame = 0;
    if (this.damageTimer > 0) {
      frame = 3; // Damage frame
    } else {
      let moveSpeed = dist(0, 0, this.vx, this.vy);
      if (moveSpeed > 0.5) {
        frame = floor(frameCount * 0.15) % 3;
      }
    }

    push(); translate(this.x, this.y);
    // Glow
    fill(this.col[0], this.col[1], this.col[2], 30);
    circle(0, 0, this.r * 3.5);
    // Image
    imageMode(CENTER);
    let sw = this.img.width / 4;
    let sh = this.img.height;
    image(this.img, 0, 0, this.r * 3, this.r * 3, frame * sw, 0, sw, sh);

    // Speed lines
    if (speedBoostActive > 0) {
      stroke(255, 255, 200, 100); strokeWeight(2);
      for (let i = 0; i < 3; i++) {
        let ly = -10 + i * 10;
        line(-this.r - 8 - random(5), ly, -this.r - 15 - random(10), ly);
      }
      noStroke();
    }
    pop();

    // HP bar
    if (this.hp < 100) {
      let bw = 30;
      fill(40, 40, 40, 180); rect(this.x - bw / 2, this.y - this.r - 14, bw, 4, 2);
      fill(80, 220, 120); rect(this.x - bw / 2, this.y - this.r - 14, bw * (this.hp / 100), 4, 2);
    }
  }
}
