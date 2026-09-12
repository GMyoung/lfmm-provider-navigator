import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const css = readFileSync(`${repoRoot}/dist/styles.css`, "utf8");
const app = readFileSync(`${repoRoot}/dist/app.js`, "utf8");

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
}

function px(rule, property) {
  const match = rule.match(new RegExp(`${property}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`));
  assert.ok(match, `Missing pixel value for ${property}`);
  return Number(match[1]);
}

const marker = cssRule(".provider-marker");
const shape = cssRule(".provider-marker-shape");
const shapePath = cssRule(".provider-marker-shape path");
const label = cssRule(".provider-marker-label");

const markerWidth = px(marker, "width");
const markerHeight = px(marker, "height");

assert.equal(markerWidth, 32, "The slimmer marker should be 32px wide");
assert.equal(markerHeight, 42, "The slimmer marker should be 42px tall");
assert.doesNotMatch(label, /border-radius\s*:/, "The label must not use an inner circle");
assert.doesNotMatch(label, /background\s*:/, "The label must sit directly on the colored pin");
assert.doesNotMatch(label, /box-shadow\s*:/, "The label must not look like a badge");
assert.match(label, /fill\s*:\s*#fff\b/, "The direct label should use white text");
assert.match(label, /text-anchor\s*:\s*middle\b/, "The SVG label must be horizontally centered");
assert.match(label, /dominant-baseline\s*:\s*central\b/, "The SVG label must be vertically centered");
assert.match(shape, /inset\s*:\s*0\b/, "The SVG shape must use the full marker coordinate system");
assert.match(shapePath, /fill\s*:\s*var\(--marker/, "The SVG path must use the category color");
assert.match(shapePath, /stroke-width\s*:\s*1\.25\b/, "The pin outline should remain visually light");

assert.match(app, /<svg class="provider-marker-shape" viewBox="0 0 32 42"/, "Marker HTML must use the precise slim SVG");
assert.match(app, /<path d="M16 1\.5/, "The SVG pin path must start on the 16px centerline");
assert.match(app, /<text class="provider-marker-label" x="16" y="14\.5" text-anchor="middle" dominant-baseline="central">/, "The label must use the exact pin-head center");
assert.match(app, /iconSize\s*:\s*\[32,\s*42\]/, "Leaflet size must match the CSS marker box");
assert.match(app, /iconAnchor\s*:\s*\[16,\s*40\]/, "Leaflet anchor must land on the marker tip and centerline");
assert.match(app, /offset\s*:\s*\[0,\s*-32\]/, "Tooltip offset must follow the slimmer marker height");

console.log("Map marker geometry is slim, circle-free, and centered.");
