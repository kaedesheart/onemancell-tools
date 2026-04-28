// ===== Canvas / DPR =====
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ===== Game settings =====
const MAX_STAGES = 6;
const BEST_KEY = 'omc-swingby-best';

// ===== State =====
const state = {
  running: false,
  stageNum: 1,
  totalShots: 0,
  demoUsed: false,
  watchMode: false,
  currentDef: null,
  player: { x: 0, y: 0, r: 14, angle: -Math.PI / 2 },
  planets: [],
  targets: [],
  stars: [],
  bullets: [],
  input: { left: false, right: false, rotL: false, rotR: false },
  flash: 0,
  lockInput: false,
};

// ===== Physics constants =====
const G = 80000;
const BULLET_SPEED = 380;
const BULLET_LIFE = 7;
const TARGET_R = 13;
const MOVE_SPEED = 230;
const ROT_SPEED  = 1.6;
const PLAYER_BOTTOM_OFFSET = 130;

function makeStars(n) {
  const stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.7 + 0.2,
    });
  }
  return stars;
}

// タイトル画面用の背景（state・makeStars定義後に呼ぶ）
function initTitleBg() {
  state.stars = makeStars(150);
  state.planets = [
    { x: W * 0.10, y: H * 0.22, r: 38, mass: 2280, color: '#7CC8E8' },
    { x: W * 0.88, y: H * 0.68, r: 30, mass: 1800, color: '#C99BFF' },
    { x: W * 0.72, y: H * 0.10, r: 20, mass: 1200, color: '#FFB270' },
  ];
}
initTitleBg();

// ===== Stage =====
function applyStage(ratioDef) {
  state.currentDef = ratioDef;
  state.player.x = ratioDef.player.x * W;
  state.player.y = Math.min(ratioDef.player.y * H, H - PLAYER_BOTTOM_OFFSET);
  state.player.angle = -Math.PI / 2;
  state.planets = ratioDef.planets.map(p => ({
    x: p.x * W, y: p.y * H, r: p.r, mass: p.mass, color: p.color,
  }));
  state.targets = ratioDef.targets.map(t => ({
    x: t.x * W, y: t.y * H, r: TARGET_R, hit: false,
  }));
  state.bullets = [];
  state.stars = makeStars(120);
  updateHUD();
}

function expandRatio(ratioDef) {
  return {
    player: { x: ratioDef.player.x * W, y: Math.min(ratioDef.player.y * H, H - PLAYER_BOTTOM_OFFSET) },
    planets: ratioDef.planets.map(p => ({
      x: p.x * W, y: p.y * H, r: p.r, mass: p.mass, color: p.color,
    })),
    targets: ratioDef.targets.map(t => ({ x: t.x * W, y: t.y * H })),
  };
}

// ===== Random stage generation =====
const PALETTE = ['#7CC8E8', '#FFB270', '#C99BFF', '#9FE6A0', '#FF9CAB'];
const rnd = (a, b) => a + Math.random() * (b - a);
const choice = arr => arr[Math.floor(Math.random() * arr.length)];

function randomRatioStage() {
  const player = { x: rnd(0.25, 0.75), y: 0.85 };
  const playerPx = { x: player.x * W, y: player.y * H };

  const planets = [];
  for (let i = 0; planets.length < 2 && i < 80; i++) {
    const r = rnd(20, 38);
    const cand = {
      x: rnd(0.15, 0.85),
      y: rnd(0.18, 0.62),
      r, mass: r * 60,
      color: choice(PALETTE),
    };
    let ok = true;
    for (const p of planets) {
      const dx = (cand.x - p.x) * W, dy = (cand.y - p.y) * H;
      if (Math.hypot(dx, dy) < cand.r + p.r + 36) { ok = false; break; }
    }
    if (ok) {
      const dx = (cand.x * W) - playerPx.x, dy = (cand.y * H) - playerPx.y;
      if (Math.hypot(dx, dy) < cand.r + 90) ok = false;
    }
    if (ok) planets.push(cand);
  }
  if (planets.length < 2) return null;

  const targets = [];
  for (let i = 0; targets.length < 2 && i < 100; i++) {
    const cand = { x: rnd(0.10, 0.90), y: rnd(0.10, 0.65) };
    let ok = true;
    for (const p of planets) {
      const dx = (cand.x - p.x) * W, dy = (cand.y - p.y) * H;
      if (Math.hypot(dx, dy) < p.r + 30) { ok = false; break; }
    }
    if (ok) {
      const dx = (cand.x * W) - playerPx.x, dy = (cand.y * H) - playerPx.y;
      if (Math.hypot(dx, dy) < 110) ok = false;
    }
    for (const t of targets) {
      const dx = (cand.x - t.x) * W, dy = (cand.y - t.y) * H;
      if (Math.hypot(dx, dy) < 90) { ok = false; break; }
    }
    if (ok) targets.push(cand);
  }
  if (targets.length < 2) return null;

  return { player, planets, targets };
}

// ある (px, angle) で発射した弾が両方の的を当てるかをシミュレート
function simulateHitsAll(absDef, px, py, angle) {
  const winMask = (1 << absDef.targets.length) - 1;
  const playerR = 14;
  const dt = 1 / 60;
  const maxSteps = Math.floor(60 * BULLET_LIFE);
  const nx = Math.cos(angle), ny = Math.sin(angle);
  let x = px + nx * (playerR + 6);
  let y = py + ny * (playerR + 6);
  let vx = nx * BULLET_SPEED;
  let vy = ny * BULLET_SPEED;
  let hitMask = 0;
  for (let s = 0; s < maxSteps; s++) {
    let ax = 0, ay = 0;
    for (const p of absDef.planets) {
      const dx = p.x - x, dy = p.y - y;
      const r = Math.hypot(dx, dy);
      const safeR = Math.max(r, p.r * 0.6);
      const inv3 = 1 / (safeR * safeR * safeR);
      const a = G * p.mass * inv3;
      ax += a * dx; ay += a * dy;
    }
    vx += ax * dt; vy += ay * dt;
    x  += vx * dt; y  += vy * dt;
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return false;
    for (const p of absDef.planets) {
      const dx = x - p.x, dy = y - p.y;
      if (dx * dx + dy * dy < p.r * p.r) return false;
    }
    for (let i = 0; i < absDef.targets.length; i++) {
      if (hitMask & (1 << i)) continue;
      const t = absDef.targets[i];
      const dx = x - t.x, dy = y - t.y;
      const rr = TARGET_R + 4;
      if (dx * dx + dy * dy < rr * rr) hitMask |= (1 << i);
    }
    if (hitMask === winMask) return true;
  }
  return false;
}

// 横20分割 × 30度刻み(12方向) で全探索、2解以上で「程よい難度」と判定
function isSolvable(absDef) {
  const STEPS_X = 20, STEPS_ANGLE = 12, REQUIRED = 2;
  const py = absDef.player.y;
  let count = 0;
  for (let xi = 0; xi < STEPS_X; xi++) {
    const px = 40 + ((W - 80) * xi) / (STEPS_X - 1);
    for (let ai = 0; ai < STEPS_ANGLE; ai++) {
      const angle = (ai * 2 * Math.PI) / STEPS_ANGLE;
      if (simulateHitsAll(absDef, px, py, angle)) {
        count++;
        if (count >= REQUIRED) return true;
      }
    }
  }
  return false;
}

function easyFallback() {
  return {
    player: { x: 0.5, y: 0.85 },
    planets: [
      { x: 0.18, y: 0.55, r: 20, mass: 600, color: '#7CC8E8' },
      { x: 0.82, y: 0.55, r: 20, mass: 600, color: '#FFB270' },
    ],
    targets: [
      { x: 0.50, y: 0.55 },
      { x: 0.50, y: 0.25 },
    ],
  };
}

function generateSolvableStage() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const ratioDef = randomRatioStage();
    if (!ratioDef) continue;
    if (isSolvable(expandRatio(ratioDef))) return ratioDef;
  }
  return easyFallback();
}

// 現在位置に最も近い解を探す（お手本プレイ用）
function findNearestSolution(absDef, currentPx) {
  const STEPS_X = 20, STEPS_ANGLE = 12;
  const py = absDef.player.y;
  let best = null, bestDist = Infinity;
  for (let xi = 0; xi < STEPS_X; xi++) {
    const px = 40 + ((W - 80) * xi) / (STEPS_X - 1);
    for (let ai = 0; ai < STEPS_ANGLE; ai++) {
      const angle = (ai * 2 * Math.PI) / STEPS_ANGLE;
      if (simulateHitsAll(absDef, px, py, angle)) {
        const dist = Math.abs(px - currentPx);
        if (dist < bestDist) {
          best = { px, angle };
          bestDist = dist;
        }
      }
    }
  }
  return best;
}

// ===== Demo (お手本プレイ) =====
const demo = { active: false, targetPx: 0, targetAngle: 0 };

function startDemo() {
  if (!state.running || state.lockInput || demo.active || bulletInFlight()) return;
  if (!state.currentDef) return;
  const sol = findNearestSolution(expandRatio(state.currentDef), state.player.x);
  if (!sol) {
    if (state.watchMode) {
      // 解が見つからないステージは飛ばして次へ
      setTimeout(() => {
        if (!state.watchMode || !state.running) return;
        state.stageNum++;
        applyStage(generateSolvableStage());
        setTimeout(() => { if (state.watchMode && state.running) startDemo(); }, 700);
      }, 500);
      return;
    }
    showResult('miss', '解が見つかりません', '', 1200);
    return;
  }
  state.demoUsed = true;
  updateHUD();

  for (const t of state.targets) t.hit = false;
  state.bullets = [];

  demo.active = true;
  demo.targetPx = sol.px;
  demo.targetAngle = sol.angle;
  state.lockInput = true;
  state.input.left = state.input.right = state.input.rotL = state.input.rotR = false;
  document.querySelectorAll('.ctrl-btn').forEach(b => b.classList.remove('active'));
  updateFireBtnState();
}

function applyDemo(dt) {
  const p = state.player;
  const dx = demo.targetPx - p.x;
  if (dx !== 0) {
    const move = MOVE_SPEED * dt;
    if (Math.abs(dx) <= move) p.x = demo.targetPx;
    else p.x += Math.sign(dx) * move;
  }
  let da = demo.targetAngle - p.angle;
  while (da >  Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  if (da !== 0) {
    const rot = ROT_SPEED * dt;
    if (Math.abs(da) <= rot) p.angle = demo.targetAngle;
    else p.angle += Math.sign(da) * rot;
  }
  // 両方 exact 一致したら発射 → シミュレータと完全一致した軌道に
  if (p.x === demo.targetPx && p.angle === demo.targetAngle) {
    demo.active = false;
    state.lockInput = false;
    setTimeout(() => fire(), 220);
  }
}

function applyInput(dt) {
  const p = state.player;
  if (state.input.left)  p.x -= MOVE_SPEED * dt;
  if (state.input.right) p.x += MOVE_SPEED * dt;
  if (state.input.rotL)  p.angle -= ROT_SPEED * dt;
  if (state.input.rotR)  p.angle += ROT_SPEED * dt;
  p.x = Math.max(40, Math.min(W - 40, p.x));
}

// ===== HUD =====
function updateHUD() {
  document.getElementById('stage-num').textContent = state.stageNum + '/' + MAX_STAGES;
  const shots = state.totalShots;
  document.getElementById('shots-count').textContent = state.demoUsed ? (shots + ' ✗') : shots;
  if (typeof updateFireBtnState === 'function') updateFireBtnState();
}

function getBestRecord() {
  const v = localStorage.getItem(BEST_KEY);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
function saveBestRecord(n) {
  localStorage.setItem(BEST_KEY, String(n));
}

function bulletInFlight() { return state.bullets.length > 0; }
function allCleared() { return state.targets.length > 0 && state.targets.every(t => t.hit); }

// ===== Physics =====
function gravityAt(x, y) {
  let ax = 0, ay = 0;
  for (const p of state.planets) {
    const dx = p.x - x;
    const dy = p.y - y;
    const r = Math.hypot(dx, dy);
    const safeR = Math.max(r, p.r * 0.6);
    const inv3 = 1 / (safeR * safeR * safeR);
    const a = G * p.mass * inv3;
    ax += a * dx;
    ay += a * dy;
  }
  return { ax, ay };
}

function fire() {
  if (!state.running || state.lockInput || bulletInFlight()) return;
  const p = state.player;
  const nx = Math.cos(p.angle);
  const ny = Math.sin(p.angle);
  state.bullets.push({
    x: p.x + nx * (p.r + 6),
    y: p.y + ny * (p.r + 6),
    vx: nx * BULLET_SPEED,
    vy: ny * BULLET_SPEED,
    life: BULLET_LIFE,
    trail: [],
  });
  state.totalShots++;
  updateHUD();
  updateFireBtnState();
}

function endShotFailed() {
  state.bullets = [];
  state.flash = 0.6;
  for (const t of state.targets) t.hit = false;
  updateHUD();
  if (state.watchMode) {
    // 観るだけモード中は自動リトライ
    setTimeout(() => { if (state.watchMode && state.running) startDemo(); }, 1200);
    return;
  }
  showResult('miss', 'もう一度', '惑星に当たった or 外れた');
}

function endShotCleared() {
  state.bullets = [];
  state.lockInput = true;

  if (state.watchMode) {
    showResult('clear', 'CLEAR', '', 700);
    setTimeout(() => {
      state.stageNum++;
      applyStage(generateSolvableStage());
      state.lockInput = false;
      hideResult();
      updateHUD();
      setTimeout(() => {
        if (state.watchMode && state.running) startDemo();
      }, 700);
    }, 800);
    return;
  }

  const isLastStage = state.stageNum >= MAX_STAGES;
  if (isLastStage) {
    showResult('clear', 'ALL CLEAR!', '', 1300);
    setTimeout(() => {
      hideResult();
      showEndScreen();
    }, 1400);
  } else {
    showResult('clear', 'STAGE CLEAR', '次のステージへ', 1100);
    setTimeout(() => {
      state.stageNum++;
      applyStage(generateSolvableStage());
      state.lockInput = false;
      hideResult();
      updateFireBtnState();
    }, 1200);
  }
}

function updateBullets(dt) {
  const startedWithBullets = state.bullets.length > 0;
  let immediateClear = false;

  for (const b of state.bullets) {
    if (immediateClear) break;
    const g = gravityAt(b.x, b.y);
    b.vx += g.ax * dt;
    b.vy += g.ay * dt;
    b.x  += b.vx * dt;
    b.y  += b.vy * dt;
    b.life -= dt;
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 28) b.trail.shift();

    for (const t of state.targets) {
      if (t.hit) continue;
      const dx = b.x - t.x, dy = b.y - t.y;
      const rr = t.r + 4;
      if (dx * dx + dy * dy < rr * rr) {
        t.hit = true;
        if (allCleared()) { immediateClear = true; break; }
      }
    }
  }

  if (immediateClear) {
    state.bullets = [];
    if (state.running && !state.lockInput) {
      endShotCleared();
      updateFireBtnState();
    }
    return;
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    const offBounds = b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60;
    let hitPlanet = false;
    for (const p of state.planets) {
      const dx = b.x - p.x, dy = b.y - p.y;
      if (dx * dx + dy * dy < p.r * p.r) { hitPlanet = true; break; }
    }
    if (b.life <= 0 || offBounds || hitPlanet) {
      state.bullets.splice(i, 1);
    }
  }

  if (startedWithBullets && state.bullets.length === 0 && state.running && !state.lockInput) {
    if (allCleared()) endShotCleared();
    else endShotFailed();
    updateFireBtnState();
  }
}

function predictPath() {
  const p = state.player;
  const nx = Math.cos(p.angle);
  const ny = Math.sin(p.angle);
  let x = p.x + nx * (p.r + 6);
  let y = p.y + ny * (p.r + 6);
  let vx = nx * BULLET_SPEED;
  let vy = ny * BULLET_SPEED;
  const path = [];
  const sub = 1 / 60;
  for (let i = 0; i < 110; i++) {
    const g = gravityAt(x, y);
    vx += g.ax * sub;
    vy += g.ay * sub;
    x  += vx * sub;
    y  += vy * sub;
    if (x < 0 || x > W || y < 0 || y > H) break;
    let hit = false;
    for (const pl of state.planets) {
      const ddx = x - pl.x, ddy = y - pl.y;
      if (ddx * ddx + ddy * ddy < pl.r * pl.r) { hit = true; break; }
    }
    if (hit) break;
    if (i % 2 === 0) path.push({ x, y });
  }
  return path;
}

// ===== Render =====
function drawStars() {
  ctx.save();
  for (const s of state.stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = '#E8ECF8';
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlanet(p) {
  ctx.save();
  const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.8, p.x, p.y, p.r * 4);
  grad.addColorStop(0, p.color + '55');
  grad.addColorStop(1, p.color + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createRadialGradient(
    p.x - p.r * 0.4, p.y - p.r * 0.4, p.r * 0.2,
    p.x, p.y, p.r
  );
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.4, p.color);
  body.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#FFD178';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.r, 0);
  ctx.lineTo(-p.r * 0.8, p.r * 0.65);
  ctx.lineTo(-p.r * 0.4, 0);
  ctx.lineTo(-p.r * 0.8, -p.r * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7CC8E8';
  ctx.beginPath();
  ctx.arc(0, 0, p.r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAimLine(path) {
  if (!path.length || bulletInFlight()) return;
  ctx.save();
  for (let i = 0; i < path.length; i++) {
    const t = 1 - i / path.length;
    ctx.globalAlpha = t * 0.55;
    ctx.fillStyle = '#FFD178';
    ctx.beginPath();
    ctx.arc(path[i].x, path[i].y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTarget(t, time) {
  ctx.save();
  if (t.hit) {
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#FFD178';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const pulse = 1 + Math.sin(time * 4) * 0.08;
    const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r * 2.4);
    grad.addColorStop(0, 'rgba(255, 230, 150, 0.55)');
    grad.addColorStop(1, 'rgba(255, 209, 120, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFE7A5';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBullet(b) {
  ctx.save();
  for (let i = 0; i < b.trail.length; i++) {
    const t = i / b.trail.length;
    ctx.globalAlpha = t * 0.55;
    ctx.fillStyle = '#FFD178';
    const tp = b.trail[i];
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, 1.5 + t * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 9);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.4, '#FFD178');
  grad.addColorStop(1, 'rgba(255,209,120,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render(time) {
  ctx.clearRect(0, 0, W, H);
  if (state.flash > 0) {
    ctx.fillStyle = 'rgba(240, 138, 138,' + Math.min(0.25, state.flash * 0.4) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  drawStars();
  for (const p of state.planets) drawPlanet(p);
  for (const t of state.targets) drawTarget(t, time);
  if (state.running) {
    drawAimLine(predictPath());
    for (const b of state.bullets) drawBullet(b);
    drawPlayer(state.player);
  }
}

// ===== Game loop =====
// 物理は固定タイムステップ(1/60秒)で更新 → 軌道が決定論的になる
const FIXED_DT = 1 / 60;
let last = 0;
let physicsAccum = 0;
function loop(ts) {
  const frameDt = last === 0 ? 0 : Math.min(0.1, (ts - last) / 1000);
  last = ts;
  if (state.running) {
    physicsAccum += frameDt;
    if (physicsAccum > FIXED_DT * 6) physicsAccum = FIXED_DT * 6;
    while (physicsAccum >= FIXED_DT) {
      physicsAccum -= FIXED_DT;
      if (demo.active) applyDemo(FIXED_DT);
      else if (!state.lockInput) applyInput(FIXED_DT);
      updateBullets(FIXED_DT);
    }
    state.flash = Math.max(0, state.flash - frameDt);
  }
  render(ts / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ===== Result overlay =====
const resultOverlay = document.getElementById('result-overlay');
const resultTitle = document.getElementById('result-title');
const resultSub = document.getElementById('result-sub');
function showResult(kind, title, sub, ms) {
  resultTitle.textContent = title;
  resultSub.textContent = sub || '';
  resultTitle.style.color = kind === 'clear' ? '#FFD178' : '#F08A8A';
  resultOverlay.classList.remove('hidden');
  resultOverlay.classList.add('show');
  clearTimeout(showResult._t);
  showResult._t = setTimeout(hideResult, ms || 900);
}
function hideResult() {
  resultOverlay.classList.remove('show');
  resultOverlay.classList.add('hidden');
}

// ===== Input =====
const fireBtn = document.getElementById('fire-btn');
function updateFireBtnState() {
  fireBtn.disabled = !state.running || state.lockInput || bulletInFlight();
}

function bindHold(btn, key) {
  const press = (e) => {
    e.preventDefault();
    if (state.lockInput || demo.active || state.watchMode) return;
    state.input[key] = true;
    btn.classList.add('active');
    if (e.pointerId != null) btn.setPointerCapture?.(e.pointerId);
  };
  const release = () => {
    state.input[key] = false;
    btn.classList.remove('active');
  };
  btn.addEventListener('pointerdown', press);
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('pointerleave', release);
  btn.addEventListener('lostpointercapture', release);
}
document.querySelectorAll('[data-input]').forEach(btn => {
  bindHold(btn, btn.dataset.input);
});

fireBtn.addEventListener('click', () => fire());

const KEY_MAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  q: 'rotL', Q: 'rotL',
  e: 'rotR', E: 'rotR',
};
window.addEventListener('keydown', e => {
  if (state.lockInput || demo.active || state.watchMode) return;
  if (KEY_MAP[e.key]) { state.input[KEY_MAP[e.key]] = true; e.preventDefault(); }
  else if (e.key === ' ' || e.key === 'Enter') { fire(); e.preventDefault(); }
});
window.addEventListener('keyup', e => {
  if (KEY_MAP[e.key]) { state.input[KEY_MAP[e.key]] = false; e.preventDefault(); }
});

// ===== Start / End =====
const overlay = document.getElementById('overlay');
const overlaySub = document.getElementById('overlay-sub');
const overlayHint = document.getElementById('hint-text');
const overlayBest = document.getElementById('best-display');
const overlayBestVal = document.getElementById('best-val');
const overlayTitle = overlay.querySelector('.title');
const overlayStartBtn = document.getElementById('start-btn');
const controlsEl = document.getElementById('controls');

function refreshBestDisplay() {
  const best = getBestRecord();
  if (best != null) {
    overlayBest.style.display = '';
    overlayBestVal.textContent = best;
  } else {
    overlayBest.style.display = 'none';
  }
}

function startGame() {
  state.stageNum = 1;
  state.totalShots = 0;
  state.demoUsed = false;
  state.watchMode = false;
  state.lockInput = false;
  state.flash = 0;
  state.input.left = state.input.right = state.input.rotL = state.input.rotR = false;
  demo.active = false;
  hideResult();
  applyStage(generateSolvableStage());
  state.running = true;
  overlay.classList.add('hidden');
  controlsEl.style.display = 'flex';
  document.getElementById('retry-btn').style.display = '';
  document.getElementById('demo-btn').style.display = '';
  document.getElementById('exit-btn').style.display = 'none';
  updateHUD();
  updateFireBtnState();
}

function startWatchMode() {
  state.stageNum = 1;
  state.totalShots = 0;
  state.demoUsed = true;
  state.watchMode = true;
  state.lockInput = false;
  state.flash = 0;
  state.input.left = state.input.right = state.input.rotL = state.input.rotR = false;
  demo.active = false;
  hideResult();
  applyStage(generateSolvableStage());
  state.running = true;
  overlay.classList.add('hidden');
  controlsEl.style.display = 'none';
  document.getElementById('retry-btn').style.display = 'none';
  document.getElementById('demo-btn').style.display = 'none';
  document.getElementById('exit-btn').style.display = '';
  updateHUD();
  setTimeout(() => {
    if (state.watchMode && state.running) startDemo();
  }, 1000);
}

function resetOverlayToTitle() {
  overlayTitle.innerHTML = '<div class="title-en">SWINGBY</div><div class="title-ja">スイングバイ</div><div class="title-divider"></div>';
  overlaySub.innerHTML = '全6ステージを、合計何発でクリアできるか挑戦！<br>1発で2つの的を壊したらクリア。';
  overlayHint.textContent = '↺やり直す自由・👁お手本を一度でも使うと記録なし';
  overlayStartBtn.textContent = 'スタート';
  refreshBestDisplay();
}

function exitToTitle() {
  state.running = false;
  state.watchMode = false;
  state.lockInput = false;
  demo.active = false;
  state.bullets = [];
  controlsEl.style.display = 'none';
  document.getElementById('exit-btn').style.display = 'none';
  document.getElementById('retry-btn').style.display = '';
  document.getElementById('demo-btn').style.display = '';
  hideResult();
  resetOverlayToTitle();
  initTitleBg();
  overlay.classList.remove('hidden');
}

function showEndScreen() {
  state.running = false;
  controlsEl.style.display = 'none';
  const shots = state.totalShots;
  const prevBest = getBestRecord();
  let isNewBest = false;
  if (!state.demoUsed) {
    if (prevBest == null || shots < prevBest) {
      saveBestRecord(shots);
      isNewBest = true;
    }
  }
  overlayTitle.innerHTML = state.demoUsed
    ? '<div class="title-en">CLEAR</div><div class="title-ja" style="color:rgba(122,134,160,.7);">記録なし</div>'
    : '<div class="title-en">GAME <span class="accent">CLEAR</span></div>';
  let subHtml = '';
  if (state.demoUsed) {
    subHtml = `合計 <strong style="color:#FFD178">${shots}</strong> 発でクリア<br><span style="color:#7A86A0;font-size:.8em;">(お手本使用のため記録対象外)</span>`;
  } else {
    subHtml = `合計 <strong style="color:#FFD178;font-size:1.3em;">${shots}</strong> 発でクリア！`;
    if (isNewBest) subHtml += '<br><span style="color:#FFD178;font-weight:800;">🏆 新記録！</span>';
    else if (prevBest != null) subHtml += `<br><span style="color:#7A86A0;font-size:.8em;">ベスト: ${prevBest} 発</span>`;
  }
  overlaySub.innerHTML = subHtml;
  overlayBest.style.display = 'none';
  overlayHint.textContent = 'もう一度プレイしますか？';
  overlayStartBtn.textContent = 'もう一度';
  overlay.classList.remove('hidden');
}

overlayStartBtn.addEventListener('click', startGame);
document.getElementById('watch-btn').addEventListener('click', startWatchMode);
document.getElementById('exit-btn').addEventListener('click', exitToTitle);
refreshBestDisplay();

document.getElementById('retry-btn').addEventListener('click', () => {
  if (!state.running || state.lockInput || demo.active || !state.currentDef) return;
  applyStage(state.currentDef);
  updateFireBtnState();
});

document.getElementById('demo-btn').addEventListener('click', startDemo);

window.addEventListener('resize', () => {
  if (state.running && state.currentDef) applyStage(state.currentDef);
  else initTitleBg();
});
