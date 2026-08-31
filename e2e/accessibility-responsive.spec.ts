import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const demoRoutes = ['/demo', '/demo/student', '/demo/mentor', '/demo/recruiter', '/demo/institution', '/demo/faculty'];

for (const route of demoRoutes) {
  test(`${route} has no serious or critical automated accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(item => item.impact === 'serious' || item.impact === 'critical');
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}

for (const viewport of [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`controlled demo reflows at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/demo/student');
    await expect(page.getByRole('heading', { name: 'Prove what exists. Preserve what is unknown.' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test('keyboard focus, touch targets, reduced motion and 200% zoom remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto('/demo/student');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-nav')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#demo-main')).toBeInViewport();

  const undersized = await page.getByRole('button').evaluateAll(buttons => buttons.filter(button => {
    const rect = button.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  }).map(button => button.textContent?.trim()));
  expect(undersized).toEqual([]);

  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await expect(page.getByRole('button', { name: 'Attach controlled work sample' })).toBeVisible();
});

test('English, Hindi and Telugu language selection remains available', async ({ page }) => {
  const localizedHeadlines = [
    ['en', 'Find the work that fits your story.'],
    ['hi', 'वह काम खोजें जो आपकी पूरी कहानी से मेल खाए।'],
    ['te', 'మీ పూర్తి కథకు సరిపోయే పనిని కనుగొనండి.'],
  ] as const;
  for (const [language, headline] of localizedHeadlines) {
    await page.goto('/');
    await page.evaluate(value => localStorage.setItem('cc_guidance_lang', value), language);
    await page.reload();
    await expect(page.getByRole('heading', { name: headline, exact: true })).toBeVisible();
  }
});
