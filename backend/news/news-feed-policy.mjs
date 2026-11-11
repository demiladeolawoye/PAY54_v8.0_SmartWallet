
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — NEWS FEED POLICY
   File: backend/news/news-feed-policy.mjs
   Version: 1.1.0
   Phase: 2G-AD

   Responsibilities:
   - Validate provider-independent news candidates
   - Require explicit display rights
   - Enforce exact approved publisher URL hostnames
   - Preserve human-readable publisher display names
   - Reject malformed DNS configuration and ambiguous URLs
   - Limit, deduplicate and order approved articles
   - Return immutable, serialisable news metadata

   Security boundaries:
   - No network requests
   - No credentials
   - No persistence
   - No customer financial data
   - No provider activation
   ========================================================================== */

export const NEWS_FEED_LIMIT = 5;

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_URL_LENGTH = 2048;
const MAX_HOST_LENGTH = 253;
const MAX_HOST_LABEL_LENGTH = 63;
const MAX_HOST_COUNT = 100;

const MAX_TEXT = Object.freeze({
  title: 160,
  summary: 360,
  publisher: 90,
  id: 160
});

const CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

const URL_CONTROL_CHARACTERS =
  /[\u0000-\u0020\u007F]/u;

const MARKUP =
  /<[^>]*>|&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/iu;

const DNS_LABEL =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u;

const DNS_TLD =
  /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/u;

/* ========================================================================
   TEXT VALIDATION
   ======================================================================== */

function plainText(value, maximum) {
  if (typeof value !== "string") {
    return null;
  }

  const result = value
    .trim()
    .replace(/\s+/gu, " ");

  if (
    !result ||
    result.length > maximum ||
    CONTROL_CHARACTERS.test(value) ||
    MARKUP.test(result)
  ) {
    return null;
  }

  return result;
}

/* ========================================================================
   DNS HOSTNAME VALIDATION
   ======================================================================== */

function validateHostname(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_HOST_LENGTH ||
    value !== value.trim() ||
    /[^\x00-\x7F]/u.test(value)
  ) {
    return null;
  }

  const hostname = value.toLowerCase();

  const labels = hostname.split(".");

  if (
    labels.length < 2 ||
    labels.some(
      label =>
        label.length < 1 ||
        label.length > MAX_HOST_LABEL_LENGTH ||
        !DNS_LABEL.test(label)
    ) ||
    !DNS_TLD.test(labels[labels.length - 1])
  ) {
    return null;
  }

  return hostname;
}

function normalizeHostnames(input) {
  if (
    !Array.isArray(input) ||
    input.length > MAX_HOST_COUNT
  ) {
    throw new TypeError(
      "allowedHosts must be an array of no more than 100 DNS hostnames"
    );
  }

  const result = input.map(value => {
    const hostname = validateHostname(value);

    if (!hostname) {
      throw new TypeError(
        "allowedHosts entries must be valid DNS hostnames, not URLs or wildcard patterns"
      );
    }

    return hostname;
  });

  return Object.freeze([...new Set(result)]);
}

/* ========================================================================
   ARTICLE URL VALIDATION
   ======================================================================== */

function validatedUrl(value, allowedHosts) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_URL_LENGTH ||
    allowedHosts.length === 0 ||
    value !== value.trim() ||
    URL_CONTROL_CHARACTERS.test(value) ||
    value.includes("\\")
  ) {
    return null;
  }

  try {
    const parsed = new URL(value);

    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      (
        parsed.port &&
        parsed.port !== "443"
      )
    ) {
      return null;
    }

    const hostname = validateHostname(
      parsed.hostname
    );

    if (
      !hostname ||
      !allowedHosts.includes(hostname)
    ) {
      return null;
    }

    parsed.hash = "";

    const canonical = parsed.toString();

    if (
      canonical.length > MAX_URL_LENGTH
    ) {
      return null;
    }

    return canonical;
  } catch {
    return null;
  }
}

/* ========================================================================
   TIMESTAMP VALIDATION
   ======================================================================== */

function validatedTimestamp(value, now) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/u
      .test(value)
  ) {
    return null;
  }

  const milliseconds = Date.parse(value);

  if (
    !Number.isFinite(milliseconds) ||
    milliseconds > now + MAX_CLOCK_SKEW_MS ||
    milliseconds < Date.UTC(2000, 0, 1)
  ) {
    return null;
  }

  return new Date(milliseconds).toISOString();
}

/* ========================================================================
   NEWS SELECTION
   ======================================================================== */

/**
 * Select up to five validated articles.
 *
 * Required candidate fields:
 * id, title, summary, publisher, url,
 * publishedAt, displayRights.
 *
 * Publisher is a human-readable display name.
 * It is not required to equal the article URL hostname.
 *
 * displayRights must originate from a trusted provider
 * adapter following separately verified licensing approval.
 * This function cannot independently establish legal rights.
 */
export function selectApprovedNews(
  candidates,
  options = {}
) {
  if (!Array.isArray(candidates)) {
    throw new TypeError(
      "candidates must be an array"
    );
  }

  const allowedHosts = normalizeHostnames(
    options.allowedHosts ?? []
  );

  const now = options.now instanceof Date
    ? options.now.getTime()
    : Date.now();

  if (!Number.isFinite(now)) {
    throw new TypeError(
      "now must be a valid Date"
    );
  }

  const limit =
    options.limit ?? NEWS_FEED_LIMIT;

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > NEWS_FEED_LIMIT
  ) {
    throw new RangeError(
      `limit must be between 1 and ${NEWS_FEED_LIMIT}`
    );
  }

  const accepted = [];
  const seen = new Set();
  let rejected = 0;

  for (const candidate of candidates) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      rejected++;
      continue;
    }

    const id = plainText(
      candidate.id,
      MAX_TEXT.id
    );

    const title = plainText(
      candidate.title,
      MAX_TEXT.title
    );

    const summary = plainText(
      candidate.summary,
      MAX_TEXT.summary
    );

    const publisher = plainText(
      candidate.publisher,
      MAX_TEXT.publisher
    );

    const url = validatedUrl(
      candidate.url,
      allowedHosts
    );

    const publishedAt = validatedTimestamp(
      candidate.publishedAt,
      now
    );

    if (
      !id ||
      !title ||
      !summary ||
      !publisher ||
      !url ||
      !publishedAt ||
      candidate.displayRights !== true
    ) {
      rejected++;
      continue;
    }

    const key =
      `${publisher.toLowerCase()}::${id.toLowerCase()}`;

    if (seen.has(key)) {
      rejected++;
      continue;
    }

    seen.add(key);

    accepted.push(
      Object.freeze({
        id,
        title,
        summary,
        publisher,
        url,
        publishedAt
      })
    );
  }

  accepted.sort(
    (a, b) =>
      Date.parse(b.publishedAt) -
        Date.parse(a.publishedAt) ||
      a.publisher.localeCompare(b.publisher) ||
      a.id.localeCompare(b.id)
  );

  return Object.freeze({
    items: Object.freeze(
      accepted.slice(0, limit)
    ),
    rejected,
    received: candidates.length,
    generatedAt: new Date(now).toISOString()
  });
}
