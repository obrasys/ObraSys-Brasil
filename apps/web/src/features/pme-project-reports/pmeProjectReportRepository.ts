import {
  calculatePmeProjectCloseout,
  defaultPmeProjectCloseoutChecklist,
  generatePmeProjectReportHtml,
  sanitizePmeClientReportSnapshot,
  validateProjectCanBeClosed
} from "@obrasys/domain";

import { getPmeProject } from "../pme-projects/pmeProjectRepository";
import type { PmeProjectSnapshot } from "../pme-projects/pmeProjectUiTypes";
import type {
  GenerateReportInput,
  PmeProjectCloseout,
  PmeProjectCloseoutChecklistItem,
  PmeProjectCloseoutSnapshot,
  PmeProjectReport,
  PmeProjectReportExport,
  PmeProjectReportsSnapshot,
  PmeProjectReportSettings
} from "./pmeProjectReportTypes";

const reports: PmeProjectReport[] = [];
const exportsState: PmeProjectReportExport[] = [];
let closeoutState: PmeProjectCloseout | null = null;

const defaultSettings: PmeProjectReportSettings = {
  visibility: "internal",
  showInternalCosts: true,
  showProfit: true,
  showMargin: true,
  showPurchaseDetails: true,
  showSupplierNames: false,
  showPaymentStatus: true,
  showDailyLogs: true,
  showPhotos: true,
  showOccurrences: true,
  showPendingItems: true,
  showClientNotes: true,
  customIntroText: "",
  customFooterText: "Relatorio gerado pelo Obra Sys Brasil."
};

export async function listPmeProjectReports(projectId: string): Promise<PmeProjectReportsSnapshot> {
  const project = await getPmeProject(projectId);
  ensureSeedReports(project);

  return {
    projectId,
    projectName: project.project.name,
    clientName: project.project.clientName,
    canSeeProfit: project.canSeeProfit,
    reports: reports.filter((report) => report.dataSnapshot.project.id === projectId),
    settings: defaultSettings
  };
}

export async function getPmeProjectReportById(
  projectId: string,
  reportId: string
): Promise<PmeProjectReport> {
  await getPmeProject(projectId);
  const report = reports.find((item) => item.id === reportId);
  if (!report) {
    throw new Error("Relatorio nao encontrado.");
  }
  return structuredClone(report);
}

export async function generatePmeProjectReport(
  input: GenerateReportInput
): Promise<PmeProjectReport> {
  const project = await getPmeProject(input.projectId);
  const snapshot = buildReportSnapshot(project, input.reportType, input.visibility);
  const finalSnapshot =
    input.visibility === "client" ? sanitizePmeClientReportSnapshot(snapshot) : snapshot;
  const report: PmeProjectReport = {
    id: createId("report"),
    reportType: input.reportType,
    title: finalSnapshot.title,
    visibility: input.visibility,
    dataSnapshot: finalSnapshot,
    generatedAt: finalSnapshot.generatedAt
  };
  reports.unshift(report);
  return structuredClone(report);
}

export async function exportPmeProjectReport(
  projectId: string,
  reportId: string,
  exportType: "html" | "pdf" | "print_view"
): Promise<PmeProjectReportExport> {
  const report = await getPmeProjectReportById(projectId, reportId);
  const exported: PmeProjectReportExport = {
    id: createId("export"),
    reportId,
    exportType,
    htmlSnapshot: generatePmeProjectReportHtml(report.dataSnapshot),
    generatedAt: new Date().toISOString()
  };
  exportsState.unshift(exported);
  return structuredClone(exported);
}

export async function getPmeProjectCloseout(
  projectId: string
): Promise<PmeProjectCloseoutSnapshot> {
  const project = await getPmeProject(projectId);
  closeoutState = closeoutState ?? buildCloseout(project);
  return {
    projectId,
    projectName: project.project.name,
    clientName: project.project.clientName,
    canSeeProfit: project.canSeeProfit,
    closeout: structuredClone(closeoutState)
  };
}

export async function updatePmeProjectCloseoutChecklist(
  projectId: string,
  checklistItemId: string,
  status: "pending" | "completed" | "waived"
): Promise<PmeProjectCloseout> {
  await getPmeProject(projectId);
  const current = closeoutState ?? buildCloseout(await getPmeProject(projectId));
  current.checklist = current.checklist.map((item) =>
    item.id === checklistItemId ? { ...item, status } : item
  );
  const validationInput = {
    closeout: current.result,
    checklistItems: current.checklist,
    ...(current.closeoutNotes ? { closeoutNotes: current.closeoutNotes } : {})
  };
  const validation = validateProjectCanBeClosed(validationInput);
  closeoutState = {
    ...current,
    warnings: validation.warnings,
    blockingReasons: validation.blockingReasons
  };
  return structuredClone(closeoutState);
}

export async function closePmeProject(
  projectId: string,
  closeoutNotes: string
): Promise<PmeProjectCloseout> {
  const project = await getPmeProject(projectId);
  const current = closeoutState ?? buildCloseout(project);
  const validation = validateProjectCanBeClosed({
    closeout: current.result,
    checklistItems: current.checklist,
    closeoutNotes
  });
  if (!validation.canClose) {
    throw new Error(validation.blockingReasons.join(" "));
  }
  closeoutState = {
    ...current,
    status: "closed",
    closeoutNotes,
    warnings: validation.warnings,
    blockingReasons: [],
    closedAt: new Date().toISOString()
  };
  return structuredClone(closeoutState);
}

export async function reopenPmeProject(
  projectId: string,
  reason: string
): Promise<PmeProjectCloseout> {
  await getPmeProject(projectId);
  if (!reason.trim()) {
    throw new Error("Informe o motivo da reabertura.");
  }
  const current = closeoutState ?? buildCloseout(await getPmeProject(projectId));
  closeoutState = {
    ...current,
    status: "reopened",
    closeoutNotes: reason,
    reopenedAt: new Date().toISOString()
  };
  return structuredClone(closeoutState);
}

function ensureSeedReports(project: PmeProjectSnapshot): void {
  if (reports.some((report) => report.dataSnapshot.project.id === project.project.id)) {
    return;
  }
  const internal = buildReportSnapshot(project, "financial_summary", "management");
  const client = sanitizePmeClientReportSnapshot(
    buildReportSnapshot(project, "client_delivery", "client")
  );
  reports.push(
    {
      id: "report-financial-demo",
      reportType: "financial_summary",
      title: internal.title,
      visibility: "management",
      dataSnapshot: internal,
      generatedAt: internal.generatedAt
    },
    {
      id: "report-client-demo",
      reportType: "client_delivery",
      title: client.title,
      visibility: "client",
      dataSnapshot: client,
      generatedAt: client.generatedAt
    }
  );
}

function buildCloseout(project: PmeProjectSnapshot): PmeProjectCloseout {
  const result = calculatePmeProjectCloseout({
    plannedCosts: project.costForecasts.map((forecast) => ({
      amount: forecast.totalCost,
      ...(forecast.status ? { status: forecast.status } : {})
    })),
    actualCosts: project.actualCosts.map((cost) => ({
      amount: cost.amount,
      paymentStatus: cost.paymentStatus
    })),
    plannedReceivables: project.receivableForecasts.map((forecast) => ({
      amount: forecast.amount,
      status: forecast.status ?? "planned"
    })),
    receipts: project.receipts.map((receipt) => ({
      amount: receipt.amount,
      receiptStatus: receipt.receiptStatus
    })),
    tasks: project.tasks,
    purchases: project.purchases,
    occurrences: [],
    dailyLogs: project.dailyLogs,
    photosCount: project.photos.length,
    progressPercentage: project.project.progressPercentage
  });
  const checklist: PmeProjectCloseoutChecklistItem[] = defaultPmeProjectCloseoutChecklist.map(
    (item, index) => ({
      id: `check-${index + 1}`,
      title: item.title,
      description: item.description,
      itemType: item.itemType,
      isRequired: item.isRequired,
      status: index < 3 ? "completed" : "pending"
    })
  );
  const validation = validateProjectCanBeClosed({ closeout: result, checklistItems: checklist });

  return {
    id: "closeout-demo-1",
    status: "draft",
    result,
    checklist,
    warnings: validation.warnings,
    blockingReasons: validation.blockingReasons
  };
}

function buildReportSnapshot(
  project: PmeProjectSnapshot,
  reportType: GenerateReportInput["reportType"],
  visibility: GenerateReportInput["visibility"]
) {
  return {
    reportType,
    visibility,
    title: reportTitle(reportType),
    project: {
      id: project.project.id,
      name: project.project.name,
      clientName: project.project.clientName,
      workAddress: project.project.workAddress,
      status: project.project.status
    },
    financial: {
      plannedCost: project.financialSummary.plannedCost,
      actualCost: project.financialSummary.actualCost,
      plannedRevenue: project.financialSummary.plannedRevenue,
      receivedRevenue: project.financialSummary.receivedRevenue,
      pendingReceivables: project.financialSummary.pendingReceivables,
      expectedProfit: project.financialSummary.expectedProfit,
      actualProfit: project.financialSummary.actualProfit,
      profitVariance: project.financialSummary.profitVariance,
      costVariance: project.financialSummary.costVariance
    },
    operational: {
      progressPercentage: project.project.progressPercentage,
      completedTasks: project.tasks.filter((task) => task.status === "done").length,
      pendingTasks: project.tasks.filter((task) => task.status !== "done").length,
      dailyLogs: project.dailyLogs.length,
      photos: project.photos.length,
      openPurchases: project.purchases.filter((purchase) => purchase.status !== "delivered").length
    },
    purchases: project.purchases.map((purchase) => ({
      description: purchase.description,
      supplierName: purchase.supplierName,
      status: purchase.status,
      actualCost: purchase.actualTotalAmount,
      plannedCost: purchase.expectedTotalAmount
    })),
    receipts: project.receipts.map((receipt) => ({
      description: receipt.description,
      amount: receipt.amount,
      status: receipt.receiptStatus
    })),
    dailyLogs: project.dailyLogs.map((dailyLog) => ({
      logDate: dailyLog.logDate,
      status: dailyLog.status,
      workPerformed: dailyLog.workPerformed,
      clientNotes: dailyLog.clientNotes
    })),
    photos: project.photos.map((photo) => ({
      fileName: photo.fileName,
      fileUrl: photo.fileUrl,
      caption: photo.caption
    })),
    generatedAt: new Date().toISOString()
  };
}

function reportTitle(reportType: GenerateReportInput["reportType"]): string {
  const titles: Record<GenerateReportInput["reportType"], string> = {
    financial_summary: "Relatorio financeiro interno",
    operational_summary: "Relatorio operacional",
    purchases_summary: "Relatorio de compras e custos",
    receipts_summary: "Relatorio de recebimentos",
    daily_logs_summary: "Relatorio de diario e fotos",
    client_delivery: "Relatorio para cliente",
    closeout_internal: "Relatorio interno de fecho",
    closeout_client: "Relatorio de entrega para cliente"
  };
  return titles[reportType];
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}
