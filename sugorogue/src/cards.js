// ===== Card definitions =====
// 各カードは ID で参照される。実体は CARD_DEFS から取り出す。

export const CARD_DEFS = {
  step: {
    id: 'step',
    name: '歩',
    display: '+1',
    icon: '🚶',
    move: 1,
    kind: 'move',
  },
  run: {
    id: 'run',
    name: '走',
    display: '+2',
    icon: '🏃',
    move: 2,
    kind: 'move',
  },
  jump: {
    id: 'jump',
    name: '跳',
    display: '+3',
    icon: '🦘',
    move: 3,
    kind: 'move',
  },
  fate: {
    id: 'fate',
    name: '縁',
    display: '1〜3',
    icon: '🎲',
    move: () => 1 + Math.floor(Math.random() * 3),
    kind: 'random',
    special: true,
  },
};

export const STARTER_DECK = [
  'step', 'step', 'step', 'step',
  'run',  'run',  'run',
  'jump', 'jump',
  'fate',
];

// ===== Deck operations =====
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function reshuffleIfNeeded(state) {
  if (state.deck.length > 0) return;
  state.deck = shuffle([...state.discard]);
  state.discard = [];
}

export function drawOne(state) {
  reshuffleIfNeeded(state);
  if (state.deck.length === 0) return null;
  return state.deck.shift();
}

export function drawHand(state) {
  while (state.hand.length < state.handLimit) {
    const c = drawOne(state);
    if (!c) break;
    state.hand.push(c);
  }
}

// 手札の handIndex 番目をプレイ → 捨て札に積む。プレイしたカード def を返す。
export function playFromHand(state, handIndex) {
  if (handIndex < 0 || handIndex >= state.hand.length) return null;
  const id = state.hand.splice(handIndex, 1)[0];
  state.discard.push(id);
  return CARD_DEFS[id];
}

export function getMoveValue(def) {
  return typeof def.move === 'function' ? def.move() : def.move;
}
