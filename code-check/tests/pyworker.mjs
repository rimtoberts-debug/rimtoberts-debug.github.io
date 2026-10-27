// Dev-only: Node worker_thread that mirrors code-check/worker.js using the npm pyodide package.
import { parentPort } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { loadPyodide } from "pyodide";

const py = await loadPyodide();
py.runPython(readFileSync(new URL("../marker.py", import.meta.url), "utf8"));
const handle = py.globals.get("handle");
parentPort.postMessage({ type: "ready" });
parentPort.on("message", ({ id, payload }) => {
  parentPort.postMessage({ id, result: JSON.parse(handle(JSON.stringify(payload))) });
});
