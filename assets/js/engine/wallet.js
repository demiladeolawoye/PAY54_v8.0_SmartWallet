"use strict";

/* =========================================
   PAY54 VIRTUAL & LINKED CARDS v2.0 PREMIUM
========================================= */

window.PAY54_UI =
window.PAY54_UI || {};

window.PAY54_UI.openCards = function(){

const openModal =
window.PAY54_MODALS?.openModal;

if(!openModal){
console.error("Modal engine unavailable");
return;
}

const cardsEngine =
window.PAY54_CARDS;

if(!cardsEngine){
console.error("Cards engine unavailable");
return;
}

function renderCards(){

const cards =
cardsEngine.getCards();

const cardsHTML =
cards.length
? cards.map(card=>`

<div class="p54-card-item">

<div class="p54-card-top">

<div>

<div class="card-title">
${card.scheme} •••• ${card.last4}
</div>

<div class="card-sub">
${card.nickname || "PAY54 Card"}
</div>

</div>

<div class="
card-badge
${card.frozen ? "frozen":"active"}
">

${card.frozen ? "FROZEN":"ACTIVE"}

</div>

</div>

<div class="card-actions">

<button
class="p54-btn"
data-freeze="${card.id}">
${card.frozen ? "Unfreeze":"Freeze"}
</button>

<button
class="p54-btn"
data-default="${card.id}">
Set Default
</button>

<button
class="p54-btn danger"
data-delete="${card.id}">
Remove
</button>

</div>

${card.default ? `

<div class="default-card-tag">
⭐ Default Card
</div>

` : ""}

</div>

`).join("")
:
`

<div class="empty-state">
No linked cards yet
</div>

`;

return `

<div class="cards-premium">

<div class="cards-header">

<button
class="p54-btn primary"
id="addCardBtn">
+ Add Card
</button>

<button
class="p54-btn"
id="virtualCardBtn">
Virtual Card
</button>

</div>

${cardsHTML}

</div>

`;

}

const modalRef =
openModal({

title:"PAY54 Virtual & Linked Cards",

bodyHTML:renderCards(),

onMount:({modal,close})=>{

function refresh(){

modal.querySelector(
".p54-modal-body"
).innerHTML =
renderCards();

bind();

}

function bind(){

modal
.querySelector("#addCardBtn")
?.addEventListener("click",()=>{

openAddCard(refresh);

});

modal
.querySelector("#virtualCardBtn")
?.addEventListener("click",()=>{

openVirtualCard();

});

modal
.querySelectorAll("[data-delete]")
.forEach(btn=>{

btn.addEventListener("click",()=>{

cardsEngine.deleteCard(
btn.dataset.delete
);

refresh();

});

});

modal
.querySelectorAll("[data-freeze]")
.forEach(btn=>{

btn.addEventListener("click",()=>{

cardsEngine.toggleFreeze(
btn.dataset.freeze
);

refresh();

});

});

modal
.querySelectorAll("[data-default]")
.forEach(btn=>{

btn.addEventListener("click",()=>{

cardsEngine.setDefault(
btn.dataset.default
);

refresh();

});

});

}

bind();

}

});

};

/* =========================================
   ADD CARD
========================================= */

function openAddCard(callback){

window.PAY54_MODALS.openModal({

title:"Add Payment Card",

bodyHTML:`

<div class="p54-form">

<input
class="p54-input"
id="cardName"
placeholder="Cardholder Name">

<input
class="p54-input"
id="cardNumber"
placeholder="Card Number">

<input
class="p54-input"
id="cardExpiry"
placeholder="MM/YY">

<input
class="p54-input"
id="cardCVV"
placeholder="CVV">

<input
class="p54-input"
id="cardNickname"
placeholder="Nickname">

<select
class="p54-input"
id="cardScheme">

<option>Visa</option>
<option>Mastercard</option>

</select>

<div class="p54-actions">

<button
class="p54-btn"
id="cancelCard">
Cancel
</button>

<button
class="p54-btn primary"
id="saveCard">
Add Card
</button>

</div>

</div>

`,

onMount:({modal,close})=>{

modal
.querySelector("#cancelCard")
.addEventListener("click",close);

modal
.querySelector("#saveCard")
.addEventListener("click",()=>{

const number =
modal.querySelector(
"#cardNumber"
).value.trim();

if(number.length < 8){

window.PAY54_TOAST
?.showToast(
"Invalid card number"
);

return;

}

const card = {

id:
crypto.randomUUID(),

scheme:
modal.querySelector(
"#cardScheme"
).value,

nickname:
modal.querySelector(
"#cardNickname"
).value,

last4:
number.slice(-4),

expiry:
modal.querySelector(
"#cardExpiry"
).value,

frozen:false,

default:false

};

window.PAY54_CARDS
.addCard(card);

window.PAY54_TOAST
?.showToast(
"Card added"
);

close();

if(callback){
callback();
}

});

}

});

}

/* =========================================
   VIRTUAL CARD
========================================= */

function openVirtualCard(){

window.PAY54_MODALS.openModal({

title:"PAY54 Virtual Visa",

bodyHTML:`

<div class="virtual-card">

<div class="virtual-card-face">

<div class="vc-brand">
PAY54 VISA
</div>

<div class="vc-number">
4242 8888 4588 0001
</div>

<div class="vc-row">
<span>12/29</span>
<span>321</span>
</div>

</div>

<div class="p54-actions">

<button
class="p54-btn"
id="fundVirtual">
Fund Card
</button>

<button
class="p54-btn"
id="freezeVirtual">
Freeze
</button>

<button
class="p54-btn primary"
id="copyVirtual">
Copy
</button>

</div>

</div>

`,

onMount:({modal})=>{

modal
.querySelector("#copyVirtual")
.addEventListener("click",()=>{

navigator.clipboard.writeText(
"4242 8888 4588 0001"
);

window.PAY54_TOAST
?.showToast(
"Card copied"
);

});

modal
.querySelector("#fundVirtual")
.addEventListener("click",()=>{

window.PAY54_TOAST
?.showToast(
"Funding engine coming next"
);

});

modal
.querySelector("#freezeVirtual")
.addEventListener("click",()=>{

window.PAY54_TOAST
?.showToast(
"Virtual card frozen"
);

});

}

});

}

console.log(
"✅ PAY54 CARDS PREMIUM READY"
);
