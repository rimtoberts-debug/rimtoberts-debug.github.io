import { countWords, CAP } from "./wordcount.mjs";

const KEY = "apexib.ia.data";
const SECS = ["A", "B", "C", "D", "E"];
const TYPES = ["normal", "boundary", "erroneous"];
const QUALITY = ["correctness", "reliability", "efficiency"];
const STATUS = ["", "met", "partly", "not met"];
const RESULT = ["", "pass", "fail"];
let content = { sections: [], videoTips: [], codeReminder: "" };
let S = blank();

function blank() {
  return { v: 1, drafts: { A: "", B: "", C: "", D: "", E: "" }, sc: [], planNotes: {}, evals: {}, tests: [], tasks: [], excerpts: [], shots: [] };
}
const str = (x) => (typeof x === "string" ? x : "");
const pick = (x, list) => (list.includes(x) ? x : list[0]);
const arr = (x) => (Array.isArray(x) ? x : []);

// Rebuild a clean object with a fixed key order, so export -> import -> export is identical.
function normalize(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const o = blank();
  const d = r.drafts && typeof r.drafts === "object" ? r.drafts : {};
  SECS.forEach((k) => (o.drafts[k] = str(d[k])));
  o.sc = arr(r.sc).map((s) => ({ id: str(s && s.id), text: str(s && s.text) })).filter((s) => s.id);
  const ids = new Set(o.sc.map((s) => s.id));
  const pn = r.planNotes && typeof r.planNotes === "object" ? r.planNotes : {};
  const ev = r.evals && typeof r.evals === "object" ? r.evals : {};
  o.sc.forEach((s) => {
    if (str(pn[s.id])) o.planNotes[s.id] = str(pn[s.id]);
    const e = ev[s.id];
    if (e && typeof e === "object") o.evals[s.id] = { status: pick(e.status, STATUS), notes: str(e.notes) };
  });
  o.tests = arr(r.tests).map((t) => t = t || {}).map((t) => ({
    id: str(t.id), sc: ids.has(t.sc) ? t.sc : "", type: pick(t.type, TYPES), data: str(t.data),
    expected: str(t.expected), actual: str(t.actual), result: pick(t.result, RESULT), quality: pick(t.quality, QUALITY)
  }));
  o.tasks = arr(r.tasks).map((t) => t = t || {}).map((t) => ({
    id: str(t.id), name: str(t.name), depth: Math.min(4, Math.max(0, Number(t.depth) | 0)), start: str(t.start), end: str(t.end)
  }));
  o.excerpts = arr(r.excerpts).map((t) => t = t || {}).map((t) => ({ title: str(t.title), file: str(t.file), lines: str(t.lines), technique: str(t.technique) }));
  o.shots = arr(r.shots).map((t) => t = t || {}).map((t) => ({
    id: str(t.id), sc: ids.has(t.sc) ? t.sc : "", desc: str(t.desc), secs: Math.max(0, Number(t.secs) || 0)
  }));
  return o;
}

function load() {
  try { const v = localStorage.getItem(KEY); if (v) S = normalize(JSON.parse(v)); } catch (e) { S = blank(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
function say(m) { $("msg").textContent = m; }

const $ = (id) => document.getElementById(id);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, "");
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
}
function field(obj, key, tag = "input", label, extra = {}, after) {
  const e = h(tag, { "aria-label": label, ...extra });
  e.value = obj[key];
  e.addEventListener("input", () => { obj[key] = e.type === "number" ? Number(e.value) || 0 : e.value; save(); after && after(); });
  return e;
}
function select(obj, key, opts, label, after) {
  const e = h("select", { "aria-label": label }, opts.map((o) => h("option", { value: o }, o || "-")));
  e.value = obj[key];
  e.addEventListener("change", () => { obj[key] = e.value; save(); after && after(); });
  return e;
}
function scSelect(obj, key, label, after) {
  const e = h("select", { "aria-label": label }, h("option", { value: "" }, "-"), S.sc.map((s) => h("option", { value: s.id }, s.id)));
  e.value = obj[key];
  e.addEventListener("change", () => { obj[key] = e.value; save(); after && after(); });
  return e;
}
const nextNum = (list, prefix) => list.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(prefix, ""), 10) || 0), 0) + 1;
function headRow(cols) { return h("thead", {}, h("tr", {}, cols.map((c) => h("th", { scope: "col" }, c)))); }
function delBtn(label, fn) { return h("button", { type: "button", "aria-label": label, onclick: fn }, "Delete"); }

/* ---------- success criteria ---------- */
const MEASURE = /\d|\b(within|at least|at most|no more than|no fewer than|less than|more than|fewer than|under|over|exactly|maximum|minimum|per|seconds?|ms|minutes?|percent|%|displays?|shows?|returns?|rejects?|accepts?|allows?|prevents?|saves?|stores?|calculates?|computes?|sorts?|outputs?|completes?|loads?|exports?|imports?|sends?|produces?|creates?|deletes?|updates?|finds?|lists?|warns?|validates?)\b/i;
export function isMeasurable(t) { return MEASURE.test(t); }

function renderSC() {
  const ul = $("sc-list");
  ul.replaceChildren(...S.sc.map((s) => {
    const warn = h("span", { class: "warn-text small", role: "status" });
    const upd = () => (warn.textContent = isMeasurable(s.text) ? "" : "Warning: no measurable element (number, unit or testable verb).");
    const li = h("li", {}, h("strong", {}, s.id), field(s, "text", "input", s.id + " text", { class: "sctext", type: "text" }, () => { upd(); renderEval(); renderOutline(); }), warn,
      delBtn("Delete " + s.id, () => {
        if (!confirm("Delete " + s.id + " and its test rows, evaluation and shots?")) return;
        S.sc = S.sc.filter((x) => x !== s); delete S.planNotes[s.id]; delete S.evals[s.id];
        S.tests = S.tests.filter((t) => t.sc !== s.id); S.shots = S.shots.filter((t) => t.sc !== s.id);
        save(); renderAll();
      }));
    upd();
    return li;
  }));
}
function addSC(text) {
  const id = "SC" + nextNum(S.sc, "SC");
  S.sc.push({ id, text });
  S.evals[id] = { status: "", notes: "" };
  S.tests.push({ id: "T" + nextNum(S.tests, "T"), sc: id, type: "normal", data: "", expected: "", actual: "", result: "", quality: "correctness" });
  save(); renderAll();
}

/* ---------- sections A-E ---------- */
const bars = {};
function barEl(count, budget, cap) {
  const pct = Math.min(100, (count / (cap || budget)) * 100);
  const cls = cap ? (count > cap ? "bar over" : "bar") : (count > budget ? "bar warn" : "bar");
  const b = h("div", { class: cls, role: "progressbar", "aria-valuemin": 0, "aria-valuemax": cap || budget, "aria-valuenow": count }, h("i", { style: "width:" + pct + "%" }));
  return b;
}
function updateCounts() {
  let total = 0;
  for (const c of content.sections) {
    const n = countWords(S.drafts[c.id]); total += n;
    const box = bars[c.id]; if (!box) continue;
    const over = n > c.words;
    box.replaceChildren(
      h("div", { class: "counts" }, h("span", { class: over ? "warn-text" : "" }, n + " / " + c.words + " words (recommended)" + (over ? " - over budget" : "")), h("span", {}, c.marks + " marks")),
      barEl(n, c.words));
  }
  const over = total > CAP;
  $("totalbar").replaceChildren(
    h("div", { class: "counts" }, h("span", { class: over ? "over-text" : "bold", role: over ? "alert" : null }, total + " / " + CAP + " words" + (over ? " - OVER THE " + CAP + " WORD CAP" : "")), h("span", {}, "Remaining: " + (CAP - total))),
    barEl(total, CAP, CAP));
  return total;
}
function renderSections() {
  const root = $("sections");
  root.replaceChildren();
  for (const c of content.sections) {
    const box = h("div", {}); bars[c.id] = box;
    const ta = field(S.drafts, c.id, "textarea", "Your draft for criterion " + c.id, { spellcheck: "true" }, () => { updateCounts(); renderOutline(); });
    const sec = h("section", { class: "card", id: "sec-" + c.id, "aria-labelledby": "h-" + c.id },
      h("h2", { id: "h-" + c.id }, c.id + ". " + c.title, " ", h("span", { class: "tag" }, c.marks + " marks")),
      h("ul", { class: "check" }, c.checklist.map((x) => h("li", {}, x))),
      box, ta);
    if (c.id === "B") { sec.append(h("h3", {}, "Plan rows from success criteria"), h("div", { class: "scroll" }, h("table", { id: "plan-table" }))); }
    if (c.id === "E") { sec.append(h("h3", {}, "Evaluation table"), h("div", { class: "scroll" }, h("table", { id: "eval-table" }))); }
    root.append(sec);
  }
  renderPlan(); renderEval(); updateCounts();
}
function renderPlan() {
  const t = $("plan-table"); if (!t) return;
  const rows = S.sc.map((s) => {
    const o = { v: S.planNotes[s.id] || "" };
    const inp = h("textarea", { "aria-label": "Plan for " + s.id }); inp.value = o.v;
    inp.addEventListener("input", () => { if (inp.value) S.planNotes[s.id] = inp.value; else delete S.planNotes[s.id]; save(); renderOutline(); });
    return h("tr", {}, h("td", {}, s.id), h("td", {}, s.text), h("td", {}, inp));
  });
  t.replaceChildren(headRow(["SC", "Criterion", "How I plan to meet it"]), h("tbody", {}, rows.length ? rows : h("tr", {}, h("td", { colspan: 3 }, "Add success criteria above."))));
}
function renderEval() {
  const t = $("eval-table"); if (!t) return;
  const rows = S.sc.map((s) => {
    const e = S.evals[s.id] || (S.evals[s.id] = { status: "", notes: "" });
    const tests = S.tests.filter((x) => x.sc === s.id);
    const p = tests.filter((x) => x.result === "pass").length, f = tests.filter((x) => x.result === "fail").length;
    return h("tr", {}, h("td", {}, s.id), h("td", {}, s.text), h("td", {}, select(e, "status", STATUS, s.id + " status", renderOutline)),
      h("td", {}, field(e, "notes", "textarea", s.id + " evidence notes", {}, renderOutline)), h("td", {}, tests.length + " tests, " + p + " pass, " + f + " fail"));
  });
  t.replaceChildren(headRow(["SC", "Criterion", "Met?", "Evidence notes", "Linked tests"]), h("tbody", {}, rows.length ? rows : h("tr", {}, h("td", { colspan: 5 }, "Add success criteria above."))));
}

/* ---------- tasks & gantt ---------- */
function renderTasks() {
  const t = $("task-table");
  const rows = S.tasks.map((k, i) => h("tr", {},
    h("td", {}, field(k, "name", "input", "Task name", { type: "text", style: "padding-left:" + (4 + k.depth * 18) + "px" }, renderGantt)),
    h("td", {}, field(k, "start", "input", "Start date", { type: "date" }, renderGantt)),
    h("td", {}, field(k, "end", "input", "End date", { type: "date" }, renderGantt)),
    h("td", {}, h("button", { type: "button", "aria-label": "Indent task", onclick: () => { k.depth = Math.min(4, k.depth + 1); save(); renderTasks(); } }, "Indent"),
      h("button", { type: "button", "aria-label": "Outdent task", onclick: () => { k.depth = Math.max(0, k.depth - 1); save(); renderTasks(); } }, "Outdent"),
      delBtn("Delete task", () => { S.tasks.splice(i, 1); save(); renderTasks(); }))));
  t.replaceChildren(headRow(["Task", "Start", "End", ""]), h("tbody", {}, rows));
  renderGantt();
}
const DAY = 864e5;
function renderGantt() {
  const g = $("gantt");
  const ok = S.tasks.filter((k) => k.start && k.end && k.end >= k.start);
  const bad = S.tasks.filter((k) => k.start && k.end && k.end < k.start);
  const parts = [];
  if (ok.length) {
    const min = Math.min(...ok.map((k) => Date.parse(k.start))), max = Math.max(...ok.map((k) => Date.parse(k.end))) + DAY, span = max - min;
    parts.push(h("div", { class: "muted small" }, k0(min) + " to " + k0(max - DAY)));
    for (const k of ok) {
      const l = ((Date.parse(k.start) - min) / span) * 100, w = ((Date.parse(k.end) + DAY - Date.parse(k.start)) / span) * 100;
      parts.push(h("div", { class: "gantt-row" }, h("div", { class: "name", style: "padding-left:" + k.depth * 8 + "px", title: k.name }, k.name || "(unnamed)"),
        h("div", { class: "gantt-track" }, h("div", { class: "gantt-bar", style: "left:" + l + "%;width:" + w + "%" }))));
    }
  }
  if (bad.length) parts.push(h("p", { class: "warn-text", role: "status" }, "Warning: " + bad.length + " task(s) end before they start."));
  g.replaceChildren(...parts);
  renderOutline();
}
const k0 = (ms) => new Date(ms).toISOString().slice(0, 10);

/* ---------- tests ---------- */
function renderCover() {
  const un = S.sc.filter((s) => !S.tests.some((t) => t.sc === s.id));
  $("cover").replaceChildren(un.length ? h("p", { class: "over-text", role: "status" }, "No test yet for: " + un.map((s) => s.id).join(", "))
    : h("p", { class: "ok-text", role: "status" }, S.sc.length ? "Every success criterion has at least one test." : "Add success criteria to start planning tests."));
  document.querySelectorAll("#test-table tbody tr").forEach((tr, i) => tr.classList.remove("uncovered"));
}
function renderTests() {
  const t = $("test-table");
  const after = () => { renderCover(); renderEval(); renderOutline(); };
  const rows = S.tests.map((k, i) => h("tr", {},
    h("td", {}, field(k, "id", "input", "Test id", { type: "text", style: "min-width:50px" })),
    h("td", {}, scSelect(k, "sc", "Linked SC", after)),
    h("td", {}, select(k, "type", TYPES, "Test type", renderOutline)),
    h("td", {}, field(k, "data", "textarea", "Test data", {}, renderOutline)),
    h("td", {}, field(k, "expected", "textarea", "Expected result", {}, renderOutline)),
    h("td", {}, field(k, "actual", "textarea", "Actual result", {}, renderOutline)),
    h("td", {}, select(k, "result", RESULT, "Pass or fail", after)),
    h("td", {}, select(k, "quality", QUALITY, "Quality aspect", renderOutline)),
    h("td", {}, delBtn("Delete test", () => { S.tests.splice(i, 1); save(); renderTests(); renderEval(); }))));
  t.replaceChildren(headRow(["ID", "SC", "Type", "Test data", "Expected", "Actual", "Result", "Quality", ""]), h("tbody", {}, rows));
  renderCover(); renderOutline();
}

/* ---------- excerpts & video ---------- */
function renderExcerpts() {
  const rows = S.excerpts.map((k, i) => h("tr", {},
    ["title", "file", "lines", "technique"].map((f) => h("td", {}, field(k, f, "input", f, { type: "text" }, renderOutline))),
    h("td", {}, delBtn("Delete excerpt", () => { S.excerpts.splice(i, 1); save(); renderExcerpts(); }))));
  $("ex-table").replaceChildren(headRow(["Title", "Appendix file", "Line range", "Technique shown", ""]), h("tbody", {}, rows));
  renderOutline();
}
function renderShots() {
  const rows = S.shots.map((k, i) => h("tr", {},
    h("td", {}, scSelect(k, "sc", "Shot SC", () => { renderShotTotal(); })),
    h("td", {}, field(k, "desc", "input", "Shot description", { type: "text" })),
    h("td", {}, field(k, "secs", "input", "Seconds", { type: "number", min: 0, style: "min-width:70px" }, renderShotTotal)),
    h("td", { class: "run" }),
    h("td", {}, delBtn("Delete shot", () => { S.shots.splice(i, 1); save(); renderShots(); }))));
  $("shot-table").replaceChildren(headRow(["SC", "What is shown", "Seconds", "Running time", ""]), h("tbody", {}, rows));
  renderShotTotal();
}
const mmss = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
function renderShotTotal() {
  let run = 0;
  document.querySelectorAll("#shot-table td.run").forEach((td, i) => { run += S.shots[i].secs; td.textContent = mmss(run); });
  const missing = S.sc.filter((s) => !S.shots.some((x) => x.sc === s.id)).map((s) => s.id);
  const total = S.shots.reduce((a, x) => a + x.secs, 0);
  const el = $("shot-total");
  el.className = total > 300 ? "bold over-text" : "bold";
  el.textContent = "Estimated total: " + mmss(total) + (total > 300 ? " - over the 5:00 limit" : "") + (missing.length ? ". No shot yet for: " + missing.join(", ") : "");
  renderOutline();
}

/* ---------- outline (print) ---------- */
function table(head, rows) {
  return h("table", {}, headRow(head), h("tbody", {}, rows.map((r) => h("tr", {}, r.map((c) => h("td", {}, c))))));
}
function renderOutline() {
  const total = SECS.reduce((a, k) => a + countWords(S.drafts[k]), 0);
  const o = [h("h1", {}, "IA outline"), h("p", {}, content.label || ""), h("p", {}, "Total: " + total + " / " + CAP + " words")];
  for (const c of content.sections) {
    o.push(h("h2", {}, c.id + ". " + c.title + " - " + countWords(S.drafts[c.id]) + " / " + c.words + " words (" + c.marks + " marks)"));
    if (c.id === "A") o.push(table(["SC", "Criterion"], S.sc.map((s) => [s.id, s.text])));
    if (c.id === "B") {
      o.push(table(["SC", "Plan"], S.sc.map((s) => [s.id, S.planNotes[s.id] || ""])));
      o.push(table(["Task", "Start", "End"], S.tasks.map((k) => ["  ".repeat(k.depth) + k.name, k.start, k.end])));
    }
    if (c.id === "D") {
      o.push(h("h3", {}, "Test plan"), table(["ID", "SC", "Type", "Data", "Expected", "Actual", "Result", "Quality"], S.tests.map((t) => [t.id, t.sc, t.type, t.data, t.expected, t.actual, t.result, t.quality])));
      o.push(h("h3", {}, "Code excerpts"), table(["Title", "File", "Lines", "Technique"], S.excerpts.map((t) => [t.title, t.file, t.lines, t.technique])));
    }
    if (c.id === "E") o.push(table(["SC", "Met?", "Evidence"], S.sc.map((s) => [s.id, (S.evals[s.id] || {}).status || "", (S.evals[s.id] || {}).notes || ""])));
  }
  o.push(h("h2", {}, "Video shot list"), table(["SC", "Shot", "Seconds"], S.shots.map((t) => [t.sc, t.desc, String(t.secs)])));
  $("outline").replaceChildren(...o);
}

/* ---------- export / import ---------- */
function exportJSON() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: "apexib-ia-planner.json" });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  say("Exported.");
}
async function importFile(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("not an object");
    S = normalize(data); save(); renderAll(); say("Imported " + file.name + ".");
  } catch (e) { say("Import failed: that file is not a valid planner export."); }
}

function renderAll() { renderSC(); renderSections(); renderTasks(); renderTests(); renderExcerpts(); renderShots(); renderOutline(); }

async function init() {
  try { content = await (await fetch("content.json")).json(); } catch (e) { say("Could not load guidance text (content.json)."); }
  if (content.label) $("label").textContent = content.label;
  $("code-reminder").textContent = content.codeReminder || "";
  $("video-tips").replaceChildren(...(content.videoTips || []).map((x) => h("li", {}, x)));
  load();
  $("sc-form").addEventListener("submit", (e) => { e.preventDefault(); const v = $("sc-new").value.trim(); if (!v) return; addSC(v); $("sc-new").value = ""; $("sc-new").focus(); });
  $("task-add").addEventListener("click", () => { S.tasks.push({ id: "K" + nextNum(S.tasks, "K"), name: "", depth: 0, start: "", end: "" }); save(); renderTasks(); });
  $("test-add").addEventListener("click", () => { S.tests.push({ id: "T" + nextNum(S.tests, "T"), sc: "", type: "normal", data: "", expected: "", actual: "", result: "", quality: "correctness" }); save(); renderTests(); });
  $("ex-add").addEventListener("click", () => { S.excerpts.push({ title: "", file: "", lines: "", technique: "" }); save(); renderExcerpts(); });
  $("shot-add").addEventListener("click", () => { S.shots.push({ id: "V" + nextNum(S.shots, "V"), sc: "", desc: "", secs: 20 }); save(); renderShots(); });
  $("shot-fill").addEventListener("click", () => {
    for (const s of S.sc) if (!S.shots.some((x) => x.sc === s.id)) S.shots.push({ id: "V" + nextNum(S.shots, "V"), sc: s.id, desc: "", secs: 20 });
    save(); renderShots();
  });
  $("export").addEventListener("click", exportJSON);
  $("import").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ""; });
  $("print").addEventListener("click", () => { renderOutline(); window.print(); });
  renderAll();
}
init();
