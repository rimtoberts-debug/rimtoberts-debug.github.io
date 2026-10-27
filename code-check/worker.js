/* Classic web worker: loads pinned Pyodide, then answers run/mark requests via marker.py */
const PYODIDE_VERSION = "0.26.4";
let handleFn = null;

async function init() {
  try {
    importScripts("https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/pyodide.js");
    const py = await loadPyodide();
    const src = await (await fetch("marker.py")).text();
    py.runPython(src);
    handleFn = py.globals.get("handle");
    postMessage({ type: "ready" });
  } catch (e) {
    postMessage({ type: "initError", message: String((e && e.message) || e) });
  }
}
const ready = init();

onmessage = async (ev) => {
  await ready;
  const { id, payload } = ev.data;
  if (!handleFn) { postMessage({ id, error: "Python runtime not available" }); return; }
  try {
    postMessage({ id, result: JSON.parse(handleFn(JSON.stringify(payload))) });
  } catch (e) {
    postMessage({ id, error: String((e && e.message) || e) });
  }
};
