# PAY54 CR-DASHBOARD-01 — Account-scoped read orchestration

## Purpose

An opt-in ES module composes the existing `account-view-response-fence.mjs` rather than duplicating account-level business logic. It provides cancellable concurrent reads across dashboard resources and ensures that an account switch, logout, principal change, session-verification failure or newer same-resource fetch prevents stale data rendering. Separate resources remain independent and retain mobile-first responsiveness.

## API and integration boundary

`createPay54DashboardAccountReadCoordinator()` exposes `confirmAccount`, `onSwitchRequested`, `onLogout`, `onPrincipalChanged`, `onVerificationFailed`, `read`, `close` and `snapshot`. Callers must issue a verified account confirmation only after backend authorization. `read({accountId,principalVersion,resource,load,render})` passes a standard `AbortSignal` to the caller's own fetcher; the synchronous renderer is invoked only on an accepted latest ticket.

The caller **must immediately clear visible account-sensitive content** when receiving an invalidation result. This component cannot prove server-side session authorization, TLS, account ownership, a trusted API response or ledger correctness. All requests must separately authenticate and authorize account membership server-side. There is no request signing, no credential storage, no network endpoint, no side-effecting wallet operation and no payment function in this module.

## Review scope

This PR introduces the reusable coordinator and regressions only. It is **not yet wired to a production dashboard screen**, because the actual asynchronous fetch and render endpoints need separate audit and acceptance before replacing working UI behaviour. No existing scripts are removed or altered; this preserves zero-regression compatibility.

CI proves duplicate-response suppression, cross-account late response prevention, lifecycle cancellation, independent resource reads and sanitized errors. Real browser accessibility and mobile-device testing remain outstanding.

## Release

Source-only / UI opt-in pending frontend integration review. No financial or production activation. PAY54 production NO-GO.
