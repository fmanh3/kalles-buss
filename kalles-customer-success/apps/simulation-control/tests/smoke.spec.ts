import { test, expect } from '@playwright/test';

test('IDE allows creating, renaming, and deleting folders via Arborist', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => msg.type() === 'error' && consoleErrors.push(msg.text()));

  await page.goto('/');

  // 1. Verify Root folders exist
  const rootScenarios = page.locator('.tree-item', { hasText: 'Scenarios' }).first();
  await expect(rootScenarios).toBeVisible();

  // 2. Open Context Menu on Root Folder to Create Sub-folder
  // In Arborist, hovering shows the +📁 icon
  await rootScenarios.hover();
  const createBtn = rootScenarios.locator('span[title="New Folder"]');
  await expect(createBtn).toBeVisible();
  await createBtn.click();

  // 3. Verify Temporary Folder appeared in Edit Mode (Arborist handles this directly)
  const renameInput = page.locator('input.tree-edit-input');
  await expect(renameInput).toBeVisible({ timeout: 2000 });
  
  // 4. Fill in the new name and press enter
  await renameInput.fill('Playwright Arborist Folder');
  await renameInput.press('Enter');

  // Wait for the API to save and the tree to refresh
  await page.waitForTimeout(1000);
  
  const renamedFolder = page.locator('.tree-item', { hasText: 'Playwright Arborist Folder' }).first();
  await expect(renamedFolder).toBeVisible();

  // 5. Delete the folder using the Delete icon (🗑)
  page.once('dialog', dialog => dialog.accept());

  await renamedFolder.hover();
  const deleteBtn = renamedFolder.locator('span[title="Delete (Del)"]');
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  await page.waitForTimeout(1000);

  // 6. Verify folder is gone
  await expect(page.locator('.tree-item', { hasText: 'Playwright Arborist Folder' })).toHaveCount(0);
  
  // Exclude Arborist's benign ResizeObserver warnings if any
  const realErrors = consoleErrors.filter(e => !e.includes('ResizeObserver'));
  expect(realErrors).toEqual([]);
});
