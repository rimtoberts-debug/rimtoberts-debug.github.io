import { Worker } from "node:worker_threads";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const TIMEOUT_MS = 5000; // same as app.js
const task = (f) => JSON.parse(readFileSync(new URL("../tasks/" + f, import.meta.url), "utf8"));

function start() {
  const w = new Worker(new URL("./pyworker.mjs", import.meta.url));
  const ready = new Promise((res, rej) => { w.once("message", (m) => m.type === "ready" ? res() : rej(m)); w.once("error", rej); });
  return { w, ready };
}
function call(w, payload, timeout = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { w.terminate(); reject(new Error("timeout")); }, timeout);
    w.once("message", (m) => { clearTimeout(timer); resolve(m.result); });
    w.postMessage({ id: 1, payload });
  });
}
const markMsg = (t, code) => ({ type: "mark", code, function: t.function, tests: t.tests, banned: t.banned });

let failures = 0;
async function test(name, fn) {
  try { await fn(); console.log("ok   - " + name); } catch (e) { failures++; console.log("FAIL - " + name + "\n" + e.stack); }
}

const bubble = task("B2.4.3-01.json");
let { w, ready } = start(); await ready;

await test("correct bubble sort passes all tests", async () => {
  const code = "def bubble_sort(a):\n    n = len(a)\n    for i in range(n):\n        for j in range(n - 1 - i):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n    return a\n";
  const r = await call(w, markMsg(bubble, code));
  assert.equal(r.banned.length, 0);
  assert.equal(r.total, r.max);
  assert.ok(r.tests.every((t) => t.pass));
});

await test("sorted() fails banned check with correct line number", async () => {
  const code = "def bubble_sort(a):\n    # cheat\n    return sorted(a)\n";
  const r = await call(w, markMsg(bubble, code));
  assert.deepEqual(r.banned, [{ line: 3, name: "sorted" }]);
  assert.equal(r.total, 0);
});

await test("a.sort() attribute is banned with line number", async () => {
  const r = await call(w, markMsg(bubble, "def bubble_sort(a):\n    x = 1\n    a.sort()\n    return a\n"));
  assert.deepEqual(r.banned, [{ line: 3, name: "sort" }]);
  assert.equal(r.total, 0);
});

await test("wrong answer fails, runtime error reported with line", async () => {
  const r = await call(w, markMsg(bubble, "def bubble_sort(a):\n    return a[10]\n"));
  assert.ok(r.total < r.max);
  assert.equal(r.tests[0].error.line, 2);
});

await test("stdout captured by run", async () => {
  const r = await call(w, { type: "run", code: "print('hi')\n", banned: [] });
  assert.equal(r.stdout, "hi\n");
});

await test("stack task (HL) passes with correct solution", async () => {
  const t = task("B4.1-01.json");
  const code = "def run_stack(ops):\n    s = []\n    out = []\n    for op in ops:\n        if op[0] == 'push':\n            s.append(op[1])\n        else:\n            out.append(s.pop() if s else None)\n    return out\n";
  const r = await call(w, markMsg(t, code));
  assert.equal(r.total, r.max);
});

await test("linear search passes; .index() is banned", async () => {
  const t = task("B2.4.2-01.json");
  const good = "def linear_search(a, target):\n    for i in range(len(a)):\n        if a[i] == target:\n            return i\n    return -1\n";
  const r = await call(w, markMsg(t, good));
  assert.equal(r.total, r.max);
  const bad = await call(w, markMsg(t, "def linear_search(a, target):\n    if target in a:\n        return a.index(target)\n    return -1\n"));
  assert.deepEqual(bad.banned, [{ line: 3, name: "index" }]);
});

await test("infinite loop is stopped by the 5s timeout and a fresh worker works", async () => {
  const t0 = Date.now();
  await assert.rejects(call(w, markMsg(bubble, "def bubble_sort(a):\n    while True:\n        pass\n")), /timeout/);
  const dt = Date.now() - t0;
  assert.ok(dt >= 4900 && dt < 8000, "elapsed " + dt);
  const s = start(); await s.ready; w = s.w;
  const r = await call(w, { type: "run", code: "print(1+1)", banned: [] });
  assert.equal(r.stdout, "2\n");
});

await w.terminate();
console.log(failures ? failures + " failure(s)" : "all passed");
process.exit(failures ? 1 : 0);
