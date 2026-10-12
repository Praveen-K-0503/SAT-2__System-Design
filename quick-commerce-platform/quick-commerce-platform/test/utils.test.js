const test = require("node:test");
const assert = require("node:assert/strict");
const { haversineKm } = require("../src/utils");

test("haversine distance is zero for identical coordinates", () => {
  assert.equal(haversineKm(11, 77, 11, 77), 0);
});
test("haversine distance is positive for different coordinates", () => {
  assert.ok(haversineKm(11, 77, 12, 78) > 0);
});
