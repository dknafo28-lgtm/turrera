// Writes lib/taxonomy.json (category and type labels) for the website from collectors/categorize.mjs.
import fs from "node:fs";
import { TAXONOMY, DISPLAY_ORDER } from "../collectors/categorize.mjs";

// The type named like its category (e.g. "Boats" under Boats & marine) is listed first.
const ordered = (key, subs) => [...subs.filter(([k]) => k === key), ...subs.filter(([k]) => k !== key)];
const byKey = Object.fromEntries(TAXONOMY.map(([key, label, , subs]) => [key, { key, label, subs: ordered(key, subs).map(([k, l]) => ({ key: k, label: l })) }]));
const out = DISPLAY_ORDER.map((k) => byKey[k]).concat({ key: "other", label: "Everything else", subs: [] });
fs.writeFileSync(new URL("../lib/taxonomy.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`lib/taxonomy.json: ${out.length} categories, ${out.reduce((n, c) => n + c.subs.length, 0)} types`);
