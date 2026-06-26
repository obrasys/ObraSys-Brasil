import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  assertPmeBudgetCanConvert,
  buildPmeBudgetConversionPlan,
  buildProjectInsertFromBudget
} from "../packages/domain/src/pme/convertToProject.ts";

const edgeFunctionPath = "supabase/functions/pme-budget-convert-to-project/index.ts";
const docsPath = "docs/database.md";

const approvedBudget = {
  id: "budget-1",
  organizationId: "org-1",
  budgetNumber: "PME-0001",
  title: "Reforma aprovada",
  description: null,
  status: "approved",
  subtotalCost: "1000.00",
  overheadPercentage: "10",
  taxPercentage: "5",
  profitPercentage: "20",
  discountAmount: "0.00",
  finalPrice: "1350.00",
  approvedAt: "2026-06-26T10:00:00.000Z",
  convertedProjectId: null
};

test("PME conversion service rejects non-approved or already converted budgets", () => {
  assert.doesNotThrow(() => assertPmeBudgetCanConvert(approvedBudget));
  assert.throws(
    () =>
      assertPmeBudgetCanConvert({
        ...approvedBudget,
        status: "cancelled"
      }),
    /Only approved budgets/
  );
  assert.throws(
    () =>
      assertPmeBudgetCanConvert({
        ...approvedBudget,
        status: "converted_to_project",
        convertedProjectId: "project-1"
      }),
    /already been converted/
  );
});

test("PME conversion service builds forecasts with centralized calculation", () => {
  const plan = buildPmeBudgetConversionPlan({
    budget: approvedBudget,
    environments: [
      {
        id: "env-1",
        name: "Banheiro",
        description: null,
        sortOrder: 0,
        subtotalCost: "1000.00",
        finalPrice: "1350.00"
      }
    ],
    items: [
      {
        id: "item-1",
        environmentId: "env-1",
        itemType: "service",
        description: "Execução",
        unit: "un",
        quantity: "1",
        unitCost: "1000.00",
        unitPrice: "1300.00",
        subtotalCost: "1000.00",
        finalPrice: "1300.00",
        isOptional: false,
        showOnProposal: true,
        sortOrder: 0
      }
    ],
    paymentTerms: [
      {
        id: "pay-1",
        description: "Entrada",
        dueOffsetDays: 0,
        amount: null,
        percentage: "50",
        sortOrder: 0
      },
      {
        id: "pay-2",
        description: "Entrega",
        dueOffsetDays: 30,
        amount: null,
        percentage: "50",
        sortOrder: 1
      }
    ]
  });

  assert.equal(plan.calculation.finalPrice, "1350.00");
  assert.equal(plan.initialCostForecast[0]?.plannedCost, "1000.00");
  assert.equal(plan.initialReceivablesForecast[0]?.plannedAmount, "675.00");
});

test("PME conversion service builds project insert from approved budget organization", () => {
  const project = buildProjectInsertFromBudget({
    budget: approvedBudget,
    userId: "user-1"
  });

  assert.equal(project.organization_id, "org-1");
  assert.equal(project.created_by, "user-1");
  assert.equal(project.code, "PME-PME-0001");
});

test("PME conversion Edge Function validates auth, role, budget status and audit log", async () => {
  const source = await readFile(edgeFunctionPath, "utf8");
  const serviceSource = await readFile("packages/domain/src/pme/convertToProject.ts", "utf8");

  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /has_organization_role/);
  assert.match(source, /buildPmeBudgetConversionPlan/);
  assert.match(source, /buildProjectInsertFromBudget/);
  assert.match(source, /converted_to_project/);
  assert.match(source, /audit_logs/);
  assert.match(source, /pme_budget\.converted_to_project/);
  assert.match(serviceSource, /calculatePmeBudget/);
  assert.doesNotMatch(source, /service_role/i);
});

test("PME conversion Edge Function does not accept organization_id from body", async () => {
  const source = await readFile(edgeFunctionPath, "utf8");
  const bodyInterfaceMatch = source.match(/interface ConvertRequestBody \{[\s\S]*?\}/);

  assert.ok(bodyInterfaceMatch);
  assert.match(bodyInterfaceMatch[0], /budgetId: string/);
  assert.match(bodyInterfaceMatch[0], /projectId\?: string/);
  assert.doesNotMatch(bodyInterfaceMatch[0], /organization/i);
  assert.doesNotMatch(bodyInterfaceMatch[0], /tenant/i);
  assert.doesNotMatch(bodyInterfaceMatch[0], /userId/i);
});

test("PME conversion documentation is updated", async () => {
  const docs = await readFile(docsPath, "utf8");

  assert.match(docs, /pme-budget-convert-to-project/);
  assert.match(docs, /converted_to_project/);
  assert.match(docs, /audit_log/);
});
