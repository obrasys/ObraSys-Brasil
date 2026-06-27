export type PmeProjectReportType =
  | "financial_summary"
  | "operational_summary"
  | "purchases_summary"
  | "receipts_summary"
  | "daily_logs_summary"
  | "client_delivery"
  | "closeout_internal"
  | "closeout_client";

export type PmeProjectReportVisibility = "internal" | "client" | "management";
export type PmeProjectCloseoutStatus =
  | "draft"
  | "ready_to_close"
  | "closed"
  | "reopened"
  | "cancelled";
export type PmeProjectCloseoutChecklistStatus = "pending" | "completed" | "waived";
export type PmeProjectCloseoutChecklistItemType =
  | "financeiro"
  | "operacional"
  | "cliente"
  | "documentos"
  | "fotos"
  | "compras"
  | "recebimentos"
  | "qualidade"
  | "outro";

export interface PmeProjectCloseoutMoneyInput {
  amount: string;
  status?: string;
}

export interface PmeProjectCloseoutTaskInput {
  status: "todo" | "in_progress" | "blocked" | "done" | "cancelled";
}

export interface PmeProjectCloseoutPurchaseInput {
  status: "planned" | "quoted" | "ordered" | "partially_delivered" | "delivered" | "cancelled";
}

export interface PmeProjectCloseoutOccurrenceInput {
  severity: "low" | "medium" | "high" | "critical";
  resolved?: boolean;
}

export interface PmeProjectCloseoutDailyLogInput {
  status:
    | "draft"
    | "in_review"
    | "completed"
    | "locked"
    | "cancelled"
    | "draft"
    | "completed"
    | "locked";
  logDate?: string;
}

export interface PmeProjectCloseoutInput {
  plannedCosts: PmeProjectCloseoutMoneyInput[];
  actualCosts: Array<
    PmeProjectCloseoutMoneyInput & { paymentStatus: "pending" | "paid" | "cancelled" }
  >;
  plannedReceivables: Array<
    PmeProjectCloseoutMoneyInput & {
      status: "planned" | "invoiced" | "received" | "overdue" | "cancelled";
    }
  >;
  receipts: Array<
    PmeProjectCloseoutMoneyInput & {
      receiptStatus: "planned" | "invoiced" | "received" | "overdue" | "cancelled";
    }
  >;
  tasks: PmeProjectCloseoutTaskInput[];
  purchases: PmeProjectCloseoutPurchaseInput[];
  occurrences: PmeProjectCloseoutOccurrenceInput[];
  dailyLogs: PmeProjectCloseoutDailyLogInput[];
  photosCount: number;
  progressPercentage?: string;
}

export interface PmeProjectCloseoutResult {
  plannedCost: string;
  actualCost: string;
  pendingCosts: string;
  plannedRevenue: string;
  receivedRevenue: string;
  pendingReceivables: string;
  expectedProfit: string;
  actualProfit: string;
  profitVariance: string;
  costVariance: string;
  costVariancePercentage: string;
  receivedPercentage: string;
  progressPercentage: string;
  completedTasksCount: number;
  pendingTasksCount: number;
  unresolvedOccurrencesCount: number;
  openPurchasesCount: number;
  unpaidCostsCount: number;
  overdueReceiptsCount: number;
}

export interface PmeProjectCloseoutChecklistTemplateItem {
  title: string;
  description: string;
  itemType: PmeProjectCloseoutChecklistItemType;
  isRequired: boolean;
}

export interface PmeProjectCloseoutValidationInput {
  closeout: PmeProjectCloseoutResult;
  checklistItems: Array<{ status: PmeProjectCloseoutChecklistStatus; isRequired: boolean }>;
  closeoutNotes?: string;
}

export interface PmeProjectCloseoutValidationResult {
  canClose: boolean;
  requiresJustification: boolean;
  warnings: string[];
  blockingReasons: string[];
}

export interface PmeProjectReportSettings {
  showInternalCosts: boolean;
  showProfit: boolean;
  showMargin: boolean;
  showPurchaseDetails: boolean;
  showSupplierNames: boolean;
  showPaymentStatus: boolean;
  showDailyLogs: boolean;
  showPhotos: boolean;
  showOccurrences: boolean;
  showPendingItems: boolean;
  showClientNotes: boolean;
  customIntroText?: string | null;
  customFooterText?: string | null;
}

export interface PmeProjectReportSnapshot {
  reportType: PmeProjectReportType;
  visibility: PmeProjectReportVisibility;
  title: string;
  project: Record<string, unknown>;
  financial: Record<string, unknown>;
  operational: Record<string, unknown>;
  purchases: Array<Record<string, unknown>>;
  receipts: Array<Record<string, unknown>>;
  dailyLogs: Array<Record<string, unknown>>;
  photos: Array<Record<string, unknown>>;
  checklist?: Array<Record<string, unknown>>;
  notes?: string | null;
  generatedAt: string;
}

const CLIENT_FORBIDDEN_KEYS = new Set([
  "actual_cost",
  "actualCost",
  "planned_cost",
  "plannedCost",
  "unit_cost",
  "unitCost",
  "total_cost",
  "totalCost",
  "margin",
  "marginPercentage",
  "profit",
  "expectedProfit",
  "actualProfit",
  "profitVariance",
  "costVariance",
  "supplierName",
  "supplier_name",
  "internalNotes",
  "internal_notes",
  "auditLogs",
  "audit_logs"
]);

export const defaultPmeProjectCloseoutChecklist: PmeProjectCloseoutChecklistTemplateItem[] = [
  {
    title: "Todos os custos principais foram lancados.",
    description: "Confirme materiais, mao de obra, terceiros e ajustes relevantes.",
    itemType: "financeiro",
    isRequired: true
  },
  {
    title: "Todas as compras foram conferidas.",
    description: "Verifique pedidos abertos, entregas e comprovativos.",
    itemType: "compras",
    isRequired: true
  },
  {
    title: "Todos os recebimentos foram verificados.",
    description: "Confira parcelas recebidas, vencidas e saldo a receber.",
    itemType: "recebimentos",
    isRequired: true
  },
  {
    title: "Pendencias com cliente foram registadas.",
    description: "Registre o que ficou combinado antes de encerrar.",
    itemType: "cliente",
    isRequired: true
  },
  {
    title: "Fotos finais foram anexadas.",
    description: "Inclua fotos principais da entrega.",
    itemType: "fotos",
    isRequired: false
  },
  {
    title: "Diario final foi concluido.",
    description: "Confira se o ultimo diario esta concluido ou bloqueado.",
    itemType: "documentos",
    isRequired: false
  },
  {
    title: "Tarefas principais foram concluidas.",
    description: "Revise tarefas abertas ou canceladas.",
    itemType: "operacional",
    isRequired: true
  },
  {
    title: "Ocorrencias criticas foram resolvidas ou justificadas.",
    description: "Nenhuma ocorrencia critica deve ficar sem explicacao.",
    itemType: "qualidade",
    isRequired: true
  },
  {
    title: "Relatorio interno foi gerado.",
    description: "Guarde a versao interna com resultado da obra.",
    itemType: "documentos",
    isRequired: true
  },
  {
    title: "Relatorio para cliente foi gerado, se aplicavel.",
    description: "Use apenas dados seguros para o cliente.",
    itemType: "cliente",
    isRequired: false
  }
];

export function calculatePmeProjectCloseout(
  input: PmeProjectCloseoutInput
): PmeProjectCloseoutResult {
  const plannedCost = sumMoney(
    input.plannedCosts.filter((row) => row.status !== "cancelled").map((row) => row.amount)
  );
  const actualCost = sumMoney(
    input.actualCosts.filter((row) => row.paymentStatus === "paid").map((row) => row.amount)
  );
  const pendingCosts = sumMoney(
    input.actualCosts.filter((row) => row.paymentStatus === "pending").map((row) => row.amount)
  );
  const plannedRevenue = sumMoney(
    input.plannedReceivables.filter((row) => row.status !== "cancelled").map((row) => row.amount)
  );
  const receivedRevenue = sumMoney(
    input.receipts.filter((row) => row.receiptStatus === "received").map((row) => row.amount)
  );
  const pendingReceivables = sumMoney(
    input.plannedReceivables
      .filter(
        (row) => row.status === "planned" || row.status === "invoiced" || row.status === "overdue"
      )
      .map((row) => row.amount)
  );
  const expectedProfit = plannedRevenue - plannedCost;
  const actualProfit = receivedRevenue - actualCost;
  const completedTasksCount = input.tasks.filter((task) => task.status === "done").length;
  const pendingTasksCount = input.tasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress" || task.status === "blocked"
  ).length;
  const totalTasksCount = input.tasks.filter((task) => task.status !== "cancelled").length;
  const progress =
    input.progressPercentage ??
    (totalTasksCount === 0 ? "0.00" : formatRatio(completedTasksCount, totalTasksCount));

  return {
    plannedCost: formatMoney(plannedCost),
    actualCost: formatMoney(actualCost),
    pendingCosts: formatMoney(pendingCosts),
    plannedRevenue: formatMoney(plannedRevenue),
    receivedRevenue: formatMoney(receivedRevenue),
    pendingReceivables: formatMoney(pendingReceivables),
    expectedProfit: formatSignedMoney(expectedProfit),
    actualProfit: formatSignedMoney(actualProfit),
    profitVariance: formatSignedMoney(actualProfit - expectedProfit),
    costVariance: formatSignedMoney(actualCost - plannedCost),
    costVariancePercentage:
      plannedCost > 0n ? formatPercent(actualCost - plannedCost, plannedCost) : "0.00",
    receivedPercentage:
      plannedRevenue > 0n ? formatPercent(receivedRevenue, plannedRevenue) : "0.00",
    progressPercentage: normalizePercent(progress),
    completedTasksCount,
    pendingTasksCount,
    unresolvedOccurrencesCount: input.occurrences.filter(
      (occurrence) => occurrence.severity === "critical" && occurrence.resolved !== true
    ).length,
    openPurchasesCount: input.purchases.filter(
      (purchase) =>
        purchase.status === "planned" ||
        purchase.status === "quoted" ||
        purchase.status === "ordered" ||
        purchase.status === "partially_delivered"
    ).length,
    unpaidCostsCount: input.actualCosts.filter((cost) => cost.paymentStatus === "pending").length,
    overdueReceiptsCount: input.plannedReceivables.filter((row) => row.status === "overdue").length
  };
}

export function validateProjectCanBeClosed(
  input: PmeProjectCloseoutValidationInput
): PmeProjectCloseoutValidationResult {
  const warnings: string[] = [];
  const blockingReasons: string[] = [];

  if (input.closeout.pendingTasksCount > 0) {
    warnings.push("Existem tarefas abertas.");
  }
  if (input.closeout.overdueReceiptsCount > 0) {
    warnings.push("Existem recebimentos vencidos.");
  }
  if (input.closeout.openPurchasesCount > 0) {
    warnings.push("Existem compras nao entregues ou abertas.");
  }
  if (input.closeout.unpaidCostsCount > 0) {
    warnings.push("Existem custos pendentes.");
  }
  if (input.closeout.unresolvedOccurrencesCount > 0) {
    warnings.push("Existem ocorrencias criticas nao resolvidas.");
  }

  const requiredPending = input.checklistItems.filter(
    (item) => item.isRequired && item.status === "pending"
  );
  if (requiredPending.length > 0) {
    blockingReasons.push("Checklist obrigatorio ainda tem itens pendentes.");
  }

  const requiresJustification = warnings.length > 0 || blockingReasons.length > 0;
  if (requiresJustification && !input.closeoutNotes?.trim()) {
    blockingReasons.push("Informe uma justificativa para fechar com pendencias.");
  }

  return {
    canClose: blockingReasons.length === 0,
    requiresJustification,
    warnings,
    blockingReasons
  };
}

export function assertClientReportSettings(settings: PmeProjectReportSettings): void {
  if (settings.showInternalCosts || settings.showProfit || settings.showMargin) {
    throw new Error("Client reports cannot show internal costs, profit or margin.");
  }
}

export function sanitizePmeClientReportSnapshot(
  snapshot: PmeProjectReportSnapshot
): PmeProjectReportSnapshot {
  const sanitized = sanitizeUnknown(snapshot) as PmeProjectReportSnapshot;
  return {
    ...sanitized,
    visibility: "client",
    financial: {},
    purchases: sanitized.purchases.map((purchase) => ({
      description: purchase.description,
      status: purchase.status
    }))
  };
}

export function generatePmeProjectReportHtml(snapshot: PmeProjectReportSnapshot): string {
  const financialRows = renderKeyValueList(snapshot.financial);
  const operationalRows = renderKeyValueList(snapshot.operational);
  const photos = snapshot.photos
    .map(
      (photo) => `<li>${escapeHtml(String(photo.caption ?? photo.fileName ?? "Foto da obra"))}</li>`
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>${escapeHtml(snapshot.title)}</title></head>
<body>
  <header>
    <h1>${escapeHtml(snapshot.title)}</h1>
    <p>Relatorio gerado pelo Obra Sys Brasil</p>
  </header>
  <section><h2>Resumo financeiro</h2>${financialRows}</section>
  <section><h2>Resumo operacional</h2>${operationalRows}</section>
  <section><h2>Fotos</h2><ul>${photos || "<li>Sem fotos anexadas</li>"}</ul></section>
  <footer><p>Gerado em ${escapeHtml(snapshot.generatedAt)}</p></footer>
</body>
</html>`;
}

function sanitizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeUnknown);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (!CLIENT_FORBIDDEN_KEYS.has(key)) {
        result[key] = sanitizeUnknown(child);
      }
    }
    return result;
  }
  return value;
}

function renderKeyValueList(values: Record<string, unknown>): string {
  const rows = Object.entries(values)
    .map(
      ([key, value]) => `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value))}</li>`
    )
    .join("");
  return `<ul>${rows || "<li>Nao informado</li>"}</ul>`;
}

function sumMoney(values: string[]): bigint {
  return values.reduce((total, value) => total + parseMoney(value), 0n);
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

function formatRatio(part: number, total: number): string {
  return ((part / total) * 100).toFixed(2);
}

function formatPercent(numerator: bigint, denominator: bigint): string {
  return (Number(numerator * 10000n) / Number(denominator) / 100).toFixed(2);
}

function normalizePercent(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "0.00";
  }
  return Math.min(100, Math.max(0, parsed)).toFixed(2);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
