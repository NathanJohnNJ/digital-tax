# Digital Tax

A Next.js web application for the Making Tax Digital switchover. This project helps self-employed users connect their HMRC account, prepare and submit quarterly updates, and manage their self-employment annual summary.

## Project structure

- `app/` — Next.js App Router application
  - `(pages)/` — account pages plus cookies, privacy, terms, and testing pages
    - `account/` — account overview, business overview, income calculator, quarterly updates, and year-end tax return pages
  - `actions/` — server actions for HMRC services and access tokens
  - `api/`
    - `auth/token/`, `cookies/`, `db/` — application API routes
    - `hmrc/`
      - `applicationRestrictedAuth/` — HMRC application-restricted auth and test-user creation
      - `fraud/` — fraud-prevention test route
      - `userRestrictedAuth/`
        - `annualSubmission/` — retrieve and create or amend the self-employment annual summary
        - `obligations/` — retrieve quarterly and year-end obligations
        - `quarterlyUpdateHistory/` — retrieve submitted period summaries
        - `submitQuarterlyUpdate/` — submit self-employment periodic or cumulative updates
        - other routes — user authorization, business details, business list, refresh, and tax calculations
    - `utils/` — HMRC fraud-prevention headers, vendor headers, tax-year, and encoding helpers
  - `components/` — shared UI, authentication, navigation, and test components
    - `ui/account/` — account panels, obligations, income calculator, and annual/quarterly update forms
      - `context/` — shared calculator state for income, expenses, and disallowable expenses
      - `taxReturn/` — self-employment annual summary form
      - `updates/` — quarterly update form and history component
  - `docs/` — documentation page routes and MDX presentation components
  - `cookies/`, `privacy/`, `terms/`, `testing/` — supporting pages
  - `layout.tsx`, `page.tsx`, `globals.css` — app shell, home page, and global styles
- `client/fraud/` — client-side fraud-prevention data collection
- `config/hmrc.ts` — HMRC configuration and endpoints
- `docs/` — developer and user documentation in MDX (`dev/` and `user/`)
- `glow/main.css` — Glow styling
- `lib/` — authentication, database, and shared types
- `public/images/` — static images and logos
- `proxy.ts` — request proxy configuration
- `package.json`, `package-lock.json` — project scripts and dependencies
- `next.config.ts`, `tailwind.config.js`, `postcss.config.mjs`, `tsconfig.json` — application and build configuration
- `turbo.json` — Turbo configuration

## Key features

- HMRC OAuth authorization flows
- Fraud prevention header construction
- Client-side fraud data collection
- Quarterly self-employment update submission and annual summary management through HMRC APIs
- Income, expense, and disallowable-expense calculators
- Proxy routes to HMRC test and production APIs
- Tailwind CSS styling with MDX support

The year-end page currently manages the self-employment annual summary. Submitting a complete final tax declaration requires additional income schedules, a reviewed HMRC tax calculation, and a separate final declaration step.

## Scripts

```bash
npm run dev
npm run build
npm start
```

## Requirements

- Node.js 20+ recommended
- `npm install` to install dependencies
- Environment variables for HMRC credentials and app configuration

## License

MIT License

## Author

Nathan John - NJTD <nj@njtd.xyz>
