# Vice Coast Cover Lab

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/haidildariell/gta6-cover-art-01-v5b/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/haidildariell/gta6-cover-art-01-v5b/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Bounty: https://make.fun/bounty/gta6-cover-art-01

Turn your photos into GTA-style multi-panel poster cover art — sunset and neon grades, bold gradient lettering, halftone poster ink — and export a PNG to share. Everything runs offline in your browser; photos never leave your machine.

## What it does

- **Any photo**: upload photos from your machine, or tap a sample photo to fill every panel with it. One photo can fill several panels, or each panel can hold a different photo.
- **Crop and position per panel**: click a panel to select it, drag to pan the photo, scroll to zoom, or use the zoom / pan sliders.
- **6 layouts**: Photo Grid (9-panel with title block), Hero + Three, Full Bleed, Tilted Snapshots, Four Panel, Two Panel Split.
- **6 grades**: Sunset, Neon Nights, Teal Noir, Rose Gold, Mono Poster, and Poster Ink — a real canvas effect (gradient-map duotone + posterize + halftone dots), plus film grain and a vignette.
- **Lettering**: giant gradient title in a condensed display face, neon script subtitle, starburst "NEW SUMMER 2026" badge, eyebrow and tagline strip — all editable.
- **One-click presets**: Photo Cover, Hero Photo, Neon Night.
- **Undo / redo** for every change.
- **Export PNG** in 1080 × 1080, 1080 × 1350 and 1920 × 1080.

## How to run

Any static server works. From this repo:

```sh
node serve.ts
```

Then open http://localhost:8080 — no network needed, no build step. Or serve `app/` with any static file server of your choice.

## How to use it

1. Upload your photos, or tap a sample photo.
2. Pick a layout and a grade.
3. Edit the title, subtitle, eyebrow and tagline.
4. Click a panel to crop and position its photo.
5. Export a PNG in the size you want and post it.

## Sample photos

Sample photos generated with an image model for this entry; no real person depicted. They live in `app/samples/` and load as the default cover on first open.

## Fonts

- Anton (SIL Open Font License) — condensed display face for titles.
- Pacifico (SIL Open Font License) — script face for the neon subtitle.

Both ship as files under `app/fonts/` with their OFL licence texts beside them. No Rockstar Games logo, artwork or font is used anywhere in this entry.
