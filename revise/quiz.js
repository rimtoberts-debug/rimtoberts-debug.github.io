// Core logic (storage, schema validation, loading, filtering, scoring) plus quiz UI.
// No DOM access at import time, so tests.html can import this module.

export const PREFIX = 'apexib.revise.';
export const TYPES = ['mcq', 'short', 'flashcard', 'worked'];
export const LEVELS = ['IB', 'GCSE', 'both'];

/* ---------- storage (all access in try/catch) ---------- */
export function lsGet(name, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + name);
    return v == null ? fallback : JSON.parse(v);
  } catch (e) { return fallback; }
}
export function lsSet(name, val) {
  try { localStorage.setItem(PREFIX + name, JSON.stringify(val)); return true; } catch (e) { return false; }
}

/* ---------- DOM helper ---------- */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
}

/* ---------- schema validation ---------- */
const ID_RE = /^[AB]\d(\.\d+){0,2}-\d+$/;
const CODE_RE = /^[AB]\d(\.\d+){0,2}$/;
const BANNED_IB = /insertion sort|merge sort/i;
const isStr = (s) => typeof s === 'string' && s.trim() !== '';

/** Returns an array of problem strings; empty means the item is valid. */
export function validateItem(it) {
  const e = [];
  if (!it || typeof it !== 'object' || Array.isArray(it)) return ['not an object'];
  if (!isStr(it.id) || !ID_RE.test(it.id)) e.push('bad id');
  if (!isStr(it.code) || !CODE_RE.test(it.code)) e.push('bad code');
  else if (isStr(it.id) && !it.id.startsWith(it.code + '-')) e.push('id must start with code + "-"');
  if (typeof it.hl_only !== 'boolean') e.push('hl_only must be boolean');
  if (!TYPES.includes(it.type)) e.push('bad type');
  if (!LEVELS.includes(it.level)) e.push('bad level');
  if (!isStr(it.prompt)) e.push('missing prompt');
  if (it.explanation != null && typeof it.explanation !== 'string') e.push('explanation must be string');
  if (it.accept != null && !(Array.isArray(it.accept) && it.accept.every((a) => typeof a === 'string'))) e.push('accept must be string[]');
  if (it.type === 'mcq') {
    if (!Array.isArray(it.options) || it.options.length < 2 || !it.options.every(isStr)) e.push('mcq needs options (2+ strings)');
    else if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.options.length) e.push('mcq answer must be a valid option index');
  } else if (it.type === 'short' || it.type === 'flashcard') {
    if (!isStr(it.answer)) e.push(it.type + ' needs a string answer');
  } else if (it.type === 'worked') {
    if (!Array.isArray(it.steps) || it.steps.length === 0 || !it.steps.every(isStr)) e.push('worked needs steps (non-empty string[])');
  }
  if (it.level !== 'GCSE' && BANNED_IB.test(JSON.stringify(it))) e.push('insertion/merge sort is not allowed in IB or both-level items');
  return e;
}

export function validateSyllabus(s) {
  const e = [];
  if (!s || !Array.isArray(s.topics) || !s.topics.length) return ['syllabus needs topics[]'];
  for (const t of s.topics) {
    if (!isStr(t.code) || !isStr(t.title) || typeof t.hl_only !== 'boolean') e.push('bad topic ' + t.code);
    for (const st of t.subtopics || []) {
      if (!isStr(st.code) || !isStr(st.title) || typeof st.hl_only !== 'boolean') e.push('bad subtopic ' + st.code);
    }
  }
  return e;
}

/** Loads content/index.json, then every listed file. Never throws; bad items are console.warn'ed and skipped. */
export async function loadContent(base = 'content/', fetchFn = (u) => fetch(u)) {
  const out = { items: [], syllabus: { topics: [] }, problems: [] };
  const warn = (msg, extra) => { out.problems.push(msg); console.warn('[revise] ' + msg, extra === undefined ? '' : extra); };
  const getJson = async (name) => {
    const r = await fetchFn(base + name);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  };
  try {
    const s = await getJson('syllabus.json');
    const errs = validateSyllabus(s);
    if (errs.length) warn('syllabus.json problems: ' + errs.join('; '));
    else out.syllabus = s;
  } catch (err) { warn('could not load syllabus.json: ' + err.message); }
  let files = [];
  try {
    const idx = await getJson('index.json');
    if (!idx || !Array.isArray(idx.files)) throw new Error('index.json needs a "files" array');
    files = idx.files;
  } catch (err) { warn('could not load content/index.json: ' + err.message); return out; }
  const seen = new Set();
  for (const f of files) {
    let data;
    try { data = await getJson(f); } catch (err) { warn('could not load ' + f + ': ' + err.message); continue; }
    const list = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : null;
    if (!list) { warn(f + ': expected {"items":[...]} or an array'); continue; }
    list.forEach((it, i) => {
      const errs = validateItem(it);
      if (!errs.length && seen.has(it.id)) errs.push('duplicate id');
      if (errs.length) { warn(`${f}[${i}] (${it && it.id}) skipped: ${errs.join('; ')}`, it); return; }
      seen.add(it.id);
      out.items.push(it);
    });
  }
  return out;
}

/* ---------- syllabus / filtering ---------- */
export const matchesCode = (code, sel) => !sel || code === sel || code.startsWith(sel + '.');

export function hlMap(syllabus) {
  const m = {};
  for (const t of syllabus.topics || []) {
    m[t.code] = !!t.hl_only;
    for (const st of t.subtopics || []) m[st.code] = !!st.hl_only;
  }
  return m;
}
/** An item is HL-only if its flag says so or any ancestor code in the syllabus is HL-only. */
export function isHl(item, syllabus) {
  if (item.hl_only) return true;
  const m = hlMap(syllabus);
  const parts = item.code.split('.');
  while (parts.length) {
    if (m[parts.join('.')]) return true;
    parts.pop();
  }
  return false;
}
/** f = {topic:'' | code, mode:'SL'|'HL', level:'IB'|'GCSE'} */
export function filterItems(items, f, syllabus) {
  return items.filter((it) =>
    matchesCode(it.code, f.topic) &&
    (f.mode === 'HL' || !isHl(it, syllabus)) &&
    (it.level === 'both' || it.level === f.level));
}

/* ---------- answers & scoring ---------- */
export const normalise = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
export function checkAnswer(item, response) {
  if (item.type === 'mcq') return response === item.answer;
  const r = normalise(response);
  if (!r) return false;
  return [item.answer, ...(item.accept || [])].some((a) => normalise(a) === r);
}
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pickRound = (pool, n = 10, rng = Math.random) => shuffle(pool, rng).slice(0, n);
export function recordScore(scores, code, correct) {
  const s = { ...scores };
  const c = s[code] || { right: 0, total: 0 };
  s[code] = { right: c.right + (correct ? 1 : 0), total: c.total + 1 };
  return s;
}
export function saveScore(code, correct) {
  lsSet('scores', recordScore(lsGet('scores', {}), code, correct));
}
/** Practice item for a worked example: same code, quiz-able, not the example itself. */
export function practiceFor(worked, pool, all) {
  const ok = (x) => x.id !== worked.id && (x.type === 'mcq' || x.type === 'short');
  return pool.find((x) => ok(x) && x.code === worked.code) || all.find((x) => ok(x) && x.code === worked.code) || null;
}

/* ---------- progress ---------- */
const BOX_MAX = 5;
export function masteryRows(syllabus, items, scores, cards) {
  const rows = [];
  const calc = (code, title, hl) => {
    let right = 0, total = 0;
    for (const [c, s] of Object.entries(scores)) if (matchesCode(c, code)) { right += s.right; total += s.total; }
    const fc = items.filter((i) => i.type === 'flashcard' && matchesCode(i.code, code));
    const boxSum = fc.reduce((n, i) => n + (cards[i.id] ? cards[i.id].box : 0), 0);
    const quiz = total ? right / total : null;
    const cardPct = fc.length ? boxSum / (fc.length * BOX_MAX) : null;
    const parts = [quiz, cardPct].filter((x) => x != null);
    const mastery = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
    return { code, title, hl, right, total, quiz, cards: fc.length, cardPct, mastery };
  };
  for (const t of syllabus.topics || []) {
    rows.push({ ...calc(t.code, t.title, t.hl_only), level: 0 });
    for (const st of t.subtopics || []) rows.push({ ...calc(st.code, st.title, st.hl_only), level: 1 });
  }
  return rows;
}

export function exportAll() {
  return JSON.stringify({ app: 'apexib.revise', version: 1, data: { scores: lsGet('scores', {}), cards: lsGet('cards', {}), filters: lsGet('filters', {}) } }, null, 2);
}
/** Returns {ok, error}. Validates shape before writing anything. */
export function importAll(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { return { ok: false, error: 'Not valid JSON.' }; }
  if (!d || d.app !== 'apexib.revise' || !d.data || typeof d.data !== 'object') return { ok: false, error: 'Not an ApexIB Revise export.' };
  const { scores = {}, cards = {}, filters } = d.data;
  const good = (o, f) => o && typeof o === 'object' && !Array.isArray(o) && Object.values(o).every(f);
  const num = (x) => Number.isFinite(x) && x >= 0;
  if (!good(scores, (s) => s && num(s.right) && num(s.total))) return { ok: false, error: 'Scores section is malformed.' };
  if (!good(cards, (c) => c && Number.isInteger(c.box) && c.box >= 1 && c.box <= 5 && Number.isFinite(c.due))) return { ok: false, error: 'Cards section is malformed.' };
  lsSet('scores', scores); lsSet('cards', cards);
  if (filters && typeof filters === 'object') lsSet('filters', filters);
  return { ok: true };
}

/* ---------- shared question renderer (quiz + worked-example practice) ---------- */
export function renderQuestion(parent, item, onDone) {
  parent.append(h('p', { class: 'prompt' }, item.prompt));
  const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
  let answered = false, getResp, controls;
  const finish = (correct) => {
    if (answered) return;
    answered = true;
    saveScore(item.code, correct);
    controls.forEach((c) => (c.disabled = true));
    const shown = item.type === 'mcq' ? item.options[item.answer] : item.answer;
    fb.append(
      h('p', { class: correct ? 'ok' : 'bad' }, correct ? 'Correct.' : 'Not quite. Answer: ' + shown),
      item.explanation ? h('p', {}, item.explanation) : null);
    onDone && onDone(correct);
  };
  if (item.type === 'mcq') {
    const name = 'q' + Math.random().toString(36).slice(2);
    const radios = item.options.map((o, i) => h('input', { type: 'radio', name, value: String(i), id: name + i }));
    const group = h('fieldset', { class: 'opts' }, h('legend', { class: 'sr' }, 'Choose one answer'),
      item.options.map((o, i) => h('div', { class: 'opt' }, radios[i], h('label', { for: name + i }, o))));
    const btn = h('button', { class: 'primary', type: 'button', onclick: () => {
      const r = radios.findIndex((x) => x.checked);
      if (r < 0) { fb.textContent = 'Choose an answer first.'; return; }
      fb.textContent = '';
      finish(checkAnswer(item, r));
    } }, 'Check');
    controls = [...radios, btn];
    parent.append(group, btn);
  } else {
    const input = h('input', { type: 'text', 'aria-label': 'Your answer', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    const btn = h('button', { class: 'primary', type: 'button', onclick: () => {
      if (!input.value.trim()) { fb.textContent = 'Type an answer first.'; return; }
      fb.textContent = '';
      finish(checkAnswer(item, input.value));
    } }, 'Check');
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
    controls = [input, btn];
    parent.append(h('div', { class: 'row' }, input, btn));
  }
  parent.append(fb);
  const first = controls[0];
  return { focus: () => first.focus() };
}

/* ---------- quiz mode ---------- */
export const ROUND_SIZE = 10;
export function mountQuiz(root, getItems) {
  const start = () => {
    const pool = getItems().filter((i) => i.type === 'mcq' || i.type === 'short');
    root.replaceChildren();
    if (!pool.length) { root.append(h('p', {}, 'No quiz questions match the current filters.')); return; }
    const round = pickRound(pool, ROUND_SIZE);
    let idx = 0, right = 0;
    const show = () => {
      root.replaceChildren();
      if (idx >= round.length) {
        root.append(h('h2', {}, 'Round complete'), h('p', {}, `You scored ${right} out of ${round.length}.`),
          h('button', { class: 'primary', type: 'button', onclick: start }, 'New round'));
        return;
      }
      const item = round[idx];
      const card = h('div', { class: 'card' });
      card.append(h('p', { class: 'meta' }, h('span', { class: 'tag' }, item.code), ' ',
        isHlTag(item), `Question ${idx + 1} of ${round.length}`));
      const next = h('button', { class: 'primary', type: 'button', hidden: true, onclick: () => { idx++; show(); } },
        idx + 1 === round.length ? 'Finish' : 'Next question');
      const q = renderQuestion(card, item, (ok) => { if (ok) right++; next.hidden = false; next.focus(); });
      card.append(next);
      root.append(card);
      q.focus();
    };
    show();
  };
  start();
  return { restart: start };
}
function isHlTag(item) { return item.hl_only ? h('span', { class: 'tag hl' }, 'HL') : ''; }
