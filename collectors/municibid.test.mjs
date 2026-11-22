import { test } from "node:test";
import assert from "node:assert/strict";
import { toLot, fullImage, isTestListing } from "./municibid.mjs";
import { parseMcpBody } from "./mcp.mjs";

const sample = {
  auction_id: "86494859", title: "2003 International 4400 Dump Truck", category: "Dump Trucks",
  seller_name: "Township of East Brunswick", city: "East Brunswick", state: "nj", current_price: 1500, bid_count: 0,
  closing_at: "2026-11-23T08:36:00-05:00",
  image_url: "https://ai.municibid.com/api/image?url=https%3A%2F%2Fstoragemunicibidpro.blob.core.windows.net%2Fassets%2Fmedia%2Fb1621d1c_thumbcrop.jpg",
  listing_url: "https://municibid.com/Listing/Details/86494859",
};

test("toLot maps Municibid search results", () => {
  const lot = toLot(sample);
  assert.equal(lot.id, "municibid:86494859");
  assert.equal(lot.category, "trucks");
  assert.equal(lot.state, "NJ");
  assert.equal(lot.current_bid, 1500);
  assert.equal(lot.agency, "Township of East Brunswick");
  assert.equal(lot.end_time, "2026-11-23T13:36:00.000Z");
  assert.equal(lot.photo_url, "https://storagemunicibidpro.blob.core.windows.net/assets/media/b1621d1c_thumbcrop.jpg");
});

test("category falls back to Municibid's own category", () => {
  assert.equal(toLot({ ...sample, title: "CAT unit #42", category: "Backhoe" }).category, "equipment");
});

test("test listings are skipped", () => {
  assert.equal(isTestListing({ title: "test item not for sale", seller_name: "Demo Seller" }), true);
  assert.equal(isTestListing(sample), false);
});

test("fullImage leaves other URLs alone", () => {
  assert.equal(fullImage("https://example.com/a.jpg"), "https://example.com/a.jpg");
  assert.equal(fullImage(null), null);
});

test("parseMcpBody reads SSE and JSON", () => {
  assert.deepEqual(parseMcpBody('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n\n'), { jsonrpc: "2.0", id: 1, result: { ok: true } });
  assert.deepEqual(parseMcpBody('{"jsonrpc":"2.0","id":2,"result":{}}'), { jsonrpc: "2.0", id: 2, result: {} });
});

test("plural Municibid categories still map", () => {
  assert.equal(toLot({ ...sample, title: "Unit 7", category: "Backhoes" }).category, "equipment");
  assert.equal(toLot({ ...sample, title: "Unit 7", category: "Pickup Trucks" }).category, "trucks");
});

test("utcNoZone formats times the way the connector accepts", async () => {
  const { utcNoZone } = await import("./municibid.mjs");
  assert.equal(utcNoZone(new Date("2026-11-23T15:25:46-05:00")), "2026-11-23T20:25:46");
});

test("detailsToUpdate reads description and photos", async () => {
  const { detailsToUpdate } = await import("./municibid.mjs");
  const u = detailsToUpdate({
    description: "Runs&nbsp;well<br>Needs brakes",
    media: { primary_image_url: "https://ai.municibid.com/api/image?url=https%3A%2F%2Fx.net%2Fa_thumbcrop.jpg", image_urls: ["https://ai.municibid.com/api/image?url=https%3A%2F%2Fx.net%2Fa_thumbcrop.jpg", "https://ai.municibid.com/api/image?url=https%3A%2F%2Fx.net%2Fb_thumbcrop.jpg"] },
  });
  assert.equal(u.description, "Runs well\nNeeds brakes");
  assert.deepEqual(u.photos, ["https://x.net/a_thumbcrop.jpg", "https://x.net/b_thumbcrop.jpg"]);
});
