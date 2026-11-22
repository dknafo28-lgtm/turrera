// Builds the Turrera logo as clean vector paths (no font needed at runtime).
// Wordmark: Saira Semi Condensed ExtraBold, converted to outlines. Mark: two-peak mountain, redrawn.
import opentype from "opentype.js";
import { writeFileSync, readFileSync } from "node:fs";

const font = opentype.parse(readFileSync("node_modules/@fontsource/saira-semi-condensed/files/saira-semi-condensed-latin-800-normal.woff").buffer);
const SIZE = 40;
const text = "TURRERA";
// Slightly opened letter spacing, like the original.
let x = 0;
const parts = [];
for (const ch of text) {
  const g = font.charToGlyph(ch);
  const p = g.getPath(x, 0, SIZE);
  parts.push(p.toPathData(2));
  x += (g.advanceWidth / font.unitsPerEm) * SIZE + 1.2;
}
const bbox = (() => { const p = font.getPath(text, 0, 0, SIZE); return p.getBoundingBox(); })();
const capTop = -font.tables.os2.sCapHeight / font.unitsPerEm * SIZE; // negative y
const wordWidth = x - 1.2;
const capH = -capTop;

// Mountain mark: a low, angular two-peak ridge (as in the original), redrawn as one clean shape.
const H = capH * 0.58;
const W = capH * 1.9;
const lift = capH * 0.16; // sits slightly above the baseline, like the original
const mark = (ox, oy) => {
  const P = (a, b) => `${(ox + a * W).toFixed(2)} ${(oy + b * H).toFixed(2)}`;
  const outer = `M${P(0, 1)} L${P(0.31, 0)} L${P(0.49, 0.5)} L${P(0.64, 0.16)} L${P(1, 1)} L${P(0.85, 1)} L${P(0.64, 0.5)} L${P(0.5, 0.94)} L${P(0.31, 0.38)} L${P(0.13, 1)} Z`;
  return { outer, snow: "" };
};
const gap = capH * 0.22;
const m = mark(0, -lift - H);
const wordX = W + gap;
const word = parts.map((d) => d.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (s, a, _1, b) => `${(Number(a) + wordX).toFixed(2)} ${b}`));
// opentype path data uses "Mx y" without space after letter; shift x coordinates robustly by re-generating with offset instead
const wordShifted = (() => { let xx = wordX; const out = []; for (const ch of text) { const g = font.charToGlyph(ch); out.push(g.getPath(xx, 0, SIZE).toPathData(2)); xx += (g.advanceWidth / font.unitsPerEm) * SIZE + 1.2; } return out.join(" "); })();
const totalW = wordX + wordWidth;
const pad = 2;
const vb = `${-pad} ${(capTop - pad).toFixed(2)} ${(totalW + pad * 2).toFixed(2)} ${(capH + pad * 2).toFixed(2)}`;

const svg = (markColor, snowColor, wordColor) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Turrera">
  <path d="${m.outer}" fill="${markColor}"/>
  <path d="${wordShifted}" fill="${wordColor}"/>
</svg>
`;
// On dark (navy) backgrounds and on light backgrounds.
writeFileSync("public/logo-on-dark.svg", svg("#9fd0dc", "", "#ffffff"));
writeFileSync("public/logo-on-light.svg", svg("#3d7f93", "", "#162e51"));
// Square mark for the browser tab icon.
const fm = mark(0, 0);
const side = W * 1.3;
writeFileSync("public/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(-(side - W) / 2).toFixed(2)} ${(-(side - H) / 2).toFixed(2)} ${side.toFixed(2)} ${side.toFixed(2)}"><rect x="${(-(side - W) / 2).toFixed(2)}" y="${(-(side - H) / 2).toFixed(2)}" width="${side.toFixed(2)}" height="${side.toFixed(2)}" rx="${(side * 0.2).toFixed(2)}" fill="#162e51"/><path d="${fm.outer}" fill="#9fd0dc"/></svg>\n`);
// Data for the React component.
writeFileSync("components/logo-paths.json", JSON.stringify({ viewBox: vb, mark: m.outer, snow: m.snow, word: wordShifted }));
console.log("logo ok", vb, "cap", capH.toFixed(2), "word", wordWidth.toFixed(1));
