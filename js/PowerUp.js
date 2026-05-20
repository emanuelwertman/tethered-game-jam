class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 0: apple, 1: golden apple, 2: banana
    this.r = 20;
    this.life = 600;
  }

  update(players, game) {
    this.life--;
    if (this.life <= 0) return true;

    for (let p of players) {
      if (dist(p.x, p.y, this.x, this.y) < p.r + this.r) {
        this.apply(p, game);
        return true;
      }
    }
    return false;
  }

  apply(p, game) {
    game.shakeAmt = 5;
    if (this.type === 0) { // Apple: Heal
      p.hp = min(100, p.hp + 25);
      for (let i = 0; i < 15; i++) game.particles.push(new Particle(p.x, p.y, [255, 100, 100], 3));
    } else if (this.type === 1) { // Golden Apple: Energy Refill
      game.energy = min(game.maxEnergy, game.energy + 45);
      for (let i = 0; i < 15; i++) game.particles.push(new Particle(p.x, p.y, [255, 220, 100], 3));
    } else if (this.type === 2) { // Banana: Speed Boost
      game.speedBoostActive = 300;
      for (let i = 0; i < 15; i++) game.particles.push(new Particle(p.x, p.y, [255, 255, 150], 3));
    }
  }

  draw(img) {
    let bounce = sin(frameCount * 0.1) * 5;
    let s = 45;
    imageMode(CENTER);
    let sw = img.width / 3;
    let sh = img.height;
    image(img, this.x, this.y + bounce, s, s, this.type * sw, 0, sw, sh);
    fill(255, 255, 255, 30);
    circle(this.x, this.y + bounce, this.r * 1.5);
  }
}
