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

  // --- Movement settings (panic v2) ---
  // This version refines the earlier panic to feel readable (not buggy)
  vx: 0, // Current velocity x
  vy: 0, // Current velocity y
  accel: 0.28, // Reduced accel so it doesn't look "teleporty"
  maxSpeed: 5.0, // Reduced top speed (Commit 2 was intentionally too high)
  fearRadius: 140, // How close the mouse must be to trigger panic
  jitter: 1.6, // Reduced shake (Commit 2 was intentionally too strong)
  damping: 0.92, // Gradual slowdown so it calms down when safe
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

  // --- Update blob movement (panic v2) ---
  // Mouse cursor acts like a "threat" the blob flees from
  updatePanicMotion();

  // --- Draw the blob ---
  // We draw a circle made of many points,
  // then push each point in or out using Perlin noise
  drawBlob();

  // --- On-screen tip for experimentation ---
  fill(0);
  text("Commit 3: refined panic (bounce + calmer tuning + face).", 10, 18);
  text(
    "Move mouse near blob: it flees and looks away from the threat.",
    10,
    36,
  );
}

// --- Helper: draw the blob shape (with panic readability) ---
function drawBlob() {
  // Compute fear once so visual + motion stay consistent
  const fear = getFearAmount();

  // Panic cue: breathing speeds up and outline gets more irregular
  const speedBoost = lerp(1.0, 2.6, fear);
  const wobbleBoost = lerp(1.0, 2.0, fear);

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
      blob.t * speedBoost, // Panic: time moves faster
    );

    // Convert noise value (0–1) into a radius offset
    const r =
      blob.r +
      map(n, 0, 1, -blob.wobble * wobbleBoost, blob.wobble * wobbleBoost);

    // Panic tremble: tiny shake in the outline itself
    const shake = (noise(i * 0.12, blob.t * 5) - 0.5) * 1.2 * fear;

    // Convert polar coordinates (angle + radius)
    // into screen coordinates (x, y)
    vertex(blob.x + cos(a) * (r + shake), blob.y + sin(a) * (r + shake));
  }

  // Close the shape to form a solid blob
  endShape(CLOSE);

  // Panic cue: a simple face that looks away from the mouse
  drawPanicFace(fear);
}

// --- Helper: panic face (eyes look away + jitter) ---
function drawPanicFace(fear) {
  // Direction away from mouse
  const dx = blob.x - mouseX;
  const dy = blob.y - mouseY;
  const d = max(0.0001, sqrt(dx * dx + dy * dy));

  // Pupils shift away from the threat (only noticeable when afraid)
  const lookX = (dx / d) * 6 * fear;
  const lookY = (dy / d) * 6 * fear;

  // Small jitter to sell fear
  const jx = (noise(1000, blob.t * 10) - 0.5) * 2.5 * fear;
  const jy = (noise(2000, blob.t * 10) - 0.5) * 2.5 * fear;

  // Eyes
  fill(255);
  ellipse(blob.x - 8 + jx, blob.y - 4 + jy, 9, 9);
  ellipse(blob.x + 8 + jx, blob.y - 4 + jy, 9, 9);

  // Pupils
  fill(0);
  ellipse(blob.x - 8 + lookX + jx, blob.y - 4 + lookY + jy, 4, 4);
  ellipse(blob.x + 8 + lookX + jx, blob.y - 4 + lookY + jy, 4, 4);

  // Mouth (a shaky arc)
  noFill();
  stroke(0);
  strokeWeight(2);
  arc(
    blob.x + jx,
    blob.y + 9 + jy,
    lerp(10, 16, fear),
    lerp(3, 8, fear),
    0,
    PI,
  );
  noStroke();
}

// --- Panic movement v2 ---
// Fixes the edge-sticking from Commit 2 by using bounce instead of constrain()
function updatePanicMotion() {
  // Compute fear so motion matches the visuals
  const fear = getFearAmount();

  // Apply damping so it calms down when safe
  blob.vx *= blob.damping;
  blob.vy *= blob.damping;

  // If afraid, accelerate away from the mouse
  if (fear > 0.001) {
    // Direction away from mouse
    const dx = blob.x - mouseX;
    const dy = blob.y - mouseY;
    const d = max(0.0001, sqrt(dx * dx + dy * dy));
    const nx = dx / d;
    const ny = dy / d;

    // Flee force (now tuned down vs Commit 2)
    blob.vx += nx * blob.accel * (1 + 2.2 * fear);
    blob.vy += ny * blob.accel * (1 + 2.2 * fear);

    // Add jitter as acceleration noise (still panicky, less chaotic)
    blob.vx += (noise(10, blob.t * 18) - 0.5) * blob.accel * 2.0 * fear;
    blob.vy += (noise(20, blob.t * 18) - 0.5) * blob.accel * 2.0 * fear;
  } else {
    // If not afraid, slowly drift using noise
    blob.vx += (noise(30, blob.t) - 0.5) * 0.05;
    blob.vy += (noise(40, blob.t) - 0.5) * 0.05;
  }

  // Cap speed (lower than Commit 2)
  const sp = sqrt(blob.vx * blob.vx + blob.vy * blob.vy);
  if (sp > blob.maxSpeed) {
    blob.vx = (blob.vx / sp) * blob.maxSpeed;
    blob.vy = (blob.vy / sp) * blob.maxSpeed;
  }

  // Apply movement + tremble
  blob.x += blob.vx;
  blob.y += blob.vy;

  // Panic shake on top of movement (now scaled more gently)
  blob.x += (noise(300, blob.t * 18) - 0.5) * blob.jitter * fear;
  blob.y += (noise(400, blob.t * 18) - 0.5) * blob.jitter * fear;

  // Keep inside the map bounds (walls) with bounce
  // Bounce reads as frantic + fixes edge-sticking
  const pad = 18;

  if (blob.x < pad) {
    blob.x = pad;
    blob.vx *= -0.85;
  }
  if (blob.x > width - pad) {
    blob.x = width - pad;
    blob.vx *= -0.85;
  }
  if (blob.y < pad) {
    blob.y = pad;
    blob.vy *= -0.85;
  }
  if (blob.y > height - pad) {
    blob.y = height - pad;
    blob.vy *= -0.85;
  }
}

// --- Helper: fear amount based on distance to mouse ---
function getFearAmount() {
  // Distance from blob to mouse
  const dx = blob.x - mouseX;
  const dy = blob.y - mouseY;
  const d = sqrt(dx * dx + dy * dy);

  // Convert distance into a 0..1 fear value
  const fear = constrain(1 - d / blob.fearRadius, 0, 1);

  // Ease it so it ramps smoothly
  return fear * fear;
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
