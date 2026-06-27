import { calculatePmeBudget, type PmeBudgetCalculationItemInput } from "./calculatePmeBudget.ts";

export type PmeCatalogCategory =
  | "material"
  | "mao_de_obra"
  | "servico"
  | "terceiro"
  | "equipamento"
  | "transporte"
  | "descarte"
  | "taxa"
  | "composicao"
  | "outro";

export type PmeCatalogItemType =
  | "material"
  | "labor"
  | "service"
  | "third_party"
  | "equipment"
  | "transport"
  | "disposal"
  | "fee"
  | "other";

export type PmeCatalogSourceType =
  | "manual"
  | "sinapi"
  | "supplier_quote"
  | "axia_suggestion"
  | "imported"
  | "budget_item";

export type PmeCatalogOrigin = "manual" | "sinapi" | "supplier_quote" | "axia_suggestion";

export type PmeCatalogKitType =
  | "reforma_banheiro"
  | "reforma_cozinha"
  | "pintura"
  | "troca_piso"
  | "reforma_apartamento"
  | "eletrica"
  | "hidraulica"
  | "gesso_drywall"
  | "telhado"
  | "area_externa"
  | "manutencao"
  | "personalizado";

export type PmeCatalogJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: PmeCatalogJson | undefined }
  | PmeCatalogJson[];

export interface PmeCatalogItemListQuery {
  table: "pme_catalog_items";
  organizationId: string;
  includeInactive: boolean;
  category?: PmeCatalogCategory;
  itemType?: PmeCatalogItemType;
  sourceType?: PmeCatalogSourceType;
  origin?: PmeCatalogOrigin;
  search?: string;
}

export interface PmeCatalogItemCreateInput {
  organizationId: string;
  createdBy: string;
  name: string;
  category?: PmeCatalogCategory;
  itemType?: PmeCatalogItemType;
  description?: string | null;
  sourceType?: PmeCatalogSourceType;
  origin?: PmeCatalogOrigin;
  unit?: string;
  defaultUnitCost?: string;
  defaultUnitPrice?: string;
  defaultMarginPercentage?: string;
  unitCost?: string;
  unitPrice?: string;
  supplierName?: string | null;
  sourceReference?: string | null;
  sourceReferenceId?: string | null;
  sinapiCode?: string | null;
  uf?: string | null;
  referenceMonth?: number | null;
  referenceYear?: number | null;
  metadata?: PmeCatalogJson;
}

export interface PmeCatalogItemCreatePayload {
  [key: string]: unknown;
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  item_type: PmeCatalogItemType;
  category: PmeCatalogCategory;
  origin: PmeCatalogOrigin;
  source_type: PmeCatalogSourceType;
  source_reference_id: string | null;
  sinapi_code: string | null;
  uf: string | null;
  reference_month: number | null;
  reference_year: number | null;
  unit: string;
  unit_cost: string;
  unit_price: string;
  default_unit_cost: string;
  default_unit_price: string;
  default_margin_percentage: string;
  supplier_name: string | null;
  source_reference: string | null;
  metadata: PmeCatalogJson;
  is_active: true;
}

export interface PmeCatalogItemUpdateInput {
  id: string;
  organizationId: string;
  updatedBy: string;
  name?: string;
  description?: string | null;
  category?: PmeCatalogCategory;
  itemType?: PmeCatalogItemType;
  sourceType?: PmeCatalogSourceType;
  origin?: PmeCatalogOrigin;
  unit?: string;
  defaultUnitCost?: string;
  defaultUnitPrice?: string;
  defaultMarginPercentage?: string;
  unitCost?: string;
  unitPrice?: string;
  supplierName?: string | null;
  sourceReference?: string | null;
  sourceReferenceId?: string | null;
  sinapiCode?: string | null;
  uf?: string | null;
  referenceMonth?: number | null;
  referenceYear?: number | null;
  metadata?: PmeCatalogJson;
  isActive?: boolean;
}

export interface PmeCatalogItemUpdatePayload {
  [key: string]: unknown;
  id: string;
  organization_id: string;
  updated_by: string;
  name?: string;
  description?: string | null;
  item_type?: PmeCatalogItemType;
  category?: PmeCatalogCategory;
  origin?: PmeCatalogOrigin;
  source_type?: PmeCatalogSourceType;
  source_reference_id?: string | null;
  sinapi_code?: string | null;
  uf?: string | null;
  reference_month?: number | null;
  reference_year?: number | null;
  unit?: string;
  unit_cost?: string;
  unit_price?: string;
  default_unit_cost?: string;
  default_unit_price?: string;
  default_margin_percentage?: string;
  supplier_name?: string | null;
  source_reference?: string | null;
  metadata?: PmeCatalogJson;
  is_active?: boolean;
}

export interface PmeCatalogItemDeactivateInput {
  id: string;
  organizationId: string;
  updatedBy: string;
}

export interface PmeCatalogCompositionCreateInput {
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string | null;
  unit?: string;
  totalUnitCost?: string;
  totalUnitPrice?: string;
  defaultMarginPercentage?: string;
}

export interface PmeCatalogCompositionPayload {
  [key: string]: unknown;
  organization_id: string;
  created_by?: string;
  updated_by?: string;
  name?: string;
  description?: string | null;
  unit?: string;
  total_cost?: string;
  total_price?: string;
  total_unit_cost?: string;
  total_unit_price?: string;
  default_margin_percentage?: string;
  is_active?: boolean;
}

export interface PmeCatalogCompositionUpdateInput extends Partial<
  Omit<PmeCatalogCompositionCreateInput, "organizationId" | "createdBy">
> {
  id: string;
  organizationId: string;
  updatedBy: string;
  isActive?: boolean;
}

export interface PmeCatalogKitCreateInput {
  organizationId: string;
  createdBy: string;
  name: string;
  description?: string | null;
  kitType: PmeCatalogKitType;
  defaultEnvironment?: string | null;
  totalEstimatedCost?: string;
  totalEstimatedPrice?: string;
}

export interface PmeCatalogKitPayload {
  [key: string]: unknown;
  organization_id: string;
  created_by?: string;
  updated_by?: string;
  name?: string;
  description?: string | null;
  category?: string;
  kit_type?: PmeCatalogKitType;
  default_environment?: string | null;
  total_cost?: string;
  total_price?: string;
  total_estimated_cost?: string;
  total_estimated_price?: string;
  is_active?: boolean;
}

export interface PmeCatalogKitUpdateInput extends Partial<
  Omit<PmeCatalogKitCreateInput, "organizationId" | "createdBy">
> {
  id: string;
  organizationId: string;
  updatedBy: string;
  isActive?: boolean;
}

export interface BudgetItemCatalogSource {
  organizationId: string;
  createdBy: string;
  description: string;
  category: PmeCatalogCategory;
  unit: string;
  unitCost: string;
  unitPrice: string;
  marginPercentage?: string;
  sourceType?: PmeCatalogSourceType;
  sourceReferenceId?: string | null;
}

export interface CatalogBudgetItemSource {
  organizationId: string;
  budgetId: string;
  createdBy: string;
  catalogItemId?: string | null;
  description: string;
  category: PmeCatalogCategory;
  unit: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  sortOrder?: number;
}

export interface CatalogKitItemSource {
  description: string;
  category: PmeCatalogCategory;
  unit: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  sortOrder?: number;
  isOptional?: boolean;
}

export interface AddCatalogKitToBudgetResult {
  budgetItems: Array<Record<string, string | number | boolean | null>>;
  calculation: ReturnType<typeof calculatePmeBudget>;
}

const DEFAULT_SOURCE_TYPE: PmeCatalogSourceType = "manual";
const DEFAULT_UNIT = "un";
const DEFAULT_MONEY = "0.00";
const DEFAULT_PERCENTAGE = "0";
const EMPTY_METADATA: PmeCatalogJson = {};

export function buildPmeCatalogItemListQuery(input: {
  organizationId: string;
  includeInactive?: boolean;
  category?: PmeCatalogCategory;
  itemType?: PmeCatalogItemType;
  sourceType?: PmeCatalogSourceType;
  origin?: PmeCatalogOrigin;
  search?: string;
}): PmeCatalogItemListQuery {
  const organizationId = requireText(input.organizationId, "organizationId");
  const search = normalizeOptionalText(input.search);

  return {
    table: "pme_catalog_items",
    organizationId,
    includeInactive: input.includeInactive ?? false,
    ...(typeof input.category === "undefined" ? {} : { category: input.category }),
    ...(typeof input.itemType === "undefined" ? {} : { itemType: input.itemType }),
    ...(typeof input.sourceType === "undefined" ? {} : { sourceType: input.sourceType }),
    ...(typeof input.origin === "undefined" ? {} : { origin: input.origin }),
    ...(search === null ? {} : { search })
  };
}

export function listCatalogItems(input: Parameters<typeof buildPmeCatalogItemListQuery>[0]) {
  return buildPmeCatalogItemListQuery(input);
}

export function getCatalogItemById(input: { organizationId: string; id: string }) {
  return {
    table: "pme_catalog_items" as const,
    organizationId: requireText(input.organizationId, "organizationId"),
    id: requireText(input.id, "id")
  };
}

export function createCatalogItem(input: PmeCatalogItemCreateInput): PmeCatalogItemCreatePayload {
  const category = input.category ?? toCatalogCategory(input.itemType ?? "service");
  const itemType = input.itemType ?? toLegacyItemType(category);
  const defaultUnitCost = normalizeMoney(
    input.defaultUnitCost ?? input.unitCost ?? DEFAULT_MONEY,
    "defaultUnitCost"
  );
  const defaultUnitPrice = normalizeMoney(
    input.defaultUnitPrice ?? input.unitPrice ?? DEFAULT_MONEY,
    "defaultUnitPrice"
  );

  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    created_by: requireText(input.createdBy, "createdBy"),
    name: requireText(input.name, "name"),
    description: normalizeOptionalText(input.description),
    item_type: itemType,
    category,
    origin: input.origin ?? toLegacyOrigin(input.sourceType ?? DEFAULT_SOURCE_TYPE),
    source_type: input.sourceType ?? DEFAULT_SOURCE_TYPE,
    source_reference_id: normalizeOptionalText(input.sourceReferenceId),
    sinapi_code: normalizeOptionalText(input.sinapiCode),
    uf: normalizeOptionalText(input.uf),
    reference_month: input.referenceMonth ?? null,
    reference_year: input.referenceYear ?? null,
    unit: requireText(input.unit ?? DEFAULT_UNIT, "unit"),
    unit_cost: normalizeMoney(input.unitCost ?? defaultUnitCost, "unitCost"),
    unit_price: normalizeMoney(input.unitPrice ?? defaultUnitPrice, "unitPrice"),
    default_unit_cost: defaultUnitCost,
    default_unit_price: defaultUnitPrice,
    default_margin_percentage: normalizePercentage(
      input.defaultMarginPercentage ?? DEFAULT_PERCENTAGE,
      "defaultMarginPercentage"
    ),
    supplier_name: normalizeOptionalText(input.supplierName),
    source_reference: normalizeOptionalText(input.sourceReference),
    metadata: input.metadata ?? EMPTY_METADATA,
    is_active: true
  };
}

export function updateCatalogItem(input: PmeCatalogItemUpdateInput): PmeCatalogItemUpdatePayload {
  const payload: PmeCatalogItemUpdatePayload = {
    id: requireText(input.id, "id"),
    organization_id: requireText(input.organizationId, "organizationId"),
    updated_by: requireText(input.updatedBy, "updatedBy")
  };

  assignText(payload, "name", input.name, "name");
  assignOptionalText(payload, "description", input.description);
  assignValue(payload, "category", input.category);
  assignValue(payload, "item_type", input.itemType);
  assignValue(payload, "source_type", input.sourceType);
  assignValue(payload, "origin", input.origin);
  assignOptionalText(payload, "source_reference_id", input.sourceReferenceId);
  assignOptionalText(payload, "sinapi_code", input.sinapiCode);
  assignOptionalText(payload, "uf", input.uf);
  assignValue(payload, "reference_month", input.referenceMonth);
  assignValue(payload, "reference_year", input.referenceYear);
  assignText(payload, "unit", input.unit, "unit");
  assignMoney(payload, "unit_cost", input.unitCost, "unitCost");
  assignMoney(payload, "unit_price", input.unitPrice, "unitPrice");
  assignMoney(payload, "default_unit_cost", input.defaultUnitCost, "defaultUnitCost");
  assignMoney(payload, "default_unit_price", input.defaultUnitPrice, "defaultUnitPrice");
  assignPercentage(
    payload,
    "default_margin_percentage",
    input.defaultMarginPercentage,
    "defaultMarginPercentage"
  );
  assignOptionalText(payload, "supplier_name", input.supplierName);
  assignOptionalText(payload, "source_reference", input.sourceReference);
  assignValue(payload, "metadata", input.metadata);
  assignValue(payload, "is_active", input.isActive);

  return payload;
}

export function deactivateCatalogItem(input: {
  id: string;
  organizationId: string;
  updatedBy: string;
}): PmeCatalogItemUpdatePayload {
  return updateCatalogItem({ ...input, isActive: false });
}

export function createCatalogComposition(
  input: PmeCatalogCompositionCreateInput
): PmeCatalogCompositionPayload {
  const totalUnitCost = normalizeMoney(input.totalUnitCost ?? DEFAULT_MONEY, "totalUnitCost");
  const totalUnitPrice = normalizeMoney(input.totalUnitPrice ?? DEFAULT_MONEY, "totalUnitPrice");

  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    created_by: requireText(input.createdBy, "createdBy"),
    name: requireText(input.name, "name"),
    description: normalizeOptionalText(input.description),
    unit: requireText(input.unit ?? DEFAULT_UNIT, "unit"),
    total_cost: totalUnitCost,
    total_price: totalUnitPrice,
    total_unit_cost: totalUnitCost,
    total_unit_price: totalUnitPrice,
    default_margin_percentage: normalizePercentage(
      input.defaultMarginPercentage ?? DEFAULT_PERCENTAGE,
      "defaultMarginPercentage"
    ),
    is_active: true
  };
}

export function updateCatalogComposition(
  input: PmeCatalogCompositionUpdateInput
): PmeCatalogCompositionPayload & { id: string } {
  const payload: PmeCatalogCompositionPayload & { id: string } = {
    id: requireText(input.id, "id"),
    organization_id: requireText(input.organizationId, "organizationId"),
    updated_by: requireText(input.updatedBy, "updatedBy")
  };

  assignText(payload, "name", input.name, "name");
  assignOptionalText(payload, "description", input.description);
  assignText(payload, "unit", input.unit, "unit");
  assignMoney(payload, "total_unit_cost", input.totalUnitCost, "totalUnitCost");
  assignMoney(payload, "total_unit_price", input.totalUnitPrice, "totalUnitPrice");
  assignMoney(payload, "total_cost", input.totalUnitCost, "totalUnitCost");
  assignMoney(payload, "total_price", input.totalUnitPrice, "totalUnitPrice");
  assignPercentage(
    payload,
    "default_margin_percentage",
    input.defaultMarginPercentage,
    "defaultMarginPercentage"
  );
  assignValue(payload, "is_active", input.isActive);

  return payload;
}

export function deactivateCatalogComposition(input: {
  id: string;
  organizationId: string;
  updatedBy: string;
}) {
  return updateCatalogComposition({ ...input, isActive: false });
}

export function listCatalogCompositions(input: {
  organizationId: string;
  includeInactive?: boolean;
  search?: string;
}) {
  return {
    table: "pme_catalog_compositions" as const,
    organizationId: requireText(input.organizationId, "organizationId"),
    includeInactive: input.includeInactive ?? false,
    ...(normalizeOptionalText(input.search) === null
      ? {}
      : { search: normalizeOptionalText(input.search) ?? "" })
  };
}

export function createCatalogKit(input: PmeCatalogKitCreateInput): PmeCatalogKitPayload {
  const totalEstimatedCost = normalizeMoney(
    input.totalEstimatedCost ?? DEFAULT_MONEY,
    "totalEstimatedCost"
  );
  const totalEstimatedPrice = normalizeMoney(
    input.totalEstimatedPrice ?? DEFAULT_MONEY,
    "totalEstimatedPrice"
  );

  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    created_by: requireText(input.createdBy, "createdBy"),
    name: requireText(input.name, "name"),
    description: normalizeOptionalText(input.description),
    category: input.kitType,
    kit_type: input.kitType,
    default_environment: normalizeOptionalText(input.defaultEnvironment),
    total_cost: totalEstimatedCost,
    total_price: totalEstimatedPrice,
    total_estimated_cost: totalEstimatedCost,
    total_estimated_price: totalEstimatedPrice,
    is_active: true
  };
}

export function updateCatalogKit(
  input: PmeCatalogKitUpdateInput
): PmeCatalogKitPayload & { id: string } {
  const payload: PmeCatalogKitPayload & { id: string } = {
    id: requireText(input.id, "id"),
    organization_id: requireText(input.organizationId, "organizationId"),
    updated_by: requireText(input.updatedBy, "updatedBy")
  };

  assignText(payload, "name", input.name, "name");
  assignOptionalText(payload, "description", input.description);
  assignValue(payload, "kit_type", input.kitType);
  assignValue(payload, "category", input.kitType);
  assignOptionalText(payload, "default_environment", input.defaultEnvironment);
  assignMoney(payload, "total_estimated_cost", input.totalEstimatedCost, "totalEstimatedCost");
  assignMoney(payload, "total_estimated_price", input.totalEstimatedPrice, "totalEstimatedPrice");
  assignMoney(payload, "total_cost", input.totalEstimatedCost, "totalEstimatedCost");
  assignMoney(payload, "total_price", input.totalEstimatedPrice, "totalEstimatedPrice");
  assignValue(payload, "is_active", input.isActive);

  return payload;
}

export function deactivateCatalogKit(input: {
  id: string;
  organizationId: string;
  updatedBy: string;
}) {
  return updateCatalogKit({ ...input, isActive: false });
}

export function listCatalogKits(input: {
  organizationId: string;
  includeInactive?: boolean;
  kitType?: PmeCatalogKitType;
  search?: string;
}) {
  const search = normalizeOptionalText(input.search);
  return {
    table: "pme_catalog_kits" as const,
    organizationId: requireText(input.organizationId, "organizationId"),
    includeInactive: input.includeInactive ?? false,
    ...(typeof input.kitType === "undefined" ? {} : { kitType: input.kitType }),
    ...(search === null ? {} : { search })
  };
}

export function saveBudgetItemToCatalog(
  input: BudgetItemCatalogSource
): PmeCatalogItemCreatePayload {
  const createInput: PmeCatalogItemCreateInput = {
    organizationId: input.organizationId,
    createdBy: input.createdBy,
    name: input.description,
    description: input.description,
    category: input.category,
    sourceType: input.sourceType ?? "budget_item",
    unit: input.unit,
    defaultUnitCost: input.unitCost,
    defaultUnitPrice: input.unitPrice,
    defaultMarginPercentage: input.marginPercentage ?? DEFAULT_PERCENTAGE,
    unitCost: input.unitCost,
    unitPrice: input.unitPrice
  };
  if (typeof input.sourceReferenceId !== "undefined") {
    createInput.sourceReferenceId = input.sourceReferenceId;
  }

  return createCatalogItem(createInput);
}

export function addCatalogItemToBudget(input: CatalogBudgetItemSource) {
  const totalCost = multiplyMoney(input.quantity, input.unitCost);
  const totalPrice = multiplyMoney(input.quantity, input.unitPrice);

  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    budget_id: requireText(input.budgetId, "budgetId"),
    created_by: requireText(input.createdBy, "createdBy"),
    source_type: "meu_catalogo",
    source_reference_id: normalizeOptionalText(input.catalogItemId),
    description: requireText(input.description, "description"),
    category: input.category,
    unit: requireText(input.unit, "unit"),
    quantity: normalizeQuantity(input.quantity, "quantity"),
    unit_cost: normalizeMoney(input.unitCost, "unitCost"),
    unit_price: normalizeMoney(input.unitPrice, "unitPrice"),
    subtotal_cost: totalCost,
    final_price: totalPrice,
    total_cost: totalCost,
    total_price: totalPrice,
    sort_order: input.sortOrder ?? 0,
    is_optional: false,
    show_on_proposal: true
  };
}

export function addCatalogKitToBudget(input: {
  organizationId: string;
  budgetId: string;
  createdBy: string;
  items: CatalogKitItemSource[];
  existingCalculationItems?: PmeBudgetCalculationItemInput[];
  overheadPercentage: string;
  taxPercentage: string;
  profitPercentage: string;
  discountAmount: string;
}): AddCatalogKitToBudgetResult {
  const budgetItems = input.items.map((item, index) =>
    addCatalogItemToBudget({
      organizationId: input.organizationId,
      budgetId: input.budgetId,
      createdBy: input.createdBy,
      description: item.description,
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
      sortOrder: item.sortOrder ?? index
    })
  );
  const newCalculationItems = input.items.map((item) => ({
    description: item.description,
    kind: item.category,
    quantity: item.quantity,
    unitCost: item.unitCost,
    unitPrice: item.unitPrice
  }));
  const calculation = calculatePmeBudget({
    items: [...(input.existingCalculationItems ?? []), ...newCalculationItems],
    overheadPercentage: input.overheadPercentage,
    taxPercentage: input.taxPercentage,
    profitPercentage: input.profitPercentage,
    discountAmount: input.discountAmount
  });

  return { budgetItems, calculation };
}

export const createPmeCatalogItem = createCatalogItem;
export const updatePmeCatalogItem = updateCatalogItem;
export const deactivatePmeCatalogItem = deactivateCatalogItem;

function toCatalogCategory(itemType: PmeCatalogItemType): PmeCatalogCategory {
  const map: Record<PmeCatalogItemType, PmeCatalogCategory> = {
    material: "material",
    labor: "mao_de_obra",
    service: "servico",
    third_party: "terceiro",
    equipment: "equipamento",
    transport: "transporte",
    disposal: "descarte",
    fee: "taxa",
    other: "outro"
  };
  return map[itemType];
}

function toLegacyItemType(category: PmeCatalogCategory): PmeCatalogItemType {
  const map: Record<PmeCatalogCategory, PmeCatalogItemType> = {
    material: "material",
    mao_de_obra: "labor",
    servico: "service",
    terceiro: "third_party",
    equipamento: "equipment",
    transporte: "transport",
    descarte: "disposal",
    taxa: "fee",
    composicao: "service",
    outro: "other"
  };
  return map[category];
}

function toLegacyOrigin(sourceType: PmeCatalogSourceType): PmeCatalogOrigin {
  if (
    sourceType === "sinapi" ||
    sourceType === "supplier_quote" ||
    sourceType === "axia_suggestion"
  ) {
    return sourceType;
  }
  return "manual";
}

function requireText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required.`);
  }
  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeMoney(value: string, fieldName: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error(`${fieldName} must be a non-negative decimal string with up to 2 decimals.`);
  }
  const [integerPart, decimalPart = ""] = value.split(".");
  return `${integerPart}.${decimalPart.padEnd(2, "0")}`;
}

function normalizeQuantity(value: string, fieldName: string): string {
  if (!/^\d+(\.\d{1,4})?$/.test(value)) {
    throw new Error(`${fieldName} must be a non-negative decimal string with up to 4 decimals.`);
  }
  return value;
}

function normalizePercentage(value: string, fieldName: string): string {
  if (!/^\d+(\.\d{1,4})?$/.test(value)) {
    throw new Error(`${fieldName} must be a non-negative decimal string with up to 4 decimals.`);
  }
  if (Number(value) > 100) {
    throw new Error(`${fieldName} cannot be greater than 100.`);
  }
  return value;
}

function multiplyMoney(quantity: string, money: string): string {
  const quantityUnits = parseScaledDecimal(normalizeQuantity(quantity, "quantity"), 4, "quantity");
  const moneyUnits = BigInt(normalizeMoney(money, "money").replace(".", ""));
  const cents = divideRounded(quantityUnits * moneyUnits, 10_000n);
  const reais = cents / 100n;
  const centavos = cents % 100n;
  return `${reais}.${centavos.toString().padStart(2, "0")}`;
}

function parseScaledDecimal(value: string, scale: number, fieldName: string): bigint {
  const [integerPart, decimalPart = ""] = value.split(".");
  if (decimalPart.length > scale) {
    throw new Error(`${fieldName} cannot have more than ${scale} decimal places.`);
  }
  return BigInt(integerPart + decimalPart.padEnd(scale, "0"));
}

function divideRounded(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder * 2n >= divisor ? quotient + 1n : quotient;
}

function assignText<T extends Record<string, unknown>, K extends keyof T & string>(
  payload: T,
  key: K,
  value: string | undefined,
  fieldName: string
): void {
  if (typeof value !== "undefined") {
    payload[key] = requireText(value, fieldName) as T[K];
  }
}

function assignOptionalText<T extends Record<string, unknown>, K extends keyof T & string>(
  payload: T,
  key: K,
  value: string | null | undefined
): void {
  if (typeof value !== "undefined") {
    payload[key] = normalizeOptionalText(value) as T[K];
  }
}

function assignMoney<T extends Record<string, unknown>, K extends keyof T & string>(
  payload: T,
  key: K,
  value: string | undefined,
  fieldName: string
): void {
  if (typeof value !== "undefined") {
    payload[key] = normalizeMoney(value, fieldName) as T[K];
  }
}

function assignPercentage<T extends Record<string, unknown>, K extends keyof T & string>(
  payload: T,
  key: K,
  value: string | undefined,
  fieldName: string
): void {
  if (typeof value !== "undefined") {
    payload[key] = normalizePercentage(value, fieldName) as T[K];
  }
}

function assignValue<T extends Record<string, unknown>, K extends keyof T & string>(
  payload: T,
  key: K,
  value: T[K] | undefined
): void {
  if (typeof value !== "undefined") {
    payload[key] = value;
  }
}
