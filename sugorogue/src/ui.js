// ===== DOM-based UI: HUD / hand / toast / result overlay =====
import { state } from './state.js';
import { DIE_DEFS, rollDie } from './dice.js';

const els = {};
let onRollHandler = null;
let onToggleHandler = null;

export function setupUi(handlers) {
  els.hp = document.getElementById('hp-value');
  els.hpMax = document.getElementById('hp-max');
  els.coin = document.getElementById('coin-value');
  els.lap = document.getElementById('lap-value');
  els.lapTarget = document.getElementById('lap-target');
  els.deckCount = document.getElementById('deck-count');
  els.discardCount = document.getElementById('discard-count');
  els.hand = document.getElementById('hand');
  els.rollBtn = document.getElementById('roll-btn');
  els.rollPreview = document.getElementById('roll-preview');
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
  els.rollBtn.addEventListener('click', () => onRollHandler && onRollHandler());
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

export function renderHand(onToggle, onRoll) {
  onToggleHandler = onToggle;
  onRollHandler = onRoll;
  els.hand.innerHTML = '';
  state.hand.forEach((dieId, i) => {
    const def = DIE_DEFS[dieId];
    const btn = document.createElement('button');
    btn.className = 'die';
    if (state.selected.includes(i)) btn.classList.add('selected');
    if (state.busy) btn.classList.add('disabled');
    btn.style.borderColor = def.color;
    btn.innerHTML = `
      <span class="die-icon" style="color:${def.color}">⬢</span>
      <span class="die-name" style="color:${def.color}">${def.name}</span>
      <span class="die-label">${def.label}</span>
    `;
    btn.addEventListener('click', () => {
      if (state.busy) return;
      onToggle(i);
    });
    els.hand.appendChild(btn);
  });
  refreshRollButton();
}

function refreshRollButton() {
  if (state.busy) {
    els.rollBtn.disabled = true;
    return;
  }
  const sel = state.selected;
  if (sel.length === 0) {
    els.rollBtn.disabled = true;
    els.rollPreview.textContent = 'サイコロを選んでロール';
    els.rollBtn.textContent = 'ロール！';
    return;
  }
  // 合計の min/max 範囲
  let min = 0, max = 0;
  for (const i of sel) {
    const def = DIE_DEFS[state.hand[i]];
    min += Math.min(...def.sides);
    max += Math.max(...def.sides);
  }
  els.rollBtn.disabled = false;
  els.rollPreview.textContent = sel.length === 1
    ? `予想: ${min === max ? min : `${min}〜${max}`}`
    : `${sel.length}個 / 予想: ${min === max ? min : `${min}〜${max}`} 進む`;
  els.rollBtn.textContent = 'ロール！';
}

// ===== ロール演出 =====
// 選んだサイコロ全てを振り、各出目と合計値をコールバックに渡す
export function animateRoll(handIndexes, defs, onFinish) {
  const dieEls = els.hand.querySelectorAll('.die');
  // 選択以外を無効化
  dieEls.forEach((d, idx) => {
    if (!handIndexes.includes(idx)) d.classList.add('disabled');
  });
  els.rollBtn.disabled = true;

  const interval = 55;
  const baseDuration = 600; // 各サイコロのロール時間
  const stagger = 100;       // 開始ずらし

  const finals = new Array(handIndexes.length);
  let completed = 0;

  handIndexes.forEach((handIdx, i) => {
    const def = defs[i];
    const target = dieEls[handIdx];
    if (!target) {
      finals[i] = rollDie(def);
      completed++;
      if (completed === handIndexes.length) finalize();
      return;
    }
    target.classList.add('rolling');
    const nameEl = target.querySelector('.die-name');
    const labelEl = target.querySelector('.die-label');
    const isFixed = def.sides.length === 1;
    const duration = isFixed ? 350 : baseDuration;
    const startDelay = i * stagger;

    setTimeout(() => {
      let elapsed = 0;
      const ticker = setInterval(() => {
        elapsed += interval;
        nameEl.textContent = String(rollDie(def));
        if (elapsed >= duration) {
          clearInterval(ticker);
          const v = rollDie(def);
          finals[i] = v;
          nameEl.textContent = String(v);
          labelEl.textContent = '出目!';
          target.classList.remove('rolling');
          target.classList.add('rolled');
          completed++;
          if (completed === handIndexes.length) {
            setTimeout(finalize, 380);
          }
        }
      }, interval);
    }, startDelay);
  });

  function finalize() {
    const sum = finals.reduce((a, b) => a + b, 0);
    onFinish(finals, sum);
  }
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
