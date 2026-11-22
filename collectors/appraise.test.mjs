import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAppraisal, buildPrompt } from "./appraise.mjs";

test("parseAppraisal reads JSON, even with extra text", () => {
  const a = parseAppraisal('Here you go: {"low": 9000, "high": 12000, "ease": "Easy", "reason": "Popular work van."}');
  assert.deepEqual(a, { low: 9000, high: 12000, mid: 10500, ease: "easy", reason: "Popular work van." });
});

test("parseAppraisal fixes swapped or missing numbers", () => {
  assert.equal(parseAppraisal('{"low": 8000, "high": 5000, "ease": "hard", "reason": "x"}').low, 5000);
  assert.equal(parseAppraisal('{"low": null, "high": 4000, "ease": "moderate", "reason": "x"}').mid, 4000);
});

test("parseAppraisal handles 'not enough information' and junk", () => {
  const a = parseAppraisal('{"low": null, "high": null, "ease": null, "reason": "Not enough information."}');
  assert.equal(a.mid, null);
  assert.equal(a.ease, null);
  assert.equal(parseAppraisal("no json here"), null);
  assert.equal(parseAppraisal("{bad json}"), null);
  assert.equal(parseAppraisal('{"low": 1, "high": 2, "ease": "instant", "reason": "x"}').ease, null);
});

test("buildPrompt includes the useful fields", () => {
  const p = buildPrompt({ title: "2017 Ford Transit Connect", state: "MN", condition: "Runs and drives.", description: "Mileage: 94,270" });
  assert.match(p, /Location: MN/);
  assert.match(p, /Condition summary: Runs and drives\./);
  assert.match(p, /Mileage: 94,270/);
});
