// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Further behaviours of the "Général" tab, driven through the accessibility tree:
 *   - local persistence (evaluation + active tab survive a reload),
 *   - the France geo cascade (département → canton → derived climate/pest data),
 *   - per-section completeness alerts (exposed via aria-disabled + dialog),
 *   - the destructive "Réinitialiser" confirmation flow.
 */

/** @param {import('@playwright/test').Page} page */
const generalPanel = (page) => page.getByRole('tabpanel', { name: 'Général' });

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute('aria-selected', 'true');
});

test.describe('Local persistence', () => {
  test('edits to General fields survive a page reload', async ({ page }) => {
    const panel = generalPanel(page);
    await panel.getByRole('textbox', { name: 'Opération', exact: true }).fill('Chantier Persistant');
    await panel.getByRole('textbox', { name: /Version de l.évaluation/ }).fill('V7');

    await page.reload();

    const reloaded = generalPanel(page);
    await expect(reloaded.getByRole('textbox', { name: 'Opération', exact: true })).toHaveValue('Chantier Persistant');
    await expect(reloaded.getByRole('textbox', { name: /Version de l.évaluation/ })).toHaveValue('V7');
    // Derived reference is recomputed from the restored data.
    await expect(reloaded.getByRole('textbox', { name: 'Référence gisement' }))
      .toHaveValue('CHANTIER_PERSISTANT_SANSDATE');
  });

  test('the active editor tab is remembered across reloads', async ({ page }) => {
    await page.getByRole('tab', { name: 'Notation' }).click();
    await expect(page.getByRole('tab', { name: 'Notation' })).toHaveAttribute('aria-selected', 'true');

    await page.reload();

    await expect(page.getByRole('tab', { name: 'Notation' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute('aria-selected', 'false');
  });
});

test.describe('Localisation géographique (France) cascade', () => {
  test('choosing a département enables the canton list and fills the termites vigilance', async ({ page }) => {
    const panel = generalPanel(page);
    const canton = panel.getByRole('combobox', { name: 'Canton' });
    const termites = panel.getByRole('textbox', { name: /Vigilance termites/ });

    await expect(canton).toBeDisabled();
    await expect(termites).toHaveValue('');

    await panel.getByRole('combobox', { name: 'Département' }).selectOption({ label: 'Gironde' });

    await expect(canton).toBeEnabled();
    await expect(termites).not.toHaveValue('');
  });

  test('choosing a canton derives the humidification class and mérules vigilance', async ({ page }) => {
    const panel = generalPanel(page);
    await panel.getByRole('combobox', { name: 'Département' }).selectOption({ label: 'Gironde' });
    await panel.getByRole('combobox', { name: 'Canton' }).selectOption({ label: 'Bordeaux-1' });

    await expect(panel.getByRole('textbox', { name: /Condition climatique/ })).toHaveValue('Modérée');
    await expect(panel.getByRole('textbox', { name: /Vigilance mérules/ })).not.toHaveValue('');
  });

  test('resetting the geo selection clears the derived fields', async ({ page }) => {
    const panel = generalPanel(page);
    await panel.getByRole('combobox', { name: 'Département' }).selectOption({ label: 'Gironde' });
    await panel.getByRole('combobox', { name: 'Canton' }).selectOption({ label: 'Bordeaux-1' });

    await panel.getByRole('button', { name: 'Réinitialiser la sélection' }).click();

    await expect(panel.getByRole('combobox', { name: 'Canton' })).toBeDisabled();
    await expect(panel.getByRole('textbox', { name: /Condition climatique/ })).toHaveValue('');
  });
});

test.describe('Section completeness alerts', () => {
  test('an incomplete section flags an active missing-fields alert', async ({ page }) => {
    // Nothing is filled yet → the Diagnostiqueur section advertises missing fields.
    await expect(generalPanel(page).getByRole('button', { name: /Champs manquants.*Diagnostiqueur$/ }))
      .toHaveAttribute('aria-disabled', 'false');
  });

  test('completing every field in a section resolves its alert', async ({ page }) => {
    const diag = generalPanel(page).getByRole('group', { name: 'Diagnostiqueur', exact: true });
    await diag.getByRole('textbox', { name: /Structure/ }).fill('Atelier Bois');
    await diag.getByRole('textbox', { name: 'Contact', exact: true }).fill('Camille Durand');
    await diag.getByRole('textbox', { name: 'Mail', exact: true }).fill('c@atelier.fr');
    await diag.getByRole('textbox', { name: 'Téléphone', exact: true }).fill('0600000000');
    await diag.getByRole('textbox', { name: 'Adresse', exact: true }).fill('Bordeaux');

    await expect(generalPanel(page).getByRole('button', { name: /Champs manquants.*Diagnostiqueur$/ }))
      .toHaveAttribute('aria-disabled', 'true');
  });

  test('activating an alert opens the missing-fields dialog', async ({ page }) => {
    await generalPanel(page).getByRole('button', { name: /Champs manquants.*Référence de l.opération/ }).click();

    const dialog = page.getByRole('dialog', { name: 'Alerte' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/référencement de l.opération/);

    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe('Réinitialiser (reset all)', () => {
  test('confirming the reset clears the evaluation', async ({ page }) => {
    const panel = generalPanel(page);
    await panel.getByRole('textbox', { name: 'Opération', exact: true }).fill('À effacer');

    await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Réinitialiser' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Oui, réinitialiser' }).click();

    await expect(generalPanel(page).getByRole('textbox', { name: 'Opération', exact: true })).toHaveValue('');
  });

  test('cancelling the reset keeps the data intact', async ({ page }) => {
    const panel = generalPanel(page);
    await panel.getByRole('textbox', { name: 'Opération', exact: true }).fill('À conserver');

    await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
    await page.getByRole('dialog', { name: 'Réinitialiser' }).getByRole('button', { name: 'Annuler' }).click();

    await expect(generalPanel(page).getByRole('textbox', { name: 'Opération', exact: true }))
      .toHaveValue('À conserver');
  });
});
