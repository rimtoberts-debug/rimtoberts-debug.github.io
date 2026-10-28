import { ALGORITHMS } from './algorithms.js';
import { getAlgorithms, getAlgorithm, runAlgorithm, prepareInput, checkTrace, expectedRows, columnsFor, parseNumbers, randomInput } from './engine.js';

function rngFrom(seed) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const asc = (a, b) => a - b;
const inversions = (a) => { let n = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) n++; return n; };

// Independent reference implementations -> {output, comparisons, swaps}
const REF = {
  linear({ array, target }) { let c = 0; for (let i = 0; i < array.length; i++) { c++; if (array[i] === target) return { output: i, comparisons: c, swaps: 0 }; } return { output: -1, comparisons: c, swaps: 0 }; },
  binary({ array, target }) { let lo = 0, hi = array.length - 1, c = 0; while (lo <= hi) { const m = (lo + hi) >> 1; c++; if (array[m] === target) return { output: m, comparisons: c, swaps: 0 }; c++; if (array[m] < target) lo = m + 1; else hi = m - 1; } return { output: -1, comparisons: c, swaps: 0 }; },
  bubble({ array }) { const n = array.length; return { output: array.slice().sort(asc).join(','), comparisons: n * (n - 1) / 2, swaps: inversions(array) }; },
  selection({ array }) { const a = array.slice(), n = a.length; let s = 0; for (let i = 0; i < n - 1; i++) { let m = i; for (let j = i + 1; j < n; j++) if (a[j] < a[m]) m = j; if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; s++; } } return { output: a.join(','), comparisons: n * (n - 1) / 2, swaps: s }; },
  insertion({ array }) { const a = array.slice(); let c = 0; for (let i = 1; i < a.length; i++) { const k = a[i]; let j = i - 1; while (j >= 0) { c++; if (a[j] <= k) break; a[j + 1] = a[j]; j--; } a[j + 1] = k; } return { output: array.slice().sort(asc).join(','), comparisons: c, swaps: inversions(array) }; },
  merge({ array }) {
    const go = (x) => { if (x.length <= 1) return { a: x, c: 0, w: 0 }; const m = x.length >> 1, L = go(x.slice(0, m)), R = go(x.slice(m)); const out = []; let i = 0, j = 0, c = L.c + R.c; while (i < L.a.length && j < R.a.length) { c++; out.push(L.a[i] <= R.a[j] ? L.a[i++] : R.a[j++]); } while (i < L.a.length) out.push(L.a[i++]); while (j < R.a.length) out.push(R.a[j++]); return { a: out, c, w: L.w + R.w + out.length }; };
    const r = go(array); return { output: r.a.join(','), comparisons: r.c, swaps: r.w };
  },
  factorial({ n }) { let f = 1; for (let k = 2; k <= n; k++) f *= k; return { output: f, comparisons: 0, swaps: 0 }; },
  sumlist({ array }) { return { output: array.reduce((x, y) => x + y, 0), comparisons: 0, swaps: 0 }; },
};

export function runTests() {
  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
  const rng = rngFrom(2027);
  const all = getAlgorithms({ hl: true, gcse: true });

  for (const alg of all) {
    let bad = '';
    for (let t = 0; t < 20 && !bad; t++) {
      const input = randomInput(alg, rng);
      const prepared = prepareInput(alg, input);
      const snaps = runAlgorithm(alg, input);
      const last = snaps[snaps.length - 1];
      const ref = REF[alg.id](prepared);
      const shape = snaps.every((s) => 'line' in s && 'vars' in s && 'array' in s && 'highlights' in s && alg.lines[s.line]);
      if (!shape) bad = `bad snapshot shape for ${JSON.stringify(input)}`;
      else if (alg.id === 'binary' || alg.id === 'linear') {
        const out = Number(last.output);
        const idx = prepared.array.indexOf(prepared.target);
        const valid = alg.id === 'linear' ? out === ref.output : (idx < 0 ? out === -1 : prepared.array[out] === prepared.target);
        if (!valid) bad = `wrong result ${out} for ${JSON.stringify(prepared)}`;
      } else if (String(last.output) !== String(ref.output)) bad = `wrong final output ${last.output} vs ${ref.output} for ${JSON.stringify(prepared)}`;
      if (!bad && alg.sorted !== undefined && ['bubble', 'selection', 'insertion', 'merge'].includes(alg.id) && last.array.join(',') !== prepared.array.slice().sort(asc).join(',')) bad = 'final array not sorted';
      if (!bad && (last.comparisons !== ref.comparisons || last.swaps !== ref.swaps)) bad = `counts ${last.comparisons}/${last.swaps} vs ref ${ref.comparisons}/${ref.swaps} for ${JSON.stringify(prepared)}`;
    }
    check(`${alg.id}: final state + comparison/swap counts match reference (20 random inputs)`, !bad, bad);
  }

  // Trace checker
  for (const alg of all) {
    const input = randomInput(alg, rng), snaps = runAlgorithm(alg, input);
    const table = expectedRows(alg, snaps);
    const full = checkTrace(alg, snaps, table);
    check(`${alg.id}: trace checker accepts a correct table`, full.marks === full.total && full.total > 0 && !full.firstWrong);
    const wrong = table.map((r) => r.slice());
    const r = Math.floor(table.length / 2), c = 0;
    wrong[r][c] = wrong[r][c] === '999' ? '998' : '999';
    const res = checkTrace(alg, snaps, wrong);
    check(`${alg.id}: trace checker rejects one wrong cell`, res.marks === res.total - 1 && res.firstWrong && res.firstWrong.row === r && res.firstWrong.col === columnsFor(alg)[c]);
  }
  const lin = getAlgorithm('linear', {}), ls = runAlgorithm(lin, { array: [4, 9, 7], target: 9 });
  check('checker tolerates spacing/brackets, e.g. "[ 1, 2 ]"', checkTrace(getAlgorithm('bubble', {}), runAlgorithm(getAlgorithm('bubble', {}), { array: [2, 1] }), [['0', '0', '[ 1, 2 ]', ''], ['', '', '1 , 2', '1,2']]).marks === 2);
  check('linear search worked example gives 2 trace rows', expectedRows(lin, ls).length === 2);

  // Mode gating
  const ib = getAlgorithms({ hl: false, gcse: false }).map((a) => a.id), ibHl = getAlgorithms({ hl: true, gcse: false }).map((a) => a.id);
  check('IB SL lists linear, binary, bubble, selection only', ib.join() === 'linear,binary,bubble,selection');
  check('IB HL adds recursion but never insertion/merge', ibHl.includes('factorial') && ibHl.includes('sumlist') && !ibHl.includes('insertion') && !ibHl.includes('merge'));
  check('insertion/merge unreachable by id in IB mode', ['insertion', 'merge'].every((id) => getAlgorithm(id, { hl: true, gcse: false }) === null && getAlgorithm(id, {}) === null));
  check('GCSE toggle enables insertion and merge', getAlgorithm('insertion', { gcse: true }) && getAlgorithm('merge', { gcse: true }));
  check('every algorithm has python+java code and Big O', ALGORITHMS.every((a) => a.python.length && a.java.length && a.bigO.worst && a.bigO.space));
  check('every line key maps inside both code listings', ALGORITHMS.every((a) => Object.values(a.lines).every(([p, j]) => p < a.python.length && j < a.java.length)));
  check('parseNumbers accepts "5, 3 8" and rejects junk', parseNumbers('5, 3 8').values.join() === '5,3,8' && !parseNumbers('a,b').ok && !parseNumbers('').ok);
  return results;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('tests.mjs')) {
  const res = runTests();
  for (const r of res) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '  -> ' + r.detail}`);
  const failed = res.filter((r) => !r.ok).length;
  console.log(`\n${res.length - failed}/${res.length} passed`);
  process.exit(failed ? 1 : 0);
}
