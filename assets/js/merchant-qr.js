function openMerchantQR(){

openModal({

title:"Merchant QR Generator",

bodyHTML:`

<form class="p54-form" id="qrForm">

<div>
<div class="p54-label">Merchant Name</div>
<input class="p54-input" id="qrMerchant" required>
</div>

<div>
<div class="p54-label">Amount (optional)</div>
<input class="p54-input" id="qrAmount" type="number" placeholder="0.00">
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

const merchant = modal.querySelector("#qrMerchant").value;
const amount = modal.querySelector("#qrAmount").value;

const payload = `PAY54|${merchant}|${amount}`;

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
