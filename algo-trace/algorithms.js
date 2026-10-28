// Pre-instrumented algorithms. Each `gen` is a generator yielding one snapshot per step:
// {line, vars, array, highlights, comparisons, swaps, output, tr, msg, stack?}
// `line` is a key into `lines` -> [pythonLine, javaLine] (0-based). `tr` marks exam trace-table rows.

const mk = (c) => (line, vars, array, highlights, x) => {
  const v = {};
  for (const k in vars) v[k] = Array.isArray(vars[k]) ? vars[k].slice() : vars[k];
  return { line, vars: v, array: array.slice(), highlights: highlights || {},
    comparisons: c.comparisons, swaps: c.swaps, output: '', tr: false, msg: '', ...x };
};
const counters = () => ({ comparisons: 0, swaps: 0 });
const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k);

function* linearGen({ array, target }) {
  const a = array.slice(), n = a.length, c = counters(), S = mk(c);
  yield S('start', { i: '', value: '' }, a, {}, { msg: `Search for ${target}` });
  for (let i = 0; i < n; i++) {
    yield S('loop', { i, value: '' }, a, { mark: { i } }, { msg: `i = ${i}` });
    c.comparisons++;
    const eq = a[i] === target;
    yield S('cmp', { i, value: a[i] }, a, { compare: [i] }, { tr: !eq, msg: `Is ${a[i]} = ${target}?` });
    if (eq) {
      yield S('found', { i, value: a[i] }, a, { found: [i] }, { tr: true, output: String(i), msg: `Found at index ${i}` });
      return;
    }
    yield S('inc', { i, value: a[i] }, a, { mark: { i } }, { msg: 'Not equal, move on' });
  }
  yield S('loop', { i: n, value: '' }, a, {}, { msg: 'i reaches the end of the list' });
  yield S('notfound', { i: '', value: '' }, a, {}, { tr: true, output: '-1', msg: 'Not found: return -1' });
}

function* binaryGen({ array, target }) {
  const a = array.slice(), c = counters(), S = mk(c);
  let low = 0, high = a.length - 1;
  yield S('init', { low, high, mid: '', value: '' }, a, { range: [low, high] }, { msg: `low = 0, high = ${high}` });
  for (;;) {
    yield S('loop', { low, high, mid: '', value: '' }, a, { range: [low, high], mark: { L: low, H: high } }, { msg: `low <= high? ${low <= high}` });
    if (low > high) break;
    const mid = Math.floor((low + high) / 2);
    const m = { L: low, H: high, M: mid };
    yield S('mid', { low, high, mid, value: '' }, a, { range: [low, high], mark: m }, { msg: `mid = ${mid}` });
    c.comparisons++;
    const eq = a[mid] === target;
    yield S('cmp', { low, high, mid, value: a[mid] }, a, { range: [low, high], mark: m, compare: [mid] }, { tr: !eq, msg: `Is ${a[mid]} = ${target}?` });
    if (eq) {
      yield S('found', { low, high, mid, value: a[mid] }, a, { found: [mid], mark: m }, { tr: true, output: String(mid), msg: `Found at index ${mid}` });
      return;
    }
    c.comparisons++;
    yield S('cmp2', { low, high, mid, value: a[mid] }, a, { range: [low, high], mark: m, compare: [mid] }, { msg: `Is ${a[mid]} < ${target}?` });
    if (a[mid] < target) low = mid + 1; else high = mid - 1;
    yield S(a[mid] < target ? 'low' : 'high', { low, high, mid, value: a[mid] }, a, { range: [low, high], mark: { L: low, H: high } },
      { msg: a[mid] < target ? 'Discard the left half' : 'Discard the right half' });
  }
  yield S('notfound', { low, high, mid: '', value: '' }, a, {}, { tr: true, output: '-1', msg: 'Not found: return -1' });
}

function* bubbleGen({ array }) {
  const a = array.slice(), n = a.length, c = counters(), S = mk(c);
  yield S('start', { i: '', j: '', arr: a }, a, {}, { msg: 'Start bubble sort' });
  for (let i = 0; i < n - 1; i++) {
    const sorted = range(n - i, n);
    yield S('outer', { i, j: '', arr: a }, a, { sorted }, { msg: `Pass ${i + 1}` });
    for (let j = 0; j < n - 1 - i; j++) {
      yield S('inner', { i, j, arr: a }, a, { sorted }, { msg: `j = ${j}` });
      c.comparisons++;
      const sw = a[j] > a[j + 1];
      yield S('cmp', { i, j, arr: a }, a, { compare: [j, j + 1], sorted }, { tr: !sw, msg: `Is ${a[j]} > ${a[j + 1]}?` });
      if (sw) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]]; c.swaps++;
        yield S('swap', { i, j, arr: a }, a, { swap: [j, j + 1], sorted }, { tr: true, msg: 'Swap' });
      }
    }
  }
  yield S('done', { i: '', j: '', arr: a }, a, { sorted: range(0, n) }, { tr: true, output: a.join(','), msg: 'Sorted' });
}

function* selectionGen({ array }) {
  const a = array.slice(), n = a.length, c = counters(), S = mk(c);
  yield S('start', { i: '', j: '', min_idx: '', arr: a }, a, {}, { msg: 'Start selection sort' });
  for (let i = 0; i < n - 1; i++) {
    const sorted = range(0, i);
    let min = i, j = i;
    yield S('outer', { i, j: '', min_idx: min, arr: a }, a, { sorted, mark: { min } }, { msg: `Find the smallest from index ${i}` });
    for (j = i + 1; j < n; j++) {
      yield S('inner', { i, j, min_idx: min, arr: a }, a, { sorted, mark: { min } }, { msg: `j = ${j}` });
      c.comparisons++;
      const nm = a[j] < a[min];
      yield S('cmp', { i, j, min_idx: min, arr: a }, a, { compare: [j, min], sorted, mark: { min } }, { tr: !nm, msg: `Is ${a[j]} < ${a[min]}?` });
      if (nm) {
        min = j;
        yield S('newmin', { i, j, min_idx: min, arr: a }, a, { sorted, mark: { min } }, { tr: true, msg: `New minimum at ${min}` });
      }
    }
    const sw = min !== i;
    yield S('chk', { i, j: n - 1, min_idx: min, arr: a }, a, { sorted, mark: { min } }, { tr: !sw, msg: `min_idx != i? ${sw}` });
    if (sw) {
      [a[i], a[min]] = [a[min], a[i]]; c.swaps++;
      yield S('swap', { i, j: n - 1, min_idx: min, arr: a }, a, { swap: [i, min], sorted }, { tr: true, msg: 'Swap' });
    }
  }
  yield S('done', { i: '', j: '', min_idx: '', arr: a }, a, { sorted: range(0, n) }, { tr: true, output: a.join(','), msg: 'Sorted' });
}

function* insertionGen({ array }) {
  const a = array.slice(), n = a.length, c = counters(), S = mk(c);
  yield S('start', { i: '', j: '', key: '', arr: a }, a, {}, { msg: 'Start insertion sort' });
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    yield S('key', { i, j, key, arr: a }, a, { mark: { i } }, { msg: `key = ${key}` });
    while (j >= 0) {
      c.comparisons++;
      const more = a[j] > key;
      yield S('while', { i, j, key, arr: a }, a, { compare: [j, i] }, { msg: `Is ${a[j]} > ${key}?` });
      if (!more) break;
      a[j + 1] = a[j]; c.swaps++;
      yield S('shift', { i, j, key, arr: a }, a, { swap: [j, j + 1] }, { tr: true, msg: 'Shift right' });
      j--;
    }
    a[j + 1] = key;
    yield S('insert', { i, j, key, arr: a }, a, { found: [j + 1] }, { tr: true, msg: `Insert ${key}` });
  }
  yield S('done', { i: '', j: '', key: '', arr: a }, a, { sorted: range(0, n) }, { tr: true, output: a.join(','), msg: 'Sorted' });
}

function* mergeGen({ array }) {
  const a = array.slice(), n = a.length, c = counters(), S = mk(c);
  yield S('start', { lo: '', mid: '', hi: '', arr: a }, a, {}, { msg: 'Start merge sort' });
  function* sort(lo, hi) { // sorts a[lo..hi)
    if (hi - lo <= 1) return;
    const mid = (lo + hi) >> 1;
    yield S('split', { lo, mid, hi, arr: a }, a, { range: [lo, hi - 1] }, { msg: `Split ${lo}..${hi - 1} at ${mid}` });
    yield* sort(lo, mid);
    yield* sort(mid, hi);
    const L = a.slice(lo, mid), R = a.slice(mid, hi);
    let i = 0, j = 0, k = lo;
    while (i < L.length && j < R.length) {
      c.comparisons++;
      const takeL = L[i] <= R[j];
      yield S('cmp', { lo, mid, hi, arr: a }, a, { range: [lo, hi - 1], compare: [lo + i, mid + j] }, { msg: `Is ${L[i]} <= ${R[j]}?` });
      a[k] = takeL ? L[i++] : R[j++]; c.swaps++;
      yield S(takeL ? 'takeL' : 'takeR', { lo, mid, hi, arr: a }, a, { range: [lo, hi - 1], swap: [k] }, { msg: `Write ${a[k]}` });
      k++;
    }
    while (i < L.length) { a[k++] = L[i++]; c.swaps++; }
    while (j < R.length) { a[k++] = R[j++]; c.swaps++; }
    yield S('rest', { lo, mid, hi, arr: a }, a, { range: [lo, hi - 1] }, { tr: true, msg: `Merged ${lo}..${hi - 1}` });
  }
  yield* sort(0, n);
  yield S('done', { lo: '', mid: '', hi: '', arr: a }, a, { sorted: range(0, n) }, { tr: true, output: a.join(','), msg: 'Sorted' });
}

function* factorialGen({ n }) {
  const c = counters(), S = mk(c), stack = [];
  function* f(k) {
    stack.push(`factorial(${k})`);
    yield S('call', { n: k, returns: '' }, [], {}, { tr: true, stack: stack.slice(), msg: `Call factorial(${k})` });
    if (k === 0) {
      stack[stack.length - 1] += ' = 1';
      yield S('base', { n: k, returns: 1 }, [], {}, { tr: true, stack: stack.slice(), msg: 'Base case: return 1', ...(stack.length === 1 ? { output: '1' } : {}) });
      stack.pop(); return 1;
    }
    const r = yield* f(k - 1);
    const v = k * r;
    stack[stack.length - 1] += ` = ${v}`;
    yield S('ret', { n: k, returns: v }, [], {}, { tr: true, stack: stack.slice(), msg: `${k} * ${r} = ${v}`, ...(stack.length === 1 ? { output: String(v) } : {}) });
    stack.pop(); return v;
  }
  yield* f(n);
}

function* sumListGen({ array }) {
  const a = array.slice(), c = counters(), S = mk(c), stack = [];
  function* f(i) {
    stack.push(`sum_list(lst, ${i})`);
    yield S('call', { i, returns: '' }, a, { mark: { i } }, { tr: true, stack: stack.slice(), msg: `Call sum_list(lst, ${i})` });
    if (i === a.length) {
      stack[stack.length - 1] += ' = 0';
      yield S('base', { i, returns: 0 }, a, {}, { tr: true, stack: stack.slice(), msg: 'Base case: return 0', ...(stack.length === 1 ? { output: '0' } : {}) });
      stack.pop(); return 0;
    }
    const r = yield* f(i + 1);
    const v = a[i] + r;
    stack[stack.length - 1] += ` = ${v}`;
    yield S('ret', { i, returns: v }, a, { found: [i] }, { tr: true, stack: stack.slice(), msg: `${a[i]} + ${r} = ${v}`, ...(stack.length === 1 ? { output: String(v) } : {}) });
    stack.pop(); return v;
  }
  yield* f(0);
}

export const ALGORITHMS = [
  {
    id: 'linear', name: 'Linear search', code: 'B2.4.2', hl_only: false, gcse_only: false,
    input: 'array-target', sorted: false, cols: ['i', 'value'], flow: true, gen: linearGen,
    python: ['def linear_search(arr, target):', '    for i in range(len(arr)):', '        if arr[i] == target:', '            return i', '    return -1'],
    java: ['static int linearSearch(int[] arr, int target) {', '    for (int i = 0; i < arr.length; i++) {', '        if (arr[i] == target) {', '            return i;', '        }', '    }', '    return -1;', '}'],
    lines: { start: [0, 0], loop: [1, 1], cmp: [2, 2], inc: [1, 1], found: [3, 3], notfound: [4, 6] },
    bigO: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)', note: 'Best case: target is the first element. Worst case: last element or absent.' },
  },
  {
    id: 'binary', name: 'Binary search', code: 'B2.4.2', hl_only: false, gcse_only: false,
    input: 'array-target', sorted: true, cols: ['low', 'high', 'mid', 'value'], gen: binaryGen,
    python: ['def binary_search(arr, target):', '    low = 0', '    high = len(arr) - 1', '    while low <= high:', '        mid = (low + high) // 2', '        if arr[mid] == target:', '            return mid', '        elif arr[mid] < target:', '            low = mid + 1', '        else:', '            high = mid - 1', '    return -1'],
    java: ['static int binarySearch(int[] arr, int target) {', '    int low = 0;', '    int high = arr.length - 1;', '    while (low <= high) {', '        int mid = (low + high) / 2;', '        if (arr[mid] == target) {', '            return mid;', '        } else if (arr[mid] < target) {', '            low = mid + 1;', '        } else {', '            high = mid - 1;', '        }', '    }', '    return -1;', '}'],
    lines: { init: [1, 1], loop: [3, 3], mid: [4, 4], cmp: [5, 5], found: [6, 6], cmp2: [7, 7], low: [8, 8], high: [10, 10], notfound: [11, 13] },
    bigO: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)', note: 'The list must already be sorted. Each comparison halves the search range.' },
  },
  {
    id: 'bubble', name: 'Bubble sort', code: 'B2.4.3', hl_only: false, gcse_only: false,
    input: 'array', sorted: false, cols: ['i', 'j', 'arr'], gen: bubbleGen,
    python: ['def bubble_sort(arr):', '    n = len(arr)', '    for i in range(n - 1):', '        for j in range(n - 1 - i):', '            if arr[j] > arr[j + 1]:', '                arr[j], arr[j + 1] = arr[j + 1], arr[j]', '    return arr'],
    java: ['static void bubbleSort(int[] arr) {', '    int n = arr.length;', '    for (int i = 0; i < n - 1; i++) {', '        for (int j = 0; j < n - 1 - i; j++) {', '            if (arr[j] > arr[j + 1]) {', '                int temp = arr[j];', '                arr[j] = arr[j + 1];', '                arr[j + 1] = temp;', '            }', '        }', '    }', '}'],
    lines: { start: [1, 1], outer: [2, 2], inner: [3, 3], cmp: [4, 4], swap: [5, 5], done: [6, 10] },
    bigO: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', note: 'This version always makes n(n-1)/2 comparisons. Swaps equal the number of out-of-order pairs.' },
  },
  {
    id: 'selection', name: 'Selection sort', code: 'B2.4.3', hl_only: false, gcse_only: false,
    input: 'array', sorted: false, cols: ['i', 'j', 'min_idx', 'arr'], gen: selectionGen,
    python: ['def selection_sort(arr):', '    n = len(arr)', '    for i in range(n - 1):', '        min_idx = i', '        for j in range(i + 1, n):', '            if arr[j] < arr[min_idx]:', '                min_idx = j', '        if min_idx != i:', '            arr[i], arr[min_idx] = arr[min_idx], arr[i]', '    return arr'],
    java: ['static void selectionSort(int[] arr) {', '    int n = arr.length;', '    for (int i = 0; i < n - 1; i++) {', '        int minIdx = i;', '        for (int j = i + 1; j < n; j++) {', '            if (arr[j] < arr[minIdx]) {', '                minIdx = j;', '            }', '        }', '        if (minIdx != i) {', '            int temp = arr[i];', '            arr[i] = arr[minIdx];', '            arr[minIdx] = temp;', '        }', '    }', '}'],
    lines: { start: [1, 1], outer: [3, 3], inner: [4, 4], cmp: [5, 5], newmin: [6, 6], chk: [7, 9], swap: [8, 10], done: [9, 15] },
    bigO: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', note: 'Always n(n-1)/2 comparisons, but at most n-1 swaps.' },
  },
  {
    id: 'factorial', name: 'Factorial (recursion)', code: 'B2.4.5', hl_only: true, gcse_only: false,
    input: 'number', sorted: false, cols: ['n', 'returns'], stack: true, gen: factorialGen,
    python: ['def factorial(n):', '    if n == 0:', '        return 1', '    return n * factorial(n - 1)'],
    java: ['static int factorial(int n) {', '    if (n == 0) {', '        return 1;', '    }', '    return n * factorial(n - 1);', '}'],
    lines: { call: [0, 0], base: [2, 2], ret: [3, 4] },
    bigO: { best: 'O(n)', average: 'O(n)', worst: 'O(n)', space: 'O(n)', note: 'n + 1 calls; the call stack grows to depth n + 1.' },
  },
  {
    id: 'sumlist', name: 'Sum of a list (recursion)', code: 'B2.4.5', hl_only: true, gcse_only: false,
    input: 'array', sorted: false, cols: ['i', 'returns'], stack: true, gen: sumListGen,
    python: ['def sum_list(lst, i):', '    if i == len(lst):', '        return 0', '    return lst[i] + sum_list(lst, i + 1)'],
    java: ['static int sumList(int[] lst, int i) {', '    if (i == lst.length) {', '        return 0;', '    }', '    return lst[i] + sumList(lst, i + 1);', '}'],
    lines: { call: [0, 0], base: [2, 2], ret: [3, 4] },
    bigO: { best: 'O(n)', average: 'O(n)', worst: 'O(n)', space: 'O(n)', note: 'One call per element plus the base case; stack depth n + 1.' },
  },
  {
    id: 'insertion', name: 'Insertion sort', code: 'GCSE', hl_only: false, gcse_only: true,
    input: 'array', sorted: false, cols: ['i', 'j', 'key', 'arr'], gen: insertionGen,
    python: ['def insertion_sort(arr):', '    for i in range(1, len(arr)):', '        key = arr[i]', '        j = i - 1', '        while j >= 0 and arr[j] > key:', '            arr[j + 1] = arr[j]', '            j = j - 1', '        arr[j + 1] = key', '    return arr'],
    java: ['static void insertionSort(int[] arr) {', '    for (int i = 1; i < arr.length; i++) {', '        int key = arr[i];', '        int j = i - 1;', '        while (j >= 0 && arr[j] > key) {', '            arr[j + 1] = arr[j];', '            j = j - 1;', '        }', '        arr[j + 1] = key;', '    }', '}'],
    lines: { start: [0, 0], key: [2, 2], while: [4, 4], shift: [5, 5], insert: [7, 8], done: [8, 10] },
    bigO: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)', note: 'Best case: already sorted. "Swaps" counts each shift to the right.' },
  },
  {
    id: 'merge', name: 'Merge sort', code: 'GCSE', hl_only: false, gcse_only: true,
    input: 'array', sorted: false, cols: ['lo', 'mid', 'hi', 'arr'], gen: mergeGen,
    python: ['def merge_sort(arr):', '    if len(arr) <= 1:', '        return arr', '    mid = len(arr) // 2', '    left = merge_sort(arr[:mid])', '    right = merge_sort(arr[mid:])', '    return merge(left, right)', '', 'def merge(left, right):', '    result = []', '    i = 0', '    j = 0', '    while i < len(left) and j < len(right):', '        if left[i] <= right[j]:', '            result.append(left[i])', '            i = i + 1', '        else:', '            result.append(right[j])', '            j = j + 1', '    result.extend(left[i:])', '    result.extend(right[j:])', '    return result'],
    java: ['static int[] mergeSort(int[] arr) {', '    if (arr.length <= 1) return arr;', '    int mid = arr.length / 2;', '    int[] left = mergeSort(Arrays.copyOfRange(arr, 0, mid));', '    int[] right = mergeSort(Arrays.copyOfRange(arr, mid, arr.length));', '    return merge(left, right);', '}', 'static int[] merge(int[] left, int[] right) {', '    int[] result = new int[left.length + right.length];', '    int i = 0, j = 0, k = 0;', '    while (i < left.length && j < right.length) {', '        if (left[i] <= right[j]) result[k++] = left[i++];', '        else result[k++] = right[j++];', '    }', '    while (i < left.length) result[k++] = left[i++];', '    while (j < right.length) result[k++] = right[j++];', '    return result;', '}'],
    lines: { start: [0, 0], split: [3, 2], cmp: [13, 11], takeL: [14, 11], takeR: [17, 12], rest: [19, 14], done: [21, 16] },
    bigO: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', note: 'Needs extra lists while merging. "Swaps" counts each value written during a merge.' },
  },
];
