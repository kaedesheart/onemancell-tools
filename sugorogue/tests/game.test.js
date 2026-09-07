import test from "node:test";
import assert from "node:assert/strict";
import {
  newRun,
  restoreRun,
  roll,
  choose,
  preview,
  candidates,
  commitMove,
  takeOffer,
  leaveEvent,
  allCards,
  service,
  heal,
  nextChapter,
} from "../src/state.js";
import { CHAPTERS, landing } from "../src/board.js";
import { definition } from "../src/dice.js";
import { gameView, titleView, dialogContent } from "../src/ui.js";
function rolled(types, base, values) {
  const s = newRun(42);
  s.hand = types.map((type, i) => ({ id: i + 1, type, scale: 1 }));
  s.deck = [];
  s.discard = [{ id: 5, type: "fixed1", scale: 1 }];
  s.nextId = 6;
  s.selected = s.hand.map((c) => c.id);
  s.phase = "choose";
  s.roll = {
    base,
    dice: s.hand.map((card, i) => ({ card, value: values[i], choice: 0 })),
  };
  return s;
}
function forceLanding(s, type, pos = 10) {
  s.position = 0;
  s.board[0] = { position: pos, type };
  s.phase = "choose";
  s.selected = [];
  s.roll = { base: pos, dice: [] };
  return commitMove(s);
}
test("new runs are seeded, start shuffled, and contain unique cards", () => {
  assert.deepEqual(newRun(77), newRun(77));
  assert.notDeepEqual(newRun(77).hand, newRun(78).hand);
  const s = newRun(1);
  assert.equal(s.hand.length, 3);
  assert.equal(allCards(s).length, 8);
  assert.equal(new Set(allCards(s).map((c) => c.id)).size, 8);
  assert.equal(s.board.at(-1).position, 110);
});
test("all three hand dice roll automatically; rolling twice is blocked", () => {
  const s = newRun(1);
  assert.equal(roll(s), true);
  assert.equal(s.roll.dice.length, 3);
  assert.deepEqual(
    s.selected,
    s.hand.map((c) => c.id),
  );
  const snapshot = JSON.stringify(s);
  assert.equal(roll(s), false);
  assert.equal(JSON.stringify(s), snapshot);
});
test("signed results produce the planned 18 / 24 / 30 / 36 destinations", () => {
  const s = rolled(["shift6", "fixed3"], 27, [6, 3]);
  for (const [a, b, expected] of [
    [-6, -3, 18],
    [-6, 3, 24],
    [6, -3, 30],
    [6, 3, 36],
  ]) {
    choose(s, 0, a);
    choose(s, 1, b);
    assert.equal(preview(s).distance, expected);
  }
  assert.equal(choose(s, 0, 4), false);
  assert.equal(
    candidates(s).some((p) => p.distance === 27),
    true,
  );
});
test("zero/backward totals cannot commit", () => {
  const s = rolled(["shift6"], 2, [4]);
  choose(s, 0, -4);
  assert.equal(preview(s).valid, false);
  assert.equal(commitMove(s), false);
  assert.equal(s.position, 0);
});
test("boost applies before addition, duplicate boosts cannot stack", () => {
  const s = rolled(["boost", "fixed3"], 7, [2, 3]);
  choose(s, 0, 2);
  choose(s, 1, -3);
  assert.equal(preview(s).distance, 11);
  const b = rolled(["boost", "boost"], 7, [2, 2]);
  choose(b, 0, 2);
  assert.equal(choose(b, 1, 2), false);
  assert.equal(
    candidates(b).some((p) => p.distance === 28),
    false,
  );
});
test("fine adjustment is continuous only within its five allowed integer choices", () => {
  const s = rolled(["fine"], 8, [0]);
  assert.equal(choose(s, 0, -1), true);
  assert.equal(preview(s).distance, 7);
  assert.equal(choose(s, 0, 3), false);
  assert.equal(choose(s, 0, 0.5), false);
});
test("near misses cost less; guards cannot turn damage into healing", () => {
  const s = newRun(1);
  s.board[0] = { type: "gold", position: 10 };
  assert.equal(landing(s, 10).damage, 0);
  assert.equal(landing(s, 9).damage, 4);
  assert.equal(landing(s, 5).damage, 12);
  assert.equal(landing(s, 9, 6).damage, 0);
});
test("only landing has an effect, passed rewards are not collected", () => {
  const s = newRun(1);
  s.board[0] = { type: "gold", position: 10 };
  s.phase = "choose";
  s.roll = { base: 15, dice: [] };
  commitMove(s);
  assert.equal(s.coins, 20);
  assert.equal(s.hp, 88);
});
test("all rolled cards are discarded even if their effects are unused", () => {
  const s = newRun(1),
    ids = s.hand.map((c) => c.id);
  roll(s);
  s.roll.dice.forEach((d) => (d.choice = 0));
  s.roll.base = 4;
  commitMove(s);
  assert.ok(ids.every((id) => s.discard.some((c) => c.id === id)));
  assert.equal(s.hand.length, 3);
});
test("drawing replenishes from discard without losing or duplicating cards", () => {
  const s = newRun(123);
  const original = allCards(s)
    .map((c) => c.id)
    .sort();
  s.deck = [];
  s.discard = original
    .filter((id) => !s.hand.some((c) => c.id === id))
    .map((id) => ({ id, type: "fixed1", scale: 1 }));
  roll(s);
  s.roll.base = 3;
  commitMove(s);
  assert.equal(s.hand.length, 3);
  assert.deepEqual(
    allCards(s)
      .map((c) => c.id)
      .sort(),
    original,
  );
});
test("chest grants one reward, refusing is allowed", () => {
  const s = newRun(1);
  forceLanding(s, "chest");
  const count = allCards(s).length;
  assert.equal(s.event.offers.length, 3);
  assert.equal(takeOffer(s, 0), true);
  assert.equal(allCards(s).length, count + 1);
  assert.equal(s.phase, "prepare");
  assert.equal(takeOffer(s, 1), false);
  forceLanding(s, "chest");
  assert.equal(leaveEvent(s), true);
  assert.equal(allCards(s).length, count + 1);
});
test("shops enforce price, purchased stock and service limits", () => {
  const s = newRun(1);
  forceLanding(s, "shop");
  s.coins = 0;
  assert.equal(takeOffer(s, 0), false);
  s.coins = 100;
  const before = s.coins;
  const cost = definition(s.event.offers[0]).price;
  assert.equal(takeOffer(s, 0), true);
  assert.equal(s.coins, before - cost);
  assert.equal(takeOffer(s, 0), false);
  const c = allCards(s).find((c) => c.type === "shift6");
  assert.equal(service(s, c.id, "upgrade"), true);
  assert.equal(c.type, "shift10");
  assert.equal(service(s, allCards(s)[0].id, "remove"), false);
});
test("camp is either heal or upgrade; remove and repeated rewards are blocked", () => {
  const s = newRun(1);
  s.hp = 90;
  forceLanding(s, "camp");
  assert.equal(service(s, allCards(s)[0].id, "remove"), false);
  assert.equal(heal(s), true);
  assert.equal(s.hp, 100);
  assert.equal(heal(s), false);
  forceLanding(s, "camp");
  const c = allCards(s).find((c) => c.type === "guard");
  assert.equal(service(s, c.id, "upgrade"), true);
  assert.equal(c.type, "guardPlus");
  assert.equal(s.phase, "prepare");
});
test("lethal damage ends the run and stops further gameplay", () => {
  const s = newRun(1);
  s.hp = 1;
  s.phase = "choose";
  s.roll = { base: 3, dice: [] };
  commitMove(s);
  assert.equal(s.hp, 0);
  assert.equal(s.phase, "lost");
  assert.equal(roll(s), false);
});
test("exit caps movement, ignores waste, and evolves random dice but keeps fixed dice", () => {
  const s = newRun(1);
  s.position = 105;
  s.hp = 1;
  s.phase = "choose";
  s.roll = { base: 20, dice: [] };
  commitMove(s);
  assert.equal(s.position, 110);
  assert.equal(s.phase, "chapter");
  assert.equal(s.hp, 1);
  assert.equal(nextChapter(s), true);
  assert.equal(s.chapter, 1);
  assert.equal(s.position, 0);
  assert.equal(s.hp, 31);
  assert.equal(s.phase, "event");
  assert.equal(s.event.type, "chest");
  assert.ok(
    allCards(s)
      .filter((c) => c.type === "shift6")
      .every((c) => c.scale === 10),
  );
  assert.ok(
    allCards(s)
      .filter((c) => c.type === "fixed1")
      .every((c) => c.scale === 1),
  );
});
test("fourth exit wins, not an extra chapter or looping board", () => {
  const s = newRun(1);
  s.chapter = 3;
  s.position = 109999;
  s.board = [{ position: 110000, type: "exit" }];
  s.phase = "choose";
  s.roll = { base: 20000, dice: [] };
  commitMove(s);
  assert.equal(s.phase, "won");
  assert.equal(s.position, 110000);
  assert.equal(nextChapter(s), false);
});
test("saves preserve rolled results and reward offers, corrupt saves fail closed", () => {
  const s = newRun(55);
  roll(s);
  assert.deepEqual(restoreRun(JSON.stringify(s)), s);
  const r = restoreRun(JSON.stringify(s));
  commitMove(s);
  commitMove(r);
  assert.deepEqual(r, s);
  forceLanding(s, "chest");
  assert.deepEqual(restoreRun(JSON.stringify(s)), s);
  for (const raw of [
    "null",
    "{}",
    "{bad",
    JSON.stringify({ ...s, hp: NaN }),
    JSON.stringify({ ...s, chapter: 8 }),
    JSON.stringify({ ...s, phase: "oops" }),
  ])
    assert.equal(restoreRun(raw), null);
  const invalid = structuredClone(s);
  invalid.hand[0].type = "__proto__";
  assert.equal(restoreRun(JSON.stringify(invalid)), null);
});
test("candidate outcomes and displayed previews match committed effects", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = newRun(seed);
    roll(s);
    for (const candidate of candidates(s)) {
      const copy = structuredClone(s);
      copy.roll.dice.forEach((d, i) => (d.choice = candidate.choices[i]));
      const before = copy.hp;
      assert.equal(commitMove(copy), true);
      assert.equal(copy.position, candidate.position);
      assert.equal(copy.hp, Math.max(0, before - candidate.damage));
    }
  }
});
test("title, dice selection, signs, rewards and result views render without invalid values", () => {
  const s = newRun(9);
  assert.match(titleView(null), /新しい旅へ/);
  assert.match(gameView(s), /手札は全部、振るだけ/);
  roll(s);
  assert.match(gameView(s), /止まりたいマスをタップ/);
  assert.doesNotMatch(gameView(s), /NaN|undefined/);
  assert.match(dialogContent(null, "help").content, /自動計算/);
  for (const type of ["shop", "camp", "chest"]) {
    forceLanding(s, type);
    assert.ok(dialogContent(s, null).content);
  }
  for (const phase of ["chapter", "won", "lost"]) {
    s.phase = phase;
    assert.doesNotMatch(dialogContent(s, null).content, /NaN|undefined/);
  }
});
test("restored logs are escaped rather than interpreted as markup", () => {
  const s = newRun(1);
  s.history = ["<img src=x onerror=alert(1)>"];
  assert.match(gameView(s), /&lt;img/);
  assert.doesNotMatch(gameView(s), /<img src=x/);
});
test("reward ranges widen at large scales and cannot be collected twice", () => {
  const s = newRun(1);
  s.chapter = 1;
  s.position = 0;
  s.board = [
    { position: 100, type: "gold" },
    { position: 1100, type: "exit" },
  ];
  assert.equal(landing(s, 95).type, "gold");
  assert.equal(landing(s, 105).type, "gold");
  assert.equal(landing(s, 106).damage, 4);
  assert.equal(landing(s, 116).damage, 14);
  s.phase = "choose";
  s.roll = { base: 95, dice: [] };
  commitMove(s);
  const coins = s.coins;
  assert.equal(s.board[0].visited, true);
  s.phase = "choose";
  s.roll = { base: 1, dice: [] };
  commitMove(s);
  assert.equal(s.coins, coins);
  assert.equal(s.phase, "prepare");
  assert.equal(s.hp, 100);
});
test("negative dice cannot be ignored; a blocked roll still resolves a turn", () => {
  const s = rolled(["curse", "fixed1"], 2, [6, 1]);
  s.roll.dice[0].choice = -6;
  assert.equal(choose(s, 0, 0), false);
  assert.equal(preview(s).type, "stalled");
  assert.equal(candidates(s).length, 1);
  assert.equal(commitMove(s), true);
  assert.equal(s.position, 0);
  assert.equal(s.hp, 92);
  assert.equal(s.phase, "prepare");
});
test("purification cancels and permanently removes one simultaneously rolled curse", () => {
  const s = rolled(["curse", "purge", "fixed1"], 10, [6, 0, 1]);
  s.roll.dice[0].choice = -6;
  s.roll.dice[1].choice = -1;
  assert.equal(preview(s).distance, 4);
  choose(s, 1, s.hand[0].id);
  assert.equal(preview(s).distance, 10);
  assert.deepEqual(preview(s).removeIds, [1]);
  commitMove(s);
  assert.equal(
    allCards(s).some((c) => c.type === "curse"),
    false,
  );
  assert.equal(allCards(s).length, 3);
});
test("shrine removes a die without payment, then ends the event", () => {
  const s = newRun(1);
  forceLanding(s, "shrine");
  s.coins = 0;
  const count = allCards(s).length;
  assert.equal(service(s, allCards(s)[0].id, "remove"), true);
  assert.equal(s.coins, 0);
  assert.equal(allCards(s).length, count - 1);
  assert.equal(s.phase, "prepare");
});
test("later chapters include a curse and a guaranteed purification reward option", () => {
  const s = newRun(1);
  s.phase = "chapter";
  nextChapter(s);
  assert.equal(allCards(s).filter((c) => c.type === "curse").length, 1);
  assert.equal(s.event.offers[0].type, "purge");
  assert.deepEqual(restoreRun(JSON.stringify(s)), s);
});
test("board candidate indices preserve solver recipes when displayed in position order", () => {
  const s = newRun(18);
  roll(s);
  const html = gameView(s),
    expected = candidates(s);
  const indices = [
    ...html.matchAll(
      /class="board-candidate [^"]*" data-action="candidate" data-index="(\d+)"/g,
    ),
  ].map((m) => Number(m[1]));
  assert.equal(indices.length, expected.length);
  assert.deepEqual(
    [...indices].sort((a, b) => a - b),
    expected.map((_, i) => i),
  );
  assert.doesNotMatch(html, /data-action="choose"|data-action="toggle"/);
});
