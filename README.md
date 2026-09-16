# Unofficial enhancements for eBird

This project is a very quickly made browser extension to improve the user
experience using eBird.

While it will do more over time, so far it does two things:

1. For every bird mentioned on the site, it will add a marker if the bird
  is missing from your life list (red binoculars icon) or your year list
  (dark amber calendar icon).
2. If mentioned on a checklist of hotspot, it will also add a market if the
  bird is missing from that county's life list (blue binoculars icon) or year
  list (teal calendar icon).

I often go from my year needs notification to a checklist, and then forget if
there was one or more birds I was looking for. And whether they were also
lifers or just for the year.

So this tries to do that. I do want to do more eventually, but you know, a bit
at a time!

**This is not affiliated with eBird or the Cornell Lab of Ornithology.**

## Disclaimer

I made this with Claude in a few hours, and didn't do a ton of testing or
much review really. I have tested just for my own use and not extensively.
There probably are bugs, especially in terms of pages that the extension
does not support. I will improve it over time, feel free to file an issue
to point out if you run into anything!

## Privacy

Nothing leaves your browser. The extension reads the page you're on (if on
ebird.org) and periodically (on new page loads if >4h) fetches a new copy of
your life list/year list/county life list/county year list. Results are cached
to `browser.storage.local`. We do not use API keys to make these requests.


## Installing from the browser stores

Links to follow when we get approved!

## Installing from source

This is for developers or other users wishin to experiment.

### Build

```sh
npm install
npm run build           # Chrome / Chromium-based browsers
npm run build:firefox   # Firefox
```

### Chromium/Chrome/Edge/etc

You can load dev versions of extensions permanently in Chromium-based
browsers.

1. `npm run build`
2. Go to `chrome://extensions`, enable "Developer mode".
3. Click "Load unpacked" and select the `dist/chrome-mv3` folder.

### Firefox

In Firefox, only signed XPIs can be loaded permanently, and so the dev version
can only be used temporarily.

1. `npm run build:firefox`
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on" and select `dist/firefox-mv3/manifest.json`.

## Options

The Options/Preferences banels is pretty bare bones right now. Its only real
function is that you can force a refresh manually from there, or wipe the
cache. So if you find yourself in the situation where you've submitted a set
of checklists and want to recheck with that data, head to the options and hit
"Refresh now".

## Credits

Badge glyphs are adapted from [Lucide](https://lucide.dev) (`binoculars`
and `calendar` icons), ISC licence.

## License

MIT — see [LICENSE](./LICENSE).
