import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.window = globalThis;
await import("../dist/data.js");
await import("../dist/location-utils.js");

const details = globalThis.LFMM_DATA.details;
const providers = Object.values(details).map((detail) => ({
  address: detail.address || "",
  city: detail.city || "",
  zip: detail.zip || "",
  lat: Number.isFinite(detail.lat) ? detail.lat : null,
  lng: Number.isFinite(detail.lng) ? detail.lng : null
}));
const locationUtils = globalThis.LFMM_LOCATION_UTILS;

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
assert.ok(
  html.indexOf("./location-utils.js") > html.indexOf("./data.js")
    && html.indexOf("./location-utils.js") < html.indexOf("./app.js"),
  "location utilities should load after provider data and before the application"
);

const downtown = locationUtils.resolveLocationSearch("60603", providers);
assert.equal(downtown.mode, "origin", "60603 should resolve to an offline distance-search origin");
assert.ok(downtown.origin, "60603 should include coordinates");

const nearby = providers.filter((provider) => provider.lat !== null && (
  locationUtils.haversineMiles(
    downtown.origin.lat,
    downtown.origin.lng,
    provider.lat,
    provider.lng
  ) <= 25
));
assert.ok(nearby.length > 0, "60603 should return mapped providers within 25 miles");

const exactProviderZip = locationUtils.resolveLocationSearch("60606", providers);
assert.equal(exactProviderZip.mode, "origin", "a provider ZIP should continue to resolve from directory data");

const unknownZip = locationUtils.resolveLocationSearch("99999", providers);
assert.equal(unknownZip.mode, "unresolved", "an unknown ZIP should not become a zero-result text filter");

console.log(`location regression passed: ${nearby.length} providers within 25 miles of 60603`);
