# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> IDE allows creating, renaming, and deleting folders
- Location: tests/smoke.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input.tree-edit-input')
Expected: visible
Timeout: 1000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 1000ms
  - waiting for locator('input.tree-edit-input')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - heading "World Engine IDE v2.0" [level=2] [ref=e6]
    - button "☢️ Hard Reset" [ref=e8] [cursor=pointer]
  - generic [ref=e9]:
    - complementary [ref=e10]:
      - generic [ref=e11]: Library
      - generic [ref=e12]:
        - generic [ref=e14] [cursor=pointer]:
          - generic [ref=e15]:
            - generic [ref=e16]: ▼
            - generic [ref=e17]: 📁
            - generic [ref=e18]: Scenarios
          - generic [ref=e19]: ⋮
        - generic [ref=e21] [cursor=pointer]:
          - generic [ref=e22]:
            - generic [ref=e23]: ▼
            - generic [ref=e24]: 📁
            - generic [ref=e25]: Data Assets
          - generic [ref=e26]: ⋮
    - main [ref=e27]
    - iframe [ref=e29]:
      - generic [ref=f1e3]:
        - combobox [ref=f1e5]:
          - option "CEO / Executive View" [selected]
          - option "Driver View"
        - generic [ref=f1e6]: Loading Executive Dashboard...
  - contentinfo [ref=e30]:
    - generic [ref=e31]: Event Horizon
    - generic [ref=e33]: Waiting for events...
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('IDE allows creating, renaming, and deleting folders', async ({ page }) => {
  4  |   const consoleErrors: string[] = [];
  5  |   page.on('console', msg => msg.type() === 'error' && consoleErrors.push(msg.text()));
  6  | 
  7  |   await page.goto('/');
  8  | 
  9  |   // 1. Verify Root folders exist
  10 |   const rootScenarios = page.locator('.tree-item.tree-folder', { hasText: 'Scenarios' }).first();
  11 |   await expect(rootScenarios).toBeVisible();
  12 | 
  13 |   // 2. Open Context Menu on Root Folder to Create Sub-folder
  14 |   await rootScenarios.hover();
  15 |   await rootScenarios.locator('.context-menu-trigger').click();
  16 | 
  17 |   const newFolderBtn = page.locator('.context-menu-item', { hasText: 'New Folder' });
  18 |   await expect(newFolderBtn).toBeVisible();
  19 |   await newFolderBtn.click();
  20 | 
  21 |   // 3. Verify Temporary Folder appeared in Edit Mode
  22 |   const renameInput = page.locator('input.tree-edit-input');
> 23 |   await expect(renameInput).toBeVisible({ timeout: 1000 });
     |                             ^ Error: expect(locator).toBeVisible() failed
  24 | 
  25 |   // 4. Fill in the new name and press enter
  26 |   await renameInput.fill('Playwright Test Folder');
  27 |   await renameInput.press('Enter');
  28 | 
  29 |   // Wait for the API to save and the tree to refresh
  30 |   await page.waitForTimeout(1000);
  31 | 
  32 |   const renamedFolder = page.locator('.tree-item.tree-folder', { hasText: 'Playwright Test Folder' }).first();
  33 |   await expect(renamedFolder).toBeVisible();
  34 | 
  35 |   // 5. Delete the folder
  36 |   page.once('dialog', dialog => dialog.accept());
  37 | 
  38 |   await renamedFolder.hover();
  39 |   await renamedFolder.locator('.context-menu-trigger').click();
  40 |   await page.locator('.context-menu-item', { hasText: 'Delete' }).click();
  41 | 
  42 |   await page.waitForTimeout(1000);
  43 | 
  44 |   // 6. Verify folder is gone
  45 |   await expect(page.locator('.tree-item.tree-folder', { hasText: 'Playwright Test Folder' })).toHaveCount(0);
  46 |   expect(consoleErrors).toEqual([]);
  47 | });
  48 | 
```