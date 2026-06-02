// @ts-check
const path = require('node:path');
const { test, expect } = require('@playwright/test');

/**
 * Required scenario: import an evaluation fixture and assert the "Général" tab
 * renders every metadata field correctly.
 *
 * The fixture is a real export payload (schemaVersion + meta + ui + one lot),
 * captured from the running app, so it exercises the genuine import pipeline
 * (`applyEvaluationPayload` → `renderAccueilMeta`).
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'evaluation-general.json');

/** @param {import('@playwright/test').Page} page */
const generalPanel = (page) => page.getByRole('tabpanel', { name: 'Général' });

/**
 * Click the named "Importer" button and feed it the fixture through the OS file
 * chooser the hidden <input type="file"> triggers.
 * @param {import('@playwright/test').Page} page
 */
async function importFixture(page) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importer' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(FIXTURE);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('tab', { name: 'Général' })).toHaveAttribute('aria-selected', 'true');
  await importFixture(page);
});

test.describe('Importing an evaluation fixture', () => {
  test('populates the operation reference block', async ({ page }) => {
    const panel = generalPanel(page);

    await expect(panel.getByRole('textbox', { name: 'Opération', exact: true }))
      .toHaveValue('Réhabilitation Halle Boca');
    // Derived, read-only deposit reference (operation slug + date).
    await expect(panel.getByRole('textbox', { name: 'Référence gisement' }))
      .toHaveValue('REHABILITATION_HALLE_BOCA_20260315');
    await expect(panel.getByRole('textbox', { name: 'Date du diagnostic' })).toHaveValue('2026-03-15');
    await expect(panel.getByRole('textbox', { name: /Version de l.évaluation/ })).toHaveValue('V2');

    // statutEtude "Finalisé" maps to slider index 2 and its guidance text.
    await expect(panel.getByRole('slider', { name: 'Statut de l’étude' })).toHaveValue('2');
    await expect(panel.getByRole('status')).toContainText('Ce statut est recommandé pour affiner');
  });

  test('reflects the operation type and CERFA quantities', async ({ page }) => {
    const panel = generalPanel(page);

    const typeOp = panel.getByRole('group', { name: /Type d.opération/ });
    await expect(typeOp.getByRole('button', { name: 'Démolition' })).toHaveAttribute('aria-pressed', 'true');
    await expect(typeOp.getByRole('button', { name: 'Rénovation significative' }))
      .toHaveAttribute('aria-pressed', 'false');

    await expect(panel.getByRole('spinbutton', { name: /Surface à démolir/ })).toHaveValue('1200');
    await expect(panel.getByRole('spinbutton', { name: /Nb bâtiments \(démolition\)/ })).toHaveValue('2');
    await expect(panel.getByRole('textbox', { name: /début chantier/ })).toHaveValue('2026-09-01');
    await expect(panel.getByRole('textbox', { name: /fin chantier/ })).toHaveValue('2027-03-31');
  });

  test('populates the diagnostician block', async ({ page }) => {
    const diag = generalPanel(page).getByRole('group', { name: 'Diagnostiqueur', exact: true });

    await expect(diag.getByRole('textbox', { name: /Structure/ })).toHaveValue('Atelier Bois & Réemploi');
    await expect(diag.getByRole('textbox', { name: 'Contact', exact: true })).toHaveValue('Camille Durand');
    await expect(diag.getByRole('textbox', { name: 'Mail', exact: true })).toHaveValue('camille@atelier-bois.fr');
    await expect(diag.getByRole('textbox', { name: 'Téléphone', exact: true })).toHaveValue('06 12 34 56 78');
    await expect(diag.getByRole('textbox', { name: 'Adresse', exact: true }))
      .toHaveValue('5 quai des Chartrons, 33000 Bordeaux');
  });

  test('restores the building-history toggle states', async ({ page }) => {
    const panel = generalPanel(page);

    await expect(panel.getByRole('group', { name: 'Rénovation importante' })
      .getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByRole('group', { name: /Décontamination/ })
      .getByRole('button', { name: 'Non' })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByRole('group', { name: /Autre intervention/ })
      .getByRole('button', { name: 'Inconnu' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('restores the document availability toggles', async ({ page }) => {
    const panel = generalPanel(page);

    await expect(panel.getByRole('group', { name: 'Diagnostic structure' })
      .getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByRole('group', { name: 'Diagnostic plomb' })
      .getByRole('button', { name: 'Non' })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByRole('group', { name: 'Plans disponibles' })
      .getByRole('button', { name: 'Oui' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('populates the operation contacts in their respective groups', async ({ page }) => {
    const panel = generalPanel(page);

    await expect(panel.getByRole('group', { name: /Maîtrise d.ouvrage/ })
      .getByRole('textbox', { name: /Structure/ })).toHaveValue('Bordeaux Métropole');
    await expect(panel.getByRole('group', { name: /Maîtrise d.œuvre/ })
      .getByRole('textbox', { name: /Structure/ })).toHaveValue('Cabinet Archi+');
    await expect(panel.getByRole('group', { name: /Entreprise de déconstruction/ })
      .getByRole('textbox', { name: /Structure/ })).toHaveValue('Démolitions Atlantique');
  });

  test('populates the technical context and free-form notes', async ({ page }) => {
    const panel = generalPanel(page);

    await expect(panel.getByRole('combobox', { name: /Type de bâtiment/ })).toHaveValue('Halle industrielle');
    await expect(panel.getByRole('textbox', { name: /Année . période/ })).toHaveValue('1920');
    await expect(panel.getByRole('textbox', { name: /Adresse de l.opération/ }))
      .toHaveValue('Quai de Paludate, 33800 Bordeaux');
    await expect(panel.getByRole('textbox', { name: 'Commentaires' }))
      .toHaveValue('Charpente en pin maritime, bon état général, réemploi structurel envisagé.');
  });
});
