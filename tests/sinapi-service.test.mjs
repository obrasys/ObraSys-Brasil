import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SINAPI_DEMO_COMPOSITIONS,
  adaptSinapiComposition,
  addSinapiCompositionToPmeBudget,
  compareBudgetItemWithSinapiReference,
  createCatalogItemFromSinapi,
  createSinapiSnapshotPayload,
  getSinapiCompositionDetails,
  hasMixedSinapiReference,
  listSinapiStates,
  listSinapiVersions,
  saveAdaptedSinapiItem,
  searchSinapiCompositions
} from "../packages/domain/src/sinapi/sinapi.ts";

test("lists SINAPI states and versions", () => {
  assert.ok(listSinapiStates().some((state) => state.uf === "SP"));
  assert.ok(listSinapiVersions().some((version) => version.uf === "SP"));
});

test("searches SINAPI compositions by UF, reference, regime and description with pagination", () => {
  const results = searchSinapiCompositions({
    stateCode: "SP",
    uf: "SP",
    referenceMonth: 6,
    referenceYear: 2026,
    regime: "nao_desonerado",
    query: "pintura",
    page: 1,
    pageSize: 1,
    compositions: SINAPI_DEMO_COMPOSITIONS
  });

  assert.equal(results.items.length, 1);
  assert.equal(results.items[0]?.code, "88489");
  assert.equal(results.totalPages, 1);
});

test("searches SINAPI compositions by code", () => {
  const results = searchSinapiCompositions({
    stateCode: "SP",
    uf: "SP",
    referenceMonth: 6,
    referenceYear: 2026,
    regime: "nao_desonerado",
    query: "87267",
    compositions: SINAPI_DEMO_COMPOSITIONS
  });

  assert.equal(results.items[0]?.code, "87267");
});

test("gets SINAPI composition details", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[0];
  assert.ok(composition);
  const detail = getSinapiCompositionDetails({
    compositionId: composition.id,
    versionId: composition.versionId
  });

  assert.ok(detail);
  assert.ok(detail.items.length > 0);
});

test("adapts SINAPI composition with productivity, waste and margin", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[0];
  assert.ok(composition);

  const result = adaptSinapiComposition({
    composition,
    quantity: "10",
    productivityAdjustmentPercentage: "10",
    wastePercentage: "5",
    marginPercentage: "20"
  });

  assert.equal(result.originalUnitCost, "84.35");
  assert.equal(result.adaptedUnitPrice, "116.92");
  assert.equal(result.totalOriginalCost, "843.50");
  assert.equal(result.totalAdaptedPrice, "1169.20");
  assert.equal(result.regime, "nao_desonerado");
});

test("detects mixed SINAPI reference month, state or regime", () => {
  assert.equal(
    hasMixedSinapiReference(
      [{ stateCode: "SP", referenceMonth: 6, referenceYear: 2026, regime: "nao_desonerado" }],
      {
        stateCode: "RJ",
        referenceMonth: 6,
        referenceYear: 2026,
        regime: "nao_desonerado"
      }
    ),
    true
  );
  assert.equal(
    hasMixedSinapiReference(
      [{ stateCode: "SP", referenceMonth: 6, referenceYear: 2026, regime: "nao_desonerado" }],
      {
        stateCode: "SP",
        referenceMonth: 6,
        referenceYear: 2026,
        regime: "nao_desonerado"
      }
    ),
    false
  );
});

test("creates immutable SINAPI snapshot payload for PME budget", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[1];
  assert.ok(composition);

  const adaptation = adaptSinapiComposition({
    composition,
    quantity: "25",
    productivityAdjustmentPercentage: "0",
    wastePercentage: "0",
    marginPercentage: "15"
  });
  const payload = createSinapiSnapshotPayload({
    organizationId: "org-1",
    budgetId: "budget-1",
    budgetItemId: "item-1",
    createdBy: "user-1",
    adaptation
  });

  assert.equal(payload.sinapi_code, "88489");
  assert.equal(payload.uf, "SP");
  assert.equal(payload.reference_month, 6);
  assert.equal(payload.reference_year, 2026);
  assert.equal(payload.regime, "nao_desonerado");
  assert.equal(payload.original_total_cost, "18.72");
  assert.equal(payload.adapted_unit_price, "21.53");
  assert.equal(payload.budget_item_id, "item-1");
});

test("creates budget item and snapshot plan from SINAPI composition", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[0];
  assert.ok(composition);
  const adaptation = adaptSinapiComposition({
    composition,
    quantity: "2",
    productivityAdjustmentPercentage: "0",
    wastePercentage: "0",
    marginPercentage: "10"
  });
  const result = addSinapiCompositionToPmeBudget({
    organizationId: "org-1",
    budgetId: "budget-1",
    budgetItemId: "item-1",
    createdBy: "user-1",
    adaptation
  });

  assert.equal(result.item.source_type, "sinapi");
  assert.equal(result.snapshot.sinapi_code, "87267");
});

test("creates saved SINAPI item and catalog item payloads", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[0];
  assert.ok(composition);

  const adaptation = adaptSinapiComposition({
    composition,
    quantity: "1",
    productivityAdjustmentPercentage: "0",
    wastePercentage: "0",
    marginPercentage: "10"
  });
  const saved = saveAdaptedSinapiItem({
    organizationId: "org-1",
    createdBy: "user-1",
    adaptation
  });
  const catalog = createCatalogItemFromSinapi({
    organizationId: "org-1",
    createdBy: "user-1",
    adaptation
  });

  assert.equal(saved.sinapi_code, "87267");
  assert.equal(catalog.source_type, "sinapi");
  assert.equal(catalog.unit_cost, "84.35");
  assert.equal(catalog.unit_price, "92.79");
  assert.match(catalog.source_reference, /SP-2026-6-nao_desonerado-87267/);
});

test("compares budget item with SINAPI reference", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[0];
  assert.ok(composition);
  const comparison = compareBudgetItemWithSinapiReference({
    budgetItemId: "item-1",
    description: "Revestimento adaptado",
    unit: "m2",
    quantity: "1",
    unitCost: "90.00",
    unitPrice: "120.00",
    reference: composition
  });

  assert.equal(comparison.referenceCode, "87267");
  assert.equal(comparison.costDifferenceAmount, "5.65");
});
