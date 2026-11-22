import { test } from "node:test";
import assert from "node:assert/strict";
import { extractDescription } from "./publicsurplus-details.mjs";

const html = `<div>Get Price Estimate</div>
<div class="h5">Description </div>
<div><b>Year:</b><br> 2017</div><div><b>Make:</b> FORD</div>
<div><b>Model:</b><br>TRANSIT CONNECT VAN</div><div><b>Mileage:</b><br>94,270</div>
<div><b>Running Condition:</b><br>Fair</div><p>Condition:</p><p>FAIR</p><p>VAN RUNS &amp; DRIVES</p>
<div>Pictures</div><div>Disclaimer</div><div>The City makes no warranty</div>
<script>var x = "Description";</script>`;

test("extractDescription pulls the item details", () => {
  const d = extractDescription(html);
  assert.match(d, /Year: 2017/);
  assert.match(d, /Mileage: 94,270/);
  assert.match(d, /VAN RUNS & DRIVES/);
  assert.doesNotMatch(d, /warranty/);
});

test("extractDescription returns null without a description", () => {
  assert.equal(extractDescription("<div>Nothing here</div>"), null);
});
