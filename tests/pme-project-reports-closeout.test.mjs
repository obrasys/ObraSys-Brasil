import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  assertClientReportSettings,
  calculatePmeProjectCloseout,
  sanitizePmeClientReportSnapshot,
  validateProjectCanBeClosed
} from "../packages/domain/src/pme-project-reports/pmeProjectReports.ts";

const migrationPath = "supabase/migrations/20260627000400_create_pme_project_reports_closeout.sql";

test("PME project closeout calculates costs, receipts and actual profit", () => {
  const result = calculatePmeProjectCloseout({
    plannedCosts: [{ amount: "1000.00" }],
    actualCosts: [
      { amount: "700.00", paymentStatus: "paid" },
      { amount: "100.00", paymentStatus: "pending" }
    ],
    plannedReceivables: [
      { amount: "1500.00", status: "planned" },
      { amount: "500.00", status: "overdue" }
    ],
    receipts: [{ amount: "900.00", receiptStatus: "received" }],
    tasks: [{ status: "done" }, { status: "todo" }],
    purchases: [{ status: "ordered" }],
    occurrences: [{ severity: "critical", resolved: false }],
    dailyLogs: [],
    photosCount: 0
  });

  assert.equal(result.actualCost, "700.00");
  assert.equal(result.receivedRevenue, "900.00");
  assert.equal(result.pendingReceivables, "2000.00");
  assert.equal(result.actualProfit, "200.00");
  assert.equal(result.pendingTasksCount, 1);
  assert.equal(result.openPurchasesCount, 1);
  assert.equal(result.unresolvedOccurrencesCount, 1);
});

test("PME project closeout validation detects open tasks, overdue receipts and purchases", () => {
  const result = calculatePmeProjectCloseout({
    plannedCosts: [{ amount: "1000.00" }],
    actualCosts: [{ amount: "100.00", paymentStatus: "pending" }],
    plannedReceivables: [{ amount: "500.00", status: "overdue" }],
    receipts: [],
    tasks: [{ status: "blocked" }],
    purchases: [{ status: "partially_delivered" }],
    occurrences: [],
    dailyLogs: [],
    photosCount: 0
  });
  const validation = validateProjectCanBeClosed({
    closeout: result,
    checklistItems: [{ status: "pending", isRequired: true }]
  });

  assert.equal(validation.canClose, false);
  assert.match(validation.warnings.join(" "), /tarefas abertas/);
  assert.match(validation.warnings.join(" "), /recebimentos vencidos/);
  assert.match(validation.warnings.join(" "), /compras/);
});

test("PME client report sanitization removes profit, margin and internal costs", () => {
  const snapshot = sanitizePmeClientReportSnapshot({
    reportType: "client_delivery",
    visibility: "client",
    title: "Relatorio para cliente",
    project: { id: "project-1", name: "Obra" },
    financial: {
      actualCost: "700.00",
      plannedCost: "1000.00",
      actualProfit: "200.00",
      margin: "20"
    },
    operational: { progressPercentage: "100" },
    purchases: [{ description: "Material", supplierName: "Fornecedor", actualCost: "10.00" }],
    receipts: [{ description: "Parcela", amount: "100.00" }],
    dailyLogs: [],
    photos: [],
    generatedAt: "2026-06-27T00:00:00.000Z"
  });
  const serialized = JSON.stringify(snapshot);

  assert.equal(snapshot.visibility, "client");
  assert.deepEqual(snapshot.financial, {});
  assert.doesNotMatch(serialized, /actualCost/);
  assert.doesNotMatch(serialized, /plannedCost/);
  assert.doesNotMatch(serialized, /actualProfit/);
  assert.doesNotMatch(serialized, /supplierName/);
});

test("PME client report settings block internal cost, profit and margin", () => {
  assert.throws(
    () =>
      assertClientReportSettings({
        showInternalCosts: true,
        showProfit: false,
        showMargin: false,
        showPurchaseDetails: true,
        showSupplierNames: false,
        showPaymentStatus: true,
        showDailyLogs: true,
        showPhotos: true,
        showOccurrences: true,
        showPendingItems: true,
        showClientNotes: true
      }),
    /Client reports cannot show/
  );
});

test("PME project reports migration creates tables, indexes and RLS", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const tables = [
    "pme_project_closeouts",
    "pme_project_closeout_checklist_items",
    "pme_project_closeout_snapshots",
    "pme_project_reports",
    "pme_project_report_exports",
    "pme_project_report_settings"
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`${table}.*organization_id`, "s"));
  }

  assert.match(migration, /foreign key \(organization_id, project_id\)/);
  assert.match(migration, /pme_project_reports_client_type_check/);
  assert.match(migration, /visibility = 'client'/);
  assert.match(
    migration,
    /has_organization_role\(organization_id, array\['owner', 'admin', 'manager'\]\)/
  );
  assert.match(migration, /numeric\(14, 2\)/);
});

test("PME project report Edge Functions authenticate, derive organization and audit", async () => {
  const functions = [
    "supabase/functions/pme-project-calculate-closeout/index.ts",
    "supabase/functions/pme-project-generate-report/index.ts",
    "supabase/functions/pme-project-export-report/index.ts",
    "supabase/functions/pme-project-close/index.ts",
    "supabase/functions/pme-project-reopen/index.ts"
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

test("PME reports UI exposes reports, closeout, checklist and client warning", async () => {
  const reportsPage = await readFile(
    "apps/web/src/features/pme-project-reports/PmeProjectReportsPage.tsx",
    "utf8"
  );
  const closeoutPage = await readFile(
    "apps/web/src/features/pme-project-reports/PmeProjectCloseoutPage.tsx",
    "utf8"
  );
  const schemas = await readFile(
    "apps/web/src/features/pme-project-reports/pmeProjectReportSchemas.ts",
    "utf8"
  );

  assert.match(reportsPage, /Relatorios para cliente ocultam custo interno/);
  assert.match(reportsPage, /Financeiro interno/);
  assert.match(reportsPage, /Relatorio para cliente/);
  assert.match(closeoutPage, /Fechar obra/);
  assert.match(closeoutPage, /Reabrir obra/);
  assert.match(closeoutPage, /PmeProjectCloseoutChecklist/);
  assert.match(schemas, /Relatorio para cliente nao pode mostrar custo interno/);
});
