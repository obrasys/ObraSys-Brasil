import type { PmeBudgetFormValues, PmeBudgetStatus } from "./pmeBudgetSchemas";

export interface PmeBudgetSummary {
  id: string;
  budgetNumber: string;
  title: string;
  clientName: string;
  responsibleName: string;
  status: PmeBudgetStatus;
  validUntil: string;
  finalPrice: string;
  subtotalCost: string;
  createdAt: string;
  updatedAt: string;
}

export interface PmeBudgetRecord extends PmeBudgetFormValues {
  id: string;
  convertedProjectId: string | null;
  subtotalCost: string;
  subtotalPrice: string;
  overheadAmount: string;
  taxAmount: string;
  profitAmount: string;
  finalPrice: string;
  createdAt: string;
  updatedAt: string;
  responsibleName: string;
}

export interface PmeBudgetFilters {
  status: "all" | PmeBudgetStatus;
  client: string;
  period: "all" | "valid" | "expired";
  query: string;
}

export interface PmeBudgetCalculationPreview {
  subtotalCost: string;
  subtotalPrice: string;
  overheadAmount: string;
  taxAmount: string;
  profitAmount: string;
  discountAmount: string;
  finalPrice: string;
}

export interface PmeCatalogPickerEntry {
  id: string;
  name: string;
  description: string;
  category: PmeBudgetFormValues["items"][number]["category"];
  type: "item" | "composition" | "kit";
  unit: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  isActive: boolean;
  items?: Array<{
    description: string;
    category: PmeBudgetFormValues["items"][number]["category"];
    unit: string;
    quantity: string;
    unitCost: string;
    unitPrice: string;
  }>;
}

export type PmeBudgetEditorTab =
  | "summary"
  | "environments"
  | "items"
  | "materials"
  | "labor"
  | "pricing"
  | "payment"
  | "axia";
