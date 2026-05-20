class Projectile {
  constructor(x, y, vx, vy, dmg, life, col, r, enemy = false, eDmg = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dmg = dmg;
    this.life = life;
    this.col = col;
    this.r = r;
    this.enemy = enemy;
    this.eDmg = eDmg;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw() {
    if (this.enemy) {
      fill(255, 100, 50, 200);
      circle(this.x, this.y, this.r * 2.2);
      fill(255, 255, 255, 180);
      circle(this.x, this.y, this.r * 1.1);
    } else {
      fill(this.col[0], this.col[1], this.col[2], 200);
      circle(this.x, this.y, this.r * 2);
      fill(255, 255, 255, 150);
      circle(this.x, this.y, this.r);
    }
  }

  isDead() {
    return this.life <= 0 || this.x < 0 || this.x > ARENA_W || this.y < 0 || this.y > ARENA_H;
  }
}
