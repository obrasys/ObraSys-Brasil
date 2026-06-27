export type PmeNotificationType =
  | "overdue_receipt"
  | "late_purchase"
  | "blocked_task"
  | "missing_daily_log"
  | "cost_overrun"
  | "low_margin"
  | "budget_follow_up"
  | "budget_approved_not_converted"
  | "project_ready_to_close"
  | "critical_occurrence"
  | "pending_cost"
  | "purchase_without_actual_cost"
  | "daily_log_pending_review"
  | "closeout_pending"
  | "system_notice"
  | "other";

export type PmeNotificationSeverity = "info" | "low" | "medium" | "high" | "critical";
export type PmeNotificationStatus = "unread" | "read" | "archived" | "resolved" | "dismissed";
export type PmeNotificationFrequency = "immediate" | "daily_digest" | "weekly_digest" | "disabled";

export interface PmeNotification {
  id: string;
  userId?: string | null;
  projectId?: string | null;
  budgetId?: string | null;
  sourceTable?: string | null;
  sourceId?: string | null;
  notificationType: PmeNotificationType;
  severity: PmeNotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string | null;
  status: PmeNotificationStatus;
  dueDate?: string | null;
  readAt?: string | null;
  archivedAt?: string | null;
  resolvedAt?: string | null;
  createdBySystem: boolean;
  createdAt: string;
}

export interface PmeNotificationPreference {
  notificationType: PmeNotificationType;
  enabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  frequency: PmeNotificationFrequency;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export interface PmeNotificationGenerationContext {
  canSeeFinancials: boolean;
  preferences: PmeNotificationPreference[];
  existingNotifications: PmeNotification[];
  today: string;
}

export interface PmeNotificationReceiptSource {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  amount: string;
  receiptStatus: "planned" | "invoiced" | "received" | "overdue" | "cancelled";
  dueDate?: string | null;
}

export interface PmeNotificationPurchaseSource {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  status: "planned" | "quoted" | "ordered" | "partially_delivered" | "delivered" | "cancelled";
  expectedDeliveryDate?: string | null;
  actualCostCreated?: boolean;
}

export interface PmeNotificationTaskSource {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
}

export interface PmeNotificationDailyLogProjectSource {
  id: string;
  projectName: string;
  status: "planned" | "active" | "paused" | "completed" | "closed" | "cancelled";
  lastDailyLogDate?: string | null;
}

export interface PmeNotificationFinancialSource {
  projectId: string;
  projectName: string;
  plannedCost: string;
  actualCost: string;
  progressPercentage: string;
}

export interface PmeNotificationBudgetSource {
  id: string;
  budgetNumber: string;
  clientName: string;
  status: "sent" | "negotiation" | "approved" | string;
  updatedAt: string;
  convertedProjectId?: string | null;
}

export interface PmeNotificationCloseoutSource {
  projectId: string;
  projectName: string;
  progressPercentage: string;
  closeoutStatus?: string | null;
}

export interface PmeNotificationInput {
  receipts: PmeNotificationReceiptSource[];
  purchases: PmeNotificationPurchaseSource[];
  tasks: PmeNotificationTaskSource[];
  dailyLogProjects: PmeNotificationDailyLogProjectSource[];
  financialSummaries: PmeNotificationFinancialSource[];
  budgets: PmeNotificationBudgetSource[];
  closeouts: PmeNotificationCloseoutSource[];
}

export function getUnreadPmeNotificationsCount(notifications: PmeNotification[]): number {
  return notifications.filter((notification) => notification.status === "unread").length;
}

export function markPmeNotificationAsRead(
  notification: PmeNotification,
  now: string
): PmeNotification {
  return { ...notification, status: "read", readAt: now };
}

export function markPmeNotificationAsResolved(
  notification: PmeNotification,
  now: string
): PmeNotification {
  return { ...notification, status: "resolved", resolvedAt: now };
}

export function archivePmeNotification(
  notification: PmeNotification,
  now: string
): PmeNotification {
  return { ...notification, status: "archived", archivedAt: now };
}

export function dismissPmeNotification(notification: PmeNotification): PmeNotification {
  return { ...notification, status: "dismissed" };
}

export function generatePmeNotificationsFromAlerts(
  alerts: Array<{
    id: string;
    projectId?: string;
    alertType: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    sourceTable?: string;
    sourceId?: string;
  }>,
  context: PmeNotificationGenerationContext
): PmeNotification[] {
  return alerts.flatMap((alert) =>
    buildNotification(
      {
        notificationType: mapAlertType(alert.alertType),
        severity: alert.severity,
        title: alert.title,
        message: alert.description,
        ...(alert.projectId ? { projectId: alert.projectId } : {}),
        sourceTable: alert.sourceTable ?? "pme_dashboard_alerts",
        sourceId: alert.sourceId ?? alert.id,
        actionUrl: alert.projectId ? `/app/obras/${alert.projectId}` : "/app/dashboard"
      },
      context
    )
  );
}

export function generateOverdueReceiptNotifications(
  receipts: PmeNotificationReceiptSource[],
  context: PmeNotificationGenerationContext
): PmeNotification[] {
  return receipts.flatMap((receipt) => {
    const isOverdue =
      receipt.receiptStatus === "overdue" ||
      (Boolean(receipt.dueDate) &&
        String(receipt.dueDate) < context.today &&
        receipt.receiptStatus !== "received" &&
        receipt.receiptStatus !== "cancelled");
    if (!isOverdue) {
      return [];
    }
    const message = context.canSeeFinancials
      ? `Ha um recebimento vencido na obra ${receipt.projectName}. Valor: R$ ${receipt.amount}. Verifique a cobranca.`
      : `Ha um recebimento pendente que precisa de atencao na obra ${receipt.projectName}.`;
    return buildNotification(
      {
        notificationType: "overdue_receipt",
        severity: "high",
        title: `Recebimento vencido: ${receipt.description}`,
        message,
        projectId: receipt.projectId,
        sourceTable: "pme_project_receipts",
        sourceId: receipt.id,
        actionUrl: `/app/obras/${receipt.projectId}/recebimentos`,
        ...(receipt.dueDate ? { dueDate: receipt.dueDate } : {})
      },
      context
    );
  });
}

export function generateLatePurchaseNotifications(
  purchases: PmeNotificationPurchaseSource[],
  context: PmeNotificationGenerationContext
): PmeNotification[] {
  return purchases.flatMap((purchase) => {
    const isLate =
      Boolean(purchase.expectedDeliveryDate) &&
      String(purchase.expectedDeliveryDate) < context.today &&
      purchase.status !== "delivered" &&
      purchase.status !== "cancelled";
    if (!isLate) {
      return [];
    }
    return buildNotification(
      {
        notificationType: "late_purchase",
        severity: "medium",
        title: `Compra atrasada: ${purchase.description}`,
        message: `A compra ${purchase.description} esta com entrega atrasada na obra ${purchase.projectName}.`,
        projectId: purchase.projectId,
        sourceTable: "pme_project_purchases",
        sourceId: purchase.id,
        actionUrl: `/app/obras/${purchase.projectId}/compras`,
        ...(purchase.expectedDeliveryDate ? { dueDate: purchase.expectedDeliveryDate } : {})
      },
      context
    );
  });
}

export function generateBlockedTaskNotifications(
  tasks: PmeNotificationTaskSource[],
  context: PmeNotificationGenerationContext
): PmeNotification[] {
  return tasks.flatMap((task) => {
    if (task.status !== "blocked") {
      return [];
    }
    return buildNotification(
      {
        notificationType: "blocked_task",
        severity: "high",
        title: `Tarefa bloqueada: ${task.title}`,
        message: `A tarefa ${task.title} esta bloqueada na obra ${task.projectName}.`,
        projectId: task.projectId,
        sourceTable: "pme_project_tasks",
        sourceId: task.id,
        actionUrl: `/app/obras/${task.projectId}/tarefas`
      },
      context
    );
  });
}

export function generateMissingDailyLogNotifications(
  projects: PmeNotificationDailyLogProjectSource[],
  context: PmeNotificationGenerationContext,
  missingDays = 2
): PmeNotification[] {
  return projects.flatMap((project) => {
    if (project.status !== "active") {
      return [];
    }
    const days = project.lastDailyLogDate
      ? daysBetween(project.lastDailyLogDate, context.today)
      : missingDays + 1;
    if (days <= missingDays) {
      return [];
    }
    return buildNotification(
      {
        notificationType: "missing_daily_log",
        severity: "medium",
        title: `Diario em falta: ${project.projectName}`,
        message: `A obra ${project.projectName} esta ha ${days} dias sem diario de obra.`,
        projectId: project.id,
        sourceTable: "pme_project_daily_logs",
        sourceId: project.id,
        actionUrl: `/app/obras/${project.id}/diario`
      },
      context
    );
  });
}

export function generateCostOverrunNotifications(
  summaries: PmeNotificationFinancialSource[],
  context: PmeNotificationGenerationContext
): PmeNotification[] {
  return summaries.flatMap((summary) => {
    const plannedCost = parseMoney(summary.plannedCost);
    const actualCost = parseMoney(summary.actualCost);
    if (plannedCost <= 0n) {
      return [];
    }
    const isOver = actualCost > plannedCost;
    const isNear =
      actualCost * 100n >= plannedCost * 90n && Number(summary.progressPercentage) < 90;
    if (!isOver && !isNear) {
      return [];
    }
    const message = context.canSeeFinancials
      ? `A obra ${summary.projectName} ultrapassou o custo previsto ou esta perto de ultrapassar.`
      : `A obra ${summary.projectName} precisa de revisao financeira por um responsavel autorizado.`;
    return buildNotification(
      {
        notificationType: isOver ? "cost_overrun" : "low_margin",
        severity: isOver ? "critical" : "high",
        title: isOver
          ? `Custo acima do previsto: ${summary.projectName}`
          : `Custo perto do limite: ${summary.projectName}`,
        message,
        projectId: summary.projectId,
        sourceTable: "pme_project_financial_summary",
        sourceId: summary.projectId,
        actionUrl: `/app/obras/${summary.projectId}/resumo`
      },
      context
    );
  });
}

export function generateBudgetFollowUpNotifications(
  budgets: PmeNotificationBudgetSource[],
  context: PmeNotificationGenerationContext,
  followUpDays = 3
): PmeNotification[] {
  return budgets.flatMap((budget) => {
    const days = daysBetween(budget.updatedAt.slice(0, 10), context.today);
    if ((budget.status === "sent" || budget.status === "negotiation") && days > followUpDays) {
      return buildNotification(
        {
          notificationType: "budget_follow_up",
          severity: "medium",
          title: `Orcamento sem seguimento: ${budget.budgetNumber}`,
          message: `O orcamento ${budget.budgetNumber} enviado ao cliente ${budget.clientName} ainda nao teve seguimento.`,
          budgetId: budget.id,
          sourceTable: "pme_budgets",
          sourceId: budget.id,
          actionUrl: `/app/orcamentos-pme/${budget.id}`
        },
        context
      );
    }
    if (budget.status === "approved" && !budget.convertedProjectId) {
      return buildNotification(
        {
          notificationType: "budget_approved_not_converted",
          severity: "high",
          title: `Orcamento aprovado nao convertido: ${budget.budgetNumber}`,
          message: `O orcamento ${budget.budgetNumber} foi aprovado, mas ainda nao foi convertido em obra.`,
          budgetId: budget.id,
          sourceTable: "pme_budgets",
          sourceId: budget.id,
          actionUrl: `/app/orcamentos-pme/${budget.id}`
        },
        context
      );
    }
    return [];
  });
}

export function generateProjectCloseoutNotifications(
  closeouts: PmeNotificationCloseoutSource[],
  context: PmeNotificationGenerationContext
): PmeNotification[] {
  return closeouts.flatMap((closeout) => {
    if (Number(closeout.progressPercentage) < 100 || closeout.closeoutStatus === "closed") {
      return [];
    }
    return buildNotification(
      {
        notificationType: "project_ready_to_close",
        severity: "medium",
        title: `Obra pronta para fecho: ${closeout.projectName}`,
        message: `A obra ${closeout.projectName} parece pronta para fecho.`,
        projectId: closeout.projectId,
        sourceTable: "pme_project_closeouts",
        sourceId: closeout.projectId,
        actionUrl: `/app/obras/${closeout.projectId}/fecho`
      },
      context
    );
  });
}

export function generatePmeNotifications(
  input: PmeNotificationInput,
  context: PmeNotificationGenerationContext
): PmeNotification[] {
  return [
    ...generateOverdueReceiptNotifications(input.receipts, context),
    ...generateLatePurchaseNotifications(input.purchases, context),
    ...generateBlockedTaskNotifications(input.tasks, context),
    ...generateMissingDailyLogNotifications(input.dailyLogProjects, context),
    ...generateCostOverrunNotifications(input.financialSummaries, context),
    ...generateBudgetFollowUpNotifications(input.budgets, context),
    ...generateProjectCloseoutNotifications(input.closeouts, context)
  ];
}

export function createPmeNotificationEvent(input: {
  notificationId?: string | null;
  eventType:
    | "generated"
    | "read"
    | "archived"
    | "resolved"
    | "dismissed"
    | "delivery_attempted"
    | "delivery_failed";
  sourceTable?: string | null;
  sourceId?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  return {
    notificationId: input.notificationId ?? null,
    eventType: input.eventType,
    sourceTable: input.sourceTable ?? null,
    sourceId: input.sourceId ?? null,
    payload: input.payload ?? null
  };
}

function buildNotification(
  draft: Omit<PmeNotification, "id" | "status" | "createdAt" | "createdBySystem">,
  context: PmeNotificationGenerationContext
): PmeNotification[] {
  if (!isPreferenceEnabled(draft.notificationType, context.preferences)) {
    return [];
  }
  if (hasActiveDuplicate(draft, context.existingNotifications)) {
    return [];
  }
  if (!isInternalActionUrl(draft.actionUrl ?? null)) {
    throw new Error("Notification action_url must be an internal /app route.");
  }
  return [
    {
      ...draft,
      id: `${draft.notificationType}-${draft.sourceId ?? draft.projectId ?? draft.budgetId ?? "org"}`,
      status: "unread",
      createdBySystem: true,
      createdAt: `${context.today}T00:00:00.000Z`
    }
  ];
}

function isPreferenceEnabled(
  notificationType: PmeNotificationType,
  preferences: PmeNotificationPreference[]
): boolean {
  const preference = preferences.find((item) => item.notificationType === notificationType);
  if (!preference) {
    return true;
  }
  return preference.enabled && preference.inAppEnabled && preference.frequency !== "disabled";
}

function hasActiveDuplicate(
  draft: Pick<PmeNotification, "notificationType" | "sourceTable" | "sourceId" | "userId">,
  existing: PmeNotification[]
): boolean {
  return existing.some(
    (notification) =>
      (notification.status === "unread" || notification.status === "read") &&
      notification.notificationType === draft.notificationType &&
      notification.sourceTable === draft.sourceTable &&
      notification.sourceId === draft.sourceId &&
      (notification.userId ?? null) === (draft.userId ?? null)
  );
}

function mapAlertType(alertType: string): PmeNotificationType {
  const known = [
    "cost_overrun",
    "low_margin",
    "overdue_receipt",
    "late_purchase",
    "blocked_task",
    "missing_daily_log",
    "closeout_pending"
  ];
  return known.includes(alertType) ? (alertType as PmeNotificationType) : "other";
}

function isInternalActionUrl(value: string | null): boolean {
  return value === null || value.startsWith("/app/");
}

function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }
  return Math.floor((end - start) / 86_400_000);
}

function parseMoney(value: string): bigint {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error("Expected a money value with up to two decimals.");
  }
  const negative = value.startsWith("-");
  const normalized = negative ? value.slice(1) : value;
  const [integerPart, decimalPart = ""] = normalized.split(".");
  const cents = BigInt(integerPart + decimalPart.padEnd(2, "0"));
  return negative ? -cents : cents;
}
