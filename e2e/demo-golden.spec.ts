import { expect, test, type Page } from '@playwright/test';

async function expectBand(page: Page, band: string) {
  await expect(page.getByRole('heading', { name: band, exact: true })).toBeVisible();
}

async function reachSubmittedApplication(page: Page) {
  await page.goto('/demo/student');
  await expectBand(page, 'BUILDING EVIDENCE');
  await expect(page.getByText('UNKNOWN', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Attach controlled work sample' }).click();
  await expectBand(page, 'NEAR READY');

  await page.getByRole('link', { name: 'Mentor', exact: true }).click();
  await page.getByRole('button', { name: 'Verify observed contribution' }).click();
  await expectBand(page, 'READY FOR REVIEW');
  await expect(page.getByText('Verification events: 1')).toBeVisible();

  await page.getByRole('link', { name: 'Student', exact: true }).click();
  await page.getByRole('button', { name: 'Preview what the recruiter will receive' }).click();
  await expect(page.getByText(/Private guidance dimensions.*are excluded/)).toBeVisible();
  await page.getByRole('button', { name: 'Grant application review consent' }).click();
  await page.getByRole('button', { name: 'Submit controlled application' }).click();
}

test('golden path changes readiness only when evidence changes and keeps decisions human', async ({ page }) => {
  await reachSubmittedApplication(page);

  await page.getByRole('link', { name: 'Recruiter', exact: true }).click();
  await expect(page.getByText('Consented application projection')).toBeVisible();
  await expect(page.getByText('Immutable snapshot', { exact: true })).toBeVisible();
  await expect(page.getByText(/no ranking, automatic shortlist, rejection automation or hiring prediction/i)).toBeVisible();
  await page.getByRole('button', { name: 'Start human review' }).click();
  await page.getByRole('button', { name: 'Record human shortlist' }).click();
  await page.getByRole('button', { name: 'Record controlled selected outcome' }).click();
  await expect(page.getByText('Recorded outcomes: 1. No causal claim is made.')).toBeVisible();

  await page.getByRole('link', { name: 'Institution', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Privacy-protected aggregate snapshot' })).toBeVisible();
  await expect(page.getByText(/Minimum cohort: 10/)).toBeVisible();

  await page.getByRole('button', { name: 'Reset controlled demo' }).click();
  await page.getByRole('link', { name: 'Student', exact: true }).click();
  await expectBand(page, 'BUILDING EVIDENCE');
  await expect(page.getByRole('button', { name: 'Attach controlled work sample' })).toBeEnabled();
});

test('reset is deterministic across two full mutations', async ({ page }) => {
  for (let run = 0; run < 2; run += 1) {
    await reachSubmittedApplication(page);
    await page.getByRole('button', { name: 'Reset controlled demo' }).click();
    await page.getByRole('link', { name: 'Student', exact: true }).click();
    await expectBand(page, 'BUILDING EVIDENCE');
    await expect(page.getByText('UNKNOWN', { exact: true })).toBeVisible();
  }
});

test('production role routes fail closed without a session', async ({ page }) => {
  for (const route of ['/applications', '/verification', '/industry/applicants', '/institution/skills-intelligence', '/industry/questionnaires']) {
    await page.goto(route);
    const closedBoundary = page.getByRole('link', { name: 'Sign in', exact: true })
      .or(page.getByRole('heading', { name: 'This page hit a snag.' }));
    await expect(closedBoundary.first()).toBeVisible();
    await expect(page.getByText('Consented application projection')).toHaveCount(0);
  }
});
