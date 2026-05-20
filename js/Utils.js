class Utils {
  static ptSegDist(px, py, ax, ay, bx, by) {
    let dx = bx - ax, dy = by - ay;
    let t = constrain(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    let cx = ax + t * dx, cy = ay + t * dy;
    return dist(px, py, cx, cy);
  }

  static mkPart(x, y, col, r) {
    return new Particle(x, y, col, r);
  }
}
