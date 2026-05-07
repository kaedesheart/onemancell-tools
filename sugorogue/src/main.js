// ===== Entry point =====
import { state, startNewRun } from './state.js';
import { drawHand, DIE_DEFS } from './dice.js';
import { SQUARE_TYPES } from './board.js';
import { setupCanvas, draw, animatePlayerTo, setPlayerVisualIndex } from './render.js';
import {
  setupUi, showGameScreen, showTitleScreen,
  updateHud, renderHand, showToast,
  showResult, hideResult, animateRoll,
} from './ui.js';

setupUi({
  onStart: () => {
    startNewRun();
    showGameScreen();
    setupCanvas();
    setPlayerVisualIndex(0);
    updateHud();
    renderHand(handleToggleSelect, handleRoll);
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

function handleToggleSelect(handIndex) {
  if (state.busy) return;
  const idx = state.selected.indexOf(handIndex);
  if (idx >= 0) state.selected.splice(idx, 1);
  else state.selected.push(handIndex);
  renderHand(handleToggleSelect, handleRoll);
}

function handleRoll() {
  if (state.busy || state.selected.length === 0) return;
  state.busy = true;

  // sort indexes ascending so removal order is consistent
  const indexes = [...state.selected].sort((a, b) => a - b);
  const defs = indexes.map(i => DIE_DEFS[state.hand[i]]);

  animateRoll(indexes, defs, (results, sum) => {
    // 振ったサイコロを捨て札へ移動（後ろから消すことで index ずれ防止）
    for (let i = indexes.length - 1; i >= 0; i--) {
      const id = state.hand.splice(indexes[i], 1)[0];
      state.discard.push(id);
    }
    state.selected = [];

    showToast(`合計 ${sum} 進む！`);

    const total = state.board.length;
    const target = (state.position + sum) % total;
    const crossings = Math.floor((state.position + sum) / total);

    setTimeout(() => {
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
        renderHand(handleToggleSelect, handleRoll);
      });
    }, 200);
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
