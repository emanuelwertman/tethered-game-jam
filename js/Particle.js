class Particle {
  constructor(x, y, col, r) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(-3, 0);
    this.col = col;
    this.r = r;
    this.life = 30 + random(20);
    this.maxLife = 50;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05;
    this.life--;
  }

  draw() {
    let a = map(this.life, 0, this.maxLife, 0, 200);
    fill(this.col[0], this.col[1], this.col[2], a);
    circle(this.x, this.y, this.r * map(this.life, 0, this.maxLife, 0.3, 1));
  }

  isDead() {
    return this.life <= 0;
  }
}
