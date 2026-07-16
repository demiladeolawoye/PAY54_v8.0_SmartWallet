"use strict";

/* ========================================================================
   PAY54 ENTERPRISE EVENT BRIDGE
======================================================================== */

const EVENTS = window.PAY54_EVENTS || null;

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

        if(

            EVENTS &&

            typeof EVENTS.publish === "function"

        ){

            EVENTS.publish(

                eventName,

                payload,

                {

                    source:"cards"

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

/* =========================================
   LOAD
========================================= */

function getCards(){

  try{

    return JSON.parse(
      localStorage.getItem(
        STORAGE_KEY
      )
    ) || [];

  }catch{

    return [];

  }

}

/* =========================================
   SAVE
========================================= */

function saveCards(cards){

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(cards)

  );

  localStorage.setItem(

    STORAGE_META_KEY,

    JSON.stringify({

      version:
        ENGINE_VERSION,

      engine:
        ENGINE_NAME,

      updated:
        now(),

      cards:
        cards.length

    })

  );

}

/* =========================================
   ADD CARD
========================================= */

function addCard(card){

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
   EXPORT
========================================= */

return{

  /* Repository */

  getCards,
  getCardById,
  saveCards,

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

console.info(

  "✅ PAY54 Enterprise Cards Engine",

  ENGINE_VERSION,

  "loaded."

);
