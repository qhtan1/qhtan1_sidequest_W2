// Object representing a soft animated blob
let blob = {
  // Position of the blob (centre of the shape)
  x: 240,
  y: 160,

  // Base size and shape resolution
  r: 28,
  points: 48,

  // Shape deformation settings
  wobble: 8,
  wobbleFreq: 0.8,

  // Time values for animation
  t: 0,
  tSpeed: 0.01,

  // --- Panic movement tuning ---
  vx: 0,
  vy: 0,
  accel: 0.28,
  maxSpeed: 5.0,
  fearRadius: 140,
  jitter: 1.4, // Commit 5: slightly calmer shake
  damping: 0.92,

  // --- Mischief tuning (balanced) ---
  stealSize: 14,
  stealChance: 0.06, // Commit 5: reduced for better pacing
};

// --- Small map objects ---
let objects = [];
let score = 0;

function setup() {
  createCanvas(480, 320);
  noStroke();
  textFont("sans-serif");
  textSize(14);

  for (let i = 0; i < 12; i++) {
    objects.push(makeObject());
  }
}

function draw() {
  background(240);

  blob.t += blob.tSpeed;

  drawWalls();
  updatePanicMotion();
  updateMischief();
  drawObjects();
  drawBlob();

  // --- Final on-screen guidance (GitHub Pages friendly) ---
  fill(0);
  text("Panic Blob — move mouse near to scare it.", 10, 18);
  text("Bump dots to push them. Small dots may be stolen.", 10, 36);
  text("Stolen objects: " + score, 10, 54);
}

// --- Draw blob with panic readability ---
function drawBlob() {
  const fear = getFearAmount();
  const speedBoost = lerp(1.0, 2.4, fear);
  const wobbleBoost = lerp(1.0, 1.9, fear);

  fill(20, 120, 255);
  beginShape();

  for (let i = 0; i < blob.points; i++) {
    const a = (i / blob.points) * TAU;
    const n = noise(
      cos(a) * blob.wobbleFreq + 100,
      sin(a) * blob.wobbleFreq + 100,
      blob.t * speedBoost,
    );

    const r =
      blob.r +
      map(n, 0, 1, -blob.wobble * wobbleBoost, blob.wobble * wobbleBoost);

    const shake = (noise(i * 0.12, blob.t * 5) - 0.5) * 1.1 * fear;

    vertex(blob.x + cos(a) * (r + shake), blob.y + sin(a) * (r + shake));
  }

  endShape(CLOSE);
  drawPanicFace(fear);
}

// --- Panic face (final tuned version) ---
function drawPanicFace(fear) {
  const dx = blob.x - mouseX;
  const dy = blob.y - mouseY;
  const d = max(0.0001, sqrt(dx * dx + dy * dy));

  const lookX = (dx / d) * 6 * fear;
  const lookY = (dy / d) * 6 * fear;

  const jx = (noise(1000, blob.t * 10) - 0.5) * 2.5 * fear;
  const jy = (noise(2000, blob.t * 10) - 0.5) * 2.5 * fear;

  fill(255);
  const eyeSize = lerp(9, 12, fear);
  ellipse(blob.x - 9 + jx, blob.y - 5 + jy, eyeSize, eyeSize);
  ellipse(blob.x + 9 + jx, blob.y - 5 + jy, eyeSize, eyeSize);

  fill(0);
  ellipse(blob.x - 9 + lookX + jx, blob.y - 5 + lookY + jy, 4, 4);
  ellipse(blob.x + 9 + lookX + jx, blob.y - 5 + lookY + jy, 4, 4);

  // Commit 5: mouth slightly shrinks when calmer
  const mouthW = lerp(6, 9, fear);
  const mouthH = lerp(4, 10, fear);
  ellipse(blob.x + jx, blob.y + 10 + jy, mouthW, mouthH);
}

// --- Panic movement ---
function updatePanicMotion() {
  const fear = getFearAmount();
  blob.vx *= blob.damping;
  blob.vy *= blob.damping;

  if (fear > 0.001) {
    const dx = blob.x - mouseX;
    const dy = blob.y - mouseY;
    const d = max(0.0001, sqrt(dx * dx + dy * dy));
    const nx = dx / d;
    const ny = dy / d;

    blob.vx += nx * blob.accel * (1 + 2.1 * fear);
    blob.vy += ny * blob.accel * (1 + 2.1 * fear);
  }

  const sp = sqrt(blob.vx * blob.vx + blob.vy * blob.vy);
  if (sp > blob.maxSpeed) {
    blob.vx = (blob.vx / sp) * blob.maxSpeed;
    blob.vy = (blob.vy / sp) * blob.maxSpeed;
  }

  blob.x += blob.vx;
  blob.y += blob.vy;

  blob.x += (noise(300, blob.t * 18) - 0.5) * blob.jitter * fear;
  blob.y += (noise(400, blob.t * 18) - 0.5) * blob.jitter * fear;

  const pad = 18;
  if (blob.x < pad || blob.x > width - pad) blob.vx *= -0.85;
  if (blob.y < pad || blob.y > height - pad) blob.vy *= -0.85;

  blob.x = constrain(blob.x, pad, width - pad);
  blob.y = constrain(blob.y, pad, height - pad);
}

// --- Mischief mechanic (balanced) ---
function updateMischief() {
  for (const o of objects) {
    if (o.stolen) {
      o.life -= 1; // Commit 5: stolen objects eventually fall off

      o.offsetA += 0.04;
      o.x = blob.x + cos(o.offsetA) * o.offsetD;
      o.y = blob.y + sin(o.offsetA) * o.offsetD;

      if (o.life <= 0) {
        o.stolen = false;
        o.vx = random(-1, 1);
        o.vy = random(-1, 1);
      }
      continue;
    }

    const dx = o.x - blob.x;
    const dy = o.y - blob.y;
    const d = sqrt(dx * dx + dy * dy);

    if (d < o.r + blob.r * 0.75) {
      const nx = dx / max(0.0001, d);
      const ny = dy / max(0.0001, d);

      o.vx += nx * 2 + blob.vx * 0.3;
      o.vy += ny * 2 + blob.vy * 0.3;

      if (o.r < blob.stealSize && random() < blob.stealChance) {
        o.stolen = true;
        o.life = int(random(180, 300)); // Commit 5: limited steal duration
        score += 1;
      }
    }

    o.x += o.vx;
    o.y += o.vy;
    o.vx *= 0.95;
    o.vy *= 0.95;
  }
}

// --- Helpers ---
function getFearAmount() {
  const dx = blob.x - mouseX;
  const dy = blob.y - mouseY;
  const d = sqrt(dx * dx + dy * dy);
  const fear = constrain(1 - d / blob.fearRadius, 0, 1);
  return fear * fear;
}

function drawWalls() {
  fill(220);
  rect(0, 0, width, 10);
  rect(0, height - 10, width, 10);
  rect(0, 0, 10, height);
  rect(width - 10, 0, 10, height);
}

function makeObject() {
  return {
    x: random(30, width - 30),
    y: random(30, height - 30),
    r: random(8, 22),
    vx: random(-0.3, 0.3),
    vy: random(-0.3, 0.3),
    stolen: false,
    offsetA: random(TAU),
    offsetD: random(14, 24),
    life: 0,
  };
}

function drawObjects() {
  for (const o of objects) {
    fill(o.stolen ? color(255, 180, 0) : 60);
    ellipse(o.x, o.y, o.r * 2, o.r * 2);
  }
}
