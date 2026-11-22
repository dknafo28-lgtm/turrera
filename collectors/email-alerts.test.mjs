import { test } from "node:test";
import assert from "node:assert/strict";
import { siteFor, listingId, parseListings, toLot, extractLinks, SITES } from "./email-alerts.mjs";

test("siteFor recognises the three alert senders", () => {
  assert.equal(siteFor({ from: "GovDeals <noreply@govdeals.com>" }).source, "govdeals");
  assert.equal(siteFor({ from: "alerts@govplanet.com" }).source, "govplanet");
  assert.equal(siteFor({ from: "CWS Marketing <info@cwsmarketing.com>" }).source, "cws");
  assert.equal(siteFor({ from: "me@gmail.com", html: '<a href="https://www.govdeals.com/asset/123">x</a>' }).source, "govdeals");
  assert.equal(siteFor({ from: "news@example.com", html: "hello" }), null);
});

test("listingId uses the site's own id when the link has one", () => {
  assert.equal(listingId("govdeals", "https://www.govdeals.com/en/asset/12345/678"), "govdeals:12345-678");
  assert.equal(listingId("govdeals", "https://www.govdeals.com/index.cfm?fa=Main.Item&itemid=4321&acctid=99"), "govdeals:itemid-4321");
  assert.equal(listingId("govplanet", "https://www.govplanet.com/for-sale/Trucks/2015-Ford-F250/1234567"), "govplanet:1234567");
  assert.match(listingId("cws", "https://bid.cwsmarketing.com/lots/view/abc"), /^cws:[0-9a-f]{16}$/);
  assert.equal(listingId("cws", "https://bid.cwsmarketing.com/lots/view/abc"), listingId("cws", "https://bid.cwsmarketing.com/lots/view/abc"));
});

test("parseListings keeps only usable entries", () => {
  const reply = 'Here: {"listings":[{"title":"2016 Ford F-150","url":"https://www.govdeals.com/asset/1234/5678","current_bid":2100,"end_time":"2026-11-30T15:00:00-05:00","state":"fl"},{"title":"no link"},{"title":"bad","url":"mailto:x"}]}';
  const ls = parseListings(reply);
  assert.equal(ls.length, 1);
  const lot = toLot(SITES[0], ls[0]);
  assert.equal(lot.id, "govdeals:1234-5678");
  assert.equal(lot.category, "trucks");
  assert.equal(lot.state, "FL");
  assert.equal(lot.current_bid, 2100);
  assert.equal(lot.end_time, "2026-11-30T20:00:00.000Z");
  assert.deepEqual(parseListings("no json"), []);
});

test("extractLinks reads anchors", () => {
  const links = extractLinks('<a href="https://www.govdeals.com/asset/1/2"><b>2016 Ford</b>&nbsp;F-150</a> <a href="mailto:a@b.c">x</a>');
  assert.deepEqual(links, [{ href: "https://www.govdeals.com/asset/1/2", text: "2016 Ford F-150" }]);
});
