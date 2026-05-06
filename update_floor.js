const fs = require('fs');
let sketch = fs.readFileSync('sketch.js', 'utf8');
sketch = sketch.replace('background(50, 150, 80);', 
`// Draw floor
  for (let x = 0; x < width; x += imgFloor.width) {
    for (let y = 0; y < height; y += imgFloor.height) {
      imageMode(CORNER);
      image(imgFloor, x, y);
    }
  }`);
fs.writeFileSync('sketch.js', sketch);
