import { test, expect } from '@playwright/test';

test('Verify UI does not freeze when opening Vehicle Model drawer', async ({ page }) => {
  // Navigate to the local portal
  await page.goto('http://localhost:5173');

  const masterDataNav = page.locator('button', { hasText: 'Master Data' });
  await masterDataNav.click();

  // Wait for the Master Data / Registry dashboard to load
  await expect(page.locator('h2', { hasText: 'Master Data & EAM Registry' })).toBeVisible();

  // Click the 'Vehicle Blueprints' tab
  const vehicleModelsTab = page.locator('button', { hasText: 'Vehicle Blueprints' });
  await vehicleModelsTab.click();

  // Ensure the table/header changes context
  await expect(page.locator('h3', { hasText: 'Vehicle Blueprints' })).toBeVisible();

  // Wait for the table to populate with at least one row, or timeout if empty.
  const firstRow = page.locator('.kalles-table tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout: 10000 });

  // Wait explicitly before clicking to avoid test runner race conditions
  await page.waitForTimeout(1000);

  // Click the first row (the Volvo)
  await firstRow.click();

  // Wait explicitly to see if it freezes before trying to find the header
  await page.waitForTimeout(1000);

  // Verify the drawer opens and the UI is responsive
  const drawerHeader = page.locator('.drawer-header h3');
  await expect(drawerHeader).toBeVisible();

  // Check the title explicitly
  const headerText = await drawerHeader.textContent();
  console.log("Drawer Header Text:", headerText);

  // Verify we can interact with a form element, proving it's not frozen
  const manufacturerInput = page.locator('input[placeholder="e.g. Volvo"]');
  await manufacturerInput.waitFor({ state: 'visible' });
  await manufacturerInput.fill('Test Manufacturer');
  await expect(manufacturerInput).toHaveValue('Test Manufacturer');

  console.log("SUCCESS: UI remained responsive after clicking a row in Vehicle Blueprints.");
});
