import { ALGORITHMS } from './algorithms.js';

const MAX_STEPS = 2000;

// opts: {hl: boolean, gcse: boolean}. IB mode (gcse false) never exposes insertion/merge sort.
export function getAlgorithms(opts = {}) {
  return ALGORITHMS.filter((a) => (!a.hl_only || opts.hl) && (!a.gcse_only || opts.gcse));
}
export function getAlgorithm(id, opts = {}) {
  return getAlgorithms(opts).find((a) => a.id === id) || null;
}

export function prepareInput(alg, input) {
  const array = (input.array || []).slice();
  if (alg.sorted) array.sort((x, y) => x - y);
  return { array, target: input.target, n: input.n };
}

export function runAlgorithm(alg, input) {
  const out = [];
  for (const s of alg.gen(prepareInput(alg, input))) {
    out.push(s);
    if (out.length >= MAX_STEPS) break;
  }
  return out;
}

export function randomArray(rng = Math.random, size) {
  const n = size || 5 + Math.floor(rng() * 4);
  return Array.from({ length: n }, () => 1 + Math.floor(rng() * 99));
}

export function randomInput(alg, rng = Math.random) {
  if (alg.input === 'number') return { n: Math.floor(rng() * 6) + 1 };
  const array = randomArray(rng);
  if (alg.input === 'array') return { array };
  const target = rng() < 0.75 ? array[Math.floor(rng() * array.length)] : 100 + Math.floor(rng() * 10);
  return { array, target };
}

export function parseNumbers(text) {
  const parts = String(text).split(/[\s,;]+/).filter(Boolean);
  if (!parts.length) return { ok: false, error: 'Enter at least one number.' };
  if (parts.length > 12) return { ok: false, error: 'Use at most 12 numbers.' };
  const values = parts.map(Number);
  if (values.some((v) => !Number.isInteger(v) || Math.abs(v) > 999)) return { ok: false, error: 'Use whole numbers between -999 and 999.' };
  return { ok: true, values };
}

// ----- trace table -----
export const columnsFor = (alg) => [...alg.cols, 'output'];

const fmt = (v) => (Array.isArray(v) ? v.join(',') : v === undefined || v === null ? '' : String(v));
export const normCell = (s) => fmt(s).replace(/[\s\[\]()]/g, '').toLowerCase();

export function expectedRows(alg, snaps) {
  return snaps.filter((s) => s.tr).map((s) => columnsFor(alg).map((c) => (c === 'output' ? fmt(s.output) : fmt(s.vars[c]))));
}

// student: array of rows (arrays of strings). 1 mark per fully correct row.
export function checkTrace(alg, snaps, student) {
  const cols = columnsFor(alg), exp = expectedRows(alg, snaps);
  const rows = exp.map((er, r) => {
    const sr = student[r] || [];
    const bad = er.findIndex((v, c) => normCell(v) !== normCell(sr[c]));
    return { ok: bad < 0, wrongCol: bad < 0 ? null : cols[bad], wrongIdx: bad };
  });
  let firstWrong = null;
  const wrongRow = rows.findIndex((r) => !r.ok);
  if (wrongRow >= 0) firstWrong = { row: wrongRow, col: rows[wrongRow].wrongCol, colIdx: rows[wrongRow].wrongIdx };
  else {
    const extra = student.findIndex((sr, r) => r >= exp.length && sr.some((v) => normCell(v) !== ''));
    if (extra >= 0) firstWrong = { row: extra, col: null, colIdx: -1, extra: true };
  }
  return { marks: rows.filter((r) => r.ok).length, total: exp.length, rows, firstWrong };
}
