
"use strict";

/**
 * PAY54 Enterprise News Feed Policy v1.0.0
 *
 * Pure, provider-independent, server-side validation.
 * No network requests, secrets, persistence, DOM access
 * or financial data modifications.
 */

export const NEWS_FEED_LIMIT = 5;

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const MAX_TEXT = Object.freeze({
  title: 160,
  summary: 360,
  publisher: 90,
  id: 160
});

const CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

const MARKUP =
  /<[^>]*>|&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/iu;

function plainText(value, maximum) {
  if (typeof value !== "string") return null;

  const result = value.trim().replace(/\s+/gu, " ");

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

function validatedUrl(value, allowedHosts) {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !allowedHosts.length
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

    if (
      !allowedHosts.some(
        host =>
          parsed.hostname.toLowerCase() === host
      )
    ) {
      return null;
    }

    parsed.hash = "";

    return parsed.toString();
  } catch {
    return null;
  }
}

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

function normalizeHostnames(input) {
  if (!Array.isArray(input)) {
    throw new TypeError(
      "allowedHosts must be an array"
    );
  }

  const result = input.map(value => {
    if (
      typeof value !== "string" ||
      !/^(?:[a-z\d-]+\.)+[a-z]{2,}$/iu.test(value)
    ) {
      throw new TypeError(
        "allowedHosts entries must be DNS hostnames, not URLs or wildcard patterns"
      );
    }

    return value.toLowerCase();
  });

  return Object.freeze([...new Set(result)]);
}

/**
 * Select up to five validated articles.
 *
 * Required candidate fields:
 * id, title, summary, publisher, url,
 * publishedAt, displayRights.
 *
 * displayRights must be assigned by a trusted
 * server-side provider adapter after confirming
 * the applicable licensing arrangements.
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
