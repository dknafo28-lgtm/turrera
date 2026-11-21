import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRecords, toLot } from "./gsa.mjs";
import { categorize } from "./categorize.mjs";

const sample = {
  SaleNo: "41QSCI26123001",
  LotNo: 7,
  AucStartDt: "2026-11-20T15:00:00Z",
  AucEndDt: "2026-12-01T19:00:00Z",
  ItemName: "2017 Ford F-250 Pickup Truck",
  LotDescript: "4x4, 98,000 miles, runs and drives",
  PropertyCity: "Miami",
  PropertyState: "fl",
  PropertyZip: 33101,
  AuctionStatus: "A",
  HighBidAmount: "4,250",
  AgencyName: "Department of Homeland Security",
  ItemDescURL: "https://www.gsaauctions.gov/auctions/preview/123",
  ImageURL: "https://www.gsaauctions.gov/img/123.jpg",
};

test("extractRecords handles arrays and wrapped arrays", () => {
  assert.equal(extractRecords([sample]).length, 1);
  assert.equal(extractRecords({ Results: [sample, sample] }).length, 2);
  assert.equal(extractRecords({ data: { items: [sample] } }).length, 1);
  assert.equal(extractRecords({}).length, 0);
});

test("toLot maps GSA fields", () => {
  const lot = toLot(sample);
  assert.equal(lot.id, "gsa:41QSCI26123001:7");
  assert.equal(lot.category, "trucks");
  assert.equal(lot.current_bid, 4250);
  assert.equal(lot.state, "FL");
  assert.equal(lot.zip, "33101");
  assert.equal(lot.status, "active");
  assert.equal(lot.end_time, "2026-12-01T19:00:00.000Z");
  assert.equal(lot.lot_url, sample.ItemDescURL);
});

test("toLot tolerates missing fields", () => {
  const lot = toLot({ SaleNo: "X", LotNo: 1, AucEndDt: "not a date" });
  assert.equal(lot.end_time, null);
  assert.equal(lot.current_bid, null);
  assert.equal(lot.status, "scheduled");
});

test("categorize", () => {
  assert.equal(categorize("2002 Angler 22 center console boat"), "boats");
  assert.equal(categorize("Blue Bird School Bus"), "buses");
  assert.equal(categorize("Club Car golf cart"), "golf carts");
  assert.equal(categorize("CAT 320 excavator"), "equipment");
  assert.equal(categorize("2015 Chevrolet Impala sedan"), "cars");
  assert.equal(categorize("Office chairs, lot of 20"), "other");
});
