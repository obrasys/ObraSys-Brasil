import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  buildPmeDashboard,
  generatePmeDashboardAlerts,
  sanitizePmeDashboardForRestrictedProfile
} from "../packages/domain/src/pme-dashboard/pmeDashboard.ts";

const migrationPath = "supabase/migrations/20260627000500_create_pme_dashboard.sql";

const dashboardInput = {
  today: "2026-06-27",
  missingDailyLogDays: 3,
  projects: [
    {
      id: "project-1",
      name: "Banheiro Centro",
      status: "active",
      progressPercentage: "80",
      plannedRevenue: "10000.00",
      receivedRevenue: "5000.00",
      pendingReceivables: "5000.00",
      plannedCost: "6000.00",
      actualCost: "6500.00",
      expectedProfit: "4000.00",
      actualProfit: "-1500.00",
      costVariance: "500.00",
      lastDailyLogDate: "2026-06-20",
      expectedEndDate: "2026-06-25"
    },
    {
      id: "project-2",
      name: "Pintura Norte",
      status: "completed",
      progressPercentage: "100",
      plannedRevenue: "5000.00",
      receivedRevenue: "5000.00",
      pendingReceivables: "0.00",
      plannedCost: "3000.00",
      actualCost: "2800.00",
      expectedProfit: "2000.00",
      actualProfit: "2200.00",
      costVariance: "-200.00"
    }
  ],
  tasks: [{ id: "task-1", projectId: "project-1", title: "Liberar material", status: "blocked" }],
  purchases: [
    {
      id: "purchase-1",
      projectId: "project-1",
      description: "Revestimento",
      status: "ordered",
      expectedDeliveryDate: "2026-06-22"
    }
  ],
  receipts: [
    {
      id: "receipt-1",
      projectId: "project-1",
      description: "Parcela final",
      amount: "5000.00",
      status: "overdue",
      dueDate: "2026-06-24"
    }
  ]
};

test("PME dashboard aggregates active projects, receipts, costs and profit", () => {
  const dashboard = buildPmeDashboard(dashboardInput);

  assert.equal(dashboard.summary.totalProjects, 2);
  assert.equal(dashboard.summary.activeProjects, 1);
  assert.equal(dashboard.summary.totalPlannedRevenue, "15000.00");
  assert.equal(dashboard.summary.totalReceivedRevenue, "10000.00");
  assert.equal(dashboard.summary.totalPendingReceivables, "5000.00");
  assert.equal(dashboard.summary.totalActualCost, "9300.00");
  assert.equal(dashboard.summary.totalActualProfit, "700.00");
});

test("PME dashboard shows overdue receipts, late purchases, blocked tasks and missing logs", () => {
  const dashboard = buildPmeDashboard(dashboardInput);

  assert.equal(dashboard.overdueReceipts.length, 1);
  assert.equal(dashboard.latePurchases.length, 1);
  assert.equal(dashboard.blockedTasks.length, 1);
  assert.equal(dashboard.missingDailyLogs.length, 1);
});

test("PME dashboard creates cost overrun alert and avoids duplicates", () => {
  const alerts = generatePmeDashboardAlerts(dashboardInput);
  const repeated = generatePmeDashboardAlerts({
    ...dashboardInput,
    existingAlerts: alerts.map((alert) => ({
      alertType: alert.alertType,
      projectId: alert.projectId,
      sourceTable: alert.sourceTable,
      sourceId: alert.sourceId,
      status: "open"
    }))
  });

  assert.ok(alerts.some((alert) => alert.alertType === "cost_overrun"));
  assert.ok(alerts.some((alert) => alert.alertType === "overdue_receipt"));
  assert.equal(repeated.length, 0);
});

test("PME dashboard sanitizes internal costs and profit for restricted profiles", () => {
  const restricted = sanitizePmeDashboardForRestrictedProfile(buildPmeDashboard(dashboardInput));
  const serialized = JSON.stringify(restricted);

  assert.equal(restricted.summary.totalActualCost, "0.00");
  assert.equal(restricted.summary.totalActualProfit, "0.00");
  assert.doesNotMatch(serialized, /9300\.00/);
  assert.doesNotMatch(serialized, /actualProfit":"700\.00/);
});

test("PME dashboard migration creates tables, RLS and duplicate-alert protection", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const tables = [
    "pme_dashboard_snapshots",
    "pme_dashboard_alerts",
    "pme_dashboard_user_preferences"
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`${table}.*organization_id`, "s"));
  }

  assert.match(migration, /pme_dashboard_alerts_open_unique_idx/);
  assert.match(migration, /foreign key \(organization_id, project_id\)/);
  assert.match(
    migration,
    /has_organization_role\(organization_id, array\['owner', 'admin', 'manager'\]\)/
  );
  assert.match(migration, /numeric\(14, 2\)/);
});

test("PME dashboard Edge Functions authenticate, derive membership and audit", async () => {
  const functions = [
    "supabase/functions/pme-dashboard-summary/index.ts",
    "supabase/functions/pme-dashboard-generate-alerts/index.ts",
    "supabase/functions/pme-dashboard-resolve-alert/index.ts"
  ];

  for (const functionPath of functions) {
    const source = await readFile(functionPath, "utf8");
    const bodyInterface = source.match(/interface RequestBody \{[\s\S]*?\}/)?.[0] ?? "";

    assert.match(source, /supabase\.auth\.getUser\(\)/);
    assert.match(source, /organization_members|has_organization_role/);
    assert.match(source, /audit_logs|sanitizeFinancialSnapshot/);
    assert.doesNotMatch(source, /service_role/i);
    assert.doesNotMatch(bodyInterface, /organization/i);
    assert.doesNotMatch(bodyInterface, /tenant/i);
    assert.doesNotMatch(bodyInterface, /userId/i);
  }
});

test("PME dashboard UI exposes filters, cards, alerts and permission gate", async () => {
  const page = await readFile("apps/web/src/features/pme-dashboard/PmeDashboardPage.tsx", "utf8");
  const financialCards = await readFile(
    "apps/web/src/features/pme-dashboard/components/PmeDashboardFinancialCards.tsx",
    "utf8"
  );
  const schemas = await readFile(
    "apps/web/src/features/pme-dashboard/pmeDashboardSchemas.ts",
    "utf8"
  );

  assert.match(page, /Visão multi-obras/);
  assert.match(page, /Atualizar alertas/);
  assert.match(page, /PmeDashboardCriticalProjects/);
  assert.match(financialCards, /PmeDashboardPermissionGate/);
  assert.match(schemas, /Perfil sem permissao nao pode ativar lucro ou margem/);
});
