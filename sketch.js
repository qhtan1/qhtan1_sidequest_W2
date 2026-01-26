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

  // --- Movement settings (panic v1) ---
  // Panic is expressed with fast fleeing + jitter
  vx: 0, // Current velocity x
  vy: 0, // Current velocity y
  accel: 0.35, // How quickly it accelerates away (intentionally strong)
  maxSpeed: 7.5, // Top speed (intentionally high for this commit)
  fearRadius: 140, // How close the mouse must be to trigger panic
  jitter: 2.2, // Screen-space shake when panicking
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

  // --- Update blob movement (panic v1) ---
  // Mouse cursor acts like a "threat" the blob flees from
  updatePanicMotion();

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
  text(
    "Commit 2: panic movement (mouse = threat). Expect rough edges.",
    10,
    18,
  );
  text("Move mouse near blob to trigger fleeing + shaking.", 10, 36);
}

// --- Panic movement v1 ---
// This version is intentionally a bit too intense (we will refine next commit)
function updatePanicMotion() {
  // Distance from blob to mouse
  const dx = blob.x - mouseX;
  const dy = blob.y - mouseY;
  const d = sqrt(dx * dx + dy * dy);

  // Convert distance into a 0..1 fear value
  // Inside fearRadius => fear approaches 1
  const fear = constrain(1 - d / blob.fearRadius, 0, 1);

  // If afraid, accelerate away from the mouse
  if (fear > 0.001) {
    // Normalized direction away from mouse
    const nx = dx / max(0.0001, d);
    const ny = dy / max(0.0001, d);

    // Strong flee force (intentionally aggressive)
    blob.vx += nx * blob.accel * (1 + 3 * fear);
    blob.vy += ny * blob.accel * (1 + 3 * fear);

    // Add random-ish jitter to make it look panicked
    blob.vx += (noise(10, blob.t * 20) - 0.5) * blob.accel * 3 * fear;
    blob.vy += (noise(20, blob.t * 20) - 0.5) * blob.accel * 3 * fear;
  } else {
    // If not afraid, slowly drift using noise
    blob.vx += (noise(30, blob.t) - 0.5) * 0.06;
    blob.vy += (noise(40, blob.t) - 0.5) * 0.06;
  }

  // Cap speed (intentionally high in this commit)
  const sp = sqrt(blob.vx * blob.vx + blob.vy * blob.vy);
  if (sp > blob.maxSpeed) {
    blob.vx = (blob.vx / sp) * blob.maxSpeed;
    blob.vy = (blob.vy / sp) * blob.maxSpeed;
  }

  // Apply movement
  blob.x += blob.vx;
  blob.y += blob.vy;

  // Panic shake on top of movement (screen-space tremble)
  // This makes it feel frantic but may look too strong (fixed next commit)
  blob.x += (noise(300, blob.t * 18) - 0.5) * blob.jitter * fear;
  blob.y += (noise(400, blob.t * 18) - 0.5) * blob.jitter * fear;

  // Keep inside the map bounds (walls)
  // NOTE: This is intentionally a bit naive; it can "stick" near edges
  const pad = 18;
  blob.x = constrain(blob.x, pad, width - pad);
  blob.y = constrain(blob.y, pad, height - pad);
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
