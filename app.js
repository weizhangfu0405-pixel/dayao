// 大曜 · 武道王朝 —— 前端（纯静态版：密钥只存于本机浏览器）
import { requestOpening, requestTurn } from './lib/api.mjs';
import { localStart, localResolve } from './lib/fallback.mjs';

const STATS = ['国运', '民心', '国库', '军力', '武运', '威望'];
const IDX = ['甲', '乙', '丙', '丁'];
const K_SAVE = 'dayao.save.v2';
const K_KEY = 'dayao.key.v1';
const K_MODEL = 'dayao.model.v1';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let G = null;
let busy = false;
let pending = null;
let saveTimer = null;

/* ───────── 密钥（只在本机） ───────── */
const getKey = () => { try { return localStorage.getItem(K_KEY) || ''; } catch { return ''; } };
const setKey = (v) => { try { v ? localStorage.setItem(K_KEY, v) : localStorage.removeItem(K_KEY); } catch {} };
const getModel = () => { try { return localStorage.getItem(K_MODEL) || 'deepseek-chat'; } catch { return 'deepseek-chat'; } };
const setModel = (v) => { try { v ? localStorage.setItem(K_MODEL, v) : localStorage.removeItem(K_MODEL); } catch {} };

/* ───────── 年号数字 ───────── */
function cnNum(n) {
  const d = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n <= 0) return '元';
  if (n < 10) return d[n];
  if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
  const t = Math.floor(n / 10), r = n % 10;
  return d[t] + '十' + (r ? d[r] : '');
}

const initial = () => ({
  v: 2,
  mode: 'ai',
  eraName: '永昌',
  year: 27,
  turn: 0,
  stats: { 国运: 62, 民心: 58, 国库: 52, 军力: 55, 武运: 31, 威望: 45 },
  scene: null,
  sceneId: null,
  chronicle: [],
  usedIds: [],
  ending: null,
  at: Date.now(),
});

/* ───────── 存储 ───────── */
function save() {
  if (!G) return;
  G.at = Date.now();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(K_SAVE, JSON.stringify(G)); } catch {}
  }, 120);
}
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(K_SAVE) || 'null');
    if (!raw || raw.v !== 2 || !raw.scene) return null;
    for (const k of STATS) raw.stats[k] = clamp(Number(raw.stats?.[k]) || 0);
    return raw;
  } catch { return null; }
}
function clearSave() { try { localStorage.removeItem(K_SAVE); } catch {} }

const snapshot = () => ({ stats: G.stats, year: G.year, turn: G.turn, eraName: G.eraName });
const chronicleTexts = () => G.chronicle.map((c) => c.text);

/* ───────── 界面切换 ───────── */
function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.toggle('is-active', s.id === id));
}

function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, ms);
}

const VEIL_LINES = ['展卷 · 焚香', '观星 · 推演', '落笔 · 成谶', '校勘 · 定稿'];
let veilTimer = null;
function veil(on, title) {
  const el = $('#veil');
  if (on) {
    el.hidden = false;
    if (title) $('.veil-title').textContent = title;
    let i = 0;
    $('#veil-sub').textContent = VEIL_LINES[0];
    clearInterval(veilTimer);
    veilTimer = setInterval(() => {
      i = (i + 1) % VEIL_LINES.length;
      $('#veil-sub').textContent = VEIL_LINES[i];
    }, 1700);
  } else {
    el.hidden = true;
    clearInterval(veilTimer);
  }
}

/* ───────── 数值面板 ───────── */
function buildStats() {
  const box = $('#stats');
  box.innerHTML = '';
  for (const k of STATS) {
    const el = document.createElement('div');
    el.className = 'stat';
    el.dataset.k = k;
    el.innerHTML = `<div class="stat-top"><span class="stat-k">${k}</span><span class="stat-v">0</span></div>
      <div class="stat-bar"><i style="width:0%"></i></div>`;
    box.appendChild(el);
  }
}

function paintStats(deltas = null) {
  for (const k of STATS) {
    const el = $(`.stat[data-k="${k}"]`);
    if (!el) continue;
    const v = G.stats[k];
    const vEl = $('.stat-v', el);
    const prev = Number(vEl.dataset.v ?? v);
    vEl.dataset.v = String(v);
    vEl.textContent = v;
    $('.stat-bar i', el).style.width = `${v}%`;
    el.classList.toggle('is-low', v < 25);
    el.classList.toggle('is-high', v > 78);

    if (deltas && deltas[k]) {
      const d = document.createElement('span');
      d.className = `stat-delta ${deltas[k] > 0 ? 'up' : 'down'}`;
      d.textContent = `${deltas[k] > 0 ? '+' : ''}${deltas[k]}`;
      el.appendChild(d);
      setTimeout(() => d.remove(), 1700);
      if (prev !== v) {
        el.classList.remove('pulse');
        void el.offsetWidth;
        el.classList.add('pulse');
        setTimeout(() => el.classList.remove('pulse'), 700);
      }
    }
  }
}

/* ───────── 场景渲染 ───────── */
function renderScene(scene) {
  const card = $('#scene');
  card.classList.remove('is-entering');
  void card.offsetWidth;
  card.classList.add('is-entering');

  $('#scene-title').textContent = scene.title || '—';
  $('#omen').textContent = scene.omen || '';

  const text = $('#scene-text');
  text.innerHTML = '';
  const p = document.createElement('p');
  p.textContent = scene.narration || '';
  text.appendChild(p);
  text.scrollTop = 0;

  $('#scene-tag').textContent = G.mode === 'local' ? '推 演 司' : '朝 议';
  renderChoices(scene.options || []);
  $('#era-name').textContent = G.eraName;
  $('#era-year').textContent = cnNum(G.year) + '年';
  $('#era-mode').textContent = G.mode === 'local' ? '本地' : 'AI';

  document.title = `大曜 · ${G.eraName}${cnNum(G.year)}年 · ${scene.title || ''}`;
}

function renderChoices(options) {
  const box = $('#choices');
  box.innerHTML = '';
  options.slice(0, 4).forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'choice';
    b.type = 'button';
    b.innerHTML = `<span class="choice-idx">${IDX[i]}</span>
      <span class="choice-main"><b></b><small></small></span>
      <span class="choice-tag tag--${o.tag || '守成'}">${o.tag || '守成'}</span>`;
    $('b', b).textContent = o.label;
    $('small', b).textContent = o.desc || '';
    b.addEventListener('click', () => {
      if (busy) return;
      bump();
      resolveChoice({ kind: 'option', label: o.label, desc: o.desc || '', tag: o.tag || '守成', sceneId: G.sceneId });
    });
    box.appendChild(b);
  });
}

function bump() {
  try { navigator.vibrate?.(12); } catch {}
}

/* ───────── 开局 ───────── */
async function newGame(mode = 'ai') {
  if (mode === 'ai' && !getKey()) {
    openSettings();
    toast('尚未配置密钥，可先以「推演司」试玩');
    return;
  }
  G = initial();
  G.mode = mode;
  clearSave();
  showScreen('screen-game');
  buildStats();
  paintStats();
  $('#choices').innerHTML = '';
  $('#scene-title').textContent = '—';
  $('#scene-text').innerHTML = '';
  $('#omen').textContent = '';
  $('#era-name').textContent = '永昌';
  $('#era-year').textContent = '二十七年';
  $('#era-mode').textContent = mode === 'local' ? '本地' : 'AI';
  await beginScene();
}

async function beginScene() {
  busy = true;
  veil(true, '开 卷');
  try {
    let scene;
    if (G.mode === 'local') {
      scene = localStart(snapshot());
      G.sceneId = scene.id || null;
    } else {
      scene = await requestOpening({ key: getKey(), model: getModel(), state: snapshot() });
      G.sceneId = null;
    }
    G.scene = scene;
    save();
    veil(false);
    renderScene(G.scene);
  } catch (err) {
    veil(false);
    handleError(err, '开卷');
  } finally {
    busy = false;
  }
}

/* ───────── 结算 ───────── */
async function resolveChoice(choice) {
  if (busy) return;
  busy = true;
  $$('.choice').forEach((c) => (c.disabled = true));
  veil(true, '推 演');
  try {
    let data;
    if (G.mode === 'local') {
      data = localResolve(snapshot(), choice, G.usedIds);
    } else {
      data = await requestTurn({
        key: getKey(),
        model: getModel(),
        state: snapshot(),
        history: chronicleTexts(),
        choice,
      });
    }

    const deltas = data.deltas || {};
    for (const k of STATS) G.stats[k] = clamp((G.stats[k] || 0) + (deltas[k] || 0));

    G.chronicle.push({ year: `${G.eraName}${cnNum(G.year)}年`, text: data.chronicle });
    if (data.sceneId) G.usedIds.push(data.sceneId);
    if (data.ending) G.ending = data.ending;
    save();

    paintStats(deltas);
    if ((deltas.国运 || 0) <= -8) {
      document.body.classList.add('quake');
      setTimeout(() => document.body.classList.remove('quake'), 500);
    }
    veil(false);
    await showOutcome(data);
  } catch (err) {
    veil(false);
    $$('.choice').forEach((c) => (c.disabled = false));
    handleError(err, '推演');
  } finally {
    busy = false;
  }
}

async function showOutcome(data) {
  pending = data;
  const sheet = $('#sheet-outcome');
  showSheet(sheet);

  $('#sheet-year').textContent = `${G.eraName}${cnNum(G.year)}年 · 第${G.turn + 1}道旨意`;
  $('#deltas').innerHTML = '';
  $('#figure-card').hidden = true;

  const textEl = $('#outcome-text');
  textEl.innerHTML = '';
  await typeWriter(textEl, data.outcome || '');

  const box = $('#deltas');
  let i = 0;
  for (const k of STATS) {
    const d = data.deltas?.[k] || 0;
    const chip = document.createElement('span');
    chip.className = `delta-chip ${d > 0 ? 'up' : d < 0 ? 'down' : 'zero'}`;
    chip.style.animationDelay = `${i * 70}ms`;
    chip.innerHTML = `${k}<b>${d > 0 ? '+' : ''}${d}</b>`;
    box.appendChild(chip);
    i++;
  }

  if (data.figure) {
    const f = $('#figure-card');
    f.hidden = false;
    f.innerHTML = `<div class="figure-name"></div><div class="figure-title"></div><div class="figure-note"></div>`;
    $('.figure-name', f).textContent = data.figure.name;
    $('.figure-title', f).textContent = data.figure.title || '';
    $('.figure-note', f).textContent = data.figure.note || '';
  }

  $('#btn-next').textContent = data.ending ? '阅 史 官 判 词' : '翻 篇';
  $('#btn-next').disabled = false;
  sheet.scrollTop = 0;
}

function showSheet(el) {
  el.hidden = false;
  el.querySelector('.sheet-panel').style.animation = 'none';
  void el.offsetWidth;
  el.querySelector('.sheet-panel').style.animation = '';
}

/* ───────── 打字机 ───────── */
function typeWriter(el, text, speed = 15) {
  return new Promise((resolve) => {
    let i = 0;
    let skip = false;
    el.textContent = '';
    const cur = document.createElement('span');
    cur.className = 'cursor';
    el.appendChild(cur);

    const skipFn = () => { skip = true; };
    el.addEventListener('click', skipFn);

    const finish = () => {
      el.textContent = text;
      el.removeEventListener('click', skipFn);
      resolve();
    };

    const step = () => {
      if (skip) return finish();
      i += 2;
      if (i >= text.length) return finish();
      el.textContent = text.slice(0, i);
      el.appendChild(cur);
      setTimeout(step, speed);
    };
    setTimeout(step, 160);
  });
}

/* ───────── 翻篇 / 结局 ───────── */
$('#btn-next').addEventListener('click', async () => {
  const data = pending;
  const btn = $('#btn-next');
  if (!data || btn.disabled) return;
  btn.disabled = true;
  const sheet = $('#sheet-outcome');
  const panel = sheet.querySelector('.sheet-panel');
  panel.style.animation = 'sheetUp .32s cubic-bezier(.4,0,1,1) reverse both';
  await sleep(240);
  sheet.hidden = true;
  panel.style.animation = '';

  if (data.ending) {
    showEnding(data.ending);
    return;
  }
  G.scene = data.next;
  G.sceneId = data.sceneId || null;
  G.year += 1;
  G.turn += 1;
  save();
  pending = null;
  renderScene(G.scene);
});

function showEnding(ending) {
  const scr = $('#screen-end');
  $('#end-type').textContent = ending.type;
  $('#end-type').className = `end-type ${ending.type === '亡国' ? '' : 'gold'}`;
  scr.classList.toggle('is-gold', ending.type !== '亡国');
  $('#end-text').textContent = ending.text || '';
  const years = G.year - 27;
  $('#end-stats').innerHTML =
    `<div>在位<b>${years}</b>年</div>` +
    `<div>年号<b>${G.eraName}</b></div>` +
    `<div>大事<b>${G.chronicle.length}</b>件</div>` +
    STATS.slice(0, 3).map((k) => `<div>${k}<b>${G.stats[k]}</b></div>`).join('');
  showScreen('screen-end');
  busy = false;
}

/* ───────── 大事记 ───────── */
function openChronicle() {
  const list = $('#chronicle-list');
  if (!G || !G.chronicle.length) {
    list.innerHTML = '<p class="chronicle-empty">史册尚空。</p>';
  } else {
    list.innerHTML = G.chronicle
      .map((c) => `<div class="chronicle-item"><time>${c.year}</time>${escapeHtml(c.text)}</div>`)
      .join('');
  }
  const d = $('#drawer-chronicle');
  d.hidden = false;
  d.querySelector('.chronicle-list').scrollTop = 0;
}
function closeDrawer() { $('#drawer-chronicle').hidden = true; }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ───────── 设置 ───────── */
function refreshEngineState() {
  const el = $('#engine-state');
  if (!el) return;
  const key = getKey();
  el.className = 'engine-state ' + (key ? 'on' : 'off');
  const tail = key ? ` · …${key.slice(-4)}` : '';
  el.innerHTML = `<i></i>${key ? `DeepSeek 已配置${tail} · ${getModel()}` : '未配置密钥 · 仅可本地推演'}`;
  $('#model-input').value = getModel();
}

function openSettings() {
  $('#key-input').value = getKey();
  refreshEngineState();
  $('#modal-settings').hidden = false;
}
function closeSettings() { $('#modal-settings').hidden = true; }

function saveKey() {
  const key = $('#key-input').value.trim();
  const model = $('#model-input').value.trim() || 'deepseek-chat';
  if (key && !/^sk-[A-Za-z0-9_-]{10,}$/.test(key)) return toast('密钥格式不对，应以 sk- 开头');
  setKey(key);
  setModel(model);
  refreshEngineState();
  toast(key ? '密钥已存于本机浏览器' : '密钥已清除');
}

/* ───────── 错误 ───────── */
function handleError(err, where) {
  const msg = err?.message || '未知错误';
  toast(`${where}失败：${msg}`, 4200);
  if (/密钥|401|未配置/.test(msg)) openSettings();
  if (G && !G.scene) {
    setTimeout(() => showScreen('screen-title'), 500);
  }
}

/* ───────── 事件绑定 ───────── */
function bind() {
  let newConfirm = false;
  $('#btn-new').addEventListener('click', () => {
    bump();
    if (loadSave() && !newConfirm) {
      newConfirm = true;
      toast('再按一次「开国」，旧卷将被覆盖');
      setTimeout(() => { newConfirm = false; }, 2800);
      return;
    }
    newConfirm = false;
    newGame('ai');
  });

  $('#btn-continue').addEventListener('click', () => {
    const saved = loadSave();
    if (!saved) return;
    G = saved;
    showScreen('screen-game');
    buildStats();
    paintStats();
    if (G.ending) { showEnding(G.ending); return; }
    renderScene(G.scene);
    if (G.mode === 'ai' && !getKey()) toast('未配置密钥，本局无法继续 AI 推演');
  });

  $('#btn-chronicle').addEventListener('click', openChronicle);
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-end-chronicle').addEventListener('click', openChronicle);

  $$('[data-close]').forEach((el) => el.addEventListener('click', () => {
    closeDrawer();
    closeSettings();
  }));

  $('#btn-save-key').addEventListener('click', saveKey);
  $('#btn-clear-key').addEventListener('click', () => {
    setKey('');
    $('#key-input').value = '';
    refreshEngineState();
    toast('密钥已抹去');
  });
  $('#btn-local-mode').addEventListener('click', () => {
    closeSettings();
    if (G && G.scene && G.mode === 'ai') { toast('本局为 AI 局，重开后可改用推演司'); return; }
    newGame('local');
  });

  let confirmRestart = false;
  $('#btn-restart').addEventListener('click', () => {
    const b = $('#btn-restart');
    if (!confirmRestart) {
      confirmRestart = true;
      b.textContent = '再按一次，抹去此朝';
      setTimeout(() => { confirmRestart = false; b.textContent = '重 开 一 局'; }, 2600);
      return;
    }
    clearSave();
    closeSettings();
    $('#btn-continue').hidden = true;
    G = null;
    showScreen('screen-title');
  });

  $('#btn-end-again').addEventListener('click', () => {
    clearSave();
    G = null;
    showScreen('screen-title');
    $('#btn-continue').hidden = true;
  });

  // 自拟旨意
  $('#custom-toggle').addEventListener('click', () => {
    const p = $('#custom-panel');
    p.hidden = !p.hidden;
    if (!p.hidden) setTimeout(() => $('#custom-input').focus(), 60);
  });
  $('#custom-input').addEventListener('input', (e) => {
    $('#custom-counter').textContent = `${e.target.value.length}/60`;
  });
  $('#custom-input').addEventListener('focus', (e) => {
    setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 280);
  });
  $('#btn-decree').addEventListener('click', () => {
    const text = $('#custom-input').value.trim();
    if (!text) return toast('写下你的旨意');
    if (busy) return;
    bump();
    $('#custom-panel').hidden = true;
    resolveChoice({ kind: 'custom', text, sceneId: G.sceneId });
  });

  // 键盘（桌面）
  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '4') {
      const b = $$('.choice')[Number(e.key) - 1];
      if (b && !busy) b.click();
    }
  });
}

/* ───────── 启动 ───────── */
function boot() {
  buildStats();
  bind();
  refreshEngineState();
  if (loadSave()) $('#btn-continue').hidden = false;
}

boot();
