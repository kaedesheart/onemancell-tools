// ===== Entry point =====
import { state, startNewRun } from './state.js';
import { drawHand, playFromHand, getMoveValue } from './cards.js';
import { SQUARE_TYPES } from './board.js';
import { setupCanvas, draw, animatePlayerTo, setPlayerVisualIndex } from './render.js';
import {
  setupUi, showGameScreen, showTitleScreen,
  updateHud, renderHand, showToast,
  showResult, hideResult,
} from './ui.js';

setupUi({
  onStart: () => {
    startNewRun();
    showGameScreen();
    setupCanvas();
    setPlayerVisualIndex(0);
    updateHud();
    renderHand(handlePlayCard);
    requestAnimationFrame(loop);
  },
  onResultBtn: () => {
    hideResult();
    showTitleScreen();
    state.screen = 'title';
  },
});

function loop() {
  draw();
  if (state.screen !== 'title') requestAnimationFrame(loop);
}

function handlePlayCard(handIndex) {
  if (state.busy) return;
  const def = playFromHand(state, handIndex);
  if (!def) return;
  const distance = getMoveValue(def);
  state.busy = true;
  renderHand(handlePlayCard); // disabled 表示で再描画

  const total = state.board.length;
  const target = (state.position + distance) % total;
  const crossings = Math.floor((state.position + distance) / total);

  showToast(`${def.name} ${def.icon}`, '');

  animatePlayerTo(target, () => {
    state.position = target;
    state.lap += crossings;
    state.board[target].flash = 1;
    applySquareEffect(target);
    updateHud();
    if (state.hp <= 0) return endRun('fail', '力尽きた…', `${state.lap}周進みました。コイン: ${state.coins}`);
    if (state.lap >= state.targetLaps) return endRun('clear', 'クリア！', `${state.targetLaps}周達成！コイン: ${state.coins}`);
    drawHand(state);
    state.busy = false;
    updateHud();
    renderHand(handlePlayCard);
  });
}

function applySquareEffect(idx) {
  const sq = state.board[idx];
  const def = SQUARE_TYPES[sq.type];
  if (!def.effect) return;
  const result = def.effect(state);
  if (result && result.text) showToast(result.text, result.type);
}

function endRun(kind, title, text) {
  state.screen = kind === 'clear' ? 'win' : 'gameover';
  state.busy = true;
  setTimeout(() => showResult(kind, title, text, 'タイトルへ'), 700);
}
