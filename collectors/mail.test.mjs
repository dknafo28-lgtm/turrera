import { test } from "node:test";
import assert from "node:assert/strict";
import { lotRowHtml, lotLink, titleCase, esc } from "./mailer.mjs";
import { words, applySearch } from "./search-alerts.mjs";

const cfg = { site: "https://turrera.com", publicSite: false, address: "" };
const lot = { id: "gsa:1", source: "gsa", title: "LOT 12 2015 FORD F-250 4X4", city: "MIAMI", state: "FL", current_bid: 4000, est_low: 9000, est_high: 12000, spread: 6500, end_time: "2026-12-01T20:00:00Z", photo_url: "https://x/p.jpg", lot_url: "https://gsaauctions.gov/lot/1" };

test("links go to the auction while the site is private, to Turrera once public", () => {
  assert.equal(lotLink(cfg, lot), lot.lot_url);
  assert.equal(lotLink({ ...cfg, publicSite: true }, lot), "https://turrera.com/lot/gsa%3A1");
});

test("lot row shows a cleaned title, the bid and the deal", () => {
  const html = lotRowHtml(cfg, lot, "Check the <rust>");
  assert.match(html, /2015 Ford F-250 4X4/);
  assert.match(html, /\$4,000/);
  assert.match(html, /\$6,500 under estimated value/);
  assert.match(html, /Check the &lt;rust&gt;/);
});

test("no 'under value' line without a real bid", () => {
  const html = lotRowHtml(cfg, { ...lot, current_bid: null, source: "jjkane" }, "");
  assert.doesNotMatch(html, /under estimated value/);
  assert.match(html, /Bid shown on JJ Kane/);
});

test("search words are cleaned and capped", () => {
  assert.deepEqual(words("F-250, 4x4!!"), ["f-250", "4x4"]);
  assert.equal(words("a b c d e f g h").length, 6);
});

test("applySearch adds the right filters", () => {
  const calls = [];
  const q = new Proxy({}, { get: (_, k) => (...a) => { calls.push([k, ...a]); return q; } });
  applySearch(q, { q: "boat", category: "boats", state: "FL", max: "5000", deal: "1" });
  assert.deepEqual(calls.map((c) => c[0]), ["or", "eq", "eq", "lte", "gt", "gt"]);
});

test("esc and titleCase", () => {
  assert.equal(esc(`<a href="x">`), "&lt;a href=&quot;x&quot;&gt;");
  assert.equal(titleCase("Lot of 5 chairs"), "Lot of 5 chairs");
});
