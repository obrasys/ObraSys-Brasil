export interface PmeProjectCostForecastInput {
  totalCost: string;
  status?: "planned" | "committed" | "realized" | "cancelled";
}

export interface PmeProjectReceivableForecastInput {
  amount: string;
  status?: "planned" | "invoiced" | "received" | "overdue" | "cancelled";
}

export interface PmeProjectActualCostInput {
  amount: string;
  paymentStatus: "pending" | "paid" | "cancelled";
}

export interface PmeProjectReceiptInput {
  amount: string;
  receiptStatus: "planned" | "invoiced" | "received" | "overdue" | "cancelled";
}

export interface PmeProjectFinancialSummaryInput {
  costForecasts: PmeProjectCostForecastInput[];
  receivableForecasts: PmeProjectReceivableForecastInput[];
  actualCosts: PmeProjectActualCostInput[];
  receipts: PmeProjectReceiptInput[];
}

export interface PmeProjectFinancialSummaryResult {
  plannedCost: string;
  actualCost: string;
  plannedRevenue: string;
  receivedRevenue: string;
  pendingReceivables: string;
  expectedProfit: string;
  actualProfit: string;
  profitVariance: string;
  costVariance: string;
  hasCostOverrun: boolean;
  hasOverdueReceivables: boolean;
}

export function calculatePmeProjectFinancialSummary(
  input: PmeProjectFinancialSummaryInput
): PmeProjectFinancialSummaryResult {
  const plannedCost = input.costForecasts
    .filter((forecast) => forecast.status !== "cancelled")
    .reduce((total, forecast) => total + parseMoney(forecast.totalCost), 0n);
  const actualCost = input.actualCosts
    .filter((cost) => cost.paymentStatus === "paid")
    .reduce((total, cost) => total + parseMoney(cost.amount), 0n);
  const plannedRevenue = input.receivableForecasts
    .filter((forecast) => forecast.status !== "cancelled")
    .reduce((total, forecast) => total + parseMoney(forecast.amount), 0n);
  const receivedRevenue = input.receipts
    .filter((receipt) => receipt.receiptStatus === "received")
    .reduce((total, receipt) => total + parseMoney(receipt.amount), 0n);
  const pendingReceivables = input.receivableForecasts
    .filter(
      (forecast) =>
        forecast.status === "planned" ||
        forecast.status === "invoiced" ||
        forecast.status === "overdue"
    )
    .reduce((total, forecast) => total + parseMoney(forecast.amount), 0n);
  const expectedProfit = plannedRevenue - plannedCost;
  const actualProfit = receivedRevenue - actualCost;
  const profitVariance = actualProfit - expectedProfit;
  const costVariance = actualCost - plannedCost;

  return {
    plannedCost: formatMoney(plannedCost),
    actualCost: formatMoney(actualCost),
    plannedRevenue: formatMoney(plannedRevenue),
    receivedRevenue: formatMoney(receivedRevenue),
    pendingReceivables: formatMoney(pendingReceivables),
    expectedProfit: formatSignedMoney(expectedProfit),
    actualProfit: formatSignedMoney(actualProfit),
    profitVariance: formatSignedMoney(profitVariance),
    costVariance: formatSignedMoney(costVariance),
    hasCostOverrun: actualCost > plannedCost && plannedCost > 0n,
    hasOverdueReceivables: input.receivableForecasts.some(
      (forecast) => forecast.status === "overdue"
    )
  };
}

export function assertCanEditDailyLog(status: "draft" | "completed" | "locked"): void {
  if (status === "locked") {
    throw new Error("Locked daily logs cannot be edited.");
  }
}

export function completePmeProjectTask(input: {
  status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
  completedAt?: string | null;
}): { status: "done"; progressPercentage: string; completedAt: string } {
  return {
    status: "done",
    progressPercentage: "100",
    completedAt: input.completedAt ?? new Date().toISOString()
  };
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
  const reais = absolute / 100n;
  const centavos = absolute % 100n;
  return `${negative ? "-" : ""}${reais}.${centavos.toString().padStart(2, "0")}`;
}
