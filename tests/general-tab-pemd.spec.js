// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * The CERFA PEMD sub-sections of the "Général" tab — "Diagnostiqueur PEMD" and
 * "Visite PEMD" — are collapsed by default. Their Oui/Non toggles and free
 * fields therefore only reach the accessibility tree once the section is
 * expanded. These tests cover that reveal, the toggle semantics, and
 * persistence of the choices.
 */

/** @param {import('@playwright/test').Page} page */
const generalPanel = (page) => page.getByRole('tabpanel', { name: 'Général' });

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute('aria-selected', 'true');
});

test.describe('Diagnostiqueur PEMD section', () => {
  test('the "Compétences justifiables" toggle is revealed on expand and is single-select', async ({ page }) => {
    const panel = generalPanel(page);
    const competences = panel.getByRole('group', { name: /Compétences justifiables/ });

    // Collapsed → not exposed.
    await expect(competences.getByRole('button', { name: 'Oui' })).toBeHidden();

    await panel.getByText('Diagnostiqueur PEMD', { exact: true }).click();

    const oui = competences.getByRole('button', { name: 'Oui' });
    const non = competences.getByRole('button', { name: 'Non' });
    await expect(oui).toBeVisible();
    await expect(oui).toHaveAttribute('aria-pressed', 'false');
    await expect(non).toHaveAttribute('aria-pressed', 'false');

    await oui.click();
    await expect(oui).toHaveAttribute('aria-pressed', 'true');

    await non.click();
    await expect(non).toHaveAttribute('aria-pressed', 'true');
    await expect(oui).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('Visite PEMD section', () => {
  test('its toggles are revealed on expand and operate independently', async ({ page }) => {
    const panel = generalPanel(page);
    const vices = panel.getByRole('group', { name: /Vices ou désordres/ });
    const precautions = panel.getByRole('group', { name: /Précautions de démolition/ });

    await expect(vices.getByRole('button', { name: 'Oui' })).toBeHidden();

    await panel.getByText('Visite PEMD', { exact: true }).click();

    await expect(vices.getByRole('button', { name: 'Non' })).toBeVisible();

    // Selecting in one Oui/Non group must not affect the other.
    await vices.getByRole('button', { name: 'Non' }).click();
    await precautions.getByRole('button', { name: 'Oui' }).click();

    await expect(vices.getByRole('button', { name: 'Non' })).toHaveAttribute('aria-pressed', 'true');
    await expect(vices.getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'false');
    await expect(precautions.getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'true');
    await expect(precautions.getByRole('button', { name: 'Non' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('its free-text fields accept input once expanded', async ({ page }) => {
    const panel = generalPanel(page);
    await panel.getByText('Visite PEMD', { exact: true }).click();

    await panel.getByRole('textbox', { name: /Date de dernière visite/ }).fill('2026-04-10');
    await panel.getByRole('textbox', { name: 'Parties visitées' }).fill('Halle principale, mezzanine');

    await expect(panel.getByRole('textbox', { name: /Date de dernière visite/ })).toHaveValue('2026-04-10');
    await expect(panel.getByRole('textbox', { name: 'Parties visitées' }))
      .toHaveValue('Halle principale, mezzanine');
  });
});

test.describe('PEMD toggle persistence', () => {
  test('toggle choices survive a reload even though the section re-collapses', async ({ page }) => {
    const panel = generalPanel(page);

    await panel.getByText('Diagnostiqueur PEMD', { exact: true }).click();
    await panel.getByRole('group', { name: /Compétences justifiables/ }).getByRole('button', { name: 'Oui' }).click();

    await panel.getByText('Visite PEMD', { exact: true }).click();
    await panel.getByRole('group', { name: /Vices ou désordres/ }).getByRole('button', { name: 'Non' }).click();

    await page.reload();

    // Sections collapse again on reload; re-open and confirm the stored state.
    const reloaded = generalPanel(page);
    await reloaded.getByText('Diagnostiqueur PEMD', { exact: true }).click();
    await reloaded.getByText('Visite PEMD', { exact: true }).click();

    await expect(reloaded.getByRole('group', { name: /Compétences justifiables/ })
      .getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'true');
    await expect(reloaded.getByRole('group', { name: /Vices ou désordres/ })
      .getByRole('button', { name: 'Non' })).toHaveAttribute('aria-pressed', 'true');
  });
});
