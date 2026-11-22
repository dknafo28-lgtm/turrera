import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVehicle } from "./vehicle.mjs";

test("parseVehicle reads common auction titles", () => {
  assert.deepEqual(parseVehicle("2017 FORD TRANSIT CONNECT VAN"), { year: 2017, make: "Ford", model: "Transit Connect" });
  assert.deepEqual(parseVehicle("1999- Ford F-150"), { year: 1999, make: "Ford", model: "F-150" });
  assert.deepEqual(parseVehicle("2015 Chevrolet Impala sedan"), { year: 2015, make: "Chevrolet", model: "Impala" });
  assert.deepEqual(parseVehicle("2011 Ford Crown Victoria Police Interceptor"), { year: 2011, make: "Ford", model: "Crown Victoria" });
  assert.deepEqual(parseVehicle("2018 Toyota Camry"), { year: 2018, make: "Toyota", model: "Camry" });
  assert.deepEqual(parseVehicle("2014 Dodge Grand Caravan"), { year: 2014, make: "Dodge", model: "Grand Caravan" });
  assert.deepEqual(parseVehicle("2019 Chevy Silverado 1500 4x4"), { year: 2019, make: "Chevrolet", model: "Silverado 1500" });
});

test("parseVehicle returns null when it can't tell", () => {
  assert.equal(parseVehicle("Office chairs"), null);
  assert.equal(parseVehicle("Ford truck"), null); // no year
  assert.equal(parseVehicle("2012 Flat Rack Trailer"), null); // no make
});
