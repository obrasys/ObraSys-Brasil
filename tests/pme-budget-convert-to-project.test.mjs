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
  clientName: "Cliente aprovado",
  workAddress: "Rua da Obra, 123",
  description: null,
  status: "approved",
  subtotalCost: "1000.00",
  overheadPercentage: "10",
  taxPercentage: "5",
  profitPercentage: "20",
  discountAmount: "0.00",
  finalPrice: "1350.00",
  validUntil: "2026-07-26",
  approvedAt: "2026-06-26T10:00:00.000Z",
  convertedProjectId: null
};

test("PME conversion service rejects non-approved or already converted budgets", () => {
  assert.doesNotThrow(() => assertPmeBudgetCanConvert(approvedBudget));
  for (const status of ["draft", "sent", "negotiation", "rejected", "cancelled"]) {
    assert.throws(
      () =>
        assertPmeBudgetCanConvert({
          ...approvedBudget,
          status
        }),
      /Only approved budgets/
    );
  }
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
        totalCost: "1000.00",
        totalPrice: "1300.00",
        isOptional: false,
        showOnProposal: true,
        sortOrder: 0
      }
    ],
    paymentTerms: [
      {
        id: "pay-1",
        installmentNumber: 1,
        description: "Entrada",
        dueOffsetDays: 0,
        dueCondition: "Na aprovação",
        dueDate: null,
        amount: null,
        percentage: "50",
        sortOrder: 0
      },
      {
        id: "pay-2",
        installmentNumber: 2,
        description: "Entrega",
        dueOffsetDays: 30,
        dueCondition: "Na entrega",
        dueDate: null,
        amount: null,
        percentage: "50",
        sortOrder: 1
      }
    ]
  });

  assert.equal(plan.calculation.finalPrice, "1350.00");
  assert.equal(plan.initialCostForecast[0]?.total_cost, "1000.00");
  assert.equal(plan.initialReceivablesForecast[0]?.amount, "675.00");
});

test("PME conversion service creates material, labor and fallback receivable forecasts", () => {
  const plan = buildPmeBudgetConversionPlan({
    budget: approvedBudget,
    environments: [],
    items: [],
    materials: [
      {
        id: "mat-1",
        budgetItemId: null,
        description: "Argamassa",
        unit: "sc",
        quantity: "2",
        unitCost: "40.00",
        totalCost: "80.00",
        supplierName: null,
        purchaseStatus: "quoted"
      }
    ],
    labor: [
      {
        id: "labor-1",
        budgetItemId: null,
        laborType: "pedreiro",
        roleName: "Pedreiro",
        unit: "dia",
        quantity: "1",
        unitCost: "220.00",
        days: "1",
        totalCost: "220.00",
        contractType: "diaria"
      }
    ],
    paymentTerms: [],
    sinapiSnapshots: [
      {
        id: "snap-1",
        budgetItemId: "item-1",
        sinapiCode: "SIN-001",
        sinapiDescription: "Composição referência",
        uf: "SP",
        referenceMonth: 5,
        referenceYear: 2026,
        regime: "nao_desonerado",
        originalUnit: "m2",
        originalTotalCost: "100.00",
        adaptedDescription: "Composição adaptada",
        adaptedUnit: "m2",
        adaptedQuantity: "1",
        adaptedUnitCost: "100.00",
        adaptedUnitPrice: "140.00",
        snapshotData: { code: "SIN-001" }
      }
    ]
  });

  assert.equal(plan.initialCostForecast.length, 2);
  assert.equal(plan.initialCostForecast[0]?.source_type, "material");
  assert.equal(plan.initialCostForecast[1]?.source_type, "labor");
  assert.equal(plan.initialReceivablesForecast[0]?.percentage, "100");
  assert.equal(plan.budgetSnapshot.snapshot_data.sinapiSnapshots[0].uf, "SP");
});

test("PME conversion service builds project insert from approved budget organization", () => {
  const project = buildProjectInsertFromBudget({
    budget: approvedBudget,
    userId: "user-1"
  });

  assert.equal(project.organization_id, "org-1");
  assert.equal(project.created_by, "user-1");
  assert.equal(project.code, "PME-PME-0001");
  assert.equal(project.source_module, "pme_budget");
  assert.equal(project.source_id, "budget-1");
});

test("PME conversion Edge Function validates auth, role, budget status, snapshots and audit log", async () => {
  const source = await readFile(edgeFunctionPath, "utf8");
  const serviceSource = await readFile("packages/domain/src/pme/convertToProject.ts", "utf8");

  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /has_organization_role/);
  assert.match(source, /buildPmeBudgetConversionPlan/);
  assert.match(source, /converted_to_project/);
  assert.match(source, /pme_project_budget_snapshots/);
  assert.match(source, /pme_project_cost_forecasts/);
  assert.match(source, /pme_project_receivable_forecasts/);
  assert.match(source, /pme_budget_conversion_logs/);
  assert.match(source, /pme_budget_sinapi_snapshots/);
  assert.match(source, /audit_logs/);
  assert.match(source, /pme_budget\.converted_to_project/);
  assert.match(serviceSource, /calculatePmeBudget/);
  assert.match(serviceSource, /sinapiSnapshots/);
  assert.doesNotMatch(source, /service_role/i);
});

test("PME conversion Edge Function does not accept organization_id from body", async () => {
  const source = await readFile(edgeFunctionPath, "utf8");
  const bodyInterfaceMatch = source.match(/interface ConvertRequestBody \{[\s\S]*?\}/);

  assert.ok(bodyInterfaceMatch);
  assert.match(bodyInterfaceMatch[0], /budgetId: string/);
  assert.match(bodyInterfaceMatch[0], /confirmed: boolean/);
  assert.doesNotMatch(bodyInterfaceMatch[0], /organization/i);
  assert.doesNotMatch(bodyInterfaceMatch[0], /tenant/i);
  assert.doesNotMatch(bodyInterfaceMatch[0], /userId/i);
});

test("PME conversion migration creates staging tables with RLS and unique success log", async () => {
  const migration = await readFile(
    "supabase/migrations/20260626000800_create_pme_budget_conversion_to_project.sql",
    "utf8"
  );

  assert.match(migration, /create table if not exists public\.pme_project_budget_snapshots/);
  assert.match(migration, /create table if not exists public\.pme_project_cost_forecasts/);
  assert.match(migration, /create table if not exists public\.pme_project_receivable_forecasts/);
  assert.match(migration, /create table if not exists public\.pme_budget_conversion_logs/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /pme_budget_conversion_logs_success_unique/);
  assert.match(
    migration,
    /has_organization_role\(organization_id, array\['owner', 'admin', 'manager'\]\)/
  );
});

test("PME conversion UI exposes approved-only conversion modal", async () => {
  const viewSource = await readFile(
    "apps/web/src/features/pme-budgets/PmeBudgetViewPage.tsx",
    "utf8"
  );
  const buttonSource = await readFile(
    "apps/web/src/features/pme-budgets/components/PmeBudgetConvertButton.tsx",
    "utf8"
  );
  const modalSource = await readFile(
    "apps/web/src/features/pme-budgets/components/PmeBudgetConvertModal.tsx",
    "utf8"
  );

  assert.match(viewSource, /usePmeBudgetConversion/);
  assert.match(viewSource, /PmeBudgetConvertButton/);
  assert.match(buttonSource, /budget\.status === "approved"/);
  assert.match(buttonSource, /convertedProjectId === null/);
  assert.match(buttonSource, /Este orçamento já foi convertido em obra/);
  assert.match(modalSource, /Converter orçamento em obra\?/);
  assert.match(modalSource, /Custo previsto/);
  assert.match(modalSource, /snapshots do SINAPI/);
});

test("PME conversion documentation is updated", async () => {
  const docs = await readFile(docsPath, "utf8");

  assert.match(docs, /pme-budget-convert-to-project/);
  assert.match(docs, /converted_to_project/);
  assert.match(docs, /audit_log/);
});
