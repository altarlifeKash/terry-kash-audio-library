const SUPPORTED_TYPES = new Set(["song", "album", "audiobook", "story"]);

export function normalizeBandcampUrl(value) {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export function formatBandcampDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function classifyType({ title, url, keywords = [] }) {
  const normalizedTitle = String(title || "").toLocaleLowerCase();
  const normalizedKeywords = keywords
    .map((keyword) => String(keyword).toLocaleLowerCase())
    .join(" ");

  if (/\baudio\s*book\b/.test(normalizedTitle)) return "audiobook";
  if (new URL(url).pathname.startsWith("/album/")) return "album";
  if (
    /\b(spoken word|storytelling)\b/.test(normalizedKeywords) &&
    /\b(story|tale|narration)\b/.test(normalizedTitle)
  ) {
    return "story";
  }
  return "song";
}

export function detectLanguage({ title = "", description = "", lyrics = "" }) {
  const heading = String(title);
  const body = `${description}\n${lyrics}`.slice(0, 12000);
  const samples = [heading, body];
  const scriptRules = [
    ["Armenian", /[\u0530-\u058f]/gu],
    ["Telugu", /[\u0c00-\u0c7f]/gu],
    ["Chinese", /[\u3400-\u4dbf\u4e00-\u9fff]/gu],
    ["Urdu", /[\u0600-\u06ff\u0750-\u077f]/gu]
  ];

  for (const sample of samples) {
    for (const [language, pattern] of scriptRules) {
      const matches = sample.match(pattern);
      if (matches && matches.length >= (sample === heading ? 1 : 8)) {
        return language;
      }
    }
  }

  const normalizedHeading = heading.toLocaleLowerCase();
  const normalized = `${heading}\n${body}`.toLocaleLowerCase();
  if (
    /[ñ¿¡]/u.test(heading) ||
    /\b(el|la|los|las|señor|reino|corazón|español)\b/u.test(normalizedHeading)
  ) {
    return "Spanish";
  }
  if (
    /\b(tagalog|filipino)\b/u.test(normalized) ||
    /^(ang|aking|ako|ikaw|panginoon)\b/u.test(normalizedHeading)
  ) {
    return "Tagalog";
  }
  return "English";
}

export function makeUniqueId({ title, url, itemId }, usedIds) {
  const pathPart = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
  const slugify = (value) =>
    String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "");
  const itemKind = new URL(url).pathname.startsWith("/album/") ? "album" : "track";
  const base =
    (/^[a-z]/u.test(slugify(pathPart)) ? slugify(pathPart) : "") ||
    slugify(title) ||
    `bandcamp-${itemKind}-${itemId}`;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

export function summarizeDescription(value, maximumLength = 420) {
  const description = String(value || "")
    .replace(/\r\n?/gu, "\n")
    .split(/\n\s*\n/u)[0]
    .replace(/\s+/gu, " ")
    .trim();
  if (description.length <= maximumLength) return description;
  return `${description.slice(0, maximumLength - 1).trimEnd()}…`;
}

export function buildRelease(detail, usedIds) {
  const title = String(detail.title || "").trim();
  const bandcampUrl = normalizeBandcampUrl(detail.url);
  const description = summarizeDescription(detail.description);
  const releaseDate = formatBandcampDate(detail.releaseDate);
  const reviewFlags = [];
  if (!description) reviewFlags.push("description");
  if (!releaseDate) reviewFlags.push("releaseDate");

  return {
    id: makeUniqueId(
      { title, url: bandcampUrl, itemId: detail.itemId },
      usedIds
    ),
    title,
    type: classifyType(detail),
    language: detectLanguage({
      title,
      description: detail.description,
      lyrics: detail.lyrics
    }),
    releaseDate,
    description,
    artwork: detail.artwork,
    bandcampUrl,
    featured: false,
    reviewFlags
  };
}

export function appendReleasesPreservingExisting(source, newReleases) {
  if (newReleases.length === 0) return source;
  const propertyIndex = source.indexOf('"releases"');
  if (propertyIndex < 0) {
    throw new Error('Catalog JSON does not contain a "releases" property.');
  }
  const arrayStart = source.indexOf("[", propertyIndex);
  if (arrayStart < 0) {
    throw new Error('Catalog "releases" property is not an array.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let arrayEnd = -1;
  for (let index = arrayStart; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = index;
        break;
      }
    }
  }
  if (arrayEnd < 0) {
    throw new Error('Catalog "releases" array is not closed.');
  }

  const existing = JSON.parse(source).releases;
  const serialized = newReleases
    .map((release) =>
      JSON.stringify(release, null, 2)
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n")
    )
    .join(",\n");
  const separator = existing.length > 0 ? ",\n" : "\n";
  const before = source.slice(0, arrayEnd).replace(/\s*$/u, "");
  return `${before}${separator}${serialized}\n  ${source.slice(arrayEnd)}`;
}

export function validateCatalog(catalog) {
  const errors = [];
  if (!catalog || !Array.isArray(catalog.releases)) {
    return ['The root object must contain a "releases" array.'];
  }

  const ids = new Set();
  const urls = new Set();
  catalog.releases.forEach((release, index) => {
    const label = `releases[${index}]`;
    for (const field of [
      "id",
      "title",
      "type",
      "language",
      "releaseDate",
      "artwork",
      "bandcampUrl"
    ]) {
      if (typeof release[field] !== "string") {
        errors.push(`${label}.${field} must be a string.`);
      }
    }
    if (ids.has(release.id)) errors.push(`Duplicate release id: ${release.id}`);
    ids.add(release.id);

    try {
      const normalizedUrl = normalizeBandcampUrl(release.bandcampUrl);
      if (urls.has(normalizedUrl)) {
        errors.push(`Duplicate Bandcamp URL: ${normalizedUrl}`);
      }
      urls.add(normalizedUrl);
      if (!normalizedUrl.startsWith("https://terrykash.bandcamp.com/")) {
        errors.push(`${label}.bandcampUrl must point to Terry Kashian's Bandcamp.`);
      }
    } catch {
      errors.push(`${label}.bandcampUrl is invalid.`);
    }
    if (!SUPPORTED_TYPES.has(release.type)) {
      errors.push(`${label}.type is unsupported: ${release.type}`);
    }
    if (
      release.releaseDate &&
      !/^\d{4}-\d{2}-\d{2}$/u.test(release.releaseDate)
    ) {
      errors.push(`${label}.releaseDate must use YYYY-MM-DD.`);
    }
    if (release.artwork && !/^https:\/\//u.test(release.artwork)) {
      errors.push(`${label}.artwork must use HTTPS.`);
    }
  });
  return errors;
}
