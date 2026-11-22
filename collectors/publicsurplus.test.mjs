import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListingPage, parseTimeLeft, lastPageIndex } from "./publicsurplus.mjs";

// Trimmed copy of a real Public Surplus category page (Nov 2026).
const html = `
<span class="me-2" role="button" onclick="srchPage('1');">2</span>
<span class="fw-bold me-2" role="button" onclick="srchPage('29');"><span class="small">&raquo;</span></span>
<div class="auction-item" id="4128203catGrid">
  <div class="auction-item-img">
    <a href="/sms/auction/view?auc=4128203">
      <img class="lazy-img-loading" loading="lazy" src="https://d37qv0n5b4mbzm.cloudfront.net/sms/docviewer/cdnmainaucdoc/thumb-b/4128203/72894219" alt="Picture"/>
    </a>
    <span class="auction-item-state">
      MN
    </span>
  </div>
  <div class="auction-item-body px-0">
    <h6 class="w-100 card-title ps-card-feat__body--title ps-1 mb-2">
      <a href="/sms/auction/view?auc=4128203" title="#4128203 - 2017 FORD TRANSIT CONNECT VAN">
        #4128203 - 2017 FORD TRANSIT CONNECT VAN
      </a>
    </h6>
    <div class="w-100 ps-card__body--children px-1">
      Price:
      <b id="val_4128203catGrid">
        $3,200.00
      </b>
      <div id="timeLeft4128203catGrid" class="d-inline w-100 auction-time_left">
        <label>Time Left:</label>
        <span id="timeLeftValue4128203catGrid" class="">
          19 hours 13 mins
        </span>
      </div>
    </div>
  </div>
</div>
<div class="auction-item" id="4129441catGrid">
  <div class="auction-item-img"><a href="/sms/auction/view?auc=4129441"><img src="https://example.com/x.jpg"/></a>
    <span class="auction-item-state">fl</span></div>
  <h6><a href="/sms/auction/view?auc=4129441" title="x">#4129441 - 1999- Ford F-150</a></h6>
  Price: <b id="val_4129441catGrid">$400.00</b>
  <span id="timeLeftValue4129441catGrid" class="">2 days 3 hours</span>
</div>`;

test("parseTimeLeft", () => {
  assert.equal(parseTimeLeft("19 hours 13 mins"), (19 * 60 + 13) * 60_000);
  assert.equal(parseTimeLeft("2 days 3 hours"), (2 * 24 + 3) * 3_600_000);
  assert.equal(parseTimeLeft("Closed"), null);
});

test("lastPageIndex", () => {
  assert.equal(lastPageIndex(html), 29);
  assert.equal(lastPageIndex("<div></div>"), 0);
});

test("parseListingPage reads cards", () => {
  const now = Date.parse("2026-11-22T00:00:00Z");
  const lots = parseListingPage(html, { fallback: "cars", now });
  assert.equal(lots.length, 2);
  const [a, b] = lots;
  assert.equal(a.id, "publicsurplus:4128203");
  assert.equal(a.title, "2017 FORD TRANSIT CONNECT VAN");
  assert.equal(a.category, "trucks");
  assert.equal(a.current_bid, 3200);
  assert.equal(a.state, "MN");
  assert.equal(a.end_time, new Date(now + (19 * 60 + 13) * 60_000).toISOString());
  assert.equal(a.lot_url, "https://www.publicsurplus.com/sms/auction/view?auc=4128203");
  assert.match(a.photo_url, /cloudfront/);
  assert.equal(b.title, "1999- Ford F-150");
  assert.equal(b.state, "FL");
  assert.equal(b.current_bid, 400);
});
