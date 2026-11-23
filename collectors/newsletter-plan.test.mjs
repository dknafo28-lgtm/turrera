import { test } from "node:test";
import assert from "node:assert/strict";
import { planWeek, easternDay, dayLabel } from "./newsletter-plan.mjs";

const now = new Date("2026-11-23T12:00:00Z"); // Monday 7 am Eastern
const lot = (id, end, extra = {}) => ({ id, end_time: end, category: "cars", photo_url: "x.jpg", current_bid: 100, ...extra });

test("days are Eastern time", () => {
  assert.equal(easternDay("2026-11-25T03:00:00Z"), "2026-11-24"); // 10 pm Tuesday Eastern
  assert.equal(dayLabel("2026-11-24"), "Tuesday, Nov 24");
});

test("groups by closing day, skips the past and beyond the week", () => {
  const plan = planWeek([
    lot("a", "2026-11-24T18:00:00Z"), lot("b", "2026-11-24T20:00:00Z"),
    lot("c", "2026-11-26T18:00:00Z"), lot("old", "2026-11-22T18:00:00Z"), lot("far", "2026-12-05T18:00:00Z"),
  ], { now });
  assert.deepEqual(plan.map((d) => [d.label, d.total]), [["Tuesday, Nov 24", 2], ["Thursday, Nov 26", 1]]);
});

test("prefers boats and easy resale, and mixes categories", () => {
  const end = "2026-11-24T18:00:00Z";
  const plan = planWeek([
    lot("car1", end), lot("car2", end, { sell_ease: "easy" }), lot("car3", end, { sell_ease: "easy" }),
    lot("boat", end, { category: "boats" }), lot("truck", end, { category: "trucks" }), lot("nophoto", end, { category: "boats", photo_url: null }),
  ], { now });
  assert.deepEqual(plan[0].lots.map((l) => l.id), ["boat", "car2", "truck"]);
  assert.equal(plan[0].total, 6);
});
