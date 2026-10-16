# Making Tax Digital for Income Tax: self-employment implementation plan

Use the checkboxes in this document to track remaining work. This plan is based on the routes and account flows currently in the repository and HMRC's Developer Hub guidance reviewed on 16 October 2026. HMRC's end-to-end guide says it was last updated on 15 September 2026.

## Scope and definition of done

This plan prioritises the existing individual, self-employment journey: connect an individual to HMRC, select their self-employment business, report quarterly figures, complete year-end adjustments and loss handling, calculate the tax position, and submit or amend the final tax return.

This is a bounded product scope, not a claim that the app already meets HMRC's full minimum functionality standards or is production-ready. HMRC expects compatible software to support the whole journey for all relevant income types, digital record keeping or a digital link to software that does so, and either tax-return submission or signposting to a product that can do it. See [Compatibility boundary](#compatibility-boundary) before describing the app as MTD-compatible.

The journey is complete for this scope when the remaining in-scope checkboxes below are done, the end-to-end flows pass the relevant HMRC Sandbox scenarios, and HMRC production requirements are met for the actual application and release window. Sandbox acceptance is not a live filing.

## Already present in the app

These are existing sandbox flows, not production-ready capabilities:

- HMRC OAuth authorisation, callback, and refresh routes.
- Self-employment business list and business detail routes.
- Quarterly and year-end obligation routes and an obligations view.
- A quarterly update form and submission route, including historical period and cumulative update handling.
- Quarterly update history retrieval.
- Retrieval and submission of the self-employment annual summary.
- Fraud-prevention header construction and a Sandbox validation route.
- An income and expense calculator; the current account flow does not persist its values as digital records.

## Remaining implementation checklist

### 1. Verify the HMRC API contract and existing routes

- [x] Compare every implemented request path, HTTP method, scope, version header, request body, and response shape against the current HMRC API reference before extending the integration.
- [x] Fix errors highlighted in the comparison output.
- [x] Re-run comparison.
- [x] Correct and test the existing self-assessment calculation-list request against the current Individual Calculations API contract; its path is correct, but its version header and query parameters do not match the current contract.
- [ ] Add explicit input and response validation to existing business, obligation, and calculation routes, preserving HMRC status codes and useful error details without exposing secrets or personal data.
- [ ] Record supported API versions and review the HMRC API changelog before releases so version or schema changes do not silently break submissions.

Relevant references: [HMRC Income Tax MTD API catalogue](https://developer.service.hmrc.gov.uk/api-documentation/docs/api?filter=income-tax-mtd), [Business Details API v2.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/business-details-api/2.0), [Obligations API v3.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0), [Self Employment Business API v5.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0), [Individual Calculations API v9.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/9.0), [HMRC user-restricted OAuth guidance](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints), [Create Test User API v1.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/api-platform-test-user/1.0), and [Test Fraud Prevention Headers API v1.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0).

### 2. Complete digital records and quarterly reporting

- [ ] Decide whether the app will provide digital record keeping itself or link to another record-keeping product; document the chosen user journey.
- [ ] If records are held in this app, persist the user's source records and submitted figures so they are accessible to the user and exportable.
- [ ] Connect saved records and totals to quarterly submissions with traceable data flow; if the app is used as bridging software, implement and test compliant digital links to the record-keeping product.
- [ ] Test business selection and obligations for multiple self-employment businesses, tax years, reporting periods, open and fulfilled obligations, and HMRC validation errors.
- [ ] Test quarterly submission and history for supported tax years, corrections or replacement submissions, duplicate/retry behaviour, and cumulative update boundaries.
- [ ] Make it clear to users which period, business, and figures are being submitted, and show HMRC's response and submission status.

Relevant reference: [HMRC minimum functionality standards](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html#minimum-functionality-standards).

### 3. Complete annual adjustments and business-source summaries

- [x] Compare the annual summary form and payload with the complete current Self Employment Business API schema; add any missing fields and validate field-specific rules.
- [ ] Complete retrieve, prefill, edit, submit, and resubmission flows for the annual self-employment summary, including HMRC validation feedback.
- [ ] Integrate the Business Source Adjustable Summary (BSAS) API where required to request, retrieve, and submit business-source adjustments; show the returned calculation and any differences for user review.
- [ ] Reconcile annual figures with all quarterly submissions for the business and tax year before offering year-end completion.
- [ ] Test annual-summary and BSAS flows for empty, existing, invalid, and amended summaries, and for relevant accounting adjustments and allowances.

Relevant references: [Self Employment Business API v5.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0), [Business Source Adjustable Summary API v7.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-assessment-bsas-api/7.0), and [HMRC guidance on updates at tax-year end](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html).

### 4. Add self-employment loss handling

- [ ] Add routes and user flows to retrieve, create, amend, and remove supported brought-forward losses and loss claims using the current Individual Losses API.
- [ ] Apply HMRC's rules for carrying losses forward, carrying them back, setting them sideways where permitted, and applying earlier-year losses against current-year profits.
- [ ] Show the effect of loss choices and the relevant tax year/business to the user before submission; retain enough submission history to explain what was sent.
- [ ] Test valid and invalid loss scenarios, boundary conditions, and the effect on the resulting calculation.

Relevant reference: [Individual Losses API v7.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-losses-api/7.0). Confirm supported operations and schemas in its current API reference before implementation.

### 5. Add tax calculations and year finalisation

- [ ] Implement the missing calculation lifecycle using the current Individual Calculations API: trigger a calculation, list or retrieve calculations, and retrieve the calculation result and breakdown.
- [ ] Present an income-tax estimate or clearly signpost the user to their HMRC account; if displaying an estimate, explain that it is an estimate and may not match the final liability.
- [ ] Add a year-end preflight that identifies outstanding obligations and missing annual, loss, or other required information before offering finalisation.
- [ ] Add the final tax-return submission/final declaration flow with an explicit user review and confirmation step, correct tax year, submission result, and safe handling of repeat requests.
- [ ] Show the submitted return's status and HMRC reference, and prevent a Sandbox success response from being described as a live filing.
- [ ] Test calculation and finalisation success, validation failures, incomplete data, duplicate requests, expired authorisation, and HMRC outages.

Relevant reference: [Individual Calculations API v9.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/9.0). Confirm current endpoint names, methods, scopes, and schemas against the API reference.

### 6. Support amendments after finalisation

- [ ] Review HMRC's current amendment rules and implement the supported amendment route and user journey for a submitted tax return.
- [ ] Show the return version being amended, capture the reason and revised data as required, and require user review before submission.
- [ ] Preserve an auditable history of the original submission, amendments, HMRC responses, and resulting calculations.
- [ ] Test permitted amendment windows, invalid amendments, repeat requests, and recalculation after an amendment.

Relevant reference: [HMRC guidance on amendments after making a final declaration](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html#amendments-after-making-a-final-declaration).

### 7. Harden integration and prepare for a production release

- [ ] Review OAuth state/CSRF protection, token refresh and revocation, cookie flags and lifetimes, and server-side secret handling.
- [ ] Verify fraud-prevention header values and forwarding behaviour against HMRC guidance for every outbound MTD request; retain Sandbox validation evidence.
- [ ] Build a repeatable Sandbox test matrix for each in-scope route, including success, validation errors, missing data, expired tokens, retries, and upstream failures.
- [ ] Add privacy-conscious monitoring and operational diagnostics for HMRC request failures without logging access tokens or unnecessary taxpayer data.
- [ ] Review data retention, user access/export, privacy notices, and audit requirements before storing any tax records or submissions.
- [ ] Check the current HMRC production application, API subscription, approval, and credential process before planning a live launch.
- [ ] Complete HMRC's applicable production approvals and provide required evidence before enabling production traffic.
- [ ] Keep Sandbox and Production configuration separate and add a release check that prevents accidental use of Sandbox credentials or endpoints in Production.

**Production-access caveat:** HMRC's end-to-end guide, updated 15 September 2026, warns that it is no longer accepting production credential access requests for new 2026–27 quarterly update products because the market window has closed. Recheck HMRC's current roadmap and application process; do not assume new credentials are available or that passing Sandbox tests grants Production access.

## Compatibility boundary

The selected implementation scope is self-employment only. HMRC's minimum functionality standards describe a whole customer journey across all relevant income types and require digital record keeping or digital links, loss and year-end handling, and tax-return submission or signposting. Before claiming that this app alone is MTD-compatible:

- [ ] Decide how users with UK or foreign property income and multiple business sources will complete their required quarterly updates.
- [ ] Decide how users will provide non-mandated income (for example employment, dividends, savings, or pensions) and other required return information.
- [ ] Either implement the relevant HMRC APIs and journeys or provide a clear route to compatible software that completes the unsupported parts of the journey.
- [ ] Document the digital-record and digital-link arrangement and ensure users can access and export records as required.

Agent authorisation, property-business filing, other income APIs, HMRC Assist prompts, and non-Income-Tax products are not part of the self-employment implementation milestones above. Treat them as separate scope decisions, except where another compatible product or signposting is needed to meet the end-to-end requirements.

## HMRC source material

- [Income Tax MTD API catalogue](https://developer.service.hmrc.gov.uk/api-documentation/docs/api?filter=income-tax-mtd)
- [Income Tax MTD end-to-end service guide](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/)
- [How to integrate and minimum functionality standards](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html)
- [Making updates at the end of a tax year](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html)
- [Business Details API v2.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/business-details-api/2.0)
- [Obligations API v3.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0)
- [Self Employment Business API v5.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0)
- [Business Source Adjustable Summary API v7.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-assessment-bsas-api/7.0)
- [Individual Losses API v7.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-losses-api/7.0)
- [Individual Calculations API v9.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/9.0)
