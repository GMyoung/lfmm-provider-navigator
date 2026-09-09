# LFMM Provider Navigator

A polished, map-based provider directory prototype for Labor Force Medical Management. It turns the supplied provider rosters into a fast search-and-filter experience for case-management teams.

## What the prototype includes

- Search by provider, specialty, practice, service, city, or ZIP
- Filters for specialty, body area, case type, surgery-center access, record completeness, and map availability
- Synchronized provider list and interactive map
- Detailed provider panels with office details, case rules, restrictions, directions, and click-to-call
- Responsive list/map modes for desktop and mobile
- Progressive WebMCP tools for compatible agent-enabled browsers

## Data coverage

- 73 providers from the supplied surgery-center roster
- 26 providers enriched from the detailed provider-information packet
- 24 enriched providers with map coordinates

PT, chiropractic, neurology, imaging, EEG/EMG, work conditioning/work hardening, and FCE categories are built into the information architecture, but should only be populated after those source lists are supplied and verified.

## Privacy and safety

This public prototype intentionally omits internal referral, records, and billing email addresses as well as personal mobile numbers. Only directory-style business information is represented. No patient information or PHI is stored. Always verify current availability, case acceptance, office hours, and contact details before referral.

## Run locally

From the repository root:

```powershell
python -m http.server 4173 --directory dist
```

Then open `http://127.0.0.1:4173/`.

## Structure

- `dist/index.html` — page structure and accessible controls
- `dist/styles.css` — responsive visual system
- `dist/data.js` — sanitized provider roster and details
- `dist/app.js` — search, filters, map synchronization, and provider details
- `.openai/hosting.json` — Sites deployment configuration

The original PDFs are source material and are intentionally not committed to this repository.

