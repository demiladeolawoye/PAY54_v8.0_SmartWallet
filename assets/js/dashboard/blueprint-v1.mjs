
"use strict";

/**
 * PAY54 Dashboard Blueprint v1.0
 * Canonical desktop and mobile presentation configuration.
 *
 * Read-only. Does not execute actions, modify financial records
 * or grant capability availability.
 */

const freeze = value => {
  if (
    value &&
    typeof value === "object" &&
    !Object.isFrozen(value)
  ) {
    for (const child of Object.values(value)) {
      freeze(child);
    }

    Object.freeze(value);
  }

  return value;
};

const entry = (
  id,
  title,
  action = null,
  visibility = "guarded"
) => ({
  id,
  title,
  action,
  visibility
});

export const PAY54_DASHBOARD_BLUEPRINT_VERSION = "1.0.0";

export const PAY54_DASHBOARD_BLUEPRINT = freeze({
  version: PAY54_DASHBOARD_BLUEPRINT_VERSION,

  visualReference:
    "PAY54 Dashboard Blueprint v1.0 — user-approved desktop/mobile image",

  desktop: {
    navigation: [
      entry("dashboard", "Dashboard", null, "navigation"),
      entry("money_moves", "Money Moves", null, "navigation"),
      entry("services", "Services", null, "navigation"),
      entry("transactions", "Transactions", null, "navigation"),
      entry("rewards", "Rewards", null, "navigation"),
      entry("messages", "Messages", null, "navigation"),
      entry("help_support", "Help & Support", null, "navigation")
    ],

    accountNavigation: [
      "Switch Profile",
      "Settings",
      "Log Out"
    ],

    topRow: [
      "balance",
      "wallets",
      "shortcuts"
    ],

    mainColumn: [
      "money_moves",
      "services",
      "gift_cards_promotion",
      "news_insights"
    ],

    supportingColumn: [
      "recent_activity",
      "requests_alerts",
      "utilities",
      "security_control"
    ]
  },

  mobile: {
    contentOrder: [
      "header",
      "greeting",
      "currency_pills",
      "balance",
      "shortcuts",
      "money_moves",
      "services",
      "gift_cards_promotion",
      "bottom_navigation"
    ],

    moneyMovesPreview: [
      "send",
      "receive",
      "scan_pay",
      "add_money",
      "more"
    ],

    bottomNavigation: [
      "Home",
      "Money Moves",
      "PAY54",
      "Services",
      "Transactions"
    ]
  },

  cards: {
    balance: {
      title: "Total Balance",
      source: "existing-ledger",
      primaryActions: ["add_money", "withdraw"]
    },

    wallets: {
      title: "My Wallets",
      source: "existing-ledger",
      action: "manage_wallets"
    },

    shortcuts: {
      title: "Quick Shortcuts",
      source: "market-capability-policy"
    }
  },

  moneyMoves: [
    entry("send", "Send", "send"),
    entry("receive", "Receive", "receive"),
    entry("scan_pay", "Scan & Pay", "scan_pay"),
    entry("add_money", "Add Money", "add_money"),
    entry("withdraw", "Withdraw", "withdraw"),
    entry("bank_transfer", "Bank Transfer", "bank_transfer"),
    entry("request", "Request Money", "request")
  ],

  services: [
    entry("global_transfer", "Global Transfer", "fx"),

    entry(
      "gift_cards",
      "Gift Cards",
      null,
      "provider-gated"
    ),

    entry("pay54_pay", "PAY54 Pay", "bills"),
    entry("cards", "Cards", "cards"),
    entry("vaults", "Vaults", "savings"),

    entry(
      "money_hub",
      "Money Hub",
      null,
      "future"
    ),

    entry(
      "travel_connect",
      "Travel & Connect",
      null,
      "future"
    ),

    entry("marketplace", "Marketplace", "shop"),
    entry("invest", "Invest", "trading"),

    entry(
      "agent_plus",
      "Agent+",
      "agent",
      "market-gated"
    )
  ],

  relocations: {
    request: "money_moves",
    checkout: "cards_marketplace",
    merchantqr: "business_merchant_collections",
    risk: "security_control",
    bet: "pay54_pay_restricted",
    shop: "marketplace",
    trading: "invest"
  },

  supporting: {
    recent_activity: {
      title: "Recent Activity",
      source: "existing-transactions"
    },

    requests_alerts: {
      title: "Requests & Alerts",
      source: "existing-alerts"
    },

    utilities: {
      title: "Utilities",
      actions: ["atm", "pos"]
    },

    security_control: {
      title: "Security & Control",
      source: "approved-security-state"
    },

    news_insights: {
      title: "News & Insights",
      source: "approved-content-only"
    }
  },

  giftCardsPromotion: {
    id: "gift_cards_promotion",
    heading: "Gift Cards Now on PAY54",
    callToAction: "Explore Gift Cards",

    // No provider has been approved for live execution.
    action: null,
    visibility: "provider-gated",

    // Artwork may be shown as a clearly labelled development preview.
    previewRendering:
      "decorative-only-with-development-label",

    artwork: [
      "Amazon",
      "Apple",
      "Google Play"
    ]
  },

  protection: {
    neverMutate: [
      "ledger",
      "transactions",
      "cards",
      "funding",
      "preview-execution-gate"
    ],

    financialActionRequires: [
      "market-approved",
      "capability-enabled",
      "customer-eligible",
      "provider-ready",
      "compliance-approved",
      "operationally-supported",
      "deployment-permitted"
    ],

    previewExecution: "disabled"
  }
});

/**
 * Return an approved presentation entry without enabling it.
 */
export function getDashboardBlueprintItem(id) {
  if (typeof id !== "string") {
    return null;
  }

  return (
    PAY54_DASHBOARD_BLUEPRINT.moneyMoves.find(
      item => item.id === id
    ) ??
    PAY54_DASHBOARD_BLUEPRINT.services.find(
      item => item.id === id
    ) ??
    null
  );
}

/**
 * Return routing metadata only.
 *
 * The existing market/capability policy and deployment gate
 * must independently approve an action before it is enabled.
 */
export function getDashboardActionCandidate(id) {
  const item = getDashboardBlueprintItem(id);

  return item
    ? freeze({
        id: item.id,
        action: item.action,
        requiresPolicyEvaluation: true,
        enabledByBlueprint: false
      })
    : null;
}
