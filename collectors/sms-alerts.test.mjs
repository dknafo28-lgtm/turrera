import { test } from "node:test";
import assert from "node:assert/strict";
import { due, left, message } from "./sms-alerts.mjs";
import { toE164 } from "./sms.mjs";

const at = (iso) => new Date(iso).getTime();
const noon = at("2026-11-26T17:00:00Z"); // noon Eastern
const lot = (id, end, extra = {}) => ({ id, source: "publicsurplus", title: "2015 Ford F-250 4x4", current_bid: 6100, end_time: end, ...extra });

test("phone numbers", () => {
  assert.equal(toE164("(305) 555-0123"), "+13055550123");
  assert.equal(toE164("1-305-555-0123"), "+13055550123");
  assert.equal(toE164("+1 242 555 0123"), "+12425550123");
  assert.equal(toE164("555-0123"), null);
});

test("texts lots closing within the chosen hours, not later ones or ended ones", () => {
  const lots = [lot("a", "2026-11-26T19:00:00Z"), lot("b", "2026-11-26T23:00:00Z"), lot("c", "2026-11-26T16:00:00Z")];
  assert.deepEqual(due(lots, 3, noon).map((l) => l.id), ["a"]);
});

test("date-only auctions get a text the morning they close", () => {
  const gsa = lot("g", "2026-11-27T04:59:00Z", { source: "gsa" }); // Nov 26, end of day Eastern
  assert.deepEqual(due([gsa], 3, noon).map((l) => l.id), ["g"]);
  assert.deepEqual(due([gsa], 3, at("2026-11-26T04:00:00Z")).map((l) => l.id), []); // 11 pm the night before
});

test("no texts overnight unless the lot closes before 9 am", () => {
  const night = at("2026-11-27T04:00:00Z"); // 11 pm Eastern
  assert.deepEqual(due([lot("x", "2026-11-27T06:00:00Z")], 3, night).map((l) => l.id), ["x"]); // closes 1 am
  assert.deepEqual(due([lot("y", "2026-11-27T15:00:00Z")], 24, night).map((l) => l.id), []); // closes 10 am: wait for morning
});

test("message wording", () => {
  assert.equal(left(150 * 60000), "2h 30m");
  const one = message("https://turrera.com", [lot("publicsurplus:1", "2026-11-26T19:30:00Z")], noon);
  assert.equal(one, "Turrera: 2015 Ford F-250 4x4: closes in 2h 30m, bid $6,100. https://turrera.com/lot/publicsurplus%3A1 Reply STOP to opt out.");
  assert.ok(one.length < 160);
  const many = message("https://turrera.com", [lot("1", "2026-11-26T19:00:00Z"), lot("2", "2026-11-26T19:30:00Z")], noon);
  assert.match(many, /^Turrera: 2 lots on your watchlist close soon\./);
});
