import assert from "node:assert/strict";
import { test } from "node:test";

import { calculatePmeBudget } from "../packages/domain/src/pme/calculatePmeBudget.ts";

test("calculates budget without discount", () => {
  const result = calculatePmeBudget({
    items: [
      {
        description: "Pintura",
        kind: "service",
        quantity: "10",
        unitCost: "50.00",
        unitPrice: "80.00"
      }
    ],
    overheadPercentage: "0",
    taxPercentage: "0",
    profitPercentage: "0",
    discountAmount: "0"
  });

  assert.equal(result.items[0]?.totalCost, "500.00");
  assert.equal(result.items[0]?.totalPrice, "800.00");
  assert.equal(result.subtotalCost, "500.00");
  assert.equal(result.finalPrice, "500.00");
});

test("calculates budget with discount", () => {
  const result = calculatePmeBudget({
    items: [
      {
        description: "Revestimento",
        kind: "service",
        quantity: "1",
        unitCost: "1000.00",
        unitPrice: "1200.00"
      }
    ],
    overheadPercentage: "10",
    taxPercentage: "5",
    profitPercentage: "20",
    discountAmount: "50.00"
  });

  assert.equal(result.overheadAmount, "100.00");
  assert.equal(result.taxAmount, "50.00");
  assert.equal(result.profitAmount, "200.00");
  assert.equal(result.finalPrice, "1300.00");
});

test("calculates budget with profit margin", () => {
  const result = calculatePmeBudget({
    items: [
      {
        description: "Drywall",
        kind: "service",
        quantity: "2",
        unitCost: "250.00",
        unitPrice: "400.00"
      }
    ],
    overheadPercentage: "0",
    taxPercentage: "0",
    profitPercentage: "30",
    discountAmount: "0"
  });

  assert.equal(result.subtotalCost, "500.00");
  assert.equal(result.profitAmount, "150.00");
  assert.equal(result.finalPrice, "650.00");
});

test("calculates budget with simplified tax", () => {
  const result = calculatePmeBudget({
    items: [
      {
        description: "Instalação elétrica",
        kind: "service",
        quantity: "1",
        unitCost: "800.00",
        unitPrice: "1000.00"
      }
    ],
    overheadPercentage: "0",
    taxPercentage: "12.5",
    profitPercentage: "0",
    discountAmount: "0"
  });

  assert.equal(result.taxAmount, "100.00");
  assert.equal(result.finalPrice, "900.00");
});

test("calculates budget with material and labor", () => {
  const result = calculatePmeBudget({
    items: [
      {
        description: "Argamassa",
        kind: "material",
        quantity: "3",
        unitCost: "40.00",
        unitPrice: "55.00"
      },
      {
        description: "Pedreiro",
        kind: "labor",
        quantity: "8",
        unitCost: "35.00",
        unitPrice: "60.00"
      }
    ],
    overheadPercentage: "10",
    taxPercentage: "0",
    profitPercentage: "15",
    discountAmount: "0"
  });

  assert.equal(result.subtotalCost, "400.00");
  assert.equal(result.subtotalPrice, "645.00");
  assert.equal(result.overheadAmount, "40.00");
  assert.equal(result.profitAmount, "60.00");
  assert.equal(result.finalPrice, "500.00");
});

test("rounds monetary values half up", () => {
  const result = calculatePmeBudget({
    items: [
      {
        description: "Ajuste fino",
        kind: "service",
        quantity: "1.005",
        unitCost: "1.00",
        unitPrice: "1.00"
      }
    ],
    overheadPercentage: "0",
    taxPercentage: "0",
    profitPercentage: "0",
    discountAmount: "0"
  });

  assert.equal(result.items[0]?.totalCost, "1.01");
  assert.equal(result.finalPrice, "1.01");
});

test("rejects monetary values with more than two decimal places", () => {
  assert.throws(
    () =>
      calculatePmeBudget({
        items: [
          {
            description: "Valor inválido",
            kind: "material",
            quantity: "1",
            unitCost: "0.335",
            unitPrice: "0.50"
          }
        ],
        overheadPercentage: "0",
        taxPercentage: "0",
        profitPercentage: "0",
        discountAmount: "0"
      }),
    /unitCost cannot have more than 2 decimal places/
  );
});
