import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const edgeFunctionPaths = [
  "supabase/functions/pme-catalog-save-budget-item/index.ts",
  "supabase/functions/pme-catalog-add-item-to-budget/index.ts",
  "supabase/functions/pme-catalog-add-kit-to-budget/index.ts"
];

test("PME catalog Edge Functions authenticate with getUser and do not trust organizationId in body", async () => {
  for (const path of edgeFunctionPaths) {
    const source = await readFile(path, "utf8");

    assert.match(source, /auth\.getUser\(\)/, path);
    assert.match(source, /has_organization_role/, path);
    assert.doesNotMatch(source, /service_role/i, path);
    assert.doesNotMatch(source, /interface RequestBody\s*{[^}]*organizationId/s, path);
    assert.doesNotMatch(source, /body\.organizationId/, path);
  }
});

test("PME catalog Edge Functions validate organization ownership before writes", async () => {
  const saveBudgetItem = await readFile(edgeFunctionPaths[0], "utf8");
  const addItem = await readFile(edgeFunctionPaths[1], "utf8");
  const addKit = await readFile(edgeFunctionPaths[2], "utf8");

  assert.match(saveBudgetItem, /sourceReferenceId: item\.id/);
  assert.match(saveBudgetItem, /\.from\("pme_budget_items"\)/);
  assert.match(saveBudgetItem, /\.from\("pme_catalog_items"\)/);
  assert.match(saveBudgetItem, /\.from\("audit_logs"\)/);

  assert.match(addItem, /budget\.organization_id !== item\.organization_id/);
  assert.match(addItem, /addCatalogItemToBudget/);
  assert.match(addItem, /\.from\("pme_budget_items"\)/);
  assert.match(addItem, /\.from\("audit_logs"\)/);

  assert.match(addKit, /budget\.organization_id !== kit\.organization_id/);
  assert.match(addKit, /addCatalogKitToBudget/);
  assert.match(addKit, /\.from\("pme_budget_items"\)/);
  assert.match(addKit, /\.from\("pme_budgets"\)/);
  assert.match(addKit, /\.from\("audit_logs"\)/);
});
