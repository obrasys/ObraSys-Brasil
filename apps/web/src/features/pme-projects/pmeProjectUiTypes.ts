import type {
  PmeProjectActualCostInput,
  PmeProjectCostForecastInput,
  PmeProjectFinancialSummaryResult,
  PmeProjectReceivableForecastInput,
  PmeProjectReceiptInput
} from "@obrasys/domain";

import type {
  pmeProjectActualCostSchema,
  pmeProjectDailyLogSchema,
  pmeProjectPhotoSchema,
  pmeProjectPurchaseSchema,
  pmeProjectReceiptSchema,
  pmeProjectStageSchema,
  pmeProjectTaskSchema
} from "./pmeProjectSchemas";
import type { z } from "zod";

export type PmeProjectStage = z.infer<typeof pmeProjectStageSchema>;
export type PmeProjectTask = z.infer<typeof pmeProjectTaskSchema>;
export type PmeProjectPurchase = z.infer<typeof pmeProjectPurchaseSchema>;
export type PmeProjectActualCost = z.infer<typeof pmeProjectActualCostSchema>;
export type PmeProjectReceipt = z.infer<typeof pmeProjectReceiptSchema>;
export type PmeProjectDailyLog = z.infer<typeof pmeProjectDailyLogSchema>;
export type PmeProjectPhoto = z.infer<typeof pmeProjectPhotoSchema>;

export interface PmeProjectSummary {
  id: string;
  name: string;
  clientName: string;
  workAddress: string;
  status: "planned" | "active" | "paused" | "completed" | "cancelled";
  progressPercentage: string;
  sourcePmeBudgetId?: string;
}

export interface PmeProjectSnapshot {
  project: PmeProjectSummary;
  stages: PmeProjectStage[];
  tasks: PmeProjectTask[];
  purchases: PmeProjectPurchase[];
  actualCosts: PmeProjectActualCost[];
  receipts: PmeProjectReceipt[];
  dailyLogs: PmeProjectDailyLog[];
  photos: PmeProjectPhoto[];
  costForecasts: PmeProjectCostForecastInput[];
  receivableForecasts: PmeProjectReceivableForecastInput[];
  financialSummary: PmeProjectFinancialSummaryResult;
  canSeeProfit: boolean;
}

export interface PmeProjectMutationResult {
  id: string;
}

export function toActualCostInput(cost: PmeProjectActualCost): PmeProjectActualCostInput {
  return { amount: cost.amount, paymentStatus: cost.paymentStatus };
}

export function toReceiptInput(receipt: PmeProjectReceipt): PmeProjectReceiptInput {
  return { amount: receipt.amount, receiptStatus: receipt.receiptStatus };
}
