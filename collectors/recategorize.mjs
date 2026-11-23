// Re-sorts every saved lot with the current category rules (category, type, boat length, year).
// Runs after each collection, so rule changes apply to lots already in the database.
import { getWriteClient } from "./db.mjs";
import { categorize, enrich, RENAMED, CATEGORIES } from "./categorize.mjs";

// The auction site's own category name, when the title alone doesn't say what it is.
function sourceHint(raw) {
  if (!raw || typeof raw !== "object") return "";
  return ["category", "parentCategory", "categoryName", "category_name", "catName"].map((k) => raw[k]).filter((v) => typeof v === "string").join(" ");
}

export function recategorize(lot) {
  let category = categorize(lot.title ?? "");
  if (category === "other") category = categorize(sourceHint(lot.raw));
  if (category === "other") {
    const kept = RENAMED[lot.category] ?? lot.category;
    if (kept && kept !== "other" && CATEGORIES.includes(kept)) category = kept; // e.g. Public Surplus "Marine" listings
  }
  const e = enrich({ title: lot.title, description: lot.description, category, year: lot.year });
  return { category: e.category, subcategory: e.subcategory, length_ft: e.length_ft ?? null, year: e.year ?? lot.year ?? null };
}

async function main() {
  const db = getWriteClient();
  const since = new Date(Date.now() - 45 * 86_400_000).toISOString();
  const changes = new Map();
  let seen = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("lots").select("id,title,description,category,subcategory,length_ft,year,raw")
      .or(`end_time.gte.${since},end_time.is.null`).order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const lot of data ?? []) {
      seen++;
      const n = recategorize(lot);
      if (n.category !== lot.category || n.subcategory !== lot.subcategory || (n.length_ft ?? null) !== (lot.length_ft === null ? null : Number(lot.length_ft)) || n.year !== lot.year) {
        const key = JSON.stringify(n);
        if (!changes.has(key)) changes.set(key, []);
        changes.get(key).push(lot.id);
      }
    }
    if (!data || data.length < 1000) break;
  }
  let updated = 0;
  for (const [key, ids] of changes) {
    const values = JSON.parse(key);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await db.from("lots").update(values).in("id", ids.slice(i, i + 200));
      if (error) throw new Error(error.message);
      updated += Math.min(200, ids.length - i);
    }
  }
  console.log(`Recategorize: checked ${seen} lots, updated ${updated}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
