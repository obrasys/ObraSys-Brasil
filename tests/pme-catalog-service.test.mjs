import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addCatalogItemToBudget,
  addCatalogKitToBudget,
  buildPmeCatalogItemListQuery,
  createCatalogComposition,
  createCatalogItem,
  createCatalogKit,
  createPmeCatalogItem,
  deactivateCatalogComposition,
  deactivateCatalogItem,
  deactivateCatalogKit,
  deactivatePmeCatalogItem,
  getCatalogItemById,
  listCatalogCompositions,
  listCatalogItems,
  listCatalogKits,
  saveBudgetItemToCatalog,
  updateCatalogComposition,
  updateCatalogKit,
  updatePmeCatalogItem
} from "../packages/domain/src/pme/catalog.ts";

test("builds PME catalog item list query without inactive items by default", () => {
  const query = buildPmeCatalogItemListQuery({
    organizationId: "org-1",
    category: "material",
    sourceType: "manual",
    search: " argamassa "
  });

  assert.deepEqual(query, {
    table: "pme_catalog_items",
    organizationId: "org-1",
    includeInactive: false,
    category: "material",
    sourceType: "manual",
    search: "argamassa"
  });
  assert.deepEqual(listCatalogItems(query), query);
});

test("creates PME catalog item payload with new and legacy fields", () => {
  const payload = createPmeCatalogItem({
    organizationId: "org-1",
    createdBy: "user-1",
    name: " Pintura m² ",
    category: "servico",
    unit: "m2",
    defaultUnitCost: "35",
    defaultUnitPrice: "55.5",
    defaultMarginPercentage: "20"
  });

  assert.deepEqual(payload, {
    organization_id: "org-1",
    created_by: "user-1",
    name: "Pintura m²",
    description: null,
    item_type: "service",
    category: "servico",
    origin: "manual",
    source_type: "manual",
    source_reference_id: null,
    sinapi_code: null,
    uf: null,
    reference_month: null,
    reference_year: null,
    unit: "m2",
    unit_cost: "35.00",
    unit_price: "55.50",
    default_unit_cost: "35.00",
    default_unit_price: "55.50",
    default_margin_percentage: "20",
    supplier_name: null,
    source_reference: null,
    metadata: {},
    is_active: true
  });
});

test("creates PME catalog item payload from supplier quote", () => {
  const payload = createCatalogItem({
    organizationId: "org-1",
    createdBy: "user-1",
    name: "Porcelanato 60x60",
    category: "material",
    description: "Piso para áreas internas",
    sourceType: "supplier_quote",
    unit: "m2",
    defaultUnitCost: "79.9",
    defaultUnitPrice: "95",
    supplierName: "Fornecedor Local",
    sourceReferenceId: "11111111-1111-4111-8111-111111111111",
    metadata: { brand: "Linha A" }
  });

  assert.equal(payload.default_unit_cost, "79.90");
  assert.equal(payload.default_unit_price, "95.00");
  assert.equal(payload.unit_cost, "79.90");
  assert.equal(payload.unit_price, "95.00");
  assert.equal(payload.source_type, "supplier_quote");
  assert.equal(payload.origin, "supplier_quote");
  assert.equal(payload.supplier_name, "Fornecedor Local");
  assert.deepEqual(payload.metadata, { brand: "Linha A" });
});

test("updates and deactivates PME catalog item payloads", () => {
  const update = updatePmeCatalogItem({
    id: "item-1",
    organizationId: "org-1",
    updatedBy: "user-1",
    name: "Pintura premium",
    defaultUnitPrice: "120.5",
    sourceType: "imported"
  });

  assert.deepEqual(update, {
    id: "item-1",
    organization_id: "org-1",
    updated_by: "user-1",
    name: "Pintura premium",
    source_type: "imported",
    default_unit_price: "120.50"
  });

  assert.deepEqual(
    deactivatePmeCatalogItem({ id: "item-1", organizationId: "org-1", updatedBy: "user-1" }),
    {
      id: "item-1",
      organization_id: "org-1",
      updated_by: "user-1",
      is_active: false
    }
  );
  assert.deepEqual(
    deactivateCatalogItem({ id: "item-1", organizationId: "org-1", updatedBy: "user-1" }),
    {
      id: "item-1",
      organization_id: "org-1",
      updated_by: "user-1",
      is_active: false
    }
  );
});

test("builds composition and kit payloads", () => {
  assert.deepEqual(
    createCatalogComposition({
      organizationId: "org-1",
      createdBy: "user-1",
      name: "Pintura completa",
      unit: "m2",
      totalUnitCost: "42",
      totalUnitPrice: "65",
      defaultMarginPercentage: "15"
    }),
    {
      organization_id: "org-1",
      created_by: "user-1",
      name: "Pintura completa",
      description: null,
      unit: "m2",
      total_cost: "42.00",
      total_price: "65.00",
      total_unit_cost: "42.00",
      total_unit_price: "65.00",
      default_margin_percentage: "15",
      is_active: true
    }
  );

  assert.deepEqual(
    createCatalogKit({
      organizationId: "org-1",
      createdBy: "user-1",
      name: "Reforma de Banheiro Médio",
      kitType: "reforma_banheiro",
      defaultEnvironment: "Banheiro",
      totalEstimatedCost: "5000",
      totalEstimatedPrice: "7500"
    }),
    {
      organization_id: "org-1",
      created_by: "user-1",
      name: "Reforma de Banheiro Médio",
      description: null,
      category: "reforma_banheiro",
      kit_type: "reforma_banheiro",
      default_environment: "Banheiro",
      total_cost: "5000.00",
      total_price: "7500.00",
      total_estimated_cost: "5000.00",
      total_estimated_price: "7500.00",
      is_active: true
    }
  );
});

test("updates, deactivates and lists compositions and kits", () => {
  assert.deepEqual(
    updateCatalogComposition({
      id: "composition-1",
      organizationId: "org-1",
      updatedBy: "user-1",
      totalUnitCost: "12.3",
      isActive: true
    }),
    {
      id: "composition-1",
      organization_id: "org-1",
      updated_by: "user-1",
      total_unit_cost: "12.30",
      total_cost: "12.30",
      is_active: true
    }
  );
  assert.deepEqual(
    deactivateCatalogComposition({
      id: "composition-1",
      organizationId: "org-1",
      updatedBy: "user-1"
    }),
    {
      id: "composition-1",
      organization_id: "org-1",
      updated_by: "user-1",
      is_active: false
    }
  );

  assert.deepEqual(
    updateCatalogKit({
      id: "kit-1",
      organizationId: "org-1",
      updatedBy: "user-1",
      kitType: "pintura",
      totalEstimatedPrice: "2200"
    }),
    {
      id: "kit-1",
      organization_id: "org-1",
      updated_by: "user-1",
      kit_type: "pintura",
      category: "pintura",
      total_estimated_price: "2200.00",
      total_price: "2200.00"
    }
  );
  assert.deepEqual(
    deactivateCatalogKit({ id: "kit-1", organizationId: "org-1", updatedBy: "user-1" }),
    {
      id: "kit-1",
      organization_id: "org-1",
      updated_by: "user-1",
      is_active: false
    }
  );

  assert.deepEqual(listCatalogCompositions({ organizationId: "org-1", search: " pintura " }), {
    table: "pme_catalog_compositions",
    organizationId: "org-1",
    includeInactive: false,
    search: "pintura"
  });
  assert.deepEqual(listCatalogKits({ organizationId: "org-1", kitType: "pintura" }), {
    table: "pme_catalog_kits",
    organizationId: "org-1",
    includeInactive: false,
    kitType: "pintura"
  });
});

test("saves a budget item into Meu Catalogo", () => {
  const payload = saveBudgetItemToCatalog({
    organizationId: "org-1",
    createdBy: "user-1",
    description: "Assentamento de porcelanato",
    category: "servico",
    unit: "m2",
    unitCost: "80",
    unitPrice: "125",
    marginPercentage: "30",
    sourceReferenceId: "22222222-2222-4222-8222-222222222222"
  });

  assert.equal(payload.name, "Assentamento de porcelanato");
  assert.equal(payload.category, "servico");
  assert.equal(payload.source_type, "budget_item");
  assert.equal(payload.source_reference_id, "22222222-2222-4222-8222-222222222222");
  assert.equal(payload.default_unit_cost, "80.00");
  assert.equal(payload.default_unit_price, "125.00");
  assert.equal(payload.default_margin_percentage, "30");
});

test("adds a catalog item to budget with rounded totals", () => {
  const payload = addCatalogItemToBudget({
    organizationId: "org-1",
    budgetId: "budget-1",
    createdBy: "user-1",
    catalogItemId: "item-1",
    description: "Pintura",
    category: "servico",
    unit: "m2",
    quantity: "12.5",
    unitCost: "10.00",
    unitPrice: "15.50"
  });

  assert.equal(payload.source_type, "meu_catalogo");
  assert.equal(payload.source_reference_id, "item-1");
  assert.equal(payload.total_cost, "125.00");
  assert.equal(payload.total_price, "193.75");
  assert.equal(payload.show_on_proposal, true);
});

test("adds a kit to budget and recalculates using centralized calculation", () => {
  const result = addCatalogKitToBudget({
    organizationId: "org-1",
    budgetId: "budget-1",
    createdBy: "user-1",
    items: [
      {
        description: "Material",
        category: "material",
        quantity: "2",
        unit: "un",
        unitCost: "100",
        unitPrice: "130"
      },
      {
        description: "Mao de obra",
        category: "mao_de_obra",
        quantity: "1.5",
        unit: "dia",
        unitCost: "200",
        unitPrice: "300"
      }
    ],
    existingCalculationItems: [
      {
        description: "Item existente",
        kind: "servico",
        quantity: "1",
        unitCost: "50",
        unitPrice: "80"
      }
    ],
    overheadPercentage: "10",
    taxPercentage: "5",
    profitPercentage: "20",
    discountAmount: "25"
  });

  assert.equal(result.budgetItems.length, 2);
  assert.equal(result.budgetItems[0].total_cost, "200.00");
  assert.equal(result.budgetItems[1].total_cost, "300.00");
  assert.equal(result.calculation.subtotalCost, "550.00");
  assert.equal(result.calculation.finalPrice, "717.50");
});

test("gets catalog item by organization and rejects invalid money", () => {
  assert.deepEqual(getCatalogItemById({ organizationId: "org-1", id: "item-1" }), {
    table: "pme_catalog_items",
    organizationId: "org-1",
    id: "item-1"
  });

  assert.throws(
    () =>
      createPmeCatalogItem({
        organizationId: "org-1",
        createdBy: "user-1",
        name: "Argamassa",
        itemType: "material",
        unitCost: "10.999"
      }),
    /defaultUnitCost must be a non-negative decimal string with up to 2 decimals/
  );
});
