const MONEY_SCALE = 100n;
const QUANTITY_SCALE = 10_000n;
const PERCENT_SCALE = 10_000n;
const PERCENT_DENOMINATOR = 100n * PERCENT_SCALE;

export interface SinapiReference {
  stateCode: string;
  referenceMonth: number;
  referenceYear: number;
}

export interface SinapiCompositionSearchItem extends SinapiReference {
  id: string;
  versionId: string;
  code: string;
  description: string;
  unit: string;
  category: string;
  originalUnitCost: string;
}

export interface SinapiCompositionSearchInput extends SinapiReference {
  query: string;
  compositions: SinapiCompositionSearchItem[];
}

export interface SinapiAdaptationInput {
  composition: SinapiCompositionSearchItem;
  quantity: string;
  productivityFactor: string;
  wastePercentage: string;
  marginPercentage: string;
}

export interface SinapiAdaptationResult extends SinapiReference {
  compositionId: string;
  versionId: string;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  originalUnitCost: string;
  adaptedUnitPrice: string;
  totalOriginalCost: string;
  totalAdaptedPrice: string;
  productivityFactor: string;
  wastePercentage: string;
  marginPercentage: string;
  usedAt: string;
}

export interface SinapiSavedSnapshotPayload {
  organization_id: string;
  budget_id: string;
  budget_item_id: string | null;
  catalog_item_id: string | null;
  sinapi_composition_id: string;
  sinapi_version_id: string;
  sinapi_code: string;
  sinapi_description: string;
  state_code: string;
  reference_month: number;
  reference_year: number;
  original_unit_cost: string;
  adapted_unit_price: string;
  quantity: string;
  productivity_factor: string;
  waste_percentage: string;
  margin_percentage: string;
  snapshot: SinapiSnapshotJson;
  created_by: string;
  used_at: string;
}

export interface SinapiCatalogItemPayload {
  organization_id: string;
  created_by: string;
  name: string;
  description: string;
  item_type: "service";
  origin: "sinapi";
  unit: string;
  unit_cost: string;
  unit_price: string;
  source_reference: string;
  metadata: SinapiSnapshotJson;
  is_active: true;
}

export type SinapiSnapshotJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: SinapiSnapshotJson | undefined }
  | SinapiSnapshotJson[];

export const SINAPI_DEMO_COMPOSITIONS: SinapiCompositionSearchItem[] = [
  {
    id: "00000000-0000-4000-8000-000000000331",
    versionId: "00000000-0000-4000-8000-000000000301",
    stateCode: "SP",
    referenceMonth: 6,
    referenceYear: 2026,
    code: "87267",
    description: "Revestimento cerâmico para parede com placas tipo esmaltada",
    unit: "m2",
    category: "revestimento",
    originalUnitCost: "84.35"
  },
  {
    id: "00000000-0000-4000-8000-000000000332",
    versionId: "00000000-0000-4000-8000-000000000301",
    stateCode: "SP",
    referenceMonth: 6,
    referenceYear: 2026,
    code: "88489",
    description: "Aplicação manual de pintura com tinta látex acrílica em paredes",
    unit: "m2",
    category: "pintura",
    originalUnitCost: "18.72"
  },
  {
    id: "00000000-0000-4000-8000-000000000331",
    versionId: "00000000-0000-4000-8000-000000000302",
    stateCode: "RJ",
    referenceMonth: 6,
    referenceYear: 2026,
    code: "87267",
    description: "Revestimento cerâmico para parede com placas tipo esmaltada",
    unit: "m2",
    category: "revestimento",
    originalUnitCost: "88.90"
  },
  {
    id: "00000000-0000-4000-8000-000000000332",
    versionId: "00000000-0000-4000-8000-000000000302",
    stateCode: "RJ",
    referenceMonth: 6,
    referenceYear: 2026,
    code: "88489",
    description: "Aplicação manual de pintura com tinta látex acrílica em paredes",
    unit: "m2",
    category: "pintura",
    originalUnitCost: "19.55"
  }
];

export function searchSinapiCompositions(
  input: SinapiCompositionSearchInput
): SinapiCompositionSearchItem[] {
  const query = normalizeSearch(input.query);

  return input.compositions.filter((composition) => {
    const sameReference =
      composition.stateCode === input.stateCode &&
      composition.referenceMonth === input.referenceMonth &&
      composition.referenceYear === input.referenceYear;
    const matchesQuery =
      query.length === 0 ||
      normalizeSearch(`${composition.code} ${composition.description}`).includes(query);

    return sameReference && matchesQuery;
  });
}

export function adaptSinapiComposition(input: SinapiAdaptationInput): SinapiAdaptationResult {
  const originalUnitCostCents = parseMoney(input.composition.originalUnitCost, "originalUnitCost");
  const quantityUnits = parseScaledDecimal(input.quantity, 4, "quantity");
  const productivityUnits = parseScaledDecimal(input.productivityFactor, 4, "productivityFactor");
  const wasteUnits = parseScaledDecimal(input.wastePercentage, 4, "wastePercentage");
  const marginUnits = parseScaledDecimal(input.marginPercentage, 4, "marginPercentage");
  const costAfterProductivity = multiplyScaled(
    originalUnitCostCents,
    productivityUnits,
    QUANTITY_SCALE
  );
  const costAfterWaste = applyPercentageIncrease(costAfterProductivity, wasteUnits);
  const adaptedUnitPriceCents = applyPercentageIncrease(costAfterWaste, marginUnits);

  return {
    compositionId: input.composition.id,
    versionId: input.composition.versionId,
    code: input.composition.code,
    description: input.composition.description,
    unit: input.composition.unit,
    stateCode: input.composition.stateCode,
    referenceMonth: input.composition.referenceMonth,
    referenceYear: input.composition.referenceYear,
    quantity: input.quantity,
    originalUnitCost: formatMoney(originalUnitCostCents),
    adaptedUnitPrice: formatMoney(adaptedUnitPriceCents),
    totalOriginalCost: formatMoney(multiplyQuantityByMoney(quantityUnits, originalUnitCostCents)),
    totalAdaptedPrice: formatMoney(multiplyQuantityByMoney(quantityUnits, adaptedUnitPriceCents)),
    productivityFactor: input.productivityFactor,
    wastePercentage: input.wastePercentage,
    marginPercentage: input.marginPercentage,
    usedAt: new Date().toISOString()
  };
}

export function hasMixedSinapiReference(
  existingReferences: SinapiReference[],
  nextReference: SinapiReference
): boolean {
  return existingReferences.some(
    (reference) =>
      reference.stateCode !== nextReference.stateCode ||
      reference.referenceMonth !== nextReference.referenceMonth ||
      reference.referenceYear !== nextReference.referenceYear
  );
}

export function createSinapiSnapshotPayload(input: {
  organizationId: string;
  budgetId: string;
  budgetItemId?: string | null;
  catalogItemId?: string | null;
  createdBy: string;
  adaptation: SinapiAdaptationResult;
}): SinapiSavedSnapshotPayload {
  const snapshot = buildSnapshot(input.adaptation);

  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    budget_id: requireText(input.budgetId, "budgetId"),
    budget_item_id: normalizeOptionalId(input.budgetItemId),
    catalog_item_id: normalizeOptionalId(input.catalogItemId),
    sinapi_composition_id: input.adaptation.compositionId,
    sinapi_version_id: input.adaptation.versionId,
    sinapi_code: input.adaptation.code,
    sinapi_description: input.adaptation.description,
    state_code: input.adaptation.stateCode,
    reference_month: input.adaptation.referenceMonth,
    reference_year: input.adaptation.referenceYear,
    original_unit_cost: input.adaptation.originalUnitCost,
    adapted_unit_price: input.adaptation.adaptedUnitPrice,
    quantity: input.adaptation.quantity,
    productivity_factor: input.adaptation.productivityFactor,
    waste_percentage: input.adaptation.wastePercentage,
    margin_percentage: input.adaptation.marginPercentage,
    snapshot,
    created_by: requireText(input.createdBy, "createdBy"),
    used_at: input.adaptation.usedAt
  };
}

export function createCatalogItemFromSinapi(input: {
  organizationId: string;
  createdBy: string;
  adaptation: SinapiAdaptationResult;
}): SinapiCatalogItemPayload {
  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    created_by: requireText(input.createdBy, "createdBy"),
    name: `${input.adaptation.code} - ${input.adaptation.description}`,
    description: `Item adaptado do SINAPI ${input.adaptation.stateCode} ${input.adaptation.referenceMonth}/${input.adaptation.referenceYear}.`,
    item_type: "service",
    origin: "sinapi",
    unit: input.adaptation.unit,
    unit_cost: input.adaptation.originalUnitCost,
    unit_price: input.adaptation.adaptedUnitPrice,
    source_reference: `${input.adaptation.stateCode}-${input.adaptation.referenceYear}-${input.adaptation.referenceMonth}-${input.adaptation.code}`,
    metadata: buildSnapshot(input.adaptation),
    is_active: true
  };
}

function buildSnapshot(adaptation: SinapiAdaptationResult): SinapiSnapshotJson {
  return {
    code: adaptation.code,
    description: adaptation.description,
    stateCode: adaptation.stateCode,
    referenceMonth: adaptation.referenceMonth,
    referenceYear: adaptation.referenceYear,
    originalUnitCost: adaptation.originalUnitCost,
    adaptedUnitPrice: adaptation.adaptedUnitPrice,
    quantity: adaptation.quantity,
    productivityFactor: adaptation.productivityFactor,
    wastePercentage: adaptation.wastePercentage,
    marginPercentage: adaptation.marginPercentage,
    usedAt: adaptation.usedAt
  };
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function requireText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmed;
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  if (value === null || typeof value === "undefined" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function parseMoney(value: string, fieldName: string): bigint {
  return parseScaledDecimal(value, 2, fieldName);
}

function parseScaledDecimal(value: string, scale: number, fieldName: string): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`${fieldName} must be a non-negative decimal string.`);
  }

  const [integerPart, decimalPart = ""] = value.split(".");
  if (decimalPart.length > scale) {
    throw new Error(`${fieldName} cannot have more than ${scale} decimal places.`);
  }

  return BigInt(integerPart + decimalPart.padEnd(scale, "0"));
}

function multiplyScaled(value: bigint, factor: bigint, scale: bigint): bigint {
  return divideRounded(value * factor, scale);
}

function applyPercentageIncrease(amountCents: bigint, percentageUnits: bigint): bigint {
  return amountCents + divideRounded(amountCents * percentageUnits, PERCENT_DENOMINATOR);
}

function multiplyQuantityByMoney(quantityUnits: bigint, moneyCents: bigint): bigint {
  return divideRounded(quantityUnits * moneyCents, QUANTITY_SCALE);
}

function divideRounded(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder * 2n >= divisor ? quotient + 1n : quotient;
}

function formatMoney(cents: bigint): string {
  const reais = cents / MONEY_SCALE;
  const centavos = cents % MONEY_SCALE;
  return `${reais}.${centavos.toString().padStart(2, "0")}`;
}
