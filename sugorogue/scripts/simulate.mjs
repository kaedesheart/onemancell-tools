import {
  newRun,
  roll,
  candidates,
  commitMove,
  takeOffer,
  leaveEvent,
  heal,
  nextChapter,
} from "../src/state.js";
// Deterministic smoke/balance probe, not a claim of human play difficulty.
const results = [];
for (let seed = 1; seed <= 200; seed++) {
  const s = newRun(seed);
  let safety = 0,
    exact = 0,
    moveTurns = 0;
  while (!["won", "lost"].includes(s.phase) && safety++ < 500) {
    if (s.phase === "prepare") {
      roll(s);
    } else if (s.phase === "choose") {
      const opts = candidates(s);
      // Favor a useful reward, then damage reduction, then progress.
      const score = (p) =>
        (p.exit
          ? 50
          : p.type === "camp" && s.hp < 75
            ? 35
            : p.type === "chest"
              ? 28
              : p.type === "gold"
                ? 24
                : p.type === "shop" && s.coins >= 20
                  ? 22
                  : 0) -
        p.damage * 2 +
        p.distance / (20 * 10 ** s.chapter);
      opts.sort((a, b) => score(b) - score(a));
      const p = opts[0];
      s.roll.dice.forEach((d, i) => (d.choice = p.choices[i]));
      exact += !["waste", "spent", "stalled"].includes(p.type);
      moveTurns++;
      commitMove(s);
    } else if (s.phase === "event") {
      if (s.event.type === "camp") heal(s);
      else if (s.event.type === "shrine") leaveEvent(s);
      else if (s.event.type === "chest") takeOffer(s, 0);
      else {
        takeOffer(s, 0);
        leaveEvent(s);
      }
    } else if (s.phase === "chapter") nextChapter(s);
  }
  if (safety >= 500) throw Error("Non-terminating run");
  results.push({
    phase: s.phase,
    chapter: s.chapter + 1,
    turns: s.stats.rolls,
    exact,
    moveTurns,
  });
}
console.log(
  JSON.stringify(
    {
      runs: results.length,
      wins: results.filter((r) => r.phase === "won").length,
      meanTurns: results.reduce((a, r) => a + r.turns, 0) / results.length,
      exactLandingRate:
        results.reduce((a, r) => a + r.exact, 0) /
        results.reduce((a, r) => a + r.moveTurns, 0),
      endedByChapter: [1, 2, 3, 4].map(
        (c) => results.filter((r) => r.chapter === c).length,
      ),
    },
    null,
    2,
  ),
);
