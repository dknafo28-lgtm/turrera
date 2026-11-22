import { createClient } from "@supabase/supabase-js";
import { SYSTEM_PROMPT, buildPrompt, parseAppraisal } from "../collectors/appraise.mjs";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data } = await sb.from("lots").select("id,title,description,condition,state,sell_ease,sell_note,est_value").in("category", ["cars","trucks"]).not("description","is",null).limit(2);
for (const lot of data) {
  console.log("LOT", lot.title, "| ease:", lot.sell_ease, "| note:", lot.sell_note, "| est:", lot.est_value);
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 2000, system: SYSTEM_PROMPT, messages: [{ role: "user", content: buildPrompt(lot) }] }) });
  const txt = await res.text();
  console.log("STATUS", res.status, "HEADERS", res.headers.get("anthropic-ratelimit-requests-limit"), res.headers.get("anthropic-ratelimit-input-tokens-limit"), res.headers.get("retry-after"));
  console.log("RAW", txt.slice(0, 1200));
  try { const j = JSON.parse(txt); console.log("PARSED", JSON.stringify(parseAppraisal(j.content?.map((c) => c.text ?? "").join(" ")))); } catch (e) { console.log("ERR", String(e)); }
}
