// Run: node games/binary-blitz/tests.mjs
import assert from "node:assert/strict";
import { toBin, toHex, fromBin, fromHex, makeQuestion, check, steps, multiplier, KINDS, group4 } from "./convert.js";
for (let n = 0; n <= 65535; n++) {
  assert.equal(fromBin(toBin(n)), n);
  assert.equal(fromHex(toHex(n)), n);
  assert.equal(fromBin(toBin(n, 16)), n);
  assert.equal(toBin(n, 16).length, 16);
  assert.equal(toHex(n, 16).length, 4);
  assert.equal(parseInt(toBin(n, 16).replace(/(.{4})/g, (m) => toHex(parseInt(m, 2), 4)), 16), n);
}
assert.equal(toBin(10), "1010");
assert.equal(toHex(255), "FF");
assert.equal(toHex(171, 8), "AB");
assert.ok(Number.isNaN(fromBin("102")));
assert.ok(Number.isNaN(fromHex("G1")));
assert.equal(group4("10101111"), "1010 1111");
for (const bits of [4, 8, 16]) for (const k of KINDS) for (let i = 0; i < 300; i++) {
  const q = makeQuestion(k, bits);
  assert.ok(q.n >= 0 && q.n < 2 ** bits);
  assert.ok(check(q, q.answer));
  assert.ok(check(q, " " + q.answer.toLowerCase() + " "));
  assert.ok(!check(q, ""));
  assert.ok(steps(q).length > 5);
}
assert.ok(!check(makeQuestion("dec2bin", 4, () => 0.5), "0"));
assert.deepEqual([0, 2, 3, 5, 6, 30].map(multiplier), [1, 1, 2, 2, 3, 3]);
console.log("all tests passed");
