# Unofficial enhancements for eBird

A browser extension (Chrome and Firefox) that adds small status badges after
species links on [ebird.org](https://ebird.org), showing at a glance whether
a species is new for your life list, your current-year list, or (on
checklist pages) your county life/year lists.

**This is not affiliated with eBird or the Cornell Lab of Ornithology.**

## What it does

On any ebird.org page, species links get 0–2 small colored badges after the
name:

- A **world badge**: red (binoculars) if the species isn't on your life
  list, or dark amber (calendar) if it's on your life list but not your
  current-year list.
- A **county badge** (checklist pages only, when a county can be
  determined): blue (binoculars) or teal (calendar), same life/year logic,
  scoped to the checklist's county.

Only full species get badges — spuhs, slashes, hybrids, domestics, and
subspecies/groups are excluded. Exotic (non-native/naturalized) records are
not counted toward your lists.

## Privacy

Nothing leaves your browser. The extension only fetches pages from
ebird.org that your browser is already logged in to (your life list pages),
parses them locally, and caches the results in `browser.storage.local`. No
external servers, analytics, or API keys are involved.

## Installing from source

### Build

```sh
npm install
npm run build           # Chrome / Chromium-based browsers
npm run build:firefox   # Firefox
```

### Chrome (and other Chromium browsers)

1. `npm run build`
2. Go to `chrome://extensions`, enable "Developer mode".
3. Click "Load unpacked" and select the `dist/chrome-mv3` folder.

### Firefox

For testing:

1. `npm run build:firefox`
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on" and select `dist/firefox-mv3/manifest.json`.

For normal, persistent use, Firefox requires a signed `.xpi`. Signed builds
are distributed via GitHub releases (and eventually AMO); see the
repository's releases page.

## Options

Right-click the extension icon and choose "Options" (or open it from your
browser's extensions page) to:

- Toggle features on/off.
- See cached list status (region, species count, last refreshed, errors).
- Force a refresh of cached lists on your next eBird page visit.
- Clear all cached data.

## Credits

Badge glyphs are adapted from [Lucide](https://lucide.dev) (`binoculars`
and `calendar` icons), ISC licence.

## License

MIT — see [LICENSE](./LICENSE).
