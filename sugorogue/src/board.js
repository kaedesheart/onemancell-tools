// ===== Board & squares =====

export const BOARD_LENGTH = 12;

export const SQUARE_TYPES = {
  start: {
    id: 'start',
    name: 'スタート',
    icon: '🏁',
    color: '#FF6B6B',
    effect: null, // 通過/着地時は処理しない（lap管理は別）
  },
  empty: {
    id: 'empty',
    name: '空きマス',
    icon: '·',
    color: '#B7C0CC',
    effect: null,
  },
  coin: {
    id: 'coin',
    name: 'コイン',
    icon: '💰',
    color: '#F7C94B',
    effect: (s) => { s.coins += 5; return { type: 'coin', text: '+5 コイン' }; },
  },
  heal: {
    id: 'heal',
    name: '回復',
    icon: '💚',
    color: '#6CC79E',
    effect: (s) => {
      const before = s.hp;
      s.hp = Math.min(s.maxHp, s.hp + 3);
      const gained = s.hp - before;
      return { type: 'heal', text: `+${gained} HP` };
    },
  },
  enemy: {
    id: 'enemy',
    name: 'エネミー',
    icon: '👾',
    color: '#E85B7E',
    effect: (s) => { s.hp = Math.max(0, s.hp - 2); return { type: 'damage', text: '−2 HP' }; },
  },
};

// 12マスを配分: スタート×1 + 空き×4 + コイン×3 + 回復×2 + エネミー×2
function getDistribution() {
  const others = [
    'empty', 'empty', 'empty', 'empty',
    'coin', 'coin', 'coin',
    'heal', 'heal',
    'enemy', 'enemy',
  ];
  // start以外をシャッフル
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return ['start', ...others];
}

export function generateBoard(length = BOARD_LENGTH) {
  const dist = getDistribution();
  return dist.map((typeId, i) => ({
    index: i,
    type: typeId,
    flash: 0, // 着地時の演出フラグ
  }));
}

export function getSquareDef(square) {
  return SQUARE_TYPES[square.type];
}

// プレイヤーが land したマスの効果を発動。lap カウントもここで処理。
export function landOn(state, newPosition) {
  // 周回検出: 0以上→0以下/N以上 wrap
  while (newPosition >= state.board.length) {
    newPosition -= state.board.length;
    state.lap += 1;
  }
  state.position = newPosition;
  const square = state.board[newPosition];
  square.flash = 1;
  const def = SQUARE_TYPES[square.type];
  if (def.effect) {
    return def.effect(state);
  }
  return null;
}
