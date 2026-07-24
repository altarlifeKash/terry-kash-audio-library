#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCatalog } from "./lib/catalog.mjs";
import {
  openBandcampBrowser,
  verifyBandcampLinks
} from "./lib/bandcamp-browser.mjs";

const root = resolve(import.meta.dirname, "..");
const checkImportedLinks = process.argv.includes("--check-imported-links");
const library = JSON.parse(
  await readFile(resolve(root, "data/library.json"), "utf8")
);
const status = JSON.parse(
  await readFile(resolve(root, "data/sync-status.json"), "utf8")
);
const errors = validateCatalog(library);

if (status.libraryReleaseCount !== library.releases.length) {
  errors.push(
    "Sync status libraryReleaseCount does not match data/library.json."
  );
}
if (!Array.isArray(status.imported)) {
  errors.push("Sync status imported must be an array.");
}
if (status.newReleaseCount !== status.imported?.length) {
  errors.push("Sync status newReleaseCount does not match imported releases.");
}
if (errors.length > 0) {
  throw new Error(`Validation failed:\n- ${errors.join("\n- ")}`);
}

if (checkImportedLinks && status.imported.length > 0) {
  const { browser, context } = await openBandcampBrowser();
  try {
    await verifyBandcampLinks(
      context,
      status.imported.map((release) => release.bandcampUrl)
    );
  } finally {
    await browser.close();
  }
}

process.stdout.write(
  `Validated ${library.releases.length} unique releases` +
    `${checkImportedLinks ? ` and ${status.imported.length} imported links` : ""}.\n`
);
