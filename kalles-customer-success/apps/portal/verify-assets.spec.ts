import { test, expect } from '@playwright/test';

test('Verify Physical Assets tab and creation', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const masterDataNav = page.locator('button', { hasText: 'Master Data' });
  await masterDataNav.click();

  await expect(page.locator('h2', { hasText: 'Master Data & EAM Registry' })).toBeVisible();

  const assetsTab = page.locator('button', { hasText: 'Physical Assets' });
  await assetsTab.click();

  await expect(page.locator('h3', { hasText: 'Active Fleet & Equipment' })).toBeVisible();

  const newEntryBtn = page.locator('button', { hasText: 'New Entry' }).first();
  await newEntryBtn.click();

  const drawerHeader = page.locator('.drawer-header h3');
  await expect(drawerHeader).toContainText('Create New Physical Asset');

  const serialInput = page.locator('input[placeholder="e.g. REG-123 or SN-999"]');
  await serialInput.fill('TEST-123');
  await expect(serialInput).toHaveValue('TEST-123');

  console.log("SUCCESS: Physical Assets UI is responsive and form opens.");
});
