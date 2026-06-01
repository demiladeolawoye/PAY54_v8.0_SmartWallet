"use strict";

/* =========================================
   PAY54 CARDS ENGINE v1
========================================= */

window.PAY54_CARDS = (function(){

const STORAGE_KEY =
  "pay54_cards";

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

}

/* =========================================
   ADD CARD
========================================= */

function addCard(card){

  const cards =
    getCards();

  cards.push(card);

  saveCards(cards);

  return card;

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

}

function getDefaultCard(){

  return getCards()
    .find(
      card => card.default
    );

}

/* =========================================
   EXPORT
========================================= */

return{

  getCards,
  saveCards,
  addCard,
  deleteCard,
  toggleFreeze,
  setDefault,
  getDefaultCard

};

})();

console.log(
"✅ PAY54 CARDS ENGINE READY"
);
