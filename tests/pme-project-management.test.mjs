import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  assertCanEditDailyLog,
  calculatePmeProjectFinancialSummary,
  completePmeProjectTask
} from "../packages/domain/src/pme-projects/projectManagement.ts";

const migrationPath = "supabase/migrations/20260627000100_create_pme_project_management.sql";

test("PME project financial summary calculates planned, actual, received and profit values", () => {
  const summary = calculatePmeProjectFinancialSummary({
    costForecasts: [
      { totalCost: "1000.00", status: "planned" },
      { totalCost: "200.00", status: "cancelled" }
    ],
    receivableForecasts: [
      { amount: "1800.00", status: "planned" },
      { amount: "300.00", status: "overdue" }
    ],
    actualCosts: [
      { amount: "450.00", paymentStatus: "paid" },
      { amount: "150.00", paymentStatus: "pending" }
    ],
    receipts: [
      { amount: "900.00", receiptStatus: "received" },
      { amount: "200.00", receiptStatus: "planned" }
    ]
  });

  assert.equal(summary.plannedCost, "1000.00");
  assert.equal(summary.actualCost, "450.00");
  assert.equal(summary.plannedRevenue, "2100.00");
  assert.equal(summary.receivedRevenue, "900.00");
  assert.equal(summary.actualProfit, "450.00");
  assert.equal(summary.hasOverdueReceivables, true);
});

test("PME project financial summary alerts when actual cost is over planned cost", () => {
  const summary = calculatePmeProjectFinancialSummary({
    costForecasts: [{ totalCost: "1000.00", status: "planned" }],
    receivableForecasts: [{ amount: "1200.00", status: "planned" }],
    actualCosts: [{ amount: "1200.00", paymentStatus: "paid" }],
    receipts: [{ amount: "500.00", receiptStatus: "received" }]
  });

  assert.equal(summary.hasCostOverrun, true);
  assert.equal(summary.costVariance, "200.00");
});

test("PME project task completion and locked daily log rules are enforced in domain", () => {
  const completed = completePmeProjectTask({ status: "in_progress" });

  assert.equal(completed.status, "done");
  assert.equal(completed.progressPercentage, "100");
  assert.doesNotThrow(() => assertCanEditDailyLog("draft"));
  assert.throws(() => assertCanEditDailyLog("locked"), /cannot be edited/);
});

test("PME project management migration creates tables, indexes and RLS", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const tables = [
    "pme_project_stages",
    "pme_project_tasks",
    "pme_project_purchases",
    "pme_project_purchase_items",
    "pme_project_actual_costs",
    "pme_project_receipts",
    "pme_project_daily_logs",
    "pme_project_photos",
    "pme_project_attachments",
    "pme_project_progress_snapshots",
    "pme_project_financial_summary"
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`${table}.*organization_id`, "s"));
  }

  assert.match(migration, /create index if not exists pme_project_tasks_project_status_idx/);
  assert.match(migration, /create index if not exists pme_project_photos_project_created_idx/);
  assert.match(migration, /numeric\(14, 2\)/);
  assert.match(
    migration,
    /has_organization_role\(organization_id, array\['owner', 'admin', 'manager'\]\)/
  );
});

test("PME project migration protects cross-tenant relationships and locked daily logs", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /foreign key \(organization_id, project_id\)/);
  assert.match(migration, /pme_project_daily_logs_locked_update_guard/);
  assert.match(migration, /raise exception 'Locked daily logs cannot be edited.'/);
  assert.match(migration, /payment_status <> 'paid' or payment_date is not null/);
  assert.match(migration, /receipt_status <> 'received' or received_at is not null/);
});

test("PME project Edge Functions authenticate, derive organization and audit critical actions", async () => {
  const functions = [
    "supabase/functions/pme-project-create-actual-cost/index.ts",
    "supabase/functions/pme-project-create-receipt/index.ts",
    "supabase/functions/pme-project-calculate-summary/index.ts",
    "supabase/functions/pme-project-lock-daily-log/index.ts"
  ];

  for (const functionPath of functions) {
    const source = await readFile(functionPath, "utf8");
    const bodyInterface = source.match(/interface RequestBody \{[\s\S]*?\}/)?.[0] ?? "";

    assert.match(source, /supabase\.auth\.getUser\(\)/);
    assert.match(source, /has_organization_role/);
    assert.match(source, /audit_logs/);
    assert.doesNotMatch(source, /service_role/i);
    assert.doesNotMatch(bodyInterface, /organization/i);
    assert.doesNotMatch(bodyInterface, /tenant/i);
    assert.doesNotMatch(bodyInterface, /userId/i);
  }
});

test("PME project UI exposes dashboard, tabs, forms and permission gate", async () => {
  const dashboard = await readFile(
    "apps/web/src/features/pme-projects/PmeProjectDashboardPage.tsx",
    "utf8"
  );
  const summary = await readFile(
    "apps/web/src/features/pme-projects/components/PmeProjectSummaryCards.tsx",
    "utf8"
  );
  const tabs = await readFile(
    "apps/web/src/features/pme-projects/components/PmeProjectTabs.tsx",
    "utf8"
  );
  const costs = await readFile(
    "apps/web/src/features/pme-projects/components/PmeProjectCostsTab.tsx",
    "utf8"
  );
  const receipts = await readFile(
    "apps/web/src/features/pme-projects/components/PmeProjectReceiptsTab.tsx",
    "utf8"
  );

  assert.match(dashboard, /O gasto real pago ultrapassou/);
  assert.match(dashboard, /Existem recebimentos vencidos/);
  assert.match(dashboard, /tarefas bloqueadas/);
  assert.match(summary, /PmeProjectPermissionGate/);
  assert.match(tabs, /tarefas/);
  assert.match(tabs, /compras/);
  assert.match(tabs, /custos/);
  assert.match(tabs, /recebimentos/);
  assert.match(tabs, /diario/);
  assert.match(tabs, /fotos/);
  assert.match(costs, /useForm/);
  assert.match(costs, /pmeProjectActualCostSchema/);
  assert.match(receipts, /pmeProjectReceiptSchema/);
});

test("PME project schemas block negative amounts and require descriptions", async () => {
  const schemas = await readFile("apps/web/src/features/pme-projects/pmeProjectSchemas.ts", "utf8");

  assert.match(schemas, /O valor nao pode ser negativo/);
  assert.match(schemas, /A quantidade deve ser maior que zero/);
  assert.match(schemas, /Custo pago precisa ter data de pagamento/);
  assert.match(schemas, /Recebimento confirmado precisa ter data/);
  assert.match(schemas, /Informe o custo/);
  assert.match(schemas, /Informe o recebimento/);
});
