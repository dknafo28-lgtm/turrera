const UA = { "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, opts = {}) {
  try {
    const res = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, method: opts.method || "GET", body: opts.body, redirect: "follow" });
    const text = await res.text();
    console.log(`\n===== ${opts.method || "GET"} ${url} -> ${res.status} (${text.length}) type=${res.headers.get("content-type")} session=${res.headers.get("mcp-session-id")}`);
    return { res, text };
  } catch (e) { console.log(`\n===== ${url} ERROR ${e}`); return { text: "" }; }
}
// --- Municibid MCP ---
const MCP = "https://ai.municibid.com/mcp";
const H = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
let r = await get(MCP, { method: "POST", headers: H, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "turrera", version: "1.0" } } }) });
console.log("INIT", r.text.slice(0, 1500));
const sid = r.res?.headers.get("mcp-session-id");
const H2 = sid ? { ...H, "mcp-session-id": sid } : H;
await get(MCP, { method: "POST", headers: H2, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) });
r = await get(MCP, { method: "POST", headers: H2, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) });
console.log("TOOLS", r.text.slice(0, 8000));
// --- robots ---
for (const u of ["https://www.govdeals.com/robots.txt", "https://www.govplanet.com/robots.txt", "https://www.jjkane.com/robots.txt", "https://www.gastonandsheehan.com/robots.txt", "https://www.auctionsinternational.com/robots.txt", "https://www.purplewave.com/robots.txt"]) {
  await sleep(1500);
  const x = await get(u);
  console.log("ROBOTS", u, "\n" + x.text.slice(0, 2500));
}
