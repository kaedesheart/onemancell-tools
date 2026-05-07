// ===== DOM-based UI: HUD / hand / toast / result overlay =====
import { state } from './state.js';
import { CARD_DEFS } from './cards.js';

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
  state.hand.forEach((cardId, i) => {
    const def = CARD_DEFS[cardId];
    const btn = document.createElement('button');
    btn.className = 'card' + (def.special ? ' special' : '');
    if (state.busy) btn.classList.add('disabled');
    btn.innerHTML = `
      <span class="card-icon">${def.icon}</span>
      <span class="card-value">${def.display}</span>
      <span class="card-name">${def.name}</span>
    `;
    btn.addEventListener('click', () => {
      if (state.busy) return;
      onPlay(i);
    });
    els.hand.appendChild(btn);
  });
}

let toastTimer = null;
export function showToast(text, kind = '') {
  els.toast.textContent = text;
  els.toast.className = 'toast' + (kind ? ' ' + kind : '');
  els.toast.hidden = false;
  // reflow → animate
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
