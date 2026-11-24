import { test } from "node:test";
import assert from "node:assert/strict";
import { categorize, subcategorize, lengthFeet, yearOf, enrich } from "./categorize.mjs";

const cases = [
  ["22 ft Carolina Skiff with Yamaha 90 hp", "boats", "boats"],
  ["2002 Angler 22 center console boat", "boats", "boats"],
  ["Mercury 4hp Tiller Four Stroke outboard motor", "boats", "outboards"],
  ["Two Mercury engines and outdrives", "boats", "outboards"],
  ["Kawasaki Jet Ski Ultra 310", "boats", "pwc"],
  ["Sea-Doo GTI 130", "boats", "pwc"],
  ["Lot of Canoes, Kayak and Small Boats", "boats", "kayaks"],
  ["Boat trailer, galvanized", "boats", "boat-trailers"],
  ["Lowrance fish finder", "boats", "marine-parts"],
  ["24' Bennington pontoon", "boats", "pontoons"],
  ["32' Bayliner cabin cruiser", "boats", "boats"],
  ["1999 Sea Ray 280 Cruiser", "boats", "boats"],
  ["2014 Chevrolet Impala Police Cruiser 4-Door Sedan", "cars", "police"],
  ["Ski-Doo snowmobile", "powersports", "snowmobiles"],
  ["Club Car golf cart", "powersports", "golf-carts"],
  ["Polaris Sportsman 570", "powersports", "atv-utv"],
  ["2008 Harley-Davidson FLHP Motorcycle", "powersports", "motorcycles"],
  ["2007 GMC Ambulance", "emergency", "ambulances"],
  ["1996 E-One Pumper", "emergency", "fire-trucks"],
  ["UH-60L Black Hawk SN: 89-26158", "aircraft", "helicopters"],
  ["2016 Ford F-250 4x4 Crew Cab", "trucks", "pickups"],
  ["2000 International 2554 dump truck", "trucks", "dump-trucks"],
  ["2007 GMC C5500", "trucks", "work-trucks"],
  ["2016 Nissan Pathfinder", "cars", "suvs"],
  ["2015 Dodge Charger police", "cars", "police"],
  ["2018 Dodge Grand Caravan", "cars", "minivans"],
  ["2015 Chevrolet Impala sedan", "cars", "sedans"],
  ["Toyota 8FGU25 forklift 2010 Toyota", "equipment", "forklifts"],
  ["CAT 320 excavator", "equipment", "excavators"],
  ["STIHL handheld leaf blower", "equipment", "mowers"],
  ["Blue Bird School Bus", "buses", "school-buses"],
  ["5 X 10 Utility Trailer", "trailers", "utility-trailers"],
  ["Pressure Washers", "tools", "cleaning"],
  ["Lincoln MP 350 Welders", "tools", "welders"],
  ["Battery charger 12V", "industrial", "supplies"],
  ["Hobart Reach-in Refrigerator", "kitchen", "refrigeration"],
  ["Dell Latitude 5420 Laptops", "electronics", "computers"],
  ["Gas Chromatograph w/Mass Spec", "medical", "lab"],
  ["Office chairs, lot of 20", "furniture", "chairs"],
  ["Upright Piano", "recreation", "music"],
  ["2 Steel Doors & Frames", "building", "doors-windows"],
  ["Box lot of assorted filters", "other", null],
];

for (const [title, cat, sub] of cases) {
  test(`${title} -> ${cat}/${sub}`, () => {
    const c = categorize(title);
    assert.equal(c, cat);
    assert.equal(subcategorize(c, title), sub);
  });
}

test("boat length and year", () => {
  assert.equal(lengthFeet("2002 Angler 22' center console"), 22);
  assert.equal(lengthFeet("14FT Aluminum Skiff"), 14);
  assert.equal(lengthFeet("Boat 2 ft wide"), null);
  assert.equal(yearOf("1981 Monarch 24' Work Boat"), 1981);
  assert.equal(yearOf("Lot 2000 chairs"), 2000);
});

test("enrich renames old categories and fills type, length and year", () => {
  const r = enrich({ title: "1981 Monarch 24' Work Boat", category: "boats" });
  assert.equal(r.subcategory, "boats");
  assert.equal(r.length_ft, 24);
  assert.equal(r.year, 1981);
  assert.equal(enrich({ title: "Club Car golf cart", category: "golf carts" }).category, "powersports");
});
