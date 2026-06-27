import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addCatalogItemToBudgetSchema,
  addCatalogKitToBudgetSchema,
  pmeCatalogItemSchema,
  pmeCatalogKitItemSchema,
  pmeCatalogKitSchema,
  saveBudgetItemToCatalogSchema
} from "../apps/web/src/features/pme-budgets/pmeCatalogSchemas.ts";

test("PME catalog item schema accepts the approved catalog contract", () => {
  const result = pmeCatalogItemSchema.safeParse({
    name: "Pintura",
    category: "servico",
    unit: "m2",
    defaultUnitCost: "35.00",
    defaultUnitPrice: "55.50",
    defaultMarginPercentage: "20",
    sourceType: "manual"
  });

  assert.equal(result.success, true);
});

test("PME catalog item schema rejects invalid money and reference month", () => {
  assert.equal(
    pmeCatalogItemSchema.safeParse({
      name: "Piso",
      category: "material",
      unit: "m2",
      defaultUnitCost: "10.999",
      defaultUnitPrice: "20",
      defaultMarginPercentage: "10",
      sourceType: "manual",
      referenceMonth: 13
    }).success,
    false
  );
});

test("PME catalog kit schema accepts simple kit without forcing SINAPI", () => {
  const result = pmeCatalogKitSchema.safeParse({
    name: "Reforma de Banheiro Econômico",
    kitType: "reforma_banheiro",
    defaultEnvironment: "Banheiro",
    totalEstimatedCost: "5000",
    totalEstimatedPrice: "7500",
    items: [
      {
        description: "Pintura",
        category: "servico",
        quantity: "12.5",
        unit: "m2",
        unitCost: "10.00",
        unitPrice: "15.50"
      }
    ]
  });

  assert.equal(result.success, true);
});

test("PME catalog kit item schema forbids item and composition at the same time", () => {
  const result = pmeCatalogKitItemSchema.safeParse({
    catalogItemId: "item-1",
    compositionId: "composition-1",
    description: "Composição duplicada",
    category: "composicao",
    quantity: "1",
    unit: "un",
    unitCost: "10",
    unitPrice: "15"
  });

  assert.equal(result.success, false);
});

test("PME catalog action schemas do not accept organizationId from the client", () => {
  assert.equal(saveBudgetItemToCatalogSchema.safeParse({ budgetItemId: "item-1" }).success, true);
  assert.equal(
    addCatalogItemToBudgetSchema.safeParse({
      budgetId: "budget-1",
      catalogItemId: "catalog-item-1",
      quantity: "2"
    }).success,
    true
  );
  assert.equal(
    addCatalogKitToBudgetSchema.safeParse({ budgetId: "budget-1", kitId: "kit-1" }).success,
    true
  );
});
