# HMRC API versions used by this application

This inventory records the API versions the code currently calls. It is not a list of the latest HMRC versions or a statement that the application is approved for production. Routes currently use the HMRC Sandbox host configured by `HMRC_CONFIG.testApiUrl`; verify the actual target before describing any integration as production-ready.

**Reviewed against HMRC Developer Hub references:** 17 October 2026  
**Official changelog:** [HMRC Income Tax MTD API changelog](https://github.com/hmrc/income-tax-mtd-changelog)

## Version inventory

| HMRC API | Version used | Routes and endpoint operations | Version header | Environment and notes |
| --- | --- | --- | --- | --- |
| [Business Details (MTD)](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/business-details-api/2.0) | 2.0 | `businessList`: list businesses; `businessDetails`: retrieve business details | `application/vnd.hmrc.2.0+json` | Sandbox. |
| [Obligations (MTD)](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0) | 3.0 | `obligations/quarterly`: retrieve income-and-expenditure obligations; `obligations/yearEnd`: retrieve crystallisation obligations; `quarterlyUpdateHistory`: retrieve obligations | `application/vnd.hmrc.3.0+json` | Sandbox. |
| [Self Employment Business (MTD)](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0) | 5.0 | `submitQuarterlyUpdate`: submit period updates; `quarterlyUpdateHistory`: retrieve period summaries and details; `annualSubmission`: retrieve or submit the annual summary | `application/vnd.hmrc.5.0+json` | Sandbox. Request and response schemas can depend on tax year; check the API specification for any tax-year-dependent field changes. |
| [Individual Calculations (MTD)](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/9.0) | 9.0 | `listSelfAssessmentTaxCalculations`: list; `retrieveSelfAssessmentTaxCalculation`: retrieve; `individualTaxCalculation`: trigger | `application/vnd.hmrc.9.0+json` | Sandbox. HMRC marks this version test-only. List response schemas vary by tax year: 2022–23 and earlier, 2023–24/2024–25, and 2025–26 onwards. |
| [Test Fraud Prevention Headers](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0) | 1.0 | `POST /api/hmrc/fraud/test` calls `GET /test/fraud-prevention-headers/validate`; validates headers sent on that same request | `application/vnd.hmrc.1.0+json` | Sandbox validation endpoint; test/support use only. |
| [Create Test User](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/api-platform-test-user/1.0) | 1.0 | `POST /api/hmrc/applicationRestrictedAuth/createTestUser`: create an individual test user | No `Accept` version header is currently sent by this route. | Sandbox testing utility; not a customer-facing production HMRC operation. |

HMRC OAuth authorisation, token exchange, and refresh requests use the OAuth 2.0 protocol and do not set an HMRC API `Accept` version header. They are therefore not listed as versioned APIs above.

## Release review

Before each release that changes HMRC integration code, or before a release when the previous review is no longer valid:

1. Review the [Income Tax MTD API changelog](https://github.com/hmrc/income-tax-mtd-changelog) for changes affecting each API listed above.
2. Open the linked Developer Hub reference and confirm the version remains available, its status, endpoint paths and methods, required headers, and request and response schemas.
3. Pay particular attention to tax-year-specific schemas and effective dates. Update the affected route validators, callers, tests, and this inventory together; do not bump an API version without reviewing the new contract.
4. Record the review date and any resulting code or schema changes in the release notes or pull request. If no change is needed, update the reviewed date above.

The version inventory describes the implemented Sandbox contract. Production migration requires separately confirming the production API status, access approval, environment configuration, fraud-prevention obligations, and applicable HMRC release requirements.
