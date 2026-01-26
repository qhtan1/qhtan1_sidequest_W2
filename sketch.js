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
  // This version refines panic to feel readable (not buggy)
  vx: 0, // Current velocity x
  vy: 0, // Current velocity y
  accel: 0.28, // Flee acceleration
  maxSpeed: 5.0, // Top speed
  fearRadius: 140, // How close the mouse must be to trigger panic
  jitter: 1.6, // Screen-space shake when panicking
  damping: 0.92, // Gradual slowdown so it calms down when safe

  // --- Mischief tuning ---
  // The blob can bump objects, and sometimes steal smaller ones
  stealSize: 14, // Only objects smaller than this can be stolen
  stealChance: 0.12, // Intentionally a bit high (we will balance later)
};

// --- Small map objects ---
// These are props the blob can bump or steal
let objects = [];

// --- Simple score feedback ---
// Counts how many objects have been stolen
let score = 0;

function setup() {
  createCanvas(480, 320);
  noStroke();

  // Text settings for on-screen instructions
  textFont("sans-serif");
  textSize(14);

  // --- Create a small map of objects ---
  // Objects start as free props on the map
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

  // --- Update blob movement (panic) ---
  // Mouse cursor acts like a "threat" the blob flees from
  updatePanicMotion();

  // --- Mischief mechanic (v1) ---
  // Blob can bump objects, and may steal small ones
  updateMischief();

  // --- Draw objects ---
  // Draw after update so their positions reflect bumps/steals
  drawObjects();

  // --- Draw the blob ---
  // We draw a circle made of many points,
  // then push each point in or out using Perlin noise
  drawBlob();

  // --- On-screen tip for experimentation ---
  fill(0);
  text("Commit 4: mischief (bump + steal) + panic face fix.", 10, 18);
  text(
    "Mouse near blob = panic. Collide with dots = bump. Small dots may get stolen.",
    10,
    36,
  );
  text("Stolen: " + score, 10, 54);
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

// --- Helper: panic face (wide eyes + open mouth) ---
// Fix: Commit 3 face read as "too happy", so we adjust it to read as panic
function drawPanicFace(fear) {
  // Direction away from mouse
  const dx = blob.x - mouseX;
  const dy = blob.y - mouseY;
  const d = max(0.0001, sqrt(dx * dx + dy * dy));

  // Pupils shift away from the threat
  const lookX = (dx / d) * 6 * fear;
  const lookY = (dy / d) * 6 * fear;

  // Jitter increases with fear
  const jx = (noise(1000, blob.t * 10) - 0.5) * 3 * fear;
  const jy = (noise(2000, blob.t * 10) - 0.5) * 3 * fear;

  // Eyes (slightly larger under fear)
  fill(255);
  const eyeSize = lerp(9, 12, fear);
  ellipse(blob.x - 9 + jx, blob.y - 5 + jy, eyeSize, eyeSize);
  ellipse(blob.x + 9 + jx, blob.y - 5 + jy, eyeSize, eyeSize);

  // Pupils
  fill(0);
  ellipse(blob.x - 9 + lookX + jx, blob.y - 5 + lookY + jy, 4, 4);
  ellipse(blob.x + 9 + lookX + jx, blob.y - 5 + lookY + jy, 4, 4);

  // Mouth: open oval instead of smile
  // Open mouth reads as panic / gasp
  fill(0);
  const mouthW = lerp(6, 10, fear);
  const mouthH = lerp(4, 12, fear);
  ellipse(blob.x + jx, blob.y + 10 + jy, mouthW, mouthH);
}

// --- Panic movement ---
// Bounce keeps it from sticking to edges while still feeling frantic
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

    // Flee force
    blob.vx += nx * blob.accel * (1 + 2.2 * fear);
    blob.vy += ny * blob.accel * (1 + 2.2 * fear);

    // Add jitter as acceleration noise
    blob.vx += (noise(10, blob.t * 18) - 0.5) * blob.accel * 2.0 * fear;
    blob.vy += (noise(20, blob.t * 18) - 0.5) * blob.accel * 2.0 * fear;
  } else {
    // If not afraid, slowly drift using noise
    blob.vx += (noise(30, blob.t) - 0.5) * 0.05;
    blob.vy += (noise(40, blob.t) - 0.5) * 0.05;
  }

  // Cap speed
  const sp = sqrt(blob.vx * blob.vx + blob.vy * blob.vy);
  if (sp > blob.maxSpeed) {
    blob.vx = (blob.vx / sp) * blob.maxSpeed;
    blob.vy = (blob.vy / sp) * blob.maxSpeed;
  }

  // Apply movement + tremble
  blob.x += blob.vx;
  blob.y += blob.vy;

  // Panic shake on top of movement
  blob.x += (noise(300, blob.t * 18) - 0.5) * blob.jitter * fear;
  blob.y += (noise(400, blob.t * 18) - 0.5) * blob.jitter * fear;

  // Keep inside the map bounds (walls) with bounce
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

// --- Mischief mechanic (v1) ---
// The blob can bump objects away, and sometimes steal smaller ones
function updateMischief() {
  for (const o of objects) {
    // If already stolen, keep it attached to the blob
    if (o.stolen) {
      // Stolen objects orbit with a small wiggle
      o.offsetA += 0.04;
      const wiggle = (noise(o.offsetA * 2, blob.t * 4) - 0.5) * 6;

      o.x = blob.x + cos(o.offsetA) * (o.offsetD + wiggle);
      o.y = blob.y + sin(o.offsetA) * (o.offsetD + wiggle);
      continue;
    }

    // Check blob-object overlap
    const dx = o.x - blob.x;
    const dy = o.y - blob.y;
    const d = sqrt(dx * dx + dy * dy);

    // If colliding, bump it away and maybe steal it
    if (d < o.r + blob.r * 0.75) {
      // --- Bump: push objects away ---
      // Panic energy transfers into the environment
      const nx = dx / max(0.0001, d);
      const ny = dy / max(0.0001, d);

      // Add impulse
      o.vx += nx * 2.2 + blob.vx * 0.35;
      o.vy += ny * 2.2 + blob.vy * 0.35;

      // --- Steal: only for small objects ---
      // This is intentionally a bit generous; we balance later
      if (o.r < blob.stealSize && random() < blob.stealChance) {
        o.stolen = true;
        score += 1;
      }
    }

    // --- Basic object movement (so bumps are visible) ---
    // Objects drift + bounce off the walls
    o.x += o.vx;
    o.y += o.vy;

    // Light friction so they eventually slow down
    o.vx *= 0.96;
    o.vy *= 0.96;

    // Bounce off walls
    const pad = 20;
    if (o.x < pad) {
      o.x = pad;
      o.vx *= -0.9;
    }
    if (o.x > width - pad) {
      o.x = width - pad;
      o.vx *= -0.9;
    }
    if (o.y < pad) {
      o.y = pad;
      o.vy *= -0.9;
    }
    if (o.y > height - pad) {
      o.y = height - pad;
      o.vy *= -0.9;
    }
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

    // Object size
    r: random(8, 22),

    // Simple motion values (so bumps are visible)
    vx: random(-0.3, 0.3),
    vy: random(-0.3, 0.3),

    // Mischief state
    stolen: false, // If true, it sticks to the blob
    offsetA: random(TAU), // Offset angle if stolen (orbits)
    offsetD: random(12, 24), // Offset distance from blob centre
  };
}

// --- Objects: draw helper ---
function drawObjects() {
  for (const o of objects) {
    // Stolen objects get a highlight color cue
    if (o.stolen) {
      fill(255, 180, 0);
    } else {
      fill(60);
    }
    ellipse(o.x, o.y, o.r * 2, o.r * 2);
  }
}

// --- Optional: click to reset the map ---
// This helps testing the mischief system repeatedly
function mousePressed() {
  score = 0;
  objects = [];
  for (let i = 0; i < 12; i++) {
    objects.push(makeObject());
  }
}
