# Digital Tax: end-to-end implementation plan

This is the canonical product plan. It uses the staged checklist structure of the earlier `implementation-plan2.md`, but replaces its greenfield assumptions with the actual Next.js, Auth0, PostgreSQL, and HMRC Sandbox project. It also incorporates the record-keeping work in [record-keeping-plan.md](./record-keeping-plan.md).

Use `[x]` only for work already present and verified in the repository. A checked item describes implementation, not production approval or proof of HMRC compliance. `[ ]` means work remains. Recheck linked HMRC guidance and the API changelog before implementing or releasing contract-sensitive changes.

## Product scope and completion criteria

The target is a full end-to-end MTD for Income Tax product: sign in, connect to HMRC, manage each mandated self-employment and property business (including UK and foreign property), keep and review digital records, submit quarterly figures, complete year-end adjustments and loss handling, review calculations, and submit or amend a final tax return. If any non-mandated income or final-return information is not supported directly, the product must clearly direct users to compatible software that can complete it.

The user requirement is that records entered or imported into this app can be reviewed over time and exported. This plan therefore treats in-app record keeping, record history, and export as required product capabilities—not optional future enhancements. The app must derive quarterly totals from saved records (or provide an explicitly audited adjustment) rather than silently requiring users to re-key figures.

HMRC's minimum functionality standards expect the end-to-end journey for all income types, including quarterly updates for each mandated self-employment and property source. HMRC allows a product to divert customers to compatible software for unsupported non-mandated income or return submission, but that is not a basis to claim this product alone completes a full end-to-end journey. Do not claim compatibility or readiness until the [compatibility and production gates](#10-compatibility-and-production-release-gates) are satisfied.

The in-scope journey is complete when:

- Users can create, import, review, correct, and export their records and see record and submission history for each business and tax year.
- Records are securely isolated by signed-in user, and quarterly submission values are traceable to records and any explicit adjustments.
- The relevant HMRC journeys, including errors and retry/recovery cases, pass automated tests and the applicable Sandbox scenarios.
- Privacy, retention, support, backup/restore, and release procedures are in place.
- Any production use is separately approved and configured for the current HMRC production requirements. A Sandbox response is never presented as a live filing.

## 0. Project inception and baseline

- [x] Establish the existing application baseline: Next.js App Router, Auth0 application sign-in, PostgreSQL connection pool, account UI, same-origin API routes, and HMRC Sandbox configuration.
- [x] Establish the current scope and flows from the repository: HMRC OAuth, business list/details, quarterly and year-end obligations, quarterly submissions/history, annual self-employment summary, and calculation routes.
- [x] Record that the current calculator is not persistent digital record keeping and that current HMRC calls use Sandbox.
- [x] Decide the product requirement: provide in-app records with history and CSV export for the full in-scope MTD journey.
- [x] Confirm the product goal: aim for a full end-to-end MTD product, include UK and foreign property as well as self-employment, and do not omit a mandated source merely to simplify the first complete-product release.
- [x] Confirm manual record entry is required.
- [x] Confirm the database is a Supabase PostgreSQL project on the free plan in the London region (`eu-west-2`), and the existing `users` table schema and key (`id bigint` primary key) have been supplied.
- [x] Confirm the current Supabase plan does not provide managed backups for this project; a separate backup/restore solution remains necessary before storing customer records.
- [x] Confirm `DB_CONNECTION_STRING` points to this Supabase project.
- [x] Confirm `users.auth_id` stores the Auth0 `sub`.
- [x] Confirm the intended user lifecycle: when an Auth0 user first enters the app, find their database user by Auth0 `sub` and create the row if absent; track HMRC authorization separately from app sign-in.
- [x] Confirm HMRC authorization should persist with the app user's account and work across devices.
- [x] Confirm manual records and CSV import are both required as early product capabilities; CSV must use an explicit mapping and preview flow.
- [x] Confirm individual records as the default and grouped entries only for HMRC-documented eligible cases.
- [x] Confirm support for the accounting methods necessary for broad user coverage; implement and validate both cash basis and traditional accounting/year-end adjustments.
- [x] Confirm HMRC-facing amounts use GBP; retain original foreign-currency amount plus rate/date/source and converted GBP amount where transactions are in another currency.
- [x] Confirm CSV as the preferred export format and a 50-entry recent activity view, while retaining source records and submission evidence for the required retention period.
- [x] Establish a Supabase migration baseline for the existing remote schema without recreating `users`; verify the baseline in a shadow database and reconcile remote history.

## 1. Application and HMRC integration foundation

### Present

- [x] Use the existing Next.js App Router and same-origin route-handler architecture; a separate backend/controllers project is not needed for this application.
- [x] Keep HMRC calls and OAuth credentials server-side; the browser calls local routes.
- [x] Implement the initial HMRC OAuth authorisation, callback, and refresh routes.
- [x] Implement business, obligation, quarterly update/history, annual summary, and calculation routes.
- [x] Construct fraud-prevention headers and provide the Sandbox validation route.
- [x] Track implemented HMRC API versions and release contract-review steps in [api-versions.md](./api-versions.md).
- [x] Record the implemented request flow and Sandbox boundary in [docs/dev/architecture.mdx](./docs/dev/architecture.mdx) and [docs/dev/api-design.mdx](./docs/dev/api-design.mdx).

### Auth flow and release checklist

- [x] Add OAuth state validation and a short-lived HTTP-only state cookie; require the authenticated Auth0 user in both the authorisation and callback routes.
- [x] Implement an idempotent Auth0-subject user upsert before HMRC linking and on the account page, without accepting a client-supplied identity for the profile database routes.
- [x] Add per-user server-side HMRC token persistence with AES-256-GCM application-layer encryption and a key-version field. No token is returned to browser code or stored in an HMRC token cookie.
- [x] Serialize refresh-token rotation with a per-user database row lock and persist both replacement tokens before another request can use them.
- [x] Use a shared token helper from all user-restricted HMRC routes; it refreshes access tokens when they expire within 60 seconds. `GET /api/hmrc/userRestrictedAuth/refresh` uses the same helper.
- [x] Correct the callback to exchange every new authorization code, even when a previous access token exists. Remove the old fixed-host redirect and clear legacy HMRC token cookies.
- [x] Mark a connection as requiring relinking when HMRC returns `invalid_grant`; otherwise retain the connection across Auth0 logins and devices.
- [x] Mark the stored connection as requiring relinking when an HMRC user-restricted API responds with `401`.
- [x] Verify that the connected Supabase database has the token table with row-level security and the intended API-role privileges; the existing `users` table remains in place.
- [x] Capture the existing schema in [the baseline migration](./supabase/migrations/20261107014720_baseline.sql), record it as applied remotely, and verify a clean schema diff and push dry run. The earlier token-table SQL is retained as [historical reference](./supabase/archive/20261106140000_create_hmrc_user_tokens.sql), not an active migration.
- [x] Configure a 32-byte `HMRC_TOKEN_ENCRYPTION_KEY` in this development environment's ignored `.env`.
- [ ] Configure that same stable secret on the Raspberry Pi and any other server instance using the same token table. Existing browser-cookie-only connections may need a one-time relink.
- [ ] Verify first-login row creation, HMRC linking, expiry-driven refresh, refresh failure handling, and reuse from another browser/device against Sandbox. Review production OAuth endpoints, revocation, credentials, scopes, redirect URI and release controls separately.
- [x] Review remaining OAuth production concerns (including revocation behavior, deployment secret rotation, and live HMRC setup) before any production use. HMRC documents a 4-hour access-token lifetime and says refresh tokens stop working after 18 months; the app waits for HMRC rejection instead of assuming undocumented expiry semantics. Review and unresolved Production gates are recorded in [docs/dev/hmrc-oauth.mdx](./docs/dev/hmrc-oauth.mdx).
- [ ] Verify fraud-prevention header values and trusted forwarding behavior for each outbound operation; do not trust browser-supplied values that should come from the server or hosting platform.
- [x] Review current database routes and derive user identity from the Auth0 server session; new financial-data routes must use the same per-user authorization pattern.
- [ ] Add consistent request validation, HMRC error forwarding, safe logging, and operational diagnostics for any new record or HMRC routes.

### Contract baseline marked complete

- [x] Compare existing HMRC paths, methods, scopes, version headers, request bodies, and response shapes with the applicable Developer Hub contracts.
- [x] Fix the identified existing route-contract issues and rerun the comparison.
- [x] Correct and test the existing Individual Calculations v9.0 list request.
- [x] Add input/response validation to the existing business, obligation, and calculation routes while preserving useful upstream error statuses/details safely.
- [x] Document route API versions and the release-time HMRC changelog review in [api-versions.md](./api-versions.md).

References: [HMRC Income Tax MTD API catalogue](https://developer.service.hmrc.gov.uk/api-documentation/docs/api?filter=income-tax-mtd), [user-restricted OAuth guidance](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints), and the API-specific links in [api-versions.md](./api-versions.md).

## 2. Digital records, history, and export

Detailed implementation checklist: [record-keeping-plan.md](./record-keeping-plan.md).

- [x] Verify the baseline digital-record fields: amount, date the income was received or expense incurred, and income/expense category, using categories aligned with Self Assessment. Retain the official [GOV.UK record guidance](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records) and [digital record-keeping direction](https://www.gov.uk/government/publications/digital-record-keeping-notice-for-making-tax-digital-for-income-tax) as requirements sources.
- [x] Verify detailed record rules and tax-year changes for self-employment, UK property, and foreign property before finalizing field validation. The verified source rules and API schema boundaries are recorded in [record-keeping-plan.md](./record-keeping-plan.md); detailed field validation remains dependent on implementation.
- [x] Choose full-detail record categories and mappings for self-employment, UK property, and foreign property from the current quarterly-update direction and API schemas.
- [ ] Validate per-category allowable/disallowable treatment, restricted finance costs, and cash-versus-traditional accounting behavior for record aggregation and annual adjustments.
- [ ] Design and migrate persistent business, record, import, audit/history, and submission-link data using the actual deployed PostgreSQL schema and authenticated user key.
- [x] Implement authenticated record creation, viewing, editing, correction, and archive behavior with strict per-user and per-business authorization. The schema is applied; database-backed route verification remains open.
- [ ] Implement record history, including changes and links to quarterly submissions, so a user can identify what changed, when, and which records informed each submission.
- [x] Implement CSV import with explicit mapping, preview, row-level validation, duplicate handling, idempotent commit, and safe undo for unchanged records in an unwanted import.
- [ ] Implement complete, usable CSV exports for the user's records and relevant history/submission metadata, with filters and clear tax-year/business context. Test that export is complete, correctly scoped, and readable outside the app.
- [ ] Connect saved records to server-calculated period totals. Any user-entered adjustment must be explicit, validated, and included in history; do not allow untraceable edits to submitted totals.
- [ ] Support records for multiple self-employment businesses, UK property businesses, and foreign property businesses, while following HMRC's distinct grouping rules for foreign property records.
- [ ] Store foreign-currency source values and conversion provenance when needed; convert amounts to sterling for tax calculations and HMRC submissions using a verified, consistent policy for the selected accounting basis.
- [ ] Define and test record correction after submission, including how later corrections affect subsequent updates and how the original submission snapshot remains available.
- [ ] Publish user guidance for adding, reviewing, importing, exporting, and correcting records.
- [ ] Implement and test retention, user access/export, deletion requests, backups, restore, and account closure handling after confirming the applicable legal requirements.
- [ ] Decide separately whether receipt attachments, bank feeds, or bridging to another record-keeping product are in scope. Do not imply that these are implemented unless they are.

HMRC reference: [Minimum functionality standards](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html#minimum-functionality-standards). The detailed plan records questions whose exact requirements must be verified before implementation.

## 3. Business selection, obligations, and quarterly updates

### Present

- [x] Retrieve and display a user's self-employment businesses and business details.
- [x] Retrieve and display quarterly and year-end obligations.
- [x] Submit quarterly self-employment updates, including the existing tax-year-dependent period/cumulative behavior.
- [x] Retrieve quarterly update history from HMRC.
- [x] Display the existing account and quarterly-update forms.

### Remaining

- [ ] Support records and submissions for multiple businesses, tax years, reporting periods, and applicable accounting bases.
- [ ] Add quarterly and annual UK and foreign property journeys using the current Property Business API, in addition to the existing self-employment routes.
- [ ] Replace the current manually entered totals as the primary source with saved-record totals and an explicit, audited adjustment path.
- [ ] Show business, tax year, period, included records, totals, and Sandbox/live environment clearly before confirmation.
- [ ] Preserve the exact submitted payload and a stable snapshot/reference to the records and record versions that produced it; save HMRC response status and correlation metadata safely.
- [ ] Handle duplicate/retry requests without accidental duplicate submissions or misleading success states.
- [ ] Implement cumulative year-to-date reporting correctly: corrected digital records should feed into the next applicable update; support resending the fourth update when required before year-end adjustments.
- [ ] Test open/fulfilled/missing obligations, historical periods, supported tax-year schemas, corrections, validation errors, expired authorization, and upstream failures.

References: [Obligations API](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0), [Self Employment Business API](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0), [Property Business API v6.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/property-business-api/6.0), HMRC [minimum functionality standards](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html#minimum-functionality-standards), and GOV.UK [quarterly updates](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates).

## 4. Annual adjustments and business-source summaries

- [x] Compare the annual summary form and payload with the current Self Employment Business API schema, add the identified missing fields, and validate field-specific rules.
- [ ] Complete the annual summary retrieve, prefill, edit, submit, and resubmission journey, including clear HMRC validation feedback.
- [ ] Integrate the Business Source Adjustable Summary (BSAS) API where required to request, retrieve, and submit business-source adjustments; present the returned calculation and differences for user review.
- [ ] Reconcile annual figures with quarterly submissions and saved records for the selected business and tax year before completion.
- [ ] Test empty, existing, invalid, and amended summaries, accounting adjustments, allowances, and HMRC errors.

References: [Self Employment Business API v5.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0), [Business Source Adjustable Summary API v7.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-assessment-bsas-api/7.0), and [HMRC guidance on updates at tax-year end](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html).

## 5. Losses

- [ ] Confirm supported operations and schemas in the current Individual Losses API reference.
- [ ] Implement routes and user flows to retrieve, create, amend, and remove supported brought-forward losses and loss claims.
- [ ] Apply HMRC rules for carry-forward, carry-back, sideways set-off where permitted, and earlier-year losses against current-year profits.
- [ ] Show the relevant tax year/business and the effect of loss choices before submission; retain the data and response history needed to explain what was sent.
- [ ] Test valid/invalid claims, boundary conditions, amendments, and resulting calculations.

Reference: [Individual Losses API v7.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-losses-api/7.0).

## 6. Calculations, finalisation, and amendments

### Present

- [x] Trigger an in-year or intent-to-finalise Self Assessment calculation through the existing route.
- [x] List and retrieve Self Assessment calculations through existing routes.
- [x] Keep calculation triggering distinct from final declaration: the existing calculation route does not submit a final return.

### Remaining

- [ ] Complete the calculation lifecycle and show the result and breakdown for the correct business/tax year, including a clear estimate explanation or signposting to HMRC where appropriate.
- [ ] Add a year-end preflight for outstanding obligations and missing annual, loss, or other required information.
- [ ] Implement the supported final tax-return/final declaration journey with complete required information, explicit user review/confirmation, correct tax year, response status/reference, and safe retry behavior.
- [ ] Implement supported post-finalisation amendments after verifying current HMRC rules; show the return version and require review before submission.
- [ ] Preserve an auditable history of calculations, declarations, amendments, HMRC responses, and the records that informed them.
- [ ] Test success, validation failures, incomplete data, duplicate requests, expired authorization, unavailable HMRC services, and amendment windows.

References: [Individual Calculations API v9.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/9.0) and [HMRC year-end updates and amendments guidance](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html).

## 7. User experience, history, and reminders

- [x] Provide an authenticated account area with existing business, obligations, quarterly-update, calculator, and year-end summary pages.
- [ ] Add a records workspace with business/tax-year filters, searchable or filterable history, record details, and clear links to submitted periods.
- [ ] Make record export easy to find and explain the export format and included data.
- [ ] Show whether HMRC responses are Sandbox or Production and distinguish a successful Sandbox test from a live filing.
- [ ] Decide whether calendar/reminder features are in scope; if implemented, derive them from HMRC obligations and show the source/deadline.
- [ ] Update user documentation and support/error states alongside each journey.

## 8. Verification and operational readiness

- [x] Maintain targeted tests for existing quarterly submission/history, annual summary, and relevant API validation behavior.
- [ ] Add unit tests for record validation, categories, money conversion, tax-year and period boundaries, totals, and export serialization.
- [ ] Add route tests for authentication, cross-user/business isolation, invalid input, import preview/commit, edits and deletion, export completeness, and submission persistence.
- [ ] Add end-to-end tests for create/import records → review history → calculate period totals → submit in Sandbox → see submission history → export records.
- [ ] Build a repeatable Sandbox matrix for each in-scope API route: success, validation errors, missing data, expired tokens, retries, and upstream failures.
- [ ] Add privacy-conscious monitoring and operational diagnostics without logging access tokens or unnecessary taxpayer/record data.
- [ ] Define retention, support, backups, restore testing, incident response, and account closure/export procedures.
- [ ] Run TypeScript checks, relevant unit/route/e2e suites, and production build before release.

## 9. HMRC production-readiness gates

- [ ] Recheck the current HMRC API changelog, Developer Hub contracts, production availability, application process, and approval requirements immediately before planning production.
- [ ] Complete HMRC production approvals and provide any required evidence before enabling live traffic.
- [ ] Keep Sandbox and Production configuration, credentials, and data handling separate; add a release check preventing accidental environment mismatch.
- [ ] Verify production OAuth, fraud-prevention headers, data protection, retention, support, monitoring, and recovery procedures.

**Availability caveat:** the reviewed HMRC end-to-end guide stated that it was no longer accepting production credential access requests for new 2026–27 quarterly update products because the market window had closed. This may change; verify the current roadmap and access process. Sandbox acceptance does not grant Production access.

## 10. Compatibility and production release gates

The product goal is the full end-to-end journey, not a self-employment-only product. HMRC says compatible products should facilitate the entire journey for all income types, including quarterly updates for self-employment, UK property, and foreign property where applicable. Before claiming that this app alone meets HMRC's MTD compatibility/minimum functionality requirements:

- [ ] Implement required quarterly and year-end journeys for UK/foreign property income and multiple business sources.
- [ ] Decide how users provide non-mandated income and other information required for a complete tax return.
- [ ] Implement the relevant journeys or provide clear signposting to compatible software that completes unsupported parts.
- [ ] Confirm digital record-keeping or digital-link arrangements across the complete journey, including user access and export.
- [ ] Confirm all applicable HMRC production approvals and requirements for the release window.

Property-business filing is in scope for the chosen full-product goal. Non-mandated income may be signposted to compatible software only if the product clearly supports the customer to complete the whole return across products. Agent authorisation, HMRC Assist prompts, and non-Income-Tax products remain separate scope decisions unless needed for the chosen approval/product type.

**Production-access caveat:** the reviewed Property Business API v6.0 reference (20 October 2026) warns that HMRC is no longer accepting production credential access requests for new 2026–27 quarterly update products because the market window has closed. HMRC describes full end-to-end, in-year, and end-of-year product stages, but the applicable approval route and current availability must be confirmed before treating a production launch as schedulable.

## Official source material

- [Income Tax MTD API catalogue](https://developer.service.hmrc.gov.uk/api-documentation/docs/api?filter=income-tax-mtd)
- [Income Tax MTD end-to-end service guide](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/)
- [How to integrate and minimum functionality standards](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html)
- [Create digital records](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records)
- [Send quarterly updates](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates)
- [Submit your tax return](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return)
- [Property Business API v6.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/property-business-api/6.0)
- [Making updates at the end of a tax year](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html)
- [HMRC Income Tax MTD API changelog](https://github.com/hmrc/income-tax-mtd-changelog)
- See [api-versions.md](./api-versions.md) for the API versions currently used by this application and their specific Developer Hub references.
