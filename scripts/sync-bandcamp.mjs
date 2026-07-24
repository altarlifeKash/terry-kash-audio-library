#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  appendReleasesPreservingExisting,
  buildRelease,
  normalizeBandcampUrl,
  validateCatalog
} from "./lib/catalog.mjs";
import {
  openBandcampBrowser,
  readCatalog,
  readRelease
} from "./lib/bandcamp-browser.mjs";

const root = resolve(import.meta.dirname, "..");
const libraryPath = resolve(root, "data/library.json");
const statusPath = resolve(root, "data/sync-status.json");
const dryRun = process.argv.includes("--dry-run");
const detailsFileIndex = process.argv.indexOf("--details-file");
const detailsFile =
  detailsFileIndex >= 0 ? process.argv[detailsFileIndex + 1] : null;
if (detailsFileIndex >= 0 && !detailsFile) {
  throw new Error("--details-file requires a JSON file path.");
}
const source = await readFile(libraryPath, "utf8");
const catalog = JSON.parse(source);
const existingErrors = validateCatalog(catalog);
if (existingErrors.length > 0) {
  throw new Error(`Existing catalog is invalid:\n- ${existingErrors.join("\n- ")}`);
}

const knownUrls = new Set(
  catalog.releases.map((release) => normalizeBandcampUrl(release.bandcampUrl))
);
const usedIds = new Set(catalog.releases.map((release) => release.id));
let browser;

try {
  let bandcampCatalogCount;
  let details;
  if (detailsFile) {
    const fixture = JSON.parse(await readFile(resolve(detailsFile), "utf8"));
    if (
      !Number.isInteger(fixture.catalogReleaseCount) ||
      !Array.isArray(fixture.details)
    ) {
      throw new Error(
        "Details file must contain catalogReleaseCount and a details array."
      );
    }
    bandcampCatalogCount = fixture.catalogReleaseCount;
    details = fixture.details.filter(
      (detail) => !knownUrls.has(normalizeBandcampUrl(detail.url))
    );
  } else {
    const opened = await openBandcampBrowser();
    browser = opened.browser;
    const bandcampCatalog = await readCatalog(opened.context);
    bandcampCatalogCount = bandcampCatalog.length;
    const newItems = bandcampCatalog.filter(
      (item) => !knownUrls.has(normalizeBandcampUrl(item.url))
    );
    details = [];
    for (const item of newItems) {
      process.stdout.write(`Reading ${item.title}...\n`);
      details.push(await readRelease(opened.context, item));
    }
  }

  const imported = details.map((detail) => buildRelease(detail, usedIds));
  const updatedSource = appendReleasesPreservingExisting(source, imported);
  const updatedCatalog = JSON.parse(updatedSource);
  const errors = validateCatalog(updatedCatalog);
  if (errors.length > 0) {
    throw new Error(`Updated catalog is invalid:\n- ${errors.join("\n- ")}`);
  }

  const status = {
    lastSync: new Date().toISOString(),
    catalogReleaseCount: bandcampCatalogCount,
    libraryReleaseCount: updatedCatalog.releases.length,
    newReleaseCount: imported.length,
    imported: imported.map((release) => ({
      title: release.title,
      bandcampUrl: release.bandcampUrl
    })),
    outcome: "success"
  };

  if (!dryRun) {
    await writeFile(libraryPath, updatedSource);
    await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`);
  }

  process.stdout.write(
    `${dryRun ? "Dry run: " : ""}${bandcampCatalogCount} Bandcamp releases; ` +
      `${imported.length} new; ${updatedCatalog.releases.length} in library.\n`
  );
  for (const release of imported) {
    process.stdout.write(`+ ${release.title}\n`);
  }
} finally {
  await browser?.close();
}
