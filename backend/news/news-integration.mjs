
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — FINANCIAL NEWS INTEGRATION
   File: backend/news/news-integration.mjs
   Version: 1.0.0

   Responsibilities:
   - Enforce disabled-by-default provider configuration
   - Require explicit provider-rights approval before activation
   - Connect provider adapter, validation, cache and HTTP handler
   - Keep environment configuration server-side
   - Provide a safe, credential-free health summary

   This module does not start an HTTP server.
   It does not activate provider access without explicit configuration.
   It does not modify any financial records.
   ========================================================================== */

import {
  createMarketauxAdapter
} from "./marketaux-adapter.mjs";

import {
  createNewsService
} from "./news-service.mjs";

import {
  createNewsHttpHandler
} from "./news-http-handler.mjs";

const VERSION = "1.0.0";
const ROUTE = "/api/v1/news";

const DEFAULT_TTL_MS = 5 * 60_000;
const DEFAULT_STALE_MS = 60 * 60_000;

function readSwitch(value, name) {
  if (value === undefined || value === "") {
    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new TypeError(
    `Invalid boolean configuration for ${name}`
  );
}

function readHosts(value) {
  if (typeof value !== "string") {
    throw new TypeError(
      "Approved news publisher hosts must be configured"
    );
  }

  const hosts = value
    .split(",")
    .map(host => host.trim().toLowerCase());

  if (
    hosts.length === 0 ||
    hosts.length > 100 ||
    hosts.some(host => !host)
  ) {
    throw new TypeError(
      "Invalid news publisher host configuration"
    );
  }

  const unique = [...new Set(hosts)];

  if (
    unique.length !== hosts.length
  ) {
    throw new TypeError(
      "Duplicate news publisher hosts are not allowed"
    );
  }

  return Object.freeze(unique);
}

function unavailableFeed() {
  return Object.freeze({
    status: "unavailable",
    items: Object.freeze([]),
    updatedAt: null,
    count: 0
  });
}

/**
 * Server-side configuration contract:
 *
 * PAY54_NEWS_ENABLED
 * PAY54_NEWS_RIGHTS_VERIFIED
 * PAY54_NEWS_API_TOKEN
 * PAY54_NEWS_PUBLISHER_HOSTS
 *
 * Credentials must be provided by a trusted server runtime.
 * Never serialise the environment configuration to clients.
 */
export function createNewsIntegration({
  environment = {},
  fetchImpl,
  now = () => Date.now(),
  ttlMs = DEFAULT_TTL_MS,
  staleMs = DEFAULT_STALE_MS
} = {}) {
  if (
    !environment ||
    typeof environment !== "object" ||
    Array.isArray(environment)
  ) {
    throw new TypeError(
      "Server environment configuration is required"
    );
  }

  const enabled = readSwitch(
    environment.PAY54_NEWS_ENABLED,
    "PAY54_NEWS_ENABLED"
  );

  const rightsVerified = readSwitch(
    environment.PAY54_NEWS_RIGHTS_VERIFIED,
    "PAY54_NEWS_RIGHTS_VERIFIED"
  );

  if (
    !Number.isSafeInteger(ttlMs) ||
    ttlMs < 1 ||
    !Number.isSafeInteger(staleMs) ||
    staleMs < ttlMs
  ) {
    throw new RangeError(
      "Invalid news cache duration"
    );
  }

  if (
    typeof now !== "function"
  ) {
    throw new TypeError(
      "A server clock function is required"
    );
  }

  /*
   * Disabled configuration is a valid operational state.
   * Do not require credentials or perform external requests.
   */
  if (!enabled) {
    const service = Object.freeze({
      getFeed: async () => unavailableFeed()
    });

    const handleRequest = createNewsHttpHandler({
      service,
      path: ROUTE
    });

    return Object.freeze({
      version: VERSION,
      enabled: false,
      route: ROUTE,
      handleRequest,
      getFeed: service.getFeed,
      health: () => Object.freeze({
        version: VERSION,
        enabled: false,
        provider: "disabled",
        publicEndpointDeployed: false
      })
    });
  }

  /*
   * PAY54 requires positive licensing confirmation.
   * A missing or false approval must fail closed.
   */
  if (!rightsVerified) {
    throw new Error(
      "Financial news publication rights are not approved"
    );
  }

  const token =
    environment.PAY54_NEWS_API_TOKEN;

  if (
    typeof token !== "string" ||
    token.length < 8 ||
    token.length > 512 ||
    /\s/u.test(token)
  ) {
    throw new TypeError(
      "Valid server-side news provider credentials are required"
    );
  }

  const publisherHosts = readHosts(
    environment.PAY54_NEWS_PUBLISHER_HOSTS
  );

  /*
   * Approved hosts are validated again by the
   * provider adapter and final news feed policy.
   */
  const provider = createMarketauxAdapter({
    enabled: true,
    rightsVerified: true,
    apiToken: token,
    publisherHosts,
    fetchImpl,
    timeoutMs: 5000,
    maxResponseBytes: 256 * 1024,
    limit: 10
  });

  const service = createNewsService({
    loadCandidates: provider.loadCandidates,
    allowedHosts: publisherHosts,
    now,
    ttlMs,
    staleMs,
    maxCandidates: 25
  });

  const handleRequest = createNewsHttpHandler({
    service,
    path: ROUTE
  });

  return Object.freeze({
    version: VERSION,
    enabled: true,
    route: ROUTE,
    handleRequest,
    getFeed: service.getFeed,

    health: () => Object.freeze({
      version: VERSION,
      enabled: true,
      provider: "marketaux",
      publicEndpointDeployed: false
    })
  });
}
