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
  clientName: string;
  workAddress: string | null;
  description: string | null;
  status: ConvertiblePmeBudgetStatus;
  subtotalCost: string;
  overheadPercentage: string;
  taxPercentage: string;
  profitPercentage: string;
  discountAmount: string;
  finalPrice: string;
  validUntil: string | null;
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
  category: string | null;
  sourceType: string | null;
  description: string;
  unit: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  subtotalCost: string;
  finalPrice: string;
  totalCost: string;
  totalPrice: string;
  isOptional: boolean;
  showOnProposal: boolean;
  sortOrder: number;
}

export interface ConvertiblePmeMaterial {
  id: string;
  budgetItemId: string | null;
  description: string;
  unit: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  supplierName: string | null;
  purchaseStatus: string;
}

export interface ConvertiblePmeLabor {
  id: string;
  budgetItemId: string | null;
  laborType: string;
  roleName: string | null;
  unit: string;
  quantity: string;
  unitCost: string;
  days: string;
  totalCost: string;
  contractType: string;
}

export interface ConvertiblePmePaymentTerm {
  id: string;
  installmentNumber: number;
  description: string;
  dueOffsetDays: number;
  dueCondition: string | null;
  dueDate: string | null;
  amount: string | null;
  percentage: string | null;
  sortOrder: number;
}

export interface ConvertiblePmeSinapiSnapshot {
  id: string;
  budgetItemId: string;
  sinapiCode: string;
  sinapiDescription: string;
  uf: string;
  referenceMonth: number;
  referenceYear: number;
  regime: string;
  originalUnit: string;
  originalTotalCost: string;
  adaptedDescription: string;
  adaptedUnit: string;
  adaptedQuantity: string;
  adaptedUnitCost: string;
  adaptedUnitPrice: string;
  snapshotData: Record<string, unknown>;
}

export interface PmeBudgetConversionPlan {
  budget: ConvertiblePmeBudget;
  environments: ConvertiblePmeEnvironment[];
  items: ConvertiblePmeItem[];
  materials: ConvertiblePmeMaterial[];
  labor: ConvertiblePmeLabor[];
  paymentTerms: ConvertiblePmePaymentTerm[];
  sinapiSnapshots: ConvertiblePmeSinapiSnapshot[];
  calculation: PmeBudgetCalculationResult;
  project: PmeProjectInsert;
  budgetSnapshot: PmeProjectBudgetSnapshotInsert;
  initialCostForecast: PmeProjectCostForecast[];
  initialReceivablesForecast: PmeProjectReceivableForecast[];
  conversionLog: PmeBudgetConversionLogInsert;
  auditMetadata: Record<string, unknown>;
}

export interface PmeProjectInsert {
  organization_id: string;
  created_by: string;
  name: string;
  code: string;
  description: string;
  status: "planning";
  starts_on?: string | undefined;
  source_module: "pme_budget";
  source_id: string;
  work_address: string | null;
}

export interface PmeProjectBudgetSnapshotInsert {
  organization_id: string;
  project_id?: string;
  source_pme_budget_id: string;
  version_code: string;
  title: string;
  subtotal_cost: string;
  final_price: string;
  snapshot_data: Record<string, unknown>;
  created_by: string;
}

export interface PmeProjectCostForecast {
  organization_id: string;
  project_id?: string;
  source_pme_budget_id: string;
  source_budget_item_id: string | null;
  source_type: "item" | "material" | "labor" | "third_party" | "sinapi_snapshot" | "manual";
  description: string;
  category: string | null;
  quantity: string;
  unit: string;
  unit_cost: string;
  total_cost: string;
  expected_date: string | null;
  status: "planned";
}

export interface PmeProjectReceivableForecast {
  organization_id: string;
  project_id?: string;
  source_pme_budget_id: string;
  source_payment_term_id: string | null;
  installment_number: number;
  description: string;
  percentage: string | null;
  amount: string;
  due_condition: string;
  due_date: string | null;
  status: "planned";
}

export interface PmeBudgetConversionLogInsert {
  organization_id: string;
  budget_id: string;
  project_id?: string;
  converted_by: string;
  status: "success";
  source_budget_status: ConvertiblePmeBudgetStatus;
  source_budget_final_price: string;
  source_budget_subtotal_cost: string;
  snapshot_data: Record<string, unknown>;
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
  materials?: ConvertiblePmeMaterial[];
  labor?: ConvertiblePmeLabor[];
  paymentTerms: ConvertiblePmePaymentTerm[];
  sinapiSnapshots?: ConvertiblePmeSinapiSnapshot[];
  userId?: string;
  optionalProjectName?: string | undefined;
  optionalStartDate?: string | undefined;
  optionalNotes?: string | undefined;
}): PmeBudgetConversionPlan {
  assertPmeBudgetCanConvert(input.budget);

  const userId = input.userId ?? "";
  const materials = input.materials ?? [];
  const labor = input.labor ?? [];
  const sinapiSnapshots = input.sinapiSnapshots ?? [];
  const copiedItems = input.items.filter(shouldCopyItem);
  const calculationInput: PmeBudgetCalculationInput = {
    items: [
      ...copiedItems.map(toCalculationItem),
      ...materials.map(toMaterialCalculationItem),
      ...labor.map(toLaborCalculationItem)
    ],
    overheadPercentage: input.budget.overheadPercentage,
    taxPercentage: input.budget.taxPercentage,
    profitPercentage: input.budget.profitPercentage,
    discountAmount: input.budget.discountAmount
  };
  const calculation = calculatePmeBudget(calculationInput);
  const snapshotData = buildSnapshotData({
    budget: input.budget,
    environments: input.environments,
    items: copiedItems,
    materials,
    labor,
    paymentTerms: input.paymentTerms,
    sinapiSnapshots,
    calculation,
    optionalNotes: input.optionalNotes
  });
  const project = buildProjectInsertFromBudget({
    budget: input.budget,
    userId,
    optionalProjectName: input.optionalProjectName,
    optionalStartDate: input.optionalStartDate
  });
  const initialCostForecast = [
    ...copiedItems.map((item) =>
      toItemCostForecast(item, input.budget.organizationId, input.budget.id)
    ),
    ...materials.map((material) =>
      toMaterialCostForecast(material, input.budget.organizationId, input.budget.id)
    ),
    ...labor.map((entry) =>
      toLaborCostForecast(entry, input.budget.organizationId, input.budget.id)
    )
  ];
  const initialReceivablesForecast = buildReceivablesForecast({
    organizationId: input.budget.organizationId,
    budgetId: input.budget.id,
    paymentTerms: input.paymentTerms,
    finalPrice: calculation.finalPrice
  });

  return {
    budget: input.budget,
    environments: input.environments,
    items: copiedItems,
    materials,
    labor,
    paymentTerms: input.paymentTerms,
    sinapiSnapshots,
    calculation,
    project,
    budgetSnapshot: {
      organization_id: input.budget.organizationId,
      source_pme_budget_id: input.budget.id,
      version_code: `PME-${input.budget.budgetNumber}-CONVERTED`,
      title: input.budget.title,
      subtotal_cost: calculation.subtotalCost,
      final_price: calculation.finalPrice,
      snapshot_data: snapshotData,
      created_by: userId
    },
    initialCostForecast,
    initialReceivablesForecast,
    conversionLog: {
      organization_id: input.budget.organizationId,
      budget_id: input.budget.id,
      converted_by: userId,
      status: "success",
      source_budget_status: input.budget.status,
      source_budget_final_price: calculation.finalPrice,
      source_budget_subtotal_cost: calculation.subtotalCost,
      snapshot_data: snapshotData
    },
    auditMetadata: {
      budgetId: input.budget.id,
      budgetNumber: input.budget.budgetNumber,
      environments: input.environments,
      copiedItems,
      copiedMaterials: materials,
      copiedLabor: labor,
      paymentTerms: input.paymentTerms,
      sinapiSnapshots,
      initialCostForecast,
      initialReceivablesForecast,
      calculation
    }
  };
}

export function buildProjectInsertFromBudget(input: {
  budget: ConvertiblePmeBudget;
  userId: string;
  optionalProjectName?: string | undefined;
  optionalStartDate?: string | undefined;
}): PmeProjectInsert {
  const fallbackName = `Obra - ${input.budget.clientName}`;
  const name = input.optionalProjectName?.trim() || input.budget.title.trim() || fallbackName;

  return {
    organization_id: input.budget.organizationId,
    created_by: input.userId,
    name,
    code: `PME-${input.budget.budgetNumber}`,
    description: `Projeto criado a partir do orçamento PME ${input.budget.budgetNumber}.`,
    status: "planning",
    starts_on: normalizeOptionalDate(input.optionalStartDate),
    source_module: "pme_budget",
    source_id: input.budget.id,
    work_address: input.budget.workAddress
  };
}

export function attachProjectIdToConversionPlan(
  plan: PmeBudgetConversionPlan,
  projectId: string
): PmeBudgetConversionPlan {
  return {
    ...plan,
    budgetSnapshot: {
      ...plan.budgetSnapshot,
      project_id: projectId
    },
    initialCostForecast: plan.initialCostForecast.map((forecast) => ({
      ...forecast,
      project_id: projectId
    })),
    initialReceivablesForecast: plan.initialReceivablesForecast.map((forecast) => ({
      ...forecast,
      project_id: projectId
    })),
    conversionLog: {
      ...plan.conversionLog,
      project_id: projectId
    },
    auditMetadata: {
      ...plan.auditMetadata,
      projectId
    }
  };
}

function shouldCopyItem(item: ConvertiblePmeItem): boolean {
  return !item.isOptional;
}

function toCalculationItem(item: ConvertiblePmeItem): PmeBudgetCalculationItemInput {
  return {
    id: item.id,
    description: item.description,
    kind: toCalculationKind(item),
    quantity: item.quantity,
    unitCost: item.unitCost,
    unitPrice: item.unitPrice
  };
}

function toMaterialCalculationItem(
  material: ConvertiblePmeMaterial
): PmeBudgetCalculationItemInput {
  return {
    id: material.id,
    description: material.description,
    kind: "material",
    quantity: material.quantity,
    unitCost: material.unitCost,
    unitPrice: material.unitCost
  };
}

function toLaborCalculationItem(labor: ConvertiblePmeLabor): PmeBudgetCalculationItemInput {
  return {
    id: labor.id,
    description: labor.roleName ?? labor.laborType,
    kind: "mao_de_obra",
    quantity: labor.quantity,
    unitCost: labor.unitCost,
    unitPrice: labor.unitCost
  };
}

function toCalculationKind(item: ConvertiblePmeItem): PmeBudgetCalculationItemInput["kind"] {
  if (item.category === "material" || item.itemType === "material") {
    return "material";
  }

  if (item.category === "mao_de_obra" || item.itemType === "labor") {
    return "mao_de_obra";
  }

  if (item.category === "terceiro") {
    return "terceiro";
  }

  if (item.category === "equipamento" || item.itemType === "equipment") {
    return "equipamento";
  }

  if (item.category === "transporte") {
    return "transporte";
  }

  if (item.category === "descarte") {
    return "descarte";
  }

  if (item.category === "taxa") {
    return "taxa";
  }

  if (item.category === "outro" || item.itemType === "other") {
    return "outro";
  }

  return "servico";
}

function toItemCostForecast(
  item: ConvertiblePmeItem,
  organizationId: string,
  budgetId: string
): PmeProjectCostForecast {
  return {
    organization_id: organizationId,
    source_pme_budget_id: budgetId,
    source_budget_item_id: item.id,
    source_type: item.sourceType === "sinapi" ? "sinapi_snapshot" : "item",
    description: item.description,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    unit_cost: item.unitCost,
    total_cost: item.totalCost,
    expected_date: null,
    status: "planned"
  };
}

function toMaterialCostForecast(
  material: ConvertiblePmeMaterial,
  organizationId: string,
  budgetId: string
): PmeProjectCostForecast {
  return {
    organization_id: organizationId,
    source_pme_budget_id: budgetId,
    source_budget_item_id: material.budgetItemId,
    source_type: "material",
    description: material.description,
    category: "material",
    quantity: material.quantity,
    unit: material.unit,
    unit_cost: material.unitCost,
    total_cost: material.totalCost,
    expected_date: null,
    status: "planned"
  };
}

function toLaborCostForecast(
  labor: ConvertiblePmeLabor,
  organizationId: string,
  budgetId: string
): PmeProjectCostForecast {
  return {
    organization_id: organizationId,
    source_pme_budget_id: budgetId,
    source_budget_item_id: labor.budgetItemId,
    source_type: "labor",
    description: labor.roleName ?? labor.laborType,
    category: "mao_de_obra",
    quantity: labor.quantity,
    unit: labor.unit,
    unit_cost: labor.unitCost,
    total_cost: labor.totalCost,
    expected_date: null,
    status: "planned"
  };
}

function buildReceivablesForecast(input: {
  organizationId: string;
  budgetId: string;
  paymentTerms: ConvertiblePmePaymentTerm[];
  finalPrice: string;
}): PmeProjectReceivableForecast[] {
  if (input.paymentTerms.length === 0) {
    return [
      {
        organization_id: input.organizationId,
        source_pme_budget_id: input.budgetId,
        source_payment_term_id: null,
        installment_number: 1,
        description: "Recebimento do orçamento aprovado",
        percentage: "100",
        amount: input.finalPrice,
        due_condition: "na aprovacao",
        due_date: null,
        status: "planned"
      }
    ];
  }

  return input.paymentTerms.map((term) => ({
    organization_id: input.organizationId,
    source_pme_budget_id: input.budgetId,
    source_payment_term_id: term.id,
    installment_number: term.installmentNumber,
    description: term.description,
    percentage: term.percentage,
    amount: term.amount ?? calculatePercentageAmount(input.finalPrice, term.percentage ?? "0"),
    due_condition: term.dueCondition ?? `D+${term.dueOffsetDays}`,
    due_date: term.dueDate,
    status: "planned"
  }));
}

function buildSnapshotData(input: {
  budget: ConvertiblePmeBudget;
  environments: ConvertiblePmeEnvironment[];
  items: ConvertiblePmeItem[];
  materials: ConvertiblePmeMaterial[];
  labor: ConvertiblePmeLabor[];
  paymentTerms: ConvertiblePmePaymentTerm[];
  sinapiSnapshots: ConvertiblePmeSinapiSnapshot[];
  calculation: PmeBudgetCalculationResult;
  optionalNotes?: string | undefined;
}): Record<string, unknown> {
  return {
    convertedAtSource: new Date().toISOString(),
    optionalNotes: input.optionalNotes ?? null,
    budget: input.budget,
    environments: input.environments,
    items: input.items,
    materials: input.materials,
    labor: input.labor,
    paymentTerms: input.paymentTerms,
    sinapiSnapshots: input.sinapiSnapshots,
    calculation: input.calculation
  };
}

function normalizeOptionalDate(value: string | undefined): string | undefined {
  if (typeof value === "undefined" || value.trim().length === 0) {
    return undefined;
  }

  return value;
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
