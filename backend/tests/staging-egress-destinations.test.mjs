
"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assessStagingEgressInventory,
  renderStagingEgressInventory
} from "../governance/staging-egress-destinations.mjs";

const baseline = JSON.parse(
  readFileSync(
    new URL(
      "../governance/staging-egress-destinations.json",
      import.meta.url
    ),
    "utf8"
  )
);

const clone = () => structuredClone(baseline);

const proposal = () => ({
  id: "DEST-001",
  providerName: "Candidate information provider",
  fqdn: "api.vendor.co.uk",
  port: 443,
  protocol: "HTTPS",
  purpose: "Read public information for evaluation",
  dataClassification: "PUBLIC_INFORMATION",
  authenticationMode: "UNDETERMINED",
  contractStatus: "UNVERIFIED",
  businessOwner: "PAY54 Engineering Office",
  evidenceReference: "NOT_PROVIDED",
  reviewStatus: "PENDING_REVIEW"
});

function rejected(modify) {
  const value = clone();

  modify(value);

  assert.throws(
    () => assessStagingEgressInventory(value),
    /STG-05 inventory rejected/
  );
}

test(
  "baseline passes but never grants security or release approval",
  () => {
    const report = assessStagingEgressInventory(
      clone()
    );

    assert.equal(report.inventoryIntegrity, "PASS");
    assert.equal(report.approvedDestinations, 0);
    assert.equal(
      report.outboundEnforcement,
      "NOT_IMPLEMENTED"
    );
    assert.equal(report.stagingRelease, "BLOCKED");
    assert.equal(report.cloudProvisioning, "DISABLED");
    assert.equal(report.financialExecution, "DISABLED");
    assert.equal(report.independentApprovals, 0);
  }
);

test(
  "report expressly states design-only evidence",
  () => {
    const report = renderStagingEgressInventory(
      assessStagingEgressInventory(clone())
    );

    assert.match(
      report,
      /NOT LIVE NETWORK EVIDENCE OR APPROVAL/
    );

    assert.match(
      report,
      /Staging release: \*\*BLOCKED\*\*/
    );
  }
);

test(
  "a pending, exact HTTPS FQDN may be recorded but not approved",
  () => {
    const value = clone();

    value.proposedDestinations.push(proposal());

    const result = assessStagingEgressInventory(
      value
    );

    assert.equal(result.proposedDestinations, 1);
    assert.equal(result.approvedDestinations, 0);
  }
);

test(
  "reject populated approved destination list",
  () => rejected(
    v => v.approvedDestinations.push(proposal())
  )
);

test(
  "reject inventory status upgraded to approved",
  () => rejected(
    v => v.inventoryStatus = "APPROVED"
  )
);

test(
  "reject claimed live enforcement",
  () => rejected(
    v => v.enforcementStatus = "IMPLEMENTED"
  )
);

test(
  "reject self-approved proposals",
  () => rejected(v => {
    const p = proposal();
    p.reviewStatus = "APPROVED";
    v.proposedDestinations.push(p);
  })
);

test(
  "reject wildcard destinations",
  () => rejected(v => {
    const p = proposal();
    p.fqdn = "*.vendor.co.uk";
    v.proposedDestinations.push(p);
  })
);

test(
  "reject raw IP destinations",
  () => rejected(v => {
    const p = proposal();
    p.fqdn = "8.8.8.8";
    v.proposedDestinations.push(p);
  })
);

test(
  "reject metadata and internal destinations",
  () => rejected(v => {
    const p = proposal();
    p.fqdn = "metadata.google.internal";
    v.proposedDestinations.push(p);
  })
);

test(
  "reject plaintext HTTP proposals",
  () => rejected(v => {
    const p = proposal();
    p.protocol = "HTTP";
    v.proposedDestinations.push(p);
  })
);

test(
  "reject duplicate proposed endpoints",
  () => rejected(v => {
    v.proposedDestinations.push(
      proposal(),
      { ...proposal(), id: "DEST-002" }
    );
  })
);

test(
  "reject missing unresolved dependency question",
  () => rejected(
    v => v.unresolvedDependencies.pop()
  )
);

test(
  "reject claimed release approval",
  () => rejected(
    v => v.releaseApproval = "APPROVED"
  )
);
