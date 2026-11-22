import { connect } from "../collectors/mcp.mjs";
const m = await connect("https://ai.municibid.com/mcp");
for (const args of [{}, { limit: 50 }, { state: "PA", limit: 5 }, { query: "truck", limit: 5 }, { sort: "newest", limit: 5 }]) {
  const s = await m.call("search_auctions", args);
  console.log("SEARCH", JSON.stringify(args), "count", s.result_count, "fresh", JSON.stringify(s.data_freshness), "notes", JSON.stringify(s.notes), "first", JSON.stringify(s.results?.[0] ?? null).slice(0, 800));
}
const c = await m.call("get_sold_comps", { query: "truck" }).catch((e) => ({ err: String(e) }));
console.log("COMPS", JSON.stringify(c).slice(0, 600));
