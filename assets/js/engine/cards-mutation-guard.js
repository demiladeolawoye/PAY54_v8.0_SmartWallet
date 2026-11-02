
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — CARDS MUTATION GUARD
   File: assets/js/engine/cards-mutation-guard.js
   Version: 1.0.1
   Work Package: WP-TITAN-CARDS-001D.9D.3

   Purpose:
   - Protect the public Cards Engine mutation boundary.
   - Enforce active Titan authentication.
   - Validate repository state before and after mutation.
   - Preserve recovery-history metadata.
   - Verify committed changes through fresh repository reads.
   - Avoid automatic retries following uncertain writes.
   - Preserve development linked-card funding audit projections.

   Deployment policy:
   - Development/test/staging only.
   - Real-money mode prohibited.
   - No repository writes during installation.
   - No automatic migration or recovery.
   - No direct card-balance mutation.
   - No privileged bulk repository replacement.

   Security limitations:
   - This is a browser-side development guard, not a trusted
     server-side authorization mechanism.
   - Browser callers cannot prove provider settlement.
   - Card audit entries are non-authoritative projections.
   - Browser storage is not suitable as the authoritative
     financial ledger for production.
========================================================================== */

(() => {
  "use strict";

  const GLOBAL = window;
  const VERSION = "1.0.1";
  const NAME = "PAY54 Enterprise Cards Mutation Guard";

  const ENGINE = GLOBAL.PAY54_CARDS;
  const CONFIG = GLOBAL.PAY54_CONFIG;

  const GUARDED_METHODS = Object.freeze([
    "addCard",
    "deleteCard",
    "toggleFreeze",
    "setDefault",
    "updateControls",
    "addCardTransaction"
  ]);

  const PRIVILEGED_METHODS = Object.freeze([
    "saveCards",
    "establishCardRepositoryRecoveryBaseline",
    "updateCardBalance"
  ]);

  const REQUIRED_READ_METHODS = Object.freeze([
    "getCards",
    "getCardById",
    "getCardRepositoryStatus",
    "getCardTransactions"
  ]);

  const state = {
    installed: false,
    attempts: 0,
    successful: 0,
    denied: 0,
    uncertain: 0,
    lastError: null,
    mutationInProgress: false
  };

  function error(code, message, cause) {
    const result = new Error(message);

    result.name = "PAY54CardsGuardError";
    result.code = code;

    if (cause !== undefined) {
      result.cause = cause;
    }

    return result;
  }

  function reject(code, message) {
    state.denied += 1;
    state.lastError = code;

    throw error(code, message);
  }

  function session() {
    return GLOBAL.PAY54_SECURITY?.session ?? null;
  }

  function authenticated() {
    try {
      return session()?.isAuthenticated?.() === true;
    } catch {
      return false;
    }
  }

  function developmentAllowed() {
    try {
      const environment = CONFIG?.get?.(
        "environment.name",
        null
      );

      return (
        typeof CONFIG?.isProduction === "function" &&
        CONFIG.isProduction() === false &&
        ["development", "test", "staging"].includes(
          environment
        ) &&
        CONFIG.get(
          "environment.realMoneyMode",
          true
        ) === false &&
        CONFIG.get(
          "environment.allowDevelopmentProviders",
          false
        ) === true
      );
    } catch {
      return false;
    }
  }

  function assertAuthorized() {
    if (!developmentAllowed()) {
      reject(
        "CARD_DEVELOPMENT_MODE_REQUIRED",
        "Card development operations are disabled."
      );
    }

    if (!authenticated()) {
      reject(
        "CARD_AUTHENTICATION_REQUIRED",
        "An active PAY54 session is required."
      );
    }
  }

  function validId(value) {
    return (
      typeof value === "string" &&
      value.length > 0 &&
      value.length <= 128 &&
      value.trim() === value &&
      !/[\u0000-\u001f\u007f]/.test(value)
    );
  }

  function isPlainObject(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  }

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    if (
      typeof GLOBAL.structuredClone === "function"
    ) {
      return GLOBAL.structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function stableValue(value) {
    return JSON.stringify(value ?? null);
  }

  function status() {
    const result =
      ENGINE.getCardRepositoryStatus();

    if (
      !result ||
      result.state !== "VALID" ||
      !Number.isSafeInteger(
        result.metadata?.revision
      ) ||
      result.metadata.revision < 0 ||
      !Number.isSafeInteger(result.recordCount) ||
      result.recordCount < 0
    ) {
      reject(
        "CARD_REPOSITORY_INVALID",
        "Card repository is unavailable or invalid."
      );
    }

    return result;
  }

  function readCards() {
    const cards = ENGINE.getCards();

    if (!Array.isArray(cards)) {
      reject(
        "CARD_COLLECTION_INVALID",
        "Card Engine returned an invalid collection."
      );
    }

    return clone(cards);
  }

  function snapshot() {
    const repository = status();
    const cards = readCards();

    if (cards.length !== repository.recordCount) {
      reject(
        "CARD_RECORD_COUNT_MISMATCH",
        "Card collection does not match repository metadata."
      );
    }

    return {
      repository: clone(repository),
      cards
    };
  }

  function cardById(cards, id) {
    if (!validId(id)) {
      reject(
        "CARD_INVALID_ID",
        "A valid card identifier is required."
      );
    }

    const card = cards.find(item => item?.id === id);

    if (!card) {
      reject(
        "CARD_NOT_FOUND",
        "The specified card does not exist."
      );
    }

    return card;
  }

  function cardType(card) {
    return String(
      card?.type ??
      card?.cardType ??
      card?.card_type ??
      card?.kind ??
      ""
    ).toLowerCase();
  }

  function isDevelopmentVirtual(card) {
    return (
      cardType(card) === "virtual" ||
      cardType(card) === "pay54_virtual" ||
      card.developmentVirtual === true ||
      card.development === true
    );
  }

  function validateAudit(record) {
    if (!isPlainObject(record)) {
      reject(
        "CARD_AUDIT_INVALID",
        "Card audit entry must be an object."
      );
    }

    if (
      !["funding", "funding_reversal"].includes(
        record.type
      )
    ) {
      reject(
        "CARD_AUDIT_TYPE_INVALID",
        "Unsupported card audit operation."
      );
    }

    if (
      record.type === "funding" &&
      (
        record.status !== "committed" ||
        record.direction !== "debit" ||
        !record.commitId
      )
    ) {
      reject(
        "CARD_AUDIT_COMMIT_INVALID",
        "Funding audit requires a committed reference."
      );
    }

    if (
      record.type === "funding_reversal" &&
      (
        record.status !== "reversed" ||
        record.direction !== "credit" ||
        !record.commitId ||
        !record.reversalId
      )
    ) {
      reject(
        "CARD_AUDIT_REVERSAL_INVALID",
        "Reversal audit requires provider references."
      );
    }

    for (const field of [
      "operationId",
      "authorizationId",
      "commitId"
    ]) {
      if (
        typeof record[field] !== "string" ||
        record[field].trim().length === 0
      ) {
        reject(
          "CARD_AUDIT_REFERENCE_INVALID",
          `Card audit requires ${field}.`
        );
      }
    }

    for (const field of [
      "amount",
      "paymentAmount"
    ]) {
      if (
        typeof record[field] !== "number" ||
        !Number.isFinite(record[field]) ||
        record[field] <= 0
      ) {
        reject(
          "CARD_AUDIT_AMOUNT_INVALID",
          `Card audit ${field} is invalid.`
        );
      }
    }

    for (const field of [
      "currency",
      "paymentCurrency"
    ]) {
      if (
        typeof record[field] !== "string" ||
        !/^[A-Z]{3}$/.test(record[field])
      ) {
        reject(
          "CARD_AUDIT_CURRENCY_INVALID",
          `Card audit ${field} is invalid.`
        );
      }
    }

   if (
  record.type === "funding" &&
  (
    typeof record.quoteId !== "string" ||
    !record.quoteId.trim()
  )
) {
      reject(
        "CARD_AUDIT_QUOTE_INVALID",
        "Card audit requires a quote reference."
      );
    }

    if (
      typeof record.fundingSourceId !== "string" ||
      !record.fundingSourceId.trim()
    ) {
      reject(
        "CARD_AUDIT_SOURCE_INVALID",
        "Card audit requires a funding source."
      );
    }

    if (
      record.type === "funding_reversal" &&
      (
        typeof record.reversalId !== "string" ||
        !record.reversalId.trim()
      )
    ) {
      reject(
        "CARD_AUDIT_REVERSAL_REFERENCE_INVALID",
        "Card audit requires a reversal identifier."
      );
    }

    const forbidden = new Set([
      "pan",
      "cardnumber",
      "card_number",
      "cvv",
      "cvc",
      "pin",
      "otp",
      "password",
      "secret"
    ]);

    if (
      Object.keys(record).some(
        field => forbidden.has(field.toLowerCase())
      )
    ) {
      reject(
        "CARD_AUDIT_SENSITIVE_DATA",
        "Sensitive payment credentials are prohibited."
      );
    }
  }

  function validate(method, args, before) {
    if (method === "addCard") {
      const candidate = args[0];

      if (!isPlainObject(candidate)) {
        reject(
          "CARD_INPUT_INVALID",
          "Card creation requires a card object."
        );
      }

      if (
        candidate.id !== undefined &&
        !validId(candidate.id)
      ) {
        reject(
          "CARD_INVALID_ID",
          "Card identifier is invalid."
        );
      }

      if (
        candidate.id &&
        before.cards.some(
          card => card.id === candidate.id
        )
      ) {
        reject(
          "CARD_DUPLICATE_ID",
          "A card with this identifier already exists."
        );
      }

      if (
        isDevelopmentVirtual(candidate) &&
        before.cards.some(isDevelopmentVirtual)
      ) {
        reject(
          "CARD_DUPLICATE_VIRTUAL",
          "A development virtual card already exists."
        );
      }

      return;
    }

    const card = cardById(
      before.cards,
      args[0]
    );

    if (
      method === "setDefault" &&
      card.default === true
    ) {
      reject(
        "CARD_ALREADY_DEFAULT",
        "The selected card is already the default."
      );
    }

    if (
      method === "updateControls" &&
      !isPlainObject(args[1])
    ) {
      reject(
        "CARD_CONTROLS_INVALID",
        "Card controls must be an object."
      );
    }

    if (method === "addCardTransaction") {
      validateAudit(args[1]);
    }
  }

  function metadataPreserved(before, after) {
    const oldStatus = before.repository;
    const newStatus = after.repository;

    const fields = [
      "historyContinuity",
      "historicalGap",
      "recoveryBaselineAt",
      "recoveryReason",
      "recoveryAcknowledged"
    ];

    for (const field of fields) {
      if (
        stableValue(oldStatus[field]) !==
        stableValue(newStatus[field])
      ) {
        return false;
      }

      if (
        stableValue(oldStatus.metadata?.[field]) !==
        stableValue(newStatus.metadata?.[field])
      ) {
        return false;
      }
    }

    return true;
  }

  function verify(method, args, before, after) {
    const oldCards = before.cards;
    const newCards = after.cards;

    if (
      after.repository.metadata.revision !==
      before.repository.metadata.revision + 1
    ) {
      return false;
    }

    if (!metadataPreserved(before, after)) {
      return false;
    }

    const id = args[0];

    if (method === "addCard") {
      if (newCards.length !== oldCards.length + 1) {
        return false;
      }

      const oldIds = new Set(
        oldCards.map(card => card.id)
      );

      const inserted = newCards.filter(
        card => !oldIds.has(card.id)
      );

      return (
        inserted.length === 1 &&
        validId(inserted[0].id) &&
        (
          !args[0].id ||
          inserted[0].id === args[0].id
        )
      );
    }

    const oldCard = oldCards.find(
      card => card.id === id
    );

    const newCard = newCards.find(
      card => card.id === id
    );

    if (method === "deleteCard") {
      return (
        newCard === undefined &&
        newCards.length === oldCards.length - 1
      );
    }

    if (
      newCards.length !== oldCards.length ||
      !newCard
    ) {
      return false;
    }

    if (method === "toggleFreeze") {
      return (
        newCard.frozen ===
        !(oldCard.frozen === true)
      );
    }

    if (method === "setDefault") {
      return (
        newCard.default === true &&
        newCards.filter(
          card => card.default === true
        ).length === 1
      );
    }

    if (method === "updateControls") {
      if (!isPlainObject(newCard.controls)) {
        return false;
      }

      return Object.entries(args[1]).every(
        ([key, value]) =>
          stableValue(newCard.controls[key]) ===
          stableValue(value)
      );
    }

    if (method === "addCardTransaction") {
      const previous = Array.isArray(
        oldCard.transactions
      )
        ? oldCard.transactions
        : [];

      const current = Array.isArray(
        newCard.transactions
      )
        ? newCard.transactions
        : [];

      const expected = args[1];

      return (
        current.length === previous.length + 1 &&
        current[0]?.type === expected.type &&
        current[0]?.operationId ===
          expected.operationId &&
        current[0]?.commitId ===
          expected.commitId
      );
    }

    return false;
  }

  function execute(method, args) {
    state.attempts += 1;

    assertAuthorized();

    if (state.mutationInProgress) {
      reject(
        "CARD_MUTATION_IN_PROGRESS",
        "Another card operation is in progress."
      );
    }

    const before = snapshot();

    validate(method, args, before);

    state.mutationInProgress = true;

    try {
      assertAuthorized();

      const result = ENGINE[method](...args);

      if (
        result &&
        typeof result.then === "function"
      ) {
        throw error(
          "CARD_ASYNC_RESULT_UNSUPPORTED",
          "Unexpected asynchronous Card Engine result."
        );
      }

      const after = snapshot();

      if (!verify(method, args, before, after)) {
        throw error(
          "CARD_VERIFICATION_FAILED",
          "Card repository verification failed."
        );
      }

      state.successful += 1;
      state.lastError = null;

      return result;
    } catch (cause) {
      state.uncertain += 1;
      state.lastError = "CARD_COMMIT_UNCERTAIN";

      throw error(
        "CARD_COMMIT_UNCERTAIN",
        "The card operation outcome is uncertain. " +
        "Do not retry before repository inspection.",
        cause
      );
    } finally {
      state.mutationInProgress = false;
    }
  }

  function blockPrivileged(method) {
    state.attempts += 1;

    reject(
      "CARD_PRIVILEGED_OPERATION_BLOCKED",
      `${method} is not available through the ` +
      "guarded application interface."
    );
  }

  function verifyInstallationContract() {
    if (
      !ENGINE ||
      ENGINE.version !== "11.0.0"
    ) {
      throw error(
        "CARD_ENGINE_VERSION_MISMATCH",
        "PAY54 Card Engine v11.0.0 is required."
      );
    }

    if (!developmentAllowed()) {
      throw error(
        "CARD_GUARD_ENVIRONMENT_REJECTED",
        "Cards Mutation Guard is development-only."
      );
    }

    if (
      typeof session()?.isAuthenticated !==
      "function"
    ) {
      throw error(
        "CARD_SESSION_UNAVAILABLE",
        "Titan session manager is unavailable."
      );
    }

    if (GLOBAL.PAY54_CARDS_GUARD) {
      throw error(
        "CARD_GUARD_ALREADY_INSTALLED",
        "Cards Mutation Guard is already installed."
      );
    }

    for (const method of [
      ...GUARDED_METHODS,
      ...PRIVILEGED_METHODS,
      ...REQUIRED_READ_METHODS
    ]) {
      if (
        typeof ENGINE[method] !== "function"
      ) {
        throw error(
          "CARD_ENGINE_CONTRACT_MISMATCH",
          `Missing Cards Engine method: ${method}`
        );
      }
    }
  }

  verifyInstallationContract();

  const facade = {};

  for (const key of Object.keys(ENGINE)) {
    if (GUARDED_METHODS.includes(key)) {
      facade[key] = (...args) =>
        execute(key, args);
    } else if (PRIVILEGED_METHODS.includes(key)) {
      facade[key] = () =>
        blockPrivileged(key);
    } else {
      facade[key] = ENGINE[key];
    }
  }

  const publicEngine = Object.freeze(facade);

  const guardApi = Object.freeze({
    name: NAME,
    version: VERSION,

    health() {
      let repositoryState = "UNAVAILABLE";
      let revision = null;
      let recordCount = null;

      try {
        const result =
          ENGINE.getCardRepositoryStatus();

        repositoryState =
          result?.state ?? "UNAVAILABLE";

        revision =
          result?.metadata?.revision ?? null;

        recordCount =
          result?.recordCount ?? null;
      } catch {
        repositoryState = "ERROR";
      }

      return Object.freeze({
        version: VERSION,
        installed:
          state.installed &&
          GLOBAL.PAY54_CARDS === publicEngine,
        developmentAllowed: developmentAllowed(),
        authenticated: authenticated(),
        repositoryState,
        revision,
        recordCount,
        mutationInProgress: state.mutationInProgress,
        attempts: state.attempts,
        successful: state.successful,
        denied: state.denied,
        uncertain: state.uncertain,
        lastError: state.lastError
      });
    }
  });

  /*
   * Installation changes the in-memory public interface only.
   * No persistent repository data is written here.
   */
  GLOBAL.PAY54_CARDS = publicEngine;
  GLOBAL.PAY54_CARDS_GUARD = guardApi;

  state.installed = true;

  console.info(
    `[PAY54_CARDS_GUARD] ${NAME} v${VERSION} ready.`
  );
})();
