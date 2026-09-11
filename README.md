# LFMM Provider Navigator

A polished, map-based provider directory prototype for Labor Force Medical Management. It turns the supplied provider rosters into a fast search-and-filter experience for case-management teams.

## What the no-backend prototype includes

- Search by provider, specialty, practice, service, city, or ZIP
- Browser-location and known city/ZIP distance search with 25/50/100-mile radius expansion
- Filters for specialty, body area, case type, surgery-center access, record completeness, map availability, and current map bounds
- Category-coded markers, a live legend, and synchronized provider list/map
- Detailed provider panels with office details, case rules, restrictions, directions, and click-to-call
- Responsive list/map modes for desktop and mobile
- A client-side demo mode, opened with code 1234, that reveals only fictional workflow contacts and availability
- A fully local mock-referral flow with required-field checks, review, duplicate detection, local tracking, notes/status updates, copy, print, JSON, and CSV export
- Progressive WebMCP tools for compatible agent-enabled browsers
- Official Labor Force Medical Management logo supplied by the project owner

## Data coverage

- 73 providers from the supplied surgery-center roster
- 26 providers enriched from the detailed provider-information packet
- 24 enriched providers with map coordinates

PT, chiropractic, neurology, imaging, EEG/EMG, work conditioning/work hardening, and FCE categories are built into the information architecture, but should only be populated after those source lists are supplied and verified.

## Privacy and safety

This public prototype intentionally omits real internal referral, records, and billing email addresses as well as personal mobile numbers. Only directory-style business information is represented.

The code 1234 is a visible client-side demo switch, not authentication. Demo contacts use example.com and 555 numbers. Mock referrals are stored only in the current browser with localStorage and are never transmitted. Never enter real patient information or PHI. Always verify current availability, case acceptance, office hours, and contact details before a real referral.

True sign-in, protected sensitive information, real patient submissions, email delivery, shared records, audit logs, arbitrary address geocoding, and multi-user synchronization require an approved backend and are intentionally out of scope.

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
- `dist/app.js` — search, distance logic, filters, map synchronization, demo workflow, and local mock tracking
- `dist/lfmm-logo.jpeg` — supplied LFMM brand logo
- `.openai/hosting.json` — Sites deployment configuration

The original PDFs are source material and are intentionally not committed to this repository.
