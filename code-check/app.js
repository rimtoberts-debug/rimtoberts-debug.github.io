const PREFIX = "apexib.check.";
const TIMEOUT_MS = 5000;
const $ = (id) => document.getElementById(id);

const store = {
  get(k) { try { return localStorage.getItem(PREFIX + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(PREFIX + k, v); } catch (e) { /* ignore */ } },
  all() {
    const o = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) o[k.slice(PREFIX.length)] = localStorage.getItem(k);
      }
    } catch (e) { /* ignore */ }
    return o;
  }
};

let index = [], task = null, worker = null, ready = false, reqId = 0, pending = null, runtimeFailed = false;

function setStatus(msg) { $("status").textContent = msg; }
function setButtons() { $("run").disabled = $("mark").disabled = !ready || !!pending; }

function startWorker() {
  ready = false; setButtons();
  setStatus("Loading Python runtime…");
  try {
    worker = new Worker("worker.js");
  } catch (e) { return runtimeError(String(e.message || e)); }
  worker.onmessage = (ev) => {
    const m = ev.data;
    if (m.type === "ready") { ready = true; runtimeFailed = false; setStatus("Python is ready."); setButtons(); }
    else if (m.type === "initError") runtimeError(m.message);
    else if (pending && m.id === pending.id) {
      clearTimeout(pending.timer);
      const p = pending; pending = null; setButtons();
      m.error ? p.reject(new Error(m.error)) : p.resolve(m.result);
    }
  };
  worker.onerror = (e) => { e.preventDefault && e.preventDefault(); runtimeError(e.message || "worker failed"); };
}

function runtimeError(msg) {
  runtimeFailed = true; ready = false; setButtons();
  setStatus("Could not load the Python runtime (" + msg + "). Check your connection and reload the page; it is fetched from cdn.jsdelivr.net.");
}

function call(payload) {
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    const timer = setTimeout(() => {
      pending = null;
      worker.terminate();
      startWorker();
      reject(new Error("Timed out after " + TIMEOUT_MS / 1000 + " seconds. Your code may contain an infinite loop. The runtime is restarting."));
    }, TIMEOUT_MS);
    pending = { id, resolve, reject, timer }; setButtons();
    worker.postMessage({ id, payload });
  });
}

function el(tag, text, cls) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
const fmt = (v) => JSON.stringify(v);

function updateGutter() {
  const n = $("code").value.split("\n").length;
  let s = ""; for (let i = 1; i <= n; i++) s += i + "\n";
  $("gutter").textContent = s.trimEnd();
  $("gutter").scrollTop = $("code").scrollTop;
}

function saveCode() { if (task) store.set("code." + task.id, $("code").value); }

function clearResults() { $("out").textContent = ""; $("results").textContent = ""; $("points").hidden = true; }

function showError(err) {
  return err ? err.type + ": " + err.msg + (err.line ? " (line " + err.line + ")" : "") : "";
}

function showBanned(hits) {
  if (!hits || !hits.length) return "";
  return hits.map((h) => "Banned built-in '" + h.name + "' used on line " + h.line).join("\n");
}

function showPoints() {
  const ul = $("pointList"); ul.textContent = "";
  let saved = {};
  try { saved = JSON.parse(store.get("points." + task.id) || "{}"); } catch (e) { saved = {}; }
  task.markpoints.forEach((p, i) => {
    const li = el("li"); const lab = el("label"); const cb = el("input");
    cb.type = "checkbox"; cb.checked = !!saved[i];
    cb.onchange = () => { saved[i] = cb.checked; store.set("points." + task.id, JSON.stringify(saved)); };
    lab.append(cb, " " + p); li.append(lab); ul.append(li);
  });
  $("points").hidden = !task.markpoints.length;
}

async function doRun() {
  saveCode(); clearResults();
  try {
    const r = await call({ type: "run", code: $("code").value, banned: task.banned });
    let t = r.stdout || "";
    if (r.error) t += (t && !t.endsWith("\n") ? "\n" : "") + showError(r.error);
    const b = showBanned(r.banned); if (b) t += (t ? "\n" : "") + b;
    $("out").textContent = t || "(no output)";
    showPoints();
  } catch (e) { $("out").textContent = e.message; }
}

async function doMark() {
  saveCode(); clearResults();
  try {
    const r = await call({ type: "mark", code: $("code").value, function: task.function, tests: task.tests, banned: task.banned });
    const out = [];
    if (r.stdout) out.push(r.stdout);
    if (r.error) out.push(showError(r.error));
    const b = showBanned(r.banned); if (b) out.push(b + "\nMarks are not awarded while banned built-ins are used.");
    $("out").textContent = out.join("\n") || "(no output)";
    if (!r.error) {
      const tbl = el("table", null, "res");
      const head = el("tr"); ["#", "Input", "Expected", "Got", "Result", "Marks"].forEach((h) => head.append(el("th", h)));
      tbl.append(head);
      r.tests.forEach((t, i) => {
        const tr = el("tr");
        tr.append(el("td", i + 1), el("td", fmt(t.args)), el("td", fmt(t.expected)),
          el("td", t.error ? showError(t.error) : fmt(t.got)),
          el("td", t.pass ? "Pass" : "Fail", t.pass ? "pass" : "fail"),
          el("td", t.awarded + "/" + t.marks));
        tbl.append(tr);
      });
      $("results").append(tbl, el("p", "Total: " + r.total + " / " + r.max, "pass"));
    }
    showPoints();
  } catch (e) { $("out").textContent = e.message; }
}

async function loadTask(id) {
  const meta = index.find((t) => t.id === id);
  if (!meta) return;
  try {
    const res = await fetch("tasks/" + meta.file);
    if (!res.ok) throw new Error("HTTP " + res.status);
    task = await res.json();
  } catch (e) { setStatus("Could not load task: " + e.message); return; }
  store.set("last", id);
  $("taskCard").hidden = false;
  $("title").textContent = task.title + " (" + task.code + ")";
  $("brief").textContent = task.brief;
  $("hlTag").hidden = !task.hl_only;
  $("java").textContent = task.java_reference;
  const bn = $("banner");
  bn.hidden = !(task.banned && task.banned.length);
  bn.textContent = "This question prohibits: " + (task.banned || []).join(", ");
  $("code").value = store.get("code." + task.id) || task.starter;
  updateGutter(); clearResults();
}

function selectTab(py) {
  $("tabPy").setAttribute("aria-selected", py); $("tabJava").setAttribute("aria-selected", !py);
  $("panePy").hidden = !py; $("paneJava").hidden = py;
}

function doExport() {
  const blob = new Blob([JSON.stringify({ app: "apexib.check", version: 1, data: store.all() }, null, 2)], { type: "application/json" });
  const a = el("a"); a.href = URL.createObjectURL(blob); a.download = "apexib-code-check.json";
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function doImport(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || j.app !== "apexib.check" || typeof j.data !== "object") throw new Error("not an ApexIB Code Check file");
    Object.entries(j.data).forEach(([k, v]) => { if (typeof v === "string") store.set(k, v); });
    $("ioMsg").textContent = "Imported.";
    if (task) await loadTask(task.id);
  } catch (e) { $("ioMsg").textContent = "Import failed: " + e.message; }
}

function wireEditor() {
  const ta = $("code"); let escaped = false;
  ta.addEventListener("input", () => { updateGutter(); saveCode(); });
  ta.addEventListener("scroll", () => { $("gutter").scrollTop = ta.scrollTop; });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { escaped = true; return; }
    if (e.key === "Tab" && !escaped && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.setRangeText("    ", s, en, "end");
      updateGutter(); saveCode();
    }
    if (e.key !== "Tab") escaped = false;
  });
  ta.addEventListener("blur", () => { escaped = false; });
}

async function main() {
  $("run").onclick = doRun; $("mark").onclick = doMark;
  $("reset").onclick = () => { if (task) { $("code").value = task.starter; updateGutter(); saveCode(); clearResults(); } };
  $("tabPy").onclick = () => selectTab(true); $("tabJava").onclick = () => selectTab(false);
  $("export").onclick = doExport;
  $("import").onchange = (e) => { if (e.target.files[0]) doImport(e.target.files[0]); e.target.value = ""; };
  wireEditor();
  try {
    const res = await fetch("tasks/index.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    index = await res.json();
  } catch (e) { setStatus("Could not load the task list: " + e.message); return; }
  const sel = $("task");
  index.forEach((t) => { const o = el("option", t.code + " " + t.title + (t.hl_only ? " [HL]" : "")); o.value = t.id; sel.append(o); });
  const last = store.get("last");
  if (last && index.some((t) => t.id === last)) sel.value = last;
  sel.onchange = () => loadTask(sel.value);
  await loadTask(sel.value);
  startWorker();
}
main();
