// Minimal client for MCP servers over Streamable HTTP (JSON-RPC, responses as JSON or SSE).

export function parseMcpBody(text) {
  const trimmed = (text ?? "").trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const messages = trimmed
    .split(/\n\n+/)
    .map((block) => block.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join(""))
    .filter(Boolean)
    .map((d) => JSON.parse(d));
  return messages.find((m) => "result" in m || "error" in m) ?? messages[0] ?? null;
}

export async function connect(url, clientName = "turrera") {
  const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "User-Agent": "TurreraBot/1.0 (+https://turrera.com)" };
  let id = 0;
  async function rpc(method, params, notify = false) {
    const body = notify ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id: ++id, method, params };
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const sid = res.headers.get("mcp-session-id");
    if (sid) headers["mcp-session-id"] = sid;
    const text = await res.text();
    if (notify) return null;
    if (!res.ok) throw new Error(`MCP ${method} HTTP ${res.status}: ${text.slice(0, 200)}`);
    const msg = parseMcpBody(text);
    if (msg?.error) throw new Error(`MCP ${method} error: ${JSON.stringify(msg.error).slice(0, 300)}`);
    return msg?.result;
  }
  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: clientName, version: "1.0" } });
  await rpc("notifications/initialized", undefined, true);
  return {
    async call(name, args) {
      const result = await rpc("tools/call", { name, arguments: args });
      if (result?.isError) throw new Error(`Tool ${name} failed: ${JSON.stringify(result.content).slice(0, 300)}`);
      if (result?.structuredContent) return result.structuredContent;
      const text = result?.content?.find((c) => c.type === "text")?.text;
      try { return text ? JSON.parse(text) : result; } catch { return { text }; }
    },
  };
}
