// ===== Dice definitions =====
// 各サイコロは ID で参照され、sides 配列から出目をランダム抽選する。

function range(a, b) {
  const arr = [];
  for (let i = a; i <= b; i++) arr.push(i);
  return arr;
}

export const DIE_DEFS = {
  d4: {
    id: 'd4',
    name: 'd4',
    label: '1〜4',
    sides: [1, 2, 3, 4],
    color: '#6CC79E',
    desc: '小さめ、堅実',
  },
  d6: {
    id: 'd6',
    name: 'd6',
    label: '1〜6',
    sides: [1, 2, 3, 4, 5, 6],
    color: '#1FB3A5',
    desc: '基本のサイコロ',
  },
  d8: {
    id: 'd8',
    name: 'd8',
    label: '1〜8',
    sides: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#5BA0E5',
    desc: '範囲広め',
  },
  d12: {
    id: 'd12',
    name: 'd12',
    label: '1〜12',
    sides: range(1, 12),
    color: '#9B6FE0',
    desc: '一周ぶん狙える',
  },
  d20: {
    id: 'd20',
    name: 'd20',
    label: '1〜20',
    sides: range(1, 20),
    color: '#FF6B6B',
    desc: '博打、出目最大',
  },
  fixed3: {
    id: 'fixed3',
    name: '確定',
    label: 'いつも3',
    sides: [3],
    color: '#F7C94B',
    desc: '必ず3',
  },
};

export const STARTER_DECK = [
  'd6', 'd6', 'd6', 'd6',
  'd4', 'd4',
  'd8', 'd8',
  'd20',
  'fixed3',
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

// 手札の handIndex 番目をプレイ → 捨て札に積む。プレイした die def を返す。
export function playFromHand(state, handIndex) {
  if (handIndex < 0 || handIndex >= state.hand.length) return null;
  const id = state.hand.splice(handIndex, 1)[0];
  state.discard.push(id);
  return DIE_DEFS[id];
}

// ロール: ランダムに sides から1つ選ぶ
export function rollDie(def) {
  return def.sides[Math.floor(Math.random() * def.sides.length)];
}
