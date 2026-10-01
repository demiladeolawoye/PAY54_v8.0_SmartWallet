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
  TX_META: "pay54_transactions_meta",
  RATES: "pay54_fx_rates",
  BASE_CUR: "pay54_base_currency"
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
/* ==========================================================
   CANONICAL TRANSACTION REPOSITORY INTEGRITY
   Work Package: WP-011B.6E.5G.5G.4
========================================================== */

const TX_REPOSITORY_SCHEMA_VERSION = 1;

const TX_REPOSITORY_DOCUMENT_TYPE =
  "pay54.transactions.repository.meta";

const TX_REPOSITORY_STATE = Object.freeze({
  UNINITIALIZED: "UNINITIALIZED",
  LEGACY_VALID: "LEGACY_VALID",
  VALID: "VALID",
  LOST: "LOST",
  CORRUPT: "CORRUPT",
  INCONSISTENT: "INCONSISTENT",
  UNAVAILABLE: "UNAVAILABLE"
});
/* ==========================================================
   TRANSACTION HISTORY CONTINUITY STATES
   Work Package: WP-011B.6E.5G.5G.4 — Stage 2
========================================================== */

const TX_HISTORY_CONTINUITY = Object.freeze({

  COMPLETE:
    "COMPLETE",

  UNKNOWN_BEFORE_BASELINE:
    "UNKNOWN_BEFORE_BASELINE"

});


const TX_REPOSITORY_BASELINE_TYPE = Object.freeze({

  NORMAL_INITIALIZATION:
    "NORMAL_INITIALIZATION",

  HISTORICAL_GAP_RECOVERY:
    "HISTORICAL_GAP_RECOVERY"

});

function transactionRepositoryError(
  code,
  message,
  details = {}
){

  const error =
    new Error(message);

  error.name =
    "PAY54TransactionRepositoryError";

  error.code =
    code;

  error.details =
    Object.freeze({
      ...details
    });

  return error;

}


function parseStoredJSON(
  raw
){

  if(
    raw === null ||
    raw === undefined
  ){

    return {
      exists: false,
      valid: false,
      value: null,
      error: null
    };

  }

  try{

    const value =
      typeof raw === "string"
        ? JSON.parse(raw)
        : raw;

    return {
      exists: true,
      valid: true,
      value,
      error: null
    };

  }catch(error){

    return {
      exists: true,
      valid: false,
      value: null,
      error
    };

  }

}


function calculateTransactionRepositoryDigest(
  transactions
){

  const canonical =
    JSON.stringify(
      Array.isArray(transactions)
        ? transactions
        : []
    );

  let hash =
    2166136261;

  for(
    let index = 0;
    index < canonical.length;
    index += 1
  ){

    hash ^=
      canonical.charCodeAt(index);

    hash =
      Math.imul(
        hash,
        16777619
      );

  }

  return (
    hash >>> 0
  )
    .toString(16)
    .padStart(
      8,
      "0"
    );

}


function isValidTransactionRepositoryMeta(
  meta
){

  return Boolean(

    isPlainObject(meta) &&

    meta.schemaVersion ===
      TX_REPOSITORY_SCHEMA_VERSION &&

    meta.documentType ===
      TX_REPOSITORY_DOCUMENT_TYPE &&

    typeof meta.initializedAt ===
      "string" &&

    typeof meta.updatedAt ===
      "string" &&

    Number.isInteger(
      meta.revision
    ) &&

    meta.revision >= 1 &&

    Number.isInteger(
      meta.recordCount
    ) &&

    meta.recordCount >= 0 &&

    typeof meta.contentDigest ===
      "string" &&

    meta.contentDigest.length > 0 &&

    meta.integrityState ===
      "VALID"

  );

}


function buildTransactionRepositoryMeta(
  transactions,
  previousMeta = null
){

  const now =
    nowISO();

  const previousIsValid =
    isValidTransactionRepositoryMeta(
      previousMeta
    );

  return {

    schemaVersion:
      TX_REPOSITORY_SCHEMA_VERSION,

    documentType:
      TX_REPOSITORY_DOCUMENT_TYPE,

    initializedAt:
      previousIsValid
        ? previousMeta.initializedAt
        : now,

    updatedAt:
      now,

    revision:
      previousIsValid
        ? previousMeta.revision + 1
        : 1,

    recordCount:
      transactions.length,

    headTransactionId:
      transactions[0]?.id ||
      null,

    contentDigest:
      calculateTransactionRepositoryDigest(
        transactions
      ),

    integrityState:
      "VALID"

  };

}


function inspectTransactionRepository(){

  let transactionRaw;
  let metadataRaw;

  try{

    transactionRaw =
      storageGet(
        LS.TX
      );

    metadataRaw =
      storageGet(
        LS.TX_META
      );

  }catch(error){

    return {

      state:
        TX_REPOSITORY_STATE
          .UNAVAILABLE,

      code:
        "TX_REPOSITORY_STORAGE_UNAVAILABLE",

      reason:
        "Canonical transaction storage could not be accessed.",

      transactions:
        null,

      metadata:
        null,

      error

    };

  }


  const transactionDocument =
    parseStoredJSON(
      transactionRaw
    );

  const metadataDocument =
    parseStoredJSON(
      metadataRaw
    );


  /*
   * No transaction repository and no metadata.
   *
   * This is deliberately NOT interpreted as [].
   * It may represent a genuine first-run account or
   * unexpected repository loss from a legacy deployment.
   */

  if(
    !transactionDocument.exists &&
    !metadataDocument.exists
  ){

    return {

      state:
        TX_REPOSITORY_STATE
          .UNINITIALIZED,

      code:
        "TX_REPOSITORY_UNINITIALIZED",

      reason:
        "Canonical transaction repository has not been initialised.",

      transactions:
        null,

      metadata:
        null,

      error:
        null

    };

  }


  /*
   * Metadata says a repository existed but the
   * actual financial repository has disappeared.
   */

  if(
    !transactionDocument.exists &&
    metadataDocument.exists
  ){

    return {

      state:
        TX_REPOSITORY_STATE.LOST,

      code:
        "TX_REPOSITORY_LOST",

      reason:
        "Canonical transaction repository is missing while repository metadata still exists.",

      transactions:
        null,

      metadata:
        metadataDocument.valid
          ? metadataDocument.value
          : null,

      error:
        metadataDocument.error

    };

  }


  /*
   * Transaction storage exists but cannot be parsed
   * as valid JSON.
   */

  if(
    !transactionDocument.valid
  ){

    return {

      state:
        TX_REPOSITORY_STATE.CORRUPT,

      code:
        "TX_REPOSITORY_CORRUPT",

      reason:
        "Canonical transaction repository contains invalid JSON.",

      transactions:
        null,

      metadata:
        null,

      error:
        transactionDocument.error

    };

  }


  /*
   * Repository must always contain an array.
   */

  if(
    !Array.isArray(
      transactionDocument.value
    )
  ){

    return {

      state:
        TX_REPOSITORY_STATE.CORRUPT,

      code:
        "TX_REPOSITORY_INVALID_DOCUMENT",

      reason:
        "Canonical transaction repository is not a transaction array.",

      transactions:
        null,

      metadata:
        null,

      error:
        null

    };

  }


  const transactions =
    transactionDocument.value;


  /*
   * Valid legacy repository with no metadata.
   *
   * We can safely adopt this repository because the
   * transaction document itself still exists.
   *
   * We NEVER fabricate transaction history.
   */

  if(
    !metadataDocument.exists
  ){

    return {

      state:
        TX_REPOSITORY_STATE
          .LEGACY_VALID,

      code:
        "TX_REPOSITORY_LEGACY_VALID",

      reason:
        "Existing transaction repository requires integrity metadata adoption.",

      transactions,

      metadata:
        null,

      error:
        null

    };

  }


  if(
    !metadataDocument.valid ||
    !isValidTransactionRepositoryMeta(
      metadataDocument.value
    )
  ){

    return {

      state:
        TX_REPOSITORY_STATE.CORRUPT,

      code:
        "TX_REPOSITORY_METADATA_CORRUPT",

      reason:
        "Canonical transaction repository metadata is invalid.",

      transactions,

      metadata:
        metadataDocument.valid
          ? metadataDocument.value
          : null,

      error:
        metadataDocument.error

    };

  }


  const metadata =
    metadataDocument.value;

  const expectedDigest =
    calculateTransactionRepositoryDigest(
      transactions
    );

  const actualHeadTransactionId =
    transactions[0]?.id ||
    null;


  if(
    metadata.recordCount !==
      transactions.length ||

    metadata.contentDigest !==
      expectedDigest ||

    metadata.headTransactionId !==
      actualHeadTransactionId
  ){

    return {

      state:
        TX_REPOSITORY_STATE
          .INCONSISTENT,

      code:
        "TX_REPOSITORY_INTEGRITY_MISMATCH",

      reason:
        "Canonical transaction repository does not match its integrity metadata.",

      transactions,

      metadata,

      error:
        null

    };

  }


  return {

    state:
      TX_REPOSITORY_STATE.VALID,

    code:
      "TX_REPOSITORY_VALID",

    reason:
      null,

    transactions,

    metadata,

    error:
      null

  };

}


function persistTransactionRepository(
  transactions,
  previousMeta = null
){

  if(
    !Array.isArray(
      transactions
    )
  ){

    throw new TypeError(
      "Canonical transaction repository must be an array."
    );

  }


  const metadata =
    buildTransactionRepositoryMeta(
      transactions,
      previousMeta
    );


  /*
   * Financial write order is intentional.
   *
   * Transaction data is written first.
   * Integrity metadata is written second.
   *
   * Therefore metadata can never claim that a new
   * repository revision exists before the transaction
   * document itself has been written.
   */

  storageSet(
    LS.TX,
    JSON.stringify(
      transactions
    )
  );

  storageSet(
    LS.TX_META,
    JSON.stringify(
      metadata
    )
  );


  /*
   * Mandatory read-after-write verification.
   */

  const verification =
    inspectTransactionRepository();


  if(
    verification.state !==
      TX_REPOSITORY_STATE.VALID
  ){

    publishLedgerEvent(
      "ledger.transaction.repository.integrity.failed",
      {
        state:
          verification.state,

        code:
          verification.code,

        reason:
          verification.reason,

        occurredAt:
          nowISO()
      }
    );


    throw transactionRepositoryError(
      verification.code ||
        "TX_REPOSITORY_PERSISTENCE_FAILED",

      verification.reason ||
        "Canonical transaction repository persistence verification failed.",

      {
        state:
          verification.state
      }
    );

  }


  return verification;

}


function adoptLegacyTransactionRepository(
  inspection
){

  if(
    !inspection ||
    inspection.state !==
      TX_REPOSITORY_STATE
        .LEGACY_VALID ||
    !Array.isArray(
      inspection.transactions
    )
  ){

    throw transactionRepositoryError(
      "TX_REPOSITORY_LEGACY_ADOPTION_INVALID",
      "Legacy transaction repository cannot be adopted from the current state."
    );

  }


  const metadata =
    buildTransactionRepositoryMeta(
      inspection.transactions
    );


  storageSet(
    LS.TX_META,
    JSON.stringify(
      metadata
    )
  );


  const verification =
    inspectTransactionRepository();


  if(
    verification.state !==
      TX_REPOSITORY_STATE.VALID
  ){

    throw transactionRepositoryError(
      verification.code ||
        "TX_REPOSITORY_LEGACY_ADOPTION_FAILED",

      verification.reason ||
        "Legacy transaction repository integrity adoption failed."
    );

  }


  publishLedgerEvent(
    "ledger.transaction.repository.adopted",
    {
      recordCount:
        verification.transactions.length,

      revision:
        verification.metadata.revision,

      occurredAt:
        nowISO()
    }
  );


  return verification;

}


function initializeTransactionRepository(){

  const inspection =
    inspectTransactionRepository();


  if(
    inspection.state ===
      TX_REPOSITORY_STATE.VALID
  ){

    return getTransactionRepositoryStatus();

  }


  if(
    inspection.state ===
      TX_REPOSITORY_STATE
        .LEGACY_VALID
  ){

    adoptLegacyTransactionRepository(
      inspection
    );

    return getTransactionRepositoryStatus();

  }


  if(
    inspection.state !==
      TX_REPOSITORY_STATE
        .UNINITIALIZED
  ){

    throw transactionRepositoryError(
      inspection.code,
      inspection.reason,
      {
        state:
          inspection.state
      }
    );

  }


  const verification =
    persistTransactionRepository(
      [],
      null
    );


  publishLedgerEvent(
    "ledger.transaction.repository.initialized",
    {
      recordCount:
        0,

      revision:
        verification.metadata.revision,

      occurredAt:
        nowISO()
    }
  );


  return getTransactionRepositoryStatus();

}


function bootstrapTransactionRepository(){

  const inspection =
    inspectTransactionRepository();


  /*
   * Existing valid repository.
   */

  if(
    inspection.state ===
      TX_REPOSITORY_STATE.VALID
  ){

    return;

  }


  /*
   * Safely adopt an existing legacy transaction
   * repository because its transaction document
   * actually exists.
   */

  if(
    inspection.state ===
      TX_REPOSITORY_STATE
        .LEGACY_VALID
  ){

    adoptLegacyTransactionRepository(
      inspection
    );

    return;

  }


  /*
   * Fresh-install bootstrap.
   *
   * An absent TX repository can be automatically
   * initialised ONLY when the wallet-balance
   * repository is also absent.
   *
   * If balances already exist, PAY54 cannot prove
   * whether this is a legitimate zero-transaction
   * account or transaction-history loss.
   *
   * In that situation we fail closed.
   */

  if(
    inspection.state ===
      TX_REPOSITORY_STATE
        .UNINITIALIZED
  ){

    let existingBalances;

    try{

      existingBalances =
        storageGet(
          LS.BALANCES
        );

    }catch(error){

      console.error(
        "[PAY54_LEDGER] Unable to determine transaction repository bootstrap safety.",
        error
      );

      return;

    }


    if(
      existingBalances === null ||
      existingBalances === undefined
    ){

      initializeTransactionRepository();

      return;

    }


    console.error(
      "[PAY54_LEDGER] Canonical transaction repository is absent while wallet state already exists. Financial history state is unknown; repository was NOT automatically initialised."
    );


    publishLedgerEvent(
      "ledger.transaction.repository.state.unknown",
      {
        state:
          inspection.state,

        code:
          inspection.code,

        balancesRepositoryPresent:
          true,

        occurredAt:
          nowISO()
      }
    );

  }

}


function getTransactionRepositoryStatus(){

  const inspection =
    inspectTransactionRepository();


  return Object.freeze({

    state:
      inspection.state,

    code:
      inspection.code,

    reason:
      inspection.reason,

    recordCount:
      Array.isArray(
        inspection.transactions
      )
        ? inspection.transactions.length
        : null,

    metadata:
      inspection.metadata
        ? Object.freeze({
            ...inspection.metadata
          })
        : null

  });

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

  function getTx(){

  let inspection =
    inspectTransactionRepository();


  /*
   * Existing legacy repository can be adopted safely
   * because the transaction array itself still exists.
   */

  if(
    inspection.state ===
      TX_REPOSITORY_STATE
        .LEGACY_VALID
  ){

    inspection =
      adoptLegacyTransactionRepository(
        inspection
      );

  }


  if(
    inspection.state !==
      TX_REPOSITORY_STATE.VALID
  ){

    publishLedgerEvent(
      "ledger.transaction.repository.read.blocked",
      {
        state:
          inspection.state,

        code:
          inspection.code,

        reason:
          inspection.reason,

        occurredAt:
          nowISO()
      }
    );


    throw transactionRepositoryError(
      inspection.code ||
        "TX_REPOSITORY_UNAVAILABLE",

      inspection.reason ||
        "Canonical transaction repository is unavailable.",

      {
        state:
          inspection.state
      }
    );

  }


  return inspection.transactions;

}


function setTx(list){

  if(
    !Array.isArray(
      list
    )
  ){

    throw new TypeError(
      "Canonical transaction repository update must be an array."
    );

  }


  let inspection =
    inspectTransactionRepository();


  if(
    inspection.state ===
      TX_REPOSITORY_STATE
        .LEGACY_VALID
  ){

    inspection =
      adoptLegacyTransactionRepository(
        inspection
      );

  }


  /*
   * Never overwrite a repository whose state is
   * missing, corrupt, inconsistent or unavailable.
   *
   * Doing so could destroy evidence needed for
   * financial reconciliation.
   */

  if(
    inspection.state !==
      TX_REPOSITORY_STATE.VALID
  ){

    throw transactionRepositoryError(
      inspection.code ||
        "TX_REPOSITORY_WRITE_BLOCKED",

      inspection.reason ||
        "Canonical transaction repository cannot be safely updated.",

      {
        state:
          inspection.state
      }
    );

  }


  persistTransactionRepository(
    list,
    inspection.metadata
  );

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
   /* ==========================================================
   ENTERPRISE SESSION VALIDATION
========================================================== */

if(

    SESSION &&

    typeof SESSION.isAuthenticated === "function"

){

    if(

        !SESSION.isAuthenticated()

    ){

        publishLedgerEvent(

            "ledger.security.session.invalid",

            {

                timestamp:

                    nowISO()

            }

        );

        return null;

    }

}
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
   /* ==========================================================
   ENTERPRISE TRANSACTION GUARD
========================================================== */

if(

    TRANSACTION_GUARD &&

    typeof TRANSACTION_GUARD.evaluateTransaction === "function"

){

    const guardResult =

        TRANSACTION_GUARD.evaluateTransaction({

    id:

        e.id,

    walletId:

        e.meta?.walletId ??

        "",

    beneficiary:

        e.meta?.beneficiary ??

        e.meta?.recipient ??

        "",

    recipient:

        e.meta?.recipient ??

        "",

    reference:

        e.meta?.reference ??

        e.id,

    provider:

        e.meta?.provider ??

        "",

    route:

        e.meta?.route ??

        "",

    account_name:

        e.meta?.account_name ??

        "",

    account_no:

        e.meta?.account_no ??

        "",

    paymentMethod:

        e.meta?.paymentMethod ??

        e.meta?.method ??

        "",

    channel:

        e.meta?.channel ??

        "wallet",

    country:

        e.meta?.country ??

        "",

    deviceId:

        e.meta?.deviceId ??

        "",

    ipAddress:

        e.meta?.ipAddress ??

        "",

    userAgent:

        navigator.userAgent,

    currency:

        e.currency,

    amount:

        Math.abs(

            Number(

                e.amount

            )

        ),

    type:

        e.type,

    meta:

        e.meta

});

    if(

        !guardResult ||

        !guardResult.approved

    ){

        publishLedgerEvent(

            "ledger.security.guard.rejected",

            {

                transaction:

                    e.id,

                reason:

                    guardResult?.reason ??

                    "TRANSACTION_REJECTED",

                timestamp:

                    nowISO()

            }

        );

        return null;

    }

    publishLedgerEvent(

        "ledger.security.guard.approved",

        {

            transaction:

                e.id,

            reference:

                guardResult.reference,

            timestamp:

                nowISO()

        }

    );

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

/*
 * ==========================================================
 * FINANCIAL PERSISTENCE PREFLIGHT
 * ==========================================================
 *
 * Transaction repository integrity MUST be established
 * before any wallet balance is changed.
 *
 * A missing/corrupt/unknown history repository therefore
 * blocks the financial mutation before money can move.
 */

const list =
  getTx();


const balances =
  getBalances();


const previousBalances =
  {
    ...balances
  };


const previousBalance =
  Number(
    balances[e.currency] ?? 0
  );


balances[e.currency] =
  previousBalance +
  Number(
    e.amount
  );


const nextTransactions =
  [
    e,
    ...list
  ];


try{

  setBalances(
    balances
  );


  setTx(
    nextTransactions
  );

}catch(error){

  /*
   * Defence-in-depth rollback.
   *
   * If transaction persistence fails after the wallet
   * write, restore the balance snapshot immediately.
   */

  try{

    storageSet(
      LS.BALANCES,
      JSON.stringify(
        previousBalances
      )
    );


    publishLedgerEvent(
      "ledger.balance.rollback.completed",
      {
        transactionId:
          e.id || null,

        currency:
          e.currency,

        restoredBalance:
          previousBalance,

        occurredAt:
          nowISO()
      }
    );

  }catch(rollbackError){

    publishLedgerEvent(
      "ledger.balance.rollback.failed",
      {
        transactionId:
          e.id || null,

        currency:
          e.currency,

        originalError:
          error?.message ||
          String(error),

        rollbackError:
          rollbackError?.message ||
          String(rollbackError),

        occurredAt:
          nowISO()
      }
    );


    console.error(
      "[PAY54_LEDGER] CRITICAL: transaction persistence failed and wallet rollback could not be confirmed.",
      {
        transactionId:
          e.id || null,

        error,

        rollbackError
      }
    );

  }


  throw error;

}

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
   /* ==========================================================
   TRANSACTION REPOSITORY BOOTSTRAP
========================================================== */

bootstrapTransactionRepository();
/* ==========================================================
   SECURITY BOOTSTRAP VERIFICATION
========================================================== */

if(

    SECURITY_BOOTSTRAP &&

    typeof SECURITY_BOOTSTRAP.verify === "function"

){

    SECURITY_BOOTSTRAP.verify(

        "ledger"

    );

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

getTransactionRepositoryStatus,
initializeTransactionRepository,

TX_REPOSITORY_STATE,

createEntry,
applyEntry
};
})();
