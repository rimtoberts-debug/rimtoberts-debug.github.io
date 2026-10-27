// Word counter for the IA planner. Pure functions, no DOM, so it can be unit tested in node.
export const CAP = 2000;

// Remove everything that should not count toward the 2,000-word limit.
export function countableText(text) {
  const src = String(text == null ? "" : text).replace(/\r\n?/g, "\n");
  const kept = [];
  let inFence = false;
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (t.startsWith("```")) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (t.startsWith("//") || t.startsWith("#")) continue;
    kept.push(line);
  }
  return kept.join("\n").replace(/\[diagram:[^\]]*\]/gi, " ");
}

export function countWords(text) {
  return countableText(text).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function overCap(total, cap = CAP) { return total > cap; }
