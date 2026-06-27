import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  archivePmeNotification,
  generateBudgetFollowUpNotifications,
  generateCostOverrunNotifications,
  generateLatePurchaseNotifications,
  generateMissingDailyLogNotifications,
  generateOverdueReceiptNotifications,
  generatePmeNotifications,
  getUnreadPmeNotificationsCount,
  markPmeNotificationAsRead,
  markPmeNotificationAsResolved
} from "../packages/domain/src/pme-notifications/pmeNotifications.ts";

const migrationPath = "supabase/migrations/20260627000600_create_pme_notifications.sql";

const context = {
  canSeeFinancials: true,
  preferences: [],
  existingNotifications: [],
  today: "2026-06-27"
};

test("PME notifications generate overdue receipt, late purchase, blocked task and missing daily log", () => {
  const notifications = generatePmeNotifications(
    {
      receipts: [
        {
          id: "receipt-1",
          projectId: "project-1",
          projectName: "Obra A",
          description: "Parcela final",
          amount: "1000.00",
          receiptStatus: "overdue",
          dueDate: "2026-06-20"
        }
      ],
      purchases: [
        {
          id: "purchase-1",
          projectId: "project-1",
          projectName: "Obra A",
          description: "Revestimento",
          status: "ordered",
          expectedDeliveryDate: "2026-06-20"
        }
      ],
      tasks: [
        {
          id: "task-1",
          projectId: "project-1",
          projectName: "Obra A",
          title: "Liberar material",
          status: "blocked"
        }
      ],
      dailyLogProjects: [
        { id: "project-1", projectName: "Obra A", status: "active", lastDailyLogDate: "2026-06-20" }
      ],
      financialSummaries: [],
      budgets: [],
      closeouts: []
    },
    context
  );

  assert.ok(
    notifications.some((notification) => notification.notificationType === "overdue_receipt")
  );
  assert.ok(
    notifications.some((notification) => notification.notificationType === "late_purchase")
  );
  assert.ok(notifications.some((notification) => notification.notificationType === "blocked_task"));
  assert.ok(
    notifications.some((notification) => notification.notificationType === "missing_daily_log")
  );
});

test("PME notifications sanitize financial message for restricted profiles", () => {
  const restricted = generateOverdueReceiptNotifications(
    [
      {
        id: "receipt-1",
        projectId: "project-1",
        projectName: "Obra A",
        description: "Parcela",
        amount: "5000.00",
        receiptStatus: "overdue"
      }
    ],
    { ...context, canSeeFinancials: false }
  );
  const cost = generateCostOverrunNotifications(
    [
      {
        projectId: "project-1",
        projectName: "Obra A",
        plannedCost: "1000.00",
        actualCost: "1200.00",
        progressPercentage: "50"
      }
    ],
    { ...context, canSeeFinancials: false }
  );

  assert.doesNotMatch(restricted[0]?.message ?? "", /5000/);
  assert.match(cost[0]?.message ?? "", /responsavel autorizado/);
});

test("PME notifications avoid active duplicates and respect disabled preferences", () => {
  const first = generateLatePurchaseNotifications(
    [
      {
        id: "purchase-1",
        projectId: "project-1",
        projectName: "Obra A",
        description: "Argamassa",
        status: "ordered",
        expectedDeliveryDate: "2026-06-20"
      }
    ],
    context
  );
  const duplicate = generateLatePurchaseNotifications(
    [
      {
        id: "purchase-1",
        projectId: "project-1",
        projectName: "Obra A",
        description: "Argamassa",
        status: "ordered",
        expectedDeliveryDate: "2026-06-20"
      }
    ],
    { ...context, existingNotifications: first }
  );
  const disabled = generateLatePurchaseNotifications(
    [
      {
        id: "purchase-2",
        projectId: "project-1",
        projectName: "Obra A",
        description: "Piso",
        status: "ordered",
        expectedDeliveryDate: "2026-06-20"
      }
    ],
    {
      ...context,
      preferences: [
        {
          notificationType: "late_purchase",
          enabled: false,
          inAppEnabled: false,
          emailEnabled: false,
          pushEnabled: false,
          frequency: "disabled"
        }
      ]
    }
  );

  assert.equal(first.length, 1);
  assert.equal(duplicate.length, 0);
  assert.equal(disabled.length, 0);
});

test("PME notifications generate budget follow-up and approved-not-converted reminders", () => {
  const notifications = generateBudgetFollowUpNotifications(
    [
      {
        id: "budget-1",
        budgetNumber: "PME-1",
        clientName: "Cliente",
        status: "sent",
        updatedAt: "2026-06-20T00:00:00.000Z"
      },
      {
        id: "budget-2",
        budgetNumber: "PME-2",
        clientName: "Cliente",
        status: "approved",
        updatedAt: "2026-06-26T00:00:00.000Z",
        convertedProjectId: null
      }
    ],
    context
  );

  assert.ok(
    notifications.some((notification) => notification.notificationType === "budget_follow_up")
  );
  assert.ok(
    notifications.some(
      (notification) => notification.notificationType === "budget_approved_not_converted"
    )
  );
});

test("PME notification status transitions and unread count work", () => {
  const [notification] = generateMissingDailyLogNotifications(
    [{ id: "project-1", projectName: "Obra A", status: "active", lastDailyLogDate: "2026-06-20" }],
    context
  );

  assert.equal(getUnreadPmeNotificationsCount([notification]), 1);
  assert.equal(markPmeNotificationAsRead(notification, "2026-06-27T10:00:00.000Z").status, "read");
  assert.equal(
    markPmeNotificationAsResolved(notification, "2026-06-27T10:00:00.000Z").status,
    "resolved"
  );
  assert.equal(archivePmeNotification(notification, "2026-06-27T10:00:00.000Z").status, "archived");
});

test("PME notifications migration creates tables, RLS, indexes and internal action URL guard", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const tables = [
    "pme_notifications",
    "pme_notification_preferences",
    "pme_notification_rules",
    "pme_notification_events",
    "pme_notification_deliveries",
    "pme_notification_status_history"
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`${table}.*organization_id`, "s"));
  }

  assert.match(migration, /pme_notifications_active_source_unique_idx/);
  assert.match(migration, /action_url is null or action_url ~ '\^\/app\/'/);
  assert.match(migration, /foreign key \(organization_id, project_id\)/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
});

test("PME notification Edge Functions authenticate, avoid organization body auth and audit critical actions", async () => {
  const functions = [
    "supabase/functions/pme-notifications-generate/index.ts",
    "supabase/functions/pme-notifications-mark-read/index.ts",
    "supabase/functions/pme-notifications-resolve/index.ts"
  ];

  for (const functionPath of functions) {
    const source = await readFile(functionPath, "utf8");
    const bodyInterface = source.match(/interface RequestBody \{[\s\S]*?\}/)?.[0] ?? "";

    assert.match(source, /supabase\.auth\.getUser\(\)/);
    assert.match(source, /pme_notifications|organization_members/);
    assert.doesNotMatch(source, /service_role/i);
    assert.doesNotMatch(bodyInterface, /organization/i);
    assert.doesNotMatch(bodyInterface, /tenant/i);
    assert.doesNotMatch(bodyInterface, /userId/i);
  }
});

test("PME notification UI exposes bell, filters, actions and preferences", async () => {
  const page = await readFile(
    "apps/web/src/features/pme-notifications/PmeNotificationsPage.tsx",
    "utf8"
  );
  const preferences = await readFile(
    "apps/web/src/features/pme-notifications/PmeNotificationPreferencesPage.tsx",
    "utf8"
  );
  const schemas = await readFile(
    "apps/web/src/features/pme-notifications/pmeNotificationSchemas.ts",
    "utf8"
  );

  assert.match(page, /Centro de notificações/);
  assert.match(page, /PmeNotificationsBell/);
  assert.match(page, /Gerar avisos/);
  assert.match(page, /onMarkRead/);
  assert.match(preferences, /Preferências de notificações/);
  assert.match(schemas, /rota interna segura/);
});
