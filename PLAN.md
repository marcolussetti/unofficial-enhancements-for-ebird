# Unofficial enhancements for eBird: build plan

This document is the spec for a cross-browser (Chrome and Firefox) Manifest V3 extension. Read it fully before writing code. Where this document says **VERIFY**, check against the live site or current documentation before relying on the assumption. Where it says **DEFAULT**, the owner has not made a final decision; implement the default, keep it easy to change, and list it in your final summary.

Do not make architectural decisions beyond what is written here without asking the owner first. If something in this plan turns out to be wrong (for example eBird markup differs), stop and report rather than inventing a workaround.

---

## 1. Goal

On any ebird.org page, find links to species and append small status badges after the species name:

- **World badge** (at most one per species):
  - Red, binoculars glyph: species is not on the user's world **life** list.
  - Dark amber, calendar glyph: species is on the life list but not on the current-year world list.
  - Lifer takes priority over year; never show both world badges.
- **County badge** (at most one per species, only on checklist pages):
  - Uses the county of the checklist being viewed.
  - Blue, binoculars glyph: not on the user's **county life** list.
  - Second county colour, calendar glyph: on county life list but not on current-year county list.
  - County life takes priority over county year.

A species link therefore shows 0, 1, or 2 badges. Every badge has a tooltip.

Nothing leaves the user's browser. The extension only reads eBird pages the user is already logged in to.

---

## 2. Decisions already made (do not change)

| Area | Decision |
|---|---|
| Framework | WXT, TypeScript, vanilla (no UI framework) |
| Package manager | npm |
| Tests | None for now |
| Sites | ebird.org only |
| API keys | None. Do not use the eBird API. |
| Data source | Scrape the user's life list HTML pages (not CSV, not Download My Data) |
| Where fetching happens | In the content script, on eBird page load |
| Staleness window | 4 hours per list |
| Multi-tab | Per-list "in progress" lock in storage so only one tab fetches a given list |
| Storage | `browser.storage.local` only, no sync |
| Taxa | Full species only. Spuhs, slashes, hybrids, domestics, subspecies/groups are never marked. |
| Exotics | Do not count exotic records (see section 5.3) |
| Year list | Always the current calendar year |
| Dynamic content | Process links once on page load. No MutationObserver yet. |
| Code layout | Feature modules, each with an enable toggle |
| Options page | Minimal vanilla page: feature toggles, list cache status, refresh control |
| Distribution | GitHub first (Firefox signed via AMO "unlisted"), then Chrome Web Store and AMO listed |
| Name | "Unofficial enhancements for eBird" |

Out of scope for this build (future work, but do not design against them): refresh after checklist submission, MutationObserver support, state/country/hotspot lists, differentiating world vs county glyphs beyond colour, past-year lists.

---

## 3. Verification spikes (do these first)

Before building the full feature, write a throwaway content script (or run in the browser console on ebird.org while logged in) and confirm each item. Report findings to the owner.

1. **Raw HTML contains the rows.** `fetch('/lifelist?r=world&time=life', { credentials: 'include' })` then parse with `DOMParser`. Confirm `li.Observation a[data-species-code]` elements exist in the raw response (not only after client-side JS runs). If rows are rendered client-side, stop and report.
2. **No pagination.** Confirm the number of species rows parsed matches the species total shown on the page for a large list. If the page paginates or lazy-loads, stop and report.
3. **County URL works.** `/lifelist?r=CA-BC-TN&time=life` and `/lifelist?r=CA-BC-TN&time=year` return that county's lists.
4. **Logged-out behaviour.** In a logged-out session, what does the fetch return (redirect to a Cornell login host, HTML login page, 403)? Design the logged-out detection from this.
5. **Exotic attribute values.** Collect the distinct values of `data-exotic-subfilter-target` across real lists. The known value is `nativeNaturalized`. Also check whether any rows lack the attribute.
6. **Firefox content script fetch.** Confirm the same fetch sends session cookies from a Firefox MV3 content script. If not, try `content.fetch` (Firefox-specific page-context fetch) and report.
7. **Species links on checklist pages.** Inspect a checklist's species rows. Record the link `href` format (relative or absolute, whether a region suffix like `/species/amerob/CA-BC` appears) and whether the scientific name is present in the markup near the link (for example `.Heading-sub--sci`).

---

## 4. eBird facts gathered so far

### 4.1 List URLs

| List | URL |
|---|---|
| World life | `https://ebird.org/lifelist?r=world&time=life` |
| World current year | `https://ebird.org/lifelist?r=world&time=year` |
| County life | `https://ebird.org/lifelist?r=<COUNTY_CODE>&time=life` (VERIFY) |
| County current year | `https://ebird.org/lifelist?r=<COUNTY_CODE>&time=year` (VERIFY) |
| Past year (future use only) | `https://ebird.org/lifelist?year=2025&time=year` |

### 4.2 Life list row markup (sample from the live site)

```html
<li class="Observation Observation--flushInPageSection Observation--sightingsList " data-exotic-subfilter-target="nativeNaturalized">
  <div class="Observation-numberObserved">...</div>
  <div class="Observation-species u-underlineLinksOnHover">
    <h5 class="Heading Heading--h5">
      <a href="/species/whbnut" class="" data-species-code="whbnut">
        <span class="Heading-main">White-breasted Nuthatch</span>
        <span class="Heading-sub Heading-sub--inline Heading-sub--sci">Sitta carolinensis</span>
      </a>
    </h5>
  </div>
  <div class="Observation-meta u-underlineLinksOnHover">
    <div class="Observation-meta-date">... <a href="/checklist/S393281911">15 Sep 2026</a></div>
    <div class="Observation-meta-location">
      <span>
        <a href="/lifelist?r=L5315464&amp;time=year">Thompson Rivers University</a> |
        <a href="/lifelist?r=CA-BC&amp;time=year">CA-BC</a>
      </span>
    </div>
  </div>
  <div class="Observation-tools">
    <a href="/lifelist?r=world&amp;time=year&amp;spp=whbnut" ...>View All</a>
  </div>
</li>
```

Non-species taxa (spuhs, slashes, etc.) appear in a separate "Additional taxa" section. Their names are **not** links and have no `data-species-code`; only their "View All" button contains a code (`spp=hummin`, `spp=swan1`, `spp=y00471`). Therefore:

> **A species is on a list if and only if a row has an `a[data-species-code]` inside `.Observation-species`, and its exotic status counts (section 5.3).** Never read codes from `spp=` parameters.

### 4.3 Checklist page region breadcrumb (sample)

```html
<nav class="Breadcrumbs Breadcrumbs--small Breadcrumbs--comma u-inline-md">
  <span class="is-visuallyHidden">Region</span>
  <ul>
    <li><a href="/region/CA-BC-TN" title="Region page for Thompson-Nicola District">Thompson-Nicola District</a></li>
    <li><a href="/region/CA-BC" title="Region page for British Columbia"><span>British Columbia</span></a></li>
    <li><a href="/region/CA" title="Region page for Canada"><span>Canada</span></a></li>
  </ul>
</nav>
```

---

## 5. Behaviour spec

### 5.1 Page flow (content script, runs at `document_idle` on `https://ebird.org/*`)

1. Load settings. If the list-markers feature is disabled, exit.
2. Determine required lists:
   - Always: `world:life`, `world:year`.
   - If on a checklist page (`/checklist/S...`) and a county code is found (5.4): `<county>:life`, `<county>:year`.
3. Read cached lists from storage. If present, annotate the page immediately with cached data.
4. For each required list that is missing, stale (older than 4 hours), or tagged with a different year (year lists only), try to acquire its lock (5.5). If acquired, fetch, parse, store, release the lock.
5. Listen to `storage.onChanged`. When any required list key changes (whether this tab or another tab fetched it), remove all existing badges and re-annotate.
6. If a list has never been fetched successfully, annotate without it (do not treat "no data" as "not seen"; show no badge from that list).

### 5.2 Fetching and parsing

- `fetch(url, { credentials: 'include' })` from the content script (VERIFY Firefox, spike 6).
- Detect failure: non-2xx, redirect away from `ebird.org/lifelist` (VERIFY exact signal, spike 4), or the page lacking the life list container entirely. Do not treat a login page as an empty list.
- On failure: keep the old cache untouched, record `lastError` and `lastErrorAt` on the list entry, release the lock. **DEFAULT:** no on-page notice; the options page shows the error.
- Parse with `DOMParser`. For each `li.Observation`:
  - `a[data-species-code]` inside `.Observation-species`: skip row if absent.
  - Exotic filter per 5.3.
  - Collect the code.
- An empty result is valid (for example a year list on 1 January) as long as failure detection passed.

### 5.3 Exotics

- Count a row only if `data-exotic-subfilter-target` is `nativeNaturalized`.
- **DEFAULT:** rows missing the attribute count as native.
- **DEFAULT:** provisional and escapee rows do not count. Keep the allowed values in a single constant so the owner can change this (eBird's own totals do count provisional records; the owner chose not to count exotics).

### 5.4 County detection (checklist pages only)

- Search `nav.Breadcrumbs a[href^="/region/"]`.
- Take the first link whose code matches a three-part subnational2 code: `^[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+$` (for example `CA-BC-TN`).
- County display name: the link's text content, trimmed.
- If no match (some countries have no county level), skip county badges on that page.
- Do not rely on the visually hidden "Region" label; it may be localized.

### 5.5 Locking

- Key: `lock:<listKey>`, value: timestamp (ms).
- Acquire: read the lock; if absent or older than 60 seconds, write the current timestamp, then proceed. Best-effort (not atomic) is acceptable.
- Always remove the lock in a `finally`.
- A tab that fails to acquire a lock does nothing further for that list and relies on `storage.onChanged` (5.1 step 5).

### 5.6 Which links get badges

- Candidates: every `a[href]` whose URL (resolved against `location.href`) is on `ebird.org` and whose path matches `^/species/([a-z0-9]+)(/.*)?$`. The captured group is the code.
- Skip links with no visible text (for example photo thumbnails).
- Skip links already processed (mark with `data-uee-processed`).
- Skip links inside the extension's own badges.
- **Full-species filter (DEFAULT, owner to confirm).** Codes for spuhs, slashes, hybrids, domestics and subspecies groups also use `/species/<code>` links, and would never be on the parsed lists, so they must be excluded or they will wrongly show lifer badges. Rule:
  1. If a scientific name element is found within the link (`.Heading-sub--sci`) or in the same row, mark only if it is a plain binomial: exactly two words, matching `^[A-Z][a-z]+ [a-z-]+$`.
  2. Otherwise fall back to the common name text: do not mark if it contains ` sp.`, `/`, ` x `, `(`, or `Domestic`.
  3. Report in the final summary which pages fell back to rule 2.
- Badge placement: append badges inside the link's parent, immediately after the link (not inside the `<a>`, so clicking a badge does not navigate).

### 5.7 Badge decisions

Given a code, with `L` = world life set, `Y` = world year set, `CL`/`CY` = county sets (each may be unavailable):

- World: if `L` available and code not in `L`, show world-life badge. Else if `Y` available and code not in `Y`, show world-year badge.
- County (checklist pages only): if `CL` available and code not in `CL`, show county-life badge. Else if `CY` available and code not in `CY`, show county-year badge.
- Order: world badge first, then county badge.

### 5.8 Badge appearance

- A solid filled circle in the status colour, with a white glyph centred inside. Size roughly matches the surrounding text line height (about 1.1em), vertically centred, small left margin.
- Colours:

| Badge | Colour | Glyph |
|---|---|---|
| World life | `#C62828` | binoculars |
| World year | `#B26A00` | calendar |
| County life | **DEFAULT** `#1565C0` | binoculars |
| County year | **DEFAULT** `#00838F` | calendar |

- **DEFAULT:** glyphs are the Lucide `binoculars` and `calendar` icons (ISC licence), embedded as inline SVG paths, stroke white. Credit Lucide in the README.
- **DEFAULT:** plain inline elements (no shadow root) with all classes prefixed `uee-`, styled from the content script CSS. Use specific enough selectors and reset properties (`line-height`, `vertical-align`, `margin`, `padding`, `border`, `text-decoration`) so eBird styles do not leak in.
- Tooltip via `title` attribute and matching `aria-label`; the badge has `role="img"`:
  - World life: `Not on your life list`
  - World year: `Not on your <YEAR> list`
  - County life: `Not on your <County Name> life list`
  - County year: `Not on your <County Name> <YEAR> list`

---

## 6. Storage schema

All in `browser.storage.local`. One key per list so updates stay small and `onChanged` is precise.

```ts
// key: `list:${region}:${period}`   e.g. "list:world:life", "list:CA-BC-TN:year"
interface ListCache {
  region: string;            // "world" or eBird region code
  regionName?: string;       // e.g. "Thompson-Nicola District"
  period: "life" | "year";
  year?: number;             // set for period "year"; mismatch with current year = stale
  fetchedAt: number | null;  // ms, last successful fetch
  speciesCodes: string[];
  lastError?: string;
  lastErrorAt?: number;
}

// key: `lock:${region}:${period}` -> number (ms)

// key: "settings"
interface Settings {
  features: Record<string, { enabled: boolean }>;
}
```

Design keys around `region` so state, country and hotspot lists can be added later without migration. County caches accumulate; **DEFAULT:** no automatic cleanup for now (the options page can clear all cached data).

---

## 7. Project structure

```
wxt.config.ts
package.json
README.md
entrypoints/
  ebird.content/
    index.ts        # loads settings, runs enabled features whose matches() pass
    style.css       # badge styles
  options/
    index.html
    main.ts
    style.css
src/
  core/
    browser.ts      # re-export of WXT's `browser`
    storage.ts      # typed get/set/remove, onChanged helper
    settings.ts     # defaults + load/save
    feature.ts      # Feature interface
    registry.ts     # list of all features
  features/
    list-markers/
      index.ts      # Feature definition and page flow (5.1)
      lists.ts      # list keys, URLs, staleness, locking (5.5)
      fetch-parse.ts# fetch + DOMParser parsing (5.2, 5.3)
      county.ts     # county detection (5.4)
      links.ts      # candidate link discovery + full-species filter (5.6)
      badges.ts     # badge decisions + DOM creation + removal (5.7, 5.8)
      icons.ts      # inline SVG glyphs
public/
  icon/             # extension icons (16, 32, 48, 128). DEFAULT: simple placeholder
```

Feature interface:

```ts
export interface Feature {
  id: string;                    // "list-markers"
  name: string;                  // shown in options
  description: string;           // shown in options
  defaultEnabled: boolean;
  matches(url: URL): boolean;
  run(): Promise<void>;
}
```

Only one feature exists in this build: `list-markers` ("Life and year list markers").

---

## 8. Options page

Vanilla HTML and TypeScript.

- **Features:** one checkbox per registered feature (name + description), saved immediately.
- **Cached lists:** a table of every `list:*` key: region (name and code), period/year, species count, last refreshed (relative time), last error if any.
- **Refresh now:** sets `fetchedAt` to `null` on all lists so the next eBird page load refetches. The options page itself does not fetch eBird (it is not same-site and would complicate Firefox permissions). Explain this in one line of helper text.
- **Clear cached data:** removes all `list:*` and `lock:*` keys.
- **Firefox host permission:** Firefox MV3 treats content script match patterns as host permissions the user can revoke. If `browser.permissions.contains({ origins: ['https://ebird.org/*'] })` is false, show a notice and a "Grant access to ebird.org" button calling `browser.permissions.request` (VERIFY current Firefox behaviour).
- Use `options_ui` with `open_in_tab: true`.

No popup in this build.

---

## 9. Manifest and WXT configuration

- Permissions: `storage`. Host access comes from the content script match `https://ebird.org/*`. Do not add other permissions without asking.
- `name`: `Unofficial enhancements for eBird`
- **DEFAULT** `short_name`: `eBird Enhancements`
- **DEFAULT** npm package name: `unofficial-ebird-enhancements`
- Description: short, and state that it is not affiliated with eBird or the Cornell Lab of Ornithology.
- Firefox:
  - WXT builds Firefox as MV2 by default. Force MV3 for Firefox (config `manifestVersion: 3` or `--mv3` flag; VERIFY against current WXT docs).
  - `browser_specific_settings.gecko.id`: `unofficial-ebird-enhancements@marcolussetti.com` (decided; do not change, the ID is permanent once submitted to AMO).
  - `browser_specific_settings.gecko.data_collection_permissions`: `{ "required": ["none"] }` (VERIFY current AMO requirement and minimum Firefox version).
- npm scripts:

```json
{
  "dev": "wxt",
  "dev:firefox": "wxt -b firefox",
  "build": "wxt build",
  "build:firefox": "wxt build -b firefox",
  "zip": "wxt zip",
  "zip:firefox": "wxt zip -b firefox",
  "compile": "tsc --noEmit"
}
```

(Adjust flags if MV3 for Firefox requires them.)

---

## 10. Implementation order

1. Scaffold WXT project (vanilla TS), configure manifest (section 9), confirm it loads in Chrome and Firefox with an empty content script.
2. Run verification spikes (section 3). **Stop and report findings before continuing.**
3. Core: storage, settings, feature interface, registry, content script runner.
4. list-markers: list keys and URLs, fetch and parse, caching with staleness and year tagging, locking.
5. Link discovery and full-species filter.
6. Badges: icons, CSS, decision logic, rendering, re-render on `storage.onChanged`.
7. County detection and county lists.
8. Options page.
9. README: what it does, privacy statement (all data stays local), install from source for Chrome (load unpacked) and Firefox (`about:debugging` for testing; signed XPI for normal use), not-affiliated notice, Lucide credit.
10. Final summary for the owner: spike results, every DEFAULT used, and anything that did not match this plan.

---

## 11. Coding conventions

- TypeScript strict mode; `npm run compile` must pass.
- Use WXT's `browser` API (no direct `chrome.*`).
- No external runtime dependencies unless asked.
- All injected DOM uses the `uee-` prefix for classes and `data-uee-*` for attributes.
- Log with a `[uee]` prefix; keep console output quiet unless something fails.
- Never send data anywhere other than the ebird.org requests described here.
