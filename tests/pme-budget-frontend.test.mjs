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
    budgetType: "pintura",
    status: "draft",
    pricingMode: "simple_margin",
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

test("PME budget form schema rejects zero quantity and negative cost", () => {
  const baseBudget = {
    budgetNumber: "PME-0003",
    title: "Troca de piso",
    clientName: "Cliente Teste",
    clientPhone: "",
    clientEmail: "",
    workAddress: "",
    description: "",
    budgetType: "troca_piso",
    status: "draft",
    pricingMode: "simple_margin",
    validUntil: "",
    overheadPercentage: "0",
    taxPercentage: "0",
    profitPercentage: "20",
    discountAmount: "0.00",
    environments: [],
    items: [
      {
        id: "item-1",
        environmentId: "",
        description: "Assentamento de piso",
        source: "manual",
        unit: "m2",
        quantity: "0",
        unitCost: "10.00",
        unitPrice: "20.00",
        showOnProposal: true
      }
    ],
    materials: [],
    labor: [],
    paymentTerms: []
  };

  assert.equal(pmeBudgetFormSchema.safeParse(baseBudget).success, false);
  assert.equal(
    pmeBudgetFormSchema.safeParse({
      ...baseBudget,
      items: [{ ...baseBudget.items[0], quantity: "1", unitCost: "-1.00" }]
    }).success,
    false
  );
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
  const labelsSource = await readFile(
    "apps/web/src/features/pme-budgets/pmeBudgetLabels.ts",
    "utf8"
  );

  for (const label of [
    "Resumo",
    "Ambientes",
    "Itens",
    "Materiais",
    "Mão de obra",
    "Margem e impostos",
    "Pagamento",
    "Axia"
  ]) {
    assert.match(labelsSource, new RegExp(label));
  }

  assert.match(listSource, /Carregando orçamentos/);
  assert.match(listSource, /Nenhum orçamento ainda/);
  assert.match(listSource, /Não foi possível carregar/);
  assert.doesNotMatch(labelsSource, /SINAPI opcional/);

  const catalogSource = await readFile(
    "apps/web/src/features/pme-budgets/components/PmeCatalogPicker.tsx",
    "utf8"
  );
  const totalsSource = await readFile(
    "apps/web/src/features/pme-budgets/components/PmeBudgetTotalsCard.tsx",
    "utf8"
  );

  assert.match(catalogSource, /Meu Catálogo/);
  assert.match(catalogSource, /Mostrar inativos/);
  assert.match(totalsSource, /Não mostra custo nem margem interna/);
});

test("PME budget routes use the approved app paths", async () => {
  const moduleSource = await readFile(
    "apps/web/src/features/pme-budgets/PmeBudgetsModule.tsx",
    "utf8"
  );

  assert.match(moduleSource, /\/app\/orcamentos-pme/);
  assert.match(moduleSource, /\/editar/);
});

test("PME budget feature exposes separated pages, hooks and service client", async () => {
  const editSource = await readFile(
    "apps/web/src/features/pme-budgets/PmeBudgetEditPage.tsx",
    "utf8"
  );
  const headerSource = await readFile(
    "apps/web/src/features/pme-budgets/components/PmeBudgetHeader.tsx",
    "utf8"
  );
  const createSource = await readFile(
    "apps/web/src/features/pme-budgets/PmeBudgetCreatePage.tsx",
    "utf8"
  );
  const clientSource = await readFile(
    "apps/web/src/features/pme-budgets/services/pmeBudgetClient.ts",
    "utf8"
  );
  const calculationHookSource = await readFile(
    "apps/web/src/features/pme-budgets/hooks/usePmeBudgetCalculation.ts",
    "utf8"
  );

  assert.match(createSource, /Criar orçamento/);
  assert.match(headerSource, /Salvar rascunho/);
  assert.match(headerSource, /Marcar como aprovado/);
  assert.match(editSource, /PmeBudgetPaymentTermsTab/);
  assert.match(editSource, /PmeBudgetAxiaPanel/);
  assert.match(clientSource, /calculateBudget/);
  assert.match(calculationHookSource, /useMutation/);
});

test("PME budget Axia panel exposes consultative AI flow", async () => {
  const panelSource = await readFile(
    "apps/web/src/features/pme-budgets/components/PmeBudgetAxiaPanel.tsx",
    "utf8"
  );
  const hookSource = await readFile(
    "apps/web/src/features/pme-budgets/hooks/usePmeAxia.ts",
    "utf8"
  );
  const schemaSource = await readFile(
    "apps/web/src/features/pme-budgets/pmeAxiaSchemas.ts",
    "utf8"
  );

  assert.match(panelSource, /Pedir ajuda à Axia/);
  assert.match(panelSource, /não aprova/);
  assert.match(panelSource, /Não inclua CPF/);
  assert.match(panelSource, /sourceType: "axia_suggestion"/);
  assert.match(hookSource, /useMutation/);
  assert.match(schemaSource, /create_budget_draft/);
  assert.match(schemaSource, /humanValidationRequired/);
});

test("PME SINAPI picker is optional and warns about snapshots", async () => {
  const itemsTabSource = await readFile(
    "apps/web/src/features/pme-budgets/components/PmeBudgetItemsTab.tsx",
    "utf8"
  );
  const pickerSource = await readFile(
    "apps/web/src/features/pme-budgets/components/PmeSinapiPicker.tsx",
    "utf8"
  );
  const createSource = await readFile(
    "apps/web/src/features/pme-budgets/PmeBudgetCreatePage.tsx",
    "utf8"
  );

  assert.match(itemsTabSource, /Adicionar do SINAPI/);
  assert.match(pickerSource, /SINAPI é uma referência de custo/);
  assert.match(pickerSource, /congelado como snapshot/);
  assert.match(pickerSource, /Atualizações futuras do/);
  assert.match(pickerSource, /Página anterior/);
  assert.doesNotMatch(createSource, /SINAPI/);
});
