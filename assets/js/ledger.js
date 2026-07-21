/* =========================
   PAY54 — Layer 3A Core Money Engine
   File: assets/js/ledger.js
   Version: v805.2-L3A

   Provides:
   - Canonical multi-wallet balances
   - FX rate table (mock) + FX equivalence
   - Atomic ledger entries (single source of truth)
   - Recent feed rendering helper data
========================= */

(() => {
  "use strict";

  const EVENTS = window.PAY54_EVENTS;
/* ==========================================================
   PAY54 ENTERPRISE SECURITY
========================================================== */

const SECURITY =
window.PAY54_SECURITY || {};

const STORAGE =
SECURITY.storage || null;

const VALIDATOR =
SECURITY.validator || null;

const SANITIZER =
SECURITY.sanitizer || null;

const SESSION =
SECURITY.session || null;

const TRANSACTION_GUARD =
SECURITY.transactionGuard || null;

const SECURITY_BOOTSTRAP =
SECURITY.bootstrap || null;
   

  function publishLedgerEvent(eventName, payload = {}) {

    try {

      if (
        EVENTS &&
        typeof EVENTS.publish === "function"
      ) {

        EVENTS.publish(
          eventName,
          payload,
          {
            source: "ledger"
          }
        );

      }

    } catch (error) {

     console.error(
        "[PAY54_LEDGER]",
        eventName,
        error
     );

    }

}

/* ==========================================================
   SECURITY HELPERS
========================================================== */

function storageGet(

    key

){

    if(

        STORAGE &&

        typeof STORAGE.get === "function"

    ){

        return STORAGE.get(

            key

        );

    }

    return localStorage.getItem(

        key

    );

}

function storageSet(

    key,

    value

){

    if(

        STORAGE &&

        typeof STORAGE.set === "function"

    ){

        STORAGE.set(

            key,

            value

        );

        return;

    }

    localStorage.setItem(

        key,

        value

    );

}

function validateCurrency(

    currency

){

    if(

        !VALIDATOR ||

        typeof VALIDATOR.currency !== "function"

    ){

        return true;

    }

    return VALIDATOR.currency(

        currency

    );

}

function sanitizeMeta(

    meta

){

    if(

        !SANITIZER ||

        typeof SANITIZER.payload !== "function"

    ){

        return meta;

    }

    return SANITIZER.payload(

        meta

    );

}

const LS = {
    BALANCES: "pay54_balances",
    TX: "pay54_transactions",
    RATES: "pay54_fx_rates",
    BASE_CUR: "pay54_base_currency" // used for FX equivalents display
  };

  const DEFAULT_BALANCES = {
    NGN: 1250000.5,
    GBP: 8420.75,
    USD: 15320.4,
    EUR: 11890.2,
    GHS: 9650.0,
    KES: 132450.0,
    ZAR: 27890.6
  };

  const SYMBOLS = {
    NGN: "₦",
    GBP: "£",
    USD: "$",
    EUR: "€",
    GHS: "₵",
    KES: "KSh",
    ZAR: "R",
    CAD: "C$",
    AED: "د.إ",
    AUD: "A$"
  };

  // Mock FX (stable enough for demo; Layer 3B+ can swap to API)
  // All rates are "1 UNIT of FROM = X units of TO"
  const DEFAULT_RATES = {
    // majors -> NGN
    USD: { NGN: 1650, GHS: 12.8, KES: 130, ZAR: 19.0, GBP: 0.79, EUR: 0.92 },
    GBP: { NGN: 2050, GHS: 16.1, KES: 165, ZAR: 24.0, USD: 1.27, EUR: 1.16 },
    EUR: { NGN: 1800, GHS: 14.2, KES: 150, ZAR: 21.0, USD: 1.09, GBP: 0.86 },
    CAD: { NGN: 1200, GHS: 9.5,  KES: 96,  ZAR: 14.0, USD: 0.74, GBP: 0.58 },
    AED: { NGN: 450,  GHS: 3.6,  KES: 37,  ZAR: 5.2,  USD: 0.27, GBP: 0.21 },
    AUD: { NGN: 1100, GHS: 8.7,  KES: 90,  ZAR: 13.0, USD: 0.67, GBP: 0.53 },

    // NGN to others (approx inverse for demo; not perfect but fine)
    NGN: { USD: 1 / 1650, GBP: 1 / 2050, EUR: 1 / 1800, GHS: 1 / 80, KES: 1 / 12.6, ZAR: 1 / 95 }
  };

  function safeJSONParse(v, fallback) {
    if (v === null || v === "" || v === "null" || v === "undefined") return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  }

  function isPlainObject(o) {
    return !!o && typeof o === "object" && !Array.isArray(o);
  }

  function nowISO() { return new Date().toISOString(); }

  function uid(prefix = "TX") {
    return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  }

  function moneyFmt(cur, amt) {
    const s = SYMBOLS[cur] ?? "";
    const n = Number(amt || 0);
    return `${s} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function initBalances() {
    storageSet(LS.BALANCES, JSON.stringify(DEFAULT_BALANCES));
    return { ...DEFAULT_BALANCES };
  }
/* ==========================================================
   FX INITIALIZATION
========================================================== */

function initRates() {

    const payload = {

        updated_at: nowISO(),

        table: DEFAULT_RATES

    };

    storageSet(

        LS.RATES,

        JSON.stringify(payload)

    );

    publishLedgerEvent(

        "ledger.fx.updated",

        {

            updated_at:

                payload.updated_at,

            currencies:

                Object.keys(

                    payload.table

                )

        }

    );

    return payload;

}
  function getBalances() {
    const stored = safeJSONParse(storageGet(LS.BALANCES), null);
    if (!isPlainObject(stored)) return initBalances();

    const cleaned = { ...DEFAULT_BALANCES };
    for (const k of Object.keys(cleaned)) {
      const v = stored[k];
      cleaned[k] = Number.isFinite(Number(v)) ? Number(v) : cleaned[k];
    }
    storageSet(LS.BALANCES, JSON.stringify(cleaned));
    return cleaned;
  }

 function setBalances(bal) {

    if (!isPlainObject(bal)) {

        return;

    }

    const previousBalances = getBalances();

    const updatedBalances = {

        ...bal

    };

    storageSet(

        LS.BALANCES,

        JSON.stringify(updatedBalances)

    );

    publishLedgerEvent(

        "ledger.balance.updated",

        {

            previous: previousBalances,

            current: {

                ...updatedBalances

            },

            updatedAt: nowISO()

        }

    );

}

  const payload = {

    updated_at: nowISO(),

    table: DEFAULT_RATES

};

storageSet(

    LS.RATES,

    JSON.stringify(payload)

);

publishLedgerEvent(

    "ledger.fx.updated",

    {

        updated_at: payload.updated_at,

        currencies:

            Object.keys(payload.table)

    }

);

return payload;
  }

  function getRates() {
    const stored = safeJSONParse(storageGet(LS.RATES), null);
    if (!stored || !isPlainObject(stored) || !isPlainObject(stored.table)) return initRates();
    return stored;
  }

  function setBaseCurrency(cur) {

    const previous =

        getBaseCurrency();

    storageSet(

        LS.BASE_CUR,

        cur

    );

    publishLedgerEvent(

        "ledger.currency.changed",

        {

            previous,

            current: cur,

            updatedAt: nowISO()

        }

    );

}

  function getBaseCurrency(fallback = "NGN") {
    return storageGet(LS.BASE_CUR) || fallback;
  }

  function rate(from, to) {
    if (from === to) return 1;
    const { table } = getRates();
    const row = table[from];
    if (row && Number(row[to])) return Number(row[to]);

    // try inverse if available
    const invRow = table[to];
    if (invRow && Number(invRow[from])) return 1 / Number(invRow[from]);

    return 1; // last-resort
  }

  function convert(from, to, amount) {
    const a = Number(amount || 0);
    return a * rate(from, to);
  }

  function getTx() {
    const v = safeJSONParse(storageGet(LS.TX), []);
    return Array.isArray(v) ? v : [];
  }

  function setTx(list) {
    storageSet(LS.TX, JSON.stringify(Array.isArray(list) ? list : []));
  }

  /**
   * ledgerEntry schema:
   * {
   *  id, type, title, currency, amount, // amount is signed in currency
   *  base_currency, base_equiv, fx_rate_used,
   *  meta: { recipient, method, route, reference, reason, provider, bank, account_no, account_name }
   *  created_at
   * }
   */
  function createEntry({ type, title, currency, amount, meta, icon }) {
    const base = getBaseCurrency("NGN");
    const created_at = nowISO();

    const fxRate = rate(currency, base);
    const baseEquiv = convert(currency, base, Math.abs(Number(amount || 0)));

    return {
      id: uid("TX"),
      type: type || "generic",
      title: title || "Transaction",
      icon: icon || "💳",
      currency,
      amount: Number(amount || 0),
      base_currency: base,
      base_equiv: Number(baseEquiv || 0),
      fx_rate_used: Number(fxRate || 1),
      meta:

sanitizeMeta(

    isPlainObject(meta)

        ? meta

        : {}

),
      created_at
    };
  }

  /**
   * applyEntry:
   * - Updates balances atomically for entry.currency
   * - Stores entry in TX list
   */
function applyEntry(entry) {

    const e = entry;
if(

    !validateCurrency(

        e.currency

    )

){

    publishLedgerEvent(

        "ledger.security.validation.failed",

        {

            currency:

                e.currency

        }

    );

    return null;

}
    if (

        !e ||

        !e.currency ||

        !Number.isFinite(Number(e.amount))

    ) {

        publishLedgerEvent(

            "ledger.error",

            {

                reason: "Invalid ledger entry",

                entry

            }

        );

        return null;

    }

    const balances = getBalances();

    const previousBalance =

        Number(

            balances[e.currency] ?? 0

        );

    balances[e.currency] =

        previousBalance +

        Number(e.amount);

    setBalances(balances);

    const list = getTx();

    list.unshift(e);

    setTx(list);

    publishLedgerEvent(

        "ledger.entry.created",

        {

            entry: {

                ...e

            },

            balanceBefore:

                previousBalance,

            balanceAfter:

                balances[e.currency],

            committedAt:

                nowISO()

        }

    );

    return e;

}

  // Expose API
window.PAY54_LEDGER = {
  LS,
  SYMBOLS,
  moneyFmt,

  getBalances,
  setBalances,

  getRates,
  rate,
  getRate: rate,
  convert,

  getBaseCurrency,
  setBaseCurrency,

  getTx,
  setTx,

  createEntry,
  applyEntry
};
})();
