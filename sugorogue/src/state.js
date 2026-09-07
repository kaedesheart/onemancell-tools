import { DICE, STARTER, definition, options, shuffle } from "./dice.js";
import { CHAPTERS, generateBoard, landing } from "./board.js";
export const SAVE_VERSION = 1;
export function random(state) {
  let n = state.seed | 0;
  n ^= n << 13;
  n ^= n >>> 17;
  n ^= n << 5;
  state.seed = n >>> 0;
  return state.seed / 4294967296;
}
function card(state, type, scale = 1) {
  return { id: state.nextId++, type, scale };
}
function rollNumber(state, max) {
  return 1 + Math.floor(random(state) * max);
}
function replenish(state) {
  while (state.hand.length < 3) {
    if (!state.deck.length) {
      state.deck = shuffle(state.discard, () => random(state));
      state.discard = [];
    }
    if (!state.deck.length) break;
    state.hand.push(state.deck.shift());
  }
}
export function newRun(seed = Date.now()) {
  const s = {
    version: SAVE_VERSION,
    seed: seed >>> 0 || 42,
    nextId: 1,
    chapter: 0,
    position: 0,
    hp: 100,
    coins: 20,
    turn: 1,
    phase: "prepare",
    hand: [],
    deck: [],
    discard: [],
    selected: [],
    roll: null,
    event: null,
    history: ["旅のはじまり。全部振って、ボードから着地点を選ぼう。"],
    stats: { rolls: 0, exact: 0, maxRoll: 0, earned: 0, distance: 0 },
  };
  s.deck = shuffle(
    STARTER.map((t) => card(s, t)),
    () => random(s),
  );
  s.board = generateBoard(0, () => random(s));
  replenish(s);
  return s;
}
function note(s, text) {
  s.history = [text, ...s.history].slice(0, 6);
}
export function roll(s) {
  if (s.phase !== "prepare") return false;
  s.selected = s.hand.map((c) => c.id);
  const dice = s.hand
    .filter((c) => s.selected.includes(c.id))
    .map((c) => {
      const d = definition(c);
      const value = d.sides
        ? rollNumber(s, d.sides) + (d.bonus || 0)
        : d.value || 0;
      return {
        card: c,
        value,
        choice: d.kind === "curse" ? -value : d.kind === "purge" ? -1 : 0,
      };
    });
  s.roll = { base: rollNumber(s, CHAPTERS[s.chapter].die), dice };
  s.phase = "choose";
  s.stats.rolls++;
  const baseline = candidates(s).find(
    (p) =>
      p.position ===
      Math.min(CHAPTERS[s.chapter].length, s.position + s.roll.base),
  );
  const initial = baseline || candidates(s)[0];
  if (initial)
    s.roll.dice.forEach((d, i) => {
      d.choice = initial.choices[i];
    });
  return true;
}
export function choose(s, index, value) {
  if (s.phase !== "choose") return false;
  const die = s.roll.dice[index];
  if (!die || !options(die.card, die.value, s.roll.dice).includes(value))
    return false;
  if (
    definition(die.card).kind === "boost" &&
    value &&
    s.roll.dice.some(
      (other, i) =>
        i !== index && definition(other.card).kind === "boost" && other.choice,
    )
  )
    return false;
  die.choice = value;
  return true;
}
export function preview(s, choices = s.roll?.dice.map((d) => d.choice)) {
  if (!s.roll || !choices || choices.length !== s.roll.dice.length)
    return { valid: false };
  const removeIds = [
    ...new Set(
      s.roll.dice
        .filter(
          (d, i) => definition(d.card).kind === "purge" && choices[i] !== -1,
        )
        .map((d) => choices[s.roll.dice.indexOf(d)]),
    ),
  ];
  if (removeIds.length && allCards(s).length - removeIds.length < 3)
    return { valid: false };
  let multiplier = 1,
    bonus = 0,
    guard = 0,
    boosts = 0;
  for (let i = 0; i < choices.length; i++) {
    const die = s.roll.dice[i],
      v = choices[i];
    if (!options(die.card, die.value, s.roll.dice).includes(v))
      return { valid: false };
    const kind = definition(die.card).kind;
    if (kind === "purge" || removeIds.includes(die.card.id)) continue;
    if (kind === "boost") {
      if (v) {
        multiplier = v;
        boosts++;
      }
    } else if (kind === "guard") guard += v;
    else bonus += v;
  }
  if (boosts > 1) return { valid: false };
  const distance = s.roll.base * multiplier + bonus;
  if (
    distance <= 0 &&
    s.roll.dice.some((d) => definition(d.card).kind === "curse")
  )
    return {
      valid: true,
      position: s.position,
      distance: 0,
      type: "stalled",
      damage: Math.max(0, 8 - guard),
      guard,
      multiplier,
      bonus,
      removeIds,
      rawDistance: distance,
    };
  return { ...landing(s, distance, guard), multiplier, bonus, removeIds };
}
export function candidates(s) {
  if (s.phase !== "choose") return [];
  let combinations = [[]];
  for (const die of s.roll.dice)
    combinations = combinations.flatMap((row) =>
      options(die.card, die.value, s.roll.dice).map((v) => [...row, v]),
    );
  const unique = new Map();
  for (const choices of combinations) {
    const p = preview(s, choices);
    if (!p.valid) continue;
    const old = unique.get(p.position);
    if (
      !old ||
      p.damage < old.damage ||
      (p.damage === old.damage && p.removeIds.length > old.removeIds.length)
    )
      unique.set(p.position, { ...p, choices });
  }
  return [...unique.values()].sort(
    (a, b) =>
      a.damage - b.damage ||
      (a.type === "waste") - (b.type === "waste") ||
      b.position - a.position,
  );
}
function offers(s) {
  const types = shuffle(
    [
      "shift6",
      "shift10",
      "fixed1",
      "fixed3",
      "fine",
      "boost",
      "guard",
      "guardPlus",
      "purge",
    ],
    () => random(s),
  ).slice(0, 3);
  return types.map((type) => ({
    type,
    scale: DICE[type].kind === "shift" ? CHAPTERS[s.chapter].scale : 1,
  }));
}
function nextTurn(s) {
  s.phase = "prepare";
  s.event = null;
  s.roll = null;
  s.selected = [];
  s.turn++;
  replenish(s);
}
export function commitMove(s) {
  if (s.phase !== "choose") return false;
  const p = preview(s);
  if (!p.valid) return false;
  const used = new Set(s.roll.dice.map((d) => d.card.id));
  s.discard.push(
    ...s.hand.filter((c) => used.has(c.id) && !p.removeIds.includes(c.id)),
  );
  s.hand = s.hand.filter((c) => !used.has(c.id));
  s.selected = [];
  s.stats.distance += p.position - s.position;
  s.stats.maxRoll = Math.max(s.stats.maxRoll, p.distance);
  s.position = p.position;
  s.hp -= p.damage;
  s.roll = null;
  if (s.hp <= 0) {
    s.hp = 0;
    s.phase = "lost";
    note(s, "力尽きた…。次の旅に、この経験を。");
    return true;
  }
  if (p.exit) {
    s.phase = s.chapter === CHAPTERS.length - 1 ? "won" : "chapter";
    note(s, `第${s.chapter + 1}章を突破！`);
    return true;
  }
  if (!["waste", "spent", "stalled"].includes(p.type)) {
    s.stats.exact++;
    s.board.find((n) => n.position === p.nodePosition).visited = true;
  }
  if (p.type === "gold") {
    const amount = 15 * CHAPTERS[s.chapter].scale;
    s.coins += amount;
    s.stats.earned += amount;
    note(s, `金鉱に着地。＋${amount.toLocaleString("ja-JP")}コイン！`);
  } else if (p.type === "waste")
    note(
      s,
      `${p.near ? "あと少し、効果マスの近くへ。" : "荒地に着地。"}${p.damage ? ` HP −${p.damage}` : " ガードで被害なし。"}`,
    );
  else if (p.type === "stalled")
    note(s, `呪いで足止め。HP −${p.damage}。次の手札で立て直そう。`);
  else if (p.type === "spent")
    note(s, "訪問済みの場所。被害はないけれど、報酬は取得済み。");
  else {
    s.phase = "event";
    s.event = {
      type: p.type,
      offers: ["camp", "shrine"].includes(p.type) ? [] : offers(s),
      sold: [],
      serviced: false,
    };
    note(
      s,
      `${p.type === "chest" ? "宝箱" : p.type === "shop" ? "ショップ" : p.type === "shrine" ? "浄化の祭壇" : "焚き火"}に着地。`,
    );
    return true;
  }
  nextTurn(s);
  return true;
}
export function allCards(s) {
  return [...s.hand, ...s.deck, ...s.discard];
}
export function price(s, offer) {
  return DICE[offer.type].price * CHAPTERS[s.chapter].scale;
}
export function takeOffer(s, index) {
  const e = s.event;
  if (
    s.phase !== "event" ||
    !["shop", "chest"].includes(e?.type) ||
    !Number.isInteger(index) ||
    !e.offers[index] ||
    e.sold.includes(index)
  )
    return false;
  const offer = e.offers[index];
  const cost = e.type === "shop" ? price(s, offer) : 0;
  if (s.coins < cost) return false;
  s.coins -= cost;
  s.discard.push(card(s, offer.type, offer.scale));
  e.sold.push(index);
  note(s, `${definition(offer).name}を獲得。次の山札から登場。`);
  if (e.type === "chest") nextTurn(s);
  return true;
}
export function service(s, id, action) {
  if (
    s.phase !== "event" ||
    !["shop", "camp", "shrine"].includes(s.event?.type) ||
    s.event.serviced ||
    !["upgrade", "remove"].includes(action)
  )
    return false;
  if (action === "remove" && !["shop", "shrine"].includes(s.event.type))
    return false;
  if (s.event.type === "shrine" && action !== "remove") return false;
  const c = allCards(s).find((c) => c.id === id);
  if (
    !c ||
    (action === "upgrade" && !DICE[c.type].upgrade) ||
    (action === "remove" && allCards(s).length <= 3)
  )
    return false;
  const cost =
    s.event.type !== "shop"
      ? 0
      : (action === "remove" ? 20 : 25) * CHAPTERS[s.chapter].scale;
  if (s.coins < cost) return false;
  const oldName = definition(c).name;
  s.coins -= cost;
  s.event.serviced = true;
  if (action === "remove") {
    for (const pile of ["hand", "deck", "discard"])
      s[pile] = s[pile].filter((c) => c.id !== id);
    note(s, `${oldName}をデッキから外した。`);
  } else {
    c.type = DICE[c.type].upgrade;
    note(s, `${oldName}を${definition(c).name}へ強化！`);
  }
  if (s.event.type !== "shop") nextTurn(s);
  return true;
}
export function heal(s) {
  if (s.phase !== "event" || s.event?.type !== "camp") return false;
  const amount = Math.min(25, 100 - s.hp);
  s.hp += amount;
  note(s, `焚き火でHP＋${amount}。`);
  nextTurn(s);
  return true;
}
export function leaveEvent(s) {
  if (s.phase !== "event") return false;
  nextTurn(s);
  return true;
}
export function nextChapter(s) {
  if (s.phase !== "chapter") return false;
  s.chapter++;
  s.position = 0;
  s.hp = Math.min(100, s.hp + 30);
  const scale = CHAPTERS[s.chapter].scale;
  s.coins += 20 * scale;
  s.stats.earned += 20 * scale;
  // Promote existing random adjustments so a run cannot be stranded by reward luck.
  for (const c of allCards(s))
    if (["shift", "curse"].includes(DICE[c.type].kind)) c.scale = scale;
  s.discard.push(card(s, "curse", scale));
  s.board = generateBoard(s.chapter, () => random(s));
  s.phase = "event";
  s.event = { type: "chest", offers: offers(s), sold: [], serviced: false };
  s.turn = 0;
  s.event.offers[0] = { type: "purge", scale: 1 };
  note(
    s,
    `D${CHAPTERS[s.chapter].die.toLocaleString("ja-JP")}に進化！ ±ダイスも10倍。HP＋30・旅支度コインを獲得。呪いも1枚加わった。`,
  );
  return true;
}
export function restoreRun(raw) {
  try {
    const s = JSON.parse(raw);
    const phases = ["prepare", "choose", "event", "chapter", "won", "lost"];
    if (
      s.version !== SAVE_VERSION ||
      !Number.isInteger(s.chapter) ||
      !CHAPTERS[s.chapter] ||
      !phases.includes(s.phase)
    )
      return null;
    if (
      !Number.isInteger(s.seed) ||
      s.seed <= 0 ||
      s.seed > 4294967295 ||
      !Number.isSafeInteger(s.nextId) ||
      s.nextId < 1
    )
      return null;
    if (
      !Number.isInteger(s.hp) ||
      s.hp < 0 ||
      s.hp > 100 ||
      !Number.isSafeInteger(s.coins) ||
      s.coins < 0 ||
      !Number.isInteger(s.turn) ||
      s.turn < 0
    )
      return null;
    if (
      !Number.isInteger(s.position) ||
      s.position < 0 ||
      s.position > CHAPTERS[s.chapter].length
    )
      return null;
    if (
      !["hand", "deck", "discard"].every(
        (k) => Array.isArray(s[k]) && s[k].length <= 200,
      )
    )
      return null;
    const cards = allCards(s),
      ids = cards.map((c) => c.id);
    if (
      s.hand.length > 3 ||
      cards.length < 3 ||
      new Set(ids).size !== ids.length
    )
      return null;
    if (
      !cards.every(
        (c) =>
          Object.hasOwn(DICE, c.type) &&
          Number.isInteger(c.id) &&
          c.id > 0 &&
          c.id < s.nextId &&
          [1, 10, 100, 1000].includes(c.scale),
      )
    )
      return null;
    if (
      !Array.isArray(s.selected) ||
      s.selected.length > 3 ||
      new Set(s.selected).size !== s.selected.length ||
      !s.selected.every((id) => s.hand.some((c) => c.id === id))
    )
      return null;
    if (
      !Array.isArray(s.board) ||
      s.board.length !== 11 ||
      !s.board.every(
        (n, i) =>
          ["chest", "shop", "camp", "gold", "exit", "shrine"].includes(
            n.type,
          ) &&
          Number.isInteger(n.position) &&
          n.position > (s.board[i - 1]?.position || 0) &&
          n.position <= CHAPTERS[s.chapter].length,
      )
    )
      return null;
    if (
      s.board.at(-1).type !== "exit" ||
      s.board.at(-1).position !== CHAPTERS[s.chapter].length
    )
      return null;
    if (
      !Array.isArray(s.history) ||
      s.history.length > 6 ||
      !s.history.every((t) => typeof t === "string" && t.length < 300)
    )
      return null;
    if (
      !s.stats ||
      !["rolls", "exact", "maxRoll", "earned", "distance"].every(
        (k) => Number.isSafeInteger(s.stats[k]) && s.stats[k] >= 0,
      )
    )
      return null;
    if (s.phase === "choose") {
      if (
        !s.roll ||
        !Number.isInteger(s.roll.base) ||
        s.roll.base < 1 ||
        s.roll.base > CHAPTERS[s.chapter].die ||
        !Array.isArray(s.roll.dice) ||
        s.roll.dice.length > 3
      )
        return null;
      const rollIds = s.roll.dice.map((d) => d.card?.id);
      if (
        new Set(rollIds).size !== rollIds.length ||
        rollIds.length !== s.selected.length ||
        !rollIds.every((id) => s.selected.includes(id))
      )
        return null;
      for (const d of s.roll.dice) {
        const actual = s.hand.find((c) => c.id === d.card?.id);
        if (
          !actual ||
          actual.type !== d.card.type ||
          actual.scale !== d.card.scale ||
          !Number.isInteger(d.value)
        )
          return null;
        const def = definition(actual);
        if (
          def.sides
            ? d.value < 1 + (def.bonus || 0) ||
              d.value > def.sides + (def.bonus || 0)
            : d.value !== (def.value || 0)
        )
          return null;
        if (!options(actual, d.value, s.roll.dice).includes(d.choice))
          return null;
      }
    } else if (s.roll !== null) return null;
    if (s.phase === "event") {
      const e = s.event;
      if (
        !e ||
        !["shop", "chest", "camp", "shrine"].includes(e.type) ||
        !Array.isArray(e.offers) ||
        e.offers.length !== (["camp", "shrine"].includes(e.type) ? 0 : 3) ||
        !Array.isArray(e.sold) ||
        typeof e.serviced !== "boolean"
      )
        return null;
      if (
        !e.offers.every(
          (c) =>
            Object.hasOwn(DICE, c.type) && [1, 10, 100, 1000].includes(c.scale),
        ) ||
        !e.sold.every(
          (i) => Number.isInteger(i) && i >= 0 && i < e.offers.length,
        )
      )
        return null;
    }
    return s;
  } catch {
    return null;
  }
}
