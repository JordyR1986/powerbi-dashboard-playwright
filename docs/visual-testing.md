# Visual testing

The `visual` project compares four key pages of Sauce Demo with stored screenshots:
login, inventory, cart and checkout overview. The baselines are in
`tests/visual/__screenshots__/`.

## Why baselines are only made in the Playwright image

Fonts, anti-aliasing and browser builds differ between operating systems, so a
screenshot taken on a laptop never matches one taken on a CI runner. All baselines
are therefore generated inside the official image `mcr.microsoft.com/playwright:v1.64.1-noble`,
the same image the CI test jobs and the `Dockerfile` use. `@playwright/test` is pinned
to the same version in `package.json`.

Outside CI and Docker the visual tests still open each page, but the screenshot
assertions are skipped (`ignoreSnapshots` in `playwright.config.ts`). A local run
can never fail on a font difference, and it can never write a wrong baseline.

## Updating the baselines

**On GitHub (no Docker needed).** Open _Actions_ → _Update visual baselines_ →
_Run workflow_ and choose the branch. The workflow:

1. takes new screenshots in the Playwright image,
2. checks that they pass twice in a row,
3. commits them to that branch as `test: update visual baselines`,
4. starts the CI workflow on the new commit.

The screenshots are also kept as the `visual-baselines` artifact for 14 days.

**With Docker on your machine.**

```bash
npm run docker:build
npm run docker:update-snapshots
git add tests/visual/__screenshots__
```

## Keeping them stable

- Animations are disabled and the text caret is hidden.
- The footer shows the current year, so it is masked.
- A difference of up to 1% of the pixels is tolerated (`maxDiffPixelRatio: 0.01`).
- The viewport is fixed at 1280 × 800 on Desktop Chrome.

A real UI change shows up as a failed test with a diff image in the Playwright and
Allure reports. If the change is intended, run the update workflow.
