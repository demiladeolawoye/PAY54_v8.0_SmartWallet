
"use strict";

/**
 * PAY54 News HTTP Handler v1.0.0.
 *
 * Designed for a trusted Node.js HTTP server.
 * Does not create a server or open any network port.
 *
 * Exposes approved article metadata only.
 * No provider credentials or customer financial data.
 */
export function createNewsHttpHandler({
  service,
  path = "/api/v1/news"
} = {}) {
  if (
    !service ||
    typeof service.getFeed !== "function"
  ) {
    throw new TypeError(
      "A news service with getFeed() is required"
    );
  }

  if (
    typeof path !== "string" ||
    !/^\/[a-z0-9/-]+$/u.test(path)
  ) {
    throw new TypeError(
      "Invalid news API path"
    );
  }

  return async function handleNews(req, res) {
    const pathname = (req.url || "")
      .split("?", 1)[0];

    if (pathname !== path) {
      return false;
    }

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    res.setHeader(
      "Referrer-Policy",
      "no-referrer"
    );

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");

      res.writeHead(405);

      res.end(
        JSON.stringify({
          error: "method_not_allowed"
        })
      );

      return true;
    }

    try {
      const feed = await service.getFeed();

      res.writeHead(
        feed.status === "unavailable"
          ? 503
          : 200
      );

      res.end(
        JSON.stringify(feed)
      );
    } catch {
      // Never expose provider exception messages,
      // upstream URLs, credentials or stack traces.
      res.writeHead(503);

      res.end(
        JSON.stringify({
          status: "unavailable",
          items: [],
          updatedAt: null,
          count: 0
        })
      );
    }

    return true;
  };
}
