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
