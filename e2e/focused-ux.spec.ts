import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// UI regression fixtures only; production authentication is verified separately
// with controlled hosted accounts in the real browser. Never changes app code.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('careersim_onboarded_v2', '1'));
  await page.route('**/src/app/context/AuthContext.tsx*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `export const AuthProvider = ({children}) => children;
      export const useAuth = () => ({user:{id:'ux-test-student'},session:null,loading:false,isSupabaseConfigured:false,signOut:async()=>{},signIn:async()=>({error:null})});`,
  }));
  await page.route('**/*.supabase.co/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
});

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`homepage and original Explore reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'From evidence to opportunity.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (width < 1280) await page.getByRole('button', { name: 'Open menu' }).click();
    else await page.getByRole('button', { name: 'My Career', exact: true }).click();
    await page.getByRole('link', { name: 'Explore Careers', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'What do you want to explore?' })).toBeVisible();
    for (const name of ['Roadmap', 'Transition', 'Compare', 'Mood Match', 'Career Quiz']) {
      await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test('My Career supports keyboard disclosure and Escape', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'My Career', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Career Home', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('Explore investigates a grounded profession', async ({ page }) => {
  await page.goto('/job?fresh=1');
  await page.getByRole('textbox').first().fill('Software Engineer');
  await page.getByRole('button', { name: /Investigate/i }).click();
  await expect(page.getByRole('heading', { name: 'Software Engineer', exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Knowledge-base snapshot', { exact: true })).toBeVisible();
});

for (const path of ['/', '/job?fresh=1']) {
  test(`changed navigation and search accessibility: ${path}`, async ({ page }) => {
    await page.goto(path);
    // Wait for animations to settle before scanning
    await page.waitForTimeout(500);
    const scan = new AxeBuilder({ page }).include('header').exclude('[aria-label="CareerCase — home"]').exclude('[aria-hidden="true"]').exclude('[style*="opacity: 0"]');
    if (path !== '/') scan.include('[data-testid="job-search-empty-state"]');
    const results = await scan.analyze();
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
    const decorative = page.locator('[aria-hidden="true"]').filter({ hasText: 'Software' });
    expect(await decorative.count()).toBeGreaterThan(0);
  });
}
