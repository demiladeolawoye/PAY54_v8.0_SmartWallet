
"use strict";

/*
 * PAY54 Phase 2G-AC — News Outbound Dependency Discovery
 * Version: 1.0.0
 *
 * Offline, read-only source inspection.
 * No network requests, cloud access, provider activation,
 * Terraform execution or financial operations.
 */

import {
  readdirSync,
  readFileSync,
  statSync,
  appendFileSync
} from "node:fs";

import {
  join,
  relative,
  resolve,
  dirname,
  extname
} from "node:path";

import { fileURLToPath } from "node:url";

const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const candidates = [
  "backend/services",
  "backend/providers",
  "backend/news",
  "backend/engines",
  "backend/modules"
];

const permitted = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts"
]);

const skipped = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "tests",
  "__tests__",
  "fixtures",
  "governance"
]);

const maxFiles = 3000;
const maxBytes = 1024 * 1024;

export function collectFiles(
  base,
  folders = candidates
) {
  const results = [];

  function walk(dir) {
    if (results.length >= maxFiles) {
      throw new Error("File limit exceeded");
    }

    let entries;

    try {
      entries = readdirSync(
        dir,
        { withFileTypes: true }
      );
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }

    for (const entry of entries) {
      if (
        entry.isSymbolicLink() ||
        skipped.has(entry.name)
      ) {
        continue;
      }

      const location = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(location);
      } else if (
        entry.isFile() &&
        permitted.has(extname(entry.name))
      ) {
        if (
          statSync(location).size <= maxBytes
        ) {
          results.push(location);
        }
      }
    }
  }

  for (const folder of folders) {
    walk(resolve(base, folder));
  }

  return [...new Set(results)].sort();
}

function relevant(path, content) {
  return (
    /news|feed|rss|article|headline|publisher/i.test(path) ||
    /newsapi|newsdata|gnews|mediastack|newsdata\.io|rssparser|feedparser/i.test(
      content
    )
  );
}

export function discover(
  files,
  base = root
) {
  const result = [];

  const urlRx =
    /https?:\/\/[^\s"'`<>\\)\]]+/g;

  const callRx =
    /\b(fetch|axios\.(?:get|post|request)|https?\.request|https?\.get|got\(|undici|request\(|new\s+WebSocket\s*\()/g;

  for (const file of files) {
    const content = readFileSync(
      file,
      "utf8"
    );

    const path = relative(
      base,
      file
    ).replaceAll("\\", "/");

    if (!relevant(path, content)) {
      continue;
    }

    const lines = content.split(/\r?\n/);

    for (
      let index = 0;
      index < lines.length;
      index++
    ) {
      const line = lines[index];

      const operations = [
        ...line.matchAll(callRx)
      ].map(match => match[1]);

      const hosts = [];

      for (const match of line.matchAll(urlRx)) {
        try {
          const url = new URL(match[0]);

          if (!hosts.includes(url.hostname)) {
            hosts.push(url.hostname);
          }
        } catch {
          // Incomplete URL literals are not interpreted.
        }
      }

      if (
        operations.length ||
        hosts.length
      ) {
        result.push({
          file: path,
          line: index + 1,
          operations: [...new Set(operations)],
          literalHosts: hosts
        });
      }
    }
  }

  return result;
}

export function renderMarkdown(
  items,
  examined
) {
  const lines = [
    "## PAY54 Phase 2G-AC — News Outbound Source Discovery",
    "",
    "**STATIC SOURCE OBSERVATIONS ONLY — NOT NETWORK EVIDENCE OR PROVIDER APPROVAL**",
    "",
    `Eligible source files scanned: ${examined}`,
    `Source reference locations: ${items.length}`,
    "Approved external destinations: 0",
    "Authenticated cloud evidence: 0",
    "Outbound enforcement: NOT_IMPLEMENTED",
    "Staging release: BLOCKED",
    "Cloud provisioning: DISABLED",
    "Financial execution: DISABLED",
    "",
    "| File | Line | Potential outbound operation | Literal hostname (unverified) |",
    "| --- | ---: | --- | --- |"
  ];

  for (const item of items.slice(0, 150)) {
    const safe = value =>
      String(value)
        .replace(/[|<>\r\n]/g, "")
        .slice(0, 160);

    lines.push(
      `| ${safe(item.file)} | ` +
      `${item.line} | ` +
      `${safe(
        item.operations.join(", ") ||
        "URL literal"
      )} | ` +
      `${safe(
        item.literalHosts.join(", ") ||
        "Dynamic / unknown"
      )} |`
    );
  }

  if (!items.length) {
    lines.push(
      "| No candidate references found | — | Requires manual source review | — |"
    );
  }

  if (items.length > 150) {
    lines.push(
      "",
      `Output capped at 150 of ${items.length} locations.`
    );
  }

  lines.push(
    "",
    "This scanner cannot infer runtime call graphs, contracts, effective firewall policy or whether a URL is contacted. Review dependencies, environment configuration and provider terms separately.",
    ""
  );

  return lines.join("\n");
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url)
) {
  try {
    const files = collectFiles(root);

    const items = discover(
      files,
      root
    );

    const markdown = renderMarkdown(
      items,
      files.length
    );

    process.stdout.write(markdown);

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        markdown
      );
    }
  } catch (error) {
    process.stderr.write(
      `STG-05 discovery failed: ${error.message}\n`
    );

    process.exitCode = 1;
  }
}
