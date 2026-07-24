import assert from "node:assert/strict";
import test from "node:test";
import {
  appendReleasesPreservingExisting,
  buildRelease,
  detectLanguage,
  normalizeBandcampUrl,
  validateCatalog
} from "../scripts/lib/catalog.mjs";

test("normalizes Bandcamp URLs for duplicate detection", () => {
  assert.equal(
    normalizeBandcampUrl(
      "https://TERRYKASH.bandcamp.com/track/example/?from=fanpub_fnb"
    ),
    "https://terrykash.bandcamp.com/track/example"
  );
});

test("detects supported non-Latin languages", () => {
  assert.equal(detectLanguage({ title: "యేసు సహాయం యొక్క రాయి" }), "Telugu");
  assert.equal(detectLanguage({ title: "Կենաց Ծառը" }), "Armenian");
  assert.equal(detectLanguage({ title: "我的画像" }), "Chinese");
  assert.equal(detectLanguage({ title: "میری زندگی کی تصویر" }), "Urdu");
});

test("builds a release from Bandcamp metadata", () => {
  const release = buildRelease(
    {
      title: "New Song",
      url: "https://terrykash.bandcamp.com/track/new-song",
      itemId: 42,
      description: "First paragraph.\n\nSecond paragraph.",
      lyrics: "",
      releaseDate: "22 Jul 2026 22:51:02 GMT",
      artwork: "https://f4.bcbits.com/img/a1_10.jpg",
      keywords: []
    },
    new Set()
  );

  assert.deepEqual(release, {
    id: "new-song",
    title: "New Song",
    type: "song",
    language: "English",
    releaseDate: "2026-07-22",
    description: "First paragraph.",
    artwork: "https://f4.bcbits.com/img/a1_10.jpg",
    bandcampUrl: "https://terrykash.bandcamp.com/track/new-song",
    featured: false,
    reviewFlags: []
  });
});

test("uses a stable Bandcamp id when a URL has no readable slug", () => {
  const release = buildRelease(
    {
      title: "యేసు సహాయం యొక్క రాయి",
      url: "https://terrykash.bandcamp.com/track/--5",
      itemId: 1653843110,
      description: "A Telugu recording.",
      lyrics: "విగ్రహాలను విడిచితిమి",
      releaseDate: "19 Jul 2026 04:56:34 GMT",
      artwork: "https://f4.bcbits.com/img/a2_10.jpg",
      keywords: []
    },
    new Set()
  );
  assert.equal(release.id, "bandcamp-track-1653843110");
});

test("appends releases without reserializing existing entries", () => {
  const source = '{\n  "releases": [\n    { "id": "keep-formatting" }\n  ]\n}\n';
  const appended = appendReleasesPreservingExisting(source, [
    { id: "new-release" }
  ]);
  assert.match(appended, /\{ "id": "keep-formatting" \},/u);
  assert.equal(JSON.parse(appended).releases.length, 2);
});

test("validation rejects duplicate ids and normalized URLs", () => {
  const release = {
    id: "same",
    title: "Example",
    type: "song",
    language: "English",
    releaseDate: "2026-07-22",
    description: "",
    artwork: "https://f4.bcbits.com/img/a1_10.jpg",
    bandcampUrl: "https://terrykash.bandcamp.com/track/example",
    featured: false
  };
  const errors = validateCatalog({
    releases: [
      release,
      { ...release, bandcampUrl: `${release.bandcampUrl}/?from=test` }
    ]
  });
  assert.ok(errors.some((error) => error.includes("Duplicate release id")));
  assert.ok(errors.some((error) => error.includes("Duplicate Bandcamp URL")));
});
