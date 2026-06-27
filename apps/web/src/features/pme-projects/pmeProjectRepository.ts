import { calculatePmeProjectFinancialSummary } from "@obrasys/domain";

import type {
  PmeProjectActualCost,
  PmeProjectDailyLog,
  PmeProjectMutationResult,
  PmeProjectPhoto,
  PmeProjectPurchase,
  PmeProjectReceipt,
  PmeProjectSnapshot,
  PmeProjectStage,
  PmeProjectTask
} from "./pmeProjectUiTypes";
import { toActualCostInput, toReceiptInput } from "./pmeProjectUiTypes";

const today = "2026-06-27";

const state: PmeProjectSnapshot = {
  project: {
    id: "project-demo-1",
    name: "Reforma do apartamento - Cliente Silva",
    clientName: "Mariana Silva",
    workAddress: "Rua das Palmeiras, 120 - Sao Paulo/SP",
    status: "active",
    progressPercentage: "35",
    sourcePmeBudgetId: "budget-approved-1"
  },
  stages: [
    {
      id: "stage-1",
      name: "Banheiro",
      description: "Demolicao, hidraulica, revestimento e acabamento.",
      progressPercentage: "45",
      status: "in_progress",
      sortOrder: 1
    }
  ],
  tasks: [
    {
      id: "task-1",
      stageId: "stage-1",
      title: "Impermeabilizar box",
      description: "Aplicar impermeabilizante antes do revestimento.",
      responsibleName: "Carlos",
      plannedEndDate: "2026-07-02",
      progressPercentage: "60",
      status: "in_progress",
      priority: "high"
    },
    {
      id: "task-2",
      title: "Comprar revestimento",
      progressPercentage: "0",
      status: "blocked",
      priority: "urgent",
      responsibleName: "Equipe compras"
    }
  ],
  purchases: [
    {
      id: "purchase-1",
      supplierName: "Dep. Central",
      description: "Revestimento banheiro",
      status: "quoted",
      expectedTotalAmount: "1800.00",
      actualTotalAmount: "0.00",
      expectedDeliveryDate: "2026-07-01",
      sourceType: "budget_material"
    }
  ],
  actualCosts: [
    {
      id: "cost-1",
      costType: "material",
      description: "Argamassa e rejunte",
      amount: "420.00",
      paymentStatus: "paid",
      paymentDate: today,
      supplierName: "Dep. Central"
    }
  ],
  receipts: [
    {
      id: "receipt-1",
      description: "Entrada da obra",
      amount: "5000.00",
      receiptStatus: "received",
      dueDate: "2026-06-20",
      receivedAt: "2026-06-20",
      paymentMethod: "PIX"
    },
    {
      id: "receipt-2",
      description: "Parcela intermediaria",
      amount: "4000.00",
      receiptStatus: "overdue",
      dueDate: "2026-06-25"
    }
  ],
  dailyLogs: [
    {
      id: "log-1",
      logDate: today,
      weatherMorning: "Sol",
      weatherAfternoon: "Nublado",
      laborCount: 3,
      workPerformed: "Preparacao do banheiro e revisao de pontos hidraulicos.",
      nextSteps: "Finalizar impermeabilizacao.",
      photosCount: 1,
      status: "completed"
    }
  ],
  photos: [
    {
      id: "photo-1",
      fileUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640",
      fileName: "banheiro-andamento.jpg",
      caption: "Preparacao do banheiro",
      takenAt: today
    }
  ],
  costForecasts: [
    { totalCost: "8500.00", status: "planned" },
    { totalCost: "2500.00", status: "planned" }
  ],
  receivableForecasts: [
    { amount: "5000.00", status: "received" },
    { amount: "4000.00", status: "overdue" },
    { amount: "6000.00", status: "planned" }
  ],
  financialSummary: calculatePmeProjectFinancialSummary({
    costForecasts: [],
    receivableForecasts: [],
    actualCosts: [],
    receipts: []
  }),
  canSeeProfit: true
};

export async function listPmeProjects(): Promise<PmeProjectSnapshot["project"][]> {
  return [cloneSnapshot().project];
}

export async function getPmeProject(projectId: string): Promise<PmeProjectSnapshot> {
  if (projectId !== state.project.id) {
    throw new Error("Obra nao encontrada.");
  }

  return cloneSnapshot();
}

export async function createPmeProjectStage(
  projectId: string,
  stage: Omit<PmeProjectStage, "id">
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  const created = { ...stage, id: createId("stage") };
  state.stages.push(created);
  return { id: created.id };
}

export async function updatePmeProjectStage(
  projectId: string,
  stage: PmeProjectStage
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  replaceById(state.stages, stage);
  return { id: stage.id };
}

export async function createPmeProjectTask(
  projectId: string,
  task: Omit<PmeProjectTask, "id">
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  const created = { ...task, id: createId("task") };
  state.tasks.push(created);
  return { id: created.id };
}

export async function updatePmeProjectTask(
  projectId: string,
  task: PmeProjectTask
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  replaceById(state.tasks, task);
  return { id: task.id };
}

export async function completePmeProjectTask(projectId: string, taskId: string): Promise<void> {
  ensureProject(projectId);
  state.tasks = state.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status: "done",
          progressPercentage: "100",
          completedAt: new Date().toISOString()
        }
      : task
  );
}

export async function createPmeProjectPurchase(
  projectId: string,
  purchase: Omit<PmeProjectPurchase, "id">
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  const created = { ...purchase, id: createId("purchase") };
  state.purchases.push(created);
  return { id: created.id };
}

export async function createPmeProjectActualCost(
  projectId: string,
  cost: Omit<PmeProjectActualCost, "id">
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  const created = { ...cost, id: createId("cost") };
  state.actualCosts.push(created);
  return { id: created.id };
}

export async function createPmeProjectReceipt(
  projectId: string,
  receipt: Omit<PmeProjectReceipt, "id">
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  const created = { ...receipt, id: createId("receipt") };
  state.receipts.push(created);
  return { id: created.id };
}

export async function createPmeProjectDailyLog(
  projectId: string,
  dailyLog: Omit<PmeProjectDailyLog, "id">
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  const created = { ...dailyLog, id: createId("log") };
  state.dailyLogs.push(created);
  return { id: created.id };
}

export async function lockPmeProjectDailyLog(projectId: string, dailyLogId: string): Promise<void> {
  ensureProject(projectId);
  state.dailyLogs = state.dailyLogs.map((dailyLog) =>
    dailyLog.id === dailyLogId ? { ...dailyLog, status: "locked" } : dailyLog
  );
}

export async function uploadPmeProjectPhoto(
  projectId: string,
  photo: Omit<PmeProjectPhoto, "id">
): Promise<PmeProjectMutationResult> {
  ensureProject(projectId);
  const created = { ...photo, id: createId("photo") };
  state.photos.push(created);
  return { id: created.id };
}

function cloneSnapshot(): PmeProjectSnapshot {
  const snapshot = structuredClone(state);
  snapshot.financialSummary = calculatePmeProjectFinancialSummary({
    costForecasts: snapshot.costForecasts,
    receivableForecasts: snapshot.receivableForecasts,
    actualCosts: snapshot.actualCosts.map(toActualCostInput),
    receipts: snapshot.receipts.map(toReceiptInput)
  });
  return snapshot;
}

function ensureProject(projectId: string): void {
  if (projectId !== state.project.id) {
    throw new Error("Obra nao encontrada.");
  }
}

function replaceById<TItem extends { id: string }>(items: TItem[], item: TItem): void {
  const index = items.findIndex((current) => current.id === item.id);
  if (index === -1) {
    items.push(item);
    return;
  }

  items[index] = item;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}
