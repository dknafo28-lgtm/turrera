import { test } from "node:test";
import assert from "node:assert/strict";
import { isGovernmentSeller, closeDate, toLot } from "./jjkane.mjs";

test("government sellers are kept", () => {
  for (const n of ["CITY OF NEW ORLEANS", "CHAD CHRONISTER AS SHERIFF OF HILLSBOROUGH COUNTY", "HILLSBOROUGH COUNTY B.O.C.C",
    "FLORIDA STATE DEPARTMENT OF TRANSPORTATION", "BAY AREA RAPID TRANSIT", "UNIVERSITY OF CALIFORNIA DAVIS",
    "FAIRFIELD SUISUN UNIFIED SCHOOL DISTRICT", "SACRAMENTO MUNICIPAL UTILITY DISTRICT", "TOWN OF JUPITER", "JEFFERSON PARISH SHERIFF'S OFFICE"]) {
    assert.equal(isGovernmentSeller(n), true, n);
  }
});

test("companies are dropped", () => {
  for (const n of ["COMMONWEALTH EDISON", "Duke Energy", "AT&T - ELEMENT FLEET CORPORTATION", "KARNES CITY ELECTRIC COOPERATIVE, INC",
    "ASPLUNDH TREE EXPERT LLC", "Ervin Cable Construction, LLC", "PODS", "HOMEDEPOTRENTALS", "TOWN AND COUNTY TREE SERVICE", ""]) {
    assert.equal(isGovernmentSeller(n), false, n);
  }
});

test("closeDate and toLot", () => {
  assert.equal(closeDate("11/24/2026"), "2026-11-24T17:00:00.000Z");
  assert.equal(closeDate(null), null);
  const lot = toLot({ id: 1633418, webDescription: "2018 Ford F-250 Pickup", accountName: "CITY OF ORLANDO", imageCount: 3,
    ringCloseOutDate: "11/24/2026", offSite: 1, offSitePhysicalCity: "Orlando", offSitePhysicalState: "fl", catalogDescription: "Runs" });
  assert.equal(lot.id, "jjkane:1633418");
  assert.equal(lot.category, "trucks");
  assert.equal(lot.state, "FL");
  assert.equal(lot.photos.length, 3);
  assert.equal(lot.photo_url, "https://prod.cdn.jjkane.com/1633418-1");
  assert.equal(lot.lot_url, "https://www.jjkane.com/items/1633418");
});
