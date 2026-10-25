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

<div
  id="qrOutput"
  class="p54-merchant-qr-output"
></div>

<div class="p54-actions">

<button
  class="p54-btn"
  type="button"
  id="cancelQR"
>
  Close
</button>

<button
  class="p54-btn"
  type="button"
  id="printQR"
>
  Print
</button>

<button
  class="p54-btn"
  type="button"
  id="shareQR"
>
  Share
</button>

<button
  class="p54-btn"
  type="button"
  id="downloadQR"
>
  Download
</button>

<button
  class="p54-btn primary"
  type="submit"
>
  Generate QR
</button>

</div>
</form>

`,
onMount:({modal,close})=>{

const form = modal.querySelector("#qrForm");
const output = modal.querySelector("#qrOutput");

let merchant = "";

form.addEventListener("submit",(e)=>{

e.preventDefault();

merchant =
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

output.innerHTML = "";

new QRCode(output,{
  text:payload,
  width:220,
  height:220
});

});

modal.querySelector("#cancelQR")
.addEventListener("click",close);

modal.querySelector("#downloadQR")
.addEventListener("click",()=>{

  const canvas =
    output.querySelector("canvas");

  if(!canvas){

    alert(
      "Generate QR first"
    );

    return;

  }

  const link =
    document.createElement("a");

  link.href =
    canvas.toDataURL();

  link.download =
    `${merchant || "PAY54"}-QR.png`;

  link.click();

});

  modal.querySelector("#printQR")
.addEventListener("click",()=>{

  const canvas =
    output.querySelector("canvas");

  if(!canvas){

    alert(
      "Generate QR first"
    );

    return;

  }

  const win =
    window.open(
      "",
      "_blank"
    );

  if(!win){

    alert(
      "Popup blocked"
    );

    return;

  }

  const dashboardStylesheet =
  [...document.styleSheets]
    .map(
      sheet =>
        sheet.href
    )
    .find(
      href =>
        typeof href ===
          "string" &&
        href.includes(
          "/assets/css/dashboard.css"
        )
    );

const stylesheetMarkup =
  dashboardStylesheet
    ? `<link rel="stylesheet" href="${dashboardStylesheet}">`
    : "";

win.document.write(`

  <!DOCTYPE html>

  <html lang="en">

    <head>

      <meta charset="UTF-8">

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      >

      <title>
        PAY54 Merchant QR
      </title>

      ${stylesheetMarkup}

    </head>

    <body class="p54-merchant-qr-print">

      <h2>
        PAY54 Merchant QR
      </h2>

      <img
        class="p54-merchant-qr-print-image"
        src="${canvas.toDataURL()}"
        alt="PAY54 Merchant QR"
      >

    </body>

  </html>

`);

  win.document.close();

  setTimeout(()=>{

    win.print();

  },300);

});

modal.querySelector("#shareQR")
.addEventListener("click",async()=>{

  const canvas =
    output.querySelector("canvas");

  if(!canvas){

    alert(
      "Generate QR first"
    );

    return;

  }

  try{

    const blob =
      await new Promise(
        (resolve,reject)=>{

          canvas.toBlob(
            result => {

              if(result){

                resolve(result);

                return;

              }

              reject(
                new Error(
                  "Unable to create QR image."
                )
              );

            },
            "image/png"
          );

        }
      );

    const fileName =
      `${merchant || "PAY54"}-QR.png`;

    const qrFile =
      new File(
        [blob],
        fileName,
        {
          type:"image/png"
        }
      );

    if(
      typeof navigator.share ===
        "function" &&
      (
        typeof navigator.canShare !==
          "function" ||
        navigator.canShare({
          files:[qrFile]
        })
      )
    ){

      await navigator.share({

        title:
          "PAY54 Merchant QR",

        text:
          merchant
            ? `PAY54 QR for ${merchant}`
            : "PAY54 Merchant QR",

        files:[
          qrFile
        ]

      });

      return;

    }

    const shareText =
      JSON.stringify({
        merchant,
        qrImage:
          canvas.toDataURL(
            "image/png"
          )
      });

    if(
      navigator.clipboard &&
      typeof navigator.clipboard
        .writeText ===
        "function" &&
      document.hasFocus()
    ){

      await navigator.clipboard
        .writeText(
          shareText
        );

      alert(
        "QR copied for sharing"
      );

      return;

    }

    alert(
      "Sharing is not available in this browser. Please use Download instead."
    );

  }catch(err){

    if(
      err?.name ===
      "AbortError"
    ){

      return;

    }

    console.error(
      "[PAY54_MERCHANT_QR] Share failed:",
      err
    );

    alert(
      "Unable to share QR. Please use Download instead."
    );

  }

});

} // closes onMount

}); // closes openModal

} // closes openMerchantQR


/* =========================
   PAY54 MERCHANT QR EXPORT
========================= */

window.PAY54_MERCHANT_QR = {

  open: openMerchantQR

};

console.log(
  "✅ PAY54 MERCHANT QR READY"
);
