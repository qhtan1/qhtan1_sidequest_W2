// Object representing a soft animated blob
let blob = {
  // Position of the blob (centre of the shape)
  x: 240,
  y: 160, // centre of the canvas

  // Base size and shape resolution
  r: 28, // Base radius of the blob
  points: 48, // Number of vertices around the circle (higher = smoother)

  // Shape deformation settings
  wobble: 8, // Maximum amount the edge can move in or out
  wobbleFreq: 0.8, // Controls how lumpy or smooth the blob looks

  // Time values for animation
  t: 0, // Time input for noise()
  tSpeed: 0.01, // How fast the blob "breathes"
};

// --- Small map objects ---
// These are props for the blob to interact with later
let objects = [];

function setup() {
  createCanvas(480, 320);
  noStroke();

  // Text settings for on-screen instructions
  textFont("sans-serif");
  textSize(14);

  // --- Create a small map of objects ---
  // We only draw them for now (no interaction yet)
  for (let i = 0; i < 12; i++) {
    objects.push(makeObject());
  }
}

function draw() {
  background(240);

  // --- Animate over time ---
  // Increment time so noise() changes smoothly every frame
  blob.t += blob.tSpeed;

  // --- Draw environment (small map) ---
  // A simple border makes the space feel contained
  drawWalls();

  // --- Draw objects (environment props) ---
  // These will become "mischief" targets later
  drawObjects();

  // --- Draw the blob ---
  // We draw a circle made of many points,
  // then push each point in or out using Perlin noise
  fill(20, 120, 255);
  beginShape();

  // Loop once around the circle
  for (let i = 0; i < blob.points; i++) {
    // Angle around the circle (0 → TAU)
    const a = (i / blob.points) * TAU;

    // Sample Perlin noise using:
    // - direction (cos/sin of angle)
    // - time (blob.t) for animation
    const n = noise(
      cos(a) * blob.wobbleFreq + 100,
      sin(a) * blob.wobbleFreq + 100,
      blob.t,
    );

    // Convert noise value (0–1) into a radius offset
    const r = blob.r + map(n, 0, 1, -blob.wobble, blob.wobble);

    // Convert polar coordinates (angle + radius)
    // into screen coordinates (x, y)
    vertex(blob.x + cos(a) * r, blob.y + sin(a) * r);
  }

  // Close the shape to form a solid blob
  endShape(CLOSE);

  // --- On-screen tip for experimentation ---
  fill(0);
  text("Commit 1: environment + objects (no interaction yet).", 10, 18);
}

// --- Environment: draw walls ---
function drawWalls() {
  // Simple border frame makes a small map
  fill(220);
  rect(0, 0, width, 10);
  rect(0, height - 10, width, 10);
  rect(0, 0, 10, height);
  rect(width - 10, 0, 10, height);
}

// --- Objects: spawn helper ---
function makeObject() {
  return {
    // Position on the map
    x: random(30, width - 30),
    y: random(30, height - 30),

    // Object size (used later for steal rules)
    r: random(8, 22),
  };
}

// --- Objects: draw helper ---
function drawObjects() {
  // Objects are simple dots for now
  fill(60);
  for (const o of objects) {
    ellipse(o.x, o.y, o.r * 2, o.r * 2);
  }
}
