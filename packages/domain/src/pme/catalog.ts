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

export type PmeCatalogOrigin = "manual" | "sinapi" | "supplier_quote" | "axia_suggestion";

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
  itemType?: PmeCatalogItemType;
  origin?: PmeCatalogOrigin;
  search?: string;
}

export interface PmeCatalogItemCreateInput {
  organizationId: string;
  createdBy: string;
  name: string;
  itemType: PmeCatalogItemType;
  description?: string | null;
  origin?: PmeCatalogOrigin;
  unit?: string;
  unitCost?: string;
  unitPrice?: string;
  supplierName?: string | null;
  sourceReference?: string | null;
  metadata?: PmeCatalogJson;
}

export interface PmeCatalogItemCreatePayload {
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  item_type: PmeCatalogItemType;
  origin: PmeCatalogOrigin;
  unit: string;
  unit_cost: string;
  unit_price: string;
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
  itemType?: PmeCatalogItemType;
  origin?: PmeCatalogOrigin;
  unit?: string;
  unitCost?: string;
  unitPrice?: string;
  supplierName?: string | null;
  sourceReference?: string | null;
  metadata?: PmeCatalogJson;
  isActive?: boolean;
}

export interface PmeCatalogItemUpdatePayload {
  id: string;
  organization_id: string;
  updated_by: string;
  name?: string;
  description?: string | null;
  item_type?: PmeCatalogItemType;
  origin?: PmeCatalogOrigin;
  unit?: string;
  unit_cost?: string;
  unit_price?: string;
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

const DEFAULT_ORIGIN: PmeCatalogOrigin = "manual";
const DEFAULT_UNIT = "un";
const DEFAULT_MONEY = "0.00";
const EMPTY_METADATA: PmeCatalogJson = {};

export function buildPmeCatalogItemListQuery(input: {
  organizationId: string;
  includeInactive?: boolean;
  itemType?: PmeCatalogItemType;
  origin?: PmeCatalogOrigin;
  search?: string;
}): PmeCatalogItemListQuery {
  const organizationId = requireText(input.organizationId, "organizationId");
  const search = normalizeOptionalText(input.search);

  return {
    table: "pme_catalog_items",
    organizationId,
    includeInactive: input.includeInactive ?? false,
    ...(typeof input.itemType === "undefined" ? {} : { itemType: input.itemType }),
    ...(typeof input.origin === "undefined" ? {} : { origin: input.origin }),
    ...(search === null ? {} : { search })
  };
}

export function createPmeCatalogItem(
  input: PmeCatalogItemCreateInput
): PmeCatalogItemCreatePayload {
  return {
    organization_id: requireText(input.organizationId, "organizationId"),
    created_by: requireText(input.createdBy, "createdBy"),
    name: requireText(input.name, "name"),
    description: normalizeOptionalText(input.description),
    item_type: input.itemType,
    origin: input.origin ?? DEFAULT_ORIGIN,
    unit: requireText(input.unit ?? DEFAULT_UNIT, "unit"),
    unit_cost: normalizeMoney(input.unitCost ?? DEFAULT_MONEY, "unitCost"),
    unit_price: normalizeMoney(input.unitPrice ?? DEFAULT_MONEY, "unitPrice"),
    supplier_name: normalizeOptionalText(input.supplierName),
    source_reference: normalizeOptionalText(input.sourceReference),
    metadata: input.metadata ?? EMPTY_METADATA,
    is_active: true
  };
}

export function updatePmeCatalogItem(
  input: PmeCatalogItemUpdateInput
): PmeCatalogItemUpdatePayload {
  const payload: PmeCatalogItemUpdatePayload = {
    id: requireText(input.id, "id"),
    organization_id: requireText(input.organizationId, "organizationId"),
    updated_by: requireText(input.updatedBy, "updatedBy")
  };

  if (typeof input.name !== "undefined") {
    payload.name = requireText(input.name, "name");
  }

  if (typeof input.description !== "undefined") {
    payload.description = normalizeOptionalText(input.description);
  }

  if (typeof input.itemType !== "undefined") {
    payload.item_type = input.itemType;
  }

  if (typeof input.origin !== "undefined") {
    payload.origin = input.origin;
  }

  if (typeof input.unit !== "undefined") {
    payload.unit = requireText(input.unit, "unit");
  }

  if (typeof input.unitCost !== "undefined") {
    payload.unit_cost = normalizeMoney(input.unitCost, "unitCost");
  }

  if (typeof input.unitPrice !== "undefined") {
    payload.unit_price = normalizeMoney(input.unitPrice, "unitPrice");
  }

  if (typeof input.supplierName !== "undefined") {
    payload.supplier_name = normalizeOptionalText(input.supplierName);
  }

  if (typeof input.sourceReference !== "undefined") {
    payload.source_reference = normalizeOptionalText(input.sourceReference);
  }

  if (typeof input.metadata !== "undefined") {
    payload.metadata = input.metadata;
  }

  if (typeof input.isActive !== "undefined") {
    payload.is_active = input.isActive;
  }

  return payload;
}

export function deactivatePmeCatalogItem(
  input: PmeCatalogItemDeactivateInput
): PmeCatalogItemUpdatePayload {
  return updatePmeCatalogItem({
    id: input.id,
    organizationId: input.organizationId,
    updatedBy: input.updatedBy,
    isActive: false
  });
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
