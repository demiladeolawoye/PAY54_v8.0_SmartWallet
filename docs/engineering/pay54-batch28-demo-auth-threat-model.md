<!-- PAY54 Batch 28 / 1226 -->
# PAY54 Batch 28 — Legacy Development Authentication Risk and Migration Plan

**Security classification:** Development-only account demonstration. NOT approved real customer authentication or any bank/PSP account issuance.

## Verified repository source findings

The pre-Batch28 `assets/js/auth.js` stored a four-digit demo PIN in plaintext under the localStorage key `pay54_pin`, and the front-end `verifyOtp` flow accepted an arbitrary six-digit value without any provider-verified OTP. The mock signup also stored demo name, email and telephone in browser localStorage. Existing `login.html`, `signup.html`, `forgot-pin.html`, `create-new-pin.html` and `verify-otp.html` displayed unsupported bank-grade security, instant onboarding or sent-email claims.

These source facts are a **P0 barrier to real customer use**, not proof that any real customer PIN was collected or publicly exposed. Actual deployment and customer use remain unverified.

## Batch28 mitigation (preview compatibility preserved)

- Replaced all newly written plaintext demo PINs with per-profile random 128-bit salts and PBKDF2-SHA256 derived verifiers (310,000 iterations, 256-bit output). Browser WebCrypto is required; unavailable cryptography fails closed.
- Added a one-time compatibility migration: a matching existing legacy demo PIN is converted to the verifier and the old plaintext localStorage key removed. Incorrect PIN cannot migrate.
- Kept the existing one-minute `PAY54-DEV-AUTH-HANDOFF-V1` sessionStorage shape to preserve the current development-auth bridge. The handoff is NOT a provider-signed real authentication assertion.
- Updated all five auth pages with explicit demonstration notices, honest OTP/recovery text and programmatic labels for their existing controls.
- Preserved each original form ID, submit handler and redirected demo flow; extensive VM-based regression tests cover signup, login, wrong PIN, migration, reset and mock-OTP disclosure.
- Added a source guard that fails CI if plaintext PIN writes or unsupported financial-security language are reintroduced.

## Residual risks — not solved by a browser hash

A four-digit PIN has at most 10,000 candidates. An attacker with a captured offline verifier can exhaust that space despite a slow KDF. The demo PIN and verifier remain fully client-side and cannot establish a trusted bank customer identity. The legacy sample name, email and phone remain in localStorage for old demo compatibility; users must use made-up information, never real banking secrets. The mock OTP never checks an emailed code, and localStorage remains modifiable by users/scripts.

**Do not market salted browser hashing as bank-grade credential protection.** Do not transfer demo PINs, browser identities or KYC statuses into future production accounts. A real product must use a contracted identity provider, strong MFA, phishing-resistant methods where supported, backend admission, server-side rate limits, verified recovery and authenticated session issuance.

## Operational acceptance before real login

1. Prevent public production authentication from importing or executing this demo module.
2. Independently verify current Pages exposure of all auth/signup routes and require real incident review if customer secrets are discovered.
3. Provision trusted IdP and the restricted PAY54 PostgreSQL session/account backend; verify actual role privileges and unique assertion consumption.
4. Implement compliant privacy/retention controls; remove mock OTP/email assertions in real consumer journeys and handle legacy profile data without migrating credentials.
5. Run cross-device, screenreader, MFA, logout, replay, account cache isolation, malicious browser storage and performance tests.

**Decision:** CR-IDENTITY-01, CR-ACCOUNT-02, CR-RATE-01, CR-QA-01 remain OPEN. Source preview tests PASS is not operational approval; PAY54 production NO-GO.
