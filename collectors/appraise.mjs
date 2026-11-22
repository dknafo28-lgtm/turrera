// Estimates market value and how easy each car, truck or piece of equipment would be to resell,
// using Claude on the listing's title and description.
// eBay-based values (value_source = "ebay") take priority and are never overwritten here.
//
// Run: ANTHROPIC_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node collectors/appraise.mjs

import { pathToFileURL } from "node:url";
import { getWriteClient } from "./db.mjs";

const MODEL = process.env.APPRAISAL_MODEL ?? "claude-haiku-5-5";
const MAX_PER_RUN = Number(process.env.APPRAISALS_PER_RUN ?? 400);
const PARALLEL = 4;
const CATEGORIES = ["cars", "trucks", "equipment"];
const EASE = new Set(["easy", "moderate", "hard"]);

export const SYSTEM_PROMPT = `You are an experienced US used-vehicle and equipment appraiser helping someone who buys at government surplus auctions and resells locally (Facebook Marketplace, Craigslist, eBay) or to dealers.

For the item described, estimate:
1. Its realistic resale value in its CURRENT condition as described (not after repairs), as a private-party sale in the US, in whole US dollars. Use the year, make, model, mileage/hours, condition notes and anything else stated. Do not use the current auction bid.
2. How easy it would be to resell: "easy" (common, in-demand, sells within days to a couple of weeks), "moderate" (sells but takes longer or needs the right buyer), or "hard" (niche, very poor condition, salvage, specialized, or expensive to transport).

Reply with JSON only, no other text:
{"low": number, "high": number, "ease": "easy" | "moderate" | "hard", "reason": "one short sentence on what drives value and demand"}

If the listing doesn't say enough to identify the item, reply: {"low": null, "high": null, "ease": null, "reason": "Not enough information."}`;

export function buildPrompt(lot) {
  return [
    `Title: ${lot.title}`,
    lot.state ? `Location: ${lot.state}` : null,
    lot.condition ? `Condition summary: ${lot.condition}` : null,
    `Listing:\n${(lot.description ?? "(no description)").slice(0, 6000)}`,
  ].filter(Boolean).join("\n");
}

export function parseAppraisal(text) {
  const match = (text ?? "").match(/\{[\s\S]*\}/);
  if (!match) return null;
  let json;
  try { json = JSON.parse(match[0]); } catch { return null; }
  const num = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
  let low = num(json.low);
  let high = num(json.high);
  if (low !== null && high !== null && low > high) [low, high] = [high, low];
  if (low === null && high !== null) low = high;
  if (high === null && low !== null) high = low;
  const ease = EASE.has(String(json.ease).toLowerCase()) ? String(json.ease).toLowerCase() : null;
  const reason = typeof json.reason === "string" ? json.reason.replace(/\s+/g, " ").trim().slice(0, 240) : null;
  return { low, high, mid: low !== null ? Math.round((low + high) / 2) : null, ease, reason };
}

async function ask(apiKey, lot) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000, // room for the model's brief internal reasoning before the answer
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(lot) }],
      }),
    });
    if (res.ok) {
      const json = await res.json();
      return parseAppraisal(json.content?.map((c) => c.text ?? "").join(" "));
    }
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 6000 * attempt));
      continue;
    }
    throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return null;
}

export async function run() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("Appraisals: skipped (ANTHROPIC_API_KEY not set yet).");
    return 0;
  }
  const supabase = getWriteClient();
  const { data: lots, error } = await supabase
    .from("lots")
    .select("id,title,description,condition,state,value_source")
    .in("category", CATEGORIES)
    .is("appraisal_updated", null)
    .not("description", "is", null)
    .gte("end_time", new Date().toISOString())
    .order("end_time", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) throw new Error(`Supabase read failed: ${error.message}`);

  let done = 0;
  let valued = 0;
  const queue = [...(lots ?? [])];
  async function worker() {
    while (queue.length) {
      const lot = queue.shift();
      const a = await ask(apiKey, lot);
      if (!a) continue;
      const update = { sell_ease: a.ease, sell_note: a.reason, appraisal_updated: new Date().toISOString() };
      if (lot.value_source !== "ebay" && a.mid !== null) {
        Object.assign(update, { est_value: a.mid, est_low: a.low, est_high: a.high, comps_count: null, value_source: "ai" });
        valued++;
      }
      const { error: upErr } = await supabase.from("lots").update(update).eq("id", lot.id);
      if (upErr) throw new Error(`Supabase update failed: ${upErr.message}`);
      done++;
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  console.log(`Appraisals: ${done} of ${lots?.length ?? 0} appraised, ${valued} with an AI value.`);
  return done;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
