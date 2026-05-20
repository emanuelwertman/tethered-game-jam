class Enemy {
  constructor(x, y, tier) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.tier = tier;
    
    // Assign properties based on tier
    let def = this.getDef(tier);
    Object.assign(this, def);
  }

  getDef(tier) {
    switch (tier) {
      case 1: return { r: 18, hp: 50, maxHp: 50, spd: 1, score: 30, col: [220, 80, 80] };
      case 2: return { r: 14, hp: 28, maxHp: 28, spd: 1.2, score: 25, col: [255, 180, 60], shootCD: 40 };
      case 3: return { r: 12, hp: 22, maxHp: 22, spd: 2, score: 20, col: [60, 220, 220], dashCD: 60, dashing: false, dashTimer: 0 };
      case 4: return { r: 16, hp: 35, maxHp: 35, spd: 1.4, score: 35, col: [120, 220, 80] };
      case 5: return { r: 26, hp: 120, maxHp: 120, spd: 0.6, score: 60, col: [255, 120, 40], slamCD: 90, slamFlash: 0 };
      default: return { r: 13, hp: 20, maxHp: 20, spd: 1.5 + random(0.5), score: 10, col: [200, 100 + floor(random(80)), 200] };
    }
  }

  update(players, projectiles, particles, game) {
    let p0 = players[0], p1 = players[1];
    let tgt = (dist(this.x, this.y, p0.x, p0.y) < dist(this.x, this.y, p1.x, p1.y)) ? p0 : p1;
    let a = atan2(tgt.y - this.y, tgt.x - this.x);

    if (this.tier === 2) { // Shooter
      let dd = dist(this.x, this.y, tgt.x, tgt.y);
      if (dd < 200) {
        this.vx -= cos(a) * this.spd * 0.12;
        this.vy -= sin(a) * this.spd * 0.12;
      } else if (dd > 350) {
        this.vx += cos(a) * this.spd * 0.1;
        this.vy += sin(a) * this.spd * 0.1;
      }
      this.shootCD--;
      if (this.shootCD <= 0 && dd < 450) {
        let ba = atan2(tgt.y - this.y, tgt.x - this.x);
        projectiles.push(new Projectile(this.x, this.y, cos(ba) * 5, sin(ba) * 5, 0, 80, this.col, 5, true, 8));
        this.shootCD = 70;
      }
    } else if (this.tier === 3) { // Dasher
      this.dashCD--;
      if (this.dashing) {
        this.dashTimer--;
        if (this.dashTimer <= 0) this.dashing = false;
      } else if (this.dashCD <= 0 && dist(this.x, this.y, tgt.x, tgt.y) < 300) {
        this.dashing = true; this.dashTimer = 15; this.dashCD = 120;
        this.vx = cos(a) * this.spd * 6; this.vy = sin(a) * this.spd * 6;
      } else {
        this.vx += cos(a) * this.spd * 0.1;
        this.vy += sin(a) * this.spd * 0.1;
      }
    } else if (this.tier === 5) { // Tank
      this.vx += cos(a) * this.spd * 0.08;
      this.vy += sin(a) * this.spd * 0.08;
      this.slamCD--;
      if (this.slamCD <= 0) {
        this.slamCD = 150;
        this.slamFlash = 15;
        for (let p of players) {
          if (dist(this.x, this.y, p.x, p.y) < 100) {
            p.hp -= 12;
            p.damageTimer = 15;
            let pa = atan2(p.y - this.y, p.x - this.x);
            p.vx += cos(pa) * 8; p.vy += sin(pa) * 8;
            game.shakeAmt = max(game.shakeAmt, 6);
          }
        }
        for (let k = 0; k < 12; k++) particles.push(new Particle(this.x, this.y, [255, 160, 60], 3));
      }
    } else { // Basic, Brute, Splitter
      this.vx += cos(a) * this.spd * 0.15;
      this.vy += sin(a) * this.spd * 0.15;
    }

    this.vx *= 0.95; this.vy *= 0.95;
    this.x += this.vx; this.y += this.vy;
    this.x = constrain(this.x, this.r, ARENA_W - this.r);
    this.y = constrain(this.y, this.r, ARENA_H - this.r);

    // Damage players on contact
    let contactDmg = this.tier === 3 && this.dashing ? 1.2 : (this.tier === 5 ? 0.5 : 0.3);
    for (let p of players) {
      if (dist(this.x, this.y, p.x, p.y) < this.r + p.r) {
        p.hp -= contactDmg;
        p.damageTimer = 15;
        let pushA = atan2(p.y - this.y, p.x - this.x);
        p.vx += cos(pushA) * 2; p.vy += sin(pushA) * 2;
      }
    }

    if (this.slamFlash > 0) this.slamFlash--;
  }

  draw() {
    let pulse = sin(frameCount * 0.08 + this.x * 0.01) * 0.1 + 1;
    fill(this.col[0], this.col[1], this.col[2], 20);
    circle(this.x, this.y, this.r * 3 * pulse);
    fill(0, 0, 0, 30);
    ellipse(this.x, this.y + this.r * 0.6, this.r * 2, this.r * 0.6);

    if (this.slamFlash > 0) {
      fill(255, 200, 100, this.slamFlash * 10);
      circle(this.x, this.y, 100 * (1 - this.slamFlash / 15));
    }

    fill(this.col[0], this.col[1], this.col[2]);
    push(); translate(this.x, this.y);
    if (this.tier === 1) { // Brute
      rotate(frameCount * 0.02);
      beginShape();
      for (let i = 0; i < 8; i++) {
        let a = TWO_PI / 8 * i;
        let rr = (i % 2 === 0) ? this.r * 1.3 : this.r * 0.8;
        vertex(cos(a) * rr, sin(a) * rr);
      }
      endShape(CLOSE);
    } else if (this.tier === 2) { // Shooter
      rotate(frameCount * 0.03);
      rectMode(CENTER);
      rect(0, 0, this.r * 1.8, this.r * 1.8, 4);
      fill(255, 255, 255, 100);
      rect(0, 0, this.r * 0.8, this.r * 0.8, 2);
    } else if (this.tier === 3) { // Dasher
      rotate(atan2(this.vy, this.vx) + PI / 2);
      if (this.dashing) scale(1, 1.5);
      triangle(-this.r, this.r, this.r, this.r, 0, -this.r * 1.5);
    } else if (this.tier === 4) { // Splitter
      for (let i = 0; i < 4; i++) {
        let a = frameCount * 0.05 + i * HALF_PI;
        circle(cos(a) * this.r * 0.4, sin(a) * this.r * 0.4, this.r * 1.2);
      }
    } else if (this.tier === 5) { // Tank
      rotate(frameCount * 0.01);
      beginShape();
      for (let i = 0; i < 8; i++) {
        let a = TWO_PI / 8 * i;
        vertex(cos(a) * this.r, sin(a) * this.r);
      }
      endShape(CLOSE);
      fill(0, 0, 0, 50);
      circle(0, 0, this.r * 0.6);
    } else { // Basic
      circle(0, 0, this.r * 2);
    }
    pop();

    fill(255, 255, 255, 200);
    let ex = this.x, ey = this.y - 2;
    if (this.tier === 5) ey = this.y - 4;
    circle(ex - 3, ey, 5); circle(ex + 3, ey, 5);
    fill(30);
    circle(ex - 3, ey, 2.5); circle(ex + 3, ey, 2.5);

    if (this.hp < this.maxHp) {
      let bw = this.r * 2.5;
      fill(40, 40, 40, 180); rect(this.x - bw / 2, this.y - this.r - 12, bw, 5, 2);
      fill(220, 60, 60); rect(this.x - bw / 2, this.y - this.r - 12, bw * (this.hp / this.maxHp), 5, 2);
    }
  }
}
