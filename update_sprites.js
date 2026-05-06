const fs = require('fs');

// Read sketch.js
let sketch = fs.readFileSync('sketch.js', 'utf8');

// Insert preload function if not exists
if (!sketch.includes('function preload()')) {
  const preloadCode = `
let imgGreenSlime, imgPinkSlime, imgEnemy, imgChain, imgFloor;

function preload() {
  imgGreenSlime = loadImage('assets/green_slime.png');
  imgPinkSlime = loadImage('assets/pink_slime.png');
  imgEnemy = loadImage('assets/enemy.png');
  imgChain = loadImage('assets/chain.png');
  imgFloor = loadImage('assets/floor.png');
}
`;
  sketch = preloadCode + sketch;
}

// Modify player initialization
sketch = sketch.replace('player1 = new Player(width / 4, height / 2, color(255, 100, 100));', 
                        'player1 = new Player(width / 4, height / 2, imgPinkSlime);');
sketch = sketch.replace('player2 = new Player((width / 4) * 3, height / 2, color(100, 100, 255));',
                        'player2 = new Player((width / 4) * 3, height / 2, imgGreenSlime);');

fs.writeFileSync('sketch.js', sketch);

// Read player.js
let player = fs.readFileSync('player.js', 'utf8');
player = player.replace('this.color = playerColor;', 'this.img = playerColor; this.frame = 0; this.frameTimer = 0;');
player = player.replace('fill(this.color);', 'fill(255); // not used');
player = player.replace('ellipse(this.x, this.y, this.size, this.size);\n    \n    // Draw a little "nose" so we know which way it could face\n    fill(0);\n    noStroke();\n    ellipse(this.x, this.y - this.size/4, this.size/4);', 
`// Sprite rendering
    let fw = this.img.height; // assuming square frames based on height
    let maxFrames = this.img.width / fw;
    this.frameTimer++;
    if (this.frameTimer > 5) {
      this.frame = (this.frame + 1) % maxFrames;
      this.frameTimer = 0;
    }
    imageMode(CENTER);
    image(this.img, this.x, this.y, this.size * 2, this.size * 2, this.frame * fw, 0, fw, fw);
`);
fs.writeFileSync('player.js', player);

// Read enemy.js
let enemy = fs.readFileSync('enemy.js', 'utf8');
enemy = enemy.replace('this.health = 3;', 'this.health = 3; this.frame = 0; this.frameTimer = 0;');
enemy = enemy.replace('fill(130, 0, 150);\n    stroke(255);\n    strokeWeight(1);\n    ellipse(this.x, this.y, this.size, this.size);\n    \n    // Angry eyes\n    fill(255, 50, 50);\n    noStroke();\n    ellipse(this.x - 5, this.y - 3, 6, 6);\n    ellipse(this.x + 5, this.y - 3, 6, 6);',
`// Render enemy sprite
    let fw = imgEnemy.height;
    let maxFrames = imgEnemy.width / fw;
    this.frameTimer++;
    if (this.frameTimer > 5) {
      this.frame = (this.frame + 1) % maxFrames;
      this.frameTimer = 0;
    }
    imageMode(CENTER);
    image(imgEnemy, this.x, this.y, this.size * 2, this.size * 2, this.frame * fw, 0, fw, fw);
`);
fs.writeFileSync('enemy.js', enemy);

console.log('done');
