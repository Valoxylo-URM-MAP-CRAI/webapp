// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Internationalisation of the "Général" tab.
 *
 * A single <select> in the top banner switches the whole UI between French and
 * English (`applyValoboisI18n` rewrites text, titles, placeholders and ARIA
 * names; the choice is persisted in localStorage). These tests assert the
 * switch through the accessibility tree — tab names, field names, group names
 * and the alert button names all follow the active language.
 */

/** @param {import('@playwright/test').Page} page */
const generalPanel = (page) => page.getByRole('tabpanel', { name: 'Général' });

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // Fresh context → no stored preference → French is the default.
  await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute('aria-selected', 'true');
});

test.describe('Language switch', () => {
  test('switching to English translates tab and field accessible names', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Langue' }).selectOption({ label: 'English' });

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Tab names follow the language.
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Scoring' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Général' })).toHaveCount(0);

    // The active panel is now exposed under its English name.
    const panel = page.getByRole('tabpanel', { name: 'General' });
    await expect(panel.getByRole('textbox', { name: 'Project / operation' })).toBeVisible();
    await expect(panel.getByRole('textbox', { name: 'Site reference' })).toBeVisible();
  });

  test('group and alert accessible names also follow the language', async ({ page }) => {
    // In French first.
    await expect(generalPanel(page).getByRole('group', { name: /Type d.opération/ })).toBeVisible();

    await page.getByRole('combobox', { name: 'Langue' }).selectOption({ label: 'English' });

    const panel = page.getByRole('tabpanel', { name: 'General' });
    await expect(panel.getByRole('group', { name: 'Operation type' })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Missing fields: Assessor/ })).toBeVisible();
  });

  test('the chosen language persists across reloads', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Langue' }).selectOption({ label: 'English' });
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();

    await page.reload();

    // Restored from localStorage on boot — still English, no flash back to French.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Général' })).toHaveCount(0);
  });

  test('switching back to French restores the original labels', async ({ page }) => {
    const lang = page.getByRole('combobox', { name: 'Langue' });
    await lang.selectOption({ label: 'English' });
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();

    // The control is itself relabelled "Language" once English is active.
    await page.getByRole('combobox', { name: 'Language' }).selectOption({ label: 'Français' });

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('tab', { name: 'Général' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'General' })).toHaveCount(0);
  });

  test('language choice does not change which tab is active', async ({ page }) => {
    await page.getByRole('tab', { name: 'Lots' }).click();
    await expect(page.getByRole('tab', { name: 'Lots' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('combobox', { name: 'Langue' }).selectOption({ label: 'English' });

    // "Lots" is spelled identically in both languages, and stays selected.
    await expect(page.getByRole('tab', { name: 'Lots' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'false');
  });
});
