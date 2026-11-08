export const CHAPTERS = [
  { name: "小さな荒野", die: 20, scale: 1, length: 110, near: 1, damage: 12 },
  {
    name: "広がる裂け目",
    die: 200,
    scale: 10,
    length: 1100,
    near: 10,
    damage: 14,
  },
  {
    name: "千の平原",
    die: 2000,
    scale: 100,
    length: 11000,
    near: 100,
    damage: 16,
  },
  {
    name: "万の彼方",
    die: 20000,
    scale: 1000,
    length: 110000,
    near: 1000,
    damage: 18,
  },
];
export const SQUARES = {
  chest: {
    name: "宝箱",
    symbol: "◇",
    color: "gold",
    description: "3つからダイスを1つ選ぶ",
  },
  shop: {
    name: "ショップ",
    symbol: "＄",
    color: "teal",
    description: "購入・削除・強化",
  },
  camp: {
    name: "焚き火",
    symbol: "♧",
    color: "coral",
    description: "HPを25回復、または強化",
  },
  gold: {
    name: "金鉱",
    symbol: "◆",
    color: "gold",
    description: "コインを獲得",
  },
  exit: {
    name: "出口",
    symbol: "↗",
    color: "ink",
    description: "通過すれば章をクリア",
  },
  waste: {
    name: "荒地",
    symbol: "·",
    color: "muted",
    description: "着地するとダメージ",
  },
  spent: {
    name: "訪問済み",
    symbol: "✓",
    color: "muted",
    description: "この場所の効果は取得済み",
  },
  shrine: {
    name: "浄化の祭壇",
    symbol: "✧",
    color: "blue",
    description: "ダイスを1枚、無料で取り除く",
  },
  stalled: {
    name: "足止め",
    symbol: "×",
    color: "coral",
    description: "前進できず、HPを8失う",
  },
};
export function generateBoard(chapter, random) {
  const c = CHAPTERS[chapter];
  // Guaranteed opportunities, randomized positions. Availability is not guaranteed landing.
  const types = [
    "chest",
    "gold",
    "shop",
    "camp",
    "chest",
    "gold",
    "shrine",
    "chest",
    "camp",
    "gold",
  ];
  return types
    .map((type, i) => ({
      position: (10 * (i + 1) + Math.floor(random() * 5) - 2) * c.scale,
      type,
    }))
    .concat({ position: c.length, type: "exit" });
}
export function landing(state, distance, guard = 0) {
  const c = CHAPTERS[state.chapter];
  if (!Number.isSafeInteger(distance) || distance < 1) return { valid: false };
  const position = Math.min(c.length, state.position + distance);
  // One reward cell grows with the world; otherwise hitting an integer point
  // with only two sign choices becomes virtually impossible at D20,000.
  const radius = Math.floor(c.scale / 2);
  const node = state.board.find((n) =>
    n.type === "exit"
      ? n.position === position
      : Math.abs(n.position - position) <= radius,
  );
  const near =
    !node &&
    state.board.some(
      (n) =>
        Math.abs(n.position - position) <=
        (n.type === "exit" ? 0 : radius) + c.near,
    );
  const base = node ? 0 : near ? 4 : c.damage;
  return {
    valid: true,
    position,
    distance,
    type: node?.visited ? "spent" : node?.type || "waste",
    nodePosition: node?.position,
    near,
    damage: Math.max(0, base - guard),
    baseDamage: base,
    guard,
    exit: position === c.length,
  };
}
