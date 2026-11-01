# RydEx Phase 3 QA Suite

Playwright-based QA coverage for the RydEx frontend. Three suites:

| Suite | Path | Command | Purpose |
|---|---|---|---|
| E2E journeys | `tests/e2e` | `npm run test:e2e` | Critical user flows across browsers/devices |
| A11y | `tests/a11y` | `npm run test:a11y` | axe-core WCAG 2.1 AA, focus management, ARIA, 44px targets |
| Visual | `tests/visual` | `npm run test:visual` | Screenshot regression across 3 viewports |

Run everything: `npm run test:qa`.

## First-time setup

```bash
# from the repo root
npm install
npx playwright install --with-deps
```

The suite runs against a production build:

```bash
npm run build
npm run start        # http://localhost:3000
```

`playwright.config.ts` starts `npm run start` automatically if nothing is
listening on port 3000 (`reuseExistingServer`).

## Notes

- Routes such as `/dashboard/*` require an authenticated session; run them
  locally with seeded demo users from `backend` (`npm run seed`).
- Visual baselines are generated on first run (`test:visual:update`) and must
  be committed before CI comparisons are meaningful.
- Accessibility tests fail with `results.violations` printed to the report;
  use the HTML report (`playwright-report/`) for the exact node and fix hint.
- Target-size assertions only check controls present on the page; unauthenticated
  states are covered, authenticated pages were verified manually (see
  `../qa-matrix.md`).
