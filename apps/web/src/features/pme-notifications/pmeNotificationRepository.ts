import {
  archivePmeNotification,
  dismissPmeNotification,
  generatePmeNotifications,
  getUnreadPmeNotificationsCount,
  markPmeNotificationAsRead,
  markPmeNotificationAsResolved,
  type PmeNotification,
  type PmeNotificationInput,
  type PmeNotificationPreference,
  type PmeNotificationType
} from "@obrasys/domain";

import type {
  PmeNotificationFilters,
  PmeNotificationMutationResult,
  PmeNotificationsViewModel
} from "./pmeNotificationTypes";

const today = "2026-06-27";
const canSeeFinancials = true;

const defaultNotificationTypes: PmeNotificationType[] = [
  "overdue_receipt",
  "late_purchase",
  "blocked_task",
  "missing_daily_log",
  "cost_overrun",
  "budget_follow_up",
  "budget_approved_not_converted",
  "project_ready_to_close"
];

let preferences: PmeNotificationPreference[] = defaultNotificationTypes.map((notificationType) => ({
  notificationType,
  enabled: true,
  inAppEnabled: true,
  emailEnabled: false,
  pushEnabled: false,
  frequency: "immediate",
  quietHoursStart: "",
  quietHoursEnd: ""
}));

let notifications: PmeNotification[] = seedNotifications([]);

export async function getPmeNotifications(
  filters: PmeNotificationFilters
): Promise<PmeNotificationsViewModel> {
  const filtered = notifications.filter((notification) => {
    if (filters.status !== "all" && notification.status !== filters.status) {
      return false;
    }
    if (filters.severity !== "all" && notification.severity !== filters.severity) {
      return false;
    }
    if (
      filters.notificationType !== "all" &&
      notification.notificationType !== filters.notificationType
    ) {
      return false;
    }
    if (filters.projectId && notification.projectId !== filters.projectId) {
      return false;
    }
    return true;
  });

  return {
    notifications: filtered,
    unreadCount: getUnreadPmeNotificationsCount(notifications),
    preferences,
    canSeeFinancials
  };
}

export async function getUnreadPmeNotificationsCountRepository(): Promise<number> {
  return getUnreadPmeNotificationsCount(notifications);
}

export async function markPmeNotificationAsReadRepository(
  notificationId: string
): Promise<PmeNotificationMutationResult> {
  notifications = notifications.map((notification) =>
    notification.id === notificationId
      ? markPmeNotificationAsRead(notification, new Date().toISOString())
      : notification
  );
  return { id: notificationId };
}

export async function markPmeNotificationAsResolvedRepository(
  notificationId: string
): Promise<PmeNotificationMutationResult> {
  notifications = notifications.map((notification) =>
    notification.id === notificationId
      ? markPmeNotificationAsResolved(notification, new Date().toISOString())
      : notification
  );
  return { id: notificationId };
}

export async function archivePmeNotificationRepository(
  notificationId: string
): Promise<PmeNotificationMutationResult> {
  notifications = notifications.map((notification) =>
    notification.id === notificationId
      ? archivePmeNotification(notification, new Date().toISOString())
      : notification
  );
  return { id: notificationId };
}

export async function dismissPmeNotificationRepository(
  notificationId: string
): Promise<PmeNotificationMutationResult> {
  notifications = notifications.map((notification) =>
    notification.id === notificationId ? dismissPmeNotification(notification) : notification
  );
  return { id: notificationId };
}

export async function getPmeNotificationPreferences(): Promise<PmeNotificationPreference[]> {
  return preferences;
}

export async function updatePmeNotificationPreferences(
  nextPreferences: PmeNotificationPreference[]
): Promise<PmeNotificationMutationResult> {
  preferences = nextPreferences;
  return { id: "preferences" };
}

export async function generatePmeNotificationsRepository(): Promise<PmeNotificationMutationResult> {
  const generated = seedNotifications(notifications);
  const existingIds = new Set(notifications.map((notification) => notification.id));
  notifications = [
    ...generated.filter((notification) => !existingIds.has(notification.id)),
    ...notifications
  ];
  return { id: "generated" };
}

function seedNotifications(existingNotifications: PmeNotification[]): PmeNotification[] {
  return generatePmeNotifications(seedInput(), {
    canSeeFinancials,
    preferences,
    existingNotifications,
    today
  });
}

function seedInput(): PmeNotificationInput {
  return {
    receipts: [
      {
        id: "receipt-1",
        projectId: "project-demo-1",
        projectName: "Reforma do apartamento - Cliente Silva",
        description: "Parcela intermediaria",
        amount: "4000.00",
        receiptStatus: "overdue",
        dueDate: "2026-06-25"
      }
    ],
    purchases: [
      {
        id: "purchase-1",
        projectId: "project-demo-1",
        projectName: "Reforma do apartamento - Cliente Silva",
        description: "Revestimento banheiro",
        status: "quoted",
        expectedDeliveryDate: "2026-06-24"
      }
    ],
    tasks: [
      {
        id: "task-1",
        projectId: "project-demo-1",
        projectName: "Reforma do apartamento - Cliente Silva",
        title: "Comprar revestimento",
        status: "blocked"
      }
    ],
    dailyLogProjects: [
      {
        id: "project-demo-1",
        projectName: "Reforma do apartamento - Cliente Silva",
        status: "active",
        lastDailyLogDate: "2026-06-20"
      }
    ],
    financialSummaries: [
      {
        projectId: "project-demo-2",
        projectName: "Banheiro Centro",
        plannedCost: "7600.00",
        actualCost: "8200.00",
        progressPercentage: "82"
      }
    ],
    budgets: [
      {
        id: "budget-approved-1",
        budgetNumber: "PME-1024",
        clientName: "Mariana Silva",
        status: "approved",
        updatedAt: "2026-06-23T10:00:00.000Z",
        convertedProjectId: null
      },
      {
        id: "budget-sent-1",
        budgetNumber: "PME-1025",
        clientName: "Loja Centro",
        status: "sent",
        updatedAt: "2026-06-20T10:00:00.000Z"
      }
    ],
    closeouts: [
      {
        projectId: "project-demo-2",
        projectName: "Banheiro Centro",
        progressPercentage: "100",
        closeoutStatus: "draft"
      }
    ]
  };
}
