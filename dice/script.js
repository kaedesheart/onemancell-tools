'use strict';

// ── State ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'emoklore-dice-v1';

const state = {
  diceCount:   1,
  targetValue: 5,
  extraPool:   [], // [{ sides: N, count: M }, ...]
  lastPool:    [], // 前回振ったプール
  mode:        'lively',  // 'lively' | 'simple'
  soundOn:     true,
  history:     [],        // [{ text }], max 3, newest first
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    // ダイス設定はリロードのたびにデフォルト値に戻す
    if (saved.mode    != null) state.mode    = saved.mode;
    if (saved.soundOn != null) state.soundOn = saved.soundOn;
    if (Array.isArray(saved.history)) state.history = saved.history.slice(0, 3);
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode:    state.mode,
      soundOn: state.soundOn,
      history: state.history,
    }));
  } catch (_) {}
}

// ── Dice logic ─────────────────────────────────────────────────────────
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(count, sides) {
  return Array.from({ length: count }, () => rollDie(sides));
}

// エモクロア: classify each d10 result
function classifyDie(value, targetValue) {
  if (value === 1)           return 'critical'; // always critical
  if (value === 10)          return 'error';    // always error
  if (value <= targetValue)  return 'success';
  return 'failure';
}

// 出目1: +2 (通常成功+クリティカルボーナス), 出目10: -1, それ以外: 判定値以下で+1
function countSuccesses(dice, targetValue) {
  return dice.reduce((sum, v) => {
    if (v === 1)            return sum + 2;
    if (v === 10)           return sum - 1;
    if (v <= targetValue)   return sum + 1;
    return sum;
  }, 0);
}

function getResultInfo(successes) {
  if (successes < 0)   return { label: 'ファンブル',    cls: 'fumble'      };
  if (successes === 0) return { label: '失敗',          cls: 'fail'        };
  if (successes === 1) return { label: 'シングル',      cls: 'single'      };
  if (successes === 2) return { label: 'ダブル',        cls: 'double'      };
  if (successes === 3) return { label: 'トリプル',      cls: 'triple'      };
  if (successes <= 9)  return { label: 'ミラクル',      cls: 'miracle'     };
  return               { label: 'カタストロフ',  cls: 'catastrophe' };
}

// ── Audio ──────────────────────────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playRollSound() {
  if (!state.soundOn) return;
  try {
    const ctx = getAudioCtx();
    const duration = 0.32;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.4) * 0.55;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 700;
    const gain = ctx.createGain();
    gain.gain.value = 0.65;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(ctx.currentTime);
  } catch (_) {}
}

function playResultSound(cls) {
  if (!state.soundOn) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';

    switch (cls) {
      case 'fumble':
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.35);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
        break;
      case 'fail':
        osc.frequency.setValueAtTime(340, now);
        gain.gain.setValueAtTime(0.13, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now); osc.stop(now + 0.28);
        break;
      case 'miracle':
      case 'catastrophe': {
        osc.type = 'triangle';
        const freq = cls === 'catastrophe' ? 1050 : 840;
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.connect(gain);
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 1.2, now + 0.15);
        osc2.frequency.setValueAtTime(freq * 1.5, now + 0.1);
        gain.gain.setValueAtTime(0.13, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);  osc.stop(now + 0.28);
        osc2.start(now + 0.1); osc2.stop(now + 0.5);
        break;
      }
      default:
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(820, now + 0.09);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now); osc.stop(now + 0.38);
    }
  } catch (_) {}
}

// ── History ────────────────────────────────────────────────────────────
function addHistory(text) {
  state.history.unshift({ text });
  if (state.history.length > 3) state.history.pop();
  renderHistory();
  saveState();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  if (state.history.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = 'まだロールしていません';
    list.appendChild(li);
    return;
  }
  const timeLabels = ['今回', '前回', '前々回'];
  state.history.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    const label = document.createElement('span');
    label.className = 'history-time-label';
    label.textContent = timeLabels[i];
    li.appendChild(label);
    li.appendChild(document.createTextNode(entry.text));
    list.appendChild(li);
  });
}

// ── Die element factory ────────────────────────────────────────────────
function makeDieEl(value, cls) {
  const el = document.createElement('div');
  el.className = `die ${cls}`;
  el.textContent = value;
  if (cls === 'critical' || cls === 'error') {
    const badge = document.createElement('span');
    badge.className = 'die-badge';
    badge.textContent = cls === 'critical' ? '★' : '✕';
    el.appendChild(badge);
  }
  return el;
}

// ── エモクロア roll ────────────────────────────────────────────────────
function rollEmoklore(skillLabel) {
  const btn = document.getElementById('roll-btn');
  if (btn.disabled) return;
  btn.disabled = true;

  const count   = state.diceCount;
  const target  = state.targetValue;
  const results = rollDice(count, 10);
  const successes = countSuccesses(results, target);
  const { label, cls } = getResultInfo(successes);
  const prefix = (typeof skillLabel === 'string' && skillLabel) ? skillLabel + ' ' : '';

  playRollSound();

  const resultArea    = document.getElementById('emoklore-result');
  const diceDisplay   = document.getElementById('dice-display');
  const successCountEl = document.getElementById('success-count');
  const resultLabelEl  = document.getElementById('result-label');

  // Show / animate result container
  resultArea.classList.remove('hidden', 'entering');
  void resultArea.offsetWidth; // reflow to restart animation
  resultArea.classList.add('entering');

  // Reset sub-elements
  successCountEl.textContent = '—';
  successCountEl.style.color = '';
  resultLabelEl.textContent  = '';
  resultLabelEl.className    = 'result-label';

  if (state.mode === 'lively') {
    // Build rolling dice
    diceDisplay.innerHTML = '';
    let tumbledCount = 0;

    const cyclers = [];
    const dieEls = results.map((_, i) => {
      const el = document.createElement('div');
      el.className = 'die rolling';
      el.style.animationDelay = `${i * 60}ms`;
      el.textContent = rollDie(10);
      diceDisplay.appendChild(el);
      cyclers.push(setInterval(() => { el.textContent = rollDie(10); }, 70));
      return el;
    });

    // 各ダイスはdiceTumble終了次第すぐ数字を表示（ポップなし）
    dieEls.forEach((el, i) => {
      el.addEventListener('animationend', () => {
        clearInterval(cyclers[i]);

        const v    = results[i];
        const dcls = classifyDie(v, target);
        el.textContent = '';
        el.className   = `die ${dcls}`;
        el.textContent = v;
        if (dcls === 'critical' || dcls === 'error') {
          const badge = document.createElement('span');
          badge.className = 'die-badge';
          badge.textContent = dcls === 'critical' ? '★' : '✕';
          el.appendChild(badge);
        }

        tumbledCount++;
        if (tumbledCount < count) return;

        // 全数字が揃ったら成功数を表示
        setTimeout(() => {
          successCountEl.textContent = successes;
          successCountEl.classList.add('pop');
          successCountEl.addEventListener('animationend',
            () => successCountEl.classList.remove('pop'), { once: true });

          setTimeout(() => {
            resultLabelEl.textContent = label;
            resultLabelEl.className = `result-label ${cls} visible`;
            playResultSound(cls);
            btn.disabled = false;

            const sign = successes > 0 ? '+' : '';
            addHistory(`${prefix}${count}d10(判${target}) → ${label} (${sign}${successes})`);
          }, 240);
        }, 160);
      }, { once: true });
    });

  } else {
    // Simple mode: instant
    diceDisplay.innerHTML = '';
    results.forEach(v => diceDisplay.appendChild(makeDieEl(v, classifyDie(v, target))));

    successCountEl.textContent = successes;
    resultLabelEl.textContent  = label;
    resultLabelEl.className    = `result-label ${cls} visible`;
    playResultSound(cls);
    btn.disabled = false;

    const sign = successes > 0 ? '+' : '';
    addHistory(`${prefix}${count}d10(判${target}) → ${label} (${sign}${successes})`);
  }
}

// ── Extra dice roll ────────────────────────────────────────────────────
function addToPool(sides) {
  const existing = state.extraPool.find(e => e.sides === sides);
  if (existing) { existing.count++; } else { state.extraPool.push({ sides, count: 1 }); }
  renderPool();
}

function changePoolCount(sides, delta) {
  const existing = state.extraPool.find(e => e.sides === sides);
  if (!existing) return;
  existing.count = Math.max(0, existing.count + delta);
  if (existing.count === 0) state.extraPool = state.extraPool.filter(e => e.sides !== sides);
  renderPool();
}

function renderPool() {
  const poolEl = document.getElementById('extra-pool');
  if (state.extraPool.length === 0) {
    poolEl.innerHTML = '<span class="pool-empty">ダイスをタップして追加</span>';
    return;
  }
  poolEl.innerHTML = state.extraPool.map(({ sides, count }, i) =>
    (i > 0 ? '<span class="pool-sep">＋</span>' : '') +
    `<div class="pool-item">
      <button class="pool-btn" data-sides="${sides}" data-delta="-1">－</button>
      <span class="pool-label">${count}D${sides}</span>
      <button class="pool-btn" data-sides="${sides}" data-delta="1">＋</button>
    </div>`
  ).join('');
  poolEl.querySelectorAll('.pool-btn').forEach(btn => {
    btn.addEventListener('click', () =>
      changePoolCount(parseInt(btn.dataset.sides), parseInt(btn.dataset.delta))
    );
  });
}

function rollExtra() {
  const btn = document.getElementById('extra-roll-btn');
  if (btn.disabled) return;

  // プールが空なら前回と同じ構成を使う（裏機能）
  if (state.extraPool.length === 0) {
    if (state.lastPool.length === 0) return;
    state.extraPool = state.lastPool.map(e => ({ ...e }));
  }
  btn.disabled = true;

  // 前回プールを保存してリセット
  state.lastPool = state.extraPool.map(e => ({ ...e }));
  state.extraPool = [];
  renderPool();

  // プールをフラット化
  const allDice = [];
  state.lastPool.forEach(({ sides, count }) => {
    for (let i = 0; i < count; i++) allDice.push({ sides, value: rollDie(sides) });
  });
  const total = allDice.reduce((a, d) => a + d.value, 0);
  const historyText = state.lastPool.map(({ sides, count }) => `${count}D${sides}`).join('+') + ` → 合計 ${total}`;

  playRollSound();

  const resultArea  = document.getElementById('extra-result');
  const diceDisplay = document.getElementById('extra-dice-display');
  const totalEl     = document.getElementById('extra-total');

  resultArea.classList.remove('hidden', 'entering');
  void resultArea.offsetWidth;
  resultArea.classList.add('entering');
  totalEl.innerHTML = '';

  if (state.mode === 'lively') {
    diceDisplay.innerHTML = '';
    let tumbledCount = 0;
    const cyclers = [];

    const dieEls = allDice.map(({ sides }, i) => {
      const el = document.createElement('div');
      el.className = 'die rolling';
      el.style.animationDelay = `${i * 60}ms`;
      el.textContent = rollDie(sides);
      diceDisplay.appendChild(el);
      cyclers.push(setInterval(() => { el.textContent = rollDie(sides); }, 70));
      return el;
    });

    dieEls.forEach((el, i) => {
      el.addEventListener('animationend', () => {
        clearInterval(cyclers[i]);
        el.className = 'die success';
        el.textContent = allDice[i].value;

        tumbledCount++;
        if (tumbledCount === allDice.length) {
          setTimeout(() => {
            totalEl.innerHTML = `<span class="extra-total-label">合計</span><strong>${total}</strong>`;
            btn.disabled = false;
            addHistory(historyText);
          }, 160);
        }
      }, { once: true });
    });

  } else {
    diceDisplay.innerHTML = '';
    allDice.forEach(({ value }) => {
      const el = document.createElement('div');
      el.className = 'die success';
      el.textContent = value;
      diceDisplay.appendChild(el);
    });
    totalEl.innerHTML = `<span class="extra-total-label">合計</span><strong>${total}</strong>`;
    btn.disabled = false;
    addHistory(historyText);
  }
}

// ── UI wiring ──────────────────────────────────────────────────────────
function switchToTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  ['emoklore', 'chara', 'extra', 'status', 'note'].forEach(id => {
    const el = document.getElementById(`tab-${id}`);
    if (el) el.classList.toggle('hidden', tab !== id);
  });
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
  });
}

function setupSteppers() {
  const limits = {
    diceCount:   { min: 1, max: Infinity },
    targetValue: { min: 1, max: 10 },
  };
  document.querySelectorAll('.stepper-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key   = btn.dataset.target;
      const delta = parseInt(btn.dataset.delta, 10);
      const lim   = limits[key];
      state[key]  = Math.min(lim.max, Math.max(lim.min, state[key] + delta));
      document.getElementById(`${key}-display`).textContent = state[key];
      saveState();
    });
  });
}

function setupDiceTypeButtons() {
  document.querySelectorAll('.dice-type-btn[data-sides]').forEach(btn => {
    btn.addEventListener('click', () => addToPool(parseInt(btn.dataset.sides, 10)));
  });

  const customBtn    = document.getElementById('extra-custom-btn');
  const customRow    = document.getElementById('extra-custom-row');
  const customInput  = document.getElementById('extra-custom-sides');
  const customAddBtn = document.getElementById('extra-custom-add-btn');

  customBtn.addEventListener('click', () => {
    customRow.classList.toggle('hidden');
    if (!customRow.classList.contains('hidden')) customInput.focus();
  });

  function addCustomDie() {
    const sides = parseInt(customInput.value, 10);
    if (!sides || sides < 2) return;
    addToPool(sides);
    customInput.value = '';
    customRow.classList.add('hidden');
  }
  customAddBtn.addEventListener('click', addCustomDie);
  customInput.addEventListener('keydown', e => { if (e.key === 'Enter') addCustomDie(); });
}

function setupSettings() {
  const overlay   = document.getElementById('settings-overlay');
  const openBtn   = document.getElementById('settings-btn');
  const closeBtn  = document.getElementById('settings-close-btn');
  const soundBtn  = document.getElementById('sound-toggle-btn');

  openBtn.addEventListener('click',  () => overlay.classList.remove('hidden'));
  closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click',  e => { if (e.target === overlay) overlay.classList.add('hidden'); });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
      saveState();
    });
  });

  soundBtn.addEventListener('click', () => {
    state.soundOn = !state.soundOn;
    soundBtn.classList.toggle('on', state.soundOn);
    soundBtn.querySelector('.sound-icon').textContent  = state.soundOn ? '🔊' : '🔇';
    soundBtn.querySelector('.sound-label').textContent = state.soundOn ? 'ON'  : 'OFF';
    soundBtn.setAttribute('aria-pressed', String(state.soundOn));
    saveState();
  });
}

function syncUIToState() {
  ['diceCount', 'targetValue'].forEach(key => {
    const el = document.getElementById(`${key}-display`);
    if (el) el.textContent = state[key];
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });

  const soundBtn = document.getElementById('sound-toggle-btn');
  soundBtn.classList.toggle('on', state.soundOn);
  soundBtn.querySelector('.sound-icon').textContent  = state.soundOn ? '🔊' : '🔇';
  soundBtn.querySelector('.sound-label').textContent = state.soundOn ? 'ON'  : 'OFF';
  soundBtn.setAttribute('aria-pressed', String(state.soundOn));
}

// ── Memo state ─────────────────────────────────────────────────────────
const MEMO_KEY = 'emoklore-memo-v1';

let linked = false; // 起動/リセット直後にmax==currentなら最大値に現在値を追従させるフラグ

const memo = {
  hpCurrent:    11,
  hpMax:        11,
  mpCurrent:    7,
  mpMax:        7,
  initiative:   0,
  emotionOmote: '',
  emotionUra:   '',
  emotionRoots: '',
  infinityLevel: 1,
};

// 感情データ
const EMOTIONS = {
  '欲望': ['自己顕示', '所有', '本能', '破壊', '優越感', '怠惰', '逃避', '好奇心', 'スリル'],
  '情念': ['喜び', '怒り', '哀しみ', '幸福', '不安', '嫌悪', '恐怖', '嫉妬', '恨み'],
  '理想': ['正義', '崇拝', '善悪', '希望', '向上', '理性', '勝利', '秩序', '憧憬', '無我'],
  '関係': ['友情', '愛', '恋', '依存', '尊敬', '軽蔑', '庇護', '支配', '奉仕', '甘え'],
  '傷':   ['後悔', '孤独', '諦観', '絶望', '否定', '疑念', '罪悪感', '狂気', '劣等感'],
};

const EMOTION_ATTR = {};
for (const [group, list] of Object.entries(EMOTIONS)) {
  list.forEach(e => { EMOTION_ATTR[e] = group; });
}

function formatEmotion(name) {
  if (!name) return '—';
  const attr = EMOTION_ATTR[name];
  return attr ? `${name}(${attr})` : name;
}

function buildEmotionHTML() {
  let html = '<option value="">── 未設定 ──</option>';
  for (const [group, list] of Object.entries(EMOTIONS)) {
    html += `<optgroup label="${group}">`;
    list.forEach(e => { html += `<option value="${e}">${e}(${group})</option>`; });
    html += '</optgroup>';
  }
  return html;
}

function populateEmotionSelects() {
  const html = buildEmotionHTML();
  ['emotion-omote', 'emotion-ura', 'emotion-roots'].forEach(id => {
    document.getElementById(id).innerHTML = html;
  });
}

function loadMemo() {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMO_KEY));
    if (!saved) return;
    Object.keys(memo).forEach(k => { if (saved[k] != null) memo[k] = saved[k]; });
  } catch (_) {}
}

function saveMemo() {
  try { localStorage.setItem(MEMO_KEY, JSON.stringify(memo)); } catch (_) {}
}

function updateBar(barId, current, max) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  bar.style.width = `${pct}%`;
  if (max === 0 || pct > 50)     bar.style.removeProperty('background-color');
  else if (pct > 25)             bar.style.backgroundColor = 'var(--color-miracle)';
  else                           bar.style.backgroundColor = 'var(--die-error)';
}

function setInputVal(id, value) {
  const el = document.getElementById(id);
  if (!el || document.activeElement === el) return;
  el.value = value;
}

function syncMemoUI() {
  // メモタブ（入力中のフィールドはスキップ）
  setInputVal('hp-current', memo.hpCurrent);
  setInputVal('hp-max-val', memo.hpMax);
  setInputVal('mp-current', memo.mpCurrent);
  setInputVal('mp-max-val', memo.mpMax);
  document.getElementById('initiative-val').textContent       = memo.initiative;
  document.getElementById('emotion-omote').value              = memo.emotionOmote;
  document.getElementById('emotion-ura').value                = memo.emotionUra;
  document.getElementById('emotion-roots').value              = memo.emotionRoots;
  document.getElementById('infinity-level-val').textContent   = memo.infinityLevel;
  updateBar('hp-bar', memo.hpCurrent, memo.hpMax);
  updateBar('mp-bar', memo.mpCurrent, memo.mpMax);

  // エモクロア判定タブ ステータスバー
  const hpText = document.getElementById('status-hp-text');
  const mpText = document.getElementById('status-mp-text');
  const initEl = document.getElementById('status-initiative');
  if (hpText) {
    hpText.innerHTML = memo.hpMax > 0
      ? `<span class="status-current-val">${memo.hpCurrent}</span><span class="status-max-suffix"> / ${memo.hpMax}</span>`
      : '—';
  }
  if (mpText) {
    mpText.innerHTML = memo.mpMax > 0
      ? `<span class="status-current-val">${memo.mpCurrent}</span><span class="status-max-suffix"> / ${memo.mpMax}</span>`
      : '—';
  }
  if (initEl) initEl.textContent = memo.initiative;
  const infinityEl = document.getElementById('status-infinity-level');
  if (infinityEl) infinityEl.textContent = memo.infinityLevel;
  updateBar('status-hp-bar', memo.hpCurrent, memo.hpMax);
  updateBar('status-mp-bar', memo.mpCurrent, memo.mpMax);

  // 共鳴感情（エモクロア判定タブ）
  const emoDisplays = {
    'status-emotion-omote': memo.emotionOmote,
    'status-emotion-ura':   memo.emotionUra,
    'status-emotion-roots': memo.emotionRoots,
  };
  for (const [id, val] of Object.entries(emoDisplays)) {
    const el = document.getElementById(id);
    if (el) el.textContent = formatEmotion(val);
  }

  // キャラタブ側の共鳴感情セレクト・∞共鳴レベル
  const charaEmo = {
    'chara-emotion-omote': memo.emotionOmote,
    'chara-emotion-ura':   memo.emotionUra,
    'chara-emotion-roots': memo.emotionRoots,
  };
  for (const [id, val] of Object.entries(charaEmo)) {
    const el = document.getElementById(id);
    if (el && el.value !== val) el.value = val;
  }
  const charaInf = document.getElementById('chara-infinity');
  if (charaInf) charaInf.textContent = memo.infinityLevel;
}

// ── HP/MP履歴 debounce ─────────────────────────────────────────────────
let hpHistoryTimer       = null;
let hpHistoryBefore      = null;
let mpHistoryTimer       = null;
let mpHistoryBefore      = null;
let infinityHistoryTimer  = null;
let infinityHistoryBefore = null;

function scheduleHpHistory() {
  clearTimeout(hpHistoryTimer);
  hpHistoryTimer = setTimeout(() => {
    const after = memo.hpCurrent;
    if (hpHistoryBefore !== null && after !== hpHistoryBefore) {
      const diff = after - hpHistoryBefore;
      const sign = diff > 0 ? '＋' : '－';
      addHistory(`HP ${hpHistoryBefore}→${after} (${sign}${Math.abs(diff)})`);
    }
    hpHistoryBefore = null;
    hpHistoryTimer  = null;
  }, 1500);
}

function scheduleMpHistory() {
  clearTimeout(mpHistoryTimer);
  mpHistoryTimer = setTimeout(() => {
    const after = memo.mpCurrent;
    if (mpHistoryBefore !== null && after !== mpHistoryBefore) {
      const diff = after - mpHistoryBefore;
      const sign = diff > 0 ? '＋' : '－';
      addHistory(`MP ${mpHistoryBefore}→${after} (${sign}${Math.abs(diff)})`);
    }
    mpHistoryBefore = null;
    mpHistoryTimer  = null;
  }, 1500);
}

function scheduleInfinityHistory() {
  clearTimeout(infinityHistoryTimer);
  infinityHistoryTimer = setTimeout(() => {
    const after = memo.infinityLevel;
    if (infinityHistoryBefore !== null && after !== infinityHistoryBefore) {
      const diff = after - infinityHistoryBefore;
      const sign = diff > 0 ? '＋' : '－';
      addHistory(`∞共鳴 ${infinityHistoryBefore}→${after} (${sign}${Math.abs(diff)})`);
    }
    infinityHistoryBefore = null;
    infinityHistoryTimer  = null;
  }, 1500);
}

function setupMemo() {
  // ステッパーボタン（data-memo 属性を持つもの）
  document.querySelectorAll('.stepper-btn[data-memo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key   = btn.dataset.memo;
      const delta = parseInt(btn.dataset.delta, 10);

      if (key === 'hpCurrent'      && hpHistoryBefore      === null) hpHistoryBefore      = memo.hpCurrent;
      if (key === 'mpCurrent'      && mpHistoryBefore      === null) mpHistoryBefore      = memo.mpCurrent;
      if (key === 'infinityLevel'  && infinityHistoryBefore === null) infinityHistoryBefore = memo.infinityLevel;

      let val = memo[key] + delta;

      if (key === 'hpMax')     val = Math.max(0, val);
      if (key === 'mpMax')     val = Math.max(0, val);
      // hpCurrent / mpCurrent / infinityLevel はマイナスあり（下限なし）

      memo[key] = val;
      if (key === 'hpCurrent' || key === 'mpCurrent') linked = false;
      if (linked && key === 'hpMax') memo.hpCurrent = val;
      if (linked && key === 'mpMax') memo.mpCurrent = val;
      if (key === 'hpCurrent')     scheduleHpHistory();
      if (key === 'mpCurrent')     scheduleMpHistory();
      if (key === 'infinityLevel') scheduleInfinityHistory();
      syncMemoUI();
      saveMemo();
    });
  });

  // HP / MP 直接入力
  const directFields = {
    'hp-max-val':  'hpMax',
    'hp-current':  'hpCurrent',
    'mp-max-val':  'mpMax',
    'mp-current':  'mpCurrent',
  };
  Object.entries(directFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const val = parseInt(el.value, 10);
      if (isNaN(val)) return;
      if (id === 'hp-current' && hpHistoryBefore === null) hpHistoryBefore = memo.hpCurrent;
      if (id === 'mp-current' && mpHistoryBefore === null) mpHistoryBefore = memo.mpCurrent;
      if (id === 'hp-current' || id === 'mp-current') linked = false;
      if (linked && id === 'hp-max-val') { memo.hpCurrent = val; setInputVal('hp-current', val); }
      if (linked && id === 'mp-max-val') { memo.mpCurrent = val; setInputVal('mp-current', val); }
      memo[key] = val;
      if (id === 'hp-current') scheduleHpHistory();
      if (id === 'mp-current') scheduleMpHistory();
      updateBar('hp-bar', memo.hpCurrent, memo.hpMax);
      updateBar('mp-bar', memo.mpCurrent, memo.mpMax);
      updateBar('status-hp-bar', memo.hpCurrent, memo.hpMax);
      updateBar('status-mp-bar', memo.mpCurrent, memo.mpMax);
      const hpText = document.getElementById('status-hp-text');
      const mpText = document.getElementById('status-mp-text');
      if (hpText) hpText.textContent = memo.hpMax > 0 ? `${memo.hpCurrent} / ${memo.hpMax}` : '—';
      if (mpText) mpText.textContent = memo.mpMax > 0 ? `${memo.mpCurrent} / ${memo.mpMax}` : '—';
      saveMemo();
    });
    el.addEventListener('blur', () => {
      const isCurrent = key === 'hpCurrent' || key === 'mpCurrent';
      const val = isCurrent
        ? (parseInt(el.value, 10) || 0)
        : Math.max(0, parseInt(el.value, 10) || 0);
      memo[key] = val;
      el.value = val;
      saveMemo();
    });
  });

  // 共鳴感情（表/裏/ルーツ）
  const emotionMap = {
    'emotion-omote': 'emotionOmote',
    'emotion-ura':   'emotionUra',
    'emotion-roots': 'emotionRoots',
  };
  Object.entries(emotionMap).forEach(([id, key]) => {
    document.getElementById(id).addEventListener('change', e => {
      memo[key] = e.target.value;
      syncMemoUI();
      saveMemo();
    });
  });
}

// ── Note tab ───────────────────────────────────────────────────────────
const NOTE_KEY = 'emoklore-note-v1';

function setupNote() {
  const area = document.getElementById('note-area');
  try { area.value = localStorage.getItem(NOTE_KEY) || ''; } catch (_) {}
  area.addEventListener('input', () => {
    try { localStorage.setItem(NOTE_KEY, area.value); } catch (_) {}
  });
}

// ── Session reset ──────────────────────────────────────────────────────
function setupReset() {
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('キャラクター・ステータス・メモ・履歴をリセットします。\nこの操作は元に戻せません。よろしいですか？')) return;
    localStorage.removeItem(MEMO_KEY);
    localStorage.removeItem(NOTE_KEY);
    localStorage.removeItem(CHARA_KEY);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        saved.history = [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
    } catch (_) {}
    location.reload();
  });
}

// ── Data export / import ───────────────────────────────────────────────
function encodeBundle(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function decodeBundle(b64) {
  const bin = atob(b64.trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function buildExportCode() {
  return encodeBundle({
    m: JSON.parse(localStorage.getItem(MEMO_KEY) || 'null'),
    n: localStorage.getItem(NOTE_KEY) || '',
    c: JSON.parse(localStorage.getItem(CHARA_KEY) || 'null'),
  });
}

function applyImport(code) {
  const bundle = decodeBundle(code);
  if (bundle.m != null) localStorage.setItem(MEMO_KEY, JSON.stringify(bundle.m));
  if (bundle.n != null) localStorage.setItem(NOTE_KEY, bundle.n);
  if (bundle.c != null) localStorage.setItem(CHARA_KEY, JSON.stringify(bundle.c));
  location.reload();
}

function setupDataTransfer() {
  const exportToggle  = document.getElementById('export-toggle-btn');
  const exportArea    = document.getElementById('export-area');
  const exportText    = document.getElementById('export-text');
  const exportCopyBtn = document.getElementById('export-copy-btn');
  const exportDlBtn   = document.getElementById('export-download-btn');

  exportToggle.addEventListener('click', () => {
    const opening = exportArea.classList.toggle('hidden') === false;
    if (opening) exportText.value = buildExportCode();
  });

  exportCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(exportText.value).then(() => {
      exportCopyBtn.textContent = 'コピーしました！';
      setTimeout(() => { exportCopyBtn.textContent = 'コピー'; }, 2000);
    }).catch(() => {
      exportText.select();
      document.execCommand('copy');
    });
  });

  exportDlBtn.addEventListener('click', () => {
    const blob = new Blob([exportText.value], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'emoklore-save.txt';
    a.click();
    URL.revokeObjectURL(url);
  });

  const importToggle   = document.getElementById('import-toggle-btn');
  const importArea     = document.getElementById('import-area');
  const importText     = document.getElementById('import-text');
  const importApplyBtn = document.getElementById('import-apply-btn');

  importToggle.addEventListener('click', () => {
    importArea.classList.toggle('hidden');
  });

  importApplyBtn.addEventListener('click', () => {
    const code = importText.value.trim();
    if (!code) return;
    try {
      applyImport(code);
    } catch (_) {
      alert('セーブコードが正しくありません');
    }
  });
}

// ── Install / Add to Home Screen ──────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const row = document.getElementById('install-row');
  if (row) row.style.display = 'none';
});

function setupInstallButton() {
  const installRow = document.getElementById('install-row');
  const installBtn = document.getElementById('install-btn');
  const guideOverlay = document.getElementById('ios-guide-overlay');

  const isIos    = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isMobile = isIos || /android/i.test(navigator.userAgent.toLowerCase());

  if (!isMobile) {
    installRow.style.display = 'none';
    return;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (isStandalone) {
    installRow.style.display = 'none';
    return;
  }

  installBtn.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      deferredInstallPrompt = null;
    } else if (isIos) {
      guideOverlay.classList.remove('hidden');
    } else {
      installBtn.textContent = 'ブラウザのメニューから追加できます';
      installBtn.disabled = true;
    }
  });

  document.getElementById('ios-guide-close').addEventListener('click', () => {
    guideOverlay.classList.add('hidden');
  });
  guideOverlay.addEventListener('click', e => {
    if (e.target === guideOverlay) guideOverlay.classList.add('hidden');
  });
}

// ── Ad banner ──────────────────────────────────────────────────────────
const AD_ROTATE_MS = 120000; // 2分
let adList  = [];
let adIndex = 0;

function applyAd(index) {
  const { image, name, url } = adList[index];
  const banner = document.getElementById('ad-banner');
  const thumb  = banner.querySelector('.ad-thumb');
  thumb.style.display = '';
  banner.querySelector('.ad-link').href       = url;
  banner.querySelector('.ad-name').textContent = name;
  thumb.alt = name;
  thumb.src = `adsimg/${image}`;
}

function rotateAd() {
  if (adList.length <= 1) return;
  const link = document.querySelector('#ad-banner .ad-link');
  link.classList.add('flip-out');
  setTimeout(() => {
    adIndex = (adIndex + 1) % adList.length;
    applyAd(adIndex);
    link.classList.remove('flip-out');
    link.classList.add('flip-in');
    setTimeout(() => link.classList.remove('flip-in'), 220);
  }, 220);
}

async function setupAd() {
  try {
    const res = await fetch('ads.csv');
    if (!res.ok) return;
    const lines = (await res.text()).trim().split('\n').slice(1).filter(l => l.trim());
    adList = lines.map(line => {
      const parts = line.split(',');
      if (parts.length < 3) return null;
      const image = parts[0].trim();
      const name  = parts[1].trim();
      const url   = parts.slice(2).join(',').trim();
      return (image && url) ? { image, name, url } : null;
    }).filter(Boolean);
    if (adList.length === 0) return;
    adIndex = Math.floor(Math.random() * adList.length);
    const banner = document.getElementById('ad-banner');
    const thumb  = banner.querySelector('.ad-thumb');
    thumb.onerror = () => { thumb.style.display = 'none'; };
    applyAd(adIndex);
    banner.classList.remove('hidden');
    if (adList.length > 1) setInterval(rotateAd, AD_ROTATE_MS);
  } catch (_) {}
}

// ── Character sheet ────────────────────────────────────────────────────
const CHARA_KEY = 'emoklore-chara-v1';

const ABILITIES = [
  { key: '身体', emoji: '💪' },
  { key: '器用', emoji: '👋' },
  { key: '精神', emoji: '😶' },
  { key: '五感', emoji: '👂' },
  { key: '知力', emoji: '📖' },
  { key: '魅力', emoji: '💘' },
  { key: '社会', emoji: '💳' },
  { key: '運勢', emoji: '🎲' },
];
const ABILITY_EMOJI = {};
ABILITIES.forEach(a => { ABILITY_EMOJI[a.key] = a.emoji; });

// type: base / normal / ex / infinity
// formula: plus=能力+レベル / base=能力のみ(ベース技能,Lv1固定) /
//          half=⌈能力÷2⌉(ベース技能) / halfFixed=⌈能力÷2⌉(レベルで判定値不変) /
//          special=∞共鳴(通常判定なし)
// abil: 参照能力の候補（複数なら振る時に最も高い能力を自動採用）
const SKILLS = [
  // 調査系
  { id:'調査',       cat:'調査系', type:'base',     abil:['器用'],               formula:'base' },
  { id:'検索',       cat:'調査系', type:'normal',   abil:['知力'],               formula:'plus' },
  { id:'洞察',       cat:'調査系', type:'normal',   abil:['知力'],               formula:'plus' },
  { id:'マッピング', cat:'調査系', type:'normal',   abil:['器用','五感'],        formula:'plus' },
  { id:'直感',       cat:'調査系', type:'normal',   abil:['精神','運勢'],        formula:'plus' },
  { id:'鑑定',       cat:'調査系', type:'normal',   abil:['五感','知力'],        formula:'plus' },
  // 知覚系
  { id:'知覚',       cat:'知覚系', type:'base',     abil:['五感'],               formula:'base' },
  { id:'観察眼',     cat:'知覚系', type:'normal',   abil:['五感'],               formula:'plus' },
  { id:'聞き耳',     cat:'知覚系', type:'normal',   abil:['五感'],               formula:'plus' },
  { id:'毒見',       cat:'知覚系', type:'normal',   abil:['五感'],               formula:'plus' },
  { id:'危機察知',   cat:'知覚系', type:'normal',   abil:['五感','運勢'],        formula:'plus' },
  { id:'霊感',       cat:'知覚系', type:'ex',       abil:['精神','運勢'],        formula:'plus' },
  // 交渉系
  { id:'交渉',       cat:'交渉系', type:'base',     abil:['魅力'],               formula:'base' },
  { id:'社交術',     cat:'交渉系', type:'normal',   abil:['社会'],               formula:'plus' },
  { id:'ディベート', cat:'交渉系', type:'normal',   abil:['知力'],               formula:'plus' },
  { id:'魅了',       cat:'交渉系', type:'normal',   abil:['魅力'],               formula:'plus' },
  { id:'心理',       cat:'交渉系', type:'normal',   abil:['精神','知力'],        formula:'plus' },
  // 情報系
  { id:'知識',       cat:'情報系', type:'base',     abil:['知力'],               formula:'base' },
  { id:'専門知識',   cat:'情報系', type:'normal',   abil:['知力'],               formula:'plus', named:true },
  { id:'ニュース',   cat:'情報系', type:'base',     abil:['社会'],               formula:'base' },
  { id:'事情通',     cat:'情報系', type:'normal',   abil:['五感','社会'],        formula:'plus' },
  { id:'業界',       cat:'情報系', type:'normal',   abil:['社会','魅力'],        formula:'plus', named:true },
  // 運動系
  { id:'運動',       cat:'運動系', type:'base',     abil:['身体'],               formula:'base' },
  { id:'スピード',   cat:'運動系', type:'normal',   abil:['身体'],               formula:'plus' },
  { id:'ストレングス', cat:'運動系', type:'normal', abil:['身体'],               formula:'plus' },
  { id:'アクロバット', cat:'運動系', type:'normal', abil:['身体','器用'],        formula:'plus' },
  { id:'ダイブ',     cat:'運動系', type:'normal',   abil:['身体'],               formula:'plus' },
  { id:'格闘',       cat:'運動系', type:'base',     abil:['身体'],               formula:'base' },
  { id:'武術',       cat:'運動系', type:'normal',   abil:['身体'],               formula:'plus', named:true },
  { id:'奥義',       cat:'運動系', type:'ex',       abil:['身体','精神','器用'], formula:'plus', named:true, max1:true },
  { id:'投擲',       cat:'運動系', type:'base',     abil:['器用'],               formula:'base' },
  { id:'射撃',       cat:'運動系', type:'ex',       abil:['器用','五感'],        formula:'plus', named:true },
  // 生存系
  { id:'生存',       cat:'生存系', type:'base',     abil:['身体'],               formula:'base' },
  { id:'耐久',       cat:'生存系', type:'normal',   abil:['身体'],               formula:'plus' },
  { id:'自我',       cat:'生存系', type:'base',     abil:['精神'],               formula:'base' },
  { id:'根性',       cat:'生存系', type:'normal',   abil:['精神'],               formula:'plus' },
  { id:'手当て',     cat:'生存系', type:'base',     abil:['知力'],               formula:'half',      hint:'判定値=知力÷2(切上)' },
  { id:'医術',       cat:'生存系', type:'normal',   abil:['器用','知力'],        formula:'plus' },
  { id:'蘇生',       cat:'生存系', type:'ex',       abil:['知力','精神'],        formula:'halfFixed', hint:'判定値=能力÷2(切上)・Lvで判定値不変' },
  // 特殊
  { id:'細工',       cat:'特殊',   type:'base',     abil:['器用'],               formula:'base' },
  { id:'技巧',       cat:'特殊',   type:'normal',   abil:['器用'],               formula:'plus', named:true },
  { id:'芸術',       cat:'特殊',   type:'normal',   abil:['器用','精神','五感'], formula:'plus', named:true },
  { id:'操縦',       cat:'特殊',   type:'normal',   abil:['器用','五感','知力'], formula:'plus', named:true },
  { id:'暗号',       cat:'特殊',   type:'normal',   abil:['知力'],               formula:'plus' },
  { id:'電脳',       cat:'特殊',   type:'normal',   abil:['知力'],               formula:'plus' },
  { id:'隠匿',       cat:'特殊',   type:'normal',   abil:['器用','社会','運勢'], formula:'plus' },
  { id:'幸運',       cat:'特殊',   type:'base',     abil:['運勢'],               formula:'base' },
  { id:'強運',       cat:'特殊',   type:'ex',       abil:['運勢'],               formula:'plus' },
  { id:'∞共鳴',     cat:'特殊',   type:'infinity', abil:[],                     formula:'special' },
];
const SKILL_BY_ID = {};
SKILLS.forEach(s => { SKILL_BY_ID[s.id] = s; });
const SKILL_CATS = ['調査系', '知覚系', '交渉系', '情報系', '運動系', '生存系', '特殊'];

const ABILITY_TOTAL = 25; // 運勢以外の7能力の合計
const SKILL_TOTAL   = 30; // 技能ポイント
const NORMAL_COST = { 1: 1, 2: 5, 3: 15 };

function skillCost(type, level) {
  if (level <= 0) return 0;
  const base = NORMAL_COST[level] || 0;
  return type === 'ex' ? base * 2 : base;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const chara = {
  profile: { name:'', age:'', gender:'', origin:'', job:'', note:'' },
  abilities: { 身体:1, 器用:1, 精神:1, 五感:1, 知力:1, 魅力:1, 社会:1, 運勢:1 },
  skills: {},  // id -> level (normal/ex の非named技能)
  named: [],   // { uid, base, name, level }
};
let charaNamedUid = 1;

function loadChara() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHARA_KEY));
    if (!saved) return;
    if (saved.profile) Object.keys(chara.profile).forEach(k => {
      if (typeof saved.profile[k] === 'string') chara.profile[k] = saved.profile[k];
    });
    if (saved.abilities) ABILITIES.forEach(a => {
      const v = saved.abilities[a.key];
      if (typeof v === 'number') chara.abilities[a.key] = Math.min(6, Math.max(1, v));
    });
    if (saved.skills && typeof saved.skills === 'object') {
      chara.skills = {};
      Object.entries(saved.skills).forEach(([id, lv]) => {
        const s = SKILL_BY_ID[id];
        if (s && s.type !== 'base' && s.type !== 'infinity' && !s.named && typeof lv === 'number') {
          const clamped = Math.min(3, Math.max(0, lv));
          if (clamped > 0) chara.skills[id] = clamped;
        }
      });
    }
    if (Array.isArray(saved.named)) {
      chara.named = saved.named
        .filter(n => n && SKILL_BY_ID[n.base] && SKILL_BY_ID[n.base].named)
        .map(n => ({
          uid: charaNamedUid++,
          base: n.base,
          name: String(n.name || ''),
          level: Math.min(3, Math.max(1, n.level || 1)),
        }));
    }
  } catch (_) {}
}

function saveChara() {
  try {
    localStorage.setItem(CHARA_KEY, JSON.stringify({
      profile: chara.profile,
      abilities: chara.abilities,
      skills: chara.skills,
      named: chara.named.map(n => ({ base: n.base, name: n.name, level: n.level })),
    }));
  } catch (_) {}
}

// ── chara calculations ─────────────────────────────────────────────────
function abilityVal(key) {
  const v = chara.abilities[key];
  return (typeof v === 'number') ? v : 1;
}

function abilitySpent() {
  return ABILITIES.reduce((sum, a) => a.key === '運勢' ? sum : sum + abilityVal(a.key), 0);
}

function skillSpent() {
  let total = 0;
  Object.entries(chara.skills).forEach(([id, lv]) => {
    const s = SKILL_BY_ID[id];
    if (s) total += skillCost(s.type, lv);
  });
  chara.named.forEach(n => {
    const s = SKILL_BY_ID[n.base];
    if (s) total += skillCost(s.type, n.level);
  });
  return total;
}

function bestAbilityKey(abil) {
  let best = abil[0], bestV = -Infinity;
  abil.forEach(k => { const v = abilityVal(k); if (v > bestV) { bestV = v; best = k; } });
  return best;
}

function skillDice(skill, level) {
  if (skill.type === 'base') return 1; // ベース技能はLv1固定
  return Math.max(1, level);
}

function skillJudgment(skill, level, abilKey) {
  const a = abilityVal(abilKey);
  switch (skill.formula) {
    case 'base':      return a;
    case 'plus':      return a + level;
    case 'half':      return Math.ceil(a / 2);
    case 'halfFixed': return Math.ceil(a / 2);
    default:          return a;
  }
}

function updateDerived() {
  const hp = abilityVal('身体') + 10;
  const mp = abilityVal('精神') + abilityVal('知力');
  const hpEl = document.getElementById('chara-hp');
  const mpEl = document.getElementById('chara-mp');
  if (hpEl) hpEl.textContent = hp;
  if (mpEl) mpEl.textContent = mp;
  return { hp, mp };
}

function applyHpMpToStatus() {
  const { hp, mp } = updateDerived();
  memo.hpMax = hp;
  memo.mpMax = mp;
  memo.hpCurrent = hp; // 作成時は満タン
  memo.mpCurrent = mp;
  syncMemoUI();
  saveMemo();
}

// ── chara rendering ────────────────────────────────────────────────────
function updateAbilityPoints() {
  const el = document.getElementById('ability-points');
  if (!el) return;
  const remain = ABILITY_TOTAL - abilitySpent();
  el.textContent = `残り ${remain} / ${ABILITY_TOTAL}`;
  el.classList.toggle('over', remain < 0);
  el.classList.toggle('done', remain === 0);
}

function updateSkillPoints() {
  const el = document.getElementById('skill-points');
  if (!el) return;
  const remain = SKILL_TOTAL - skillSpent();
  el.textContent = `残り ${remain} / ${SKILL_TOTAL}`;
  el.classList.toggle('over', remain < 0);
  el.classList.toggle('done', remain === 0);
}

function renderAbilities() {
  const grid = document.getElementById('ability-grid');
  if (!grid) return;
  grid.innerHTML = ABILITIES.map(a => {
    const luck = a.key === '運勢';
    return `<div class="ability-item${luck ? ' luck' : ''}">
      <div class="ability-name">${a.emoji} ${a.key}</div>
      <div class="ability-ctrl">
        <button class="stepper-btn stepper-btn-sm" data-ability="${a.key}" data-delta="-1" aria-label="${a.key}を減らす">－</button>
        <span class="ability-val" id="ability-val-${a.key}">${abilityVal(a.key)}</span>
        <button class="stepper-btn stepper-btn-sm" data-ability="${a.key}" data-delta="1" aria-label="${a.key}を増やす">＋</button>
        ${luck ? '<button class="luck-roll-btn" id="luck-roll" aria-label="運勢を1D6で決定">🎲</button>' : ''}
      </div>
    </div>`;
  }).join('');
}

function abilTagsHtml(skill, usedKey) {
  return skill.abil.map(k =>
    `<span class="abil-tag${k === usedKey ? ' used' : ''}">${k}</span>`
  ).join('');
}

function plainRowHtml(s) {
  const isBase = s.type === 'base';
  const lv = isBase ? 1 : (chara.skills[s.id] || 0);
  const usedKey = bestAbilityKey(s.abil);
  const dice = skillDice(s, lv);
  const judg = Math.min(10, Math.max(1, skillJudgment(s, lv, usedKey)));
  const badge = s.type === 'ex'
    ? '<span class="t-badge ex">★</span>'
    : (isBase ? '<span class="t-badge base">＊</span>' : '');
  const hint = s.hint ? `<span class="f-note">${s.hint}</span>` : '';

  let lvCol;
  if (isBase) {
    lvCol = '<div class="skill-lv fixed">Lv1</div>';
  } else {
    lvCol = `<div class="skill-lv">
      <button class="lv-btn" data-skill-lv="${s.id}" data-delta="-1" aria-label="レベルを下げる">－</button>
      <span class="lv-val">${lv}</span>
      <button class="lv-btn" data-skill-lv="${s.id}" data-delta="1" aria-label="レベルを上げる">＋</button>
    </div>`;
  }

  const canRoll = isBase || lv >= 1;
  const cost = (!isBase && lv >= 1) ? ` ・ ${skillCost(s.type, lv)}pt` : '';
  const meta = canRoll
    ? `判定値 <b>${judg}</b>${cost}${hint}`
    : `<span class="muted">未取得・ベース技能で代用</span>${hint}`;
  const rollBtn = canRoll
    ? `<button class="skill-roll" data-skill-roll="${s.id}">${dice}D10</button>`
    : '<button class="skill-roll" disabled>Lv0</button>';

  return `<div class="skill-row${isBase ? ' base' : ''}">
    ${lvCol}
    <div class="skill-main">
      <div class="skill-name">${s.id}${badge}<span class="skill-tags">${abilTagsHtml(s, usedKey)}</span></div>
      <div class="skill-meta">${meta}</div>
    </div>
    ${rollBtn}
  </div>`;
}

function namedGroupHtml(s) {
  const badge = s.type === 'ex' ? '<span class="t-badge ex">★</span>' : '';
  const insts = chara.named.filter(n => n.base === s.id);
  const blockAdd = s.max1 && insts.length >= 1;

  let html = `<div class="skill-row named-head">
    <div class="skill-main">
      <div class="skill-name">${s.id}：○○${badge}<span class="skill-tags">${abilTagsHtml(s, null)}</span></div>
      <div class="skill-meta"><span class="muted">名称を付けて取得${s.max1 ? '（1つまで）' : '（複数可）'}</span></div>
    </div>
    <button class="named-add" data-named-add="${s.id}"${blockAdd ? ' disabled' : ''}>＋追加</button>
  </div>`;

  insts.forEach(n => {
    const usedKey = bestAbilityKey(s.abil);
    const dice = skillDice(s, n.level);
    const judg = Math.min(10, Math.max(1, skillJudgment(s, n.level, usedKey)));
    html += `<div class="skill-row named-inst">
      <div class="skill-lv">
        <button class="lv-btn" data-named-lv="${n.uid}" data-delta="-1" aria-label="レベルを下げる">－</button>
        <span class="lv-val">${n.level}</span>
        <button class="lv-btn" data-named-lv="${n.uid}" data-delta="1" aria-label="レベルを上げる">＋</button>
      </div>
      <div class="skill-main">
        <input class="named-name" data-named-name="${n.uid}" value="${escapeAttr(n.name)}" placeholder="名称（例：考古学）" autocomplete="off">
        <div class="skill-meta">判定値 <b>${judg}</b> ・ ${skillCost(s.type, n.level)}pt</div>
      </div>
      <button class="named-del" data-named-del="${n.uid}" aria-label="削除">✕</button>
      <button class="skill-roll" data-named-roll="${n.uid}">${dice}D10</button>
    </div>`;
  });
  return html;
}

function infinityRowHtml() {
  const lv = memo.infinityLevel || 0;
  return `<div class="skill-row infinity">
    <div class="skill-lv fixed">∞</div>
    <div class="skill-main">
      <div class="skill-name">∞共鳴</div>
      <div class="skill-meta"><span class="muted">Lv <b id="chara-infinity">${lv}</b> ・ ステータスタブで変動（上限9 / 10で逸脱）</span></div>
    </div>
  </div>`;
}

function renderSkills() {
  const list = document.getElementById('skill-list');
  if (!list) return;
  let html = '';
  SKILL_CATS.forEach(cat => {
    html += `<div class="skill-cat">${cat}技能</div>`;
    SKILLS.filter(s => s.cat === cat).forEach(s => {
      if (s.type === 'infinity') html += infinityRowHtml();
      else if (s.named)          html += namedGroupHtml(s);
      else                       html += plainRowHtml(s);
    });
  });
  list.innerHTML = html;
  updateSkillPoints();
  renderQuickSkills();
}

function quickItemHtml(it) {
  const dice = skillDice(it.skill, it.level);
  const usedKey = bestAbilityKey(it.skill.abil);
  const judg = Math.min(10, Math.max(1, skillJudgment(it.skill, it.level, usedKey)));
  const badge = it.skill.type === 'ex'
    ? '<span class="t-badge ex">★</span>'
    : (it.skill.type === 'base' ? '<span class="t-badge base">＊</span>' : '');
  const dataAttr = it.kind === 'plain'
    ? `data-quick-skill="${it.skill.id}"`
    : `data-quick-named="${it.uid}"`;
  return `<button class="quick-btn" ${dataAttr}>
    <span class="quick-name">${badge}${it.label}</span>
    <span class="quick-meta">${dice}D10 ・ 判<b>${judg}</b></span>
  </button>`;
}

function renderQuickSkills() {
  const baseWrap  = document.getElementById('quick-skills-base');
  const ownedWrap = document.getElementById('quick-skills-owned');
  if (!baseWrap || !ownedWrap) return;

  const baseItems = [];
  const ownedItems = [];
  SKILLS.forEach(s => {
    if (s.type === 'infinity' || s.named) return;
    if (s.type === 'base') {
      baseItems.push({ kind: 'plain', skill: s, level: 1, label: s.id });
    } else {
      const lv = chara.skills[s.id] || 0;
      if (lv >= 1) ownedItems.push({ kind: 'plain', skill: s, level: lv, label: `${s.id} Lv${lv}` });
    }
  });
  chara.named.forEach(n => {
    if (n.level < 1) return;
    const s = SKILL_BY_ID[n.base];
    if (!s) return;
    const head = n.name ? `${s.id}：${n.name}` : `${s.id}：○○`;
    ownedItems.push({ kind: 'named', skill: s, level: n.level, label: `${head} Lv${n.level}`, uid: n.uid });
  });

  baseWrap.innerHTML = baseItems.length
    ? baseItems.map(quickItemHtml).join('')
    : '<div class="quick-empty">ベース技能はありません</div>';
  ownedWrap.innerHTML = ownedItems.length
    ? ownedItems.map(quickItemHtml).join('')
    : '<div class="quick-empty">「キャラ」タブで技能を取得すると、ここから直接ロールできます</div>';

  const baseCount  = document.getElementById('quick-base-count');
  const ownedCount = document.getElementById('quick-owned-count');
  if (baseCount)  baseCount.textContent  = baseItems.length;
  if (ownedCount) ownedCount.textContent = ownedItems.length;
}

// ── chara actions ──────────────────────────────────────────────────────
function rollSkill(skill, level, displayName) {
  if (!skill || skill.type === 'infinity') return;
  const dice = skillDice(skill, level);
  const usedKey = bestAbilityKey(skill.abil);
  const judgment = Math.min(10, Math.max(1, skillJudgment(skill, level, usedKey)));
  state.diceCount = dice;
  state.targetValue = judgment;
  document.getElementById('diceCount-display').textContent = dice;
  document.getElementById('targetValue-display').textContent = judgment;
  switchToTab('emoklore');
  rollEmoklore(`〈${displayName}〉`);
}

function setAbility(key, delta) {
  const next = Math.min(6, Math.max(1, abilityVal(key) + delta));
  chara.abilities[key] = next;
  const el = document.getElementById(`ability-val-${key}`);
  if (el) el.textContent = next;
  updateAbilityPoints();
  applyHpMpToStatus();
  renderSkills();
  saveChara();
}

function rollLuck() {
  const v = rollDie(6);
  chara.abilities['運勢'] = v;
  const el = document.getElementById('ability-val-運勢');
  if (el) el.textContent = v;
  renderSkills();
  saveChara();
}

// 7能力に合計25点を、各1〜6の範囲でランダム配分する
function randomDistribute7() {
  const keys = ['身体', '器用', '精神', '五感', '知力', '魅力', '社会'];
  const vals = keys.map(() => 1);
  let remain = ABILITY_TOTAL - keys.length; // 25 - 7 = 18
  while (remain > 0) {
    const candidates = vals
      .map((v, i) => v < 6 ? i : -1)
      .filter(i => i >= 0);
    if (candidates.length === 0) break;
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    vals[idx]++;
    remain--;
  }
  const out = {};
  keys.forEach((k, i) => { out[k] = vals[i]; });
  return out;
}

function randomizeAbilities(includeLuck) {
  Object.assign(chara.abilities, randomDistribute7());
  if (includeLuck) chara.abilities['運勢'] = rollDie(6);
  renderAbilities();
  updateAbilityPoints();
  applyHpMpToStatus();
  renderSkills();
  saveChara();
}

function setSkillLevel(id, delta) {
  const s = SKILL_BY_ID[id];
  if (!s || s.type === 'base' || s.type === 'infinity') return;
  const next = Math.min(3, Math.max(0, (chara.skills[id] || 0) + delta));
  if (next === 0) delete chara.skills[id];
  else chara.skills[id] = next;
  saveChara();
  renderSkills();
}

function addNamed(base) {
  const s = SKILL_BY_ID[base];
  if (!s || !s.named) return;
  if (s.max1 && chara.named.some(n => n.base === base)) return;
  chara.named.push({ uid: charaNamedUid++, base, name: '', level: 1 });
  saveChara();
  renderSkills();
}

function setNamedLevel(uid, delta) {
  const n = chara.named.find(x => x.uid === uid);
  if (!n) return;
  n.level = Math.min(3, Math.max(1, n.level + delta));
  saveChara();
  renderSkills();
}

function delNamed(uid) {
  chara.named = chara.named.filter(x => x.uid !== uid);
  saveChara();
  renderSkills();
}

function setNamedName(uid, value) {
  const n = chara.named.find(x => x.uid === uid);
  if (!n) return;
  n.name = value;
  saveChara();
  // 判定値は変わらないが、クイックパネルのラベルは更新したいので
  // 入力フォーカスを保ったまま、クイック側だけ再描画する
  renderQuickSkills();
}

function bindProfile() {
  const map = {
    'profile-name': 'name', 'profile-age': 'age', 'profile-gender': 'gender',
    'profile-origin': 'origin', 'profile-job': 'job', 'profile-note': 'note',
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = chara.profile[key] || '';
    el.addEventListener('input', () => { chara.profile[key] = el.value; saveChara(); });
  });
}

function bindCharaEmotions() {
  const html = buildEmotionHTML();
  const ids = {
    'chara-emotion-omote': 'emotionOmote',
    'chara-emotion-ura':   'emotionUra',
    'chara-emotion-roots': 'emotionRoots',
  };
  Object.entries(ids).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = html;
    el.value = memo[key] || '';
    el.addEventListener('change', () => { memo[key] = el.value; syncMemoUI(); saveMemo(); });
  });
}

function setupChara() {
  renderAbilities();
  renderSkills();
  updateAbilityPoints();
  updateDerived();
  bindProfile();
  bindCharaEmotions();

  const quick = document.getElementById('quick-skills-section');
  if (quick) {
    quick.addEventListener('click', e => {
      const btn = e.target.closest('button.quick-btn');
      if (!btn) return;
      if (btn.dataset.quickSkill) {
        const s = SKILL_BY_ID[btn.dataset.quickSkill];
        const lv = s.type === 'base' ? 1 : (chara.skills[s.id] || 0);
        rollSkill(s, lv, s.id);
      } else if (btn.dataset.quickNamed) {
        const n = chara.named.find(x => x.uid === parseInt(btn.dataset.quickNamed, 10));
        if (n) {
          const s = SKILL_BY_ID[n.base];
          rollSkill(s, n.level, n.name ? `${s.id}：${n.name}` : s.id);
        }
      }
    });
  }

  document.getElementById('ability-grid').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'luck-roll') { rollLuck(); return; }
    if (btn.dataset.ability) setAbility(btn.dataset.ability, parseInt(btn.dataset.delta, 10));
  });

  document.getElementById('rand-all').addEventListener('click', () => randomizeAbilities(true));
  document.getElementById('rand-except-luck').addEventListener('click', () => randomizeAbilities(false));

  const list = document.getElementById('skill-list');
  list.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.skillLv)   { setSkillLevel(btn.dataset.skillLv, parseInt(btn.dataset.delta, 10)); return; }
    if (btn.dataset.skillRoll) { const s = SKILL_BY_ID[btn.dataset.skillRoll]; rollSkill(s, chara.skills[s.id] || 0, s.id); return; }
    if (btn.dataset.namedAdd)  { addNamed(btn.dataset.namedAdd); return; }
    if (btn.dataset.namedDel)  { delNamed(parseInt(btn.dataset.namedDel, 10)); return; }
    if (btn.dataset.namedLv)   { setNamedLevel(parseInt(btn.dataset.namedLv, 10), parseInt(btn.dataset.delta, 10)); return; }
    if (btn.dataset.namedRoll) {
      const n = chara.named.find(x => x.uid === parseInt(btn.dataset.namedRoll, 10));
      if (n) { const s = SKILL_BY_ID[n.base]; rollSkill(s, n.level, n.name ? `${s.id}：${n.name}` : s.id); }
      return;
    }
  });
  list.addEventListener('input', e => {
    const inp = e.target.closest('input[data-named-name]');
    if (inp) setNamedName(parseInt(inp.dataset.namedName, 10), inp.value);
  });
}

// ── Boot ───────────────────────────────────────────────────────────────
function init() {
  loadState();
  syncUIToState();
  renderHistory();
  loadMemo();
  loadChara();
  if (memo.hpMax === memo.hpCurrent && memo.mpMax === memo.mpCurrent) linked = true;
  populateEmotionSelects();
  syncMemoUI();

  setupTabs();
  setupSteppers();
  setupDiceTypeButtons();
  setupSettings();
  setupMemo();
  setupChara();
  setupNote();
  setupInstallButton();
  setupReset();
  setupDataTransfer();

  document.getElementById('roll-btn').addEventListener('click', rollEmoklore);
  document.getElementById('extra-roll-btn').addEventListener('click', rollExtra);
  setupAd();
}

document.addEventListener('DOMContentLoaded', init);
