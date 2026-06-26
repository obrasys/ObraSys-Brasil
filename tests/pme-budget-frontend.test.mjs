import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { pmeBudgetFormSchema } from "../apps/web/src/features/pme-budgets/pmeBudgetSchemas.ts";

test("PME budget form schema accepts a quick budget draft", () => {
  const parsed = pmeBudgetFormSchema.safeParse({
    budgetNumber: "PME-0002",
    title: "Pintura apartamento",
    clientName: "Maria Cliente",
    clientPhone: "",
    clientEmail: "",
    workAddress: "",
    description: "",
    status: "draft",
    validUntil: "",
    overheadPercentage: "10",
    taxPercentage: "5",
    profitPercentage: "20",
    discountAmount: "0.00",
    environments: [{ id: "env-1", name: "Apartamento", description: "" }],
    items: [
      {
        id: "item-1",
        environmentId: "env-1",
        description: "Pintura paredes",
        source: "manual",
        unit: "m2",
        quantity: "60",
        unitCost: "12.00",
        unitPrice: "22.00",
        showOnProposal: true
      }
    ],
    materials: [],
    labor: [],
    paymentTerms: [
      {
        id: "pay-1",
        description: "Entrada",
        dueOffsetDays: 0,
        amount: "",
        percentage: "50"
      },
      {
        id: "pay-2",
        description: "Entrega",
        dueOffsetDays: 15,
        amount: "",
        percentage: "50"
      }
    ]
  });

  assert.equal(parsed.success, true);
});

test("PME budget repository integrates with centralized calculation preview", async () => {
  const repositorySource = await readFile(
    "apps/web/src/features/pme-budgets/pmeBudgetRepository.ts",
    "utf8"
  );

  assert.match(repositorySource, /calculatePmeBudget/);
  assert.match(repositorySource, /calculatePmeBudgetPreview/);
  assert.match(repositorySource, /subtotalCost/);
  assert.match(repositorySource, /finalPrice/);
});

test("PME budget critical components expose required tabs and states", async () => {
  const listSource = await readFile(
    "apps/web/src/features/pme-budgets/PmeBudgetListPage.tsx",
    "utf8"
  );
  const editorSource = await readFile(
    "apps/web/src/features/pme-budgets/PmeBudgetEditorPage.tsx",
    "utf8"
  );

  for (const label of [
    "Resumo",
    "Ambientes",
    "Itens",
    "Materiais",
    "Mão de obra",
    "Margem e impostos",
    "Pagamento"
  ]) {
    assert.match(editorSource, new RegExp(label));
  }

  assert.match(listSource, /Carregando orçamentos/);
  assert.match(listSource, /Nenhum orçamento ainda/);
  assert.match(listSource, /Não foi possível carregar/);
  assert.match(editorSource, /Meu Catálogo/);
  assert.match(editorSource, /SINAPI opcional/);
  assert.match(editorSource, /Não mostra custo nem margem interna/);
});
