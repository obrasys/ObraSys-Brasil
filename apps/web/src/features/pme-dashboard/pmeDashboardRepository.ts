import {
  acknowledgePmeDashboardAlert as acknowledgePmeDashboardAlertDomain,
  buildPmeDashboard,
  resolvePmeDashboardAlert as resolvePmeDashboardAlertDomain,
  sanitizePmeDashboardForRestrictedProfile,
  type PmeDashboardAlert,
  type PmeDashboardInput,
  type PmeDashboardProjectInput,
  type PmeDashboardPurchaseInput,
  type PmeDashboardReceiptInput,
  type PmeDashboardTaskInput
} from "@obrasys/domain";

import type {
  PmeDashboardAlertUpdateInput,
  PmeDashboardFilters,
  PmeDashboardMutationResult,
  PmeDashboardPreferences,
  PmeDashboardViewModel
} from "./pmeDashboardTypes";

const today = "2026-06-27";

let preferences: PmeDashboardPreferences = {
  defaultPeriod: "30d",
  showProfitCards: true,
  showMarginCards: true,
  showClosedProjects: false,
  preferredProjectStatuses: ["active", "planned", "paused"],
  canSeeFinancials: true
};

const projects: PmeDashboardProjectInput[] = [
  {
    id: "project-demo-1",
    name: "Reforma do apartamento - Cliente Silva",
    clientName: "Mariana Silva",
    status: "active",
    progressPercentage: "35",
    plannedRevenue: "15000.00",
    receivedRevenue: "5000.00",
    pendingReceivables: "10000.00",
    plannedCost: "11000.00",
    actualCost: "420.00",
    expectedProfit: "4000.00",
    actualProfit: "4580.00",
    costVariance: "-10580.00",
    responsibleName: "Carlos",
    lastDailyLogDate: "2026-06-20",
    expectedEndDate: "2026-07-10"
  },
  {
    id: "project-demo-2",
    name: "Banheiro Centro",
    clientName: "Loja Centro",
    status: "active",
    progressPercentage: "82",
    plannedRevenue: "12000.00",
    receivedRevenue: "8000.00",
    pendingReceivables: "4000.00",
    plannedCost: "7600.00",
    actualCost: "8200.00",
    expectedProfit: "4400.00",
    actualProfit: "-200.00",
    costVariance: "600.00",
    responsibleName: "Ana",
    lastDailyLogDate: "2026-06-26",
    expectedEndDate: "2026-06-25",
    readyToClose: true
  },
  {
    id: "project-demo-3",
    name: "Pintura Sobrado Norte",
    clientName: "Familia Ramos",
    status: "completed",
    progressPercentage: "100",
    plannedRevenue: "9000.00",
    receivedRevenue: "9000.00",
    pendingReceivables: "0.00",
    plannedCost: "5200.00",
    actualCost: "4800.00",
    expectedProfit: "3800.00",
    actualProfit: "4200.00",
    costVariance: "-400.00",
    responsibleName: "Carlos",
    lastDailyLogDate: "2026-06-24",
    expectedEndDate: "2026-06-24"
  }
];

const tasks: PmeDashboardTaskInput[] = [
  {
    id: "task-1",
    projectId: "project-demo-1",
    title: "Impermeabilizar box",
    status: "in_progress"
  },
  { id: "task-2", projectId: "project-demo-1", title: "Comprar revestimento", status: "blocked" },
  { id: "task-3", projectId: "project-demo-2", title: "Liberar bancada", status: "blocked" },
  { id: "task-4", projectId: "project-demo-3", title: "Limpeza final", status: "done" }
];

const purchases: PmeDashboardPurchaseInput[] = [
  {
    id: "purchase-1",
    projectId: "project-demo-1",
    description: "Revestimento banheiro",
    status: "quoted",
    expectedDeliveryDate: "2026-06-24"
  },
  {
    id: "purchase-2",
    projectId: "project-demo-2",
    description: "Loucas e metais",
    status: "ordered",
    expectedDeliveryDate: "2026-06-26"
  }
];

const receipts: PmeDashboardReceiptInput[] = [
  {
    id: "receipt-1",
    projectId: "project-demo-1",
    description: "Parcela intermediaria",
    amount: "4000.00",
    status: "overdue",
    dueDate: "2026-06-25"
  },
  {
    id: "receipt-2",
    projectId: "project-demo-2",
    description: "Saldo final",
    amount: "4000.00",
    status: "planned",
    dueDate: "2026-07-02"
  }
];

let manualAlerts: PmeDashboardAlert[] = [];

export async function getPmeDashboardSummary(
  filters: PmeDashboardFilters
): Promise<PmeDashboardViewModel> {
  const input = buildInput(filters);
  const generated = buildPmeDashboard(input);
  const withManualAlerts = {
    ...generated,
    alerts: [...generated.alerts, ...manualAlerts.filter((alert) => alert.status !== "archived")]
  };
  return {
    ...(preferences.canSeeFinancials
      ? withManualAlerts
      : sanitizePmeDashboardForRestrictedProfile(withManualAlerts)),
    canSeeFinancials: preferences.canSeeFinancials,
    preferences
  };
}

export async function getPmeDashboardAlerts(
  filters: PmeDashboardFilters
): Promise<PmeDashboardAlert[]> {
  return (await getPmeDashboardSummary(filters)).alerts;
}

export async function generatePmeDashboardAlerts(
  filters: PmeDashboardFilters
): Promise<PmeDashboardMutationResult> {
  const generated = buildPmeDashboard(buildInput(filters)).alerts;
  const newAlerts = generated.filter(
    (alert) =>
      !manualAlerts.some(
        (existing) =>
          existing.status === "open" &&
          existing.alertType === alert.alertType &&
          existing.projectId === alert.projectId &&
          existing.sourceTable === alert.sourceTable &&
          existing.sourceId === alert.sourceId
      )
  );
  manualAlerts = [...newAlerts, ...manualAlerts];
  return { id: `generated-${newAlerts.length}` };
}

export async function acknowledgePmeDashboardAlert(
  input: PmeDashboardAlertUpdateInput
): Promise<PmeDashboardMutationResult> {
  manualAlerts = updateAlert(input.alertId, (alert) => acknowledgePmeDashboardAlertDomain(alert));
  return { id: input.alertId };
}

export async function resolvePmeDashboardAlert(
  input: PmeDashboardAlertUpdateInput
): Promise<PmeDashboardMutationResult> {
  manualAlerts = updateAlert(input.alertId, (alert) => resolvePmeDashboardAlertDomain(alert));
  return { id: input.alertId };
}

export async function savePmeDashboardPreferences(
  nextPreferences: PmeDashboardPreferences
): Promise<PmeDashboardMutationResult> {
  if (
    !nextPreferences.canSeeFinancials &&
    (nextPreferences.showProfitCards || nextPreferences.showMarginCards)
  ) {
    throw new Error("Perfil sem permissao nao pode ativar lucro ou margem.");
  }
  preferences = nextPreferences;
  return { id: "preferences" };
}

function buildInput(filters: PmeDashboardFilters): PmeDashboardInput {
  const visibleProjects = projects.filter((project) => {
    if (
      !filters.showClosedProjects &&
      (project.status === "completed" || project.status === "closed")
    ) {
      return false;
    }
    if (filters.status !== "all" && project.status !== filters.status) {
      return false;
    }
    if (filters.responsibleName && project.responsibleName !== filters.responsibleName) {
      return false;
    }
    if (
      filters.projectSearch &&
      !project.name.toLowerCase().includes(filters.projectSearch.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
  const projectIds = new Set(visibleProjects.map((project) => project.id));
  return {
    projects: visibleProjects,
    tasks: tasks.filter((task) => projectIds.has(task.projectId)),
    purchases: purchases.filter((purchase) => projectIds.has(purchase.projectId)),
    receipts: receipts.filter((receipt) => projectIds.has(receipt.projectId)),
    existingAlerts: manualAlerts,
    today,
    missingDailyLogDays: filters.period === "7d" ? 2 : 3
  };
}

function updateAlert(
  alertId: string,
  updater: (alert: PmeDashboardAlert) => PmeDashboardAlert
): PmeDashboardAlert[] {
  const currentDashboard = buildPmeDashboard(buildInput(defaultFilters())).alerts;
  const allAlerts = [...manualAlerts, ...currentDashboard];
  const updated = allAlerts.map((alert) => (alert.id === alertId ? updater(alert) : alert));
  return updated.filter(
    (alert, index, source) => source.findIndex((item) => item.id === alert.id) === index
  );
}

function defaultFilters(): PmeDashboardFilters {
  return {
    period: preferences.defaultPeriod,
    status: "all",
    responsibleName: "",
    projectSearch: "",
    severity: "all",
    showClosedProjects: preferences.showClosedProjects
  };
}
