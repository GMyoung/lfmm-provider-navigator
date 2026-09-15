import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const args = process.argv.slice(2);
const outputArg = args.pop();
const inputArgs = args;

if (!inputArgs.length || !outputArg) {
  throw new Error("Usage: node scripts/build-zip-centers.mjs <GeoNames TXT...> <output.js>");
}

const outputPath = resolve(outputArg);
const grouped = new Map();

for (const inputArg of inputArgs) {
  const source = await readFile(resolve(inputArg), "utf8");
  for (const line of source.split(/\r?\n/)) {
    if (!line) continue;
    const fields = line.split("\t");
    const zip = fields[1];
    const lat = Number(fields[9]);
    const lng = Number(fields[10]);

    if (!/^\d{5}$/.test(zip || "")) continue;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) continue;
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) continue;

    const entry = grouped.get(zip) || { latTotal: 0, lngTotal: 0, count: 0 };
    entry.latTotal += lat;
    entry.lngTotal += lng;
    entry.count += 1;
    grouped.set(zip, entry);
  }
}

if (grouped.size < 40000) {
  throw new Error("Expected at least 40,000 ZIP codes, received " + grouped.size);
}

const centers = Object.fromEntries(
  [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([zip, entry]) => [
      zip,
      [
        Number((entry.latTotal / entry.count).toFixed(5)),
        Number((entry.lngTotal / entry.count).toFixed(5))
      ]
    ])
);

const output = [
  "/*",
  " * United States ZIP center coordinates derived from GeoNames Postal Code Data.",
  " * Source: https://download.geonames.org/export/zip/",
  " * Files: " + inputArgs.map((input) => basename(input)).join(", "),
  " * License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/",
  " */",
  "(function attachZipCenters(root) {",
  '  "use strict";',
  "  root.LFMM_ZIP_CENTERS = Object.freeze(" + JSON.stringify(centers) + ");",
  "})(typeof window !== \"undefined\" ? window : globalThis);",
  ""
].join("\n");

await writeFile(outputPath, output, "utf8");
console.log("Wrote " + grouped.size + " ZIP centers to " + outputPath);
