export type PmeDashboardAlertType =
  | "cost_overrun"
  | "low_margin"
  | "overdue_receipt"
  | "late_purchase"
  | "blocked_task"
  | "missing_daily_log"
  | "project_delay"
  | "open_occurrence"
  | "closeout_pending"
  | "no_recent_activity"
  | "budget_not_converted"
  | "other";

export type PmeDashboardAlertSeverity = "low" | "medium" | "high" | "critical";
export type PmeDashboardAlertStatus = "open" | "acknowledged" | "resolved" | "archived";
export type PmeDashboardPeriod = "7d" | "30d" | "90d" | "current_month" | "custom";

export interface PmeDashboardProjectInput {
  id: string;
  name: string;
  clientName?: string;
  status: "planned" | "active" | "paused" | "completed" | "closed" | "cancelled";
  progressPercentage: string;
  plannedRevenue: string;
  receivedRevenue: string;
  pendingReceivables: string;
  plannedCost: string;
  actualCost: string;
  expectedProfit: string;
  actualProfit: string;
  costVariance: string;
  responsibleName?: string;
  lastDailyLogDate?: string | null;
  expectedEndDate?: string | null;
  readyToClose?: boolean;
}

export interface PmeDashboardTaskInput {
  id: string;
  projectId: string;
  title: string;
  status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
}

export interface PmeDashboardPurchaseInput {
  id: string;
  projectId: string;
  description: string;
  status: "planned" | "quoted" | "ordered" | "partially_delivered" | "delivered" | "cancelled";
  expectedDeliveryDate?: string | null;
}

export interface PmeDashboardReceiptInput {
  id: string;
  projectId: string;
  description: string;
  amount: string;
  status: "planned" | "invoiced" | "received" | "overdue" | "cancelled";
  dueDate?: string | null;
}

export interface PmeDashboardExistingAlertInput {
  alertType: PmeDashboardAlertType;
  projectId?: string | null;
  sourceTable?: string | null;
  sourceId?: string | null;
  status: PmeDashboardAlertStatus;
}

export interface PmeDashboardInput {
  projects: PmeDashboardProjectInput[];
  tasks: PmeDashboardTaskInput[];
  purchases: PmeDashboardPurchaseInput[];
  receipts: PmeDashboardReceiptInput[];
  existingAlerts?: PmeDashboardExistingAlertInput[];
  today: string;
  missingDailyLogDays: number;
}

export interface PmeDashboardSummary {
  totalProjects: number;
  activeProjects: number;
  delayedProjects: number;
  closedProjects: number;
  totalPlannedRevenue: string;
  totalReceivedRevenue: string;
  totalPendingReceivables: string;
  totalPlannedCost: string;
  totalActualCost: string;
  totalExpectedProfit: string;
  totalActualProfit: string;
  totalCostVariance: string;
  totalOpenTasks: number;
  totalBlockedTasks: number;
  totalOverdueReceipts: number;
  totalLatePurchases: number;
  totalMissingDailyLogs: number;
}

export interface PmeDashboardAlert {
  id: string;
  projectId?: string;
  alertType: PmeDashboardAlertType;
  severity: PmeDashboardAlertSeverity;
  title: string;
  description: string;
  status: PmeDashboardAlertStatus;
  sourceTable?: string;
  sourceId?: string;
}

export interface PmeDashboardProjectRow extends PmeDashboardProjectInput {
  alertCount: number;
  blockedTasksCount: number;
  overdueReceiptsCount: number;
  latePurchasesCount: number;
  missingDailyLog: boolean;
}

export interface PmeDashboardResult {
  summary: PmeDashboardSummary;
  projects: PmeDashboardProjectRow[];
  alerts: PmeDashboardAlert[];
  overdueReceipts: PmeDashboardReceiptInput[];
  latePurchases: PmeDashboardPurchaseInput[];
  blockedTasks: PmeDashboardTaskInput[];
  missingDailyLogs: PmeDashboardProjectInput[];
  criticalProjects: PmeDashboardProjectRow[];
}

export function getPmeDashboardSummary(input: PmeDashboardInput): PmeDashboardSummary {
  const activeProjects = input.projects.filter((project) => project.status === "active");
  const closedProjects = input.projects.filter(
    (project) => project.status === "completed" || project.status === "closed"
  );
  const delayedProjects = input.projects.filter((project) =>
    isProjectDelayed(project, input.today)
  );
  const openTasks = input.tasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress" || task.status === "blocked"
  );
  const blockedTasks = input.tasks.filter((task) => task.status === "blocked");
  const overdueReceipts = getPmeOverdueReceipts(input);
  const latePurchases = getPmeLatePurchases(input);
  const missingDailyLogs = getPmeMissingDailyLogs(input);

  return {
    totalProjects: input.projects.length,
    activeProjects: activeProjects.length,
    delayedProjects: delayedProjects.length,
    closedProjects: closedProjects.length,
    totalPlannedRevenue: sumProjectMoney(input.projects, "plannedRevenue"),
    totalReceivedRevenue: sumProjectMoney(input.projects, "receivedRevenue"),
    totalPendingReceivables: sumProjectMoney(input.projects, "pendingReceivables"),
    totalPlannedCost: sumProjectMoney(input.projects, "plannedCost"),
    totalActualCost: sumProjectMoney(input.projects, "actualCost"),
    totalExpectedProfit: sumProjectMoney(input.projects, "expectedProfit", true),
    totalActualProfit: sumProjectMoney(input.projects, "actualProfit", true),
    totalCostVariance: sumProjectMoney(input.projects, "costVariance", true),
    totalOpenTasks: openTasks.length,
    totalBlockedTasks: blockedTasks.length,
    totalOverdueReceipts: overdueReceipts.length,
    totalLatePurchases: latePurchases.length,
    totalMissingDailyLogs: missingDailyLogs.length
  };
}

export function getPmeDashboardProjects(input: PmeDashboardInput): PmeDashboardProjectRow[] {
  const alerts = generatePmeDashboardAlerts(input);
  return input.projects.map((project) => {
    const blockedTasksCount = input.tasks.filter(
      (task) => task.projectId === project.id && task.status === "blocked"
    ).length;
    const overdueReceiptsCount = getPmeOverdueReceipts(input).filter(
      (receipt) => receipt.projectId === project.id
    ).length;
    const latePurchasesCount = getPmeLatePurchases(input).filter(
      (purchase) => purchase.projectId === project.id
    ).length;
    return {
      ...project,
      alertCount: alerts.filter((alert) => alert.projectId === project.id).length,
      blockedTasksCount,
      overdueReceiptsCount,
      latePurchasesCount,
      missingDailyLog: getPmeMissingDailyLogs(input).some((item) => item.id === project.id)
    };
  });
}

export function getPmeDashboardFinancialCards(input: PmeDashboardInput): PmeDashboardSummary {
  return getPmeDashboardSummary(input);
}

export function getPmeDashboardOperationalCards(input: PmeDashboardInput): PmeDashboardSummary {
  return getPmeDashboardSummary(input);
}

export function getPmeDashboardAlerts(input: PmeDashboardInput): PmeDashboardAlert[] {
  return generatePmeDashboardAlerts(input);
}

export function generatePmeDashboardAlerts(input: PmeDashboardInput): PmeDashboardAlert[] {
  const alerts: PmeDashboardAlert[] = [];
  for (const project of input.projects) {
    const plannedCost = parseMoney(project.plannedCost);
    const actualCost = parseMoney(project.actualCost);
    if (plannedCost > 0n && actualCost > plannedCost) {
      pushAlert(input, alerts, {
        projectId: project.id,
        alertType: "cost_overrun",
        severity: "critical",
        title: `A obra ${project.name} ja ultrapassou o custo previsto.`,
        description: "Revise custos reais, compras e margem antes de novos lancamentos.",
        sourceTable: "pme_project_financial_summary",
        sourceId: project.id
      });
    } else if (
      plannedCost > 0n &&
      actualCost * 100n >= plannedCost * 90n &&
      project.status !== "completed"
    ) {
      pushAlert(input, alerts, {
        projectId: project.id,
        alertType: "low_margin",
        severity: "high",
        title: `A obra ${project.name} esta perto de consumir o custo previsto.`,
        description: "O custo real ja passou de 90% do previsto e a obra ainda nao foi concluida.",
        sourceTable: "pme_project_financial_summary",
        sourceId: project.id
      });
    }
    if (project.readyToClose && project.status !== "completed" && project.status !== "closed") {
      pushAlert(input, alerts, {
        projectId: project.id,
        alertType: "closeout_pending",
        severity: "medium",
        title: `A obra ${project.name} parece pronta para fecho.`,
        description: "Confira checklist, recebimentos e relatorio final.",
        sourceTable: "pme_project_closeouts",
        sourceId: project.id
      });
    }
    if (isProjectDelayed(project, input.today)) {
      pushAlert(input, alerts, {
        projectId: project.id,
        alertType: "project_delay",
        severity: "high",
        title: `A obra ${project.name} pode estar atrasada.`,
        description: "A data prevista ja passou e o progresso ainda nao chegou a 100%.",
        sourceTable: "projects",
        sourceId: project.id
      });
    }
  }
  for (const receipt of getPmeOverdueReceipts(input)) {
    pushAlert(input, alerts, {
      projectId: receipt.projectId,
      alertType: "overdue_receipt",
      severity: "high",
      title: `Recebimento vencido: ${receipt.description}.`,
      description: "Confira a cobranca e atualize o status do recebimento.",
      sourceTable: "pme_project_receipts",
      sourceId: receipt.id
    });
  }
  for (const purchase of getPmeLatePurchases(input)) {
    pushAlert(input, alerts, {
      projectId: purchase.projectId,
      alertType: "late_purchase",
      severity: "medium",
      title: `Compra atrasada: ${purchase.description}.`,
      description: "Verifique entrega, fornecedor e impacto na obra.",
      sourceTable: "pme_project_purchases",
      sourceId: purchase.id
    });
  }
  for (const task of getPmeBlockedTasks(input)) {
    pushAlert(input, alerts, {
      projectId: task.projectId,
      alertType: "blocked_task",
      severity: "high",
      title: `Tarefa bloqueada: ${task.title}.`,
      description: "Tarefas bloqueadas podem atrasar a entrega.",
      sourceTable: "pme_project_tasks",
      sourceId: task.id
    });
  }
  for (const project of getPmeMissingDailyLogs(input)) {
    pushAlert(input, alerts, {
      projectId: project.id,
      alertType: "missing_daily_log",
      severity: "medium",
      title: `A obra ${project.name} esta sem diario recente.`,
      description: `Registre o diario da obra para manter o historico atualizado.`,
      sourceTable: "pme_project_daily_logs",
      sourceId: project.id
    });
  }
  return alerts;
}

export function acknowledgePmeDashboardAlert(alert: PmeDashboardAlert): PmeDashboardAlert {
  return { ...alert, status: "acknowledged" };
}

export function resolvePmeDashboardAlert(alert: PmeDashboardAlert): PmeDashboardAlert {
  return { ...alert, status: "resolved" };
}

export function getPmeOverdueReceipts(input: PmeDashboardInput): PmeDashboardReceiptInput[] {
  return input.receipts.filter((receipt) => receipt.status === "overdue");
}

export function getPmeLatePurchases(input: PmeDashboardInput): PmeDashboardPurchaseInput[] {
  return input.purchases.filter(
    (purchase) =>
      purchase.status !== "delivered" &&
      purchase.status !== "cancelled" &&
      Boolean(purchase.expectedDeliveryDate) &&
      String(purchase.expectedDeliveryDate) < input.today
  );
}

export function getPmeBlockedTasks(input: PmeDashboardInput): PmeDashboardTaskInput[] {
  return input.tasks.filter((task) => task.status === "blocked");
}

export function getPmeMissingDailyLogs(input: PmeDashboardInput): PmeDashboardProjectInput[] {
  return input.projects.filter((project) => {
    if (project.status !== "active") {
      return false;
    }
    if (!project.lastDailyLogDate) {
      return true;
    }
    return daysBetween(project.lastDailyLogDate, input.today) > input.missingDailyLogDays;
  });
}

export function getPmeCriticalProjects(input: PmeDashboardInput): PmeDashboardProjectRow[] {
  return getPmeDashboardProjects(input)
    .filter(
      (project) =>
        project.alertCount > 0 ||
        project.blockedTasksCount > 0 ||
        project.overdueReceiptsCount > 0 ||
        project.latePurchasesCount > 0 ||
        project.missingDailyLog
    )
    .sort((first, second) => second.alertCount - first.alertCount);
}

export function buildPmeDashboard(input: PmeDashboardInput): PmeDashboardResult {
  return {
    summary: getPmeDashboardSummary(input),
    projects: getPmeDashboardProjects(input),
    alerts: generatePmeDashboardAlerts(input),
    overdueReceipts: getPmeOverdueReceipts(input),
    latePurchases: getPmeLatePurchases(input),
    blockedTasks: getPmeBlockedTasks(input),
    missingDailyLogs: getPmeMissingDailyLogs(input),
    criticalProjects: getPmeCriticalProjects(input)
  };
}

export function sanitizePmeDashboardForRestrictedProfile(
  result: PmeDashboardResult
): PmeDashboardResult {
  return {
    ...result,
    summary: {
      ...result.summary,
      totalPlannedCost: "0.00",
      totalActualCost: "0.00",
      totalExpectedProfit: "0.00",
      totalActualProfit: "0.00",
      totalCostVariance: "0.00"
    },
    projects: result.projects.map((project) => ({
      ...project,
      plannedCost: "0.00",
      actualCost: "0.00",
      expectedProfit: "0.00",
      actualProfit: "0.00",
      costVariance: "0.00"
    })),
    criticalProjects: result.criticalProjects.map((project) => ({
      ...project,
      plannedCost: "0.00",
      actualCost: "0.00",
      expectedProfit: "0.00",
      actualProfit: "0.00",
      costVariance: "0.00"
    }))
  };
}

function pushAlert(
  input: PmeDashboardInput,
  alerts: PmeDashboardAlert[],
  alert: Omit<PmeDashboardAlert, "id" | "status">
): void {
  const duplicateInExisting = input.existingAlerts?.some(
    (existing) =>
      existing.status === "open" &&
      existing.alertType === alert.alertType &&
      existing.projectId === alert.projectId &&
      existing.sourceTable === alert.sourceTable &&
      existing.sourceId === alert.sourceId
  );
  const duplicateInBatch = alerts.some(
    (existing) =>
      existing.alertType === alert.alertType &&
      existing.projectId === alert.projectId &&
      existing.sourceTable === alert.sourceTable &&
      existing.sourceId === alert.sourceId
  );
  if (duplicateInExisting || duplicateInBatch) {
    return;
  }
  alerts.push({
    ...alert,
    id: `${alert.alertType}-${alert.projectId ?? "org"}-${alert.sourceId ?? alert.sourceTable ?? "source"}`,
    status: "open"
  });
}

function sumProjectMoney(
  projects: PmeDashboardProjectInput[],
  key: keyof Pick<
    PmeDashboardProjectInput,
    | "plannedRevenue"
    | "receivedRevenue"
    | "pendingReceivables"
    | "plannedCost"
    | "actualCost"
    | "expectedProfit"
    | "actualProfit"
    | "costVariance"
  >,
  allowNegative = false
): string {
  const cents = projects.reduce((total, project) => total + parseMoney(project[key]), 0n);
  return allowNegative ? formatSignedMoney(cents) : formatMoney(cents);
}

function isProjectDelayed(project: PmeDashboardProjectInput, today: string): boolean {
  if (!project.expectedEndDate || project.status === "completed" || project.status === "closed") {
    return false;
  }
  return project.expectedEndDate < today && Number(project.progressPercentage) < 100;
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

function formatMoney(cents: bigint): string {
  if (cents < 0n) {
    throw new Error("Expected non-negative money.");
  }
  return formatSignedMoney(cents);
}

function formatSignedMoney(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  return `${negative ? "-" : ""}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}
