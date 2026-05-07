// ===== Canvas rendering =====
import { state } from './state.js';
import { SQUARE_TYPES } from './board.js';

let canvas, ctx, dpr;
let W = 0, H = 0;

export function setupCanvas() {
  canvas = document.getElementById('board');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  W = rect.width;
  H = rect.height;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ピース表示位置（補間値、後でアニメ化しやすいように分離）
let playerVisualIndex = 0;
let playerAnimating = false;

export function getPlayerVisualIndex() { return playerVisualIndex; }
export function setPlayerVisualIndex(i) { playerVisualIndex = i; }

// 1秒で1マス進むペース
const STEP_DURATION_MS = 320;

export function animatePlayerTo(targetIndex, onArrive) {
  const board = state.board;
  const total = board.length;
  // playerVisualIndex から targetIndex まで前進する（lap またぎあり）
  // ステップごとに1マスずつ進める
  const steps = [];
  let cur = playerVisualIndex;
  while (cur !== targetIndex) {
    cur = (cur + 1) % total;
    steps.push(cur);
  }
  if (steps.length === 0) {
    onArrive && onArrive();
    return;
  }
  playerAnimating = true;
  let i = 0;
  const stepNext = () => {
    if (i >= steps.length) {
      playerAnimating = false;
      onArrive && onArrive();
      return;
    }
    const from = Math.floor(playerVisualIndex + 1e-6) % total;
    const to = steps[i];
    const start = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / STEP_DURATION_MS);
      const eased = easeOutCubic(t);
      playerVisualIndex = lerpAroundLoop(from, to, eased, total);
      if (t < 1) requestAnimationFrame(tick);
      else {
        playerVisualIndex = to;
        i++;
        stepNext();
      }
    };
    requestAnimationFrame(tick);
  };
  stepNext();
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function lerpAroundLoop(from, to, t, total) {
  // 通常は (to - from) は 1 のはずだが、wrap の場合 from = total-1, to = 0 など
  let delta = to - from;
  if (delta < 0) delta += total;
  return (from + delta * t) % total;
}

// ===== Drawing =====
function squareCenter(i, total) {
  const cx = W / 2;
  const cy = H / 2;
  const margin = 28;
  const radius = Math.min(W, H) / 2 - margin;
  // 上中央(12時)を index 0 に。時計回りで配置。
  const angle = -Math.PI / 2 + (i / total) * Math.PI * 2;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

export function draw() {
  ctx.clearRect(0, 0, W, H);
  if (!state.board.length) return;

  const total = state.board.length;

  // 接続線（淡い）
  ctx.save();
  ctx.strokeStyle = 'rgba(26,39,64,0.10)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < total; i++) {
    const a = squareCenter(i, total);
    if (i === 0) ctx.moveTo(a.x, a.y);
    else ctx.lineTo(a.x, a.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // マス
  for (let i = 0; i < total; i++) {
    const sq = state.board[i];
    const def = SQUARE_TYPES[sq.type];
    const p = squareCenter(i, total);
    const isCurrent = Math.round(playerVisualIndex) === i;
    drawSquare(p.x, p.y, def, isCurrent, sq.flash);
    if (sq.flash > 0) sq.flash = Math.max(0, sq.flash - 0.04);
  }

  // プレイヤーピース
  drawPlayer();
}

function drawSquare(x, y, def, isCurrent, flash) {
  const baseR = 22;
  const r = isCurrent ? baseR + 3 : baseR;
  const flashBoost = flash * 6;
  // 影
  ctx.save();
  ctx.fillStyle = 'rgba(26,39,64,0.10)';
  ctx.beginPath();
  ctx.arc(x, y + 3, r + flashBoost, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 本体
  ctx.save();
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(x, y, r + flashBoost, 0, Math.PI * 2);
  ctx.fill();
  // 枠線
  ctx.strokeStyle = '#1A2740';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // フラッシュ時のリング
  if (flash > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${flash})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r + flashBoost + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // アイコン
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${def.icon === '·' ? 24 : 20}px "M PLUS Rounded 1c", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.icon, x, y + 1);
  ctx.restore();
}

function drawPlayer() {
  const total = state.board.length;
  const p = squareCenter(playerVisualIndex, total);
  // 体（やや上にホバー）
  const hop = playerAnimating ? Math.abs(Math.sin((playerVisualIndex % 1) * Math.PI)) * 8 : 0;
  const x = p.x;
  const y = p.y - 4 - hop;
  // 影
  ctx.save();
  ctx.fillStyle = 'rgba(26,39,64,0.20)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 14, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 体本体
  ctx.save();
  ctx.fillStyle = '#1FB3A5';
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1A2740';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // 顔（目）
  ctx.fillStyle = '#1A2740';
  ctx.beginPath();
  ctx.arc(x - 4, y - 1, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 1, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // にっこり
  ctx.strokeStyle = '#1A2740';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + 2, 3.5, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}
