# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> World Engine IDE loads correctly without console errors and supports renaming
- Location: tests/smoke.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.tree-item').filter({ hasText: 'The Genesis' }).first().locator('input.tree-edit-input')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.tree-item').filter({ hasText: 'The Genesis' }).first().locator('input.tree-edit-input')

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
        - generic [ref=e13]:
          - generic [ref=e15] [cursor=pointer]:
            - generic [ref=e16]: ▼
            - generic [ref=e17]: 📁 Scenarios
          - generic [ref=e20] [cursor=pointer]:
            - text: 📄
            - textbox [active] [ref=e21]: The Genesis
        - generic [ref=e22]:
          - generic [ref=e23] [cursor=pointer]:
            - generic [ref=e24]:
              - generic [ref=e25]: ▼
              - generic [ref=e26]: 📁 Data Assets
            - generic [ref=e27]: ⋮
          - generic [ref=e28]:
            - generic [ref=e30] [cursor=pointer]:
              - text: 📦
              - generic [ref=e31]: "NeTEx: Trafiklab Latest"
            - generic [ref=e33] [cursor=pointer]:
              - text: 📊
              - generic [ref=e34]: "Synthetic: High-Freq 676"
    - main [ref=e35]:
      - generic [ref=e36]:
        - 'heading "Scenario: The Genesis" [level=3] [ref=e37]'
        - paragraph [ref=e38]: Initial setup with Garages, Blocks, and qualified roster.
        - generic [ref=e39]:
          - heading "Resource Bindings" [level=5] [ref=e40]
          - generic [ref=e41]: "Timetable Baseline:"
          - combobox [ref=e42]:
            - option "-- None --" [selected]
            - 'option "NeTEx: Trafiklab Latest"'
            - 'option "Synthetic: High-Freq 676"'
          - heading "Execution" [level=5] [ref=e43]
          - paragraph [ref=e44]: Clicking "Run" will purge all systems, seed initial state, and inject the bound Data Asset into the Traffic Domain.
          - button "▶ Run Scenario" [ref=e45] [cursor=pointer]
    - iframe [ref=e47]:
      - generic [ref=f1e3]:
        - combobox [ref=f1e5]:
          - option "CEO / Executive View" [selected]
          - option "Driver View"
        - generic [ref=f1e6]:
          - banner [ref=f1e7]:
            - heading "Executive Dashboard (Management by Exception)" [level=2] [ref=f1e8]
          - generic [ref=f1e9]:
            - generic [ref=f1e10]:
              - heading "💰 Economy" [level=3] [ref=f1e12]
              - generic [ref=f1e14]:
                - paragraph [ref=f1e15]:
                  - strong [ref=f1e16]: "Bank Balance:"
                  - text: 0 SEK
                - paragraph [ref=f1e17]:
                  - strong [ref=f1e18]: "Overdue Invoices:"
                  - text: "0"
            - generic [ref=f1e19] [cursor=pointer]:
              - heading "🚌 Traffic Planning" [level=3] [ref=f1e21]
              - generic [ref=f1e23]:
                - paragraph [ref=f1e24]:
                  - strong [ref=f1e25]: "Total Blocks:"
                  - text: "23"
                - paragraph [ref=f1e26]:
                  - strong [ref=f1e27]: "Unassigned Blocks (Deficit):"
                  - text: "21"
              - generic [ref=f1e28]: Click to Drill Down 🔽
            - generic [ref=f1e29]:
              - heading "🔧 Depot & MRO" [level=3] [ref=f1e31]
              - generic [ref=f1e33]:
                - paragraph [ref=f1e34]:
                  - strong [ref=f1e35]: "Operational Fleet:"
                  - text: 0 / 0
                - paragraph [ref=f1e36]:
                  - strong [ref=f1e37]: "Availability:"
                  - text: 100%
                - paragraph [ref=f1e38]:
                  - strong [ref=f1e39]: "Grounded:"
                  - text: "0"
  - contentinfo [ref=e48]:
    - generic [ref=e49]: Event Horizon
    - generic [ref=e51]: Waiting for events...
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('World Engine IDE loads correctly without console errors and supports renaming', async ({ page }) => {
  4  |   const consoleErrors: string[] = [];
  5  |   
  6  |   // Catch console errors (e.g., CORS, React crashes, Network Failures)
  7  |   page.on('console', msg => {
  8  |     if (msg.type() === 'error') {
  9  |       consoleErrors.push(msg.text());
  10 |     }
  11 |   });
  12 | 
  13 |   page.on('pageerror', exception => {
  14 |     consoleErrors.push(`Uncaught exception: ${exception.message}`);
  15 |   });
  16 | 
  17 |   // Navigate to the dashboard
  18 |   await page.goto('/');
  19 | 
  20 |   // 1. Verify the Mission Control Top Bar exists
  21 |   await expect(page.locator('h2', { hasText: 'World Engine IDE v2.0' })).toBeVisible();
  22 | 
  23 |   // 2. Verify all four layout zones are correctly rendered (No Framebust)
  24 |   await expect(page.locator('.ide-library')).toBeVisible();
  25 |   await expect(page.locator('.ide-workbench')).toBeVisible();
  26 |   await expect(page.locator('.ide-preview')).toBeVisible();
  27 |   await expect(page.locator('.ide-bottom-panel')).toBeVisible();
  28 | 
  29 |   // 3. Verify the TreeView has loaded data from the Database
  30 |   await expect(page.locator('.tree-item.tree-folder', { hasText: 'Scenarios' })).toBeVisible();
  31 | 
  32 |   // Wait for the scenario from DB to appear
  33 |   const genesisItem = page.locator('.tree-item', { hasText: 'The Genesis' }).first();
  34 |   await expect(genesisItem).toBeVisible({ timeout: 5000 });
  35 | 
  36 |   // 4. Test the Context Menu (Hover and click)
  37 |   await genesisItem.hover();
  38 |   const contextTrigger = genesisItem.locator('.context-menu-trigger');
  39 |   await expect(contextTrigger).toBeVisible();
  40 |   await contextTrigger.click();
  41 | 
  42 |   const renameBtn = page.locator('.context-menu-item', { hasText: 'Rename' });
  43 |   await expect(renameBtn).toBeVisible();
  44 | 
  45 |   // 5. Click rename and verify input appears
  46 |   await renameBtn.click();
  47 |   const renameInput = genesisItem.locator('input.tree-edit-input');
> 48 |   await expect(renameInput).toBeVisible();
     |                             ^ Error: expect(locator).toBeVisible() failed
  49 |   await expect(renameInput).toHaveValue('The Genesis');
  50 | 
  51 |   // Give the API a moment to fetch and trigger potential CORS errors
  52 |   await page.waitForTimeout(2000);
  53 | 
  54 |   // 6. Fail the test if ANY console errors occurred
  55 |   expect(consoleErrors).toEqual([]);
  56 | });
  57 | 
```