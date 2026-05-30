"use strict";

const params =
  new URLSearchParams(
    location.search
  );

const requestId =
  params.get("id");

const requests =
  JSON.parse(
    localStorage.getItem(
      "pay54_requests"
    ) || "[]"
  );

const request =
  requests.find(
    r => r.id === requestId
  );

const details =
  document.getElementById(
    "requestDetails"
  );

if(request){

  details.innerHTML = `

    <div>

      <h2>
        ${request.recipient}
      </h2>

      <p>
        Amount:
        ₦${request.amount}
      </p>

      <p>
        Reason:
        ${request.reason}
      </p>

    </div>

  `;

}else{

  details.innerHTML =

    "<p>Request not found</p>";

}
