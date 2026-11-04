
"use strict";

/**
 * PAY54 Marketaux Adapter v1.0.0
 * Backend-only, disabled-by-default provider transport.
 * This adapter does not grant publication rights, start a server,
 * store credentials, or interact with customer financial records.
 */

const ENDPOINT = "https://api.marketaux.com/v1/news/all";
const MAX_BODY_BYTES = 256 * 1024;
const MAX_ARTICLES = 25;
const REQUEST_TIMEOUT_MS = 5000;

function validHost(host) {
  return typeof host === "string" &&
    host.length <= 253 &&
    /^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}$/i.test(host);
}

function approvedHosts(hosts) {
  if (!Array.isArray(hosts) || hosts.length === 0 ||
      hosts.length > 100 || !hosts.every(validHost)) {
    throw new TypeError("Approved publisher hostnames are required");
  }
  return Object.freeze([...new Set(hosts.map(host => host.toLowerCase()))]);
}

function articleHost(url) {
  if (typeof url !== "string" || url.length > 2048) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username ||
        parsed.password || (parsed.port && parsed.port !== "443")) {
      return null;
    }
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function readBoundedJson(response, limitBytes) {
  const contentType = response.headers?.get?.("content-type") ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
    throw new Error("Unsupported provider content type");
  }

  const declared = response.headers?.get?.("content-length");
  if (declared !== null && declared !== undefined &&
      (!/^\d+$/.test(declared) || Number(declared) > limitBytes)) {
    throw new Error("Provider response exceeds size limit");
  }

  if (!response.body?.getReader) {
    throw new Error("Streaming response body required");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new Error("Invalid provider response chunk");
      }
      total += value.byteLength;
      if (total > limitBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("Provider response exceeds size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export function createMarketauxAdapter({
  enabled = false,
  rightsVerified = false,
  apiToken,
  publisherHosts = [],
  fetchImpl = globalThis.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxResponseBytes = MAX_BODY_BYTES,
  limit = 10
} = {}) {
  if (typeof enabled !== "boolean" || typeof rightsVerified !== "boolean") {
    throw new TypeError("Provider enablement and rights must be booleans");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 15000 ||
      !Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1024 ||
      maxResponseBytes > MAX_BODY_BYTES || !Number.isInteger(limit) ||
      limit < 1 || limit > MAX_ARTICLES) {
    throw new RangeError("Invalid provider transport limits");
  }

  // Disabled mode must not require credentials and must never make a request.
  if (!enabled) {
    return Object.freeze({
      version: "1.0.0",
      enabled: false,
      loadCandidates: async () => []
    });
  }

  if (!rightsVerified) {
    throw new Error("Publisher display rights have not been verified");
  }
  if (typeof apiToken !== "string" || apiToken.length < 8 ||
      apiToken.length > 512 || /\s/.test(apiToken)) {
    throw new TypeError("A server-side API credential is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A backend fetch implementation is required");
  }

  const hosts = approvedHosts(publisherHosts);
  const allowed = new Set(hosts);

  async function loadCandidates() {
    const url = new URL(ENDPOINT);
    url.searchParams.set("api_token", apiToken);
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("domains", hosts.join(","));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url.toString(), {
        method: "GET",
        headers: { accept: "application/json" },
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal
      });

      if (!response || response.status !== 200 || response.redirected === true) {
        throw new Error("Provider request failed");
      }

      const json = await readBoundedJson(response, maxResponseBytes);
      if (!json || !Array.isArray(json.data) || json.data.length > limit) {
        throw new Error("Invalid provider payload");
      }

      return json.data.flatMap(record => {
        if (!record || typeof record !== "object" || Array.isArray(record)) {
          return [];
        }
        const host = articleHost(record.url);
        if (!host || !allowed.has(host) ||
            typeof record.source !== "string" ||
            record.source.toLowerCase() !== host) {
          return [];
        }
        return [{
          id: record.uuid,
          title: record.title,
          summary: record.description,
          publisher: record.source,
          url: record.url,
          publishedAt: record.published_at,
          displayRights: true
        }];
      });
    } catch {
      // No secrets, URL with token, or provider payloads in errors.
      throw new Error("Financial news provider unavailable");
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    version: "1.0.0",
    enabled: true,
    loadCandidates
  });
}
