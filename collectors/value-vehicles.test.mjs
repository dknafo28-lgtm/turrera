import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeComps, percentile } from "./value-vehicles.mjs";

test("percentile", () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(percentile([], 0.5), null);
});

test("summarizeComps keeps only matching listings", () => {
  const v = { year: 2017, make: "Ford", model: "F-150" };
  const items = [
    { title: "2017 Ford F-150 XLT 4x4", price: { value: "24000" } },
    { title: "2017 FORD F150 Lariat", price: { value: "28000" } },
    { title: "2017 Ford F-150", price: { value: "21000" } },
    { title: "2018 Ford F-150", price: { value: "30000" } },      // wrong year
    { title: "2017 Ford Explorer", price: { value: "15000" } },    // wrong model
    { title: "2017 Ford F-150 parts", price: { value: "100" } },   // too cheap
  ];
  const c = summarizeComps(v, items);
  assert.equal(c.count, 3);
  assert.equal(c.median, 24000);
  assert.equal(c.low, 22500);
  assert.equal(c.high, 26000);
});

test("summarizeComps needs at least 3 comps", () => {
  const c = summarizeComps({ year: 2017, make: "Ford", model: "Fusion" }, [{ title: "2017 Ford Fusion", price: { value: "9000" } }]);
  assert.equal(c.median, null);
  assert.equal(c.count, 1);
});
