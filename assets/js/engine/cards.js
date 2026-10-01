"use strict";

/* ========================================================================
   PAY54 ENTERPRISE EVENT BRIDGE
======================================================================== */

const CARD_EVENTS = Object.freeze({

    CREATED:
        "cards.created",

    UPDATED:
        "cards.updated",

    DELETED:
        "cards.deleted",

    FROZEN:
        "cards.frozen",

    UNFROZEN:
        "cards.unfrozen",

    DEFAULT_CHANGED:
        "cards.default.changed"

});

function publishCardEvent(
    eventName,
    payload = {}
){

    try{

        const eventBus =
            window.PAY54_EVENTS || null;

        if(
            eventBus &&
            typeof eventBus.publish === "function"
        ){

            eventBus.publish(
                eventName,
                payload,
                {
                    source: "cards"
                }
            );

        }

    }catch(error){

        console.error(
            "[PAY54_CARDS]",
            error
        );

    }

}
/* =========================================
   PAY54 ENTERPRISE CARDS ENGINE
   Version 11.0.0
========================================= */

window.PAY54_CARDS = (function(){

const STORAGE_KEY =
  "pay54_cards";

const STORAGE_META_KEY =
  "pay54_cards_meta";

const ENGINE_VERSION =
  "11.0.0";

const ENGINE_NAME =
  "PAY54 Enterprise Cards Engine";
/* ==========================================================
   CANONICAL CARD REPOSITORY INTEGRITY
   Work Package: WP-011B.6E.5G.5G.7
========================================================== */

const CARD_REPOSITORY_SCHEMA_VERSION =
  1;

const CARD_REPOSITORY_DOCUMENT_TYPE =
  "pay54.cards.repository.meta";

const CARD_REPOSITORY_STATE =
  Object.freeze({

    UNINITIALIZED:
      "UNINITIALIZED",

    LEGACY_VALID:
      "LEGACY_VALID",

    VALID:
      "VALID",

    LOST:
      "LOST",

    CORRUPT:
      "CORRUPT",

    INCONSISTENT:
      "INCONSISTENT",

    UNAVAILABLE:
      "UNAVAILABLE"

  });
   /* ==========================================================
   CARD HISTORY CONTINUITY
   Work Package: WP-011B.6E.5G.5G.7 — Stage 2
========================================================== */

const CARD_HISTORY_CONTINUITY =
  Object.freeze({

    COMPLETE:
      "COMPLETE",

    UNKNOWN_BEFORE_BASELINE:
      "UNKNOWN_BEFORE_BASELINE"

  });


const CARD_REPOSITORY_BASELINE_TYPE =
  Object.freeze({

    NORMAL_INITIALIZATION:
      "NORMAL_INITIALIZATION",

    HISTORICAL_GAP_RECOVERY:
      "HISTORICAL_GAP_RECOVERY"

  });
   const STORAGE =
window.PAY54_SECURITY?.storage;

function now(){

  return new Date()
    .toISOString();

}

function uuid(){

  if(
    window.crypto &&
    crypto.randomUUID
  ){

    return crypto.randomUUID();

  }

  return (

    Date.now()
      .toString(36)

    +

    Math.random()
      .toString(36)
      .substring(2)

  );

}
/* ==========================================================
   STORAGE BOUNDARY
========================================================== */

function storageGet(
  key
){

  if(STORAGE){

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

  if(STORAGE){

    STORAGE.set(
      key,
      value
    );

    return;

  }

  localStorage.setItem(
    key,
    JSON.stringify(
      value
    )
  );

}


function isPlainObject(
  value
){

  return Boolean(

    value &&

    typeof value ===
      "object" &&

    !Array.isArray(
      value
    )

  );

}


function parseStoredDocument(
  raw
){

  if(
    raw === null ||
    raw === undefined
  ){

    return {

      exists:
        false,

      valid:
        false,

      value:
        null,

      error:
        null

    };

  }


  if(
    typeof raw !==
      "string"
  ){

    return {

      exists:
        true,

      valid:
        true,

      value:
        raw,

      error:
        null

    };

  }


  try{

    return {

      exists:
        true,

      valid:
        true,

      value:
        JSON.parse(
          raw
        ),

      error:
        null

    };

  }catch(error){

    return {

      exists:
        true,

      valid:
        false,

      value:
        null,

      error

    };

  }

}


function cardRepositoryError(
  code,
  message,
  details = {}
){

  const error =
    new Error(
      message
    );

  error.name =
    "PAY54CardRepositoryError";

  error.code =
    code;

  error.details =
    Object.freeze({
      ...details
    });

  return error;

}


/* ==========================================================
   REPOSITORY DIGEST
========================================================== */

function calculateCardRepositoryDigest(
  cards
){

  const canonical =
    JSON.stringify(
      Array.isArray(cards)
        ? cards
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
      canonical.charCodeAt(
        index
      );

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


/* ==========================================================
   METADATA CONTRACT
========================================================== */

function isLegacyCardRepositoryMeta(
  metadata
){

  return Boolean(

    isPlainObject(
      metadata
    ) &&

    metadata.version ===
      ENGINE_VERSION &&

    metadata.engine ===
      ENGINE_NAME &&

    typeof metadata.updated ===
      "string" &&

    Number.isInteger(
      metadata.cards
    ) &&

    metadata.cards >= 0

  );

}


function isValidCardRepositoryMeta(
  metadata
){

  if(
    !isPlainObject(
      metadata
    ) ||

    metadata.schemaVersion !==
      CARD_REPOSITORY_SCHEMA_VERSION ||

    metadata.documentType !==
      CARD_REPOSITORY_DOCUMENT_TYPE ||

    metadata.engineVersion !==
      ENGINE_VERSION ||

    metadata.engine !==
      ENGINE_NAME ||

    typeof metadata.initializedAt !==
      "string" ||

    !metadata.initializedAt ||

    typeof metadata.updatedAt !==
      "string" ||

    !metadata.updatedAt ||

    !Number.isInteger(
      metadata.revision
    ) ||

    metadata.revision < 1 ||

    !Number.isInteger(
      metadata.recordCount
    ) ||

    metadata.recordCount < 0 ||

    typeof metadata.contentDigest !==
      "string" ||

    !metadata.contentDigest ||

    metadata.integrityState !==
      "VALID"
  ){

    return false;

  }


  /*
   * Stage 1 metadata created before continuity support
   * remains valid and is interpreted as COMPLETE.
   */

  const continuity =
    metadata.historyContinuity ??
    CARD_HISTORY_CONTINUITY.COMPLETE;


  if(
    continuity !==
      CARD_HISTORY_CONTINUITY.COMPLETE &&

    continuity !==
      CARD_HISTORY_CONTINUITY
        .UNKNOWN_BEFORE_BASELINE
  ){

    return false;

  }


  if(
    continuity ===
      CARD_HISTORY_CONTINUITY
        .UNKNOWN_BEFORE_BASELINE
  ){

    return Boolean(

      metadata.baselineType ===
        CARD_REPOSITORY_BASELINE_TYPE
          .HISTORICAL_GAP_RECOVERY &&

      typeof metadata.recoveryBaselineAt ===
        "string" &&

      metadata.recoveryBaselineAt.length > 0 &&

      typeof metadata.recoveryReason ===
        "string" &&

      metadata.recoveryReason
        .trim()
        .length >= 10 &&

      metadata.recoveryAcknowledged ===
        true

    );

  }


  /*
   * COMPLETE continuity must not simultaneously claim
   * historical-gap recovery.
   */

  if(
    metadata.baselineType ===
      CARD_REPOSITORY_BASELINE_TYPE
        .HISTORICAL_GAP_RECOVERY ||

    metadata.recoveryBaselineAt ||

    metadata.recoveryReason ||

    metadata.recoveryAcknowledged ===
      true
  ){

    return false;

  }


  return true;

}

  return Boolean(

    isPlainObject(
      metadata
    ) &&

    metadata.schemaVersion ===
      CARD_REPOSITORY_SCHEMA_VERSION &&

    metadata.documentType ===
      CARD_REPOSITORY_DOCUMENT_TYPE &&

    metadata.engineVersion ===
      ENGINE_VERSION &&

    metadata.engine ===
      ENGINE_NAME &&

    typeof metadata.initializedAt ===
      "string" &&

    metadata.initializedAt &&

    typeof metadata.updatedAt ===
      "string" &&

    metadata.updatedAt &&

    Number.isInteger(
      metadata.revision
    ) &&

    metadata.revision >= 1 &&

    Number.isInteger(
      metadata.recordCount
    ) &&

    metadata.recordCount >= 0 &&

    typeof metadata.contentDigest ===
      "string" &&

    metadata.contentDigest.length > 0 &&

    metadata.integrityState ===
      "VALID"

  );

}


function buildCardRepositoryMeta(
  cards,
  previousMetadata = null,
  options = {}
){

  if(
    !Array.isArray(
      cards
    )
  ){

    throw new TypeError(
      "Canonical card repository must be an array."
    );

  }


  if(
    options !== undefined &&
    !isPlainObject(
      options
    )
  ){

    throw new TypeError(
      "Card repository metadata options must be an object."
    );

  }


  const timestamp =
    now();


  const previousValid =
    isValidCardRepositoryMeta(
      previousMetadata
    );


  const previousContinuity =
    previousValid
      ? (
          previousMetadata.historyContinuity ??
          CARD_HISTORY_CONTINUITY.COMPLETE
        )
      : null;


  const requestedContinuity =
    options.historyContinuity ??
    previousContinuity ??
    CARD_HISTORY_CONTINUITY.COMPLETE;


  const isRecoveryBaseline =
    requestedContinuity ===
      CARD_HISTORY_CONTINUITY
        .UNKNOWN_BEFORE_BASELINE;


  /*
   * Once a historical-gap baseline exists it cannot be
   * downgraded to COMPLETE by an ordinary card write.
   */

  if(
    previousContinuity ===
      CARD_HISTORY_CONTINUITY
        .UNKNOWN_BEFORE_BASELINE &&

    requestedContinuity !==
      CARD_HISTORY_CONTINUITY
        .UNKNOWN_BEFORE_BASELINE
  ){

    throw cardRepositoryError(
      "CARD_HISTORY_CONTINUITY_DOWNGRADE_BLOCKED",
      "Historical card continuity cannot be changed from unknown-before-baseline to complete."
    );

  }


  const metadata = {

    schemaVersion:
      CARD_REPOSITORY_SCHEMA_VERSION,

    documentType:
      CARD_REPOSITORY_DOCUMENT_TYPE,

    engineVersion:
      ENGINE_VERSION,

    engine:
      ENGINE_NAME,

    initializedAt:
      previousValid
        ? previousMetadata
            .initializedAt
        : timestamp,

    updatedAt:
      timestamp,

    revision:
      previousValid
        ? previousMetadata
            .revision + 1
        : 1,

    recordCount:
      cards.length,

    contentDigest:
      calculateCardRepositoryDigest(
        cards
      ),

    integrityState:
      "VALID",

    historyContinuity:
      requestedContinuity

  };


  if(
    isRecoveryBaseline
  ){

    const preservingExistingRecovery =
      previousValid &&
      previousMetadata.historyContinuity ===
        CARD_HISTORY_CONTINUITY
          .UNKNOWN_BEFORE_BASELINE;


    metadata.baselineType =
      CARD_REPOSITORY_BASELINE_TYPE
        .HISTORICAL_GAP_RECOVERY;


    metadata.recoveryBaselineAt =
      preservingExistingRecovery
        ? previousMetadata
            .recoveryBaselineAt
        : options
            .recoveryBaselineAt;


    metadata.recoveryReason =
      preservingExistingRecovery
        ? previousMetadata
            .recoveryReason
        : options
            .recoveryReason;


    metadata.recoveryAcknowledged =
      preservingExistingRecovery
        ? previousMetadata
            .recoveryAcknowledged
        : options
            .recoveryAcknowledged ===
              true;

  }else{

    metadata.baselineType =
      CARD_REPOSITORY_BASELINE_TYPE
        .NORMAL_INITIALIZATION;

  }


  return metadata;

}

/* ==========================================================
   REPOSITORY INSPECTION
========================================================== */

function inspectCardRepository(){

  let cardsRaw;
  let metadataRaw;


  try{

    cardsRaw =
      storageGet(
        STORAGE_KEY
      );

    metadataRaw =
      storageGet(
        STORAGE_META_KEY
      );

  }catch(error){

    return {

      state:
        CARD_REPOSITORY_STATE
          .UNAVAILABLE,

      code:
        "CARD_REPOSITORY_STORAGE_UNAVAILABLE",

      reason:
        "Canonical card storage could not be accessed.",

      cards:
        null,

      metadata:
        null,

      error

    };

  }


  const cardDocument =
    parseStoredDocument(
      cardsRaw
    );


  const metadataDocument =
    parseStoredDocument(
      metadataRaw
    );


  /*
   * No cards and no metadata.
   *
   * This is deliberately NOT interpreted as [].
   */

  if(
    !cardDocument.exists &&
    !metadataDocument.exists
  ){

    return {

      state:
        CARD_REPOSITORY_STATE
          .UNINITIALIZED,

      code:
        "CARD_REPOSITORY_UNINITIALIZED",

      reason:
        "Canonical card repository has not been initialised.",

      cards:
        null,

      metadata:
        null,

      error:
        null

    };

  }


  /*
   * Metadata proves a repository previously existed,
   * but the actual card repository has disappeared.
   */

  if(
    !cardDocument.exists &&
    metadataDocument.exists
  ){

    return {

      state:
        CARD_REPOSITORY_STATE
          .LOST,

      code:
        "CARD_REPOSITORY_LOST",

      reason:
        "Canonical card repository is missing while card repository metadata still exists.",

      cards:
        null,

      metadata:
        metadataDocument.valid
          ? metadataDocument.value
          : null,

      error:
        metadataDocument.error

    };

  }


  if(
    !cardDocument.valid
  ){

    return {

      state:
        CARD_REPOSITORY_STATE
          .CORRUPT,

      code:
        "CARD_REPOSITORY_CORRUPT",

      reason:
        "Canonical card repository contains invalid data.",

      cards:
        null,

      metadata:
        null,

      error:
        cardDocument.error

    };

  }


  if(
    !Array.isArray(
      cardDocument.value
    )
  ){

    return {

      state:
        CARD_REPOSITORY_STATE
          .CORRUPT,

      code:
        "CARD_REPOSITORY_INVALID_DOCUMENT",

      reason:
        "Canonical card repository is not a card array.",

      cards:
        null,

      metadata:
        null,

      error:
        null

    };

  }


  const cards =
    cardDocument.value;


  /*
   * Existing card repository without metadata can be
   * safely adopted because the repository itself exists.
   */

  if(
    !metadataDocument.exists
  ){

    return {

      state:
        CARD_REPOSITORY_STATE
          .LEGACY_VALID,

      code:
        "CARD_REPOSITORY_LEGACY_VALID",

      reason:
        "Existing card repository requires integrity metadata adoption.",

      cards,

      metadata:
        null,

      error:
        null

    };

  }


  /*
   * Existing v11 metadata can also be upgraded safely.
   */

  if(
    metadataDocument.valid &&
    isLegacyCardRepositoryMeta(
      metadataDocument.value
    )
  ){

    return {

      state:
        CARD_REPOSITORY_STATE
          .LEGACY_VALID,

      code:
        "CARD_REPOSITORY_LEGACY_VALID",

      reason:
        "Existing card repository uses legacy integrity metadata.",

      cards,

      metadata:
        metadataDocument.value,

      error:
        null

    };

  }


  if(
    !metadataDocument.valid ||
    !isValidCardRepositoryMeta(
      metadataDocument.value
    )
  ){

    return {

      state:
        CARD_REPOSITORY_STATE
          .CORRUPT,

      code:
        "CARD_REPOSITORY_METADATA_CORRUPT",

      reason:
        "Canonical card repository metadata is invalid.",

      cards,

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
    calculateCardRepositoryDigest(
      cards
    );


  if(
    metadata.recordCount !==
      cards.length ||

    metadata.contentDigest !==
      expectedDigest
  ){

    return {

      state:
        CARD_REPOSITORY_STATE
          .INCONSISTENT,

      code:
        "CARD_REPOSITORY_INTEGRITY_MISMATCH",

      reason:
        "Canonical card repository does not match its integrity metadata.",

      cards,

      metadata,

      error:
        null

    };

  }


  return {

    state:
      CARD_REPOSITORY_STATE
        .VALID,

    code:
      "CARD_REPOSITORY_VALID",

    reason:
      null,

    cards,

    metadata,

    error:
      null

  };

}


/* ==========================================================
   CANONICAL PERSISTENCE
========================================================== */

function persistCardRepository(
  cards,
  previousMetadata = null,
  metadataOptions = {}
){

  if(
    !Array.isArray(
      cards
    )
  ){

    throw new TypeError(
      "Canonical card repository must be an array."
    );

  }


 const metadata =
  buildCardRepositoryMeta(
    cards,
    previousMetadata,
    metadataOptions
  );


  /*
   * Card data first, integrity metadata second.
   */

  storageSet(
    STORAGE_KEY,
    cards
  );

  storageSet(
    STORAGE_META_KEY,
    metadata
  );


  const verification =
    inspectCardRepository();


  if(
    verification.state !==
      CARD_REPOSITORY_STATE
        .VALID
  ){

    throw cardRepositoryError(
      verification.code ||
        "CARD_REPOSITORY_PERSISTENCE_FAILED",

      verification.reason ||
        "Canonical card repository persistence verification failed.",

      {
        state:
          verification.state
      }
    );

  }


  return verification;

}


/* ==========================================================
   LEGACY ADOPTION
========================================================== */

function adoptLegacyCardRepository(
  inspection
){

  if(
    !inspection ||
    inspection.state !==
      CARD_REPOSITORY_STATE
        .LEGACY_VALID ||
    !Array.isArray(
      inspection.cards
    )
  ){

    throw cardRepositoryError(
      "CARD_REPOSITORY_LEGACY_ADOPTION_INVALID",
      "Legacy card repository cannot be adopted from the current state."
    );

  }


  const metadata =
    buildCardRepositoryMeta(
      inspection.cards
    );


  storageSet(
    STORAGE_META_KEY,
    metadata
  );


  const verification =
    inspectCardRepository();


  if(
    verification.state !==
      CARD_REPOSITORY_STATE
        .VALID
  ){

    throw cardRepositoryError(
      verification.code ||
        "CARD_REPOSITORY_LEGACY_ADOPTION_FAILED",

      verification.reason ||
        "Legacy card repository integrity adoption failed."
    );

  }


  return verification;

}


/* ==========================================================
   REPOSITORY STATUS
========================================================== */

function getCardRepositoryStatus(){

  const inspection =
    inspectCardRepository();


  const metadata =
    inspection.metadata &&
    isPlainObject(
      inspection.metadata
    )
      ? inspection.metadata
      : null;


  const historyContinuity =
    metadata
      ? (
          metadata.historyContinuity ??
          CARD_HISTORY_CONTINUITY.COMPLETE
        )
      : null;


  const historicalGap =
    historyContinuity ===
      CARD_HISTORY_CONTINUITY
        .UNKNOWN_BEFORE_BASELINE;


  return Object.freeze({

    state:
      inspection.state,

    code:
      inspection.code,

    reason:
      inspection.reason,

    recordCount:
      Array.isArray(
        inspection.cards
      )
        ? inspection.cards.length
        : null,

    historyContinuity,

    historicalGap,

    recoveryBaselineAt:
      historicalGap
        ? metadata
            ?.recoveryBaselineAt ||
          null
        : null,

    baselineType:
      metadata
        ?.baselineType ||
      null,

    metadata:
      metadata
        ? Object.freeze({
            ...metadata
          })
        : null

  });

}
/* ==========================================================
   EXPLICIT CARD REPOSITORY RECOVERY BASELINE
   Work Package: WP-011B.6E.5G.5G.7 — Stage 2
========================================================== */

function establishCardRepositoryRecoveryBaseline(
  request = {}
){

  if(
    !isPlainObject(
      request
    )
  ){

    throw new TypeError(
      "Card repository recovery request must be an object."
    );

  }


  const reason =
    typeof request.reason ===
      "string"
        ? request.reason.trim()
        : "";


  const acknowledgedHistoryGap =
    request.acknowledgedHistoryGap ===
      true;


  if(
    !acknowledgedHistoryGap
  ){

    throw cardRepositoryError(
      "CARD_HISTORY_GAP_ACKNOWLEDGEMENT_REQUIRED",
      "Explicit acknowledgement of the historical card continuity gap is required."
    );

  }


  if(
    reason.length < 10 ||
    reason.length > 500
  ){

    throw cardRepositoryError(
      "CARD_HISTORY_GAP_REASON_REQUIRED",
      "A card repository recovery reason between 10 and 500 characters is required."
    );

  }


  const inspection =
    inspectCardRepository();


  /*
   * Recovery is single-use.
   */

  if(
    inspection.state ===
      CARD_REPOSITORY_STATE.VALID
  ){

    const continuity =
      inspection.metadata
        ?.historyContinuity ??
      CARD_HISTORY_CONTINUITY.COMPLETE;


    if(
      continuity ===
        CARD_HISTORY_CONTINUITY
          .UNKNOWN_BEFORE_BASELINE
    ){

      throw cardRepositoryError(
        "CARD_HISTORY_RECOVERY_BASELINE_ALREADY_ESTABLISHED",
        "A historical-gap card repository recovery baseline already exists.",
        {
          recoveryBaselineAt:
            inspection.metadata
              ?.recoveryBaselineAt ||
            null,

          revision:
            inspection.metadata
              ?.revision ||
            null
        }
      );

    }


    throw cardRepositoryError(
      "CARD_HISTORY_RECOVERY_NOT_PERMITTED",
      "A valid canonical card repository already exists; historical-gap recovery is not permitted."
    );

  }


  if(
    inspection.state !==
      CARD_REPOSITORY_STATE
        .UNINITIALIZED
  ){

    throw cardRepositoryError(
      inspection.code ||
        "CARD_HISTORY_RECOVERY_BLOCKED",

      inspection.reason ||
        "Historical card recovery is not safe from the current repository state.",

      {
        state:
          inspection.state
      }
    );

  }


  /*
   * Require evidence that this is an existing PAY54
   * account rather than an untouched fresh installation.
   *
   * The Ledger must exist and its transaction repository
   * must already have a recognised canonical state.
   */

  const ledger =
    window.PAY54_LEDGER ||
    null;


  if(
    !ledger ||
    typeof ledger
      .getTransactionRepositoryStatus !==
        "function"
  ){

    throw cardRepositoryError(
      "CARD_HISTORY_RECOVERY_ACCOUNT_EVIDENCE_UNAVAILABLE",
      "PAY54 could not establish existing-account evidence for card repository recovery."
    );

  }


  let ledgerStatus;


  try{

    ledgerStatus =
      ledger
        .getTransactionRepositoryStatus();

  }catch(error){

    throw cardRepositoryError(
      "CARD_HISTORY_RECOVERY_ACCOUNT_EVIDENCE_UNAVAILABLE",
      "PAY54 could not verify existing wallet transaction state before card repository recovery.",
      {
        cause:
          error?.message ||
          String(error)
      }
    );

  }


  if(
    ledgerStatus?.state !==
      "VALID"
  ){

    throw cardRepositoryError(
      "CARD_HISTORY_RECOVERY_ACCOUNT_EVIDENCE_INVALID",
      "Card repository recovery requires a valid canonical PAY54 transaction repository.",
      {
        ledgerState:
          ledgerStatus?.state ||
          null
      }
    );

  }


  const recoveryBaselineAt =
    now();


  /*
   * No historical card is fabricated here.
   *
   * [] means only:
   * canonical card observation begins from this baseline.
   */

  const verification =
    persistCardRepository(
      [],
      null,
      {
        historyContinuity:
          CARD_HISTORY_CONTINUITY
            .UNKNOWN_BEFORE_BASELINE,

        recoveryBaselineAt,

        recoveryReason:
          reason,

        recoveryAcknowledged:
          true
      }
    );


  const metadata =
    verification.metadata;


  const contractValid =
    Boolean(

      verification.state ===
        CARD_REPOSITORY_STATE.VALID &&

      Array.isArray(
        verification.cards
      ) &&

      verification.cards.length ===
        0 &&

      metadata &&

      metadata.recordCount ===
        0 &&

      metadata.historyContinuity ===
        CARD_HISTORY_CONTINUITY
          .UNKNOWN_BEFORE_BASELINE &&

      metadata.baselineType ===
        CARD_REPOSITORY_BASELINE_TYPE
          .HISTORICAL_GAP_RECOVERY &&

      metadata.recoveryBaselineAt ===
        recoveryBaselineAt &&

      metadata.recoveryReason ===
        reason &&

      metadata.recoveryAcknowledged ===
        true

  );


  if(
    !contractValid
  ){

    throw cardRepositoryError(
      "CARD_HISTORY_RECOVERY_VERIFICATION_FAILED",
      "PAY54 could not verify the card repository historical-gap recovery baseline after persistence."
    );

  }


  publishCardEvent(
    "cards.repository.recovery.baseline.established",
    {
      recoveryBaselineAt,

      historyContinuity:
        metadata.historyContinuity,

      baselineType:
        metadata.baselineType,

      recordCount:
        metadata.recordCount,

      revision:
        metadata.revision,

      recoveredAt:
        now()
    }
  );


  console.warn(
    "[PAY54_CARDS] Historical card continuity before the recovery baseline is unknown.",
    {
      recoveryBaselineAt,

      historyContinuity:
        metadata.historyContinuity,

      recordCount:
        metadata.recordCount
    }
  );


  return getCardRepositoryStatus();

}

/* ==========================================================
   STARTUP INTEGRITY CHECK
========================================================== */

function bootstrapCardRepository(){

  const inspection =
    inspectCardRepository();


  if(
    inspection.state ===
      CARD_REPOSITORY_STATE
        .VALID
  ){

    return;

  }


  if(
    inspection.state ===
      CARD_REPOSITORY_STATE
        .LEGACY_VALID
  ){

    adoptLegacyCardRepository(
      inspection
    );

    return;

  }


  if(
    inspection.state ===
      CARD_REPOSITORY_STATE
        .UNINITIALIZED
  ){

    console.error(
      "[PAY54_CARDS] Canonical card repository is absent. PAY54 cannot determine whether this account genuinely has no cards or whether card state was lost. Repository was NOT automatically initialised."
    );

    return;

  }


  console.error(
    "[PAY54_CARDS] Card repository integrity check failed.",
    {
      state:
        inspection.state,

      code:
        inspection.code,

      reason:
        inspection.reason
    }
  );

}
/* =========================================
   LOAD
========================================= */

function getCards(){

  let inspection =
    inspectCardRepository();


  if(
    inspection.state ===
      CARD_REPOSITORY_STATE
        .LEGACY_VALID
  ){

    inspection =
      adoptLegacyCardRepository(
        inspection
      );

  }


  if(
    inspection.state !==
      CARD_REPOSITORY_STATE
        .VALID
  ){

    throw cardRepositoryError(
      inspection.code ||
        "CARD_REPOSITORY_UNAVAILABLE",

      inspection.reason ||
        "Canonical card repository is unavailable.",

      {
        state:
          inspection.state
      }
    );

  }


  return inspection.cards.map(
    card => ({
      ...card
    })
  );

}

/* =========================================
   SAVE
========================================= */
function saveCards(
  cards
){

  if(
    !Array.isArray(
      cards
    )
  ){

    throw new TypeError(
      "Card repository update must be an array."
    );

  }


  let inspection =
    inspectCardRepository();


  if(
    inspection.state ===
      CARD_REPOSITORY_STATE
        .LEGACY_VALID
  ){

    inspection =
      adoptLegacyCardRepository(
        inspection
      );

  }


  /*
   * Never overwrite missing, corrupt, lost or inconsistent
   * card state.
   *
   * Doing so would destroy evidence of a repository-loss
   * condition.
   */

  if(
    inspection.state !==
      CARD_REPOSITORY_STATE
        .VALID
  ){

    throw cardRepositoryError(
      inspection.code ||
        "CARD_REPOSITORY_WRITE_BLOCKED",

      inspection.reason ||
        "Canonical card repository cannot be safely updated.",

      {
        state:
          inspection.state
      }
    );

  }


  persistCardRepository(
    cards,
    inspection.metadata
  );

}

/* =========================================
   ADD CARD
========================================= */

function addCard(card){

const SESSION =
window.PAY54_SECURITY?.session;

if(

    SESSION &&

    typeof SESSION.isAuthenticated === "function"

){

    if(

        !SESSION.isAuthenticated()

    ){

        return null;

    }

}

const cards =
getCards();

  const newCard = {

    id:
      card.id || uuid(),

    created:
      card.created || now(),

    updated:
      now(),

    frozen:
      false,

    default:
      false,

    balance:
      0,

    controls:{},

    transactions:[],

    ...card

  };
  const TRANSACTION_GUARD =
window.PAY54_SECURITY?.transactionGuard;

if(

    TRANSACTION_GUARD &&

    typeof TRANSACTION_GUARD.validate === "function"

){

    const allowed =

        TRANSACTION_GUARD.validate({

            type:
                "CARD_CREATE",

            payload:
                newCard

        });

    if(

        allowed === false

    ){

        return null;

    }

}
  cards.push(
    newCard
  );

saveCards(cards);

publishCardEvent(

    CARD_EVENTS.CREATED,

    {

        card: {

            ...newCard

        },

        createdAt:

            now()

    }

);

return newCard;

}

/* =========================================
   DELETE CARD
========================================= */

function deleteCard(id){

const SESSION =
window.PAY54_SECURITY?.session;

if(

    SESSION &&

    typeof SESSION.isAuthenticated === "function"

){

    if(

        !SESSION.isAuthenticated()

    ){

        return;

    }

}

const cards =
getCards()
.filter(
      card =>
      card.id !== id
    );

  saveCards(cards);

publishCardEvent(

    CARD_EVENTS.DELETED,

    {

        cardId: id,

        deletedAt:

            now()

    }

);

}

/* =========================================
   FREEZE CARD
========================================= */

function toggleFreeze(id){

const SESSION =
window.PAY54_SECURITY?.session;

if(

    SESSION &&

    typeof SESSION.isAuthenticated === "function"

){

    if(

        !SESSION.isAuthenticated()

    ){

        return;

    }

}

const cards =
getCards();

  const card =
    cards.find(
      c => c.id === id
    );

  if(!card) return;

  card.frozen =
    !card.frozen;

  saveCards(cards);

publishCardEvent(

    card.frozen

        ? CARD_EVENTS.FROZEN

        : CARD_EVENTS.UNFROZEN,

    {

        card: {

            ...card

        },

        updatedAt:

            now()

    }

);

}

/* =========================================
   DEFAULT CARD
========================================= */

function setDefault(id){

const SESSION =
window.PAY54_SECURITY?.session;

if(

    SESSION &&

    typeof SESSION.isAuthenticated === "function"

){

    if(

        !SESSION.isAuthenticated()

    ){

        return;

    }

}

const cards =
getCards();

  cards.forEach(card=>{

    card.default =
      card.id === id;

  });

  saveCards(cards);

const defaultCard =

    cards.find(

        card => card.default

    );

publishCardEvent(

    CARD_EVENTS.DEFAULT_CHANGED,

    {

        card:

            defaultCard

                ? {

                    ...defaultCard

                  }

                : null,

        updatedAt:

            now()

    }

);

}

function getDefaultCard(){

  return getCards()
    .find(
      card => card.default
    );

}

   /* =========================================
   CARD LOOKUP
========================================= */

function getCardById(id){

  return getCards().find(
    card => card.id === id
  );

}

/* =========================================
   UPDATE CARD BALANCE
========================================= */

function updateCardBalance(
  id,
  amount
){

  const cards =
    getCards();

  const card =
    cards.find(
      c => c.id === id
    );

  if(!card){

    return null;

  }

  card.balance =
    Number(card.balance || 0)
    + Number(amount || 0);

  card.updated =
    now();

saveCards(cards);

publishCardEvent(

    CARD_EVENTS.UPDATED,

    {

        card: {

            ...card

        },

        updatedAt:

            now()

    }

);

return card;

}

/* =========================================
   CARD CONTROLS
========================================= */

function updateControls(
  id,
  controls
){

  const cards =
    getCards();

  const card =
    cards.find(
      c => c.id === id
    );

  if(!card){

    return null;

  }

  card.controls = {

    ...(card.controls || {}),

    ...controls

  };

  card.updated =
    now();

saveCards(cards);

publishCardEvent(

    CARD_EVENTS.UPDATED,

    {

        action: "controls.updated",

        card: {

            ...card

        },

        controls: {

            ...card.controls

        },

        updatedAt:

            now()

    }

);

return card;

}

/* =========================================
   CARD TRANSACTIONS
========================================= */

function addCardTransaction(
  id,
  tx
){

  const cards =
    getCards();

  const card =
    cards.find(
      c => c.id === id
    );

  if(!card){

    return null;

  }

  card.transactions =
    Array.isArray(card.transactions)
      ? card.transactions
      : [];

  card.transactions.unshift({

    id:
      uuid(),

    created:
      now(),

    ...tx

  });

  card.updated =
    now();

saveCards(cards);

publishCardEvent(

    CARD_EVENTS.UPDATED,

    {

        action: "transaction.added",

        cardId: card.id,

        transaction: {

            ...card.transactions[0]

        },

        updatedAt:

            now()

    }

);

return card;

}

/* =========================================
   GET CARD TRANSACTIONS
========================================= */

function getCardTransactions(
  id
){

  const card =
    getCardById(id);

  if(!card){

    return [];

  }

  return Array.isArray(
    card.transactions
  )
    ? [...card.transactions]
    : [];

}
   
/* =========================================
   REPOSITORY BOOTSTRAP
========================================= */

bootstrapCardRepository();


/* =========================================
   EXPORT
========================================= */

return{

 /* Repository */

getCards,
getCardById,
saveCards,

getCardRepositoryStatus,
establishCardRepositoryRecoveryBaseline,

CARD_REPOSITORY_STATE,
CARD_HISTORY_CONTINUITY,
CARD_REPOSITORY_BASELINE_TYPE,

  /* Card Management */

  addCard,
  deleteCard,
  toggleFreeze,
  setDefault,
  getDefaultCard,

  /* Financial */

  updateCardBalance,

  /* Controls */

  updateControls,

  /* Transactions */

  addCardTransaction,
  getCardTransactions,

  /* Engine */

  version:
    ENGINE_VERSION,

  engine:
    ENGINE_NAME

};

})();
/* ==========================================================
   SECURITY BOOTSTRAP VERIFICATION
========================================================== */

(() => {

    const securityBootstrap =
        window.PAY54_SECURITY?.bootstrap;

    if(
        securityBootstrap &&
        typeof securityBootstrap.verify === "function"
    ){

        securityBootstrap.verify(
            "cards"
        );

    }

})();
console.info(

    "✅ PAY54 Enterprise Cards Engine",

    window.PAY54_CARDS.version,

    "loaded."

);
