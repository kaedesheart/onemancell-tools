// YouTube Playables ビルドでは、このファイルより前に次の1行を足す（Web版には入れない）:
// <script src="https://www.youtube.com/game_api/v1"></script>

// ===== Copy =====
const I18N = {
  ja: {
    docTitle: 'スイングバイ - ワンマンセル ツールズ', appTitle: 'スイングバイ',
    retry: 'やり直す', demo: 'お手本', toTitle: 'タイトルへ',
    moveL: '左へ移動', moveR: '右へ移動', rotL: '左回転', rotR: '右回転', fire: 'FIRE',
    stage: 'STAGE', shots: 'SHOTS',
    titleMain: 'SWINGBY', titleSub: 'スイングバイ',
    blurb: '全6ステージを、合計何発でクリアできるか挑戦！<br>1発で2つの的を壊したらクリア。',
    bestPre: 'ベスト: ', bestPost: ' 発',
    start: 'スタート', watch: '🎬 観るだけモード',
    soundOn: '🔊 サウンド ON', soundOff: '🔇 サウンド OFF',
    vibOn: '📳 振動 ON', vibOff: '📳 振動 OFF',
    hint: '↺やり直す自由・👁お手本を一度でも使うと記録なし',
    noLine: '解が見つかりません', missTitle: 'もう一度', missSub: '惑星に当たった or 外れた',
    stageClear: 'STAGE CLEAR', next: '次のステージへ', cleared: 'CLEAR', allClear: 'ALL CLEAR!',
    unranked: '記録なし', gameClear: 'GAME <span class="accent">CLEAR</span>',
    endDemo: '合計 <strong style="color:#FFD178">{n}</strong> 発でクリア<br><span style="color:#7A86A0;font-size:.8em;">(お手本使用のため記録対象外)</span>',
    endShots: '合計 <strong style="color:#FFD178;font-size:1.3em;">{n}</strong> 発でクリア！',
    newBest: '<br><span style="color:#FFD178;font-weight:800;">🏆 新記録！</span>',
    bestDelta: '<br><span style="color:#FFD178;font-weight:800;">自己ベスト更新！ {a}→{b}</span>',
    closeBy: '<br><span style="color:#7A86A0;font-size:.8em;">ベストまであと{n}発</span>',
    tiedBest: '<br><span style="color:#7A86A0;font-size:.8em;">ベストに並んだ</span>',
    pace: 'ベスト {b} ・ あと{n}発',
    paceOut: 'ベスト更新ならず',
    stageBest: 'このステージのベスト {n}',
    endBest: '<br><span style="color:#7A86A0;font-size:.8em;">ベスト: {n} 発</span>',
    againAsk: 'もう一度プレイしますか？', again: 'もう一度',
  },
  en: {
    docTitle: 'Swingby', appTitle: 'Swingby',
    retry: 'Retry', demo: 'Show me', toTitle: 'Title',
    moveL: 'Move left', moveR: 'Move right', rotL: 'Turn left', rotR: 'Turn right', fire: 'FIRE',
    stage: 'STAGE', shots: 'SHOTS',
    titleMain: 'SWINGBY', titleSub: 'FLYBY',
    blurb: 'Clear 6 stages in the fewest shots.<br>One shot, both targets.',
    bestPre: 'Best: ', bestPost: '',
    start: 'Start', watch: '🎬 Just watch',
    soundOn: '🔊 Sound on', soundOff: '🔇 Sound off',
    vibOn: '📳 Vibrate on', vibOff: '📳 Vibrate off',
    hint: '↺ Retry anytime · 👁 Demo voids the record',
    noLine: 'No path found', missTitle: 'Try again', missSub: 'Hit a planet, or missed',
    stageClear: 'STAGE CLEAR', next: 'Next stage', cleared: 'CLEAR', allClear: 'ALL CLEAR!',
    unranked: 'Unranked', gameClear: 'GAME <span class="accent">CLEAR</span>',
    endDemo: 'Total shots: <strong style="color:#FFD178">{n}</strong><br><span style="color:#7A86A0;font-size:.8em;">Demo used — not ranked</span>',
    endShots: 'Total shots: <strong style="color:#FFD178;font-size:1.3em;">{n}</strong>',
    newBest: '<br><span style="color:#FFD178;font-weight:800;">🏆 New best!</span>',
    bestDelta: '<br><span style="color:#FFD178;font-weight:800;">New best! {a}→{b}</span>',
    closeBy: '<br><span style="color:#7A86A0;font-size:.8em;">{n} over best</span>',
    tiedBest: '<br><span style="color:#7A86A0;font-size:.8em;">Tied the best</span>',
    pace: 'Best {b} · {n} left',
    paceOut: 'Best stands',
    stageBest: 'Stage best {n}',
    endBest: '<br><span style="color:#7A86A0;font-size:.8em;">Best: {n}</span>',
    againAsk: 'Play again?', again: 'Again',
  },
};
let lang = 'en';
function t(key, vars) {
  let s = (I18N[lang] && I18N[lang][key] != null) ? I18N[lang][key] : (I18N.en[key] != null ? I18N.en[key] : key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}
function pickLang(tag) { return /^ja/i.test(String(tag || '')) ? 'ja' : 'en'; }
function queryLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'ja' || q === 'en') return q;
  } catch (e) {}
  return null;
}

// ===== Canvas / DPR =====
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2) || 1;
  const iw = window.innerWidth || 0;
  const ih = window.innerHeight || 0;
  if (iw < 2 || ih < 2) return; // 起動時 0px や一瞬の潰れでは描画を捨てない
  W = iw;
  H = ih;
  canvas.width = Math.max(1, Math.floor(W * DPR));
  canvas.height = Math.max(1, Math.floor(H * DPR));
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
  stageShots: 0,
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

// ===== Game feel (Phase1) — 演出の ON/OFF・強さはここに集約 =====
const FEEL = {
  shake: true,        // 画面揺れ（OFFで反動・揺れを全停止）
  haptics: true,      // 対応端末の軽い振動
  hitstop: 0.06,      // 的ヒット時の停止(秒)
  finalHitstop: 0.12, // 2つ目(クリア)の停止(秒)
  pullAccel: 2600,    // 1惑星からの引力(px/s²)がこれを超えたら「捕獲」演出
  bendRate: 5,        // 軌跡が最大輝度になる旋回速度(rad/s)
  trailMax: 420,      // 軌跡リングバッファ(1step=1点, 7秒分)
  maxParticles: 320,  // パーティクル上限(プール)
};
// 時間演出: stop=ヒットストップ残り秒, pull=捕獲スロー, slow=クリア余韻スロー
const tfx = { stop: 0, pull: 0, slow: 0 };
function timeScale() { return Math.min(1 - 0.45 * tfx.pull, 1 - 0.7 * tfx.slow); }
function haptic(ms) { if (FEEL.haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

function makeStars(n) {
  const stars = [];
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.7 + 0.2,
      twinkleSpeed: 0.5 + Math.random() * 2.0,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

const NEBULA_COLORS = [
  'rgba(124, 200, 232, 0.10)',
  'rgba(201, 155, 255, 0.09)',
  'rgba(255, 178, 112, 0.07)',
  'rgba(159, 230, 160, 0.06)',
];
function makeNebulae(n) {
  const list = [];
  for (let i = 0; i < n; i++) {
    list.push({
      x: Math.random(),
      y: Math.random(),
      r: 220 + Math.random() * 360,
      color: NEBULA_COLORS[i % NEBULA_COLORS.length],
    });
  }
  return list;
}

// ===== Particles & Camera shake =====
// 固定長プール(リング): 上限超過時は最古を上書き → GC・splice なし
const particles = [];
for (let i = 0; i < FEEL.maxParticles; i++) particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 1, spark: false, drag: 0.94 });
let pHead = 0;
function addParticle(x, y, vx, vy, life, color, size, spark, drag) {
  const p = particles[pHead];
  pHead = (pHead + 1) % particles.length;
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.maxLife = life;
  p.color = color; p.size = size; p.spark = !!spark; p.drag = drag || 0.94;
  p.delay = 0;
  return p;
}
const rings = []; // 衝撃波/捕獲リング {x,y,r0,r1,life,max,color,w}
function addRing(x, y, r0, r1, life, color, w) {
  if (rings.length >= 12) rings.shift();
  rings.push({ x, y, r0, r1, life, max: life, color, w });
}
const flashes = []; // 命中/クリアの発光 {x,y,r,life,max}
function clearParticles() {
  for (const p of particles) p.life = 0;
  rings.length = 0; flashes.length = 0;
}
function spawnHitParticles(x, y, color = '#FFE7A5', count = 28) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 220;
    addParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
      0.55 + Math.random() * 0.55, color, 1.6 + Math.random() * 2.2, i % 2 === 0);
  }
}
// 的: 短い閃光 → 広がる破裂 → 残る煙。白い全面点滅はしない。
function spawnHitBurst(x, y, final) {
  const n = final ? 20 : 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const sp = (final ? 240 : 160) + (i % 3) * 36;
    addParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.26,
      i % 2 ? '#FFF6D0' : '#FFD178', 2.1, true, 0.88);
  }
  const m = final ? 12 : 7;
  for (let i = 0; i < m; i++) {
    const a = (i / m) * Math.PI * 2 + 0.3;
    const sp = 28 + (i % 4) * 16;
    const p = addParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, final ? 0.9 : 0.62,
      i % 2 ? '#6E7C99' : '#8C7350', final ? 5 : 3.4, false, 0.97);
    p.delay = 0.14;
  }
  addRing(x, y, 6, final ? 64 : 42, 0.32, '#FFE7A5', 3);
  flashes.push({ x, y, r: final ? 54 : 32, life: 0.14, max: 0.14 });
}

// 全クリア時の祝福パーティクル
function spawnCelebration(major) {
  const palette = ['#FFD178', '#FFE7A5', '#7CC8E8', '#C99BFF', '#9FE6A0', '#FF9CAB'];
  const count = major ? 90 : 55;
  const cx = W / 2;
  const cy = H * 0.5;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 110 + Math.random() * (major ? 320 : 240);
    addParticle(cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 60,
      Math.cos(angle) * speed, Math.sin(angle) * speed - 70, // 軽く上向きバイアス
      1.4 + Math.random() * 1.6, palette[Math.floor(Math.random() * palette.length)], 2 + Math.random() * 3);
  }
  triggerShake(major ? 8 : 5);
}
function updateParticles(dt) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const d = Math.pow(p.drag, dt * 60); // フレームレート非依存の減衰
    p.vx *= d;
    p.vy *= d;
    p.life -= dt;
  }
  for (let i = rings.length - 1; i >= 0; i--) if ((rings[i].life -= dt) <= 0) rings.splice(i, 1);
  for (let i = flashes.length - 1; i >= 0; i--) if ((flashes[i].life -= dt) <= 0) flashes.splice(i, 1);
}
function drawParticles() {
  ctx.save();
  ctx.lineCap = 'round';
  for (const p of particles) {
    if (p.life <= 0 || p.delay > 0) continue;
    const t = p.life / p.maxLife;
    ctx.globalAlpha = Math.min(1, t + 0.15);
    if (p.spark) {
      ctx.strokeStyle = '#12182A';
      ctx.lineWidth = p.size * t + 2.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
      ctx.stroke();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * t + 0.6;
      ctx.stroke();
    } else {
      const rad = p.size * (0.45 + 0.55 * t);
      ctx.fillStyle = '#12182A';
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad + 1.3, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, 6.2832);
      ctx.fill();
    }
  }
  for (const r of rings) {
    const t = r.life / r.max;
    ctx.globalAlpha = Math.min(1, t + 0.15);
    const rr = Math.max(0, r.r0 + (r.r1 - r.r0) * (1 - t * t * t));
    ctx.beginPath();
    ctx.arc(r.x, r.y, rr, 0, 6.2832);
    ctx.strokeStyle = '#12182A';
    ctx.lineWidth = r.w * t + 2.4;
    ctx.stroke();
    ctx.strokeStyle = r.color;
    ctx.lineWidth = Math.max(1.2, r.w * t);
    ctx.stroke();
  }
  for (const f of flashes) {
    const t = f.life / f.max;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.22 * t;
    ctx.fillStyle = '#FFF6D8';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (0.55 + 0.45 * (1 - t)), 0, 6.2832);
    ctx.fill();
  }
  ctx.restore();
}

// ===== 弾の軌跡(リングバッファ) — 曲がり具合 k(0..1) で色・太さを変える =====
const TRAIL_RGB = ['255,196,104', '255,224,150', '190,236,255', '130,220,255', '235,250,255'];
function makeTrail() { return { buf: new Float32Array(FEEL.trailMax * 3), n: 0, head: 0 }; }
function trailPush(tr, x, y, k) {
  const i = tr.head * 3;
  tr.buf[i] = x; tr.buf[i + 1] = y; tr.buf[i + 2] = k;
  tr.head = (tr.head + 1) % FEEL.trailMax;
  if (tr.n < FEEL.trailMax) tr.n++;
}
// alphaMul: 全体の濃さ / boost: 太さ倍率(クリア余韻) / 同じ見た目の連続区間はまとめて1パスで描画
function drawTrail(tr, alphaMul, boost) {
  if (!tr || tr.n < 2) return;
  const N = FEEL.trailMax, b = tr.buf, start = (tr.head - tr.n + N) % N;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    let key = -1;
    for (let j = 1; j < tr.n; j++) {
      const i0 = ((start + j - 1) % N) * 3, i1 = ((start + j) % N) * 3;
      const kq = Math.min(4, (b[i1 + 2] * 4 + 0.5) | 0); // 曲がり=色。頭ほど太い
      const aq = Math.min(4, (j / tr.n * 4 + 0.5) | 0);
      const nk = kq * 5 + aq;
      if (nk !== key) {
        if (key >= 0) ctx.stroke();
        key = nk;
        const age = 0.42 + 0.58 * aq / 4;
        if (pass === 0) {
          ctx.strokeStyle = 'rgba(10,14,28,' + (0.72 * age * alphaMul) + ')';
          ctx.lineWidth = (8 + 2.2 * kq) * boost;
        } else {
          ctx.strokeStyle = 'rgba(' + TRAIL_RGB[kq] + ',' + Math.min(1, (0.72 + 0.28 * age) * alphaMul) + ')';
          ctx.lineWidth = (3.1 + 1.15 * kq) * boost;
        }
        ctx.beginPath();
        ctx.moveTo(b[i0], b[i0 + 1]);
      }
      ctx.lineTo(b[i1], b[i1 + 1]);
    }
    if (key >= 0) ctx.stroke();
  }
  ctx.restore();
}
// 弾が消えた後に残す軌跡(ミス時は次の発射まで薄く残し、狙い直しの手がかりにする)
let ghost = null; // {tr, life, max, clear}

const shake = { magnitude: 0, x: 0, y: 0 };

// ===== タイトル画面の流れ星屑 =====
const stardust = [];
let stardustCooldown = 0;
function spawnStardust() {
  // 画面端からランダムに登場、対角線方向に流れる
  const fromEdge = Math.floor(Math.random() * 4);
  let x, y, vx, vy;
  switch (fromEdge) {
    case 0: x = -20; y = Math.random() * H; vx = 35 + Math.random() * 50; vy = (Math.random() - 0.5) * 30; break;
    case 1: x = W + 20; y = Math.random() * H; vx = -35 - Math.random() * 50; vy = (Math.random() - 0.5) * 30; break;
    case 2: x = Math.random() * W; y = -20; vx = (Math.random() - 0.5) * 30; vy = 35 + Math.random() * 50; break;
    default: x = Math.random() * W; y = H + 20; vx = (Math.random() - 0.5) * 30; vy = -35 - Math.random() * 50;
  }
  const palette = ['#FFE7A5', '#7CC8E8', '#C99BFF', '#FFFFFF'];
  stardust.push({
    x, y, vx, vy,
    life: 8 + Math.random() * 6,
    maxLife: 14,
    color: palette[Math.floor(Math.random() * palette.length)],
    size: 0.8 + Math.random() * 1.0,
  });
}
function updateStardust(dt) {
  // タイトル中(running=false)のみ生成・更新
  if (!state.running) {
    stardustCooldown -= dt;
    if (stardustCooldown <= 0 && stardust.length < 18) {
      stardustCooldown = 0.5 + Math.random() * 0.9;
      spawnStardust();
    }
  }
  for (let i = stardust.length - 1; i >= 0; i--) {
    const p = stardust[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) {
      stardust.splice(i, 1);
    }
  }
}
function drawStardust() {
  if (!stardust.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of stardust) {
    const t = p.life / p.maxLife;
    let alpha = t < 0.15 ? t / 0.15 : (t > 0.85 ? (1 - t) / 0.15 : 1);
    alpha = Math.max(0, Math.min(1, alpha)) * 0.85;
    // トレイル(進行方向と反対側に薄く伸ばす)
    const tailX = p.x - p.vx * 0.06;
    const tailY = p.y - p.vy * 0.06;
    const trailGrad = ctx.createLinearGradient(tailX, tailY, p.x, p.y);
    trailGrad.addColorStop(0, 'rgba(255,255,255,0)');
    trailGrad.addColorStop(1, p.color);
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = p.size * 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    // ヘッド(光る点)
    ctx.globalAlpha = alpha;
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
    halo.addColorStop(0, p.color);
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ===== Audio (WebAudio で効果音を生成) =====
const audioState = { ctx: null };
const MUTE_KEY = 'omc-swingby-mute';
let audioMuted = false;
let ytAudioOn = true; // YouTube側の音声許可。SDKが無いときは常に許可
const progress = { best: null, mute: false, stages: [null, null, null, null, null, null] };
function readStages(raw) {
  const out = [null, null, null, null, null, null];
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < MAX_STAGES && i < raw.length; i++) {
    const n = Number(raw[i]);
    if (Number.isFinite(n) && n > 0) out[i] = n;
  }
  return out;
}
function saveBlob() {
  return { best: progress.best, mute: !!progress.mute, stages: progress.stages };
}
let cloudReady = false;
let progressDirty = false;

function ytApi() {
  try { return window.ytgame || null; } catch (e) { return null; }
}
function inPlayables() {
  try { return !!(window.ytgame && window.ytgame.IN_PLAYABLES_ENV); } catch (e) { return false; }
}
function soundBlocked() {
  if (simPaused || !ytAudioOn) return true;
  return !inPlayables() && audioMuted;
}
function muteLabel() {
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = audioMuted ? t('soundOff') : t('soundOn');
}
function hapticLabel() {
  const btn = document.getElementById('haptic-btn');
  if (btn) btn.textContent = FEEL.haptics ? t('vibOn') : t('vibOff');
}
function writeProgress() {
  try {
    const yt = ytApi();
    if (yt && yt.game && typeof yt.game.saveData === 'function') {
      if (!cloudReady) return; // loadData 完了前の save は SDK に拒否される
      const p = yt.game.saveData(JSON.stringify(saveBlob()));
      if (p && typeof p.then === 'function') p.then(() => {}, () => {});
      return;
    }
    if (progress.best != null) localStorage.setItem(BEST_KEY, String(progress.best));
    localStorage.setItem(MUTE_KEY, progress.mute ? '1' : '0');
    localStorage.setItem(BEST_KEY + '-stages', JSON.stringify(progress.stages));
  } catch (e) {}
}
function applyCloud(data) {
  if (!data || typeof data !== 'object') return;
  const n = Number(data.best);
  if (Number.isFinite(n) && n > 0) progress.best = n;
  if ('mute' in data) progress.mute = !!data.mute;
  if ('stages' in data) progress.stages = readStages(data.stages);
}
function applyProgress() {
  audioMuted = !!progress.mute;
  try { muteLabel(); refreshBestDisplay(); syncAudioOut(); } catch (e) {}
}
// ベストとミュートをまとめて読む。YouTube は非同期なので、届くまで既定値で起動する。
function loadProgress() {
  const yt = ytApi();
  if (yt && yt.game && typeof yt.game.loadData === 'function') {
    let pending;
    try { pending = yt.game.loadData(); } catch (e) { pending = Promise.reject(e); }
    Promise.resolve(pending).then(raw => {
      let data = null;
      try { if (raw) data = JSON.parse(raw); } catch (e) {}
      if (!progressDirty) applyCloud(data);
      else if (data) {
        const n = Number(data.best);
        if (Number.isFinite(n) && n > 0 && (progress.best == null || n < progress.best)) progress.best = n;
        if (Array.isArray(data.stages)) {
          const cloud = readStages(data.stages);
          for (let i = 0; i < MAX_STAGES; i++) {
            if (cloud[i] != null && (progress.stages[i] == null || cloud[i] < progress.stages[i])) progress.stages[i] = cloud[i];
          }
        }
      }
    }, () => {}).then(() => {
      cloudReady = true;
      applyProgress();
      if (progressDirty) writeProgress();
    });
    return;
  }
  try {
    const v = localStorage.getItem(BEST_KEY);
    const n = v ? parseInt(v, 10) : NaN;
    progress.best = Number.isFinite(n) && n > 0 ? n : null;
    progress.mute = localStorage.getItem(MUTE_KEY) === '1';
    progress.stages = readStages(JSON.parse(localStorage.getItem(BEST_KEY + '-stages') || 'null'));
  } catch (e) {}
  cloudReady = true;
  applyProgress();
}

function initAudio() {
  if (audioState.ctx || soundBlocked()) return;
  try {
    audioState.ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { /* 非対応環境は黙ってスキップ */ }
}

function setMuted(m) {
  if (inPlayables()) return; // Playables の全体ミュートは YouTube 側
  if (!m && !ytAudioOn) return; // YouTube が消音中はゲーム内から解除しない
  audioMuted = !!m;
  progress.mute = audioMuted;
  progressDirty = true;
  writeProgress();
  muteLabel();
  try { syncAudioOut(); } catch (e) {}
}

function audioBeep({ type = 'sine', freq, freqEnd, dur = 0.2, gain = 0.12, attack = 0.005, delay = 0 }) {
  if (soundBlocked()) return;
  initAudio();
  const ctx = audioState.ctx;
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + dur);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function playFire()  {
  audioBeep({ type: 'sawtooth', freq: 660, freqEnd: 80,  dur: 0.16, gain: 0.10 });
  audioBeep({ type: 'sine', freq: 130, freqEnd: 45, dur: 0.14, gain: 0.14 }); // 低音の「ドン」
}
function playHit(final) { // 2つ目は完全4度上 → 「決まった」感
  const k = final ? 1.335 : 1;
  audioBeep({ type: 'square', freq: 2400 * k, freqEnd: 500, dur: 0.05, gain: 0.035 });
  audioBeep({ type: 'sine', freq: 987.77 * k,  dur: 0.45, gain: 0.10 });
  audioBeep({ type: 'sine', freq: 1318.51 * k, dur: 0.45, gain: 0.08 });
}
function playPull()  { audioBeep({ type: 'sine', freq: 150, freqEnd: 460, dur: 0.24, gain: 0.07 }); }
function playMiss()  { audioBeep({ type: 'sine', freq: 160, freqEnd: 45, dur: 0.28, gain: 0.13 }); }
function playClear() {
  [659.25, 783.99, 987.77].forEach((f, i) =>
    audioBeep({ type: 'triangle', freq: f, dur: 0.4, gain: 0.10, delay: i * 0.08 }));
}
function playAllClear() {
  [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((f, i) =>
    audioBeep({ type: 'triangle', freq: f, dur: 0.65, gain: 0.13, delay: i * 0.10 }));
}
// Web は操作まで待つ。Playables はブラウザが許す範囲で先に開く（後の操作でも resume）。
document.addEventListener('pointerdown', () => { try { initAudio(); syncAudioOut(); } catch (e) {} });

// 発射演出: マズルフラッシュ強度、反動量、ブースター粒子の発生間隔
const fx = { muzzle: 0, kickback: 0, thrustTimer: 0 };
function spawnThrustParticles(p, dt) {
  if (!state.running) return;
  fx.thrustTimer += dt;
  if (fx.thrustTimer < 0.035) return;
  fx.thrustTimer = 0;
  const tailX = p.x - Math.cos(p.angle) * p.r * 0.85;
  const tailY = p.y - Math.sin(p.angle) * p.r * 0.85;
  const speed = 50 + Math.random() * 60;
  const spread = (Math.random() - 0.5) * 0.6;
  const dir = p.angle + Math.PI + spread;
  addParticle(tailX + (Math.random() - 0.5) * 3, tailY + (Math.random() - 0.5) * 3,
    Math.cos(dir) * speed, Math.sin(dir) * speed, 0.32 + Math.random() * 0.18,
    Math.random() < 0.7 ? '#7CC8E8' : '#A6DCEF', 1.0 + Math.random() * 0.8);
}
function triggerShake(amount) {
  if (!FEEL.shake) return;
  shake.magnitude = Math.min(10, Math.max(shake.magnitude, amount));
}
// 方向付きの押し戻し(発射の反動): ランダム揺れとは別にバネで戻る
const kick = { x: 0, y: 0 };
function triggerKick(dx, dy) { if (FEEL.shake) { kick.x += dx; kick.y += dy; } }
function updateShake(dt) {
  if (shake.magnitude > 0) {
    shake.magnitude *= Math.pow(0.012, dt);
    if (shake.magnitude < 0.25) shake.magnitude = 0;
    shake.cool = (shake.cool || 0) - dt;
    if (shake.cool <= 0) {
      shake.cool = 0.03;
      shake.tx = (Math.random() - 0.5) * shake.magnitude;
      shake.ty = (Math.random() - 0.5) * shake.magnitude;
    }
    const k = Math.min(1, dt * 18);
    shake.x += ((shake.tx || 0) - shake.x) * k;
    shake.y += ((shake.ty || 0) - shake.y) * k;
  } else {
    const k = Math.min(1, dt * 14);
    shake.x += -shake.x * k;
    shake.y += -shake.y * k;
  }
  kick.x *= Math.pow(0.002, dt);
  kick.y *= Math.pow(0.002, dt);
}

// タイトル画面用の背景（state・makeStars定義後に呼ぶ）
function initTitleBg() {
  state.stars = makeStars(150);
  state.nebulae = makeNebulae(3);
  state.planets = [
    { x: W * 0.10, y: H * 0.22, r: 38, mass: 2280, color: '#7CC8E8' },
    { x: W * 0.88, y: H * 0.68, r: 30, mass: 1800, color: '#C99BFF' },
    { x: W * 0.72, y: H * 0.10, r: 20, mass: 1200, color: '#FFB270' },
  ];
  clearParticles();
}
initTitleBg();

// ===== Stage =====
function shipY(ratioY) {
  const lift = (H - PLAYER_BOTTOM_OFFSET < 48) ? Math.max(8, H * 0.2) : PLAYER_BOTTOM_OFFSET;
  return Math.max(8, Math.min(ratioY * H, Math.max(8, H - lift)));
}
function clampPlayer() {
  if (W < 2 || H < 2) return;
  const m = Math.min(28, Math.max(8, W * 0.08));
  state.player.x = Math.min(W - m, Math.max(m, state.player.x));
  state.player.y = Math.min(H - 8, Math.max(8, state.player.y));
}
function applyStage(ratioDef) {
  state.currentDef = ratioDef;
  state.player.x = ratioDef.player.x * W;
  state.player.y = shipY(ratioDef.player.y);
  clampPlayer();
  state.player.angle = -Math.PI / 2;
  state.fitW = W;
  state.fitH = H;
  state.planets = ratioDef.planets.map(p => ({
    x: p.x * W, y: p.y * H, r: p.r, mass: p.mass, color: p.color,
  }));
  state.targets = ratioDef.targets.map(t => ({
    x: t.x * W, y: t.y * H, r: TARGET_R, hit: false,
  }));
  state.bullets = [];
  state.stars = makeStars(120);
  state.nebulae = makeNebulae(3);
  clearParticles();
  ghost = null;
  shake.magnitude = 0;
  pregenStage(state.stageNum + 1);
  updateHUD();
}

function expandRatio(ratioDef) {
  return {
    player: { x: ratioDef.player.x * W, y: shipY(ratioDef.player.y) },
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

// ===== [Phase2] ステージ難易度ティア =====
// 0: ST1-2 ほぼ直線でクリア可 / 1: ST3-4 スイングバイが気持ちいい(直接も可) / 2: ST5-6 スイングバイ必須
// massK=惑星質量係数(元は r*60), bend=「理想軌道」の旋回量(rad), rate=最低クリア率(画面比に依存するので下限のみ),
// win=同じ位置で連続して当たる角度数の範囲(=狙いの許容幅、1≒3°), straight/gentle/assist=クリア解のうち 直線(旋回<20°)/回り込まない(<46°)/スイングバイ(>46°) の割合
const TIERS = [
  { massK: 8,  bend: [0, 0.15],  rate: 0.0008, win: [3, 99], straightMin: 0.5 },
  { massK: 30, bend: [0.8, 1.6], rate: 0.0008, win: [2, 5],  gentleMin: 0.1, assistMin: 0.3 },
  { massK: 60, bend: [1.3, 2.8], rate: 0.0005, win: [2, 3],  straightMax: 0, assistMin: 0.7 },
];
const STRAIGHT_TURN = 0.35, ASSIST_TURN = 0.8;
function stageTier(n) { return [0, 0, 1, 1, 2, 2][(n - 1) % 6]; }

function randomRatioStage(massK = 60) {
  const player = { x: rnd(0.25, 0.75), y: 0.85 };
  const playerPx = { x: player.x * W, y: player.y * H };

  const planets = [];
  for (let i = 0; planets.length < 2 && i < 80; i++) {
    const r = rnd(20, 38);
    const cand = {
      x: rnd(0.15, 0.85),
      y: rnd(0.18, 0.62),
      r, mass: r * massK,
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

// 1stepの移動は直線。端点だけだと引力で加速した弾が円を通り抜けるので、
// 線分が円に入る最早の t∈[0,1] を返す(外れは -1)。生成・照準・実弾で共用。
function sweepCircle(x0, y0, x1, y1, cx, cy, r) {
  const fx = x0 - cx, fy = y0 - cy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0;
  const ex = x1 - cx, ey = y1 - cy;
  const endIn = ex * ex + ey * ey <= r * r;
  const dx = x1 - x0, dy = y1 - y0;
  const a = dx * dx + dy * dy;
  if (a < 1e-8) return endIn ? 1 : -1;
  const b = 2 * (fx * dx + fy * dy);
  const disc = b * b - 4 * a * c;
  if (disc >= 0) {
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t >= 0 && t <= 1) return t;
  }
  return endIn ? 1 : -1;
}

// 弾道シミュレーション。勝利時はステップ数と累積旋回量 turn(rad) も返す
// trace を渡すと毎stepの [x, y, turn] を積む(的なしで呼ぶと画面外/衝突まで飛ぶ)
function simulateAndMeasure(absDef, px, py, angle, trace) {
  const winMask = (1 << absDef.targets.length) - 1;
  const playerR = 14;
  const dt = 1 / 60;
  const maxSteps = Math.floor(60 * BULLET_LIFE);
  const nx = Math.cos(angle), ny = Math.sin(angle);
  let x = px + nx * (playerR + 6);
  let y = py + ny * (playerR + 6);
  let vx = nx * BULLET_SPEED;
  let vy = ny * BULLET_SPEED;
  let hitMask = 0, turn = 0;
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
    turn += Math.abs(vx * ay - vy * ax) / (vx * vx + vy * vy) * dt;
    const x0 = x, y0 = y;
    vx += ax * dt; vy += ay * dt;
    x  += vx * dt; y  += vy * dt;
    let planetT = 2;
    for (const p of absDef.planets) {
      const t = sweepCircle(x0, y0, x, y, p.x, p.y, p.r);
      if (t >= 0 && t < planetT) planetT = t;
    }
    const rr = TARGET_R + 4;
    for (let i = 0; i < absDef.targets.length; i++) {
      if (hitMask & (1 << i)) continue;
      const tg = absDef.targets[i];
      const ht = sweepCircle(x0, y0, x, y, tg.x, tg.y, rr);
      if (ht >= 0 && ht < planetT) hitMask |= (1 << i);
    }
    if (winMask && hitMask === winMask) return { hits: true, steps: s + 1, turn };
    if (planetT <= 1) return { hits: false };
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return { hits: false };
    if (trace) trace.push(x, y, turn);
  }
  return { hits: false };
}

// 解空間の全探索。操作は1step毎に 移動3.83px / 回転1.53° 刻みなので、実際に到達できる格子上で調べる
// (横は3刻み以上・角度2刻みに間引き)。難易度指標と解リスト(お手本用)を返す
function classifyStage(absDef) {
  const st1 = MOVE_SPEED / 60, MX = st1 * Math.max(3, Math.round((W - 80) / 40 / st1)); // 横は最大約40列
  const RA = ROT_SPEED / 60 * 2, py = absDef.player.y, sols = [];
  const NA = Math.floor(2 * Math.PI / RA);
  let st = 0, ge = 0, as = 0, total = 0, win = 0;
  for (let px = 40 + (absDef.player.x - 40) % MX; px <= W - 40; px += MX) {
    for (let ai = 0, run = 0; ai < NA; ai++, total++) {
      const angle = -Math.PI / 2 + ai * RA;
      const r = simulateAndMeasure(absDef, px, py, angle);
      if (!r.hits) { run = 0; continue; }
      win = Math.max(win, ++run);
      sols.push({ px, angle, turn: r.turn, steps: r.steps });
      if (r.turn < STRAIGHT_TURN) st++;
      if (r.turn > ASSIST_TURN) as++; else ge++;
    }
  }
  const n = sols.length || 1;
  return { rate: sols.length / total, win, straight: st / n, gentle: ge / n, assist: as / n, sols };
}
function fitsTier(c, T) {
  return c.sols.length >= 3 && c.rate >= T.rate && c.win >= T.win[0] && c.win <= T.win[1]
    && (T.straightMin == null || c.straight >= T.straightMin)
    && (T.straightMax == null || c.straight <= T.straightMax)
    && (T.gentleMin == null || c.gentle >= T.gentleMin)
    && (T.assistMin == null || c.assist >= T.assistMin);
}

// 「理想軌道」から逆算して的を置く: 発射点と角度を決めて飛ばし、軌跡上に的を2つ配置
function buildTierStage(tier) {
  const T = TIERS[tier];
  const def = randomRatioStage(T.massK);
  if (!def) return null;
  const abs = expandRatio(def);
  const tr = [];
  // 直線型: 画面上部の適当な点を狙う / スイングバイ型: 惑星の脇(半径の3〜7倍)を狙う
  // tier0=直線型のみ, tier1=半々(両方の解が残る盤面だけ採用), tier2=スイングバイ型のみ
  const swing = tier === 2 || (tier === 1 && Math.random() < 0.5);
  const lx = rnd(60, W - 60), ly = abs.player.y, pl = choice(abs.planets);
  let ax = rnd(0.2, 0.8) * W, ay = rnd(0.08, 0.5) * H;
  if (swing) {
    const d = Math.hypot(pl.x - lx, pl.y - ly), off = pl.r * rnd(3, 7) * (Math.random() < 0.5 ? 1 : -1);
    ax = pl.x - (pl.y - ly) / d * off; ay = pl.y + (pl.x - lx) / d * off;
  }
  simulateAndMeasure({ planets: abs.planets, targets: [] }, lx, ly, Math.atan2(ay - ly, ax - lx), tr);
  const n = tr.length / 3, turnAt = i => tr[i * 3 + 2];
  if (n < 30) return null;
  let i1, i2;
  if (!swing) { // 旋回が小さい区間の中で2点
    let lim = 0;
    while (lim < n - 1 && turnAt(lim) < (tier ? 0.6 : T.bend[1])) lim++;
    i2 = Math.floor(lim * rnd(0.6, 0.95));
    i1 = Math.floor(i2 * rnd(0.35, 0.6));
  } else { // 2つ目は曲がった後、1つ目は曲がり始め(tier1)/曲がる途中(tier2)
    const want = rnd(T.bend[0], T.bend[1]);
    i2 = 0;
    while (i2 < n - 1 && turnAt(i2) < want) i2++;
    const f = tier === 1 ? 0.1 : want * rnd(0.3, 0.6);
    i1 = 0;
    while (i1 < i2 && turnAt(i1) < f) i1++;
    if (tier === 1) i1 = Math.floor(i1 * rnd(0.5, 1));
  }
  if (i1 < 12 || i2 - i1 < 12) return null;
  const pts = [i1, i2].map(i => ({ x: tr[i * 3], y: tr[i * 3 + 1] }));
  for (const q of pts) {
    if (q.x < W * 0.08 || q.x > W * 0.92 || q.y < H * 0.07 || q.y > H * 0.7) return null;
    if (Math.hypot(q.x - abs.player.x, q.y - abs.player.y) < 110) return null;
    for (const p of abs.planets) if (Math.hypot(q.x - p.x, q.y - p.y) < p.r + 30) return null;
  }
  if (Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) < 90) return null;
  def.targets = pts.map(q => ({ x: q.x / W, y: q.y / H }));
  return def;
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

// ステージ番号のティアに合う盤面だけを採用(構築型を主に、3回に1回は従来のランダム配置も試す)
// generator にして1試行ずつ進められるようにし、次ステージを操作中の空きフレームで先に作っておく
function* stageSearch(n) {
  const tier = stageTier(n), T = TIERS[tier];
  for (let attempt = 0; attempt < 60; attempt++) {
    let def = null; // 構築は軽い(1回の弾道計算)ので、判定(重い)の前に成功するまで繰り返す
    for (let k = 0; !def && k < 200; k++) def = attempt % 3 === 2 ? randomRatioStage(T.massK) : buildTierStage(tier);
    if (def) {
      const c = classifyStage(expandRatio(def));
      if (fitsTier(c, T)) {
        def.tier = tier; def.sols = c.sols; def.solW = W; def.solH = H;
        return def;
      }
    }
    yield;
  }
  return easyFallback();
}
const pre = { n: 0, it: null, def: null };
function runAll(it) { let r; while (!(r = it.next()).done); return r.value; }
function generateSolvableStage() {
  const n = state.stageNum;
  if (pre.n === n && (pre.def || pre.it)) {
    const d = pre.def || runAll(pre.it);
    pre.def = pre.it = null;
    return d;
  }
  return runAll(stageSearch(n));
}
function pregenStage(n) { if (pre.n !== n) { pre.n = n; pre.def = null; pre.it = stageSearch(n); } }
function stepPregen() { if (pre.it) { const r = pre.it.next(); if (r.done) { pre.def = r.value; pre.it = null; } } }

// 解リスト(生成時のものを再利用、画面サイズが変わっていたら再探索)
function stageSolutions(absDef) {
  const d = state.currentDef;
  if (d && d.sols && d.solW === W && d.solH === H) return d.sols;
  const sols = classifyStage(absDef).sols;
  if (d) { d.sols = sols; d.solW = W; d.solH = H; }
  return sols;
}
// 現在位置に最も近い解（通常お手本用）
function findNearestSolution(absDef, currentPx) {
  let best = null, bestDist = Infinity;
  for (const s of stageSolutions(absDef)) {
    const d = Math.abs(s.px - currentPx);
    if (d < bestDist) { best = s; bestDist = d; }
  }
  return best;
}
// 「理想軌道」= 観るだけモード用: 旋回量が最大(=最もスイングバイらしい)解。ティア0は最も素直な解
function findLongestSolution(absDef) {
  const tier = state.currentDef && state.currentDef.tier;
  let best = null;
  for (const s of stageSolutions(absDef)) {
    if (!best || (tier === 0 ? s.turn < best.turn : s.turn > best.turn)) best = s;
  }
  return best;
}

// ===== Demo (お手本プレイ) =====
const demo = { active: false, targetPx: 0, targetAngle: 0, startTime: 0 };
let demoFireTimer = null;

// 観るだけモード用: 連鎖setTimeoutをID管理してexit時に全キャンセル
let watchTimers = [];
function watchSetTimeout(fn, ms) {
  const arm = (delay) => {
    const id = setTimeout(() => {
      watchTimers = watchTimers.filter(t => t !== id);
      if (simPaused) { arm(200); return; }
      if (state.watchMode && state.running) fn();
    }, delay);
    watchTimers.push(id);
  };
  arm(ms);
}
function clearWatchTimers() {
  for (const id of watchTimers) clearTimeout(id);
  watchTimers = [];
  if (demoFireTimer) { clearTimeout(demoFireTimer); demoFireTimer = null; }
}

function startDemo() {
  if (!state.running || state.lockInput || demo.active || bulletInFlight()) return;
  if (!state.currentDef) return;
  const absDef = expandRatio(state.currentDef);
  // 観るだけモードはトリックショット（最長軌道）優先、通常モードは現在位置に近い解
  const sol = state.watchMode
    ? findLongestSolution(absDef)
    : findNearestSolution(absDef, state.player.x);
  if (!sol) {
    if (state.watchMode) {
      // 解が見つからない異常系は飛ばして次のステージへ
      watchSetTimeout(() => {
        state.stageNum++;
        state.stageShots = 0;
        applyStage(generateSolvableStage());
        watchSetTimeout(() => startDemo(), 2000);
      }, 500);
      return;
    }
    showResult('miss', 'noLine', '', 1200);
    return;
  }
  if (!state.watchMode) {
    state.demoUsed = true;
    updateHUD();
  }

  for (const t of state.targets) t.hit = false;
  state.bullets = [];

  demo.active = true;
  demo.targetPx = sol.px;
  demo.targetAngle = sol.angle;
  demo.startTime = performance.now();
  state.lockInput = true;
  state.input.left = state.input.right = state.input.rotL = state.input.rotR = false;
  document.querySelectorAll('.ctrl-btn').forEach(b => b.classList.remove('active'));
  updateFireBtnState();
}

function applyDemo(dt) {
  const p = state.player;
  // 安全装置: 5秒以上完了しない場合は強制スナップして発射（停止防止）
  if (performance.now() - demo.startTime > 5000) {
    p.x = demo.targetPx;
    p.angle = demo.targetAngle;
  }
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
  } else if (p.angle !== demo.targetAngle) {
    // 角度がmod 2πで等価だが値が異なる(例: -π/2 と 3π/2) → 強制スナップ
    p.angle = demo.targetAngle;
  }
  // 両方 exact 一致したら発射 → シミュレータと完全一致した軌道に
  if (p.x === demo.targetPx && p.angle === demo.targetAngle) {
    demo.active = false;
    state.lockInput = false;
    // 観るだけモードはじっくりタメてから発射、通常モードはサクッと
    const fireDelay = state.watchMode ? 800 : 220;
    if (demoFireTimer) clearTimeout(demoFireTimer);
    const armFire = (delay) => {
      demoFireTimer = setTimeout(() => {
        if (simPaused) { armFire(200); return; }
        demoFireTimer = null;
        fire();
      }, delay);
    };
    armFire(fireDelay);
  }
}

const holdT = { left: 0, right: 0, rotL: 0, rotR: 0 };
function aimRamp(t) { return t <= 0 ? 0 : (t < 0.16 ? 0.2 : Math.min(1, 0.2 + (t - 0.16) * 3.4)); }
function applyInput(dt) {
  const p = state.player;
  for (const k in holdT) holdT[k] = state.input[k] ? holdT[k] + dt : 0;
  if (state.input.left)  p.x -= MOVE_SPEED * dt * aimRamp(holdT.left);
  if (state.input.right) p.x += MOVE_SPEED * dt * aimRamp(holdT.right);
  if (state.input.rotL)  p.angle -= ROT_SPEED * dt * aimRamp(holdT.rotL);
  if (state.input.rotR)  p.angle += ROT_SPEED * dt * aimRamp(holdT.rotR);
  p.x = Math.max(40, Math.min(W - 40, p.x));
}
function aimCurve(dx) {
  const s = Math.sign(dx), a = Math.abs(dx), fine = 64;
  if (a <= fine) return s * a * 0.00105;
  return s * (fine * 0.00105 + (a - fine) * 0.0052);
}

// ===== HUD =====
function updateHUD() {
  document.getElementById('stage-num').textContent = state.stageNum + '/' + MAX_STAGES;
  const shots = state.totalShots;
  document.getElementById('shots-count').textContent = state.demoUsed ? (shots + ' ✗') : shots;
  updatePace();
  if (typeof updateFireBtnState === 'function') updateFireBtnState();
}
function updatePace() {
  const line = document.getElementById('pace');
  const st = document.getElementById('stage-pace');
  if (!line) return;
  const show = state.running && !state.watchMode && !state.demoUsed;
  const best = getBestRecord();
  if (!show || best == null) {
    line.hidden = true;
  } else {
    const left = best - state.totalShots;
    line.hidden = false;
    if (left > 0) { line.classList.remove('dim'); line.textContent = t('pace', { b: best, n: left }); }
    else { line.classList.add('dim'); line.textContent = t('paceOut'); }
  }
  const sb = progress.stages[state.stageNum - 1];
  if (!st) return;
  if (!show || sb == null) st.hidden = true;
  else { st.hidden = false; st.textContent = t('stageBest', { n: sb }); }
}

function getBestRecord() {
  const n = progress.best;
  return Number.isFinite(n) && n > 0 ? n : null;
}
function saveBestRecord(n) {
  progress.best = n;
  progressDirty = true;
  writeProgress();
}
function noteStageBest() {
  if (state.demoUsed || state.watchMode) return;
  const i = state.stageNum - 1;
  const s = state.stageShots;
  if (i < 0 || i >= MAX_STAGES || !(s > 0)) return;
  if (progress.stages[i] == null || s < progress.stages[i]) {
    progress.stages[i] = s;
    progressDirty = true;
    writeProgress();
  }
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
  if (simPaused || !state.running || state.lockInput || bulletInFlight()) return;
  const p = state.player;
  const nx = Math.cos(p.angle);
  const ny = Math.sin(p.angle);
  state.bullets.push({
    x: p.x + nx * (p.r + 6),
    y: p.y + ny * (p.r + 6),
    vx: nx * BULLET_SPEED,
    vy: ny * BULLET_SPEED,
    life: BULLET_LIFE,
    trail: makeTrail(),
    k: 0,          // 現在の曲がり具合(0..1)
    capT: null,    // 捕獲中の惑星
    capMask: 0,    // このショットで捕獲演出済みの惑星(1回ずつ)
  });
  ghost = null;
  // 発射演出: 機体の反動 + 画面を発射と逆方向へ押す + マズルの衝撃リング
  fx.muzzle = 1;
  fx.kickback = 1;
  triggerShake(3);
  triggerKick(-nx * 5, -ny * 5);
  addRing(p.x + nx * (p.r + 8), p.y + ny * (p.r + 8), 4, 24, 0.22, '#FFE7A5', 2.5);
  haptic(10);
  // マズルから前方に金色の閃光
  const muzzleX = p.x + nx * (p.r + 8);
  const muzzleY = p.y + ny * (p.r + 8);
  for (let i = 0; i < 8; i++) {
    const spread = (Math.random() - 0.5) * 0.7;
    const ang = p.angle + spread;
    const sp = 80 + Math.random() * 90;
    addParticle(muzzleX, muzzleY, Math.cos(ang) * sp, Math.sin(ang) * sp,
      0.18 + Math.random() * 0.12, '#FFE7A5', 1.4 + Math.random() * 1.2, true);
  }
  state.totalShots++;
  if (!state.watchMode) state.stageShots++;
  playFire();
  updateHUD();
  updateFireBtnState();
}

function endShotFailed() {
  state.bullets = [];
  state.flash = 0.6;
  for (const t of state.targets) t.hit = false;
  playMiss();
  updateHUD();
  if (state.watchMode) {
    // 観るだけモード中は新しいステージに進んでリトライ（同じ詰みを繰り返さない）
    watchSetTimeout(() => {
      state.stageNum++;
      state.stageShots = 0;
      applyStage(generateSolvableStage());
      watchSetTimeout(() => startDemo(), 2000);
    }, 1500);
    return;
  }
  showResult('miss', 'missTitle', 'missSub');
}

function later(ms, fn) {
  const tick = () => { if (simPaused) setTimeout(tick, 200); else fn(); };
  return setTimeout(tick, ms);
}
function endShotCleared() {
  state.bullets = [];
  state.lockInput = true;

  if (state.watchMode) {
    // 観るだけモード: 閃光のあとで文字。連鎖タイマーは watchSetTimeout
    playClear();
    later(900, () => showResult('clear', 'cleared', '', 900));
    watchSetTimeout(() => {
      state.stageNum++;
      state.stageShots = 0;
      applyStage(generateSolvableStage());
      state.lockInput = false;
      hideResult();
      updateHUD();
      // 盤面を眺める時間 → デモ開始
      watchSetTimeout(() => startDemo(), 2000);
    }, 1900);
    return;
  }

  noteStageBest();
  const isLastStage = state.stageNum >= MAX_STAGES;
  if (isLastStage) {
    // 新記録になりそうかを予測（記録対象外＝デモ使用なら通常パーティクル）
    const prevBest = getBestRecord();
    const willBeNewBest = !state.demoUsed && (prevBest == null || state.totalShots < prevBest);
    spawnCelebration(willBeNewBest);
    playAllClear();
    later(900, () => showResult('clear', 'allClear', '', 1000));
    later(2000, () => {
      hideResult();
      showEndScreen();
    });
  } else {
    playClear();
    later(900, () => showResult('clear', 'stageClear', 'next', 900));
    later(1900, () => {
      state.stageNum++;
      state.stageShots = 0;
      applyStage(generateSolvableStage());
      state.lockInput = false;
      hideResult();
      updateFireBtnState();
    });
  }
}

function updateBullets(dt) {
  const startedWithBullets = state.bullets.length > 0;
  let immediateClear = false;

  for (const b of state.bullets) {
    if (immediateClear) break;
    const x0 = b.x, y0 = b.y;
    const g = gravityAt(b.x, b.y);
    b.vx += g.ax * dt;
    b.vy += g.ay * dt;
    b.x  += b.vx * dt;
    b.y  += b.vy * dt;
    b.life -= dt;
    // 旋回速度 ω=|v×a|/|v|² → 引力で「曲がっている」所ほど k が大きい
    const w = Math.abs(b.vx * g.ay - b.vy * g.ax) / (b.vx * b.vx + b.vy * b.vy + 1e-6);
    b.k = Math.min(1, w / FEEL.bendRate);
    const x1 = b.x, y1 = b.y;
    let planetT = 2, hitPlanet = null;
    for (const p of state.planets) {
      const t = sweepCircle(x0, y0, x1, y1, p.x, p.y, p.r);
      if (t >= 0 && t < planetT) { planetT = t; hitPlanet = p; }
    }
    if (hitPlanet) {
      b.hitPlanet = hitPlanet;
      b.x = x0 + (x1 - x0) * planetT;
      b.y = y0 + (y1 - y0) * planetT;
    }
    trailPush(b.trail, b.x, b.y, b.k);
    if (!hitPlanet) updateCapture(b);
    for (const t of state.targets) {
      if (t.hit) continue;
      const ht = sweepCircle(x0, y0, x1, y1, t.x, t.y, t.r + 4);
      if (ht >= 0 && ht < planetT) {
        t.hit = true;
        const fin = allCleared();
        spawnHitBurst(t.x, t.y, fin);
        triggerShake(fin ? 10 : 7);
        tfx.stop = Math.max(tfx.stop, fin ? FEEL.finalHitstop : FEEL.hitstop);
        playHit(fin);
        haptic(fin ? 30 : 15);
        if (fin) { startAfterglow(b, t); immediateClear = true; break; }
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
    const hitPlanet = b.hitPlanet;
    if (b.life <= 0 || offBounds || hitPlanet) {
      if (hitPlanet) {
        spawnHitParticles(b.x, b.y, hitPlanet.color, 16);
        triggerShake(5);
        tfx.stop = Math.max(tfx.stop, 0.045);
        haptic(12);
      } else {
        const x = Math.max(10, Math.min(W - 10, b.x));
        const y = Math.max(10, Math.min(H - 10, b.y));
        spawnHitParticles(x, y, '#9BB0D0', 10);
        triggerShake(2.5);
        haptic(8);
      }
      if (!allCleared()) ghost = { tr: b.trail, life: Infinity, max: 1, clear: false };
      state.bullets.splice(i, 1);
    }
  }

  if (startedWithBullets && state.bullets.length === 0 && state.running && !state.lockInput) {
    if (allCleared()) endShotCleared();
    else endShotFailed();
    updateFireBtnState();
  }
}

// 「ぐいっと」捕獲: 1惑星の引力が閾値を超えた瞬間に収縮リング+短いスロー+音
function updateCapture(b) {
  let best = null, bestA = 0, bi = 0;
  state.planets.forEach((p, i) => {
    const r = Math.max(Math.hypot(p.x - b.x, p.y - b.y), p.r * 0.6);
    const a = G * p.mass / (r * r);
    if (a > bestA) { bestA = a; best = p; bi = i; }
  });
  if (!best) return;
  const lv = bestA / FEEL.pullAccel;
  if (lv > 1) {
    best.pull = Math.min(1, Math.max(best.pull || 0, lv - 0.6));
    if (b.capT !== best) {
      b.capT = best;
      if (!(b.capMask & (1 << bi))) {
        b.capMask |= 1 << bi;
        tfx.pull = 1;
        addRing(best.x, best.y, best.r * 3.4, best.r * 1.05, 0.5, best.color, 3);
        spawnHitParticles(b.x, b.y, best.color, 8);
        triggerShake(2);
        playPull();
        haptic(6);
      }
    }
  } else if (lv < 0.7) b.capT = null;
}
// クリア余韻: スロー + 軌跡を光らせて残す + 軌跡から光の粒が立ち上る
function startAfterglow(b, t) {
  tfx.slow = 1;
  ghost = { tr: b.trail, life: 1.6, max: 1.6, clear: true };
  const tr = b.trail, N = FEEL.trailMax;
  for (let j = 0; j < 18; j++) {
    const i = ((tr.head - 1 - Math.floor(j * tr.n / 18) + N * 2) % N) * 3;
    addParticle(tr.buf[i], tr.buf[i + 1], (Math.random() - 0.5) * 30, -30 - Math.random() * 40,
      0.9 + Math.random() * 0.8, j % 2 ? '#FFE7A5' : '#7CC8E8', 1.2 + Math.random() * 1.4, false, 0.985);
  }
}

function guideBudget() {
  const n = state.stageNum | 0;
  if (n <= 1) return { steps: 42, dist: 250, bend: 0.55 };
  if (n === 2) return { steps: 28, dist: 165, bend: 0.4 };
  return { steps: 16, dist: 105, bend: 0.26 };
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
  const lim = guideBudget();
  let traveled = 0;
  for (let i = 0; i < lim.steps; i++) {
    const g = gravityAt(x, y);
    const x0 = x, y0 = y;
    vx += g.ax * sub;
    vy += g.ay * sub;
    x  += vx * sub;
    y  += vy * sub;
    let hitT = 2;
    for (const pl of state.planets) {
      const t = sweepCircle(x0, y0, x, y, pl.x, pl.y, pl.r);
      if (t >= 0 && t < hitT) hitT = t;
    }
    const k = Math.min(1, Math.abs(vx * g.ay - vy * g.ax) / (vx * vx + vy * vy) / FEEL.bendRate);
    if (hitT <= 1) {
      path.push({ x: x0 + (x - x0) * hitT, y: y0 + (y - y0) * hitT, k });
      break;
    }
    if (x < 0 || x > W || y < 0 || y > H) break;
    traveled += Math.hypot(x - x0, y - y0);
    let near = false;
    if (i > 8) {
      for (const pl of state.planets) {
        if (Math.hypot(pl.x - x, pl.y - y) < pl.r * 2.2) { near = true; break; }
      }
    }
    const cut = traveled > lim.dist || (i > 8 && (k > lim.bend || (near && k > lim.bend * 0.65)));
    if (i % 2 === 0 || cut) path.push({ x, y, k });
    if (cut) break;
  }
  return path;
}

// ===== Render =====
function drawNebulae() {
  if (!state.nebulae) return;
  ctx.save();
  for (const n of state.nebulae) {
    const cx = n.x * W, cy = n.y * H;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, n.r);
    grad.addColorStop(0, n.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function drawStars(time) {
  ctx.save();
  for (const s of state.stars) {
    const flicker = 0.7 + 0.3 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
    ctx.globalAlpha = s.a * flicker;
    ctx.fillStyle = '#E8ECF8';
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlanet(p, time) {
  ctx.save();
  // 個体ごとの位相（一度乱数 → 以後固定）
  if (p._phase === undefined) p._phase = Math.random() * Math.PI * 2;
  // 重力場リング
  const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.8, p.x, p.y, p.r * 4);
  grad.addColorStop(0, p.color + '55');
  grad.addColorStop(1, p.color + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
  ctx.fill();
  // 捕獲中: 外から惑星へ吸い込まれる脈動リング
  if (p.pull > 0.01) {
    for (let k = 0; k < 2; k++) {
      const ph = 1 - (((time || 0) * 2.2 + k * 0.5) % 1);
      ctx.globalAlpha = p.pull * (1 - ph) * 0.9;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5 + 2 * p.pull;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1.15 + 2.2 * ph), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // 大気のリング（薄い縁取り）
  ctx.strokeStyle = p.color + '55';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 1.16, 0, Math.PI * 2);
  ctx.stroke();
  // 本体
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
  // クリッピングしてハイライト＋大気バンドを描画
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.clip();

  // 大気バンド（横方向、ゆっくり揺らぐ）
  const t = (time || 0) * 0.6 + p._phase;
  for (let i = -2; i <= 2; i++) {
    const offset = Math.sin(t + i * 0.7) * p.r * 0.04;
    const y = p.y + i * p.r * 0.20 + offset;
    const alpha = 0.05 + 0.04 * Math.sin(i * 1.3 + t * 0.8);
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
    ctx.fillRect(p.x - p.r, y - p.r * 0.05, p.r * 2, p.r * 0.10);
  }

  // 自転を感じさせるハイライト
  const hx = p.x + Math.cos(t) * p.r * 0.32;
  const hy = p.y - p.r * 0.3 + Math.sin(t) * p.r * 0.12;
  const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, p.r * 0.45);
  hl.addColorStop(0, 'rgba(255,255,255,0.65)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  ctx.restore();
}

function drawPlayer(p) {
  ctx.save();
  // 反動: 後ろ向きに数pxオフセット（物理は不変、表示のみ）
  const kickOffset = -fx.kickback * 9;
  ctx.translate(p.x + Math.cos(p.angle) * kickOffset, p.y + Math.sin(p.angle) * kickOffset);
  ctx.rotate(p.angle);

  // スラスター炎(キックバック中は強める)
  const thrustIntensity = 0.5 + fx.kickback * 0.7;
  const thrGrad = ctx.createRadialGradient(-p.r * 0.5, 0, 0, -p.r * 0.5, 0, p.r * 1.7);
  thrGrad.addColorStop(0, `rgba(110,175,255,${thrustIntensity})`);
  thrGrad.addColorStop(1, 'rgba(110,175,255,0)');
  ctx.fillStyle = thrGrad;
  ctx.beginPath();
  ctx.arc(-p.r * 0.5, 0, p.r * 1.7, 0, Math.PI * 2);
  ctx.fill();

  // 機体アウターグロウ
  const glowGrad = ctx.createRadialGradient(p.r * 0.2, 0, 0, 0, 0, p.r * 2.4);
  glowGrad.addColorStop(0, 'rgba(255,209,120,.22)');
  glowGrad.addColorStop(1, 'rgba(255,209,120,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, p.r * 2.4, 0, Math.PI * 2);
  ctx.fill();

  // 機体本体
  ctx.fillStyle = '#FFD178';
  ctx.strokeStyle = 'rgba(255,255,255,.88)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.r, 0);
  ctx.lineTo(-p.r * 0.8, p.r * 0.65);
  ctx.lineTo(-p.r * 0.4, 0);
  ctx.lineTo(-p.r * 0.8, -p.r * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // コックピット
  ctx.fillStyle = '#7CC8E8';
  ctx.beginPath();
  ctx.arc(0, 0, p.r * 0.27, 0, Math.PI * 2);
  ctx.fill();
  // 光沢ハイライト
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.arc(-p.r * 0.04, -p.r * 0.09, p.r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // マズルフラッシュ(発射直後の閃光)
  if (fx.muzzle > 0) {
    const m = fx.muzzle;
    const flashGrad = ctx.createRadialGradient(p.r * 1.3, 0, 0, p.r * 1.3, 0, p.r * 2.8 * m);
    flashGrad.addColorStop(0, `rgba(255,255,255,${0.95 * m})`);
    flashGrad.addColorStop(0.4, `rgba(255,231,165,${0.6 * m})`);
    flashGrad.addColorStop(1, 'rgba(255,209,120,0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(p.r * 1.3, 0, p.r * 2.8 * m, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawAimLine(path, time) {
  if (!path.length || bulletInFlight() || state.watchMode || demo.active) return;
  ctx.save();
  // 加算合成で柔らかいエネルギー光に。先端へかけて消える。
  ctx.globalCompositeOperation = 'lighter';
  const phase = ((time || 0) * 0.55) % 1;
  for (let i = 0; i < path.length; i++) {
    const t = i / Math.max(1, path.length - 1);
    const fade = (1 - t) * (1 - t);
    let dist = Math.abs(t - phase);
    if (dist > 0.5) dist = 1 - dist;
    const wave = Math.max(0, 1 - dist * 5);
    const alpha = Math.min(1, 0.08 + 0.85 * fade + wave * 0.25);
    ctx.globalAlpha = alpha;
    // 引力で曲がる区間は水色で示す(実際の軌跡と同じ色言語)
    const kk = path[i].k;
    const color = t < 0.3 ? 'rgba(255,255,255,1)' : (kk > 0.3 ? 'rgba(150,225,255,1)' : 'rgba(255,209,120,1)');
    const r = 1.3 + fade * 1.1 + wave * 1.4 + kk * 1.0;
    // 柔らかいハロー(霧効果)
    const grad = ctx.createRadialGradient(path[i].x, path[i].y, 0, path[i].x, path[i].y, r * 2.6);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color.replace(',1)', ',0.4)'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(path[i].x, path[i].y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTarget(t, time) {
  ctx.save();
  if (t.hit) {
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#FFD178';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const corePulse = 1 + Math.sin(time * 4) * 0.10;
  const corePulseFast = 1 + Math.sin(time * 7) * 0.12;

  // 外側のグロー
  const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r * 2.6);
  grad.addColorStop(0, 'rgba(255, 230, 150, 0.55)');
  grad.addColorStop(1, 'rgba(255, 209, 120, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r * 2.6, 0, Math.PI * 2);
  ctx.fill();

  // 外リング: ゆっくり時計回り、チェブロン4マーク
  ctx.translate(t.x, t.y);
  ctx.save();
  ctx.rotate(time * 0.7);
  ctx.strokeStyle = 'rgba(255, 231, 165, 0.82)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, t.r * corePulse, 0, Math.PI * 2);
  ctx.stroke();
  // チェブロン
  ctx.fillStyle = '#FFE7A5';
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const cx = Math.cos(a) * t.r * corePulse;
    const cy = Math.sin(a) * t.r * corePulse;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 内リング: 反対方向、3マーク
  ctx.save();
  ctx.rotate(-time * 1.3);
  ctx.strokeStyle = 'rgba(255, 231, 165, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, t.r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 231, 165, 0.85)';
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + Math.PI / 6;
    const cx = Math.cos(a) * t.r * 0.55;
    const cy = Math.sin(a) * t.r * 0.55;
    ctx.beginPath();
    ctx.arc(cx, cy, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // コア: 白い点+脈動グロー
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 6 * corePulseFast);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
  coreGrad.addColorStop(0.6, 'rgba(255,231,165,0.45)');
  coreGrad.addColorStop(1, 'rgba(255,209,120,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 6 * corePulseFast, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBullet(b) {
  drawTrail(b.trail, 1, 1);
  ctx.save();
  // 捕獲中は惑星との間に引力の糸
  if (b.capT) {
    const p = b.capT;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.5 * (p.pull || 0);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = b.k > 0.45 ? '#9AD8FF' : '#FFD178';
  ctx.beginPath();
  ctx.arc(b.x, b.y, 11 + 4 * b.k, 0, 6.2832);
  ctx.fill();
  ctx.restore();
}

function drawBulletCore(b) {
  ctx.beginPath();
  ctx.arc(b.x, b.y, 6.2, 0, 6.2832);
  ctx.fillStyle = '#12182A';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b.x, b.y, 3.8, 0, 6.2832);
  ctx.fillStyle = b.k > 0.45 ? '#E7F7FF' : '#FFF6D0';
  ctx.fill();
}
function render(time) {
  ctx.fillStyle = '#070B1B';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  let sx = shake.x + kick.x, sy = shake.y + kick.y;
  if (tfx.stop > 0) {
    const j = Math.min(1.8, tfx.stop * 20);
    sx += (Math.random() - 0.5) * j;
    sy += (Math.random() - 0.5) * j;
  }
  if (sx > 9) sx = 9; else if (sx < -9) sx = -9;
  if (sy > 9) sy = 9; else if (sy < -9) sy = -9;
  if (sx || sy) ctx.translate(sx, sy);
  if (state.flash > 0) {
    ctx.fillStyle = 'rgba(240, 138, 138,' + Math.min(0.12, state.flash * 0.22) + ')';
    ctx.fillRect(-12, -12, W + 24, H + 24);
  }
  drawNebulae();
  drawStars(time);
  drawStardust();
  for (const p of state.planets) drawPlanet(p, time);
  for (const t of state.targets) drawTarget(t, time);
  if (state.running) {
    if (ghost) {
      const gt = ghost.clear ? ghost.life / ghost.max : 1;
      drawTrail(ghost.tr, ghost.clear ? gt * (1.2 + 0.4 * Math.sin(time * 14)) : 0.35, ghost.clear ? 1 + 0.6 * gt : 1);
    }
    drawAimLine(predictPath(), time);
    for (const b of state.bullets) drawBullet(b);
  }
  drawParticles();
  if (state.running) {
    for (const b of state.bullets) drawBulletCore(b);
    drawPlayer(state.player);
  }
  ctx.restore();
}

// ===== Game loop =====
// 物理は固定タイムステップ(1/60秒)で更新 → 軌道が決定論的になる
const FIXED_DT = 1 / 60;
let last = 0;
let physicsAccum = 0;
let simPaused = false, holdHidden = false, holdYt = false, rafId = 0, ytFramed = false;

function syncAudioOut() {
  const c = audioState.ctx;
  if (!c) return;
  try {
    if (soundBlocked()) { if (c.state === 'running') c.suspend(); }
    else if (c.state === 'suspended') c.resume();
  } catch (e) {}
}
function setPaused(next) {
  if (next === simPaused) return;
  simPaused = next;
  last = 0; // 復帰フレームの dt を 0 にして、隠れている間の時間を飛ばさない
  physicsAccum = 0;
  try { syncAudioOut(); } catch (e) {}
  if (simPaused) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  } else if (!rafId) rafId = requestAnimationFrame(loop);
}
function syncHold() { try { setPaused(holdHidden || holdYt); } catch (e) {} }
function signalYtReady() {
  if (ytFramed) return;
  ytFramed = true;
  const yt = ytApi();
  if (!yt || !yt.game || typeof yt.game.firstFrameReady !== 'function') return;
  try {
    const p = yt.game.firstFrameReady();
    const go = () => { try { yt.game.gameReady(); } catch (e) {} };
    if (p && typeof p.then === 'function') p.then(go, go);
    else go();
  } catch (e) {}
}
function hookYt() {
  const yt = ytApi();
  if (!yt || !yt.system) return;
  try {
    const v = yt.system.isAudioEnabled();
    const take = b => { ytAudioOn = !!b; try { if (b) initAudio(); syncAudioOut(); } catch (e) {} };
    if (v && typeof v.then === 'function') v.then(take, () => {});
    else take(v);
  } catch (e) {}
  try { yt.system.onAudioEnabledChange(b => { ytAudioOn = !!b; try { if (b) initAudio(); syncAudioOut(); } catch (e) {} }); } catch (e) {}
  try { yt.system.onPause(() => { holdYt = true; syncHold(); try { writeProgress(); } catch (e) {} }); } catch (e) {}
  try { yt.system.onResume(() => { holdYt = false; syncHold(); }); } catch (e) {}
  if (inPlayables()) {
    const mute = document.getElementById('mute-btn');
    if (mute) mute.hidden = true;
    const vib = document.getElementById('haptic-btn');
    if (vib) vib.hidden = false;
    try { initAudio(); syncAudioOut(); } catch (e) {}
  }
}
if (!inPlayables()) {
  try {
    document.addEventListener('visibilitychange', () => {
      try { holdHidden = !!document.hidden; syncHold(); } catch (e) {}
    });
  } catch (e) {}
}

function loop(ts) {
  rafId = 0;
  if (simPaused) return;
  const frameDt = last === 0 ? 0 : Math.min(0.1, (ts - last) / 1000);
  last = ts;
  // ヒットストップは固定ステップを足さない（dtは変えない）。揺れは描画だけ。
  let worldDt = frameDt * timeScale();
  if (tfx.stop > 0) { tfx.stop -= frameDt; worldDt = 0; }
  tfx.pull = Math.max(0, tfx.pull - frameDt * 2.5);
  tfx.slow = Math.max(0, tfx.slow - frameDt * 0.9);
  if (ghost && ghost.clear && (ghost.life -= frameDt) <= 0) ghost = null;
  for (const p of state.planets) if (p.pull) p.pull = Math.max(0, p.pull - frameDt * 1.5);
  if (state.running) {
    physicsAccum += worldDt;
    if (physicsAccum > FIXED_DT * 6) physicsAccum = FIXED_DT * 6;
    while (physicsAccum >= FIXED_DT && tfx.stop <= 0) {
      physicsAccum -= FIXED_DT;
      if (demo.active) applyDemo(FIXED_DT);
      else if (!state.lockInput) applyInput(FIXED_DT);
      updateBullets(FIXED_DT);
    }
    state.flash = Math.max(0, state.flash - frameDt);
  }
  // パーティクルは世界時間(ヒットストップで止まり、余韻でスロー)。シェイク・発射演出は実時間
  updateParticles(worldDt);
  updateStardust(frameDt);
  updateShake(frameDt);
  fx.muzzle = Math.max(0, fx.muzzle - frameDt * 6);
  fx.kickback = Math.max(0, fx.kickback - frameDt * 5);
  // ブースター粒子（ゲーム中は常に薄く出す）
  if (state.running) spawnThrustParticles(state.player, frameDt);
  if (state.running && !bulletInFlight()) stepPregen(); // 次ステージの先行生成(1試行/フレーム)
  render(ts / 1000);
  signalYtReady();
  rafId = requestAnimationFrame(loop);
}
rafId = requestAnimationFrame(loop);
if (!inPlayables()) {
  try { if (document.hidden) { holdHidden = true; syncHold(); } } catch (e) {}
}

// ===== Result overlay =====
const resultOverlay = document.getElementById('result-overlay');
const resultTitle = document.getElementById('result-title');
const resultSub = document.getElementById('result-sub');
let lastResult = null;
function paintResult() {
  if (!lastResult) return;
  resultTitle.textContent = t(lastResult.titleKey);
  resultSub.textContent = lastResult.subKey ? t(lastResult.subKey) : '';
}
function showResult(kind, titleKey, subKey, ms) {
  lastResult = { kind, titleKey, subKey: subKey || '' };
  paintResult();
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
const NUDGE = 0.012;
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') return;
  if (state.lockInput || demo.active || state.watchMode) return;
  if (KEY_MAP[e.key]) { state.input[KEY_MAP[e.key]] = true; e.preventDefault(); }
  else if (e.key === 'ArrowUp') { state.player.angle -= NUDGE; e.preventDefault(); }
  else if (e.key === 'ArrowDown') { state.player.angle += NUDGE; e.preventDefault(); }
  else if (e.key === ' ' || e.key === 'Enter') { fire(); e.preventDefault(); }
});
window.addEventListener('keyup', e => {
  if (KEY_MAP[e.key]) { state.input[KEY_MAP[e.key]] = false; e.preventDefault(); }
});
const aimDrag = { id: -1, x: 0, y: 0, angle: 0 };
function aimBlocked() { return !state.running || state.lockInput || demo.active || state.watchMode || bulletInFlight(); }
canvas.addEventListener('pointerdown', e => {
  if (aimBlocked() || (e.target.closest && e.target.closest('button'))) return;
  aimDrag.id = e.pointerId;
  aimDrag.x = e.clientX; aimDrag.y = e.clientY;
  aimDrag.angle = state.player.angle;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== aimDrag.id || aimBlocked()) return;
  state.player.angle = aimDrag.angle + aimCurve(e.clientX - aimDrag.x);
});
function endAimDrag(e) { if (e.pointerId === aimDrag.id) aimDrag.id = -1; }
canvas.addEventListener('pointerup', endAimDrag);
canvas.addEventListener('pointercancel', endAimDrag);

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

function setHudForPlay() {
  document.querySelector('.hud-right').style.display = '';
  document.getElementById('retry-btn').style.display = '';
  document.getElementById('demo-btn').style.display = '';
  document.getElementById('exit-btn').style.display = 'none';
}

function setHudForWatch() {
  document.querySelector('.hud-right').style.display = 'none';
  document.getElementById('retry-btn').style.display = 'none';
  document.getElementById('demo-btn').style.display = 'none';
  document.getElementById('exit-btn').style.display = '';
}

function startGame() {
  pre.n = 0; pre.def = pre.it = null;
  uiMode = 'play';
  endView = null;
  state.stageNum = 1;
  state.totalShots = 0;
  state.stageShots = 0;
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
  setHudForPlay();
  updateHUD();
  updateFireBtnState();
}

function startWatchMode() {
  pre.n = 0; pre.def = pre.it = null;
  uiMode = 'play';
  endView = null;
  clearWatchTimers();
  state.stageNum = 1;
  state.totalShots = 0;
  state.stageShots = 0;
  state.demoUsed = false; // 観るだけモードでは demoUsed の概念は使わない
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
  setHudForWatch();
  updateHUD();
  // 盤面をじっくり眺めてからデモ開始
  watchSetTimeout(() => startDemo(), 2500);
}

let uiMode = 'title';
let endView = null;
function renderTitle() {
  overlayTitle.innerHTML = '<div class="title-en">' + t('titleMain') + '</div><div class="title-ja">' + t('titleSub') + '</div><div class="title-divider"></div>';
  overlaySub.innerHTML = t('blurb');
  overlayHint.textContent = t('hint');
  overlayStartBtn.textContent = t('start');
  const watch = document.getElementById('watch-btn');
  if (watch) watch.textContent = t('watch');
  refreshBestDisplay();
}
function renderEnd() {
  if (!endView) return;
  const v = endView;
  overlayTitle.innerHTML = v.demoUsed
    ? '<div class="title-en">' + t('cleared') + '</div><div class="title-ja" style="color:rgba(122,134,160,.7);">' + t('unranked') + '</div>'
    : '<div class="title-en">' + t('gameClear') + '</div>';
  let sub = v.demoUsed ? t('endDemo', { n: v.shots }) : t('endShots', { n: v.shots });
  if (!v.demoUsed) {
    if (v.isNewBest && v.prevBest != null) sub += t('bestDelta', { a: v.prevBest, b: v.shots });
    else if (v.isNewBest) sub += t('newBest');
    else if (v.prevBest != null && v.shots === v.prevBest) sub += t('tiedBest');
    else if (v.prevBest != null) sub += t('closeBy', { n: v.shots - v.prevBest });
  }
  overlaySub.innerHTML = sub;
  overlayBest.style.display = 'none';
  overlayHint.textContent = t('againAsk');
  overlayStartBtn.textContent = t('again');
}
function applyI18n() {
  document.documentElement.lang = lang;
  document.documentElement.classList.remove('i18n-wait');
  document.title = t('docTitle');
  const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (meta) meta.setAttribute('content', t('appTitle'));
  const aria = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    const s = t(key);
    el.setAttribute('aria-label', s);
    if (el.hasAttribute('title')) el.title = s;
  };
  aria('retry-btn', 'retry');
  aria('demo-btn', 'demo');
  aria('exit-btn', 'toTitle');
  const move = { left: 'moveL', right: 'moveR', rotL: 'rotL', rotR: 'rotR' };
  document.querySelectorAll('[data-input]').forEach(btn => {
    const key = move[btn.dataset.input];
    if (key) btn.setAttribute('aria-label', t(key));
  });
  const fireEl = document.getElementById('fire-btn');
  if (fireEl) fireEl.textContent = t('fire');
  const stageLabel = document.getElementById('stage-label');
  if (stageLabel) stageLabel.textContent = t('stage');
  const shotsLabel = document.getElementById('shots-label');
  if (shotsLabel) shotsLabel.textContent = t('shots');
  const pre = document.getElementById('best-pre');
  if (pre) pre.textContent = t('bestPre');
  const post = document.getElementById('best-post');
  if (post) post.textContent = t('bestPost');
  try { muteLabel(); hapticLabel(); updatePace(); } catch (e) {}
  if (uiMode === 'end') renderEnd();
  else if (uiMode !== 'play') renderTitle();
  if (lastResult && resultOverlay.classList.contains('show')) paintResult();
}
function bootLang() {
  const forced = queryLang();
  if (forced) { lang = forced; applyI18n(); return; }
  if (inPlayables()) {
    lang = 'en'; // SDK の返答まで英語。navigator.language は Playables では読まない
    applyI18n();
    let pending = null;
    try { pending = ytApi().system.getLanguage(); } catch (e) {}
    const take = tag => { const next = pickLang(tag); if (next !== lang) { lang = next; applyI18n(); } };
    if (pending && typeof pending.then === 'function') pending.then(take, () => {});
    else if (pending != null) take(pending);
    return;
  }
  let tag = 'en';
  try { tag = navigator.language || 'en'; } catch (e) {}
  lang = pickLang(tag);
  applyI18n();
}
function resetOverlayToTitle() {
  uiMode = 'title';
  endView = null;
  renderTitle();
}

function exitToTitle() {
  pre.n = 0; pre.def = pre.it = null;
  clearWatchTimers();
  state.running = false;
  state.watchMode = false;
  state.lockInput = false;
  demo.active = false;
  state.bullets = [];
  controlsEl.style.display = 'none';
  setHudForPlay();
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
  uiMode = 'end';
  endView = { demoUsed: state.demoUsed, shots, isNewBest, prevBest };
  renderEnd();
  overlay.classList.remove('hidden');
}

overlayStartBtn.addEventListener('click', startGame);
document.getElementById('watch-btn').addEventListener('click', startWatchMode);
document.getElementById('exit-btn').addEventListener('click', exitToTitle);
document.getElementById('mute-btn').addEventListener('click', () => setMuted(!audioMuted));
document.getElementById('haptic-btn').addEventListener('click', () => {
  FEEL.haptics = !FEEL.haptics;
  hapticLabel();
});
bootLang();
hookYt();
loadProgress();

document.getElementById('retry-btn').addEventListener('click', () => {
  if (!state.running || state.lockInput || demo.active || !state.currentDef) return;
  applyStage(state.currentDef);
  updateFireBtnState();
});

document.getElementById('demo-btn').addEventListener('click', startDemo);

function refitStage() {
  const sx = state.fitW ? W / state.fitW : 0;
  const sy = state.fitH ? H / state.fitH : 0;
  if (!(sx > 0) || !(sy > 0)) { applyStage(state.currentDef); return; }
  state.player.x *= sx; state.player.y *= sy;
  for (const p of state.planets) { p.x *= sx; p.y *= sy; }
  for (const t of state.targets) { t.x *= sx; t.y *= sy; }
  for (const b of state.bullets) { b.x *= sx; b.y *= sy; }
  clampPlayer();
  state.fitW = W; state.fitH = H;
}
window.addEventListener('resize', () => {
  if (W < 2 || H < 2) return;
  if (state.running && state.currentDef) refitStage();
  else initTitleBg();
});
