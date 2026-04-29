(function () {
  'use strict';

  const BASE = 'https://tools.onemancell.com';

  const TOOLS = [
    {
      icon: '🎲',
      name: 'エモクロアダイスツール',
      desc: 'エモクロアTRPG 用の判定・ステータス管理',
      url: BASE + '/dice/',
      aboutUrl: BASE + '/dice/about/',
      pick: true,
    },
    {
      icon: '🍅',
      name: 'ポモドーロタイマー',
      desc: '25分集中・休憩サイクルで生産性アップ',
      url: BASE + '/pomo/',
      aboutUrl: BASE + '/pomo/about/',
      pick: true,
    },
    {
      icon: '🧩',
      name: '曼荼羅タスク分解',
      desc: '3×3 グリッドでタスクを細分化・整理',
      url: BASE + '/mandala/',
      aboutUrl: BASE + '/mandala/about/',
      pick: true,
    },
    {
      icon: '🌙',
      name: 'のんびりノイズ',
      desc: '雨・波・風・焚き火を自由にミックスできるノイズミキサー',
      url: BASE + '/noise/',
      aboutUrl: BASE + '/noise/about/',
      pick: true,
    },
  ];

  function loadFont() {
    if (document.querySelector('link[href*="M+PLUS+Rounded"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap';
    document.head.appendChild(link);
  }

  function injectStyles() {
    if (document.getElementById('omc-widget-style')) return;
    const s = document.createElement('style');
    s.id = 'omc-widget-style';
    s.textContent = `
      #omc-widget { font-family: 'M PLUS Rounded 1c', -apple-system, sans-serif; color: #2A1810; }
      .omc-header { text-align: center; margin-bottom: 24px; }
      .omc-eyebrow { font-size: .82rem; font-weight: 700; color: #FF6B1A; letter-spacing: .05em; margin-bottom: 6px; }
      .omc-title { font-size: 1.7rem; font-weight: 800; color: #2A1810; }
      .omc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 22px; }
      .omc-card { background: #fff; border-radius: 18px; border: 1.5px solid #F0E8E0; padding: 20px 18px 18px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 2px 12px rgba(42,24,16,.06); position: relative; }
      .omc-badge { position: absolute; top: 12px; right: 12px; background: #FF6B1A; color: #fff; font-size: .65rem; font-weight: 800; padding: 2px 8px; border-radius: 50px; letter-spacing: .05em; }
      .omc-card-top { display: flex; align-items: center; gap: 12px; }
      .omc-icon { width: 48px; height: 48px; border-radius: 12px; background: #FFE8D6; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0; }
      .omc-name { font-weight: 800; font-size: .95rem; line-height: 1.35; color: #2A1810; padding-right: 36px; }
      .omc-desc { font-size: .75rem; color: #8A7A70; line-height: 1.6; }
      .omc-btn-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .omc-btn { display: inline-block; background: #FF6B1A; color: #fff !important; border-radius: 50px; padding: 9px 24px; font-size: .82rem; font-weight: 800; text-decoration: none !important; font-family: inherit; transition: background .15s; }
      .omc-btn:hover { background: #E85A0D; }
      .omc-about-btn { display: inline-block; background: transparent; color: #E85A0D !important; border: 1.5px solid #FFB88A; border-radius: 50px; padding: 8px 18px; font-size: .78rem; font-weight: 700; text-decoration: none !important; font-family: inherit; transition: background .15s, border-color .15s; }
      .omc-about-btn:hover { background: #FFF0E6; border-color: #FF6B1A; }
      .omc-footer { text-align: center; }
      .omc-all-btn { display: inline-flex; align-items: center; gap: 8px; background: #FFF0E6; color: #E85A0D !important; border-radius: 50px; padding: 11px 28px; font-size: .88rem; font-weight: 800; text-decoration: none !important; font-family: inherit; transition: background .15s; }
      .omc-all-btn:hover { background: #FFE0CC; }
      @media (max-width: 560px) {
        .omc-grid { grid-template-columns: 1fr; }
        .omc-title { font-size: 1.4rem; }
      }
    `;
    document.head.appendChild(s);
  }

  function render() {
    const target = document.getElementById('omc-widget');
    if (!target) return;

    loadFont();
    injectStyles();

    const cards = TOOLS.map(t => `
      <div class="omc-card">
        ${t.pick ? '<span class="omc-badge">PICK</span>' : ''}
        <div class="omc-card-top">
          <div class="omc-icon">${t.icon}</div>
          <div class="omc-name">${t.name}</div>
        </div>
        <div class="omc-desc">${t.desc}</div>
        <div class="omc-btn-row">
          <a class="omc-btn" href="${t.url}" target="_blank" rel="noopener">使う</a>
          <a class="omc-about-btn" href="${t.aboutUrl}" target="_blank" rel="noopener">詳しく →</a>
        </div>
      </div>
    `).join('');

    target.innerHTML = `
      <div class="omc-header">
        <div class="omc-eyebrow">\\ すぐ使える！ /</div>
        <div class="omc-title">おすすめツール</div>
      </div>
      <div class="omc-grid">${cards}</div>
      <div class="omc-footer">
        <a class="omc-all-btn" href="${BASE}/" target="_blank" rel="noopener">
          すべてのツールを見る <span>→</span>
        </a>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
