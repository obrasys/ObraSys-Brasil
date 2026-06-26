import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildPmeCatalogItemListQuery,
  createPmeCatalogItem,
  deactivatePmeCatalogItem,
  updatePmeCatalogItem
} from "../packages/domain/src/pme/catalog.ts";

test("builds PME catalog item list query", () => {
  const query = buildPmeCatalogItemListQuery({
    organizationId: "org-1",
    itemType: "material",
    origin: "manual",
    search: " argamassa "
  });

  assert.deepEqual(query, {
    table: "pme_catalog_items",
    organizationId: "org-1",
    includeInactive: false,
    itemType: "material",
    origin: "manual",
    search: "argamassa"
  });
});

test("creates PME catalog item payload with defaults", () => {
  const payload = createPmeCatalogItem({
    organizationId: "org-1",
    createdBy: "user-1",
    name: " Pintura m² ",
    itemType: "service"
  });

  assert.deepEqual(payload, {
    organization_id: "org-1",
    created_by: "user-1",
    name: "Pintura m²",
    description: null,
    item_type: "service",
    origin: "manual",
    unit: "un",
    unit_cost: "0.00",
    unit_price: "0.00",
    supplier_name: null,
    source_reference: null,
    metadata: {},
    is_active: true
  });
});

test("creates PME catalog item payload from supplier quote", () => {
  const payload = createPmeCatalogItem({
    organizationId: "org-1",
    createdBy: "user-1",
    name: "Porcelanato 60x60",
    itemType: "material",
    description: "Piso para áreas internas",
    origin: "supplier_quote",
    unit: "m2",
    unitCost: "79.9",
    unitPrice: "95",
    supplierName: "Fornecedor Local",
    sourceReference: "COT-123",
    metadata: { brand: "Linha A" }
  });

  assert.equal(payload.unit_cost, "79.90");
  assert.equal(payload.unit_price, "95.00");
  assert.equal(payload.supplier_name, "Fornecedor Local");
  assert.deepEqual(payload.metadata, { brand: "Linha A" });
});

test("updates PME catalog item payload", () => {
  const payload = updatePmeCatalogItem({
    id: "item-1",
    organizationId: "org-1",
    updatedBy: "user-1",
    name: "Pintura premium",
    unitPrice: "120.5"
  });

  assert.deepEqual(payload, {
    id: "item-1",
    organization_id: "org-1",
    updated_by: "user-1",
    name: "Pintura premium",
    unit_price: "120.50"
  });
});

test("deactivates PME catalog item payload", () => {
  const payload = deactivatePmeCatalogItem({
    id: "item-1",
    organizationId: "org-1",
    updatedBy: "user-1"
  });

  assert.deepEqual(payload, {
    id: "item-1",
    organization_id: "org-1",
    updated_by: "user-1",
    is_active: false
  });
});

test("rejects invalid PME catalog item money", () => {
  assert.throws(
    () =>
      createPmeCatalogItem({
        organizationId: "org-1",
        createdBy: "user-1",
        name: "Argamassa",
        itemType: "material",
        unitCost: "10.999"
      }),
    /unitCost must be a non-negative decimal string with up to 2 decimals/
  );
});
