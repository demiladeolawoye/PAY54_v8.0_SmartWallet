function openMerchantQR(){

openModal({

title:"Merchant QR Generator",

bodyHTML:`

<form class="p54-form" id="qrForm">

<div>
  <div class="p54-label">
    Merchant Name
  </div>

  <input
    class="p54-input"
    id="qrMerchant"
    required
  >
</div>

<div>
  <div class="p54-label">
    Amount
  </div>

  <input
    class="p54-input"
    id="qrAmount"
    type="number"
    placeholder="5000"
  >
</div>

<div>
  <div class="p54-label">
    Description
  </div>

  <input
    class="p54-input"
    id="qrDescription"
    placeholder="Product or Service"
  >
</div>

<div>
  <div class="p54-label">
    Currency
  </div>

  <select
    class="p54-input"
    id="qrCurrency"
  >
    <option value="NGN">NGN</option>
    <option value="GBP">GBP</option>
    <option value="USD">USD</option>
    <option value="EUR">EUR</option>
  </select>
</div>

<div id="qrOutput" style="text-align:center;margin-top:15px"></div>

<div class="p54-actions">
<button class="p54-btn" type="button" id="cancelQR">Close</button>
<button class="p54-btn primary" type="submit">Generate QR</button>
</div>

</form>

`,

onMount:({modal,close})=>{

const form = modal.querySelector("#qrForm");
const output = modal.querySelector("#qrOutput");

form.addEventListener("submit",(e)=>{

e.preventDefault();

const merchant =
  modal.querySelector("#qrMerchant").value;

const amount =
  modal.querySelector("#qrAmount").value;

const description =
  modal.querySelector("#qrDescription").value;

const currency =
  modal.querySelector("#qrCurrency").value;

const payload =
JSON.stringify({

  merchant,

  amount,

  description,

  currency,

  reference:
    "INV-" + Date.now(),

  created:
    Date.now()

});

output.innerHTML="";

new QRCode(output,{
text:payload,
width:220,
height:220
});

});

modal.querySelector("#cancelQR").addEventListener("click",close);

}

});

}
