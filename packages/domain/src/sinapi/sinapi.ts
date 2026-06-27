const MONEY_SCALE = 100n;
const QUANTITY_SCALE = 10_000n;
const PERCENT_SCALE = 10_000n;
const PERCENT_DENOMINATOR = 100n * PERCENT_SCALE;

export type SinapiRegime = "desonerado" | "nao_desonerado";
export type SinapiCompositionItemType =
  | "material"
  | "mao_de_obra"
  | "equipamento"
  | "servico"
  | "outro";

export interface SinapiReference {
  stateCode: string;
  uf?: string;
  referenceMonth: number;
  referenceYear: number;
  regime?: SinapiRegime;
}

export interface SinapiState {
  uf: string;
  name: string;
  region: string;
  isActive: boolean;
}

export interface SinapiVersion extends SinapiReference {
  id: string;
  uf: string;
  regime: SinapiRegime;
  status: "draft" | "processing" | "published" | "failed" | "archived";
  publishedAt: string | null;
}

export interface SinapiCompositionSearchItem extends SinapiReference {
  id: string;
  versionId: string;
  code: string;
  description: string;
  unit: string;
  category: string;
  originalUnitCost: string;
  totalCost: string;
  laborCost: string;
  materialCost: string;
  equipmentCost: string;
  isActive: boolean;
  regime: SinapiRegime;
}

export interface SinapiCompositionDetail extends SinapiCompositionSearchItem {
  items: SinapiCompositionDetailItem[];
}

export interface SinapiCompositionDetailItem {
  id: string;
  inputId: string | null;
  inputCode: string | null;
  description: string;
  unit: string;
  coefficient: string;
  unitCost: string;
  totalCost: string;
  itemType: SinapiCompositionItemType;
}

export interface SinapiCompositionSearchInput extends SinapiReference {
  query: string;
  compositions: SinapiCompositionSearchItem[];
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
}

export interface SinapiCompositionSearchResult {
  items: SinapiCompositionSearchItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SinapiAdaptationInput {
  composition: SinapiCompositionSearchItem;
  quantity: string;
  adaptedDescription?: string;
  adaptedUnit?: string;
  adaptedUnitCost?: string;
  adaptedUnitPrice?: string;
  productivityFactor?: string;
  productivityAdjustmentPercentage?: string;
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
  originalUnit: string;
  originalUnitCost: string;
  originalLaborCost: string;
  originalMaterialCost: string;
  originalEquipmentCost: string;
  adaptedDescription: string;
  adaptedUnit: string;
  adaptedUnitCost: string;
  adaptedUnitPrice: string;
  totalOriginalCost: string;
  totalAdaptedPrice: string;
  productivityFactor: string;
  productivityAdjustmentPercentage: string;
  wastePercentage: string;
  marginPercentage: string;
  usedAt: string;
  regime: SinapiRegime;
}

export interface SinapiBudgetItemPayload {
  organization_id: string;
  budget_id: string;
  item_type: "service";
  category: "servico";
  source_type: "sinapi";
  source_reference_id: string;
  description: string;
  unit: string;
  quantity: string;
  unit_cost: string;
  subtotal_cost: string;
  unit_price: string;
  final_price: string;
  total_cost: string;
  total_price: string;
  waste_percentage: string;
  margin_percentage: string;
  is_optional: false;
  show_on_proposal: true;
  notes: string;
  created_by: string;
  updated_by: string;
}

export interface SinapiBudgetSnapshotPayload {
  organization_id: string;
  budget_id: string;
  budget_item_id: string;
  sinapi_composition_id: string;
  sinapi_code: string;
  sinapi_description: string;
  uf: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  original_unit: string;
  original_total_cost: string;
  original_labor_cost: string;
  original_material_cost: string;
  original_equipment_cost: string;
  adapted_description: string;
  adapted_unit: string;
  adapted_quantity: string;
  adapted_unit_cost: string;
  adapted_unit_price: string;
  waste_percentage: string;
  productivity_adjustment_percentage: string;
  margin_percentage: string;
  snapshot_data: SinapiSnapshotJson;
  created_by: string;
}

export interface SinapiSavedItemPayload {
  organization_id: string;
  sinapi_composition_id: string;
  sinapi_code: string;
  sinapi_description: string;
  uf: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  original_unit: string;
  original_total_cost: string;
  original_labor_cost: string;
  original_material_cost: string;
  original_equipment_cost: string;
  adapted_description: string;
  adapted_unit: string;
  adapted_unit_cost: string;
  adapted_unit_price: string;
  waste_percentage: string;
  productivity_adjustment_percentage: string;
  margin_percentage: string;
  notes: string | null;
  saved_to_catalog_item_id: string | null;
  created_by: string;
}

export interface SinapiCatalogItemPayload {
  organization_id: string;
  created_by: string;
  name: string;
  description: string;
  item_type: "service";
  category: "servico";
  origin: "sinapi";
  source_type: "sinapi";
  source_reference_id: string;
  sinapi_code: string;
  uf: string;
  reference_month: number;
  reference_year: number;
  unit: string;
  unit_cost: string;
  unit_price: string;
  default_unit_cost: string;
  default_unit_price: string;
  default_margin_percentage: string;
  source_reference: string;
  metadata: SinapiSnapshotJson;
  is_active: true;
}

export interface CompareBudgetItemWithSinapiReferenceInput {
  budgetItemId: string;
  description: string;
  unit: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
  reference: SinapiCompositionSearchItem;
}

export interface SinapiComparisonResult {
  budgetItemId: string;
  referenceCode: string;
  referenceDescription: string;
  referenceUnitCost: string;
  budgetUnitCost: string;
  budgetUnitPrice: string;
  costDifferenceAmount: string;
  costDifferencePercentage: string;
}

export type SinapiSnapshotJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: SinapiSnapshotJson | undefined }
  | SinapiSnapshotJson[];

export type SinapiSavedSnapshotPayload = SinapiBudgetSnapshotPayload;

export const SINAPI_STATES: SinapiState[] = [
  { uf: "SP", name: "São Paulo", region: "Sudeste", isActive: true },
  { uf: "RJ", name: "Rio de Janeiro", region: "Sudeste", isActive: true },
  { uf: "MG", name: "Minas Gerais", region: "Sudeste", isActive: true }
];

export const SINAPI_DEMO_COMPOSITIONS: SinapiCompositionSearchItem[] = [
  {
    id: "00000000-0000-4000-8000-000000000331",
    versionId: "00000000-0000-4000-8000-000000000301",
    stateCode: "SP",
    uf: "SP",
    referenceMonth: 6,
    referenceYear: 2026,
    regime: "nao_desonerado",
    code: "87267",
    description: "Revestimento cerâmico para parede com placas tipo esmaltada",
    unit: "m2",
    category: "revestimento",
    originalUnitCost: "84.35",
    totalCost: "84.35",
    laborCost: "34.20",
    materialCost: "45.10",
    equipmentCost: "5.05",
    isActive: true
  },
  {
    id: "00000000-0000-4000-8000-000000000332",
    versionId: "00000000-0000-4000-8000-000000000301",
    stateCode: "SP",
    uf: "SP",
    referenceMonth: 6,
    referenceYear: 2026,
    regime: "nao_desonerado",
    code: "88489",
    description: "Aplicação manual de pintura com tinta látex acrílica em paredes",
    unit: "m2",
    category: "pintura",
    originalUnitCost: "18.72",
    totalCost: "18.72",
    laborCost: "12.10",
    materialCost: "6.62",
    equipmentCost: "0.00",
    isActive: true
  },
  {
    id: "00000000-0000-4000-8000-000000000331",
    versionId: "00000000-0000-4000-8000-000000000302",
    stateCode: "RJ",
    uf: "RJ",
    referenceMonth: 6,
    referenceYear: 2026,
    regime: "nao_desonerado",
    code: "87267",
    description: "Revestimento cerâmico para parede com placas tipo esmaltada",
    unit: "m2",
    category: "revestimento",
    originalUnitCost: "88.90",
    totalCost: "88.90",
    laborCost: "36.00",
    materialCost: "47.80",
    equipmentCost: "5.10",
    isActive: true
  }
];

const SINAPI_DEMO_DETAILS: SinapiCompositionDetail[] = SINAPI_DEMO_COMPOSITIONS.map(
  (composition) => ({
    ...composition,
    items: [
      {
        id: `${composition.versionId}-${composition.code}-labor`,
        inputId: null,
        inputCode: "I-88309",
        description: "Pedreiro com encargos complementares",
        unit: "h",
        coefficient: composition.code === "88489" ? "0.210000" : "0.720000",
        unitCost: composition.laborCost,
        totalCost: composition.laborCost,
        itemType: "mao_de_obra"
      },
      {
        id: `${composition.versionId}-${composition.code}-material`,
        inputId: null,
        inputCode: "I-00001379",
        description:
          composition.code === "88489" ? "Tinta látex acrílica" : "Argamassa e revestimento",
        unit: composition.code === "88489" ? "l" : "kg",
        coefficient: composition.code === "88489" ? "0.180000" : "4.860000",
        unitCost: composition.materialCost,
        totalCost: composition.materialCost,
        itemType: "material"
      }
    ]
  })
);

export function listSinapiStates(states: SinapiState[] = SINAPI_STATES): SinapiState[] {
  return states.filter((state) => state.isActive);
}

export function listSinapiVersions(
  compositions: SinapiCompositionSearchItem[] = SINAPI_DEMO_COMPOSITIONS
): SinapiVersion[] {
  const versions = new Map<string, SinapiVersion>();

  for (const composition of compositions) {
    const key = `${composition.versionId}:${composition.uf ?? composition.stateCode}`;
    versions.set(key, {
      id: composition.versionId,
      stateCode: composition.stateCode,
      uf: composition.uf ?? composition.stateCode,
      referenceMonth: composition.referenceMonth,
      referenceYear: composition.referenceYear,
      regime: composition.regime,
      status: "published",
      publishedAt: `${composition.referenceYear}-${String(composition.referenceMonth).padStart(2, "0")}-15`
    });
  }

  return [...versions.values()];
}

export function searchSinapiCompositions(
  input: SinapiCompositionSearchInput
): SinapiCompositionSearchResult {
  const query = normalizeSearch(input.query);
  const uf = input.uf ?? input.stateCode;
  const regime = input.regime ?? "nao_desonerado";
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10));

  const filtered = input.compositions.filter((composition) => {
    const sameReference =
      (composition.uf ?? composition.stateCode) === uf &&
      composition.referenceMonth === input.referenceMonth &&
      composition.referenceYear === input.referenceYear &&
      composition.regime === regime;
    const matchesActive = input.includeInactive === true || composition.isActive;
    const matchesQuery =
      query.length === 0 ||
      normalizeSearch(`${composition.code} ${composition.description}`).includes(query);

    return sameReference && matchesActive && matchesQuery;
  });
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize))
  };
}

export function getSinapiCompositionDetails(input: {
  compositionId: string;
  versionId?: string;
  details?: SinapiCompositionDetail[];
}): SinapiCompositionDetail | null {
  const details = input.details ?? SINAPI_DEMO_DETAILS;

  return (
    details.find(
      (composition) =>
        composition.id === input.compositionId &&
        (typeof input.versionId === "undefined" || composition.versionId === input.versionId)
    ) ?? null
  );
}

export function adaptSinapiComposition(input: SinapiAdaptationInput): SinapiAdaptationResult {
  const quantityUnits = parseScaledDecimal(input.quantity, 4, "quantity");
  const sourceUnitCost = input.adaptedUnitCost ?? input.composition.originalUnitCost;
  const originalUnitCostCents = parseMoney(input.composition.originalUnitCost, "originalUnitCost");
  const adaptedUnitCostCents = parseMoney(sourceUnitCost, "adaptedUnitCost");
  const wasteUnits = parsePercentage(input.wastePercentage, "wastePercentage");
  const marginUnits = parsePercentage(input.marginPercentage, "marginPercentage");
  const productivityAdjustment = input.productivityAdjustmentPercentage ?? "0";
  const productivityAdjustmentUnits = parseSignedPercentage(
    productivityAdjustment,
    "productivityAdjustmentPercentage"
  );
  const productivityFactor =
    input.productivityFactor ??
    formatScaled(QUANTITY_SCALE + productivityAdjustmentUnits / 100n, QUANTITY_SCALE);
  const productivityFactorUnits = parseScaledDecimal(productivityFactor, 4, "productivityFactor");
  const costAfterProductivity = multiplyScaled(
    adaptedUnitCostCents,
    productivityFactorUnits,
    QUANTITY_SCALE
  );
  const costAfterWaste = applyPercentageIncrease(costAfterProductivity, wasteUnits);
  const calculatedUnitPriceCents = applyPercentageIncrease(costAfterWaste, marginUnits);
  const finalUnitPriceCents =
    typeof input.adaptedUnitPrice === "string"
      ? parseMoney(input.adaptedUnitPrice, "adaptedUnitPrice")
      : calculatedUnitPriceCents;

  if (quantityUnits <= 0n) {
    throw new Error("quantity must be greater than zero.");
  }

  return {
    compositionId: input.composition.id,
    versionId: input.composition.versionId,
    code: input.composition.code,
    description: input.composition.description,
    unit: input.composition.unit,
    stateCode: input.composition.stateCode,
    uf: input.composition.uf ?? input.composition.stateCode,
    referenceMonth: input.composition.referenceMonth,
    referenceYear: input.composition.referenceYear,
    regime: input.composition.regime,
    quantity: input.quantity,
    originalUnit: input.composition.unit,
    originalUnitCost: formatMoney(originalUnitCostCents),
    originalLaborCost: input.composition.laborCost,
    originalMaterialCost: input.composition.materialCost,
    originalEquipmentCost: input.composition.equipmentCost,
    adaptedDescription: input.adaptedDescription?.trim() || input.composition.description,
    adaptedUnit: input.adaptedUnit?.trim() || input.composition.unit,
    adaptedUnitCost: formatMoney(adaptedUnitCostCents),
    adaptedUnitPrice: formatMoney(finalUnitPriceCents),
    totalOriginalCost: formatMoney(multiplyQuantityByMoney(quantityUnits, originalUnitCostCents)),
    totalAdaptedPrice: formatMoney(multiplyQuantityByMoney(quantityUnits, finalUnitPriceCents)),
    productivityFactor,
    productivityAdjustmentPercentage: productivityAdjustment,
    wastePercentage: input.wastePercentage,
    marginPercentage: input.marginPercentage,
    usedAt: new Date().toISOString()
  };
}

export function addSinapiCompositionToPmeBudget(input: {
  organizationId: string;
  budgetId: string;
  budgetItemId: string;
  createdBy: string;
  adaptation: SinapiAdaptationResult;
}): { item: SinapiBudgetItemPayload; snapshot: SinapiBudgetSnapshotPayload } {
  const item = buildBudgetItemPayload(input);

  return {
    item,
    snapshot: createSinapiSnapshotPayload({
      organizationId: input.organizationId,
      budgetId: input.budgetId,
      budgetItemId: input.budgetItemId,
      createdBy: input.createdBy,
      adaptation: input.adaptation
    })
  };
}

export function saveAdaptedSinapiItem(input: {
  organizationId: string;
  createdBy: string;
  adaptation: SinapiAdaptationResult;
  notes?: string | null;
  savedToCatalogItemId?: string | null;
}): SinapiSavedItemPayload {
  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    sinapi_composition_id: input.adaptation.compositionId,
    sinapi_code: input.adaptation.code,
    sinapi_description: input.adaptation.description,
    uf: input.adaptation.uf ?? input.adaptation.stateCode,
    reference_month: input.adaptation.referenceMonth,
    reference_year: input.adaptation.referenceYear,
    regime: input.adaptation.regime,
    original_unit: input.adaptation.originalUnit,
    original_total_cost: input.adaptation.originalUnitCost,
    original_labor_cost: input.adaptation.originalLaborCost,
    original_material_cost: input.adaptation.originalMaterialCost,
    original_equipment_cost: input.adaptation.originalEquipmentCost,
    adapted_description: input.adaptation.adaptedDescription,
    adapted_unit: input.adaptation.adaptedUnit,
    adapted_unit_cost: input.adaptation.adaptedUnitCost,
    adapted_unit_price: input.adaptation.adaptedUnitPrice,
    waste_percentage: input.adaptation.wastePercentage,
    productivity_adjustment_percentage: input.adaptation.productivityAdjustmentPercentage,
    margin_percentage: input.adaptation.marginPercentage,
    notes: input.notes ?? null,
    saved_to_catalog_item_id: normalizeOptionalId(input.savedToCatalogItemId),
    created_by: requireText(input.createdBy, "createdBy")
  };
}

export function saveSinapiItemToCatalog(input: {
  organizationId: string;
  createdBy: string;
  adaptation: SinapiAdaptationResult;
}): SinapiCatalogItemPayload {
  return createCatalogItemFromSinapi(input);
}

export function listSavedSinapiItems(
  items: SinapiSavedItemPayload[],
  organizationId: string
): SinapiSavedItemPayload[] {
  return items.filter((item) => item.organization_id === organizationId);
}

export function compareBudgetItemWithSinapiReference(
  input: CompareBudgetItemWithSinapiReferenceInput
): SinapiComparisonResult {
  const referenceCost = parseMoney(input.reference.originalUnitCost, "referenceUnitCost");
  const budgetCost = parseMoney(input.unitCost, "budgetUnitCost");
  const difference = budgetCost - referenceCost;
  const differencePercentage =
    referenceCost === 0n ? 0n : divideRounded(difference * PERCENT_DENOMINATOR, referenceCost);

  return {
    budgetItemId: input.budgetItemId,
    referenceCode: input.reference.code,
    referenceDescription: input.reference.description,
    referenceUnitCost: input.reference.originalUnitCost,
    budgetUnitCost: input.unitCost,
    budgetUnitPrice: input.unitPrice,
    costDifferenceAmount: formatSignedMoney(difference),
    costDifferencePercentage: formatSignedPercentage(differencePercentage)
  };
}

export function hasMixedSinapiReference(
  existingReferences: SinapiReference[],
  nextReference: SinapiReference
): boolean {
  return existingReferences.some(
    (reference) =>
      (reference.uf ?? reference.stateCode) !== (nextReference.uf ?? nextReference.stateCode) ||
      reference.referenceMonth !== nextReference.referenceMonth ||
      reference.referenceYear !== nextReference.referenceYear ||
      (reference.regime ?? "nao_desonerado") !== (nextReference.regime ?? "nao_desonerado")
  );
}

export function createSinapiSnapshotPayload(input: {
  organizationId: string;
  budgetId: string;
  budgetItemId?: string | null;
  createdBy: string;
  adaptation: SinapiAdaptationResult;
}): SinapiBudgetSnapshotPayload {
  const budgetItemId = normalizeOptionalId(input.budgetItemId);
  if (budgetItemId === null) {
    throw new Error("budgetItemId is required.");
  }

  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    budget_id: requireText(input.budgetId, "budgetId"),
    budget_item_id: budgetItemId,
    sinapi_composition_id: input.adaptation.compositionId,
    sinapi_code: input.adaptation.code,
    sinapi_description: input.adaptation.description,
    uf: input.adaptation.uf ?? input.adaptation.stateCode,
    reference_month: input.adaptation.referenceMonth,
    reference_year: input.adaptation.referenceYear,
    regime: input.adaptation.regime,
    original_unit: input.adaptation.originalUnit,
    original_total_cost: input.adaptation.originalUnitCost,
    original_labor_cost: input.adaptation.originalLaborCost,
    original_material_cost: input.adaptation.originalMaterialCost,
    original_equipment_cost: input.adaptation.originalEquipmentCost,
    adapted_description: input.adaptation.adaptedDescription,
    adapted_unit: input.adaptation.adaptedUnit,
    adapted_quantity: input.adaptation.quantity,
    adapted_unit_cost: input.adaptation.adaptedUnitCost,
    adapted_unit_price: input.adaptation.adaptedUnitPrice,
    waste_percentage: input.adaptation.wastePercentage,
    productivity_adjustment_percentage: input.adaptation.productivityAdjustmentPercentage,
    margin_percentage: input.adaptation.marginPercentage,
    snapshot_data: buildSnapshot(input.adaptation),
    created_by: requireText(input.createdBy, "createdBy")
  };
}

export function createCatalogItemFromSinapi(input: {
  organizationId: string;
  createdBy: string;
  adaptation: SinapiAdaptationResult;
}): SinapiCatalogItemPayload {
  const sourceReference = `${input.adaptation.uf ?? input.adaptation.stateCode}-${input.adaptation.referenceYear}-${input.adaptation.referenceMonth}-${input.adaptation.regime}-${input.adaptation.code}`;

  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    created_by: requireText(input.createdBy, "createdBy"),
    name: `${input.adaptation.code} - ${input.adaptation.adaptedDescription}`,
    description: `Item adaptado do SINAPI ${input.adaptation.uf ?? input.adaptation.stateCode} ${input.adaptation.referenceMonth}/${input.adaptation.referenceYear} (${input.adaptation.regime}).`,
    item_type: "service",
    category: "servico",
    origin: "sinapi",
    source_type: "sinapi",
    source_reference_id: input.adaptation.compositionId,
    sinapi_code: input.adaptation.code,
    uf: input.adaptation.uf ?? input.adaptation.stateCode,
    reference_month: input.adaptation.referenceMonth,
    reference_year: input.adaptation.referenceYear,
    unit: input.adaptation.adaptedUnit,
    unit_cost: input.adaptation.adaptedUnitCost,
    unit_price: input.adaptation.adaptedUnitPrice,
    default_unit_cost: input.adaptation.adaptedUnitCost,
    default_unit_price: input.adaptation.adaptedUnitPrice,
    default_margin_percentage: input.adaptation.marginPercentage,
    source_reference: sourceReference,
    metadata: buildSnapshot(input.adaptation),
    is_active: true
  };
}

function buildBudgetItemPayload(input: {
  organizationId: string;
  budgetId: string;
  createdBy: string;
  adaptation: SinapiAdaptationResult;
}): SinapiBudgetItemPayload {
  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    budget_id: requireText(input.budgetId, "budgetId"),
    item_type: "service",
    category: "servico",
    source_type: "sinapi",
    source_reference_id: input.adaptation.compositionId,
    description: input.adaptation.adaptedDescription,
    unit: input.adaptation.adaptedUnit,
    quantity: input.adaptation.quantity,
    unit_cost: input.adaptation.adaptedUnitCost,
    subtotal_cost: input.adaptation.totalOriginalCost,
    unit_price: input.adaptation.adaptedUnitPrice,
    final_price: input.adaptation.totalAdaptedPrice,
    total_cost: input.adaptation.totalOriginalCost,
    total_price: input.adaptation.totalAdaptedPrice,
    waste_percentage: input.adaptation.wastePercentage,
    margin_percentage: input.adaptation.marginPercentage,
    is_optional: false,
    show_on_proposal: true,
    notes: `Origem SINAPI ${input.adaptation.code} ${input.adaptation.uf ?? input.adaptation.stateCode}/${input.adaptation.referenceMonth}/${input.adaptation.referenceYear}.`,
    created_by: requireText(input.createdBy, "createdBy"),
    updated_by: requireText(input.createdBy, "createdBy")
  };
}

function buildSnapshot(adaptation: SinapiAdaptationResult): SinapiSnapshotJson {
  return {
    code: adaptation.code,
    description: adaptation.description,
    uf: adaptation.uf ?? adaptation.stateCode,
    referenceMonth: adaptation.referenceMonth,
    referenceYear: adaptation.referenceYear,
    regime: adaptation.regime,
    originalUnit: adaptation.originalUnit,
    originalUnitCost: adaptation.originalUnitCost,
    originalLaborCost: adaptation.originalLaborCost,
    originalMaterialCost: adaptation.originalMaterialCost,
    originalEquipmentCost: adaptation.originalEquipmentCost,
    adaptedDescription: adaptation.adaptedDescription,
    adaptedUnit: adaptation.adaptedUnit,
    adaptedUnitCost: adaptation.adaptedUnitCost,
    adaptedUnitPrice: adaptation.adaptedUnitPrice,
    quantity: adaptation.quantity,
    productivityAdjustmentPercentage: adaptation.productivityAdjustmentPercentage,
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

function parsePercentage(value: string, fieldName: string): bigint {
  const parsed = parseScaledDecimal(value, 4, fieldName);
  if (parsed < 0n || parsed > 100n * PERCENT_SCALE) {
    throw new Error(`${fieldName} must be between 0 and 100.`);
  }

  return parsed;
}

function parseSignedPercentage(value: string, fieldName: string): bigint {
  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    throw new Error(`${fieldName} must be a decimal string.`);
  }

  const sign = value.startsWith("-") ? -1n : 1n;
  const unsigned = value.replace(/^-/, "");
  const parsed = parseScaledDecimal(unsigned, 4, fieldName) * sign;
  if (parsed < -90n * PERCENT_SCALE || parsed > 300n * PERCENT_SCALE) {
    throw new Error(`${fieldName} must be between -90 and 300.`);
  }

  return parsed;
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
  const absRemainder = remainder < 0n ? -remainder : remainder;
  const rounded = absRemainder * 2n >= divisor ? quotient + (value >= 0n ? 1n : -1n) : quotient;
  return rounded;
}

function formatMoney(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  const reais = absolute / MONEY_SCALE;
  const centavos = absolute % MONEY_SCALE;
  return `${sign}${reais}.${centavos.toString().padStart(2, "0")}`;
}

function formatSignedMoney(cents: bigint): string {
  return formatMoney(cents);
}

function formatSignedPercentage(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const integer = absolute / PERCENT_SCALE;
  const decimal = absolute % PERCENT_SCALE;
  return `${sign}${integer}.${decimal.toString().padStart(4, "0")}`;
}

function formatScaled(value: bigint, scale: bigint): string {
  const integer = value / scale;
  const decimal = value % scale;
  return `${integer}.${decimal.toString().padStart(4, "0")}`;
}
