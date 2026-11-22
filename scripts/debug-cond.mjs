import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { count: done } = await sb.from("lots").select("*", { count: "exact", head: true }).not("condition", "is", null);
const { count: notDesc } = await sb.from("lots").select("*", { count: "exact", head: true }).eq("condition", "Condition not described.");
console.log("DONE", done, "NOT DESCRIBED", notDesc);
for (const src of ["gsa", "publicsurplus"]) {
  const { data } = await sb.from("lots").select("title,condition").eq("source", src).not("condition", "is", null).neq("condition", "Condition not described.").limit(6);
  for (const r of data ?? []) console.log("SAMPLE", src, "|", r.title, "=>", r.condition);
}
const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 20, messages: [{ role: "user", content: "Say ok" }] }) });
console.log("API CHECK", r.status, (await r.text()).slice(0, 200));
