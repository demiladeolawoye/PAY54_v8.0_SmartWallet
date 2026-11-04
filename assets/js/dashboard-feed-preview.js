
/* ============================================================================
 * PAY54 Dashboard Feed Preview Policy
 * File: assets/js/dashboard-feed-preview.js
 * Version: 1.0.0
 *
 * Presentation-only policy:
 * - Five most recent dashboard transaction previews
 * - Five most recent dated news previews
 * - Undated content retains source order
 * - Existing DOM nodes and event handlers are preserved
 * - Financial data and transaction history are never modified
 * - Unverified balance movement is never displayed as an amount
 * ========================================================================== */

(() => {
  "use strict";

  const VERSION = "1.0.0";
  const LIMIT = 5;

  if (window.PAY54_DASHBOARD_FEED_PREVIEW) {
    return;
  }

  const parseTime = (value) => {
    if (typeof value !== "string" || !value.trim()) {
      return null;
    }

    const text = value.trim();

    const match = text.match(
      /\b(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (match) {
      const [
        ,
        dd,
        mm,
        yyyy,
        hh = "00",
        mi = "00",
        ss = "00"
      ] = match;

      const day = Number(dd);
      const month = Number(mm);
      const year = Number(yyyy);
      const hour = Number(hh);
      const minute = Number(mi);
      const second = Number(ss);

      const stamp = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      );

      const date = new Date(stamp);

      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day &&
        date.getUTCHours() === hour &&
        date.getUTCMinutes() === minute &&
        date.getUTCSeconds() === second
      ) ? stamp : null;
    }

    if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)
    ) {
      const stamp = Date.parse(text);

      return Number.isFinite(stamp)
        ? stamp
        : null;
    }

    return null;
  };

  const newestFive = (
    items,
    timeOf = item =>
      item?.publishedAt ?? item?.createdAt
  ) => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item, index) => ({
        item,
        index,
        stamp: parseTime(timeOf(item))
      }))
      .sort((a, b) => {
        if (
          a.stamp === null &&
          b.stamp === null
        ) {
          return a.index - b.index;
        }

        if (a.stamp === null) {
          return 1;
        }

        if (b.stamp === null) {
          return -1;
        }

        return (
          b.stamp - a.stamp ||
          a.index - b.index
        );
      })
      .slice(0, LIMIT)
      .map(({ item }) => item);
  };

  const feedElements = {
    transactions: () =>
      document.querySelector(
        "#recentTransactions"
      ),

    news: () =>
      document.querySelector(
        "#newsFeed"
      )
  };

  const observers = [];

  const status = {
    transactions: 0,
    news: 0,
    undatedNews: true
  };

  const timestampFor = (node, type) => {
    const attribute = type === "news"
      ? "publishedAt"
      : "createdAt";

    return (
      node.dataset?.[attribute] ||
      node.querySelector("time[datetime]")
        ?.getAttribute("datetime") ||
      (
        type === "transactions"
          ? node.querySelector(".feed-sub")
            ?.textContent
          : ""
      )
    );
  };

  const reconcile = (container, type) => {
    if (!container?.isConnected) {
      return;
    }

    const nodes = Array.from(
      container.children
    ).filter(node =>
      node.classList?.contains("feed-item")
    );

    if (!nodes.length) {
      status[type] = 0;
      return;
    }

    const ordered = newestFive(
      nodes,
      node => timestampFor(node, type)
    );

    const visible = new Set(ordered);

    const sorted = [
      ...ordered,
      ...nodes.filter(node =>
        !visible.has(node)
      )
    ];

    // Move the existing nodes rather than
    // recreating them. Attached handlers remain.
    if (
      sorted.some(
        (node, index) => node !== nodes[index]
      )
    ) {
      container.append(...sorted);
    }

    for (const node of nodes) {
      const shouldHide = !visible.has(node);

      if (
        node.classList.contains(
          "p54-feed-clipped"
        ) !== shouldHide
      ) {
        node.classList.toggle(
          "p54-feed-clipped",
          shouldHide
        );

        node.setAttribute(
          "aria-hidden",
          shouldHide ? "true" : "false"
        );
      }
    }

    status[type] = ordered.length;

    if (type === "news") {
      status.undatedNews = nodes.every(
        node => !timestampFor(node, "news")
      );
    }
  };

  const addNewsDisclosure = () => {
    const container = feedElements.news();
    const card = container?.closest(".card");

    if (
      !card ||
      card.querySelector(
        ".p54-news-feed-disclosure"
      )
    ) {
      return;
    }

    const note = document.createElement("p");

    note.className =
      "p54-news-feed-disclosure";

    note.textContent =
      "Development sample headlines · not a live news service";

    note.setAttribute("role", "note");

    container.before(note);
  };

  const addMovementIndicator = () => {
    const card = document.querySelector(
      "#balanceCard"
    );

    if (
      !card ||
      card.querySelector(
        ".p54-balance-movement-status"
      )
    ) {
      return;
    }

    const amount = card.querySelector(
      "#balanceAmount, .balance-amount"
    );

    if (!amount) {
      return;
    }

    const row = document.createElement("div");

    row.className =
      "p54-balance-movement-status";

    row.setAttribute("role", "status");

    const arrow = document.createElement(
      "span"
    );

    arrow.className =
      "p54-balance-movement-symbol";

    arrow.textContent = "↗";

    arrow.setAttribute(
      "aria-hidden",
      "true"
    );

    const label = document.createElement(
      "span"
    );

    label.textContent =
      "Balance movement · Not yet calculated";

    row.append(arrow, label);

    amount.insertAdjacentElement(
      "afterend",
      row
    );
  };

  const mount = () => {
    if (
      !document.body?.classList.contains(
        "p54-blueprint"
      )
    ) {
      return false;
    }

    for (
      const [type, getContainer]
      of Object.entries(feedElements)
    ) {
      const container = getContainer();

      if (!container) {
        continue;
      }

      reconcile(container, type);

      const observer = new MutationObserver(
        () => reconcile(container, type)
      );

      observer.observe(container, {
        childList: true
      });

      observers.push(observer);
    }

    addNewsDisclosure();
    addMovementIndicator();

    return true;
  };

  const publicAPI = Object.freeze({
    version: VERSION,

    latestFive: newestFive,

    health: () => Object.freeze({
      ...status,
      limit: LIMIT,
      mounted: observers.length > 0
    })
  });

  Object.defineProperty(
    window,
    "PAY54_DASHBOARD_FEED_PREVIEW",
    {
      value: publicAPI,
      configurable: false,
      writable: false
    }
  );

  if (!mount()) {
    document.addEventListener(
      "DOMContentLoaded",
      mount,
      { once: true }
    );
  }

})();
