# Vice Coast Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Gustronger/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Gustronger/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and caption into GTA 6-style cover art:
a multi-panel poster with bold condensed lettering and a Vice City sunset or
neon colour grade, exported as a PNG to share. Entry for the make.fun bounty
[Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo, drawn as a cartoon** — upload your own (file picker or
  drag & drop) or try the two bundled samples, both original cartoon
  illustrations: a woman with sunglasses leaning on a red convertible at
  sunset, and a man in a bucket hat fishing from a pier. Every photo panel
  runs through the cartoon filter — posterized flat colours with dark comic
  outlines — so any upload comes out as GTA-style illustration, never a
  plain photograph. Each panel takes its own photo, or a procedural sunset
  scene the app draws itself.
- **Five poster layouts** — Showcase (one large anchor panel plus six
  captioned panels), Hero Duo, Four Panel, Full Bleed and Neon Strip.
  Click a panel in the preview to select it, then crop it with the zoom and
  pan sliders.
- **Four colour grades** — Sunset, Neon Night, Vice Pink and Golden Hour.
  Each grade repaints the sky, the sun, the photo wash and the lettering.
- **A cover packed with information** — every panel carries its own
  caption chip (place, time and tagline) and photo panels carry a tilted
  character label ("THE DRIVER", "THE ANGLER"). Above the title sit five
  gold stars and a fictional newspaper quote; the title band adds a
  starburst "ORIGINAL COVER ART" seal, an "EST. 2026" roundel, a "VOL. 01"
  badge and a "COLLECTOR'S EDITION" ribbon, plus a "WANTED ★★★★★" tag in
  the corner. A tagline strip runs under the title and a dense footer
  (studio, "STARRING YOU", "SHOT ON YOUR OWN CAMERA", catalogue number and
  a barcode drawn in code) closes the cover. Every word is editable and
  every badge can be switched off.
- **Your own words** — edit the title, the pink script line under it, the
  quote, the tagline and the footer; the lettering is drawn in bold
  condensed capitals with a gradient fill and a dark outline.
- **One-click export** — PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## How to use it

1. Serve the app locally: `node serve.ts`, then open
   <http://localhost:8080>.
2. Pick a layout and a grade, drop in a photo, write your title.
3. Click **Export PNG** — the file downloads straight from your browser.

Everything runs offline from the static files under `app/`. Photos are read
on your own machine and never uploaded anywhere.

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the dark studio shell.
- `app/src/main.js` — wires the editor: photos, panels, export.
- `app/src/cover.js` — the cover renderer: panels, grades, the cartoon
  filter (posterized flat colours + dark comic outlines for every photo
  panel), procedural sunset art (slatted sun, skyline and palm silhouettes,
  halftone dots), per-panel caption chips and character labels, the star
  rating and newspaper quote, the starburst seal and badges, the tagline
  strip, the dense footer with a barcode, and the title band.
- `app/src/grades.js` — the four grade palettes.
- `app/src/layouts.js` — the five panel layouts and the cover's frame and
  band zones (panel zone, quote strip, title band, tagline strip, footer).
- `app/src/shots.js` — the fixed `?shot=` scenes used for screenshots.
- `app/samples/` — the two bundled sample illustrations: original
  flat-vector cartoon art generated for this entry (no real people).
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json` with `vendor/makefun-app.ts`.

## Originality

All art, lettering and fonts in this app are original and drawn in code. There
is no Rockstar Games logo, no official GTA artwork and no Rockstar font
anywhere in it; the lettering uses only the system font stack. The sample
illustrations are original cartoon art made for this entry, and no photograph
of a real person appears anywhere in the app or its screenshots.
