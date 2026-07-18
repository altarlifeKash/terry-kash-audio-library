# The Terry Kashian Library

The Terry Kashian Library is a dependency-free static website for songs, albums,
audiobooks, stories, teachings, and multilingual works. GitHub Pages serves the
files directly; there is no build step or package manager.

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

Catalog entries belong in `data/library.json` inside the `releases` array. The
first release will replace the current empty array. Use this sample shape:

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

## Files

- `index.html` is the full-window poster entrance page.
- `entrance.css` positions the original poster and its accessible entrance hotspot.
- `entrance.js` provides explicit keyboard activation for the entrance hotspot.
- `library.html` contains the Phase One library homepage and category cards.
- `styles.css` contains the responsive design and accessibility states.
- `script.js` handles category feedback, the current year, and catalog loading.
- `data/library.json` contains release metadata.
- `terry_kash_library_enter_poster.png` is the original featured poster.
- `.nojekyll` tells GitHub Pages to serve the repository as a plain static site.

## Publishing

Publishing continues through the repository's existing GitHub Pages setup. Keep
the current repository name and Pages source unchanged to preserve the public URL.
