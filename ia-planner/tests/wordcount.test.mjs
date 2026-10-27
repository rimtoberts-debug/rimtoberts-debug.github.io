// Run: node ia-planner/tests/wordcount.test.mjs
import assert from "node:assert/strict";
import { countWords, overCap, CAP } from "../wordcount.mjs";

let n = 0;
function t(name, fn) { fn(); n++; console.log("ok -", name); }

t("plain words", () => assert.equal(countWords("one two  three\nfour"), 4));
t("empty and null", () => { assert.equal(countWords(""), 0); assert.equal(countWords(null), 0); });
t("punctuation-only tokens ignored", () => assert.equal(countWords("a - b -- c"), 3));
t("fenced code block excluded", () =>
  assert.equal(countWords("before\n```python\nx = 1\nprint(x)\n```\nafter words"), 3));
t("unclosed fence excludes the rest", () => assert.equal(countWords("a\n```\nb c d"), 1));
t("// comment lines excluded", () => assert.equal(countWords("real words\n// not counted here\n  // indented too\nend"), 3));
t("# lines excluded", () => assert.equal(countWords("# heading line\nkeep this"), 2));
t("[diagram: ...] placeholder excluded", () =>
  assert.equal(countWords("see [diagram: ER diagram of the tables] below"), 2));
t("multi-line diagram placeholder excluded", () =>
  assert.equal(countWords("a [diagram: flow\nchart of login] b"), 2));
t("inline // mid-line is still counted", () => assert.equal(countWords("use a // b"), 3));
t("CRLF handled", () => assert.equal(countWords("a b\r\n```\r\nx y\r\n```\r\nc"), 3));
t("cap: 2000 ok, 2001 over", () => {
  assert.equal(CAP, 2000);
  assert.equal(overCap(2000), false);
  assert.equal(overCap(2001), true);
  assert.equal(overCap(countWords("w ".repeat(2001))), true);
});
console.log(n + " tests passed");
