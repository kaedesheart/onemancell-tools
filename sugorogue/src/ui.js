import { CHAPTERS, SQUARES } from "./board.js";
import { DICE, definition } from "./dice.js";
import { preview, candidates, allCards, price } from "./state.js";
import { boardView, number, escape } from "./render.js";
const signed = (n) =>
  n > 0 ? `＋${number(n)}` : n < 0 ? `−${number(-n)}` : "使わない";
export function titleView(saved, warning = "") {
  return `<main class="title-screen"><div class="title-brand">ONEMANCELL TOOLS <span>PLAY / 01</span></div>
    <section class="title-main"><span class="eyebrow">DICE × ROGUELITE</span><h1>スゴローグ<span>SUGOROGUE</span></h1><p class="title-copy">大きく振って。<br>ぴたりと、止まれ。</p>
    <div class="title-dice" aria-hidden="true"><div class="title-die main-die">D20<span>進む</span></div><div class="title-die plus-die">±D6<span>合わせる</span></div></div>
    <div class="title-actions">${saved ? `<button class="primary" data-action="resume">旅をつづける <span>第${saved.chapter + 1}章・HP ${saved.hp}</span></button>` : ""}<button class="${saved ? "secondary" : "primary"}" data-action="start">新しい旅へ <span>↗</span></button></div>
    <p class="title-rule">全部振って、止まりたいマスを選ぶ。<br>宝箱で育ち、荒地を越え、D20,000の世界へ。</p>
    ${warning ? `<p class="warning">${escape(warning)}</p>` : ""}
    <button class="text-button" data-action="help">遊び方を読む →</button></section>
    <footer class="title-footer"><span>4 CHAPTERS / 1 RUN</span><span>試遊版 · 途中経過はこの端末に保存</span></footer></main>`;
}
function dieCard(c) {
  const d = definition(c);
  return `<div class="hand-card ${d.color}"><span class="card-top">${d.kind === "guard" ? "守る" : d.kind === "boost" ? "加速する" : "合わせる"}</span><strong>${d.name}</strong><span class="card-description">${d.detail}</span></div>`;
}
function rolledCard(r, removed = []) {
  const d = definition(r.card);
  const label =
    d.kind === "purge"
      ? "✧"
      : d.kind === "curse"
        ? `−${number(r.value)}`
        : d.kind === "boost"
          ? "×2"
          : d.kind === "fine"
            ? "±2"
            : number(r.value);
  const effect = removed.includes(r.card.id)
    ? "浄化で取り除く"
    : d.kind === "purge"
      ? r.choice === -1
        ? "対象なし"
        : "呪いを除去"
      : r.choice === 0
        ? "不使用"
        : d.kind === "boost"
          ? "移動 ×2"
          : d.kind === "guard"
            ? `盾 ${r.choice}`
            : signed(r.choice);
  return `<div class="rolled-card ${d.color}"><div class="rolled-heading"><span>${d.name}</span><strong>${label}</strong></div><span class="auto-effect">${effect}</span></div>`;
}
function formula(s, p) {
  if (!s.roll) return "ダイスを振って、道をつくろう。";
  const terms = s.roll.dice
    .filter(
      (d) =>
        !["boost", "guard", "purge"].includes(definition(d.card).kind) &&
        !p.removeIds?.includes(d.card.id),
    )
    .map((d) => d.choice)
    .filter(Boolean);
  return `${number(s.roll.base)}${p.multiplier > 1 ? ` × ${p.multiplier}` : ""}${terms.map((v) => ` ${signed(v)}`).join("")} <span>=</span> <strong>${p.valid ? (p.type === "stalled" ? "足止め" : number(p.distance)) : "前進できません"}</strong>`;
}
export function gameView(s, warning = "") {
  const chapter = CHAPTERS[s.chapter],
    p = preview(s),
    choosing = s.phase === "choose",
    preparing = s.phase === "prepare";
  const choices = candidates(s);
  return `<div class="game-shell"><header class="game-header"><div class="wordmark">スゴローグ<small>SUGOROGUE</small></div><nav><button class="text-button" data-action="deck">デッキ <b>${allCards(s).length}</b></button><button class="icon-button" aria-label="遊び方" data-action="help">?</button><button class="icon-button" aria-label="タイトルへ戻る（自動保存）" data-action="title">⌂</button></nav></header>
    <main><div class="journey-bar"><div><span class="eyebrow">CHAPTER 0${s.chapter + 1} / 04</span><h1>${chapter.name}</h1></div><div class="stats"><div><span>HP</span><strong class="${s.hp <= 25 ? "low-hp" : ""}">${s.hp}<small>/100</small></strong><div class="hp-track"><i style="width:${s.hp}%"></i></div></div><div><span>COIN</span><strong>${number(s.coins)}</strong></div><div><span>TURN</span><strong>${s.turn}</strong></div></div></div>
    ${boardView(s, p, choices)}
    <div class="play-grid"><section class="dice-panel"><div class="section-top"><h2>${choosing ? "今回の出目" : "手札は全部、振るだけ。"}</h2><span class="muted">${choosing ? "足し引きは、着地点に合わせて自動計算" : `移動ダイス ＋ 手札${s.hand.length}枚`}</span></div>
      <div class="dice-workspace"><div class="movement-die ${choosing ? "has-result" : ""}"><span>移動ダイス</span><strong>${choosing ? number(s.roll.base) : `D${number(chapter.die)}`}</strong><small>${choosing ? `D${number(chapter.die)} の出目` : "毎ターン、必ず振る"}</small></div><div class="operation-cards">${choosing ? (s.roll.dice.length ? s.roll.dice.map((r) => rolledCard(r, p.removeIds)).join("") : '<p class="empty-hint">今回は移動ダイスだけ。<br>この出目で進もう。</p>') : s.hand.map((c) => dieCard(c)).join("")}</div></div>
      <div class="deck-meta"><span>山札 ${s.deck.length} <span class="muted">／ 捨て札 ${s.discard.length}</span></span><span class="muted">${choosing ? "着地点に合う組み合わせを自動で使います" : "毎ターン、手札をまとめて振ります"}</span></div>
    </section><section class="decision-panel"><span class="eyebrow">${choosing ? "YOUR NEXT MOVE" : "READY TO ROLL"}</span><div class="equation ${choosing ? "" : "waiting"}" aria-live="polite">${formula(s, p)}</div>
      ${choosing ? `<div class="landing-summary ${p.valid && p.damage ? "danger" : ""}" aria-live="polite">${p.valid ? `<span>${SQUARES[p.type].symbol} ${SQUARES[p.type].name}${p.near ? "・あと少し" : ""}</span><strong>${p.exit ? "章を突破！" : p.damage ? `HP −${p.damage}` : p.type === "stalled" ? "次の手札へ" : p.type === "spent" ? "効果は取得済み" : p.type === "waste" ? "ガードで被害なし" : s.chapter ? "報酬エリアに着地" : "ぴったり着地"}</strong><small>位置 ${number(p.position)}${p.guard ? ` ／ 盾 ${p.guard}` : ""}</small>` : "<span>補正を変えて、1マス以上進もう。</span>"}</div><button class="primary" data-action="move" ${!p.valid ? "disabled" : ""}>ここへ進む <span>→</span></button>` : `<p class="decision-copy">手元のダイスを全部振ろう。<br>あとは、ボードの着地点を選ぶだけ。</p><button class="primary" data-action="roll" ${!preparing ? "disabled" : ""}>全部のダイスを振る <span>↗</span></button>`}
    </section></div>
    <div class="game-message" role="status"><span>↳</span> ${escape(s.history[0])}</div>${warning ? `<p class="warning">${escape(warning)}</p>` : ""}
    <footer class="game-footer"><span>大きく振って。ぴたりと、止まれ。</span><span>自動保存 · 第${s.chapter + 1}章</span></footer></main></div>`;
}
function offerCard(s, o, i, shop) {
  const d = definition(o),
    sold = s.event.sold.includes(i),
    cost = shop ? price(s, o) : 0;
  return `<button class="offer-card ${d.color}" data-action="offer" data-index="${i}" ${sold || s.coins < cost ? "disabled" : ""}><span class="eyebrow">${d.kind === "guard" ? "DEFENSE" : d.kind === "boost" ? "BOOST" : "CONTROL"}</span><strong>${d.name}</strong><p>${d.detail}</p><span class="offer-price">${sold ? "購入済み" : shop ? `${number(cost)} コイン` : "これを選ぶ →"}</span></button>`;
}
export function dialogContent(s, view) {
  if (view === "help")
    return {
      title: "旅のしおり",
      content: `<ol class="help-list"><li><b>手札のダイスを、全部振る。</b><p>移動ダイス1個と手札3枚を一緒に振ります。使った手札はすべて捨て札へ移り、3枚補充されます。</p></li><li><b>ボードに現れた着地点を選ぶ。</b><p>足し引きの組み合わせは自動計算。ボードの候補には報酬かHP被害が表示されます。同じ位置なら被害の小さい組み合わせを使います。</p></li><li><b>結果を見て「ここへ進む」。</b><p>宝箱・店・焚き火・金鉱に止まると効果を得ます。第2章からは効果マスに幅があり、報酬範囲を「あと○〜○」で表示します。途中で通過したマスの効果は発生しません。同じ場所の報酬は1回だけです。</p></li><li><b>荒地に止まるとHPが減る。</b><p>効果マスの近くなら被害は4。ガードで軽減できます。負の補正は前進量を減らすもので、後ろへは戻れません。</p></li><li><b>出口を越えれば、次の桁へ。</b><p>4章突破でクリア。章ごとに移動ダイスとランダム±ダイスが10倍、HPが30回復します。振った結果もこの端末に保存されます。後半は必ず引き算になる呪いが加わります。浄化ダイスを一緒に振るか、祭壇で取り除こう。呪いで移動量が0以下になると、その場でHPを8失い、次の手札へ進みます。</p></li></ol><button class="primary" data-action="close">わかった</button>`,
    };
  if (view === "deck")
    return {
      title: `旅のデッキ · ${allCards(s).length}枚`,
      content: `<div class="deck-list">${allCards(s)
        .map(
          (c) =>
            `<div><strong>${definition(c).name}</strong><span>${s.hand.some((h) => h.id === c.id) ? "手札" : s.deck.some((h) => h.id === c.id) ? "山札" : "捨て札"}</span></div>`,
        )
        .join(
          "",
        )}</div><button class="primary" data-action="close">戻る</button>`,
    };
  if (view === "restart")
    return {
      title: "新しい旅をはじめる？",
      content:
        '<p>保存中の旅を終了して、最初から始めます。</p><div class="dialog-actions"><button class="secondary" data-action="close">今の旅を残す</button><button class="primary" data-action="restart">新しい旅へ</button></div>',
    };
  if (s.phase === "chapter")
    return {
      title: `第${s.chapter + 1}章 突破！`,
      content: `<div class="chapter-evolution"><span>D${number(CHAPTERS[s.chapter].die)}</span><b>→</b><strong>D${number(CHAPTERS[s.chapter + 1].die)}</strong></div><p>次は「${CHAPTERS[s.chapter + 1].name}」。<br>ランダム±ダイスも10倍に進化。<br>HP＋30、旅支度コイン、ダイス報酬を獲得します。<br>ただし、呪いのダイスも1枚加わります。浄化や祭壇で取り除こう。</p><button class="primary" data-action="next">次の世界へ <span>↗</span></button>`,
    };
  if (s.phase === "won" || s.phase === "lost")
    return {
      title: s.phase === "won" ? "万の彼方を、越えた。" : "旅は、ここまで。",
      content: `<span class="eyebrow">${s.phase === "won" ? "RUN CLEAR" : "RUN OVER"}</span><div class="result-stats"><div><span>踏破した距離</span><strong>${number(s.stats.distance)}</strong></div><div><span>最大の一振り</span><strong>${number(s.stats.maxRoll)}</strong></div><div><span>報酬への着地</span><strong>${s.stats.exact} 回</strong></div><div><span>振った回数</span><strong>${s.stats.rolls} 回</strong></div></div><p>${s.phase === "won" ? "D20からD20,000へ。次は、違うダイスで。" : "小さな補正が、大きな一歩を変える。次の旅へ。"}</p><button class="primary" data-action="restart">もう一度、旅に出る <span>↗</span></button><button class="text-button" data-action="title">タイトルへ</button>`,
    };
  if (s.phase !== "event") return null;
  const event = s.event,
    shop = event.type === "shop",
    camp = event.type === "camp",
    shrine = event.type === "shrine";
  if (shrine && !view) view = "remove";
  const serviceMode = view === "remove" ? "remove" : "upgrade";
  if (view === "upgrade" || view === "remove") {
    const cost =
      camp || shrine
        ? 0
        : (serviceMode === "remove" ? 20 : 25) * CHAPTERS[s.chapter].scale;
    const eligible = allCards(s).filter(
      (c) => serviceMode === "remove" || DICE[c.type].upgrade,
    );
    return {
      title: `${serviceMode === "remove" ? "ダイスを外す" : "ダイスを強化"} · ${cost ? `${number(cost)} コイン` : "無料"}`,
      content: `<p>${serviceMode === "remove" ? "デッキは3枚まで減らせます。" : "選んだ1枚が、その場で進化します。"}</p><div class="deck-list">${eligible.map((c) => `<button data-action="service" data-id="${c.id}" data-mode="${serviceMode}" ${s.coins < cost || (serviceMode === "remove" && allCards(s).length <= 3) ? "disabled" : ""}><strong>${definition(c).name}</strong><span>${serviceMode === "remove" ? "外す" : `→ ${definition({ ...c, type: DICE[c.type].upgrade }).name}`}</span></button>`).join("") || "<p>強化できるダイスがありません。</p>"}</div><button class="secondary" data-action="${shrine ? "leave" : "event-back"}">${shrine ? "取り除かず進む" : "戻る"}</button>`,
    };
  }
  return {
    title: camp
      ? "焚き火で、ひと息。"
      : shop
        ? "旅のショップ"
        : "宝箱を見つけた。",
    content: camp
      ? `<p>回復か、ダイスの強化。どちらか1つを選べます。</p><div class="camp-options"><button class="offer-card coral" data-action="heal"><span>休む</span><strong>HP ＋25</strong><p>現在 ${s.hp} / 100 → ${Math.min(100, s.hp + 25)} / 100</p></button><button class="offer-card teal" data-action="upgrade"><span>育てる</span><strong>ダイス強化</strong><p>手持ちの1枚を強化する</p></button></div><button class="text-button" data-action="leave">休まず進む →</button>`
      : `<p>${shop ? `所持金 ${number(s.coins)} コイン。買ったダイスは捨て札に入ります。` : "ダイスを1つ選ぼう。次の山札から使えます。"}</p><div class="offers">${event.offers.map((o, i) => offerCard(s, o, i, shop)).join("")}</div>${shop ? `<div class="shop-services"><button class="secondary" data-action="upgrade" ${event.serviced ? "disabled" : ""}>強化 · ${number(25 * CHAPTERS[s.chapter].scale)}</button><button class="secondary" data-action="remove" ${event.serviced ? "disabled" : ""}>削除 · ${number(20 * CHAPTERS[s.chapter].scale)}</button></div><p class="muted">強化・削除は、この店でどちらか1回。</p>` : ""}<button class="primary" data-action="leave">${shop ? "旅をつづける" : "今回は見送る"} <span>→</span></button>`,
  };
}
