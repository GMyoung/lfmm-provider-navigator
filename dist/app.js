"use strict";

const source = window.LFMM_DATA || { roster: [], details: {} };
const locationUtils = window.LFMM_LOCATION_UTILS;
const DEMO_CODE = "1234";
const DEMO_SESSION_KEY = "lfmm_demo_unlocked_v1";
const REFERRAL_STORE_KEY = "lfmm_demo_referrals_v1";
const REFERRAL_STORE_VERSION = 1;
const RADIUS_OPTIONS = [25, 50, 100];
const STATUS_OPTIONS = ["Referral prepared", "Contact attempted", "Appointment requested", "Scheduled", "Needs follow-up", "Closed"];

const CATEGORY_CONFIG = {
  "Orthopedic": { label: "Orthopedic", symbol: "OR", color: "#087d74" },
  "Spine": { label: "Spine", symbol: "SP", color: "#6d4bd1" },
  "General Surgery": { label: "General surgery", symbol: "GS", color: "#b45b23" },
  "Podiatry": { label: "Podiatry", symbol: "PD", color: "#2563a7" },
  "Pain Management": { label: "Pain management", symbol: "PM", color: "#b23a63" },
  "Imaging": { label: "Imaging", symbol: "IM", color: "#088ca1" },
  "Vascular Access": { label: "Vascular", symbol: "VA", color: "#57647c" },
  "Gastroenterology": { label: "Gastro", symbol: "GI", color: "#3d7f4b" },
  "Urology": { label: "Urology", symbol: "UR", color: "#3d69a6" },
  "Gynecology": { label: "Gynecology", symbol: "GY", color: "#9a4f8e" },
  "Plastic Surgery": { label: "Plastic surgery", symbol: "PS", color: "#8c6343" },
  "Physical Therapy": { label: "Physical therapy", symbol: "PT", color: "#0b8f70" },
  "Chiropractic": { label: "Chiropractic", symbol: "CH", color: "#517b2d" },
  "Neurology": { label: "Neurology", symbol: "NE", color: "#3f55a5" },
  "Rehabilitation": { label: "Rehabilitation", symbol: "RE", color: "#82621e" },
  "Diagnostics": { label: "Diagnostics", symbol: "DX", color: "#16708a" }
};
const DEFAULT_CATEGORY = { label: "Other service", symbol: "MD", color: "#536b70" };

const $ = (selector, root) => (root || document).querySelector(selector);
const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/(^|[\s-])\S/g, (letter) => letter.toUpperCase());
}

function normalized(value) {
  return String(value == null ? "" : value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalized(value).replace(/\s+/g, "-");
}

function categoryFor(group) {
  return CATEGORY_CONFIG[group] || DEFAULT_CATEGORY;
}

function iconSvg(name, className) {
  return '<svg class="' + escapeHtml(className || "ui-icon") + '" aria-hidden="true"><use href="#icon-' + escapeHtml(name) + '"></use></svg>';
}

function serviceGroup(specialty) {
  const value = normalized(specialty);
  if (value.includes("neurospine") || value.includes("ortho spine")) return "Spine";
  if (value.includes("orthop")) return "Orthopedic";
  if (value.includes("podiatry")) return "Podiatry";
  if (value.includes("pain")) return "Pain Management";
  if (value.includes("interventional radiology")) return "Imaging";
  if (value.includes("general surgery")) return "General Surgery";
  if (value.includes("vascular")) return "Vascular Access";
  if (value.includes("gastro")) return "Gastroenterology";
  if (value.includes("urology")) return "Urology";
  if (value.includes("gynecology")) return "Gynecology";
  if (value.includes("plastic")) return "Plastic Surgery";
  return titleCase(specialty);
}

function specialtyLabel(specialty) {
  const exact = {
    "ORTHOPAEDIC": "Orthopedic",
    "ORTHOPEDIC": "Orthopedic",
    "ORTHO - HAND": "Orthopedic · Hand",
    "ORTHO-SPINE": "Orthopedic · Spine",
    "ORTHO - SPINE": "Orthopedic · Spine",
    "ANESTHESIA - PAIN": "Anesthesia · Pain",
    "GENERAL SURGERY / ACCESS": "General Surgery · Access"
  };
  return exact[specialty] || titleCase(specialty);
}

function facilityLabel(code) {
  return {
    "ALL": "All surgery centers",
    "FK-WD": "Fullerton Kimball / Western Diversey",
    "ASC": "Aiden Surgery Center"
  }[code] || code;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

const providers = source.roster.map((row) => {
  const last = row[0];
  const first = row[1];
  const specialty = row[2];
  const facility = row[3];
  const key = last + "|" + first;
  const detail = source.details[key] || null;
  const credentials = detail && detail.credentials ? ", " + detail.credentials : "";
  const group = serviceGroup(specialty);
  const aliases = [
    group === "Orthopedic" ? "ortho orthopaedic" : "",
    group === "Spine" ? "back neck neurospine" : "",
    group === "Podiatry" ? "foot ankle dpm" : "",
    group === "Imaging" ? "radiology xray x ray mri ct" : "",
    group === "Pain Management" ? "pain anesthesia" : ""
  ].join(" ");
  const rawStatus = detail && detail.status ? detail.status : (detail ? "Detailed" : "Roster only");
  return {
    id: slugify(first + "-" + last),
    key: key,
    name: titleCase(first) + " " + titleCase(last) + credentials,
    firstName: titleCase(first),
    lastName: titleCase(last),
    initials: (first[0] || "") + (last[0] || ""),
    sourceSpecialty: specialty,
    specialty: specialtyLabel(specialty),
    group: group,
    facility: facility,
    facilityLabel: facilityLabel(facility),
    detailed: Boolean(detail),
    rawStatus: rawStatus,
    recordStatus: rawStatus === "Pending" ? "Pending verification" : (detail ? "Verified detail" : "Needs verification"),
    practice: detail && detail.practice ? detail.practice : "Practice information to verify",
    bodyAreas: detail && detail.bodyAreas ? detail.bodyAreas : [],
    address: detail && detail.address ? detail.address : "Location information to verify",
    city: detail && detail.city ? detail.city : "Not mapped",
    zip: detail && detail.zip ? detail.zip : "",
    phone: detail && detail.phone ? detail.phone : "Not provided",
    fax: detail && detail.fax ? detail.fax : "Not provided",
    hours: detail && detail.hours ? detail.hours : "Not provided",
    caseRules: detail && detail.caseRules ? detail.caseRules : { wc: "unknown", pi: "unknown" },
    restrictions: detail && detail.restrictions ? detail.restrictions : [],
    languages: detail && detail.languages ? detail.languages : [],
    lat: detail && Number.isFinite(detail.lat) ? detail.lat : null,
    lng: detail && Number.isFinite(detail.lng) ? detail.lng : null,
    otherLocations: detail && detail.otherLocations ? detail.otherLocations : 0,
    aliases: aliases
  };
});

function mockProfile(provider) {
  const number = hashString(provider.id) % 90 + 10;
  const hours = ["Mon–Fri · 8:00 AM–4:30 PM", "Mon–Thu · 8:30 AM–5:00 PM", "Mon–Fri · 9:00 AM–5:00 PM"][number % 3];
  const windows = ["2–4 business days", "3–5 business days", "next-week review window"][number % 3];
  return {
    contact: ["Jordan Lee", "Alex Morgan", "Taylor Brooks"][number % 3] + " (Demo)",
    referralEmail: "referrals." + provider.id + "@example.com",
    recordsEmail: "records." + provider.id + "@example.com",
    billingEmail: "billing." + provider.id + "@example.com",
    phone: "(312) 555-01" + String(number).padStart(2, "0"),
    fax: "(312) 555-02" + String(number).padStart(2, "0"),
    hours: hours,
    availability: windows
  };
}

function safeSessionRead() {
  try {
    return sessionStorage.getItem(DEMO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

const state = {
  query: "",
  location: "",
  locationMode: "none",
  specialty: "all",
  body: "all",
  caseType: "all",
  sort: "recommended",
  selectedId: null,
  detailedOnly: false,
  mappedOnly: false,
  facility: "all",
  excludePending: false,
  radius: 25,
  effectiveRadius: 25,
  radiusExpanded: false,
  origin: null,
  mapBounds: null,
  locationMessage: "",
  locationMessageKind: "info",
  demoUnlocked: safeSessionRead(),
  lastMatches: []
};

const trackingState = { query: "", status: "all", date: "" };
let referralDraft = null;
let savedReferral = null;
let map;
let markerGroups = new Map();
let originLayer = null;
let suppressMoveNotice = false;
let lastFocusedElement = null;
let toastTimer = null;

const list = $("#provider-list");
const count = $("#result-count");
const emptyState = $("#empty-state");
const searchInput = $("#provider-search");
const locationInput = $("#location-search");
const specialtySelect = $("#specialty-filter");
const bodySelect = $("#body-filter");
const sortSelect = $("#sort-select");
const detailSheet = $("#detail-sheet");
const filterSheet = $("#filter-sheet");
const workflowSheet = $("#workflow-sheet");
const trackingSheet = $("#tracking-sheet");
const detailContent = $("#detail-content");
const workflowContent = $("#workflow-content");
const trackingContent = $("#tracking-content");
const scrim = $("#scrim");
const moreFilterButton = $("#more-filter");
const accessDialog = $("#access-dialog");

const synonymMap = {
  "ortho": "orthopedic",
  "orthopaedic": "orthopedic",
  "back": "spine",
  "neck": "spine",
  "wrist": "hand",
  "dpm": "podiatry",
  "podiatrist": "podiatry",
  "xray": "radiology",
  "x-ray": "radiology",
  "nerve": "emg",
  "pt": "physical therapy"
};

function queryTerms(value) {
  return normalized(value).split(" ").filter(Boolean).map((term) => synonymMap[term] || term);
}

function setupFilters() {
  const availableGroups = Array.from(new Set(providers.map((provider) => provider.group))).sort();
  const futureGroups = ["Physical Therapy", "Chiropractic", "Neurology", "Rehabilitation", "Diagnostics"];
  const options = ["all"].concat(availableGroups, futureGroups.filter((item) => !availableGroups.includes(item)));
  specialtySelect.innerHTML = options.map((value) => (
    '<option value="' + escapeHtml(value) + '">' + (value === "all" ? "All specialties & services" : escapeHtml(value)) + "</option>"
  )).join("");

  const bodyAreas = Array.from(new Set(Object.values(source.details).flatMap((detail) => detail.bodyAreas || []))).sort();
  bodySelect.innerHTML = ["all"].concat(bodyAreas).map((value) => (
    '<option value="' + escapeHtml(value) + '">' + (value === "all" ? "Any body area" : escapeHtml(value)) + "</option>"
  )).join("");
}

function caseMatches(provider) {
  if (state.caseType === "all") return true;
  if (state.caseType === "Workers’ Comp") return provider.caseRules.wc !== "no";
  if (state.caseType === "Personal Injury") return provider.caseRules.pi !== "no";
  return true;
}

function insideStoredBounds(provider) {
  if (!state.mapBounds || provider.lat === null) return !state.mapBounds;
  const bounds = state.mapBounds;
  const insideLatitude = provider.lat >= bounds.south && provider.lat <= bounds.north;
  const insideLongitude = bounds.west <= bounds.east
    ? provider.lng >= bounds.west && provider.lng <= bounds.east
    : provider.lng >= bounds.west || provider.lng <= bounds.east;
  return insideLatitude && insideLongitude;
}

function baseMatches(provider) {
  const terms = queryTerms(state.query);
  const locationTerms = state.locationMode === "text" ? queryTerms(state.location) : [];
  const haystack = normalized([
    provider.name,
    provider.specialty,
    provider.group,
    provider.practice,
    provider.address,
    provider.city,
    provider.zip,
    provider.bodyAreas.join(" "),
    provider.facilityLabel,
    provider.aliases
  ].join(" "));
  const locationHaystack = normalized(provider.address + " " + provider.city + " " + provider.zip);
  const matchesQuery = terms.every((term) => haystack.includes(term));
  const matchesLocation = locationTerms.every((term) => locationHaystack.includes(term));
  const matchesSpecialty = state.specialty === "all" || provider.group === state.specialty;
  const matchesBody = state.body === "all" || provider.bodyAreas.some((area) => normalized(area) === normalized(state.body));
  const matchesFacility = state.facility === "all" || provider.facility === state.facility;
  const matchesCoverage = (!state.detailedOnly || provider.detailed) && (!state.mappedOnly || provider.lat !== null);
  const matchesStatus = !state.excludePending || provider.rawStatus !== "Pending";
  return matchesQuery
    && matchesLocation
    && matchesSpecialty
    && matchesBody
    && matchesFacility
    && matchesCoverage
    && matchesStatus
    && caseMatches(provider)
    && insideStoredBounds(provider);
}

function sortProviders(items) {
  return items.sort((left, right) => {
    if (state.sort === "distance") {
      const leftDistance = Number.isFinite(left.distance) ? left.distance : Number.POSITIVE_INFINITY;
      const rightDistance = Number.isFinite(right.distance) ? right.distance : Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance || left.lastName.localeCompare(right.lastName);
    }
    if (state.sort === "name") return left.lastName.localeCompare(right.lastName) || left.firstName.localeCompare(right.firstName);
    if (state.sort === "city") return left.city.localeCompare(right.city) || left.lastName.localeCompare(right.lastName);
    if (left.rawStatus !== right.rawStatus && (left.rawStatus === "Pending" || right.rawStatus === "Pending")) return left.rawStatus === "Pending" ? 1 : -1;
    if (left.detailed !== right.detailed) return left.detailed ? -1 : 1;
    return left.lastName.localeCompare(right.lastName);
  });
}

function computeResults() {
  let candidates = providers.filter(baseMatches).map((provider) => {
    const distance = state.origin && provider.lat !== null
      ? locationUtils.haversineMiles(state.origin.lat, state.origin.lng, provider.lat, provider.lng)
      : null;
    return Object.assign({}, provider, { distance: distance });
  });
  state.effectiveRadius = state.radius;
  state.radiusExpanded = false;

  if (state.origin) {
    candidates = candidates.filter((provider) => provider.lat !== null);
    if (!state.mapBounds) {
      const availableRadii = RADIUS_OPTIONS.filter((radius) => radius >= state.radius);
      let chosenRadius = availableRadii[availableRadii.length - 1] || state.radius;
      let radiusMatches = [];
      for (const radius of availableRadii) {
        const within = candidates.filter((provider) => provider.distance <= radius);
        if (within.length) {
          chosenRadius = radius;
          radiusMatches = within;
          break;
        }
      }
      state.effectiveRadius = chosenRadius;
      state.radiusExpanded = chosenRadius > state.radius;
      candidates = radiusMatches;
    } else {
      candidates = candidates.filter((provider) => provider.distance <= state.radius);
    }
  }

  return sortProviders(candidates);
}

function ruleBadge(rule, shortLabel) {
  if (rule === "yes") return '<span class="badge teal">' + escapeHtml(shortLabel) + " confirmed</span>";
  if (rule === "no") return '<span class="badge danger">No ' + escapeHtml(shortLabel) + "</span>";
  return "";
}

function cardTemplate(provider) {
  const category = categoryFor(provider.group);
  const statusClass = provider.rawStatus === "Pending" ? "warn" : (provider.detailed ? "teal" : "roster");
  const locationLine = provider.detailed
    ? "<strong>" + escapeHtml(provider.city) + "</strong> · " + escapeHtml(provider.practice)
    : escapeHtml(provider.facilityLabel) + " · Details needed";
  const distance = Number.isFinite(provider.distance)
    ? '<p class="distance-line">' + provider.distance.toFixed(provider.distance < 10 ? 1 : 0) + " miles from " + escapeHtml(state.origin.label) + "</p>"
    : "";
  const mock = state.demoUnlocked ? mockProfile(provider) : null;
  const mockBadge = mock
    ? '<span class="mock-badge">Mock · ' + escapeHtml(mock.availability) + "</span>"
    : "";
  return [
    '<button class="provider-card ', provider.detailed ? "" : "roster-only", state.selectedId === provider.id ? " selected" : "",
    '" style="--category:', category.color, '" type="button" data-provider-id="', escapeHtml(provider.id), '">',
    '<span class="provider-avatar" aria-hidden="true">', escapeHtml(category.symbol), "</span>",
    "<span>",
    '<p class="provider-type">', escapeHtml(category.label), "</p>",
    '<h2 class="provider-name">', escapeHtml(provider.name), "</h2>",
    '<p class="provider-specialty">', escapeHtml(provider.specialty), "</p>",
    '<p class="provider-location">', locationLine, "</p>",
    distance,
    '<span class="badges">',
    '<span class="badge ', statusClass, '">', escapeHtml(provider.recordStatus), "</span>",
    '<span class="badge">', escapeHtml(provider.facility), "</span>",
    ruleBadge(provider.caseRules.wc, "WC"),
    ruleBadge(provider.caseRules.pi, "PI"),
    provider.bodyAreas.slice(0, 2).map((area) => '<span class="badge">' + escapeHtml(area) + "</span>").join(""),
    mockBadge,
    "</span></span>",
    '<span class="card-arrow" aria-hidden="true">', iconSvg("chevron-right"), "</span>",
    "</button>"
  ].join("");
}

function activeFilterCount() {
  return [
    state.detailedOnly,
    state.mappedOnly,
    state.facility !== "all",
    state.excludePending,
    state.caseType !== "all",
    state.radius !== 25
  ].filter(Boolean).length;
}

function updateFilterUi() {
  $("#advanced-count").textContent = activeFilterCount();
  $("#quick-detailed").classList.toggle("active", state.detailedOnly);
  $("#quick-detailed").setAttribute("aria-pressed", String(state.detailedOnly));
  $("#quick-mapped").classList.toggle("active", state.mappedOnly);
  $("#quick-mapped").setAttribute("aria-pressed", String(state.mappedOnly));
  $("#specialty-label").textContent = specialtySelect.options[specialtySelect.selectedIndex].text;
  $("#body-label").textContent = bodySelect.options[bodySelect.selectedIndex].text;
}

function updateFilterSummary(matches) {
  const mapped = matches.filter((provider) => provider.lat !== null).length;
  const detailed = matches.filter((provider) => provider.detailed).length;
  const pieces = [
    "<span>" + matches.length + " matching listings</span>",
    "<span>" + detailed + " verified details</span>",
    "<span>" + mapped + " mapped locations</span>"
  ];
  if (state.origin) {
    pieces.push('<span class="distance-summary">' + state.effectiveRadius + " mi around " + escapeHtml(state.origin.label) + "</span>");
  }
  if (state.caseType !== "all") pieces.push("<span>" + escapeHtml(state.caseType) + ": unknown eligibility may appear</span>");
  $("#active-summary").innerHTML = pieces.join("");
}

function updateLocationNotice() {
  const notice = $("#location-notice");
  let message = state.locationMessage;
  let kind = state.locationMessageKind;
  if (state.origin) {
    message = "Showing mapped providers within " + state.effectiveRadius + " miles of " + state.origin.label + ".";
    if (state.radiusExpanded) message += " No matches were found at " + state.radius + " miles, so the radius expanded automatically.";
    kind = "info";
  }
  notice.hidden = !message;
  notice.classList.toggle("warning", kind === "warning");
  notice.textContent = message;
}

function render() {
  const matches = computeResults();
  state.lastMatches = matches;
  count.textContent = matches.length;
  list.innerHTML = matches.map(cardTemplate).join("");
  emptyState.hidden = matches.length > 0;
  list.hidden = matches.length === 0;
  if (!matches.length) {
    const missingCategory = ["Physical Therapy", "Chiropractic", "Neurology", "Rehabilitation", "Diagnostics"].includes(state.specialty);
    emptyState.querySelector("h2").textContent = missingCategory ? "No verified listings yet" : "No exact matches";
    emptyState.querySelector("p").textContent = missingCategory
      ? state.specialty + " is part of the directory design, but no verified source records have been supplied yet."
      : (state.origin ? "Try a larger radius, another specialty, or clear the map-area filter." : "Try another body area, case type, surgery center, city, or ZIP.");
  }
  $("#area-filter-banner").hidden = !state.mapBounds;
  updateFilterSummary(matches);
  updateFilterUi();
  updateLocationNotice();
  updateDemoUi();
  renderMarkers(matches);
}

function initMap() {
  if (!window.L) {
    $("#map-status").textContent = "Map could not load · list search is still available";
    return;
  }
  map = L.map("map", { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([41.86, -87.85], 9);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  map.on("movestart", () => {
    if (!suppressMoveNotice) $("#map-research").classList.add("visible");
  });
}

function markerCategory(group) {
  const categories = Array.from(new Set(group.map((provider) => provider.group)));
  if (categories.length === 1) {
    const config = categoryFor(categories[0]);
    return {
      label: config.label,
      color: config.color,
      symbol: group.length > 1 ? String(group.length) : config.symbol
    };
  }
  return { label: "Multiple services", color: "#153a52", symbol: String(group.length) };
}

function markerIcon(group, selected) {
  const config = markerCategory(group);
  return L.divIcon({
    className: "marker-shell",
    html: '<div class="provider-marker' + (selected ? " selected" : "") + '" style="--marker:' + config.color + '"><span>' + escapeHtml(config.symbol) + "</span></div>",
    iconSize: [38, 46],
    iconAnchor: [19, 44]
  });
}

function renderOrigin() {
  if (!map) return;
  if (originLayer) originLayer.remove();
  originLayer = null;
  if (!state.origin) return;
  const center = [state.origin.lat, state.origin.lng];
  const radiusMeters = state.effectiveRadius * 1609.344;
  const pointIcon = L.divIcon({ className: "marker-shell", html: '<div class="origin-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
  originLayer = L.layerGroup([
    L.circle(center, {
      radius: radiusMeters,
      color: "#153a52",
      weight: 1,
      opacity: .42,
      fillColor: "#153a52",
      fillOpacity: .045,
      interactive: false
    }),
    L.marker(center, { icon: pointIcon, title: state.origin.label, keyboard: false, interactive: false })
  ]).addTo(map);
}

function renderLegend(matches) {
  const configs = [];
  const seen = new Set();
  matches.filter((provider) => provider.lat !== null).forEach((provider) => {
    if (!seen.has(provider.group)) {
      seen.add(provider.group);
      configs.push(categoryFor(provider.group));
    }
  });
  $("#map-legend").innerHTML = configs.slice(0, 7).map((config) => (
    '<span><i class="legend-dot" style="--legend:' + config.color + '"></i>' + escapeHtml(config.label) + "</span>"
  )).join("") + (configs.length > 7 ? "<span>+" + (configs.length - 7) + " more</span>" : "");
  $("#map-legend").hidden = configs.length === 0;
}

function renderMarkers(matches) {
  if (!map) return;
  markerGroups.forEach((entry) => entry.marker.remove());
  markerGroups.clear();
  renderOrigin();
  const grouped = new Map();
  matches.filter((provider) => provider.lat !== null).forEach((provider) => {
    const key = provider.lat.toFixed(5) + "|" + provider.lng.toFixed(5);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(provider);
  });
  grouped.forEach((group) => {
    const selected = group.some((provider) => provider.id === state.selectedId);
    const marker = L.marker([group[0].lat, group[0].lng], {
      icon: markerIcon(group, selected),
      title: group.length === 1 ? group[0].name : group.length + " providers at this location",
      keyboard: true
    }).addTo(map);
    marker.on("click", () => selectProvider(group[0].id, true));
    const tooltipNames = group.slice(0, 4).map((provider) => escapeHtml(provider.name)).join("<br>");
    marker.bindTooltip(tooltipNames + (group.length > 4 ? "<br>+" + (group.length - 4) + " more" : ""), { direction: "top", offset: [0, -36] });
    group.forEach((provider) => markerGroups.set(provider.id, { marker: marker, group: group }));
  });
  const mappedCount = matches.filter((provider) => provider.lat !== null).length;
  $("#map-status").innerHTML = '<span class="pulse-dot"></span>' + mappedCount + " mapped · " + (matches.length - mappedCount) + " list-only";
  renderLegend(matches);
}

function caseRuleLabel(rule) {
  return { "yes": "Confirmed in source", "no": "Not accepted", "unknown": "Not documented — verify" }[rule] || "Verify";
}

function detailTemplate(provider) {
  const category = categoryFor(provider.group);
  const mock = mockProfile(provider);
  const mapsUrl = provider.lat !== null
    ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(provider.address)
    : "#";
  const phoneUrl = provider.phone !== "Not provided" ? "tel:" + provider.phone.replace(/[^\d+]/g, "") : "#";
  const restrictions = provider.restrictions.length
    ? '<ul class="restriction-list">' + provider.restrictions.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>"
    : '<p class="provider-location">No special restrictions were documented in the supplied profile.</p>';
  const displayHours = provider.hours !== "Not provided"
    ? escapeHtml(provider.hours)
    : (state.demoUnlocked ? escapeHtml(mock.hours) + ' <span class="mock-badge">Mock data</span>' : "Not provided");
  const internalSection = state.demoUnlocked
    ? [
      '<section class="detail-section"><h3>Demo workflow contacts <span class="mock-badge">Mock data only</span></h3>',
      '<div class="contact-list">',
      '<div class="contact-row mock"><span>Referral / new patient</span><strong>', escapeHtml(mock.contact), " · ", escapeHtml(mock.referralEmail), "</strong></div>",
      '<div class="contact-row mock"><span>Records request</span><strong>', escapeHtml(mock.recordsEmail), "</strong></div>",
      '<div class="contact-row mock"><span>Billing request</span><strong>', escapeHtml(mock.billingEmail), "</strong></div>",
      '<div class="contact-row mock"><span>Demo phone / fax</span><strong>', escapeHtml(mock.phone), " · ", escapeHtml(mock.fax), "</strong></div>",
      "</div>",
      '<div class="detail-item" style="margin-top:10px"><span>New-patient availability</span><strong>', escapeHtml(mock.availability), ' <span class="mock-badge">Mock data</span></strong></div>',
      "</section>"
    ].join("")
    : [
      '<section class="detail-section"><h3>Internal workflow preview</h3>',
      '<div class="locked-panel"><p>Open demo mode to preview fictional referral, records, billing, and availability fields. This is a UI demonstration—not secure access.</p>',
      '<button type="button" data-action="unlock-demo">Open demo</button></div></section>'
    ].join("");
  const referAction = state.demoUnlocked
    ? '<button class="primary-button violet" type="button" data-action="refer" data-provider-id="' + escapeHtml(provider.id) + '">Prepare mock referral</button>'
    : "";
  const statusClass = provider.rawStatus === "Pending" ? "warn" : (provider.detailed ? "teal" : "roster");
  return [
    '<section class="detail-hero" style="--category:', category.color, '">',
    '<div class="detail-category"><span class="detail-category-mark" aria-hidden="true">', escapeHtml(category.symbol), '</span><p class="detail-kicker">', escapeHtml(category.label), "</p></div>",
    "<h2>", escapeHtml(provider.name), "</h2>",
    '<p class="detail-subtitle">', escapeHtml(provider.specialty), " · ", escapeHtml(provider.practice), "</p>",
    '<div class="badges"><span class="badge ', statusClass, '">', escapeHtml(provider.recordStatus), '</span><span class="badge">', escapeHtml(provider.facilityLabel), "</span></div>",
    "</section>",
    '<section class="detail-section"><h3>Location & access</h3><div class="detail-grid">',
    '<div class="detail-item"><span>Primary location</span><strong>', escapeHtml(provider.city), "</strong></div>",
    '<div class="detail-item"><span>Surgery access</span><strong>', escapeHtml(provider.facilityLabel), "</strong></div>",
    '<div class="detail-item"><span>Additional locations</span><strong>', escapeHtml(provider.otherLocations || "None documented"), "</strong></div>",
    '<div class="detail-item"><span>Office hours</span><strong>', displayHours, "</strong></div>",
    '</div><p class="provider-location" style="margin-top:12px">', escapeHtml(provider.address), "</p></section>",
    '<section class="detail-section"><h3>Clinical match</h3><div class="badges">',
    provider.bodyAreas.length ? provider.bodyAreas.map((area) => '<span class="badge">' + escapeHtml(area) + "</span>").join("") : '<span class="badge roster">Body-area details not supplied</span>',
    "</div></section>",
    '<section class="detail-section"><h3>Case eligibility</h3><div class="detail-grid">',
    '<div class="detail-item"><span>Workers’ Comp</span><strong>', escapeHtml(caseRuleLabel(provider.caseRules.wc)), "</strong></div>",
    '<div class="detail-item"><span>Personal Injury</span><strong>', escapeHtml(caseRuleLabel(provider.caseRules.pi)), "</strong></div>",
    "</div></section>",
    '<section class="detail-section"><h3>Public office contact</h3><div class="contact-list">',
    '<div class="contact-row"><span>Phone</span><strong>', escapeHtml(provider.phone), "</strong></div>",
    '<div class="contact-row"><span>Fax</span><strong>', escapeHtml(provider.fax), "</strong></div>",
    "</div></section>",
    internalSection,
    '<section class="detail-section"><h3>Important notes</h3>', restrictions,
    '<p class="verification-note">Directory data comes from the supplied provider files. Verify availability, case acceptance, hours, and contact details before referral. Roster date: August 28, 2026.</p></section>',
    '<div class="sheet-actions">',
    '<a class="', provider.lat === null ? "disabled" : "", '" href="', mapsUrl, '" target="_blank" rel="noreferrer">Directions</a>',
    '<a class="', provider.phone === "Not provided" ? "disabled" : "", '" href="', phoneUrl, '">Call office</a>',
    referAction,
    "</div>"
  ].join("");
}

function focusProviderOnMap(provider) {
  if (!map || provider.lat === null) return;
  suppressMoveNotice = true;
  map.panTo([provider.lat, provider.lng], { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches, duration: .22 });
  window.setTimeout(() => { suppressMoveNotice = false; }, 300);
}

function selectProvider(id, openSheet) {
  const provider = providers.find((item) => item.id === id);
  if (!provider) return;
  state.selectedId = id;
  focusProviderOnMap(provider);
  render();
  if (openSheet) openDetails(provider);
}

function openPanel(panel) {
  const activeElement = document.activeElement;
  const selectedCard = state.selectedId ? $('[data-provider-id="' + state.selectedId + '"]', list) : null;
  lastFocusedElement = activeElement && activeElement.closest && activeElement.closest(".side-sheet")
    ? (selectedCard || $(".brand"))
    : activeElement;
  $$(".side-sheet.open").forEach((item) => {
    item.classList.remove("open");
    item.setAttribute("aria-hidden", "true");
  });
  scrim.hidden = false;
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  if (panel !== filterSheet) moreFilterButton.setAttribute("aria-expanded", "false");
  window.setTimeout(() => {
    const focusable = panel.querySelector("button, a, input, select, textarea");
    if (focusable) focusable.focus({ preventScroll: true });
  }, 20);
}

function openDetails(provider) {
  detailContent.innerHTML = detailTemplate(provider);
  openPanel(detailSheet);
}

function openHelp() {
  detailContent.innerHTML = [
    '<div class="detail-hero"><p class="detail-kicker">QUICK GUIDE</p><h2>Find the right provider</h2>',
    '<p class="detail-subtitle">Search broadly, then narrow by clinical fit, case rules, coverage, and distance.</p></div>',
    '<section class="detail-section"><h3>Recommended workflow</h3><ol class="guide-list">',
    "<li>Search a provider, specialty, service, practice, city, or ZIP.</li>",
    "<li>Select a known city/ZIP—or use your browser location—to calculate distance without a geocoding API.</li>",
    "<li>Choose specialty and body area. Open More filters for case type, facility, profile status, and 25/50/100-mile radius.</li>",
    "<li>Move the map and choose Search this area to filter the list to the visible bounds.</li>",
    "<li>Open a provider to verify office details, eligibility, restrictions, directions, and public phone/fax.</li>",
    "</ol></section>",
    '<section class="detail-section"><h3>Map & data signals</h3><div class="detail-grid">',
    '<div class="detail-item"><span>Colored map pin</span><strong>The center circle shows category initials; a number means multiple providers share the location</strong></div>',
    '<div class="detail-item"><span>Verified detail</span><strong>Source packet includes office and case information</strong></div>',
    '<div class="detail-item"><span>Needs verification</span><strong>Provider appears on a facility roster without a full profile</strong></div>',
    '<div class="detail-item"><span>Mock data</span><strong>Fictional, browser-only content visible in demo mode</strong></div>',
    "</div></section>",
    '<section class="detail-section"><h3>Demo mode boundary</h3>',
    '<p class="demo-warning"><strong>The access code is not security.</strong> Demo mode shows only fabricated contacts and saves synthetic referrals in this browser. Never enter patient information.</p>',
    '<p class="verification-note">Arbitrary street-address geocoding, real sign-in, email delivery, shared records, audit logs, and secure patient workflows require a backend and approved services.</p></section>'
  ].join("");
  openPanel(detailSheet);
}

function openFilters() {
  $("#detailed-only").checked = state.detailedOnly;
  $("#mapped-only").checked = state.mappedOnly;
  $("#exclude-pending").checked = state.excludePending;
  $('input[name="facility"][value="' + state.facility + '"]').checked = true;
  $('input[name="radius"][value="' + state.radius + '"]').checked = true;
  $('input[name="case-type"][value="' + state.caseType + '"]').checked = true;
  moreFilterButton.setAttribute("aria-expanded", "true");
  openPanel(filterSheet);
}

function closePanels() {
  $$(".side-sheet").forEach((panel) => {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  });
  moreFilterButton.setAttribute("aria-expanded", "false");
  window.setTimeout(() => { scrim.hidden = true; }, 220);
  if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus({ preventScroll: true });
}

function resetAdvancedControls() {
  $("#detailed-only").checked = false;
  $("#mapped-only").checked = false;
  $("#exclude-pending").checked = false;
  $('input[name="facility"][value="all"]').checked = true;
  $('input[name="radius"][value="25"]').checked = true;
  $('input[name="case-type"][value="all"]').checked = true;
}

function applyAdvancedFilters() {
  state.detailedOnly = $("#detailed-only").checked;
  state.mappedOnly = $("#mapped-only").checked;
  state.excludePending = $("#exclude-pending").checked;
  state.facility = $('input[name="facility"]:checked').value;
  state.radius = Number($('input[name="radius"]:checked').value);
  state.caseType = $('input[name="case-type"]:checked').value;
  closePanels();
  render();
}

function resetFilters() {
  Object.assign(state, {
    query: "",
    location: "",
    locationMode: "none",
    specialty: "all",
    body: "all",
    caseType: "all",
    sort: "recommended",
    selectedId: null,
    detailedOnly: false,
    mappedOnly: false,
    facility: "all",
    excludePending: false,
    radius: 25,
    effectiveRadius: 25,
    radiusExpanded: false,
    origin: null,
    mapBounds: null,
    locationMessage: "",
    locationMessageKind: "info"
  });
  searchInput.value = "";
  locationInput.value = "";
  specialtySelect.value = "all";
  bodySelect.value = "all";
  sortSelect.value = "recommended";
  resetAdvancedControls();
  $("#map-research").classList.remove("visible");
  render();
  focusCurrentMatches();
}

function focusCurrentMatches() {
  if (!map) return;
  const matches = state.lastMatches.filter((provider) => provider.lat !== null);
  if (!matches.length && !state.origin) return;
  suppressMoveNotice = true;
  const points = matches.map((provider) => [provider.lat, provider.lng]);
  if (state.origin) points.push([state.origin.lat, state.origin.lng]);
  if (points.length === 1) map.setView(points[0], 11, { animate: false });
  else map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 12, animate: false });
  window.setTimeout(() => { suppressMoveNotice = false; }, 140);
  $("#map-research").classList.remove("visible");
}

function performSearch() {
  state.query = searchInput.value.trim();
  state.location = locationInput.value.trim();
  state.mapBounds = null;
  state.locationMessage = "";
  const preserveBrowserOrigin = state.origin
    && state.origin.source === "browser"
    && normalized(state.location) === "current location";
  const resolution = preserveBrowserOrigin
    ? { mode: "origin", origin: state.origin }
    : locationUtils.resolveLocationSearch(state.location, providers);
  state.locationMode = resolution.mode;
  if (resolution.origin) {
    state.origin = resolution.origin;
    state.sort = "distance";
    sortSelect.value = "distance";
  } else {
    state.origin = null;
    if (state.location) {
      if (resolution.mode === "text") {
        state.locationMessage = "Showing providers whose saved directory address matches this location.";
        state.locationMessageKind = "info";
      } else {
        state.locationMessage = "This location is not in the offline map index yet. All providers remain visible so your other filters still work; try a listed city/ZIP or your current location for distance results.";
        state.locationMessageKind = "warning";
      }
    }
  }
  render();
  focusCurrentMatches();
}

function useCurrentLocation() {
  const button = $("#use-location");
  if (!navigator.geolocation) {
    state.locationMessage = "This browser does not provide location access. Search an exact city or ZIP instead.";
    state.locationMessageKind = "warning";
    state.origin = null;
    state.locationMode = "none";
    render();
    return;
  }
  button.classList.add("loading");
  button.disabled = true;
  state.locationMessage = "Requesting your browser location…";
  state.locationMessageKind = "info";
  updateLocationNotice();
  navigator.geolocation.getCurrentPosition((position) => {
    state.origin = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      label: "your current location",
      source: "browser"
    };
    state.locationMode = "origin";
    state.location = "";
    state.mapBounds = null;
    state.sort = "distance";
    state.locationMessage = "";
    locationInput.value = "Current location";
    sortSelect.value = "distance";
    button.classList.remove("loading");
    button.disabled = false;
    render();
    focusCurrentMatches();
  }, () => {
    state.origin = null;
    state.locationMode = "none";
    state.locationMessage = "Location was unavailable or denied. Search an exact listed city or ZIP instead.";
    state.locationMessageKind = "warning";
    button.classList.remove("loading");
    button.disabled = false;
    render();
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

function showToast(message) {
  const toast = $("#toast");
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2800);
}

function updateDemoUi() {
  document.body.classList.toggle("demo-mode", state.demoUnlocked);
  $("#demo-banner").hidden = !state.demoUnlocked;
  $("#tracking-button").hidden = !state.demoUnlocked;
  $("#demo-access-label").textContent = state.demoUnlocked ? "Demo on" : "Open demo";
  $("#demo-access-button").setAttribute("aria-label", state.demoUnlocked ? "Open mock referral tracking" : "Open workflow demo");
  $("#tracking-count").textContent = state.demoUnlocked ? loadReferrals().length : "0";
}

function openAccessDialog() {
  $("#access-code").value = "";
  $("#access-error").textContent = "";
  if (typeof accessDialog.showModal === "function") {
    accessDialog.showModal();
    window.setTimeout(() => $("#access-code").focus(), 20);
  }
}

function setDemoUnlocked(unlocked) {
  state.demoUnlocked = unlocked;
  try {
    if (unlocked) sessionStorage.setItem(DEMO_SESSION_KEY, "true");
    else sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // The demo still works for the current page even when storage is blocked.
  }
  if (unlocked) ensureDemoReferrals();
  else {
    if (workflowSheet.classList.contains("open") || trackingSheet.classList.contains("open")) closePanels();
    referralDraft = null;
    savedReferral = null;
  }
  render();
  if (state.selectedId && detailSheet.classList.contains("open")) {
    const provider = providers.find((item) => item.id === state.selectedId);
    if (provider) detailContent.innerHTML = detailTemplate(provider);
  }
}

function defaultDemoReferrals() {
  const detailed = providers.filter((provider) => provider.detailed);
  const first = detailed[0] || providers[0];
  const second = detailed[5] || providers[1] || first;
  const third = detailed[10] || providers[2] || first;
  return [
    {
      id: "DEMO-SAMPLE-1001",
      patientAlias: "Demo Patient A",
      providerId: first.id,
      providerName: first.name,
      bodyArea: first.bodyAreas[0] || "Knee",
      accidentDate: "2026-08-14",
      caseType: "Workers’ Comp",
      lawFirm: "Sample Law Group",
      contactName: "Alex Demo",
      contactEmail: "alex.demo@example.com",
      contactPhone: "(312) 555-0101",
      urgency: "Standard",
      notes: "Synthetic sample. Confirm office availability.",
      status: "Scheduled",
      createdAt: "2026-09-08T15:30:00.000Z",
      sample: true
    },
    {
      id: "DEMO-SAMPLE-1002",
      patientAlias: "Demo Patient B",
      providerId: second.id,
      providerName: second.name,
      bodyArea: second.bodyAreas[0] || "Spine",
      accidentDate: "2026-08-21",
      caseType: "Personal Injury",
      lawFirm: "Example Legal Partners",
      contactName: "Jordan Demo",
      contactEmail: "jordan.demo@example.com",
      contactPhone: "(312) 555-0102",
      urgency: "Standard",
      notes: "Synthetic sample awaiting a callback.",
      status: "Appointment requested",
      createdAt: "2026-09-09T16:10:00.000Z",
      sample: true
    },
    {
      id: "DEMO-SAMPLE-1003",
      patientAlias: "Demo Patient C",
      providerId: third.id,
      providerName: third.name,
      bodyArea: third.bodyAreas[0] || "Shoulder",
      accidentDate: "2026-08-29",
      caseType: "Workers’ Comp",
      lawFirm: "Demo Counsel LLC",
      contactName: "Taylor Demo",
      contactEmail: "taylor.demo@example.com",
      contactPhone: "(312) 555-0103",
      urgency: "Priority",
      notes: "Synthetic sample needs benefit clarification.",
      status: "Needs follow-up",
      createdAt: "2026-09-10T14:20:00.000Z",
      sample: true
    }
  ];
}

function loadReferrals() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REFERRAL_STORE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReferrals(records) {
  const payload = records.map((record) => Object.assign({ storeVersion: REFERRAL_STORE_VERSION }, record));
  localStorage.setItem(REFERRAL_STORE_KEY, JSON.stringify(payload));
}

function ensureDemoReferrals() {
  try {
    if (!localStorage.getItem(REFERRAL_STORE_KEY)) writeReferrals(defaultDemoReferrals());
  } catch {
    showToast("Browser storage is unavailable; tracking will not persist.");
  }
}

function bodyAreaOptions(provider, selected) {
  const areas = Array.from(new Set(provider.bodyAreas.concat(
    Object.values(source.details).flatMap((detail) => detail.bodyAreas || []),
    ["Other / not listed"]
  ))).sort();
  return areas.map((area) => '<option value="' + escapeHtml(area) + '"' + (area === selected ? " selected" : "") + ">" + escapeHtml(area) + "</option>").join("");
}

function workflowHeader(provider, step) {
  const stepNames = ["Referral details", "Review", "Saved locally"];
  return [
    '<div class="workflow-head"><p class="detail-kicker">MOCK REFERRAL WORKFLOW</p><h2>', escapeHtml(provider.name), '</h2>',
    '<p>', escapeHtml(provider.specialty), " · ", escapeHtml(provider.practice), "</p></div>",
    '<div class="stepper">',
    stepNames.map((name, index) => '<span class="step' + (index === step ? " active" : "") + '">' + (index + 1) + ". " + name + "</span>").join(""),
    "</div>",
    '<div class="demo-warning"><strong>Mock data only. Do not enter a real patient name, date of birth, claim number, medical history, or other PHI.</strong>',
    "Nothing is transmitted. Saving writes only to this browser.</div>"
  ].join("");
}

function blankReferral(provider) {
  return {
    providerId: provider.id,
    providerName: provider.name,
    patientAlias: "",
    bodyArea: provider.bodyAreas[0] || "",
    accidentDate: "",
    caseType: state.caseType === "all" ? "Workers’ Comp" : state.caseType,
    lawFirm: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    urgency: "Standard",
    notes: ""
  };
}

function renderReferralEdit(errorMessage) {
  const provider = providers.find((item) => item.id === referralDraft.providerId);
  const draft = referralDraft;
  workflowContent.innerHTML = [
    workflowHeader(provider, 0),
    '<button class="sample-fill" type="button" data-action="fill-sample">Fill with synthetic sample values</button>',
    errorMessage ? '<p class="form-error">' + escapeHtml(errorMessage) + "</p>" : "",
    '<form id="referral-form" class="form-grid">',
    '<label class="form-field"><span>Patient initials / demo alias *</span><input name="patientAlias" value="', escapeHtml(draft.patientAlias), '" placeholder="Demo Patient D" maxlength="60" required /><small>Use a fictional alias only.</small></label>',
    '<label class="form-field"><span>Body area / service *</span><select name="bodyArea" required><option value="">Select</option>', bodyAreaOptions(provider, draft.bodyArea), "</select><small></small></label>",
    '<label class="form-field"><span>Accident date *</span><input name="accidentDate" type="date" value="', escapeHtml(draft.accidentDate), '" max="2099-12-31" required /><small>Use a fictional date.</small></label>',
    '<label class="form-field"><span>Case type *</span><select name="caseType" required>',
    ["Workers’ Comp", "Personal Injury", "Other demo"].map((value) => '<option value="' + escapeHtml(value) + '"' + (draft.caseType === value ? " selected" : "") + ">" + escapeHtml(value) + "</option>").join(""),
    "</select><small></small></label>",
    '<label class="form-field"><span>Law firm / account *</span><input name="lawFirm" value="', escapeHtml(draft.lawFirm), '" placeholder="Sample Law Group" maxlength="80" required /><small>Use a fictional organization.</small></label>',
    '<label class="form-field"><span>Contact name</span><input name="contactName" value="', escapeHtml(draft.contactName), '" placeholder="Alex Demo" maxlength="60" /><small></small></label>',
    '<label class="form-field"><span>Contact email *</span><input name="contactEmail" type="email" value="', escapeHtml(draft.contactEmail), '" placeholder="alex.demo@example.com" maxlength="100" required /><small>Use example.com for the demo.</small></label>',
    '<label class="form-field"><span>Contact phone</span><input name="contactPhone" type="tel" value="', escapeHtml(draft.contactPhone), '" placeholder="(312) 555-0100" maxlength="30" /><small>Use a 555 example number.</small></label>',
    '<label class="form-field"><span>Priority</span><select name="urgency">',
    ["Standard", "Priority"].map((value) => '<option value="' + value + '"' + (draft.urgency === value ? " selected" : "") + ">" + value + "</option>").join(""),
    "</select><small></small></label>",
    '<label class="form-field full"><span>Mock notes</span><textarea name="notes" maxlength="500" placeholder="Synthetic scheduling note only">', escapeHtml(draft.notes), "</textarea><small></small></label>",
    '<div class="workflow-actions form-field full"><button class="ghost-button" type="button" data-action="close-workflow">Cancel</button><button class="primary-button violet" type="submit">Review mock referral</button></div>',
    "</form>"
  ].join("");
}

function captureReferralForm(form) {
  const formData = new FormData(form);
  return {
    providerId: referralDraft.providerId,
    providerName: referralDraft.providerName,
    patientAlias: String(formData.get("patientAlias") || "").trim(),
    bodyArea: String(formData.get("bodyArea") || "").trim(),
    accidentDate: String(formData.get("accidentDate") || "").trim(),
    caseType: String(formData.get("caseType") || "").trim(),
    lawFirm: String(formData.get("lawFirm") || "").trim(),
    contactName: String(formData.get("contactName") || "").trim(),
    contactEmail: String(formData.get("contactEmail") || "").trim(),
    contactPhone: String(formData.get("contactPhone") || "").trim(),
    urgency: String(formData.get("urgency") || "Standard").trim(),
    notes: String(formData.get("notes") || "").trim()
  };
}

function referralReviewRows(draft) {
  const rows = [
    ["Provider", draft.providerName],
    ["Patient demo alias", draft.patientAlias],
    ["Body area / service", draft.bodyArea],
    ["Accident date", draft.accidentDate],
    ["Case type", draft.caseType],
    ["Law firm / account", draft.lawFirm],
    ["Contact", [draft.contactName, draft.contactEmail, draft.contactPhone].filter(Boolean).join(" · ")],
    ["Priority", draft.urgency],
    ["Mock notes", draft.notes || "None"]
  ];
  return rows.map((row) => '<div class="review-row"><span>' + escapeHtml(row[0]) + "</span><strong>" + escapeHtml(row[1]) + "</strong></div>").join("");
}

function renderReferralReview(errorMessage) {
  const provider = providers.find((item) => item.id === referralDraft.providerId);
  workflowContent.innerHTML = [
    workflowHeader(provider, 1),
    errorMessage ? '<p class="form-error">' + escapeHtml(errorMessage) + "</p>" : "",
    '<div class="review-list">', referralReviewRows(referralDraft), "</div>",
    '<div class="workflow-actions"><button class="ghost-button" type="button" data-action="edit-referral">Back to edit</button>',
    '<button class="primary-button violet" type="button" data-action="save-referral">Save mock referral locally</button></div>'
  ].join("");
}

function createReferralId() {
  let random = Date.now() % 10000;
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    random = values[0] % 10000;
  } catch {
    // Timestamp fallback is sufficient for a local mock identifier.
  }
  const now = new Date();
  const date = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
  return "DEMO-" + date + "-" + String(random).padStart(4, "0");
}

function saveReferral() {
  const records = loadReferrals();
  const duplicate = records.find((record) => (
    normalized(record.patientAlias) === normalized(referralDraft.patientAlias)
    && record.providerId === referralDraft.providerId
    && record.accidentDate === referralDraft.accidentDate
  ));
  if (duplicate) {
    renderReferralReview("Possible duplicate: " + duplicate.id + " already uses this demo alias, provider, and accident date.");
    return;
  }
  const record = Object.assign({}, referralDraft, {
    id: createReferralId(),
    status: "Referral prepared",
    createdAt: new Date().toISOString(),
    sample: false,
    storeVersion: REFERRAL_STORE_VERSION
  });
  try {
    writeReferrals([record].concat(records));
    savedReferral = record;
    renderReferralSuccess();
    updateDemoUi();
  } catch {
    renderReferralReview("The browser could not save this mock referral. Storage may be disabled or full.");
  }
}

function referralSummary(record) {
  return [
    "LFMM Provider Navigator — MOCK REFERRAL",
    "Demo only. Not submitted.",
    "Reference: " + record.id,
    "Provider: " + record.providerName,
    "Patient demo alias: " + record.patientAlias,
    "Body area / service: " + record.bodyArea,
    "Accident date: " + record.accidentDate,
    "Case type: " + record.caseType,
    "Law firm / account: " + record.lawFirm,
    "Contact: " + [record.contactName, record.contactEmail, record.contactPhone].filter(Boolean).join(" · "),
    "Priority: " + record.urgency,
    "Status: " + record.status,
    "Mock notes: " + (record.notes || "None")
  ].join("\n");
}

function renderReferralSuccess() {
  const provider = providers.find((item) => item.id === savedReferral.providerId);
  workflowContent.innerHTML = [
    workflowHeader(provider, 2),
    '<div class="success-panel"><div class="success-mark">', iconSvg("check"), '</div><h3>Saved in this browser</h3>',
    '<p>No message was sent and no shared record was created. This mock referral exists only in local browser storage.</p>',
    '<span class="referral-id">', escapeHtml(savedReferral.id), "</span></div>",
    '<div class="workflow-actions">',
    '<button class="secondary-button" type="button" data-action="copy-referral">Copy summary</button>',
    '<button class="secondary-button" type="button" data-action="download-referral">Download JSON</button>',
    '<button class="secondary-button" type="button" data-action="print-referral">Print</button>',
    '<button class="primary-button violet" type="button" data-action="view-tracking">View tracking</button>',
    "</div>"
  ].join("");
}

function fillSampleReferral() {
  const form = $("#referral-form", workflowContent);
  if (!form) return;
  form.elements.patientAlias.value = "Demo Patient D";
  form.elements.accidentDate.value = "2026-08-14";
  form.elements.lawFirm.value = "Sample Law Group";
  form.elements.contactName.value = "Alex Demo";
  form.elements.contactEmail.value = "alex.demo@example.com";
  form.elements.contactPhone.value = "(312) 555-0104";
  form.elements.urgency.value = "Standard";
  form.elements.notes.value = "Synthetic sample for a no-backend workflow review.";
}

function openReferral(provider) {
  if (!state.demoUnlocked) {
    openAccessDialog();
    return;
  }
  referralDraft = blankReferral(provider);
  savedReferral = null;
  renderReferralEdit("");
  openPanel(workflowSheet);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("Copied to clipboard.");
  } catch {
    showToast("Clipboard access was unavailable.");
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filteredReferrals() {
  const query = normalized(trackingState.query);
  return loadReferrals()
    .filter((record) => {
      const haystack = normalized([record.id, record.patientAlias, record.providerName, record.lawFirm].join(" "));
      const matchesQuery = !query || haystack.includes(query);
      const matchesStatus = trackingState.status === "all" || record.status === trackingState.status;
      const matchesDate = !trackingState.date || record.accidentDate === trackingState.date || String(record.createdAt || "").slice(0, 10) === trackingState.date;
      return matchesQuery && matchesStatus && matchesDate;
    })
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

function trackingCard(record) {
  return [
    '<article class="tracking-card" data-referral-id="', escapeHtml(record.id), '">',
    '<div class="tracking-card-head"><div><span class="tracking-card-id">', escapeHtml(record.id), "</span><h3>", escapeHtml(record.patientAlias), "</h3></div>",
    '<select class="status-select" aria-label="Status for ', escapeHtml(record.id), '">',
    STATUS_OPTIONS.map((status) => '<option value="' + escapeHtml(status) + '"' + (record.status === status ? " selected" : "") + ">" + escapeHtml(status) + "</option>").join(""),
    "</select></div>",
    '<div class="tracking-meta"><span>', escapeHtml(record.providerName), "</span><span>", escapeHtml(record.bodyArea), "</span><span>Accident: ", escapeHtml(record.accidentDate), "</span><span>", escapeHtml(record.caseType), "</span>",
    record.sample ? '<span class="mock-badge">Synthetic sample</span>' : '<span class="mock-badge">Local mock</span>',
    "</div>",
    '<div class="tracking-edit"><textarea class="tracking-note" aria-label="Mock tracking note" maxlength="500">', escapeHtml(record.notes || ""), '</textarea><button type="button" data-action="save-tracking">Save changes</button></div>',
    "</article>"
  ].join("");
}

function renderTracking(refocusQuery) {
  ensureDemoReferrals();
  const records = filteredReferrals();
  trackingContent.innerHTML = [
    '<div class="tracking-head"><div><p class="detail-kicker">BROWSER-ONLY WORK QUEUE</p><h2>Mock referral tracking</h2>',
    '<p>Fictional records stored only on this device. Nothing is shared or submitted.</p></div>',
    '<div class="tracking-export"><button type="button" data-action="export-json">Export JSON</button><button type="button" data-action="export-csv">Export CSV</button><button type="button" data-action="reset-demo">Restore samples</button></div></div>',
    '<div class="demo-warning"><strong>Do not enter real patient information.</strong>Status and note changes are local mock data and have no operational effect.</div>',
    '<div class="tracking-controls">',
    '<input id="tracking-query" type="search" value="', escapeHtml(trackingState.query), '" placeholder="Search demo alias, provider, ID..." aria-label="Search mock referrals" />',
    '<select id="tracking-status" aria-label="Filter mock referrals by status"><option value="all">All statuses</option>',
    STATUS_OPTIONS.map((status) => '<option value="' + escapeHtml(status) + '"' + (trackingState.status === status ? " selected" : "") + ">" + escapeHtml(status) + "</option>").join(""),
    '</select><input id="tracking-date" type="date" value="', escapeHtml(trackingState.date), '" aria-label="Filter mock referrals by date" /></div>',
    '<div class="tracking-list">', records.length ? records.map(trackingCard).join("") : '<div class="tracking-empty">No mock referrals match these filters.</div>', "</div>"
  ].join("");
  if (refocusQuery) {
    const input = $("#tracking-query", trackingContent);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function openTracking() {
  if (!state.demoUnlocked) {
    openAccessDialog();
    return;
  }
  renderTracking(false);
  openPanel(trackingSheet);
}

function saveTrackingCard(card) {
  const id = card.dataset.referralId;
  const records = loadReferrals();
  const record = records.find((item) => item.id === id);
  if (!record) {
    showToast("Mock referral was not found.");
    return;
  }
  record.status = $(".status-select", card).value;
  record.notes = $(".tracking-note", card).value.trim();
  record.updatedAt = new Date().toISOString();
  try {
    writeReferrals(records);
    showToast("Mock tracking updated locally.");
    renderTracking(false);
    updateDemoUi();
  } catch {
    showToast("Browser storage could not be updated.");
  }
}

function referralsToCsv(records) {
  const fields = ["id", "patientAlias", "providerName", "bodyArea", "accidentDate", "caseType", "lawFirm", "contactName", "contactEmail", "contactPhone", "urgency", "status", "notes", "createdAt"];
  const csvEscape = (value) => '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
  return [fields.join(",")].concat(records.map((record) => fields.map((field) => csvEscape(record[field])).join(","))).join("\r\n");
}

function focusTrap(event) {
  const panel = $(".side-sheet.open");
  if (!panel || event.key !== "Tab") return;
  const focusable = $$('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])', panel)
    .filter((element) => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

list.addEventListener("click", (event) => {
  const card = event.target.closest("[data-provider-id]");
  if (card) selectProvider(card.dataset.providerId, true);
});

list.addEventListener("pointerover", (event) => {
  const card = event.target.closest("[data-provider-id]");
  const entry = card ? markerGroups.get(card.dataset.providerId) : null;
  if (entry && window.matchMedia("(hover: hover) and (pointer: fine)").matches) entry.marker.setIcon(markerIcon(entry.group, true));
});

list.addEventListener("pointerout", (event) => {
  const card = event.target.closest("[data-provider-id]");
  const entry = card ? markerGroups.get(card.dataset.providerId) : null;
  if (entry) entry.marker.setIcon(markerIcon(entry.group, entry.group.some((provider) => provider.id === state.selectedId)));
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

locationInput.addEventListener("input", (event) => {
  state.location = event.target.value;
  state.locationMode = "none";
  if (state.origin) {
    state.origin = null;
    state.sort = "recommended";
    sortSelect.value = "recommended";
  }
  state.locationMessage = "";
  render();
});

[searchInput, locationInput].forEach((input) => input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    performSearch();
  }
}));

specialtySelect.addEventListener("change", (event) => {
  state.specialty = event.target.value;
  render();
});

bodySelect.addEventListener("change", (event) => {
  state.body = event.target.value;
  render();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

$("#quick-detailed").addEventListener("click", () => {
  state.detailedOnly = !state.detailedOnly;
  render();
});

$("#quick-mapped").addEventListener("click", () => {
  state.mappedOnly = !state.mappedOnly;
  render();
});

$("#clear-filters").addEventListener("click", resetFilters);
$("#empty-reset").addEventListener("click", resetFilters);
$("#sheet-close").addEventListener("click", closePanels);
$("#filter-close").addEventListener("click", closePanels);
$("#workflow-close").addEventListener("click", closePanels);
$("#tracking-close").addEventListener("click", closePanels);
$("#help-button").addEventListener("click", openHelp);
moreFilterButton.addEventListener("click", openFilters);
$("#advanced-reset").addEventListener("click", resetAdvancedControls);
$("#advanced-apply").addEventListener("click", applyAdvancedFilters);
$("#search-button").addEventListener("click", performSearch);
$("#use-location").addEventListener("click", useCurrentLocation);
$("#clear-map-area").addEventListener("click", () => {
  state.mapBounds = null;
  render();
  showToast("Map-area filter cleared.");
});

$("#mobile-view-toggle").addEventListener("click", () => {
  document.body.classList.toggle("map-view");
  if (document.body.classList.contains("map-view") && map) window.setTimeout(() => map.invalidateSize(), 230);
});

scrim.addEventListener("click", closePanels);

$("#map-research").addEventListener("click", () => {
  if (!map) return;
  const bounds = map.getBounds();
  state.mapBounds = {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest()
  };
  $("#map-research").classList.remove("visible");
  render();
  showToast("List filtered to the visible map area.");
});

detailContent.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "unlock-demo") openAccessDialog();
  if (action.dataset.action === "refer") {
    const provider = providers.find((item) => item.id === action.dataset.providerId);
    if (provider) openReferral(provider);
  }
});

$("#demo-access-button").addEventListener("click", () => {
  if (state.demoUnlocked) openTracking();
  else openAccessDialog();
});
$("#tracking-button").addEventListener("click", openTracking);
$("#demo-lock-banner").addEventListener("click", () => {
  setDemoUnlocked(false);
  showToast("Demo mode locked. Local mock referrals remain on this device.");
});
$("#access-close").addEventListener("click", () => accessDialog.close());
accessDialog.addEventListener("cancel", () => $("#access-error").textContent = "");
$("#access-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if ($("#access-code").value !== DEMO_CODE) {
    $("#access-error").textContent = "That demo code is not recognized.";
    $("#access-code").select();
    return;
  }
  accessDialog.close();
  setDemoUnlocked(true);
  showToast("Demo mode opened. Use mock data only.");
});

workflowContent.addEventListener("submit", (event) => {
  if (event.target.id !== "referral-form") return;
  event.preventDefault();
  if (!event.target.checkValidity()) {
    event.target.reportValidity();
    return;
  }
  referralDraft = captureReferralForm(event.target);
  const safeAlias = /\b(demo|test|sample)\b/i.test(referralDraft.patientAlias) || /^[A-Z]{1,4}$/.test(referralDraft.patientAlias);
  if (!safeAlias) {
    renderReferralEdit("Use a clearly synthetic alias containing Demo, Test, or Sample—or initials only.");
    return;
  }
  if (!referralDraft.contactEmail.toLowerCase().endsWith("@example.com")) {
    renderReferralEdit("For this public demo, use an @example.com contact email.");
    return;
  }
  if (referralDraft.contactPhone && !/\b555\b/.test(referralDraft.contactPhone)) {
    renderReferralEdit("For this public demo, use a fictional 555 phone number.");
    return;
  }
  renderReferralReview("");
});

workflowContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "fill-sample") fillSampleReferral();
  if (action === "close-workflow") closePanels();
  if (action === "edit-referral") renderReferralEdit("");
  if (action === "save-referral") saveReferral();
  if (action === "copy-referral" && savedReferral) copyText(referralSummary(savedReferral));
  if (action === "download-referral" && savedReferral) {
    downloadFile(savedReferral.id + ".json", JSON.stringify(savedReferral, null, 2), "application/json");
  }
  if (action === "print-referral" && savedReferral) {
    document.body.classList.add("print-referral");
    window.print();
    window.setTimeout(() => document.body.classList.remove("print-referral"), 100);
  }
  if (action === "view-tracking") openTracking();
});

trackingContent.addEventListener("input", (event) => {
  if (event.target.id !== "tracking-query") return;
  trackingState.query = event.target.value;
  renderTracking(true);
});

trackingContent.addEventListener("change", (event) => {
  if (event.target.id === "tracking-status") {
    trackingState.status = event.target.value;
    renderTracking(false);
  }
  if (event.target.id === "tracking-date") {
    trackingState.date = event.target.value;
    renderTracking(false);
  }
});

trackingContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "save-tracking") {
    const card = button.closest("[data-referral-id]");
    if (card) saveTrackingCard(card);
  }
  if (action === "export-json") downloadFile("lfmm-mock-referrals.json", JSON.stringify(loadReferrals(), null, 2), "application/json");
  if (action === "export-csv") downloadFile("lfmm-mock-referrals.csv", referralsToCsv(loadReferrals()), "text/csv");
  if (action === "reset-demo") {
    const confirmed = window.confirm("Restore the three synthetic sample referrals? This removes locally added mock referrals from this browser.");
    if (confirmed) {
      try {
        localStorage.removeItem(REFERRAL_STORE_KEY);
        ensureDemoReferrals();
        renderTracking(false);
        updateDemoUi();
        showToast("Synthetic samples restored.");
      } catch {
        showToast("Browser storage could not be reset.");
      }
    }
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && $(".side-sheet.open")) closePanels();
  focusTrap(event);
});

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context || !context.registerTool) return;
  const lifecycle = new AbortController();
  const register = (tool) => {
    try {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
    } catch {
      // Progressive enhancement only.
    }
  };

  register({
    name: "configure_provider_search",
    title: "Configure provider search",
    description: "Set the visible provider search and filters, then return the matching count.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 120 },
        location: { type: "string", maxLength: 80, description: "Exact listed city or ZIP." },
        specialty: { type: "string" },
        bodyArea: { type: "string" },
        caseType: { type: "string", enum: ["all", "Workers’ Comp", "Personal Injury"] },
        facility: { type: "string", enum: ["all", "ALL", "FK-WD", "ASC"] },
        radiusMiles: { type: "integer", enum: [25, 50, 100] },
        detailedOnly: { type: "boolean" },
        mappedOnly: { type: "boolean" },
        excludePending: { type: "boolean" }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Input must be an object.");
      const allowed = new Set(["query", "location", "specialty", "bodyArea", "caseType", "facility", "radiusMiles", "detailedOnly", "mappedOnly", "excludePending"]);
      if (Object.keys(input).some((key) => !allowed.has(key))) throw new TypeError("Input contains an unsupported filter.");
      const stringField = (key, max) => {
        if (!(key in input)) return undefined;
        if (typeof input[key] !== "string" || input[key].length > max) throw new TypeError(key + " must be a short string.");
        return input[key].trim();
      };
      const query = stringField("query", 120);
      const location = stringField("location", 80);
      const specialty = stringField("specialty", 80);
      const bodyArea = stringField("bodyArea", 80);
      const caseType = stringField("caseType", 30);
      const facility = stringField("facility", 20);
      if (specialty !== undefined && !Array.from(specialtySelect.options).some((option) => option.value === specialty)) throw new RangeError("Unknown specialty.");
      if (bodyArea !== undefined && !Array.from(bodySelect.options).some((option) => option.value === bodyArea)) throw new RangeError("Unknown body area.");
      if (caseType !== undefined && !["all", "Workers’ Comp", "Personal Injury"].includes(caseType)) throw new RangeError("Unknown case type.");
      if (facility !== undefined && !["all", "ALL", "FK-WD", "ASC"].includes(facility)) throw new RangeError("Unknown facility.");
      if ("radiusMiles" in input && !RADIUS_OPTIONS.includes(input.radiusMiles)) throw new RangeError("Radius must be 25, 50, or 100.");
      for (const key of ["detailedOnly", "mappedOnly", "excludePending"]) {
        if (key in input && typeof input[key] !== "boolean") throw new TypeError(key + " must be boolean.");
      }
      if (query !== undefined) { state.query = query; searchInput.value = query; }
      if (location !== undefined) {
        state.location = location;
        locationInput.value = location;
        const resolution = locationUtils.resolveLocationSearch(location, providers);
        state.locationMode = resolution.mode;
        state.origin = resolution.origin;
        if (state.origin) {
          state.sort = "distance";
          sortSelect.value = "distance";
        }
      }
      if (specialty !== undefined) { state.specialty = specialty; specialtySelect.value = specialty; }
      if (bodyArea !== undefined) { state.body = bodyArea; bodySelect.value = bodyArea; }
      if (caseType !== undefined) state.caseType = caseType;
      if (facility !== undefined) state.facility = facility;
      if ("radiusMiles" in input) state.radius = input.radiusMiles;
      for (const key of ["detailedOnly", "mappedOnly", "excludePending"]) {
        if (key in input) state[key] = input[key];
      }
      render();
      return {
        matchCount: state.lastMatches.length,
        mappedCount: state.lastMatches.filter((provider) => provider.lat !== null).length,
        effectiveRadiusMiles: state.origin ? state.effectiveRadius : null,
        providerIds: state.lastMatches.slice(0, 20).map((provider) => provider.id)
      };
    }
  });

  register({
    name: "open_provider_profile",
    title: "Open provider profile",
    description: "Open one visible provider detail panel by provider ID.",
    inputSchema: {
      type: "object",
      properties: { providerId: { type: "string", minLength: 1, maxLength: 100 } },
      required: ["providerId"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input.providerId !== "string") throw new TypeError("providerId is required.");
      const provider = providers.find((item) => item.id === input.providerId);
      if (!provider) throw new RangeError("Provider was not found.");
      selectProvider(provider.id, true);
      return { providerId: provider.id, name: provider.name, specialty: provider.specialty, detailPanelOpen: true };
    }
  });

  register({
    name: "prepare_demo_referral",
    title: "Prepare mock referral",
    description: "Open the unsent mock-referral form for a provider. Demo mode must already be open.",
    inputSchema: {
      type: "object",
      properties: { providerId: { type: "string", minLength: 1, maxLength: 100 } },
      required: ["providerId"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, untrustedContentHint: false },
    execute(input) {
      if (!state.demoUnlocked) throw new Error("Demo mode is locked. The user must open it in the page.");
      const provider = providers.find((item) => item.id === input.providerId);
      if (!provider) throw new RangeError("Provider was not found.");
      openReferral(provider);
      return { providerId: provider.id, mockReferralFormOpen: true, submitted: false };
    }
  });

  register({
    name: "list_demo_referrals",
    title: "List local mock referrals",
    description: "Read browser-only synthetic referral records while demo mode is open.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input) {
      if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new TypeError("Input must be an empty object.");
      if (!state.demoUnlocked) throw new Error("Demo mode is locked.");
      return {
        mockOnly: true,
        records: loadReferrals().map((record) => ({
          id: record.id,
          patientAlias: record.patientAlias,
          providerName: record.providerName,
          accidentDate: record.accidentDate,
          status: record.status
        }))
      };
    }
  });

  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}

setupFilters();
initMap();
if (state.demoUnlocked) ensureDemoReferrals();
render();
registerWebMcpTools();
