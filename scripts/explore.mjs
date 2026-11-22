import { connect } from "../collectors/mcp.mjs";
const m = await connect("https://ai.municibid.com/mcp");
for (const v of ["2026-11-23T20:25:46Z", "2026-11-23", "2026-11-23T20:25:46", "2026-11-23 20:25:46", "2026-11-23T20:25:46+00:00"]) {
  try { const s = await m.call("search_auctions", { closing_after: v, limit: 2, sort: "closing_soon" }); console.log("OK", v, s.result_count, s.results?.[0]?.closing_at); }
  catch (e) { console.log("BAD", v, String(e).slice(0, 160)); }
}
