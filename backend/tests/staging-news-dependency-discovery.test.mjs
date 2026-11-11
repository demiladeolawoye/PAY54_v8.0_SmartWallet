"use strict";

/*
- PAY54 Phase 2G-AC
- News Dependency Discovery Regression Tests
  */
import test from "node:test";
import assert from "node:assert/strict";

import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync
} from "node:fs";

import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  collectFiles,
  discover,
  renderMarkdown
} from "../governance/staging-news-dependency-discovery.mjs";

test(
  "safe offline source discovery without granting approvals",
  () => {
    const root = mkdtempSync(
      join(tmpdir(), "p54-ac-")
    );

try {
      mkdirSync(
        join(root, "backend", "services"),
        { recursive: true }
      );

mkdirSync(
        join(
          root,
          "backend",
          "services",
          "tests"
        )
      );

writeFileSync(
join(
root,
"backend",
"services",
"news.mjs"
),
'await fetch("https://feeds.vendor.co.uk/v1?secret=hidden");\n'
);

writeFileSync(
join(
root,
"backend",
"services",
"tests",
"ignore.mjs"
),
'fetch("https://ignored.example.com")'
);

      const files = collectFiles(root);

      assert.equal(files.length, 1);

const result = discover(
        files,
        root
      );

      assert.equal(result.length, 1);

assert.deepEqual(
        result[0].literalHosts,
        ["feeds.vendor.co.uk"]
      );

const text = renderMarkdown(
        result,
        files.length
      );

assert.match(
        text,
        /Approved external destinations: 0/
      );

assert.match(
        text,
        /Staging release: BLOCKED/
      );

assert.doesNotMatch(
        text,
        /hidden/
      );

assert.doesNotMatch(
        text,
        /ignored\.example/
      );
    } finally {
      rmSync(
        root,
        {
          recursive: true,
          force: true
        }
      );
    }
  }
);

test(
  "empty discovery never implies deployment readiness",
  () => {
    const text = renderMarkdown([], 0);

assert.match(
      text,
      /Requires manual source review/
    );

assert.match(
      text,
      /Outbound enforcement: NOT_IMPLEMENTED/
    );

assert.match(
      text,
      /Financial execution: DISABLED/
    );
  }
);
</CodeBlock>

These tests use synthetic URLs only. They do not make network requests.
File 3 — .github/workflows/pay54-staging-news-dependency-discovery.yml
<CodeBlock language="yaml" editable>
name: PAY54 STG-05 News Dependency Discovery

on:
  push:
    branches:
      - project-titan
    paths:
      - "backend/services/**"
      - "backend/providers/**"
      - "backend/news/**"
      - "backend/engines/**"
      - "backend/modules/**"
      - "backend/governance/staging-news-dependency-discovery.mjs"
      - "backend/tests/staging-news-dependency-discovery.test.mjs"
      - ".github/workflows/pay54-staging-news-dependency-discovery.yml"

pull_request:
    paths:
      - "backend/services/**"
      - "backend/providers/**"
      - "backend/news/**"
      - "backend/engines/**"
      - "backend/modules/**"
      - "backend/governance/staging-news-dependency-discovery.mjs"
      - "backend/tests/staging-news-dependency-discovery.test.mjs"
      - ".github/workflows/pay54-staging-news-dependency-discovery.yml"

  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pay54-stg05-news-discovery-${{ github.ref }}
  cancel-in-progress: true

jobs:
  offline-news-discovery:
    name: Read-only news dependency inventory
    runs-on: ubuntu-24.04
    timeout-minutes: 10

env:
      PAY54_FINANCIAL_EXECUTION: "false"
      TF_VAR_authorized_provisioning: "false"

steps:

- name: Checkout source without retained credentials
uses: actions/checkout@v4
with:
persist-credentials: false

- name: Configure Node.js 24
uses: actions/setup-node@v4
with:
node-version: "24"

- name: Run offline regression tests
run: node --test backend/tests/staging-news-dependency-discovery.test.mjs

- name: Discover news source dependencies
run: node backend/governance/staging-news-dependency-discovery.mjs

- name: Confirm release remains blocked
shell: bash
run: |
set -euo pipefail

test "$PAY54_FINANCIAL_EXECUTION" = "false"
          test "$TF_VAR_authorized_provisioning" = "false"

echo "PAY54 offline source discovery completed."
          echo "No provider approval, cloud deployment or financial execution authorised."
