import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SINAPI_DEMO_COMPOSITIONS,
  adaptSinapiComposition,
  createCatalogItemFromSinapi,
  createSinapiSnapshotPayload,
  hasMixedSinapiReference,
  searchSinapiCompositions
} from "../packages/domain/src/sinapi/sinapi.ts";

test("searches SINAPI compositions by UF, reference and description", () => {
  const results = searchSinapiCompositions({
    stateCode: "SP",
    referenceMonth: 6,
    referenceYear: 2026,
    query: "pintura",
    compositions: SINAPI_DEMO_COMPOSITIONS
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]?.code, "88489");
});

test("adapts SINAPI composition with productivity, waste and margin", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[0];
  assert.ok(composition);

  const result = adaptSinapiComposition({
    composition,
    quantity: "10",
    productivityFactor: "1.10",
    wastePercentage: "5",
    marginPercentage: "20"
  });

  assert.equal(result.originalUnitCost, "84.35");
  assert.equal(result.adaptedUnitPrice, "116.92");
  assert.equal(result.totalOriginalCost, "843.50");
  assert.equal(result.totalAdaptedPrice, "1169.20");
});

test("detects mixed SINAPI reference month or state", () => {
  assert.equal(
    hasMixedSinapiReference([{ stateCode: "SP", referenceMonth: 6, referenceYear: 2026 }], {
      stateCode: "RJ",
      referenceMonth: 6,
      referenceYear: 2026
    }),
    true
  );
  assert.equal(
    hasMixedSinapiReference([{ stateCode: "SP", referenceMonth: 6, referenceYear: 2026 }], {
      stateCode: "SP",
      referenceMonth: 6,
      referenceYear: 2026
    }),
    false
  );
});

test("creates immutable SINAPI snapshot payload for PME budget", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[1];
  assert.ok(composition);

  const adaptation = adaptSinapiComposition({
    composition,
    quantity: "25",
    productivityFactor: "1",
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
  assert.equal(payload.state_code, "SP");
  assert.equal(payload.reference_month, 6);
  assert.equal(payload.reference_year, 2026);
  assert.equal(payload.original_unit_cost, "18.72");
  assert.equal(payload.adapted_unit_price, "21.53");
  assert.equal(payload.budget_item_id, "item-1");
});

test("creates catalog item payload from adapted SINAPI composition", () => {
  const composition = SINAPI_DEMO_COMPOSITIONS[0];
  assert.ok(composition);

  const adaptation = adaptSinapiComposition({
    composition,
    quantity: "1",
    productivityFactor: "1",
    wastePercentage: "0",
    marginPercentage: "10"
  });
  const payload = createCatalogItemFromSinapi({
    organizationId: "org-1",
    createdBy: "user-1",
    adaptation
  });

  assert.equal(payload.origin, "sinapi");
  assert.equal(payload.item_type, "service");
  assert.equal(payload.unit_cost, "84.35");
  assert.equal(payload.unit_price, "92.79");
  assert.match(payload.source_reference, /SP-2026-6-87267/);
});
