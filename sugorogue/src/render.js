import { CHAPTERS, SQUARES } from "./board.js";
export const number = (n) => n.toLocaleString("ja-JP");
export const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function boardView(s, p, candidates = []) {
  const c = CHAPTERS[s.chapter],
    target = p?.valid ? p.position : s.position;
  const pct = (value) => 3 + (value / c.length) * 94;
  const ahead = s.board.filter((n) => n.position > s.position).slice(0, 3);
  const radius = Math.floor(c.scale / 2);
  const laneEnds = [];
  const pins = [...candidates]
    .map((v, index) => ({ ...v, index }))
    .sort((a, b) => a.position - b.position)
    .map((v) => {
      const x = (pct(v.position) / 100) * 1450;
      let lane = laneEnds.findIndex((end) => x - end >= 64);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = x;
      return { ...v, lane };
    });
  return `<section class="board-panel" aria-label="一本道の盤面">
    <div class="section-top"><div><span class="eyebrow">${candidates.length ? "CHOOSE YOUR LANDING" : "THE ROAD AHEAD"}</span><h2>${candidates.length ? "止まりたいマスをタップ。" : "次の一歩を、選ぼう。"}</h2></div><span class="chapter-badge">${candidates.length ? `${candidates.length}か所に止まれる` : `${number(c.length - s.position)} マスで出口`}</span></div>
    <div class="map-scroll" id="map-scroll" tabindex="0" aria-label="盤面。横にスクロールできます">
      <div class="road ${candidates.length ? "has-candidates" : ""}" style="--player:${pct(s.position)}%;--target:${pct(target)}%;${candidates.length ? `height:${205 + laneEnds.length * 62}px` : ""}">
        <div class="road-line"></div><div class="road-travel" style="left:${pct(Math.min(s.position, target))}%;width:${(Math.abs(target - s.position) / c.length) * 94}%"></div>
        <span class="road-zero">0</span>
        ${s.board
          .map((n, i) => {
            const d = SQUARES[n.type],
              passed =
                n.position + (n.type === "exit" ? 0 : radius) < s.position,
              hit = p?.valid && p.nodePosition === n.position;
            return `<div class="map-node ${d.color} ${passed || n.visited ? "passed" : ""} ${hit ? "target" : ""} ${i % 2 ? "lower" : ""}" style="left:${pct(n.position)}%"><span class="node-coordinate">${number(n.position)}</span><span class="node-symbol">${d.symbol}</span><span class="node-name">${d.name}</span></div>`;
          })
          .join("")}
        <div class="player-marker"><span>YOU</span><b>●</b></div>
        ${p?.valid && target !== s.position ? `<div class="target-marker ${p.damage ? "danger" : ""}" style="left:${pct(target)}%"><span>${SQUARES[p.type].name}</span><b>⌄</b></div>` : ""}
        ${pins.map((v) => `<button class="board-candidate ${v.damage ? "danger" : "safe"} ${p?.position === v.position && p.damage === v.damage ? "active" : ""}" data-action="candidate" data-index="${v.index}" style="left:${pct(v.position)}%;top:${185 + v.lane * 62}px;--stem:${87 + v.lane * 62}px" aria-label="位置${number(v.position)}、${SQUARES[v.type].name}、${v.damage ? `HPマイナス${v.damage}` : "ダメージなし"}に着地" aria-pressed="${p?.position === v.position && p.damage === v.damage}"><strong>${number(v.position)}</strong><small>${v.damage ? `−${v.damage} HP` : v.type === "exit" ? "出口" : SQUARES[v.type].name}</small></button>`).join("")}
      </div>
    </div>
    <div class="road-footer"><span>現在地 <strong>${number(s.position)}</strong><span class="map-hint">　← 横にスクロール →</span></span><span>荒地 −${c.damage} HP <span class="muted">／ ${radius ? `報酬は中心±${number(radius)}、その外側${number(c.near)}は −4 HP` : "効果マスの前後1は −4 HP"}</span></span></div>
    <div class="upcoming">${ahead.map((n) => `<div><span class="node-dot ${SQUARES[n.type].color}">${SQUARES[n.type].symbol}</span><span>${SQUARES[n.type].name}</span><strong>あと ${radius && n.type !== "exit" ? `${number(Math.max(1, n.position - radius - s.position))}〜${number(n.position + radius - s.position)}` : number(n.position - s.position)}</strong></div>`).join("")}</div>
  </section>`;
}
