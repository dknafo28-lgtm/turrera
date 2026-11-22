import { test } from "node:test";
import assert from "node:assert/strict";
import { extractDescription, extractPhotos } from "./publicsurplus-details.mjs";

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

test("extractPhotos lists full-size photos once each", () => {
  const page = `<img src="https://d37.cloudfront.net/sms/docviewer/logo/19037/67364916">
<img src="https://d37.cloudfront.net/sms/docviewer/cdnaucdoc/thumb-b/4128203/72894219">
<a href="https://d37.cloudfront.net/sms/docviewer/cdnaucdoc/thumb-b/4128203/72894221"></a>
<img src="https://d37.cloudfront.net/sms/docviewer/cdnaucdoc/thumb-b/4128203/72894219">
<img src="https://d37.cloudfront.net/sms/docviewer/cdnaucdoc/thumb-b/9999999/1">`;
  assert.deepEqual(extractPhotos(page, "4128203"), [
    "https://d37.cloudfront.net/sms/docviewer/cdnaucdoc/thumb-a/4128203/72894219",
    "https://d37.cloudfront.net/sms/docviewer/cdnaucdoc/thumb-a/4128203/72894221",
  ]);
});
