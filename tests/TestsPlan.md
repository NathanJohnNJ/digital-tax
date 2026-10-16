# Test Plan

## Goals

Build a practical, layered test suite for this Next.js App Router project. Start with fast deterministic checks, then cover important client UI and server route behavior, and finish with a small set of browser-level user flows. Automated tests must not depend on live HMRC services, production credentials, or production data.

## Test Tools

- **Vitest**: unit, component, and isolated Route Handler tests.
- **React Testing Library**: render components and assert user-visible behavior.
- **@testing-library/user-event**: simulate realistic clicks and form input.
- **jsdom**: browser-like DOM environment for component tests.
- **@testing-library/jest-dom**: accessible DOM matchers such as `toBeVisible` and `toHaveTextContent`.
- **Playwright**: end-to-end browser tests for navigation and rendered workflows.
- **TypeScript and Next.js build**: retain strict typechecking and production compilation as quality gates.

This stack follows the [Next.js Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest) and [Next.js Playwright guide](https://nextjs.org/docs/app/guides/testing/playwright). Vitest is appropriate for utilities and synchronous/client components; async Server Component flows should be exercised with Playwright.

## Test Layers

### 1. Unit Tests

Test deterministic logic without rendering React or contacting services.

- `app/api/utils/ukTaxYear.ts`
  - `getFromDate` and `getToDate` for valid `YYYY-YY` tax years.
  - Reject malformed years and years whose ending year is not consecutive.
  - Verify the UK tax-year boundary around April 5 and April 6, including dates near midnight in the `Europe/London` timezone.
  - `formatDisplayDate` ordinals and month/year formatting.
- Vendor/header utilities
  - Percent encoding and expected escaping.
  - Formatting of vendor-forwarded hops, license IDs, and version values.
  - Missing/empty optional values where supported.
- Calculator state helpers
  - `rowsTotal` with zero, integer, decimal, and invalid/empty values.
  - Provider interactions for updating, adding, and removing rows; totals remain formatted to two decimal places and at least one row remains available.

### 2. Component Tests

Use React Testing Library with accessible queries and user interactions.

- `Quarterly`
  - Render multiple obligations from the response.
  - Display formatted period and due dates.
  - Show fulfilled state and received date when available.
  - Show the Quarterly Updates link only for open obligations.
  - Preserve `nino` and `businessId` query parameters in that link.
  - Handle empty results and failed requests without crashing.
- `BusinessDetails`
  - Show its loading/empty state and render returned details.
  - Refetch when `businessId` or `nino` changes.
- Account navigation
  - Preserve the selected business query parameters across account links.
- Calculator UI
  - Editing, adding, and removing rows updates totals and leaves a valid row after the last row is removed.

### 3. Route Handler Tests

Invoke Route Handler exports with request objects and mock their external dependencies.

- Quarterly obligations
  - Build the HMRC request with the requested business, tax-year date range, and expected headers.
  - Return a successful HMRC payload unchanged.
  - Surface HMRC error responses, missing-token behavior, and network failures.
- Business list and business details
  - Verify successful responses and upstream error handling.
- Database and cookie routes
  - Verify successful response shapes and database/error handling.

Mock `fetch`, Next.js cookie access, token helper functions, and `pool.query` at the boundary. Do not send real requests to HMRC or use a real user database in these tests. Keep tests focused on each route's behavior rather than coupling them to implementation details.

### 4. End-to-End Tests

Use Playwright against a local test server, with same-origin API requests stubbed using fixture responses.

- Open Business Overview with a selected business, navigate to Quarterly Updates, and return while confirming the query parameters are retained.
- Render fulfilled and open obligations from stubbed responses and verify the visible status and action link.
- Exercise the browser workflow without HMRC credentials or production data.

The app uses Auth0 middleware in `proxy.ts`. Determine whether Playwright needs a test-authenticated storage state or a test-only mock at the test boundary. Never add an authentication bypass to production code.

## Implementation Sequence

1. Install Vitest, `@vitejs/plugin-react`, jsdom, React Testing Library, `@testing-library/dom`, `user-event`, `jest-dom`, and Playwright as development dependencies. Vite's native TypeScript path resolution is enabled in the Vitest config.
2. Add `vitest.config.mts`, a shared matcher setup file, and `test`, `test:run`, and `test:e2e` scripts.
3. Add unit tests for tax-year utilities, header helpers, and calculator state.
4. Add component tests for quarterly and year-end obligations, business details, account navigation, and calculator controls.
5. Add isolated Route Handler tests with external dependencies mocked.
6. Add Playwright configuration and a navigation/obligation smoke test. Direct account-page navigation works without real HMRC credentials; HMRC API requests are stubbed.
7. Add Suspense around account navigation that reads search params, as required for Next.js static prerendering, and keep obligation links based on their business/period props.

## Suggested Project Test Files

- `app/api/utils/ukTaxYear.test.ts`
- `app/api/utils/vendorHeaders.test.ts`
- `app/api/routes.test.ts`
- `app/components/ui/account/context/CalculatorState.test.tsx`
- `app/components/ui/account/BusinessDetails.test.tsx`
- `app/components/ui/account/navLinks.test.tsx`
- `app/components/ui/account/obligations/Quarterly.test.tsx`
- `app/components/ui/account/obligations/YearEnd.test.tsx`
- `e2e/account-navigation.spec.ts`
- `playwright.config.ts` and an `e2e/` directory for browser tests.
- `vitest.config.mts` and `test/setup.ts` for shared configuration.

## Commands and Quality Gates

- `npm run test:run` — run Vitest once in CI or before changes are committed.
- `npm run test` — run Vitest in watch mode during development.
- `npm run test:e2e` — run browser smoke tests with Playwright.
- `npx tsc --noEmit` — strict TypeScript validation.
- `npm run build` — verify the production Next.js build.

Run the fast Vitest suite first, then TypeScript and build checks, followed by Playwright. Browser tests may require installing Playwright's browser binaries in a new environment with `npx playwright install chromium`.

## Implemented Coverage

- Vitest: 37 tests across 8 test files, covering tax-year input/date formatting and UK cutoff behavior, vendor headers, calculator helper and interactions, quarterly/year-end links, business detail refetching, account navigation, and mocked HMRC/database/cookie routes.
- Playwright: 1 smoke test covers fulfilled/open obligation rendering and navigation from Business Overview to Quarterly Updates and back, with HMRC API responses stubbed.
- Verified locally with `npm run test:run`, `npx tsc --noEmit`, `npm run build`, and `npm run test:e2e`.

## Boundaries and Future Work

The initial suite will mock the database pool rather than create a real database integration environment. A separately provisioned disposable test database can be considered later if database behavior needs end-to-end coverage. Live HMRC contract testing, real OAuth credentials, and production data are explicitly out of scope for routine automated tests.
