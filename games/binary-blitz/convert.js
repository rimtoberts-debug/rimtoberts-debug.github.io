// Pure conversion + question logic for Binary Blitz (IB A1.2.1). No DOM access.
export const KINDS = ["dec2bin", "bin2dec", "hex2dec", "dec2hex", "bin2hex"];
export const LABEL = {
  dec2bin: ["Decimal", "Binary"], bin2dec: ["Binary", "Decimal"], hex2dec: ["Hex", "Decimal"],
  dec2hex: ["Decimal", "Hex"], bin2hex: ["Binary", "Hex"],
};
export const toBin = (n, bits = 0) => n.toString(2).padStart(bits, "0");
export const toHex = (n, bits = 0) => n.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), "0");
export const fromBin = (s) => (/^[01]+$/.test(s) ? parseInt(s, 2) : NaN);
export const fromHex = (s) => (/^[0-9a-fA-F]+$/.test(s) ? parseInt(s, 16) : NaN);
export const group4 = (s) => s.replace(/(?<=.)(?=(.{4})+$)/g, " ");

const strip = (s) => s.replace(/\s+/g, "").toUpperCase();
const noZeros = (s) => s.replace(/^0+(?=.)/, "");

export function makeQuestion(kind, bits, rnd = Math.random) {
  const max = 2 ** bits - 1;
  const n = Math.floor(rnd() * (max + 1));
  const fmt = (name) => (name === "Decimal" ? String(n) : name === "Binary" ? toBin(n, bits) : toHex(n, bits));
  const [from, to] = LABEL[kind];
  const shown = from === "Binary" ? group4(fmt(from)) : fmt(from);
  return { kind, bits, n, shown, answer: fmt(to), code: "A1.2.1" };
}

export function check(q, input) {
  const a = noZeros(strip(input));
  return a !== "" && a === noZeros(q.answer);
}

export function steps(q) {
  const { n, kind, bits } = q;
  const divs = (base) => {
    const out = [];
    let x = n;
    do {
      out.push(`${x} ÷ ${base} = ${Math.floor(x / base)} remainder ${(x % base).toString(16).toUpperCase()}`);
      x = Math.floor(x / base);
    } while (x > 0);
    return out.join("; ") + ". Read the remainders from bottom to top.";
  };
  const b = toBin(n, bits);
  if (kind === "dec2bin") return `${divs(2)} Result: ${group4(b)}.`;
  if (kind === "dec2hex") return `${divs(16)} Result: ${toHex(n, bits)}.`;
  if (kind === "bin2dec") {
    const terms = [...b].map((c, i) => (c === "1" ? 2 ** (b.length - 1 - i) : null)).filter((x) => x !== null);
    return `Add the place values of the 1 bits: ${terms.join(" + ") || "0"} = ${n}.`;
  }
  if (kind === "hex2dec") {
    const h = toHex(n, bits);
    const t = [...h].map((c, i) => `${parseInt(c, 16)}×${16 ** (h.length - 1 - i)}`);
    return `${h}: ${t.join(" + ")} = ${n}.`;
  }
  const g = group4(b).split(" ");
  return `Split into groups of 4 bits: ${g.map((x) => `${x}=${parseInt(x, 2).toString(16).toUpperCase()}`).join(", ")}. Result: ${toHex(n, bits)}.`;
}

export const multiplier = (streak) => Math.min(3, 1 + Math.floor(streak / 3));
