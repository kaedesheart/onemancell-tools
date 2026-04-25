'use strict';

// ── State ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'emoklore-dice-v1';

const state = {
  diceCount:   1,
  targetValue: 5,
  extraSides:  6,
  extraCount:  1,
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
function rollEmoklore() {
  const btn = document.getElementById('roll-btn');
  if (btn.disabled) return;
  btn.disabled = true;

  const count   = state.diceCount;
  const target  = state.targetValue;
  const results = rollDice(count, 10);
  const successes = countSuccesses(results, target);
  const { label, cls } = getResultInfo(successes);

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
    const dieEls = results.map((_, i) => {
      const el = document.createElement('div');
      el.className = 'die rolling';
      el.style.animationDelay = `${i * Math.min(60, 60)}ms`;
      el.textContent = rollDie(10);
      diceDisplay.appendChild(el);
      return el;
    });

    // Cycle numbers while rolling
    const cyclers = dieEls.map(el =>
      setInterval(() => { el.textContent = rollDie(10); }, 70)
    );

    const revealAt = 880 + (count - 1) * 55;

    setTimeout(() => {
      cyclers.forEach(clearInterval);

      // Reveal actual values
      dieEls.forEach((el, i) => {
        const v    = results[i];
        const dcls = classifyDie(v, target);
        el.textContent = '';
        el.className   = `die ${dcls} reveal`;
        el.textContent = v;
        if (dcls === 'critical' || dcls === 'error') {
          const badge = document.createElement('span');
          badge.className = 'die-badge';
          badge.textContent = dcls === 'critical' ? '★' : '✕';
          el.appendChild(badge);
        }
        el.addEventListener('animationend', () => el.classList.remove('reveal'), { once: true });
      });

      // Success count pop
      setTimeout(() => {
        successCountEl.textContent = successes;
        successCountEl.classList.add('pop');
        successCountEl.addEventListener('animationend',
          () => successCountEl.classList.remove('pop'), { once: true });

        // Result label fade-in
        setTimeout(() => {
          resultLabelEl.textContent = label;
          resultLabelEl.className = `result-label ${cls} visible`;
          playResultSound(cls);
          btn.disabled = false;

          const sign = successes > 0 ? '+' : '';
          addHistory(`${count}d10(判${target}) → ${label} (${sign}${successes})`);
        }, 240);
      }, 160);
    }, revealAt);

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
    addHistory(`${count}d10(判${target}) → ${label} (${sign}${successes})`);
  }
}

// ── Extra dice roll ────────────────────────────────────────────────────
function rollExtra() {
  const btn = document.getElementById('extra-roll-btn');
  if (btn.disabled) return;
  btn.disabled = true;

  const sides   = state.extraSides;
  const count   = state.extraCount;
  const results = rollDice(count, sides);
  const total   = results.reduce((a, b) => a + b, 0);

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
    const dieEls = results.map((_, i) => {
      const el = document.createElement('div');
      el.className = 'die rolling';
      el.style.animationDelay = `${i * Math.min(60, 60)}ms`;
      el.textContent = rollDie(sides);
      diceDisplay.appendChild(el);
      return el;
    });

    const cyclers = dieEls.map(el =>
      setInterval(() => { el.textContent = rollDie(sides); }, 70)
    );

    const revealAt = 880 + (count - 1) * 55;

    setTimeout(() => {
      cyclers.forEach(clearInterval);

      dieEls.forEach((el, i) => {
        el.className = 'die success reveal';
        el.textContent = results[i];
        el.addEventListener('animationend', () => el.classList.remove('reveal'), { once: true });
      });

      totalEl.innerHTML =
        `<span class="extra-total-label">合計</span><strong>${total}</strong>`;

      btn.disabled = false;
      addHistory(`${count}D${sides} → 合計 ${total}`);
    }, revealAt);

  } else {
    diceDisplay.innerHTML = '';
    results.forEach(v => {
      const el = document.createElement('div');
      el.className = 'die success';
      el.textContent = v;
      diceDisplay.appendChild(el);
    });
    totalEl.innerHTML =
      `<span class="extra-total-label">合計</span><strong>${total}</strong>`;

    btn.disabled = false;
    addHistory(`${count}D${sides} → 合計 ${total}`);
  }
}

// ── UI wiring ──────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
        b.setAttribute('aria-selected', String(b.dataset.tab === tab));
      });
      ['emoklore', 'extra', 'status', 'note'].forEach(id => {
        document.getElementById(`tab-${id}`).classList.toggle('hidden', tab !== id);
      });
    });
  });
}

function setupSteppers() {
  const limits = {
    diceCount:   { min: 1, max: 10 },
    targetValue: { min: 1, max: 10 },
    extraCount:  { min: 1, max: 10 },
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
  document.querySelectorAll('.dice-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dice-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.extraSides = parseInt(btn.dataset.sides, 10);
      saveState();
    });
  });
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
  ['diceCount', 'targetValue', 'extraCount'].forEach(key => {
    const el = document.getElementById(`${key}-display`);
    if (el) el.textContent = state[key];
  });

  document.querySelectorAll('.dice-type-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.sides, 10) === state.extraSides);
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

// ── Boot ───────────────────────────────────────────────────────────────
function init() {
  loadState();
  syncUIToState();
  renderHistory();
  loadMemo();
  populateEmotionSelects();
  syncMemoUI();

  setupTabs();
  setupSteppers();
  setupDiceTypeButtons();
  setupSettings();
  setupMemo();
  setupNote();
  setupInstallButton();

  document.getElementById('roll-btn').addEventListener('click', rollEmoklore);
  document.getElementById('extra-roll-btn').addEventListener('click', rollExtra);
}

document.addEventListener('DOMContentLoaded', init);
