import assert from "node:assert/strict";
import { test } from "node:test";

import {
  pmeBudgetFormSchema,
  pmeBudgetItemCategorySchema,
  pmeBudgetItemSourceTypeSchema,
  pmeBudgetPaymentTermSchema,
  pmeBudgetPurchaseStatusSchema
} from "../apps/web/src/features/pme-budgets/pmeBudgetSchemas.ts";

test("PME schemas accept approved item categories, source types and purchase statuses", () => {
  assert.equal(pmeBudgetItemCategorySchema.parse("mao_de_obra"), "mao_de_obra");
  assert.equal(pmeBudgetItemSourceTypeSchema.parse("meu_catalogo"), "meu_catalogo");
  assert.equal(pmeBudgetPurchaseStatusSchema.parse("quoted"), "quoted");
});

test("PME payment terms reject invalid money and percentage values", () => {
  assert.equal(
    pmeBudgetPaymentTermSchema.safeParse({
      id: "pay-1",
      installmentNumber: 1,
      description: "Entrada",
      dueOffsetDays: 0,
      dueCondition: "approval",
      amount: "abc",
      percentage: ""
    }).success,
    false
  );

  assert.equal(
    pmeBudgetPaymentTermSchema.safeParse({
      id: "pay-1",
      installmentNumber: 1,
      description: "Entrada",
      dueOffsetDays: 0,
      dueCondition: "approval",
      amount: "",
      percentage: "150.00001"
    }).success,
    false
  );
});

test("PME form schema accepts the robust phase 1 contract fields", () => {
  const result = pmeBudgetFormSchema.safeParse({
    budgetNumber: "PME-0002",
    title: "Reforma de cozinha",
    clientName: "Cliente Teste",
    clientPhone: "",
    clientEmail: "",
    workAddress: "Rua Teste",
    description: "Troca de piso e pintura",
    budgetType: "reforma_cozinha",
    status: "draft",
    pricingMode: "simple_margin",
    validUntil: "",
    overheadPercentage: "10",
    taxPercentage: "5",
    profitPercentage: "20",
    discountAmount: "0.00",
    environments: [
      {
        id: "env-1",
        name: "Cozinha",
        description: ""
      }
    ],
    items: [
      {
        id: "item-1",
        environmentId: "env-1",
        costCenterId: "cc-1",
        itemCode: "SERV-001",
        description: "Assentamento de piso",
        category: "servico",
        sourceType: "manual",
        sourceReferenceId: "",
        source: "manual",
        unit: "m2",
        quantity: "12.5",
        unitCost: "80.00",
        unitPrice: "120.00",
        wastePercentage: "5",
        marginPercentage: "20",
        notes: "Inclui rejunte",
        showOnProposal: true
      }
    ],
    materials: [
      {
        id: "mat-1",
        itemId: "item-1",
        budgetItemId: "item-1",
        description: "Argamassa",
        unit: "sc",
        quantity: "4",
        unitCost: "45.00",
        wastePercentage: "3",
        supplierName: "Fornecedor local",
        purchaseStatus: "quoted"
      }
    ],
    labor: [
      {
        id: "labor-1",
        itemId: "item-1",
        budgetItemId: "item-1",
        laborType: "Pedreiro",
        roleName: "Pedreiro",
        workerName: "Equipe A",
        unit: "h",
        quantity: "16",
        unitCost: "50.00",
        days: "2",
        contractType: "diaria"
      }
    ],
    paymentTerms: [
      {
        id: "pay-1",
        installmentNumber: 1,
        description: "Entrada",
        dueOffsetDays: 0,
        dueCondition: "approval",
        amount: "",
        percentage: "50"
      },
      {
        id: "pay-2",
        installmentNumber: 2,
        description: "Entrega",
        dueOffsetDays: 15,
        dueCondition: "delivery",
        dueDate: "",
        amount: "",
        percentage: "50"
      }
    ]
  });

  assert.equal(result.success, true);
});
