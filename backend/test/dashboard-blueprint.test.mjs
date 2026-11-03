
"use strict";

/**
 * PAY54 Dashboard Blueprint v1.0 regression tests.
 *
 * Tests presentation configuration only.
 * Does not access customer records or execute financial operations.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  PAY54_DASHBOARD_BLUEPRINT,
  PAY54_DASHBOARD_BLUEPRINT_VERSION,
  getDashboardBlueprintItem,
  getDashboardActionCandidate
} from "../../assets/js/dashboard/blueprint-v1.mjs";

const bp = PAY54_DASHBOARD_BLUEPRINT;

test(
  "versioned approved desktop composition is complete and ordered",
  () => {
    assert.equal(
      PAY54_DASHBOARD_BLUEPRINT_VERSION,
      "1.0.0"
    );

    assert.deepEqual(
      bp.desktop.topRow,
      ["balance", "wallets", "shortcuts"]
    );

    assert.deepEqual(
      bp.desktop.mainColumn,
      [
        "money_moves",
        "services",
        "gift_cards_promotion",
        "news_insights"
      ]
    );

    assert.deepEqual(
      bp.desktop.supportingColumn,
      [
        "recent_activity",
        "requests_alerts",
        "utilities",
        "security_control"
      ]
    );

    assert.equal(bp.desktop.navigation.length, 7);
  }
);

test(
  "mobile order and five navigation tabs match approved reference",
  () => {
    assert.deepEqual(
      bp.mobile.bottomNavigation,
      [
        "Home",
        "Money Moves",
        "PAY54",
        "Services",
        "Transactions"
      ]
    );

    assert.deepEqual(
      bp.mobile.moneyMovesPreview,
      [
        "send",
        "receive",
        "scan_pay",
        "add_money",
        "more"
      ]
    );

    assert.equal(
      bp.mobile.contentOrder.at(-1),
      "bottom_navigation"
    );
  }
);

test(
  "canonical money-move actions are preserved exactly",
  () => {
    assert.deepEqual(
      bp.moneyMoves.map(item => item.action),
      [
        "send",
        "receive",
        "scan_pay",
        "add_money",
        "withdraw",
        "bank_transfer",
        "request"
      ]
    );
  }
);

test(
  "service tiles match the approved 5x2 order",
  () => {
    assert.deepEqual(
      bp.services.map(item => item.id),
      [
        "global_transfer",
        "gift_cards",
        "pay54_pay",
        "cards",
        "vaults",
        "money_hub",
        "travel_connect",
        "marketplace",
        "invest",
        "agent_plus"
      ]
    );
  }
);

test(
  "Gift Cards banner is represented without false availability",
  () => {
    assert.equal(
      bp.giftCardsPromotion.heading,
      "Gift Cards Now on PAY54"
    );

    assert.equal(
      bp.giftCardsPromotion.callToAction,
      "Explore Gift Cards"
    );

    assert.equal(
      bp.giftCardsPromotion.action,
      null
    );

    assert.equal(
      getDashboardActionCandidate("gift_cards")
        .enabledByBlueprint,
      false
    );
  }
);

test(
  "routing candidates cannot confer availability or execute money",
  () => {
    assert.equal(
      getDashboardBlueprintItem("global_transfer")
        .action,
      "fx"
    );

    assert.equal(
      getDashboardActionCandidate("send").action,
      "send"
    );

    assert.equal(
      getDashboardActionCandidate("send")
        .requiresPolicyEvaluation,
      true
    );

    assert.equal(
      getDashboardActionCandidate("send")
        .enabledByBlueprint,
      false
    );

    assert.equal(
      getDashboardActionCandidate("unknown"),
      null
    );
  }
);

test(
  "configuration is deeply immutable and does not mutate ledger state",
  () => {
    assert.ok(Object.isFrozen(bp));
    assert.ok(Object.isFrozen(bp.services));
    assert.ok(Object.isFrozen(bp.services[0]));

    assert.ok(
      Object.isFrozen(
        bp.protection.financialActionRequires
      )
    );

    assert.equal(
      bp.protection.previewExecution,
      "disabled"
    );
  }
);
