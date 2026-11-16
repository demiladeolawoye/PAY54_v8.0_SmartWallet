# PAY54 Project Titan — Batch 10 Implementation 258 Regression Evidence Register

**Date:** 2026-11-16  
**Repository:** `demiladeolawoye/PAY54_v8.0_SmartWallet`  
**Branch:** `project-titan`

## Exact tested revisions

**Source commit (all latest account, credential, audit and release-boundary tests):** `9d0b67788bd12f7afd402753dd866fa3288a4026` (item 256).  
**CI enforcement commit:** `597e656d00882b94c15cc20c8e466af24b032afa` (item 257). That commit modifies the CI workflow to explicitly execute the release-boundary test and static source audit; no later executable application source file was changed before this evidence record.

| GitHub Actions workflow | GitHub run ID | Commit | Final observed status |
|---|---|---|---|
| PAY54 Backend Tests | `43863785877` | `9d0b6778` | SUCCESS |
| PAY54 Account Boundary Tests | `43863786236` | `9d0b6778` | SUCCESS |
| PAY54 Account Security Integration | `43863785869` | `9d0b6778` | SUCCESS |
| PAY54 Account Read Access Integration | `43863785856` | `9d0b6778` | SUCCESS |
| PAY54 Account Catalogue and Isolation Integration | `43863785834` | `9d0b6778` | SUCCESS |
| PAY54 Account Authentication and RLS Integration | `43863786059` | `9d0b6778` | SUCCESS |
| PAY54 Batch 07 Account Security Integration | `43863785870` | `9d0b6778` | SUCCESS |
| PAY54 Batch 08 Authenticated Actor Integration | `43863786084` | `9d0b6778` | SUCCESS |
| PAY54 Batch 09 Account Actor and RLS Integration | `43863785755` | `9d0b6778` | SUCCESS |
| PAY54 Batch 10 Synthetic Role and Audit Source Tests | `43863833778` | `597e656d` | SUCCESS |

The Batch 10 workflow uses a disposable PostgreSQL 16 service, migrations 001–013 in CI only, and synthetic role/GUC/rollback suites 022–024. It also checks source-only release nonactivation and runs account tests. These CI checks **do not attest live PostgreSQL credentials, customer-table RLS or an independently durable audit sink**.

## GitHub Pages publication observation

GitHub-managed `pages build and deployment` workflow `43863833459` completed **SUCCESS** at `597e656d` even though no user-initiated staging or production deployment was authorised. Page publication settings, custom-domain route and branch rules were **not independently examined**. This remains an explicit Founder/DevSecOps review gate. No Pages setting was modified in Batch 10.

## Superseded workflow results

Intermediate branch pushes produced cancelled GitHub Actions runs because later commits superseded their work. These are not represented as successful runs. Evidence is anchored only to the explicit successful IDs and exact SHAs above.

## Scope and assurance limits

Automated success supports source syntax, selected behavioural regressions and isolated PostgreSQL semantics. It does not establish SOC/PCI certification, bank approval, availability SLOs, penetration-test sign-off, production credential custody, live KYC/KYB, settlement reconciliation, positive real-customer database permissions or go-live readiness.

**Release classification:** SOURCE_ONLY_REGRESSION_VERIFIED; LIVE_DB_ACCESS_DISABLED; FINANCIAL_EXECUTION_DISABLED; CLOUD_PROVISIONING_DISABLED; PRODUCTION_RELEASE_BLOCKED.
