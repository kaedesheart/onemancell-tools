// ===== DOM-based UI: HUD / hand / toast / result overlay =====
import { state } from './state.js';
import { DIE_DEFS, rollDie } from './dice.js';

const els = {};

export function setupUi(handlers) {
  els.hp = document.getElementById('hp-value');
  els.hpMax = document.getElementById('hp-max');
  els.coin = document.getElementById('coin-value');
  els.lap = document.getElementById('lap-value');
  els.lapTarget = document.getElementById('lap-target');
  els.deckCount = document.getElementById('deck-count');
  els.discardCount = document.getElementById('discard-count');
  els.hand = document.getElementById('hand');
  els.titleScreen = document.getElementById('title-screen');
  els.gameScreen = document.getElementById('game-screen');
  els.startBtn = document.getElementById('start-btn');
  els.toast = document.getElementById('toast');
  els.resultOverlay = document.getElementById('result-overlay');
  els.resultTitle = document.getElementById('result-title');
  els.resultText = document.getElementById('result-text');
  els.resultBtn = document.getElementById('result-btn');

  els.startBtn.addEventListener('click', () => handlers.onStart());
  els.resultBtn.addEventListener('click', () => handlers.onResultBtn());
}

export function showGameScreen() {
  els.titleScreen.hidden = true;
  els.gameScreen.hidden = false;
}

export function showTitleScreen() {
  els.titleScreen.hidden = false;
  els.gameScreen.hidden = true;
}

export function updateHud() {
  els.hp.textContent = state.hp;
  els.hpMax.textContent = state.maxHp;
  els.coin.textContent = state.coins;
  els.lap.textContent = state.lap;
  els.lapTarget.textContent = state.targetLaps;
  els.deckCount.textContent = state.deck.length;
  els.discardCount.textContent = state.discard.length;
}

export function renderHand(onPlay) {
  els.hand.innerHTML = '';
  state.hand.forEach((dieId, i) => {
    const def = DIE_DEFS[dieId];
    const btn = document.createElement('button');
    btn.className = 'die';
    btn.style.borderColor = def.color;
    if (state.busy) btn.classList.add('disabled');
    btn.innerHTML = `
      <span class="die-icon" style="color:${def.color}">⬢</span>
      <span class="die-name" style="color:${def.color}">${def.name}</span>
      <span class="die-label">${def.label}</span>
    `;
    btn.addEventListener('click', () => {
      if (state.busy) return;
      onPlay(i);
    });
    els.hand.appendChild(btn);
  });
}

// ===== ロール演出 =====
// 選ばれたサイコロをカチカチ揺らして出目を確定 → コールバックに finalValue
export function animateRoll(handIndex, def, onFinish) {
  const dieEls = els.hand.querySelectorAll('.die');
  const target = dieEls[handIndex];
  if (!target) {
    onFinish(rollDie(def));
    return;
  }
  // 他のサイコロは無効化
  dieEls.forEach((d, idx) => {
    if (idx !== handIndex) d.classList.add('disabled');
  });
  target.classList.add('rolling');

  const nameEl = target.querySelector('.die-name');
  const labelEl = target.querySelector('.die-label');
  const iconEl = target.querySelector('.die-icon');

  // 確定サイコロは演出を短縮
  const isFixed = def.sides.length === 1;
  const totalMs = isFixed ? 350 : 700;
  const interval = 55;
  let elapsed = 0;
  const ticker = setInterval(() => {
    elapsed += interval;
    nameEl.textContent = String(rollDie(def));
    if (elapsed >= totalMs) {
      clearInterval(ticker);
      const finalValue = rollDie(def);
      nameEl.textContent = String(finalValue);
      labelEl.textContent = '出目!';
      iconEl.textContent = '⬢';
      target.classList.remove('rolling');
      target.classList.add('rolled');
      // 出目を一拍見せてから次へ
      setTimeout(() => onFinish(finalValue), 380);
    }
  }, interval);
}

let toastTimer = null;
export function showToast(text, kind = '') {
  els.toast.textContent = text;
  els.toast.className = 'toast' + (kind ? ' ' + kind : '');
  els.toast.hidden = false;
  void els.toast.offsetWidth;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => { els.toast.hidden = true; }, 250);
  }, 1100);
}

export function showResult(kind, title, text, btnLabel) {
  els.resultOverlay.hidden = false;
  const card = els.resultOverlay.querySelector('.result-card');
  card.classList.remove('clear', 'fail');
  card.classList.add(kind);
  els.resultTitle.textContent = title;
  els.resultText.textContent = text;
  els.resultBtn.textContent = btnLabel;
}

export function hideResult() {
  els.resultOverlay.hidden = true;
}
