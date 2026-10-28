import { getAlgorithms, getAlgorithm, runAlgorithm, prepareInput, randomInput, parseNumbers, columnsFor, checkTrace, expectedRows } from './engine.js';

const $ = (id) => document.getElementById(id);
const K_SET = 'apexib.trace.settings', K_PROG = 'apexib.trace.progress';
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };

const settings = Object.assign({ hl: false, gcse: false, alg: 'linear', lang: 'py' }, load(K_SET, {}));
let progress = load(K_PROG, {});
let alg, input, snaps = [], idx = 0, timer = null, mode = 'watch';

// ---------- setup ----------
function opts() { return { hl: settings.hl, gcse: settings.gcse }; }

function fillAlgs() {
  const list = getAlgorithms(opts());
  if (!list.some((a) => a.id === settings.alg)) settings.alg = list[0].id;
  $('alg').replaceChildren(...list.map((a) => el('option', { value: a.id, selected: a.id === settings.alg }, `${a.name} (${a.code})`)));
}

function selectAlg() {
  alg = getAlgorithm(settings.alg, opts());
  $('code-tag').textContent = alg.code === 'GCSE' ? 'GCSE' : `IB ${alg.code}`;
  $('target-wrap').classList.toggle('hidden', alg.input !== 'array-target');
  $('n-wrap').classList.toggle('hidden', alg.input !== 'number');
  $('nums').closest('label').classList.toggle('hidden', alg.input === 'number');
  $('sorted-note').textContent = alg.sorted ? 'Binary search needs a sorted list, so your numbers are sorted first.' : '';
  renderCode(); renderBigO(); $('flow-panel').classList.toggle('hidden', !alg.flow);
  if (alg.flow) drawFlow();
  $('stack-wrap').classList.toggle('hidden', !alg.stack);
  setInput(randomInput(alg));
}

function setInput(inp) {
  input = inp;
  const p = prepareInput(alg, input);
  if (alg.input === 'number') $('nval').value = input.n;
  else $('nums').value = p.array.join(', ');
  if (alg.input === 'array-target') $('target').value = input.target;
  snaps = runAlgorithm(alg, input);
  idx = 0; stop(); $('err').textContent = '';
  render(); buildTrace(); $('result').textContent = '';
}

function useTyped() {
  let inp;
  if (alg.input === 'number') {
    const n = Number($('nval').value);
    if (!Number.isInteger(n) || n < 0 || n > 8) return ($('err').textContent = 'n must be a whole number from 0 to 8.');
    inp = { n };
  } else {
    const r = parseNumbers($('nums').value);
    if (!r.ok) return ($('err').textContent = r.error);
    inp = { array: r.values };
    if (alg.input === 'array-target') {
      const t = Number($('target').value);
      if ($('target').value.trim() === '' || !Number.isInteger(t)) return ($('err').textContent = 'Enter a whole-number target.');
      inp.target = t;
    }
  }
  setInput(inp);
}

// ---------- rendering ----------
function renderCode() {
  for (const [lang, id] of [['python', 'code-py'], ['java', 'code-java']])
    $(id).replaceChildren(...alg[lang].map((t, i) => el('code', { className: 'ln', id: `${id}-${i}` }, t || ' ')));
  setLang(settings.lang);
}

function setLang(l) {
  settings.lang = l; save(K_SET, settings);
  $('l-py').setAttribute('aria-pressed', l === 'py'); $('l-java').setAttribute('aria-pressed', l === 'java');
  $('pane-py').classList.toggle('off', l !== 'py'); $('pane-java').classList.toggle('off', l !== 'java');
}

function render() {
  const s = snaps[idx];
  const [py, jv] = alg.lines[s.line];
  for (const [id, n] of [['code-py', py], ['code-java', jv]])
    $(id).querySelectorAll('.ln').forEach((e, i) => e.classList.toggle('on', i === n));
  renderBars(s);
  $('msg').textContent = s.msg;
  $('pos').textContent = `Step ${idx + 1} of ${snaps.length}`;
  $('stats').replaceChildren(...(alg.stack ? [] : [el('span', {}, `Comparisons: ${s.comparisons}`), ...(alg.cols.includes('arr') || alg.id.includes('sort') ? [el('span', {}, `${alg.id === 'merge' ? 'Writes' : alg.id === 'insertion' ? 'Shifts' : 'Swaps'}: ${s.swaps}`)] : [])]));
  const rows = [...Object.entries(s.vars).map(([k, v]) => [k, Array.isArray(v) ? '[' + v.join(', ') + ']' : v === '' ? '–' : v])];
  if (s.output) rows.push(['output', s.output]);
  $('vars').replaceChildren(el('tr', {}, ...rows.map(([k]) => el('th', {}, k))), el('tr', {}, ...rows.map(([, v]) => el('td', {}, String(v)))));
  $('stack').replaceChildren(...(s.stack || []).map((t) => el('div', {}, t)));
  if (alg.flow) highlightFlow(s.line);
  $('back').disabled = $('first').disabled = idx === 0;
  $('step').disabled = idx === snaps.length - 1;
}

function renderBars(s) {
  const a = s.array, h = s.highlights, max = Math.max(1, ...a.map(Math.abs));
  $('bars').classList.toggle('hidden', !a.length);
  const marks = {};
  for (const [k, i] of Object.entries(h.mark || {})) marks[i] = (marks[i] ? marks[i] + '/' : '') + k;
  $('bars').setAttribute('aria-label', `Array: ${a.join(', ')}`);
  $('bars').replaceChildren(...a.map((v, i) => {
    const cls = ['bar'];
    if ((h.compare || []).includes(i)) cls.push('compare');
    if ((h.swap || []).includes(i)) cls.push('swap');
    if ((h.found || []).includes(i)) cls.push('found');
    if ((h.sorted || []).includes(i)) cls.push('sorted');
    if (h.range && (i < h.range[0] || i > h.range[1])) cls.push('out');
    const fill = el('div', { className: 'fill' }); fill.style.height = `${Math.max(6, Math.round(Math.abs(v) / max * 120))}px`;
    const tags = cls.slice(1).map((c) => ({ compare: 'comparing', swap: 'swapped', found: 'found', sorted: 'sorted', out: 'discarded' }[c])).join(' ');
    const b = el('div', { className: cls.join(' ') }, el('span', { className: 'mk' }, marks[i] || ''), el('span', { className: 'val' }, String(v)), fill, el('span', { className: 'idx' }, String(i)));
    if (tags) b.title = tags;
    return b;
  }));
}

function renderBigO() {
  const b = alg.bigO;
  $('bigo').replaceChildren(el('tr', {}, ...['Best time', 'Average time', 'Worst time', 'Space'].map((t) => el('th', {}, t))), el('tr', {}, ...[b.best, b.average, b.worst, b.space].map((t) => el('td', {}, t))));
  $('bigo-note').textContent = b.note;
}

// ---------- playback ----------
const DELAYS = [1400, 900, 550, 300, 140];
function stop() { if (timer) clearInterval(timer); timer = null; $('play').textContent = 'Play'; $('play').setAttribute('aria-pressed', 'false'); }
function play() {
  if (timer) return stop();
  if (idx === snaps.length - 1) idx = 0;
  $('play').textContent = 'Pause'; $('play').setAttribute('aria-pressed', 'true');
  timer = setInterval(() => { if (idx < snaps.length - 1) { idx++; render(); } else stop(); }, DELAYS[$('speed').value - 1]);
  idx = Math.min(idx + 1, snaps.length - 1); render();
}
const go = (d) => { stop(); idx = Math.max(0, Math.min(snaps.length - 1, idx + d)); render(); };

// ---------- trace table ----------
function buildTrace(rowCount) {
  const cols = columnsFor(alg), n = rowCount || expectedRows(alg, snaps).length;
  const head = el('tr', {}, el('th', {}, '#'), ...cols.map((c) => el('th', { scope: 'col' }, c)));
  $('trace-table').replaceChildren(head);
  for (let r = 0; r < n; r++) addRow(false);
}
function addRow(focus = true) {
  const cols = columnsFor(alg), r = $('trace-table').rows.length;
  const tr = el('tr', {}, el('th', { scope: 'row' }, String(r)));
  cols.forEach((c) => tr.append(el('td', {}, el('input', { type: 'text', autocomplete: 'off', 'aria-label': `Row ${r}, ${c}`, size: c === 'arr' || c === 'output' ? 10 : 4 }))));
  $('trace-table').append(tr);
  if (focus) tr.querySelector('input').focus();
}
function readTrace() { return [...$('trace-table').rows].slice(1).map((tr) => [...tr.querySelectorAll('input')].map((i) => i.value)); }
function clearMarks() { $('trace-table').querySelectorAll('td').forEach((td) => { td.className = ''; td.firstChild.classList.remove('first'); }); }

function check() {
  clearMarks();
  const res = checkTrace(alg, snaps, readTrace());
  const trs = [...$('trace-table').rows].slice(1);
  res.rows.forEach((r, i) => [...trs[i].cells].slice(1).forEach((td, c) => { td.className = r.ok ? 'ok' : c === r.wrongIdx ? 'bad' : ''; }));
  let text = `Score: ${res.marks} / ${res.total} (1 mark per correct row).`;
  const fw = res.firstWrong;
  if (fw) {
    text += fw.extra ? ` Row ${fw.row + 1} is not needed.` : ` First wrong cell: row ${fw.row + 1}, column "${fw.col}".`;
    if (!fw.extra) { const inp = trs[fw.row].cells[fw.colIdx + 1].firstChild; inp.classList.add('first'); inp.focus(); }
  } else text += ' All rows correct!';
  $('result').textContent = text;
  const p = progress[alg.id] || { attempts: 0, best: 0, total: res.total };
  p.attempts++; p.total = res.total; p.best = Math.max(p.best, res.marks); progress[alg.id] = p;
  save(K_PROG, progress); renderProgress();
}
function reveal() {
  const exp = expectedRows(alg, snaps);
  buildTrace(exp.length);
  [...$('trace-table').rows].slice(1).forEach((tr, r) => tr.querySelectorAll('input').forEach((i, c) => { i.value = exp[r][c]; }));
  $('result').textContent = 'Answers shown. Press Clear to try again.';
}

function setMode(m) {
  mode = m; stop();
  $('m-watch').setAttribute('aria-pressed', m === 'watch'); $('m-trace').setAttribute('aria-pressed', m === 'trace');
  $('watch').classList.toggle('hidden', m !== 'watch'); $('trace').classList.toggle('hidden', m !== 'trace');
}

// ---------- progress ----------
function renderProgress() {
  const parts = Object.entries(progress).map(([id, p]) => `${(getAlgorithm(id, { hl: true, gcse: true }) || { name: id }).name}: best ${p.best}/${p.total} (${p.attempts} attempt${p.attempts === 1 ? '' : 's'})`);
  $('prog').textContent = parts.length ? parts.join(' · ') : 'No attempts yet.';
}
function exportProgress() {
  const blob = new Blob([JSON.stringify({ tool: 'apexib.trace', version: 1, settings, progress }, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'apexib-trace-progress.json' });
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}
function importProgress(file) {
  file.text().then((t) => {
    const d = JSON.parse(t);
    if (d.tool !== 'apexib.trace' || typeof d.progress !== 'object') throw new Error('bad file');
    progress = d.progress; save(K_PROG, progress); renderProgress(); $('err').textContent = 'Progress imported.';
  }).catch(() => { $('err').textContent = 'That file is not an ApexIB Trace Tables progress export.'; });
}

// ---------- flowchart: linear search, B1.1.4 symbols ----------
const NS = 'http://www.w3.org/2000/svg';
const S = (tag, attrs = {}, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text) e.textContent = text; return e; };
const FLOW_ON = { start: 'proc0', loop: 'dec1', cmp: 'dec2', inc: 'proc1', found: 'out_found', notfound: 'out_nf' };
function drawFlow() {
  const svg = $('flow'); svg.replaceChildren();
  svg.append(S('defs', {}), S('title', {}, 'Linear search flowchart'));
  svg.firstChild.append(Object.assign(S('marker', { id: 'ar', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }), {}));
  svg.firstChild.firstChild.append(S('path', { d: 'M0 0L10 5L0 10z', fill: 'currentColor' }));
  svg.style.color = 'var(--fg)';
  const line = (pts, label, lx, ly) => { svg.append(S('polyline', { class: 'line', points: pts, 'marker-end': 'url(#ar)' })); if (label) svg.append(S('text', { class: 'lbl', x: lx, y: ly }, label)); };
  line('130,42 130,68'); line('130,102 130,128'); line('130,162 130,183'); line('130,207 130,228');
  line('130,292 130,338', 'Yes', 148, 315); line('130,402 130,453', 'No', 146, 430);
  line('130,487 130,513'); line('195,260 245,260', 'No', 220, 250); line('205,370 245,370', 'Yes', 225, 360);
  line('355,260 372,260 372,470 340,470'); line('300,387 300,453');
  const node = (id, shape, x, y, w, h, label) => {
    const g = S('g', { id: `f-${id}` }); let sym;
    if (shape === 'term') sym = S('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: h / 2 });
    else if (shape === 'proc') sym = S('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h });
    else if (shape === 'dec') sym = S('polygon', { points: `${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}` });
    else if (shape === 'io') sym = S('polygon', { points: `${x - w / 2 + 12},${y - h / 2} ${x + w / 2},${y - h / 2} ${x + w / 2 - 12},${y + h / 2} ${x - w / 2},${y + h / 2}` });
    else sym = S('circle', { cx: x, cy: y, r: 12 });
    sym.setAttribute('class', 'sym'); g.append(sym, S('text', { x, y }, label)); svg.append(g);
  };
  node('start', 'term', 130, 25, 120, 34, 'Start'); node('input', 'io', 130, 85, 150, 34, 'INPUT arr, target');
  node('proc0', 'proc', 130, 145, 120, 34, 'i ← 0'); node('conA_in', 'con', 130, 195, 0, 0, 'A');
  node('dec1', 'dec', 130, 260, 130, 64, 'i < n ?'); node('dec2', 'dec', 130, 370, 170, 64, 'arr[i] = target ?');
  node('proc1', 'proc', 130, 470, 120, 34, 'i ← i + 1'); node('conA_out', 'con', 130, 525, 0, 0, 'A');
  node('out_nf', 'io', 300, 260, 110, 34, 'OUTPUT -1'); node('out_found', 'io', 300, 370, 110, 34, 'OUTPUT i');
  node('end', 'term', 300, 470, 80, 34, 'End');
}
function highlightFlow(lineKey) {
  $('flow').querySelectorAll('.sym').forEach((e) => e.classList.remove('on'));
  const g = $(`f-${FLOW_ON[lineKey]}`); if (g) g.querySelector('.sym').classList.add('on');
}

// ---------- wiring ----------
fillAlgs();
$('hl').checked = settings.hl; $('gcse').checked = settings.gcse;
$('alg').addEventListener('change', () => { settings.alg = $('alg').value; save(K_SET, settings); selectAlg(); });
for (const [id, key] of [['hl', 'hl'], ['gcse', 'gcse']]) $(id).addEventListener('change', () => { settings[key] = $(id).checked; fillAlgs(); save(K_SET, settings); selectAlg(); });
$('use').addEventListener('click', useTyped);
for (const id of ['nums', 'target', 'nval']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') useTyped(); });
$('random').addEventListener('click', () => setInput(randomInput(alg)));
$('first').addEventListener('click', () => { stop(); idx = 0; render(); });
$('back').addEventListener('click', () => go(-1));
$('step').addEventListener('click', () => go(1));
$('play').addEventListener('click', play);
$('speed').addEventListener('input', () => { if (timer) { stop(); play(); } });
$('l-py').addEventListener('click', () => setLang('py')); $('l-java').addEventListener('click', () => setLang('java'));
$('m-watch').addEventListener('click', () => setMode('watch')); $('m-trace').addEventListener('click', () => setMode('trace'));
$('addrow').addEventListener('click', () => addRow());
$('check').addEventListener('click', check);
$('reveal').addEventListener('click', reveal);
$('clear').addEventListener('click', () => { buildTrace(); $('result').textContent = ''; });
$('export').addEventListener('click', exportProgress);
$('import').addEventListener('change', (e) => { if (e.target.files[0]) importProgress(e.target.files[0]); e.target.value = ''; });
document.addEventListener('keydown', (e) => {
  if (mode !== 'watch' || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight') { go(1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
});
renderProgress();
selectAlg();
