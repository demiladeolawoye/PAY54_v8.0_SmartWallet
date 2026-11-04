
"use strict";

import { selectApprovedNews } from "./news-feed-policy.mjs";

/**
 * PAY54 Financial News Service v1.0.0.
 *
 * Provider-independent, fail-closed, memory-only cache.
 *
 * Publication rights are not granted here. A trusted
 * provider adapter must verify them before supplying
 * candidates with displayRights: true.
 *
 * No network connection, HTTP listener, file write,
 * database operation or financial-data mutation occurs here.
 */
export function createNewsService({
  loadCandidates,
  allowedHosts,
  now = () => Date.now(),
  ttlMs = 5 * 60_000,
  staleMs = 60 * 60_000,
  maxCandidates = 100
} = {}) {
  if (typeof loadCandidates !== "function") {
    throw new TypeError(
      "loadCandidates must be a function"
    );
  }

  if (
    !Array.isArray(allowedHosts) ||
    allowedHosts.length === 0
  ) {
    throw new TypeError(
      "allowedHosts must contain licensed publisher hostnames"
    );
  }

  if (typeof now !== "function") {
    throw new TypeError(
      "now must be a function"
    );
  }

  if (
    ![ttlMs, staleMs, maxCandidates].every(
      Number.isSafeInteger
    ) ||
    ttlMs < 1 ||
    staleMs < ttlMs ||
    maxCandidates < 1 ||
    maxCandidates > 1000
  ) {
    throw new RangeError(
      "Invalid TTL, stale window, or candidate limit"
    );
  }

  let cached = null;
  let cachedAt = 0;
  let inFlight = null;

  const clock = () => {
    const timestamp = now();

    if (
      !Number.isSafeInteger(timestamp) ||
      timestamp < 0
    ) {
      throw new TypeError(
        "Clock must return a nonnegative epoch millisecond integer"
      );
    }

    return timestamp;
  };

  const snapshot = (entry, stale) =>
    Object.freeze({
      status: stale ? "stale" : "fresh",
      items: entry.items,
      updatedAt: entry.generatedAt,
      count: entry.items.length
    });

  const empty = () =>
    Object.freeze({
      status: "unavailable",
      items: Object.freeze([]),
      updatedAt: null,
      count: 0
    });

  const refresh = async () => {
    const candidates = await loadCandidates();

    if (
      !Array.isArray(candidates) ||
      candidates.length > maxCandidates
    ) {
      throw new TypeError(
        "Provider returned invalid or excessive article candidates"
      );
    }

    const checked = selectApprovedNews(candidates, {
      allowedHosts,
      now: new Date(clock())
    });

    // An invalid or empty response must not overwrite
    // previously validated cache contents.
    if (!checked.items.length) {
      throw new Error(
        "No approved articles returned"
      );
    }

    const entry = Object.freeze({
      items: Object.freeze(
        checked.items.map(article =>
          Object.freeze({ ...article })
        )
      ),
      generatedAt: checked.generatedAt
    });

    cached = entry;
    cachedAt = clock();

    return snapshot(entry, false);
  };

  const getFeed = async () => {
    const instant = clock();

    const age = cached === null
      ? Infinity
      : Math.max(0, instant - cachedAt);

    if (cached && age < ttlMs) {
      return snapshot(cached, false);
    }

    // Multiple readers share one refresh operation.
    if (!inFlight) {
      inFlight = refresh().finally(() => {
        inFlight = null;
      });
    }

    try {
      return await inFlight;
    } catch {
      if (
        cached &&
        Math.max(0, clock() - cachedAt) <= staleMs
      ) {
        return snapshot(cached, true);
      }

      return empty();
    }
  };

  return Object.freeze({
    getFeed
  });
}
