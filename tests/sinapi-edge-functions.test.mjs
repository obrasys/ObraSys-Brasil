import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const addCompositionPath = "supabase/functions/pme-sinapi-add-composition-to-budget/index.ts";

test("SINAPI add composition Edge Function authenticates and ignores organization body auth", async () => {
  const source = await readFile(addCompositionPath, "utf8");
  const bodyInterfaceMatch = source.match(/interface RequestBody \{[\s\S]*?\n\}/);

  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.ok(bodyInterfaceMatch);
  assert.doesNotMatch(bodyInterfaceMatch[0], /organization/i);
  assert.doesNotMatch(bodyInterfaceMatch[0], /tenant/i);
  assert.doesNotMatch(bodyInterfaceMatch[0], /userId/i);
  assert.match(source, /has_organization_role/);
  assert.doesNotMatch(source, /service_role/i);
});

test("SINAPI add composition Edge Function creates item snapshot recalculates and audits", async () => {
  const source = await readFile(addCompositionPath, "utf8");

  assert.match(source, /from\("pme_budget_items"\)/);
  assert.match(source, /from\("pme_budget_sinapi_snapshots"\)/);
  assert.match(source, /addSinapiCompositionToPmeBudget/);
  assert.match(source, /calculatePmeBudget/);
  assert.match(source, /from\("audit_logs"\)/);
  assert.match(source, /pme_sinapi\.composition_added_to_budget/);
});
