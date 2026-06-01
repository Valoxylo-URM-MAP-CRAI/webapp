// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Feature under test: the "Général" tab of the VALOBOIS evaluation editor.
 *
 * These tests drive the UI through the *accessibility tree* (roles, accessible
 * names, pressed/selected states, live regions) rather than CSS selectors or
 * element ids. That keeps them aligned with what assistive technology exposes
 * and resilient to styling / markup churn.
 */

/** @param {import('@playwright/test').Page} page */
const generalPanel = (page) => page.getByRole('tabpanel', { name: 'Général' });

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  // The editor boots on the "Général" tab; wait for it to be the active panel.
  await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute('aria-selected', 'true');
});

test.describe('Général tab — tablist semantics', () => {
  test('is selected by default and exposes its panel', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute('aria-selected', 'true');
    await expect(generalPanel(page)).toBeVisible();

    // The six editor sections are advertised as tabs.
    const tablist = page.getByRole('tablist', { name: /Sections de l.évaluation/ });
    for (const name of ['Général', 'Lots', 'Notation', 'Analyse', 'Synthèse', 'Matrice']) {
      await expect(tablist.getByRole('tab', { name })).toBeVisible();
    }
  });

  test('selecting another tab moves selection and hides the Général panel', async ({ page }) => {
    await page.getByRole('tab', { name: 'Lots' }).click();

    await expect(page.getByRole('tab', { name: 'Lots' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute('aria-selected', 'false');
    // A hidden tabpanel is removed from the accessibility tree entirely.
    await expect(generalPanel(page)).toHaveCount(0);
  });

  test('supports roving arrow-key navigation across tabs', async ({ page }) => {
    await page.getByRole('tab', { name: 'Général' }).focus();
    await page.keyboard.press('ArrowRight');

    const lots = page.getByRole('tab', { name: 'Lots' });
    await expect(lots).toBeFocused();
    await expect(lots).toHaveAttribute('aria-selected', 'true');

    // Wrap-around: Home jumps back to the first tab.
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: 'Général' })).toBeFocused();
  });
});

test.describe('Référence de l’opération', () => {
  test('derives the read-only "Référence gisement" from operation name + date', async ({ page }) => {
    const panel = generalPanel(page);
    const ref = panel.getByRole('textbox', { name: 'Référence gisement' });

    // Computed identifier should never be hand-editable.
    await expect(ref).not.toBeEditable();
    await expect(ref).toHaveValue('OPERATION_SANSDATE');

    await panel.getByRole('textbox', { name: 'Opération', exact: true }).fill('Réhabilitation Été 2026');
    await panel.getByRole('textbox', { name: 'Date du diagnostic' }).fill('2026-03-15');

    // Accents stripped, spaces collapsed to "_", upper-cased, date de-hyphenated.
    await expect(ref).toHaveValue('REHABILITATION_ETE_2026_20260315');
  });

  test('"Type d’opération" behaves as a single-select toggle group via aria-pressed', async ({ page }) => {
    const group = generalPanel(page).getByRole('group', { name: /Type d.opération/ });

    const demolition = group.getByRole('button', { name: 'Démolition' });
    const renovation = group.getByRole('button', { name: 'Rénovation significative' });

    await expect(demolition).toHaveAttribute('aria-pressed', 'false');

    await demolition.click();
    await expect(demolition).toHaveAttribute('aria-pressed', 'true');

    await renovation.click();
    await expect(renovation).toHaveAttribute('aria-pressed', 'true');
    await expect(demolition).toHaveAttribute('aria-pressed', 'false');
  });

  test('"Statut de l’étude" slider announces guidance through a live region', async ({ page }) => {
    const panel = generalPanel(page);
    const slider = panel.getByRole('slider', { name: 'Statut de l’étude' });
    const help = panel.getByRole('status');

    await expect(slider).toHaveValue('0');
    await expect(help).toContainText('Ce statut est recommandé pour initier');

    // Two steps right → index 2 ("Finalisé").
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await expect(slider).toHaveValue('2');
    await expect(help).toContainText('Ce statut est recommandé pour affiner');
  });
});

test.describe('Toggle groups are independently addressable', () => {
  test('each Oui/Non/Inconnu set has its own accessible name and selection', async ({ page }) => {
    const panel = generalPanel(page);
    const renovation = panel.getByRole('group', { name: 'Rénovation importante' });
    const decontamination = panel.getByRole('group', { name: /Décontamination/ });

    // Past-operation history defaults to "Inconnu" in every group.
    await expect(renovation.getByRole('button', { name: 'Inconnu' })).toHaveAttribute('aria-pressed', 'true');
    await expect(decontamination.getByRole('button', { name: 'Inconnu' })).toHaveAttribute('aria-pressed', 'true');

    // Toggling one group must not bleed into a sibling group.
    await renovation.getByRole('button', { name: 'Oui' }).click();
    await expect(renovation.getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'true');
    await expect(renovation.getByRole('button', { name: 'Inconnu' })).toHaveAttribute('aria-pressed', 'false');
    await expect(decontamination.getByRole('button', { name: 'Inconnu' })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Contacts de l’opération', () => {
  test('repeated contact fields are disambiguated by their group name', async ({ page }) => {
    const panel = generalPanel(page);
    const moa = panel.getByRole('group', { name: /Maîtrise d.ouvrage/ });
    const moe = panel.getByRole('group', { name: /Maîtrise d.œuvre/ });

    // The "Structure / Nom" label is reused across blocks; the group scope keeps
    // each one uniquely targetable.
    await moa.getByRole('textbox', { name: /Structure/ }).fill('Bordeaux Métropole');
    await moe.getByRole('textbox', { name: /Structure/ }).fill('Cabinet Archi+');

    await expect(moa.getByRole('textbox', { name: /Structure/ })).toHaveValue('Bordeaux Métropole');
    await expect(moe.getByRole('textbox', { name: /Structure/ })).toHaveValue('Cabinet Archi+');
  });
});

test.describe('Collapsible sections', () => {
  test('a collapsed section reveals its fields once expanded', async ({ page }) => {
    const panel = generalPanel(page);
    const siret = panel.getByRole('textbox', { name: /SIRET/ });

    // "Diagnostiqueur PEMD" starts collapsed → its SIRET field is hidden.
    await expect(siret).toBeHidden();

    await panel.getByText('Diagnostiqueur PEMD', { exact: true }).click();

    await expect(siret).toBeVisible();
    await expect(panel.getByRole('group', { name: 'Diagnostiqueur PEMD' })
      .getByRole('textbox', { name: /SIRET/ })).toBeEditable();
  });
});

test.describe('Contexte technique et géographique', () => {
  test('canton selection unlocks only after a département is chosen', async ({ page }) => {
    const panel = generalPanel(page);
    const departement = panel.getByRole('combobox', { name: 'Département' });
    const canton = panel.getByRole('combobox', { name: 'Canton' });

    await expect(canton).toBeDisabled();

    await departement.selectOption({ label: 'Gironde' });
    await expect(canton).toBeEnabled();
  });
});
