# Digital Tax testing and release verification plan - 19/47 (40%) COMPLETED - 0/7 (0%) SECTIONS COMPLETED

This is the single checklist for testing and verification moved from the [implementation plan](./implementation-plan.md) and [record-keeping plan](./record-keeping-plan.md). Feature implementation remains in those plans. A completed implementation is not proof that its end-to-end tests, HMRC approval, or production-readiness checks have passed.

## How to use this plan

- `[x]` records a completed check with its stated scope; `[ ]` means the whole stated check remains open. Re-run affected checks after material changes rather than treating an old result as a permanent release pass.
- Progress counts checklist points in the numbered sections; a section is complete only when all its points are checked. Percentages are rounded to the nearest whole number.
- Each section states what is being tested and the prerequisites. Tests in different sections can run independently once their prerequisites are met; the end-to-end and release checks come after their dependent features and lower-level tests.
- Record the date, environment, version/commit, outcome, and safe evidence for each future test. Do not record credentials, tokens, NI numbers, taxpayer data, fraud-header values, or sensitive database exports here. Do not send fraud-prevention API logs to HMRC.
- Use HMRC Sandbox test users and the matching test identifiers. Use an isolated test database and disposable fixtures for write, isolation, backup and restore checks; do not modify or delete existing accounts, tokens, or real records to manufacture a failure. Confirm a safe failure scenario before testing revoked or invalid refresh tokens.
- The app currently targets Sandbox. Sandbox results do not prove live HMRC behavior, production access, or compliance.

## Suggested order

1. **Foundation and contract checks:** establish the test environment and confirm the applicable HMRC contracts before testing an integration. Completed historical checks are recorded below.
2. **Automated and database checks:** after each relevant feature exists, run focused unit/component and route tests; use isolated database fixtures for persistence and isolation. These groups can be developed in parallel.
3. **Sandbox journeys:** after deployment, exercise account linking, obligations, submissions and other implemented routes. Fraud-header feedback depends on first making a request to each endpoint.
4. **End-to-end and recovery:** once records, totals, submission snapshots and related journeys exist, run the combined journey, failures and backup/restore tests.
5. **Release:** rerun the applicable suites and production-readiness reviews before providing evidence to HMRC or enabling production. Do not defer focused safety checks while implementing changes.

## 1. Environment, database and contract baseline - 7/8 COMPLETED

**Tests:** The deployed schema and migration baseline, Pi network boundary, and existing HMRC integration contracts. Contract and regulatory research needed to implement a feature remains in the implementation plans.

**Prerequisites:** Access to the relevant environment and current official HMRC references; never expose secrets or change a shared database during inspection.

- [x] Verify the connected database contains the HMRC token table with the expected columns, constraints, row-level security and API-role permissions, without changing or dropping `users`.
- [x] Verify the existing `users` and token-table migration baseline in a shadow database: the schema diff is clean, the baseline is recorded remotely, and a push dry run reports no pending migrations.
- [x] Verify that the seven digital-record tables and their RLS settings exist in the linked database after the additive migration applied on 14 November 2026. This is a schema check, not database-backed route or isolation testing.
- [x] Check that the Pi listens on `127.0.0.1:3000`, NGINX sets `X-Real-IP` from `$remote_addr`, the configured server IP matches the public WAN IP, and router forwarding for port 3000 is removed, as confirmed by the operator.
- [x] Compare existing HMRC paths, methods, scopes, version headers, request and response shapes with the applicable Developer Hub contracts; fix the identified issues and rerun the comparison.
- [x] Test the corrected Individual Calculations v9.0 list request.
- [x] Compare the self-employment annual summary form and payload against the current API schema and validate the identified field-specific rules.
- [ ] Recheck the HMRC API changelog, Developer Hub contracts, production availability, application process and approval requirements immediately before planning production.

## 2. Sign-in, HMRC authorisation and account separation - 6/8 COMPLETED

**Tests:** New and existing account journeys, token refresh, account switching and recovery. The checked items are operator-observed Sandbox journeys, not independent proof of the identity behind a token or financial-data isolation.

**Prerequisites:** Deployed account and OAuth features, an available test database, matching encryption-key configuration, an existing linked test account, and a separate app account and HMRC Sandbox user. Complete the new-link journey before exercising its failure and recovery cases.

- [x] An existing connection and business list are available to the same app user on a second browser/device without relinking, as confirmed by the operator.
- [x] An authenticated forced Sandbox token refresh succeeds and the business list remains available afterwards, as confirmed by the operator.
- [x] The existing Sandbox connection and business list remain available after more than four hours of inactivity across devices, as confirmed by the operator.
- [x] A newly signed-up app account initially appeared unlinked, then linked to HMRC Sandbox and loaded its business list, as confirmed by the operator.
- [x] Both app accounts display their respective email, saved NI number and linked status when switching accounts, as confirmed by the operator. This does not independently verify which HMRC identity a token belongs to or test financial-data isolation.
- [x] Declining a new Sandbox authorisation shows an error while the previously linked account and business list remain available, as confirmed by the operator.
- [ ] Independently verify first-login database-row creation and the HMRC identity associated with the new link, using a safe method that does not expose credentials or tokens.
- [ ] Verify `invalid_grant` refresh failure, observable relink status, and recovery against Sandbox using a confirmed safe scenario. The declined-authorisation test above is not a refresh-failure test; automated coverage does not replace this end-to-end check.

## 3. Automated component, route and data tests - 5/11 COMPLETED

**Tests:** Request validation, response/error handling, accounting calculations, UI behavior and per-user access. Mocked database tests do not establish real database persistence or isolation.

**Prerequisites:** Implement the feature being tested first. Unit/component and mocked-route tests can run together; use isolated database fixtures for the real-database checks.

- [x] Maintain targeted automated tests for existing quarterly submission/history, annual summary and relevant API validation behavior.
- [x] Cover record-export pagination, user scoping, serialization/escaping and failure handling with mocked database responses. Database-fixture verification remains open.
- [x] Cover dynamic Sandbox obligation request headers and selected-year parameters, plus out-of-order responses and error states in the obligation components. These are mocked tests; the live Sandbox check remains open.
- [x] Cover allowlisted Sandbox test-user tools, their production-mode opt-in, application-token requests and relevant failure responses with automated mocks.
- [x] On 16 November 2026, the then-current working tree passed 147 automated tests, TypeScript checks and a production build. This is historical evidence, not a release-candidate pass.
- [ ] Add or complete unit tests for field and category validation, allowable/disallowable treatment, restricted finance costs, accounting bases, money representation, rounding and conversion, tax-year and period boundaries, totals, record versioning and export serialization. Test the chosen money representation before relying on it for persistence.
- [ ] Add or complete route tests for authentication, per-user/per-business isolation, validation, import preview/commit, history, edits and deletion, export completeness, persistence failures and submission snapshots.
- [ ] Test ownership checks for list, read, update, delete, history, import and export, including attempts to access another user's business or records.
- [ ] Verify record operations against isolated database fixtures, including persistence, version conflicts, history, business ownership and cross-user isolation.
- [ ] Test export completeness against database fixtures, business/year/date filters, special characters, empty results, large exports and cross-user isolation.
- [ ] Check that failed database writes, HMRC failures and partial imports are reported accurately and do not appear successful.

Existing automated tests live under [`tests/unit`](./tests/unit) and [`tests/component`](./tests/component). The latest run used `./node_modules/.bin/vitest run`, `./node_modules/.bin/tsc --noEmit` and `npm run build`; the package manifest does not currently declare a test script or Vitest dependency, so a fresh installation must first have the required test tooling available.

## 4. HMRC Sandbox route and journey matrix - 0/8 COMPLETED

**Tests:** The behavior and error handling of each implemented HMRC route and the selected-year links. This is separate from testing fraud headers and does not establish production behavior.

**Prerequisites:** Deploy the feature and link a Sandbox user. Use matching test identifiers and supported scenarios from the current API documentation. Run independent read-only cases before submission or correction cases; perform writes only with disposable Sandbox data.

- [ ] Build and execute a repeatable matrix for each in-scope HMRC route: success, validation errors, missing data, expired authorisation, retries and upstream failures.
- [ ] After deployment, verify Sandbox dynamic quarterly and year-end obligation responses and their links for different selected tax years. Automated mocks do not establish the live Sandbox response; HMRC documents specific business IDs for its dynamic quarterly scenario.
- [ ] Test open, fulfilled and missing obligations, historical periods, supported tax-year schemas, corrections, validation errors, expired authorisation and upstream failures.
- [ ] Test record-derived totals, tax-year boundaries, multiple businesses, empty periods, corrections, retries, HMRC validation errors and outcomes that cannot be confirmed.
- [ ] Test empty, existing, invalid and amended annual summaries, accounting adjustments, allowances and HMRC errors.
- [ ] Test valid and invalid loss claims, boundary conditions, amendments and resulting calculations after the loss journeys exist.
- [ ] Test calculation and finalisation success, validation failures, incomplete data, duplicate requests, expired authorisation, unavailable HMRC services and amendment windows after the relevant journeys exist.
- [ ] Test record correction after submission: later corrections feed the applicable update and the original submission snapshot remains available.

Use this matrix to organise the open cases above. Record each route's result separately; completing one row does not complete the entire matrix.

| Journey / endpoint group | What to exercise | Order and prerequisite |
| --- | --- | --- |
| Business list and details | Correct linked-user request and business selection; no data, invalid identifiers and upstream errors. | After linking; before using a business in the rows below. |
| Quarterly and final-declaration obligations | Selected year and returned periods/links, open/fulfilled/missing cases, invalid input and upstream errors. | After business selection; read-only checks before submission. |
| Quarterly submission and history | Supported tax-year schemas, submitted period or cumulative values, retrieval, errors, retries and uncertain outcomes. | After obligations; record-derived cases also require saved totals and snapshots. |
| Annual summaries and BSAS | Retrieve, prefill, submit and amend; empty/invalid data, adjustments, allowances and errors. | After annual and BSAS features are implemented; use the relevant business and year. |
| Losses, calculations and final declaration | Supported claims, calculation lifecycle, incomplete data, errors, finalisation and amendments. | After their respective features exist; perform finalisation only after its prerequisite data and reviews. |

## 5. Fraud-prevention headers - 0/2 COMPLETED

**Tests:** Header values and trusted forwarding on the actual outbound requests, not just a single diagnostic request. See [fraud-prevention notes](./docs/dev/fraud-prevention.mdx).

**Prerequisites:** Keep the verified Pi/proxy boundary in place, configure only trusted server-derived values, and exercise each supported Sandbox operation before requesting feedback for that endpoint. The app currently exposes the single-request validator, not a validation-feedback screen.

- [ ] Verify fraud-prevention header values and trusted forwarding behavior for each outbound operation; do not trust browser-supplied values that should come from the server or hosting platform.
- [ ] Use HMRC's [validation-feedback endpoint](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0) after the relevant API requests; resolve errors and review warnings. Do not share the header values or send the API logs to HMRC.

The earlier single-request validator reported a missing client public port and an MFA warning; it did not verify every endpoint. Do not substitute a guessed port or fabricate MFA data. The port investigation remains open.

## 6. End-to-end records and recovery - 1/5 COMPLETED

**Tests:** A complete traceable records-to-submission/export journey, followed by recovery and operational reviews.

**Prerequisites:** The full records journey requires the records workspace, period totals, submission snapshots, supported HMRC submission flows and exports, plus relevant checks in sections 2–5. Backup integrity and isolated restore checks can run independently once a backup exists. Use disposable fixtures and an isolated restore target.

- [x] On 16 November 2026, the operator confirmed a successful manual backup service run and `restic check --read-data` with no errors for the Pi's encrypted USB repository. This verifies the stored repository data, not a database restore.
- [ ] Run end-to-end coverage: create/import records → review records and history → calculate quarterly totals → submit in Sandbox → view the submission outcome and history → export records, history and submission references.
- [ ] Verify that the enabled daily backup timer executes successfully on its first scheduled run and produces a new snapshot.
- [ ] Restore an encrypted backup to an isolated target and confirm database integrity and application recovery. CSV exports are not database backups.
- [ ] Complete security, privacy, retention, backup/restore, support and accessibility reviews before launch.

## 7. Release and HMRC evidence - 0/5 COMPLETED

**Tests:** Current release build, production configuration and evidence readiness.

**Prerequisites:** Implement the scoped release features and complete their applicable checks above. Production approval, credentials and configuration remain separate implementation/release gates; do not enable live traffic based on Sandbox results.

- [ ] Run TypeScript checks, relevant unit/route/end-to-end suites and a production build on the release candidate.
- [ ] Review production OAuth endpoints, revocation, credentials, scopes, redirect URI and release controls separately before production use.
- [ ] Verify production OAuth, fraud-prevention headers, data protection, retention, support, monitoring and recovery procedures.
- [ ] Verify current HMRC production access and approval requirements separately and verify Sandbox and Production environments remain isolated.
- [ ] Prepare the requested HMRC evidence and completed approval checklist without including secrets or fraud-prevention API logs.
