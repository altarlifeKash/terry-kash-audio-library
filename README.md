# The Terry Kashian Library

The Terry Kashian Library is a dependency-free static website for songs, albums,
audiobooks, stories, teachings, and multilingual works. GitHub Pages serves the
files directly with no production build step. The synchronization automation
uses Node.js tooling, but the published site remains plain HTML, CSS, JavaScript,
and JSON.

Bandcamp remains the official listening and purchasing destination:
<https://terrykash.bandcamp.com>

## Previewing the site

Open `index.html` directly in a browser for a quick preview of the entrance page.
Selecting the poster's “Enter the Library” area opens `library.html`, which
contains the Phase One category homepage. Both pages work from `file://` URLs
as well as through GitHub Pages.

For testing catalog loading locally, serve the repository with any simple static
web server and open the local URL it provides. No server is needed in production
beyond GitHub Pages.

## Catalog data

Catalog entries belong in `data/library.json` inside the `releases` array. New
entries use this shape:

```json
{
  "releases": [
    {
      "id": "example-release",
      "title": "Example Release",
      "type": "song",
      "language": "English",
      "releaseDate": "2026-01-01",
      "description": "A short, welcoming description of the work.",
      "artwork": "assets/covers/example-release.jpg",
      "bandcampUrl": "https://terrykash.bandcamp.com/track/example-release",
      "featured": false
    }
  ]
}
```

Supported initial `type` values should be `song`, `album`, `audiobook`, and
`story`. The Languages and New Releases views can be derived from the language
and release date fields rather than duplicating entries.

## Automatic Bandcamp sync

The `Sync Bandcamp catalog` GitHub Actions workflow reads Terry's public
Bandcamp music page, compares normalized release URLs with `data/library.json`,
and appends only releases that are not already present. Existing release objects
are not reserialized or edited.

The workflow:

- runs every day at 17:15 UTC (10:15 a.m. Arizona time);
- can be started manually from **Actions → Sync Bandcamp catalog → Run workflow**;
- reads each new Bandcamp release's title, canonical URL, artwork, description,
  and release date;
- classifies Bandcamp albums, audiobook-titled releases, tracks, and supported
  languages using conservative metadata and writing-system rules;
- validates the JSON schema, unique IDs, unique normalized Bandcamp URLs, and
  every newly imported Bandcamp link before committing; and
- commits only `data/library.json` and `data/sync-status.json` after validation
  succeeds.

Bandcamp currently performs a JavaScript browser check, so the workflow uses a
headless Chromium browser and deliberately fails if it receives the challenge
page or an incomplete catalog. A failed run cannot commit partial data.

The public [`sync-status.html`](sync-status.html) page reads
`data/sync-status.json` and displays the latest successful run, total releases,
new release count, and the titles imported by that run.

### Running locally

Node.js 20 or newer is required.

```sh
npm ci
npx playwright install chromium
npm test
npm run sync:dry-run
npm run sync
npm run validate -- --check-imported-links
```

`npm run sync:dry-run` reads the live catalog and reports changes without writing
files. `npm run sync` updates the catalog and status report. Only run the latter
on the feature branch or when you intend to keep the new releases.

## Files

- `index.html` is the full-window poster entrance page.
- `entrance.css` positions the original poster and its accessible entrance hotspot.
- `entrance.js` provides explicit keyboard activation for the entrance hotspot.
- `library.html` contains the Phase One library homepage and category cards.
- `styles.css` contains the responsive design and accessibility states.
- `script.js` handles category feedback, the current year, and catalog loading.
- `data/library.json` contains release metadata.
- `data/sync-status.json` contains the latest successful synchronization report.
- `sync-status.html` shows whether the automatic catalog sync is current.
- `scripts/` contains the Bandcamp importer and catalog validator.
- `.github/workflows/sync-bandcamp.yml` schedules and runs the synchronization.
- `terry_kash_library_enter_poster.png` is the original featured poster.
- `.nojekyll` tells GitHub Pages to serve the repository as a plain static site.

## Publishing

Publishing continues through the repository's existing GitHub Pages setup. Keep
the current repository name and Pages source unchanged to preserve the public URL.
