// ===== Entry point =====
import { state, startNewRun } from './state.js';
import { drawHand, playFromHand, rollDie, DIE_DEFS } from './dice.js';
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
    renderHand(handlePlayDie);
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

function handlePlayDie(handIndex) {
  if (state.busy) return;
  const dieId = state.hand[handIndex];
  const def = DIE_DEFS[dieId];
  state.busy = true;

  // ロール演出: カードがガタガタ揺れて数字がカチカチ変わる → 確定
  animateRoll(handIndex, def, (finalValue) => {
    // 演出後に実際にプレイ → 移動
    playFromHand(state, handIndex);
    showToast(`${def.name} → ${finalValue}`);

    const total = state.board.length;
    const target = (state.position + finalValue) % total;
    const crossings = Math.floor((state.position + finalValue) / total);

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
      renderHand(handlePlayDie);
    });
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

// rollDie を import 用に再エクスポート（ui.js のロール演出で使用）
export { rollDie };
