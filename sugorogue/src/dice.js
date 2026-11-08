// Pure definitions shared by the game, candidate solver, UI and tests.
export const DICE = {
  shift6: {
    name: "±D6",
    kind: "shift",
    sides: 6,
    detail: "出た目を、足すか引くか。",
    color: "teal",
    price: 20,
    upgrade: "shift10",
  },
  shift10: {
    name: "±D10",
    kind: "shift",
    sides: 10,
    detail: "広い範囲から着地を探す。",
    color: "teal",
    price: 25,
  },
  fixed1: {
    name: "固定 ±1",
    kind: "fixed",
    value: 1,
    detail: "最後の1マスを合わせる。",
    color: "gold",
    price: 20,
    upgrade: "fine",
  },
  fixed3: {
    name: "固定 ±3",
    kind: "fixed",
    value: 3,
    detail: "必ず3。足しても、引いても。",
    color: "gold",
    price: 20,
    upgrade: "fine",
  },
  fine: {
    name: "微調整",
    kind: "fine",
    detail: "−2〜＋2から自由に選ぶ。",
    color: "gold",
    price: 40,
  },
  boost: {
    name: "ブースト ×2",
    kind: "boost",
    value: 2,
    detail: "移動ダイスの出目を2倍に。",
    color: "coral",
    price: 30,
  },
  guard: {
    name: "ガード D6",
    kind: "guard",
    sides: 6,
    bonus: 0,
    detail: "出た目の分、着地ダメージを軽減。",
    color: "blue",
    price: 20,
    upgrade: "guardPlus",
  },
  guardPlus: {
    name: "ガード D6+2",
    kind: "guard",
    sides: 6,
    bonus: 2,
    detail: "出た目＋2のダメージを軽減。",
    color: "blue",
    price: 30,
  },
  curse: {
    name: "呪い −D6",
    kind: "curse",
    sides: 6,
    detail: "必ず出目の分だけ後退補正。無視できない。",
    color: "coral",
    price: 0,
  },
  purge: {
    name: "浄化",
    kind: "purge",
    detail: "一緒に振った呪い1枚を無効にし、デッキから取り除く。",
    color: "blue",
    price: 30,
  },
};
export const STARTER = [
  "shift6",
  "shift6",
  "shift6",
  "fixed1",
  "fixed1",
  "fixed3",
  "guard",
  "guard",
];
export function definition(card) {
  const base = DICE[card.type];
  const scale = card.scale || 1;
  if (base.kind === "shift")
    return {
      ...base,
      sides: base.sides * scale,
      name: `±D${(base.sides * scale).toLocaleString("ja-JP")}`,
    };
  if (base.kind === "curse")
    return {
      ...base,
      sides: base.sides * scale,
      name: `呪い −D${(base.sides * scale).toLocaleString("ja-JP")}`,
    };
  return { ...base };
}
export function options(card, value, dice = []) {
  const d = definition(card);
  if (d.kind === "curse") return [-value];
  if (d.kind === "purge")
    return [
      -1,
      ...dice
        .filter((r) => definition(r.card).kind === "curse")
        .map((r) => r.card.id),
    ];
  if (d.kind === "shift" || d.kind === "fixed") return [-value, 0, value];
  if (d.kind === "fine") return [-2, -1, 0, 1, 2];
  if (d.kind === "boost") return [0, d.value];
  return [0, value];
}
export function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
