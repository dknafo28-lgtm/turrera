import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePublicSurplusResult, municibidResult } from "./results.mjs";

test("Public Surplus final price", () => {
  const html = "<div>Auction Ended Nov 21, 2026 07:03 PM MST</div><td># of Bids</td><td>24</td><td>Final Price</td><td>$1,370.00</td>";
  assert.deepEqual(parsePublicSurplusResult(html), { final_price: 1370, bid_count: 24, sold: true });
});

test("Public Surplus with no bids is not sold, and open auctions are skipped", () => {
  assert.equal(parsePublicSurplusResult("<b>Auction Ended</b> # of Bids 0 Final Price $0.00").sold, false);
  assert.equal(parsePublicSurplusResult("<b>Time Left</b> 2 days"), null);
});

test("Municibid result", () => {
  assert.deepEqual(municibidResult({ pricing: { current_price: 25200, bid_count: 1 } }), { final_price: 25200, bid_count: 1, sold: true });
  assert.equal(municibidResult({}), null);
});
