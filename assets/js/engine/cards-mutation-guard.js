
"use strict";

/*
 * PAY54 Enterprise Cards Mutation Guard v1.0.0
 * WP-TITAN-CARDS-001D.9D.1
 *
 * Browser-development defence-in-depth boundary.
 * Does not alter stored data during installation.
 */

(() => {
  "use strict";

  const W = window;
  const VERSION = "1.0.0";
  const current = W.PAY54_CARDS;

  const securedMethods = new Set([
    "addCard",
    "deleteCard",
    "toggleFreeze",
    "setDefault",
    "updateCardBalance",
    "updateControls",
    "addCardTransaction"
  ]);

  let attempts = 0;
  let denied = 0;
  let uncertain = 0;
  let lastFailure = null;

  const session = () => W.PAY54_SECURITY?.session;
  const config = () => W.PAY54_CONFIG;

  function failure(code, message) {
    const error = new Error(message);
    error.name = "PAY54CardOperationError";
    error.code = code;

    denied += 1;
    lastFailure = code;

    return error;
  }

  function requireSession() {
    if (session()?.isAuthenticated?.() !== true) {
      throw failure(
        "CARD_AUTH_REQUIRED",
        "An active PAY54 session is required."
      );
    }
  }

  function repository() {
    const status = current.getCardRepositoryStatus();

    if (
      status?.state !== "VALID" ||
      !Number.isSafeInteger(status?.metadata?.revision)
    ) {
      throw failure(
        "CARD_REPOSITORY_NOT_VALID",
        "Card repository is not safe for mutation."
      );
    }

    return status;
  }

  function developmentAllowed() {
    const c = config();

    return (
      c?.isProduction?.() === false &&
      ["development", "test", "staging"].includes(
        c?.get?.("environment.name", "")
      ) &&
      c?.get?.("environment.realMoneyMode", true) === false &&
      c?.get?.(
        "environment.allowDevelopmentProviders",
        false
      ) === true
    );
  }

  function validId(id) {
    return (
      typeof id === "string" &&
      id.length > 0 &&
      id.length <= 256 &&
      !/[\u0000-\u001f\u007f]/.test(id)
    );
  }

  function cardById(id) {
    if (!validId(id)) {
      throw failure(
        "CARD_INVALID_ID",
        "A valid card identifier is required."
      );
    }

    const match = current.getCards().find(
      card => card?.id === id
    );

    if (!match) {
      throw failure(
        "CARD_NOT_FOUND",
        "The specified card does not exist."
      );
    }

    return match;
  }

  function isVirtual(card) {
    return (
      card?.type === "virtual" ||
      card?.cardType === "virtual" ||
      card?.instrumentType === "virtual" ||
      card?.developmentVirtual === true ||
      card?.development === true
    );
  }

  function validate(method, args) {
    if (method === "addCard") {
      const card = args[0];

      if (
        !developmentAllowed() ||
        !card ||
        typeof card !== "object" ||
        Array.isArray(card)
      ) {
        throw failure(
          "CARD_ISSUANCE_NOT_AUTHORISED",
          "Development card creation is not authorised."
        );
      }

      if (
        card.id !== undefined &&
        !validId(card.id)
      ) {
        throw failure(
          "CARD_INVALID_ID",
          "The supplied card identifier is invalid."
        );
      }

      const existing = current.getCards();

      if (
        card.id &&
        existing.some(item => item.id === card.id)
      ) {
        throw failure(
          "CARD_DUPLICATE_ID",
          "A card with this identifier already exists."
        );
      }

      if (
        isVirtual(card) &&
        existing.some(isVirtual)
      ) {
        throw failure(
          "CARD_DUPLICATE_VIRTUAL",
          "A development virtual card already exists."
        );
      }

      return;
    }

    const card = cardById(args[0]);

    if (
      method === "setDefault" &&
      card.default === true
    ) {
      throw failure(
        "CARD_ALREADY_DEFAULT",
        "This is already the default card."
      );
    }

    if (method === "updateCardBalance") {
      throw failure(
        "CARD_BALANCE_BACKEND_REQUIRED",
        "Card balance changes require an authorised funding service."
      );
    }

    if (method === "addCardTransaction") {
      throw failure(
        "CARD_ACTIVITY_BACKEND_REQUIRED",
        "Card financial activity requires an authorised transaction service."
      );
    }

    if (
      method === "updateControls" &&
      (
        !args[1] ||
        typeof args[1] !== "object" ||
        Array.isArray(args[1])
      )
    ) {
      throw failure(
        "CARD_INVALID_CONTROLS",
        "Card controls must be a valid object."
      );
    }
  }

  function verify(method, args, before, result) {
    const after = repository();

    if (
      after.metadata.revision !==
      before.metadata.revision + 1
    ) {
      return false;
    }

    if (
      after.historyContinuity !== before.historyContinuity ||
      after.historicalGap !== before.historicalGap ||
      after.recoveryBaselineAt !== before.recoveryBaselineAt ||
      after.metadata.recoveryReason !==
        before.metadata.recoveryReason ||
      after.metadata.recoveryAcknowledged !==
        before.metadata.recoveryAcknowledged
    ) {
      return false;
    }

    const list = current.getCards();

    const card = list.find(
      item => item.id === args[0]
    );

    if (method === "addCard") {
      return (
        after.recordCount === before.recordCount + 1 &&
        validId(result?.id) &&
        list.some(item => item.id === result.id)
      );
    }

    if (method === "deleteCard") {
      return (
        !card &&
        after.recordCount === before.recordCount - 1
      );
    }

    if (method === "toggleFreeze") {
      return card?.frozen === !args[1];
    }

    if (method === "setDefault") {
      return (
        card?.default === true &&
        list.filter(item => item.default === true)
          .length === 1
      );
    }

    return after.recordCount === before.recordCount;
  }

  function guarded(method, args) {
    attempts += 1;

    requireSession();

    const before = repository();

    validate(method, args);

    const previousCard =
      method === "toggleFreeze"
        ? cardById(args[0])
        : null;

    let result;
    let writeStarted = false;

    try {
      requireSession();

      writeStarted = true;

      result = current[method](...args);

      const verificationArgs =
        method === "toggleFreeze"
          ? [args[0], previousCard.frozen]
          : args;

      if (
        !verify(
          method,
          verificationArgs,
          before,
          result
        )
      ) {
        throw new Error(
          "Post-write verification mismatch."
        );
      }

      return result;
    } catch (error) {
      if (writeStarted) {
        uncertain += 1;
        lastFailure = "CARD_COMMIT_UNCERTAIN";

        const wrapped = new Error(
          "Card operation outcome is uncertain. " +
          "Do not retry before inspecting the repository."
        );

        wrapped.name =
          "PAY54CardCommitUncertainError";

        wrapped.code =
          "CARD_COMMIT_UNCERTAIN";

        wrapped.cause = error;

        throw wrapped;
      }

      throw error;
    }
  }

  if (
    !current ||
    current.version !== "11.0.0" ||
    typeof current.getCardRepositoryStatus !==
      "function"
  ) {
    throw new Error(
      "[PAY54_CARDS_GUARD] Cards Engine v11.0.0 required."
    );
  }

  if (W.PAY54_CARDS_GUARD) {
    throw new Error(
      "[PAY54_CARDS_GUARD] Guard already installed."
    );
  }

  if (
    typeof W.PAY54_SECURITY?.session
      ?.isAuthenticated !== "function"
  ) {
    throw new Error(
      "[PAY54_CARDS_GUARD] Titan session manager required."
    );
  }

  const facade = {};

  for (const key of Object.keys(current)) {
    if (securedMethods.has(key)) {
      if (typeof current[key] !== "function") {
        throw new Error(
          `[PAY54_CARDS_GUARD] Missing ${key} method.`
        );
      }

      facade[key] =
        (...args) => guarded(key, args);

    } else if (
      key === "saveCards" ||
      key === "establishCardRepositoryRecoveryBaseline"
    ) {
      facade[key] = () => {
        throw failure(
          "CARD_PRIVILEGED_WRITE_DISABLED",
          "Direct repository writes and recovery " +
          "are unavailable via the application interface."
        );
      };
    } else {
      facade[key] = current[key];
    }
  }

  W.PAY54_CARDS = Object.freeze(facade);

  W.PAY54_CARDS_GUARD = Object.freeze({
    version: VERSION,

    health: () => Object.freeze({
      version: VERSION,
      installed:
        W.PAY54_CARDS === facade,

      authenticated:
        session()?.isAuthenticated?.() === true,

      repositoryState:
        current.getCardRepositoryStatus()?.state ??
        null,

      attempts,
      denied,
      uncertain,
      lastFailure
    })
  });

  console.info(
    `[PAY54_CARDS_GUARD] v${VERSION} installed; ` +
    "repository unchanged."
  );
})();
