import { chromium } from "playwright";
import { normalizeBandcampUrl } from "./catalog.mjs";

const CATALOG_URL = "https://terrykash.bandcamp.com/music";
const CHALLENGE_TITLE = "Client Challenge";

async function waitForBandcamp(page, readySelector) {
  await page.waitForFunction(
    ({ challengeTitle, selector }) =>
      document.title !== challengeTitle &&
      document.querySelector(selector) !== null,
    { challengeTitle: CHALLENGE_TITLE, selector: readySelector },
    { timeout: 90000 }
  );
}

export async function openBandcampBrowser() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
      `(KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`
  });
  return { browser, context };
}

export async function readCatalog(context) {
  const page = await context.newPage();
  try {
    await page.goto(CATALOG_URL, {
      waitUntil: "domcontentloaded",
      timeout: 90000
    });
    await waitForBandcamp(page, ".music-grid-item a");

    const items = await page.locator(".music-grid-item a").evaluateAll((links) =>
      links.map((link) => ({
        title: (link.textContent || "").trim(),
        url: link.href,
        artwork:
          link.querySelector("img")?.src ||
          link.parentElement?.querySelector("img")?.src ||
          ""
      }))
    );

    const unique = new Map();
    for (const item of items) {
      if (!item.title || !/\/(track|album)\//u.test(item.url)) continue;
      unique.set(normalizeBandcampUrl(item.url), item);
    }
    if (unique.size === 0) {
      throw new Error("Bandcamp returned no catalog releases.");
    }
    return [...unique.values()];
  } finally {
    await page.close();
  }
}

export async function readRelease(context, catalogItem) {
  const page = await context.newPage();
  try {
    const response = await page.goto(catalogItem.url, {
      waitUntil: "domcontentloaded",
      timeout: 90000
    });
    if (!response || !response.ok()) {
      throw new Error(
        `Bandcamp link returned HTTP ${response?.status() || "unknown"}: ${catalogItem.url}`
      );
    }

    await waitForBandcamp(page, "[data-tralbum]");
    const result = await page.evaluate(() => {
      const tralbumElement = document.querySelector("[data-tralbum]");
      const tralbum = JSON.parse(tralbumElement.getAttribute("data-tralbum"));
      const structuredElement = document.querySelector(
        'script[type="application/ld+json"]'
      );
      const structured = structuredElement
        ? JSON.parse(structuredElement.textContent)
        : {};
      const current = tralbum.current || {};
      const artwork =
        Array.isArray(structured.image) && structured.image.length > 0
          ? structured.image[0]
          : typeof structured.image === "string"
            ? structured.image
            : tralbum.art_id
              ? `https://f4.bcbits.com/img/a${tralbum.art_id}_10.jpg`
              : "";

      return {
        title: current.title || structured.name || "",
        url: tralbum.url || structured["@id"] || location.href,
        itemId: tralbum.id || current.id || "",
        itemType: tralbum.item_type || current.type || "",
        description: current.about || structured.description || "",
        lyrics: current.lyrics || "",
        releaseDate:
          current.release_date ||
          tralbum.album_release_date ||
          current.publish_date ||
          structured.datePublished ||
          "",
        artwork,
        keywords: Array.isArray(structured.keywords)
          ? structured.keywords
          : []
      };
    });

    if (
      !result.title ||
      !result.artwork ||
      normalizeBandcampUrl(result.url) !== normalizeBandcampUrl(catalogItem.url)
    ) {
      throw new Error(`Bandcamp metadata is incomplete for ${catalogItem.url}`);
    }
    return result;
  } finally {
    await page.close();
  }
}

export async function verifyBandcampLinks(context, links) {
  const page = await context.newPage();
  try {
    for (const link of links) {
      const response = await page.goto(link, {
        waitUntil: "domcontentloaded",
        timeout: 90000
      });
      if (!response || !response.ok()) {
        throw new Error(
          `Bandcamp link returned HTTP ${response?.status() || "unknown"}: ${link}`
        );
      }
      await waitForBandcamp(page, "[data-tralbum]");
      const canonical = await page
        .locator('meta[property="og:url"]')
        .getAttribute("content");
      if (
        !canonical ||
        normalizeBandcampUrl(canonical) !== normalizeBandcampUrl(link)
      ) {
        throw new Error(`Bandcamp link did not resolve to its release page: ${link}`);
      }
    }
  } finally {
    await page.close();
  }
}
