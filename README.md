# Digital Tax

A Next.js web application for the Making Tax Digital switchover. This project helps self-employed users connect their HMRC account, submit quarterly updates, and complete end-of-year tax filings.

## Project structure

- `app/`
  - `(pages)/`
    - `account/` - Pages for account UI  
  - `api/`
    - `auth/` — OAuth and token callback routes for logging into Digital Tax app with 0Auth
    - `hmrc/`
      - `applicationRestrictedAuth/` — HMRC OAuth and token callback route for application restricted endpoints
      - `fraud/` — HMRC fraud prevention test route
      - `userRestrictedAuth/` — HMRC OAuth and token callback route for user restricted endpoints
    - `utils/` — shared server utilities and header builders
  - `components/` — UI components, HMRC auth buttons, navigation, and test UI
  - `docs/` - UI pages for documentation
  - `layout.tsx`, `page.tsx` — app shell and top-level pages

- `client/`
  - `fraud/` — client-side fraud data collection hooks and helpers

- `config/`
  - `hmrc.ts` — HMRC configuration values and endpoints

- `docs/` - Markdown files for documentation

- `lib/`
  - auth and type utilities

- `public/` — static assets and images

## Key features

- HMRC OAuth authorization flows
- Fraud prevention header construction
- Client-side fraud data collection
- Proxy routes to HMRC test and production APIs
- Tailwind CSS styling with MDX support

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
