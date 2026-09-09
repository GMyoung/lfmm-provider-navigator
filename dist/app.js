const source = window.LFMM_DATA;

const titleCase = (value) => value
  .toLowerCase()
  .replace(/(^|[\s-])\S/g, (letter) => letter.toUpperCase());

const normalized = (value = "") => String(value)
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const slugify = (value) => normalized(value).replace(/\s+/g, "-");

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
    ALL: "All surgery centers",
    "FK-WD": "Fullerton Kimball / Western Diversey",
    ASC: "Aiden Surgery Center"
  }[code] || code;
}

const providers = source.roster.map(([last, first, specialty, facility]) => {
  const key = `${last}|${first}`;
  const detail = source.details[key] || null;
  const credentials = detail?.credentials ? `, ${detail.credentials}` : "";
  const name = `${titleCase(first)} ${titleCase(last)}${credentials}`;
  const group = serviceGroup(specialty);
  const aliases = [
    group === "Orthopedic" ? "ortho orthopaedic" : "",
    group === "Spine" ? "back neck neurospine" : "",
    group === "Podiatry" ? "foot ankle dpm" : "",
    group === "Imaging" ? "radiology xray x ray mri ct" : "",
    group === "Pain Management" ? "pain anesthesia" : ""
  ].join(" ");

  return {
    id: slugify(`${first}-${last}`),
    key,
    name,
    firstName: titleCase(first),
    lastName: titleCase(last),
    initials: `${first[0] || ""}${last[0] || ""}`,
    sourceSpecialty: specialty,
    specialty: specialtyLabel(specialty),
    group,
    facility,
    facilityLabel: facilityLabel(facility),
    detailed: Boolean(detail),
    status: detail?.status || (detail ? "Detailed" : "Roster only"),
    practice: detail?.practice || "Practice information to verify",
    bodyAreas: detail?.bodyAreas || [],
    address: detail?.address || "Location information to verify",
    city: detail?.city || "Not mapped",
    zip: detail?.zip || "",
    phone: detail?.phone || "Not provided",
    fax: detail?.fax || "Not provided",
    hours: detail?.hours || "Not provided",
    caseRules: detail?.caseRules || { wc: "unknown", pi: "unknown" },
    restrictions: detail?.restrictions || [],
    languages: detail?.languages || [],
    lat: Number.isFinite(detail?.lat) ? detail.lat : null,
    lng: Number.isFinite(detail?.lng) ? detail.lng : null,
    otherLocations: detail?.otherLocations || 0,
    aliases
  };
});

const state = {
  query: "",
  location: "",
  specialty: "all",
  body: "all",
  caseType: "all",
  sort: "recommended",
  selectedId: null,
  detailedOnly: false,
  mappedOnly: false,
  facility: "all",
  excludePending: false
};

const list = document.querySelector("#provider-list");
const count = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#provider-search");
const locationInput = document.querySelector("#location-search");
const specialtySelect = document.querySelector("#specialty-filter");
const bodySelect = document.querySelector("#body-filter");
const sortSelect = document.querySelector("#sort-select");
const detailSheet = document.querySelector("#detail-sheet");
const filterSheet = document.querySelector("#filter-sheet");
const detailContent = document.querySelector("#detail-content");
const scrim = document.querySelector("#scrim");
const caseButtons = [...document.querySelectorAll("[data-case]")];
const advancedCount = document.querySelector("#advanced-count");
const moreFilterButton = document.querySelector("#more-filter");

const synonymMap = {
  ortho: "orthopedic",
  orthopaedic: "orthopedic",
  back: "spine",
  neck: "spine",
  wrist: "hand",
  dpm: "podiatry",
  podiatrist: "podiatry",
  xray: "radiology",
  "x-ray": "radiology",
  nerve: "emg",
  pt: "physical therapy"
};

let map;
let markerGroups = new Map();
let suppressMoveNotice = false;
let lastFocusedElement = null;

function setupFilters() {
  const availableGroups = [...new Set(providers.map((provider) => provider.group))].sort();
  const futureGroups = ["Physical Therapy", "Chiropractic", "Neurology", "Rehabilitation", "Diagnostics"];
  const options = ["all", ...availableGroups, ...futureGroups.filter((item) => !availableGroups.includes(item))];
  specialtySelect.innerHTML = options.map((value) => (
    `<option value="${value}">${value === "all" ? "All specialties & services" : value}</option>`
  )).join("");

  const bodyAreas = [...new Set(Object.values(source.details).flatMap((detail) => detail.bodyAreas || []))].sort();
  bodySelect.innerHTML = ["all", ...bodyAreas].map((value) => (
    `<option value="${value}">${value === "all" ? "Any body area" : value}</option>`
  )).join("");
}

function queryTerms(value) {
  return normalized(value).split(" ").filter(Boolean).map((term) => synonymMap[term] || term);
}

function caseMatches(provider) {
  if (state.caseType === "all") return true;
  if (state.caseType === "Workers’ Comp") return provider.caseRules.wc !== "no";
  if (state.caseType === "Personal Injury") return provider.caseRules.pi !== "no";
  return true;
}

function filteredProviders() {
  const terms = queryTerms(state.query);
  const locationTerms = queryTerms(state.location);
  const result = providers.filter((provider) => {
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
    const locationHaystack = normalized(`${provider.address} ${provider.city} ${provider.zip}`);
    const matchesQuery = terms.every((term) => haystack.includes(term));
    const matchesLocation = locationTerms.every((term) => locationHaystack.includes(term));
    const matchesSpecialty = state.specialty === "all" || provider.group === state.specialty;
    const matchesBody = state.body === "all" || provider.bodyAreas.some((area) => normalized(area) === normalized(state.body));
    const matchesFacility = state.facility === "all" || provider.facility === state.facility;
    const matchesCoverage = (!state.detailedOnly || provider.detailed) && (!state.mappedOnly || provider.lat !== null);
    const matchesStatus = !state.excludePending || provider.status !== "Pending";
    return matchesQuery && matchesLocation && matchesSpecialty && matchesBody && matchesFacility && matchesCoverage && matchesStatus && caseMatches(provider);
  });

  return result.sort((a, b) => {
    if (state.sort === "name") return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
    if (state.sort === "city") return a.city.localeCompare(b.city) || a.lastName.localeCompare(b.lastName);
    if (a.status !== b.status && (a.status === "Pending" || b.status === "Pending")) return a.status === "Pending" ? 1 : -1;
    if (a.detailed !== b.detailed) return a.detailed ? -1 : 1;
    return a.lastName.localeCompare(b.lastName);
  });
}

function ruleBadge(rule, shortLabel) {
  if (rule === "yes") return `<span class="badge teal">${shortLabel} confirmed</span>`;
  if (rule === "no") return `<span class="badge danger">No ${shortLabel}</span>`;
  return "";
}

function cardTemplate(provider) {
  const statusClass = provider.status === "Pending" ? "warn" : provider.detailed ? "teal" : "roster";
  const locationLine = provider.detailed
    ? `<strong>${provider.city}</strong> · ${provider.practice}`
    : `${provider.facilityLabel} · Details needed`;
  return `
    <button class="provider-card ${provider.detailed ? "" : "roster-only"} ${state.selectedId === provider.id ? "selected" : ""}" type="button" data-provider-id="${provider.id}">
      <span class="provider-avatar" aria-hidden="true">${provider.initials}</span>
      <span>
        <p class="provider-type">${provider.detailed ? "Detailed profile" : "Facility roster"}</p>
        <h2 class="provider-name">${provider.name}</h2>
        <p class="provider-specialty">${provider.specialty}</p>
        <p class="provider-location">${locationLine}</p>
        <span class="badges">
          <span class="badge ${statusClass}">${provider.status}</span>
          <span class="badge">${provider.facility}</span>
          ${ruleBadge(provider.caseRules.wc, "WC")}
          ${ruleBadge(provider.caseRules.pi, "PI")}
          ${provider.bodyAreas.slice(0, 2).map((area) => `<span class="badge">${area}</span>`).join("")}
        </span>
      </span>
      <span class="card-arrow" aria-hidden="true">›</span>
    </button>
  `;
}

function activeFilterCount() {
  return [state.detailedOnly, state.mappedOnly, state.facility !== "all", state.excludePending].filter(Boolean).length;
}

function updateFilterSummary(matches) {
  advancedCount.textContent = activeFilterCount();
  const mapped = matches.filter((provider) => provider.lat !== null).length;
  const detailed = matches.filter((provider) => provider.detailed).length;
  const summary = document.querySelector("#active-summary");
  summary.innerHTML = `
    <span>${matches.length} matching listings</span>
    <span>${detailed} detailed profiles</span>
    <span>${mapped} mapped locations</span>
    ${state.caseType !== "all" ? `<span>${state.caseType}: unknown eligibility may appear</span>` : ""}
  `;
}

function render() {
  const matches = filteredProviders();
  count.textContent = matches.length;
  list.innerHTML = matches.map(cardTemplate).join("");
  emptyState.hidden = matches.length > 0;
  list.hidden = matches.length === 0;
  if (!matches.length) {
    const missingCategory = ["Physical Therapy", "Chiropractic", "Neurology", "Rehabilitation", "Diagnostics"].includes(state.specialty);
    emptyState.querySelector("h2").textContent = missingCategory ? "No verified listings yet" : "No exact matches";
    emptyState.querySelector("p").textContent = missingCategory
      ? `${state.specialty} was requested for the directory, but no verified source records have been supplied yet.`
      : "Try another body area, case type, surgery center, or nearby city.";
  }
  updateFilterSummary(matches);
  renderMarkers(matches);
}

function initMap() {
  if (!window.L) {
    document.querySelector("#map-status").textContent = "Map could not load";
    return;
  }
  map = L.map("map", { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([41.86, -87.85], 9);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  map.on("movestart", () => {
    if (!suppressMoveNotice) document.querySelector("#map-research").classList.add("visible");
  });
  renderMarkers(providers);
}

function markerIcon(group, selected = false) {
  const label = group.length > 1 ? group.length : group[0].initials;
  return L.divIcon({
    className: "marker-shell",
    html: `<div class="provider-marker ${selected ? "selected" : ""}"><span>${label}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 38]
  });
}

function renderMarkers(matches) {
  if (!map) return;
  markerGroups.forEach(({ marker }) => marker.remove());
  markerGroups.clear();
  const grouped = new Map();
  matches.filter((provider) => provider.lat !== null).forEach((provider) => {
    const key = `${provider.lat.toFixed(5)}|${provider.lng.toFixed(5)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(provider);
  });

  grouped.forEach((group) => {
    const selected = group.some((provider) => provider.id === state.selectedId);
    const marker = L.marker([group[0].lat, group[0].lng], {
      icon: markerIcon(group, selected),
      title: group.length === 1 ? group[0].name : `${group.length} providers at this location`,
      keyboard: true
    }).addTo(map);
    marker.on("click", () => selectProvider(group[0].id, true));
    const tooltipNames = group.slice(0, 4).map((provider) => provider.name).join("<br>");
    marker.bindTooltip(`${tooltipNames}${group.length > 4 ? `<br>+${group.length - 4} more` : ""}`, { direction: "top", offset: [0, -32] });
    group.forEach((provider) => markerGroups.set(provider.id, { marker, group }));
  });
  const mappedCount = matches.filter((provider) => provider.lat !== null).length;
  document.querySelector("#map-status").innerHTML = `<span class="pulse-dot"></span>${mappedCount} mapped · ${matches.length - mappedCount} list-only`;
}

function caseRuleLabel(rule) {
  return { yes: "Confirmed in source", no: "Not accepted", unknown: "Not documented — verify" }[rule] || "Verify";
}

function detailTemplate(provider) {
  const mapsUrl = provider.lat !== null
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`
    : "#";
  const phoneUrl = provider.phone !== "Not provided" ? `tel:${provider.phone.replace(/[^\d+]/g, "")}` : "#";
  const restrictions = provider.restrictions.length
    ? `<ul class="restriction-list">${provider.restrictions.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : `<p class="provider-location">No special restrictions were documented in the supplied profile.</p>`;
  return `
    <section class="detail-hero">
      <p class="detail-kicker">${provider.detailed ? "DETAILED DIRECTORY PROFILE" : "FACILITY ROSTER ENTRY"}</p>
      <h2>${provider.name}</h2>
      <p class="detail-subtitle">${provider.specialty} · ${provider.practice}</p>
      <div class="badges">
        <span class="badge ${provider.status === "Pending" ? "warn" : provider.detailed ? "teal" : "roster"}">${provider.status}</span>
        <span class="badge">${provider.facilityLabel}</span>
      </div>
    </section>
    <section class="detail-section">
      <h3>Location & access</h3>
      <div class="detail-grid">
        <div class="detail-item"><span>Primary location</span><strong>${provider.city}</strong></div>
        <div class="detail-item"><span>Surgery access</span><strong>${provider.facilityLabel}</strong></div>
        <div class="detail-item"><span>Additional locations</span><strong>${provider.otherLocations || "None documented"}</strong></div>
        <div class="detail-item"><span>Office hours</span><strong>${provider.hours}</strong></div>
      </div>
      <p class="provider-location" style="margin-top:12px">${provider.address}</p>
    </section>
    <section class="detail-section">
      <h3>Clinical match</h3>
      <div class="badges">
        ${provider.bodyAreas.length ? provider.bodyAreas.map((area) => `<span class="badge">${area}</span>`).join("") : `<span class="badge roster">Body-area details not supplied</span>`}
      </div>
    </section>
    <section class="detail-section">
      <h3>Case eligibility</h3>
      <div class="detail-grid">
        <div class="detail-item"><span>Workers’ Comp</span><strong>${caseRuleLabel(provider.caseRules.wc)}</strong></div>
        <div class="detail-item"><span>Personal Injury</span><strong>${caseRuleLabel(provider.caseRules.pi)}</strong></div>
      </div>
    </section>
    <section class="detail-section">
      <h3>Office contact</h3>
      <div class="contact-list">
        <div class="contact-row"><span>Phone</span><strong>${provider.phone}</strong></div>
        <div class="contact-row"><span>Fax</span><strong>${provider.fax}</strong></div>
        <div class="contact-row muted"><span>Referral, records & billing contacts</span><strong>Hidden in this public prototype</strong></div>
      </div>
    </section>
    <section class="detail-section">
      <h3>Important notes</h3>
      ${restrictions}
      <p class="verification-note">Prototype data from the supplied provider directories. Verify availability, case acceptance, and contact details before referral. Roster date: August 28, 2026.</p>
    </section>
    <div class="sheet-actions">
      <a class="${provider.lat === null ? "disabled" : ""}" href="${mapsUrl}" target="_blank" rel="noreferrer">Directions</a>
      <a class="primary ${provider.phone === "Not provided" ? "disabled" : ""}" href="${phoneUrl}">Call office</a>
    </div>
  `;
}

function focusProviderOnMap(provider) {
  if (!map || provider.lat === null) return;
  suppressMoveNotice = true;
  map.panTo([provider.lat, provider.lng], { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches, duration: 0.25 });
  window.setTimeout(() => { suppressMoveNotice = false; }, 320);
}

function selectProvider(id, openSheet = false) {
  const provider = providers.find((item) => item.id === id);
  if (!provider) return;
  state.selectedId = id;
  focusProviderOnMap(provider);
  render();
  if (openSheet) openDetails(provider);
}

function openPanel(panel) {
  lastFocusedElement = document.activeElement;
  scrim.hidden = false;
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
}

function openDetails(provider) {
  detailContent.innerHTML = detailTemplate(provider);
  openPanel(detailSheet);
  document.querySelector("#sheet-close").focus();
}

function openFilters() {
  document.querySelector("#detailed-only").checked = state.detailedOnly;
  document.querySelector("#mapped-only").checked = state.mappedOnly;
  document.querySelector("#exclude-pending").checked = state.excludePending;
  document.querySelector(`input[name="facility"][value="${state.facility}"]`).checked = true;
  moreFilterButton.setAttribute("aria-expanded", "true");
  openPanel(filterSheet);
  document.querySelector("#filter-close").focus();
}

function closePanels() {
  [detailSheet, filterSheet].forEach((panel) => {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  });
  moreFilterButton.setAttribute("aria-expanded", "false");
  window.setTimeout(() => { scrim.hidden = true; }, 220);
  if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus({ preventScroll: true });
}

function resetAdvancedControls() {
  document.querySelector("#detailed-only").checked = false;
  document.querySelector("#mapped-only").checked = false;
  document.querySelector("#exclude-pending").checked = false;
  document.querySelector('input[name="facility"][value="all"]').checked = true;
}

function applyAdvancedFilters() {
  state.detailedOnly = document.querySelector("#detailed-only").checked;
  state.mappedOnly = document.querySelector("#mapped-only").checked;
  state.excludePending = document.querySelector("#exclude-pending").checked;
  state.facility = document.querySelector('input[name="facility"]:checked').value;
  closePanels();
  render();
}

function resetFilters() {
  Object.assign(state, {
    query: "", location: "", specialty: "all", body: "all", caseType: "all",
    selectedId: null, detailedOnly: false, mappedOnly: false, facility: "all", excludePending: false
  });
  searchInput.value = "";
  locationInput.value = "";
  specialtySelect.value = "all";
  bodySelect.value = "all";
  resetAdvancedControls();
  caseButtons.forEach((button) => button.classList.toggle("active", button.dataset.case === "all"));
  render();
}

function focusCurrentMatches() {
  if (!map) return;
  const matches = filteredProviders().filter((provider) => provider.lat !== null);
  if (!matches.length) return;
  suppressMoveNotice = true;
  const bounds = L.latLngBounds(matches.map((provider) => [provider.lat, provider.lng]));
  map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12, animate: false });
  window.setTimeout(() => { suppressMoveNotice = false; }, 120);
  document.querySelector("#map-research").classList.remove("visible");
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

searchInput.addEventListener("input", (event) => { state.query = event.target.value; render(); });
locationInput.addEventListener("input", (event) => { state.location = event.target.value; render(); });
specialtySelect.addEventListener("change", (event) => { state.specialty = event.target.value; render(); });
bodySelect.addEventListener("change", (event) => { state.body = event.target.value; render(); });
sortSelect.addEventListener("change", (event) => { state.sort = event.target.value; render(); });
caseButtons.forEach((button) => button.addEventListener("click", () => {
  state.caseType = button.dataset.case;
  caseButtons.forEach((item) => item.classList.toggle("active", item === button));
  render();
}));

document.querySelector("#clear-filters").addEventListener("click", resetFilters);
document.querySelector("#empty-reset").addEventListener("click", resetFilters);
document.querySelector("#sheet-close").addEventListener("click", closePanels);
document.querySelector("#filter-close").addEventListener("click", closePanels);
document.querySelector("#more-filter").addEventListener("click", openFilters);
document.querySelector("#advanced-reset").addEventListener("click", resetAdvancedControls);
document.querySelector("#advanced-apply").addEventListener("click", applyAdvancedFilters);
document.querySelector("#mobile-view-toggle").addEventListener("click", () => {
  document.body.classList.toggle("map-view");
  if (document.body.classList.contains("map-view") && map) window.setTimeout(() => map.invalidateSize(), 230);
});
scrim.addEventListener("click", closePanels);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && (!scrim.hidden || detailSheet.classList.contains("open") || filterSheet.classList.contains("open"))) closePanels();
});
document.querySelector("#map-research").addEventListener("click", (event) => event.currentTarget.classList.remove("visible"));
document.querySelector("#search-button").addEventListener("click", () => { render(); focusCurrentMatches(); });

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  const lifecycle = new AbortController();
  const register = (tool) => {
    try {
      void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
    } catch {
      // WebMCP is progressive enhancement; unsupported or partial implementations
      // must never interfere with the visible directory.
    }
  };

  register({
    name: "configure_provider_search",
    title: "Configure provider search",
    description: "Set the visible provider-directory search and filters, then return the matching provider count.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 120, description: "Provider name, specialty, practice, or service." },
        location: { type: "string", maxLength: 80, description: "City or ZIP code." },
        specialty: { type: "string", description: "A specialty shown in the directory filter." },
        bodyArea: { type: "string", description: "A body area shown in the directory filter." },
        caseType: { type: "string", enum: ["all", "Workers’ Comp", "Personal Injury"] },
        facility: { type: "string", enum: ["all", "ALL", "FK-WD", "ASC"] },
        detailedOnly: { type: "boolean" },
        mappedOnly: { type: "boolean" },
        excludePending: { type: "boolean" }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Input must be an object.");
      const allowedKeys = new Set(["query", "location", "specialty", "bodyArea", "caseType", "facility", "detailedOnly", "mappedOnly", "excludePending"]);
      if (Object.keys(input).some((key) => !allowedKeys.has(key))) throw new TypeError("Input contains an unsupported filter.");

      const stringValue = (key, max) => {
        if (!(key in input)) return undefined;
        if (typeof input[key] !== "string" || input[key].length > max) throw new TypeError(`${key} must be a string no longer than ${max} characters.`);
        return input[key];
      };
      const booleanValue = (key) => {
        if (!(key in input)) return undefined;
        if (typeof input[key] !== "boolean") throw new TypeError(`${key} must be a boolean.`);
        return input[key];
      };

      const query = stringValue("query", 120);
      const location = stringValue("location", 80);
      const specialty = stringValue("specialty", 80);
      const bodyArea = stringValue("bodyArea", 80);
      const caseType = stringValue("caseType", 30);
      const facility = stringValue("facility", 20);
      const specialtyValues = new Set([...specialtySelect.options].map((option) => option.value));
      const bodyValues = new Set([...bodySelect.options].map((option) => option.value));
      if (specialty !== undefined && !specialtyValues.has(specialty)) throw new RangeError("Unknown specialty filter.");
      if (bodyArea !== undefined && !bodyValues.has(bodyArea)) throw new RangeError("Unknown body-area filter.");
      if (caseType !== undefined && !["all", "Workers’ Comp", "Personal Injury"].includes(caseType)) throw new RangeError("Unknown case-type filter.");
      if (facility !== undefined && !["all", "ALL", "FK-WD", "ASC"].includes(facility)) throw new RangeError("Unknown facility filter.");

      if (query !== undefined) { state.query = query.trim(); searchInput.value = query.trim(); }
      if (location !== undefined) { state.location = location.trim(); locationInput.value = location.trim(); }
      if (specialty !== undefined) { state.specialty = specialty; specialtySelect.value = specialty; }
      if (bodyArea !== undefined) { state.body = bodyArea; bodySelect.value = bodyArea; }
      if (caseType !== undefined) {
        state.caseType = caseType;
        caseButtons.forEach((button) => button.classList.toggle("active", button.dataset.case === caseType));
      }
      if (facility !== undefined) state.facility = facility;
      for (const key of ["detailedOnly", "mappedOnly", "excludePending"]) {
        const value = booleanValue(key);
        if (value !== undefined) state[key] = value;
      }

      render();
      const matches = filteredProviders();
      return {
        matchCount: matches.length,
        mappedCount: matches.filter((provider) => provider.lat !== null).length,
        providerIds: matches.slice(0, 20).map((provider) => provider.id)
      };
    }
  });

  register({
    name: "open_provider_profile",
    title: "Open provider profile",
    description: "Open one provider's visible detail panel using an ID returned by configure_provider_search.",
    inputSchema: {
      type: "object",
      properties: { providerId: { type: "string", minLength: 1, maxLength: 100 } },
      required: ["providerId"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.providerId !== "string") {
        throw new TypeError("providerId is required.");
      }
      const provider = providers.find((item) => item.id === input.providerId);
      if (!provider) throw new RangeError("Provider was not found.");
      selectProvider(provider.id, true);
      return { providerId: provider.id, name: provider.name, specialty: provider.specialty, detailPanelOpen: true };
    }
  });

  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}

setupFilters();
initMap();
render();
registerWebMcpTools();
