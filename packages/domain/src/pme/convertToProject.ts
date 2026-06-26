import {
  calculatePmeBudget,
  type PmeBudgetCalculationInput,
  type PmeBudgetCalculationItemInput,
  type PmeBudgetCalculationResult
} from "./calculatePmeBudget.ts";

export type ConvertiblePmeBudgetStatus =
  | "draft"
  | "sent"
  | "negotiation"
  | "approved"
  | "rejected"
  | "converted_to_project"
  | "cancelled";

export interface ConvertiblePmeBudget {
  id: string;
  organizationId: string;
  budgetNumber: string;
  title: string;
  description: string | null;
  status: ConvertiblePmeBudgetStatus;
  subtotalCost: string;
  overheadPercentage: string;
  taxPercentage: string;
  profitPercentage: string;
  discountAmount: string;
  finalPrice: string;
  approvedAt: string | null;
  convertedProjectId: string | null;
}

export interface ConvertiblePmeEnvironment {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  subtotalCost: string;
  finalPrice: string;
}

export interface ConvertiblePmeItem {
  id: string;
  environmentId: string | null;
  itemType: "service" | "material" | "labor" | "equipment" | "other";
  description: string;
  unit: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  subtotalCost: string;
  finalPrice: string;
  isOptional: boolean;
  showOnProposal: boolean;
  sortOrder: number;
}

export interface ConvertiblePmePaymentTerm {
  id: string;
  description: string;
  dueOffsetDays: number;
  amount: string | null;
  percentage: string | null;
  sortOrder: number;
}

export interface PmeBudgetConversionPlan {
  budget: ConvertiblePmeBudget;
  environments: ConvertiblePmeEnvironment[];
  items: ConvertiblePmeItem[];
  paymentTerms: ConvertiblePmePaymentTerm[];
  calculation: PmeBudgetCalculationResult;
  initialCostForecast: PmeProjectCostForecast[];
  initialReceivablesForecast: PmeProjectReceivableForecast[];
}

export interface PmeProjectCostForecast {
  sourceBudgetItemId: string;
  description: string;
  unit: string;
  quantity: string;
  plannedCost: string;
  plannedSalePrice: string;
  environmentId: string | null;
}

export interface PmeProjectReceivableForecast {
  sourcePaymentTermId: string;
  description: string;
  dueOffsetDays: number;
  plannedAmount: string;
  percentage: string | null;
}

export function assertPmeBudgetCanConvert(budget: ConvertiblePmeBudget): void {
  if (budget.status === "converted_to_project" || budget.convertedProjectId !== null) {
    throw new Error("Budget has already been converted to project.");
  }

  if (budget.status !== "approved") {
    throw new Error("Only approved budgets can be converted to project.");
  }

  if (budget.approvedAt === null) {
    throw new Error("Approved budget must have approvedAt before conversion.");
  }
}

export function buildPmeBudgetConversionPlan(input: {
  budget: ConvertiblePmeBudget;
  environments: ConvertiblePmeEnvironment[];
  items: ConvertiblePmeItem[];
  paymentTerms: ConvertiblePmePaymentTerm[];
}): PmeBudgetConversionPlan {
  assertPmeBudgetCanConvert(input.budget);

  const calculationInput: PmeBudgetCalculationInput = {
    items: input.items.filter(shouldCopyItem).map(toCalculationItem),
    overheadPercentage: input.budget.overheadPercentage,
    taxPercentage: input.budget.taxPercentage,
    profitPercentage: input.budget.profitPercentage,
    discountAmount: input.budget.discountAmount
  };
  const calculation = calculatePmeBudget(calculationInput);

  return {
    budget: input.budget,
    environments: input.environments,
    items: input.items.filter(shouldCopyItem),
    paymentTerms: input.paymentTerms,
    calculation,
    initialCostForecast: input.items.filter(shouldCopyItem).map(toCostForecast),
    initialReceivablesForecast: input.paymentTerms.map((term) =>
      toReceivableForecast(term, calculation.finalPrice)
    )
  };
}

export function buildProjectInsertFromBudget(input: {
  budget: ConvertiblePmeBudget;
  userId: string;
}): {
  organization_id: string;
  created_by: string;
  name: string;
  code: string;
  description: string;
  status: "planning";
} {
  return {
    organization_id: input.budget.organizationId,
    created_by: input.userId,
    name: input.budget.title,
    code: `PME-${input.budget.budgetNumber}`,
    description: `Projeto criado a partir do orçamento PME ${input.budget.budgetNumber}.`,
    status: "planning"
  };
}

function shouldCopyItem(item: ConvertiblePmeItem): boolean {
  return !item.isOptional;
}

function toCalculationItem(item: ConvertiblePmeItem): PmeBudgetCalculationItemInput {
  return {
    id: item.id,
    description: item.description,
    kind: toCalculationKind(item.itemType),
    quantity: item.quantity,
    unitCost: item.unitCost,
    unitPrice: item.unitPrice
  };
}

function toCalculationKind(
  itemType: ConvertiblePmeItem["itemType"]
): PmeBudgetCalculationItemInput["kind"] {
  if (itemType === "material") {
    return "material";
  }

  if (itemType === "labor") {
    return "labor";
  }

  return "service";
}

function toCostForecast(item: ConvertiblePmeItem): PmeProjectCostForecast {
  return {
    sourceBudgetItemId: item.id,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    plannedCost: item.subtotalCost,
    plannedSalePrice: item.finalPrice,
    environmentId: item.environmentId
  };
}

function toReceivableForecast(
  term: ConvertiblePmePaymentTerm,
  finalPrice: string
): PmeProjectReceivableForecast {
  return {
    sourcePaymentTermId: term.id,
    description: term.description,
    dueOffsetDays: term.dueOffsetDays,
    plannedAmount: term.amount ?? calculatePercentageAmount(finalPrice, term.percentage ?? "0"),
    percentage: term.percentage
  };
}

function calculatePercentageAmount(amount: string, percentage: string): string {
  const amountCents = parseMoney(amount);
  const percentageUnits = parseScaledDecimal(percentage, 4);
  const cents = divideRounded(amountCents * percentageUnits, 100n * 10_000n);
  return formatMoney(cents);
}

function parseMoney(value: string): bigint {
  return parseScaledDecimal(value, 2);
}

function parseScaledDecimal(value: string, scale: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Expected non-negative decimal string.");
  }

  const [integerPart, decimalPart = ""] = value.split(".");
  if (decimalPart.length > scale) {
    throw new Error(`Expected decimal string with at most ${scale} decimal places.`);
  }

  return BigInt(integerPart + decimalPart.padEnd(scale, "0"));
}

function divideRounded(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder * 2n >= divisor ? quotient + 1n : quotient;
}

function formatMoney(cents: bigint): string {
  const reais = cents / 100n;
  const centavos = cents % 100n;
  return `${reais}.${centavos.toString().padStart(2, "0")}`;
}
