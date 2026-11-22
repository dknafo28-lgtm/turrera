// Writes a two-sentence condition summary for each lot using Claude (Anthropic API).
// Only lots with a description and no summary yet are processed, soonest-ending first.
//
// Run: ANTHROPIC_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node collectors/summarize-condition.mjs

import { pathToFileURL } from "node:url";
import { getWriteClient } from "./db.mjs";

const MODEL = process.env.CONDITION_MODEL ?? "claude-haiku-5-5";
const MAX_PER_RUN = Number(process.env.CONDITION_PER_RUN ?? 400);
const PARALLEL = 4;

export const SYSTEM_PROMPT = `You summarize government surplus auction listings for a buyer who flips vehicles, boats and equipment.
Write AT MOST two short sentences about the item's CONDITION only: whether it runs/drives/operates, known problems or damage, missing parts, and mileage or hours if stated.
Ignore payment, pickup, tax, bidding and legal boilerplate. Do not invent anything that isn't in the listing.
If the listing says nothing about condition, reply exactly: Condition not described.
Reply with the summary text only.`;

export function buildPrompt(lot) {
  return `Title: ${lot.title}\n\nListing:\n${(lot.description ?? "").slice(0, 6000)}`;
}

export function cleanSummary(text) {
  const s = (text ?? "").replace(/\s+/g, " ").trim().replace(/^["']|["']$/g, "");
  return s ? s.slice(0, 400) : null;
}

async function summarize(apiKey, lot) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(lot) }],
      }),
    });
    if (res.ok) {
      const json = await res.json();
      return cleanSummary(json.content?.map((c) => c.text ?? "").join(" "));
    }
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 5000 * attempt));
      continue;
    }
    throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return null;
}

export async function run() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("Condition summaries: skipped (ANTHROPIC_API_KEY not set yet).");
    return 0;
  }
  const supabase = getWriteClient();
  const { data: lots, error } = await supabase
    .from("lots")
    .select("id,title,description")
    .is("condition", null)
    .not("description", "is", null)
    .gte("end_time", new Date().toISOString())
    .order("end_time", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) throw new Error(`Supabase read failed: ${error.message}`);

  let done = 0;
  const queue = [...(lots ?? [])];
  async function worker() {
    while (queue.length) {
      const lot = queue.shift();
      const condition = await summarize(apiKey, lot);
      if (!condition) continue;
      const { error: upErr } = await supabase
        .from("lots")
        .update({ condition, condition_updated: new Date().toISOString() })
        .eq("id", lot.id);
      if (upErr) throw new Error(`Supabase update failed: ${upErr.message}`);
      done++;
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  console.log(`Condition summaries: wrote ${done} of ${lots?.length ?? 0}.`);
  return done;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
