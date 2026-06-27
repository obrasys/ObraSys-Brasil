import {
  SINAPI_DEMO_COMPOSITIONS,
  adaptSinapiComposition,
  buildAxiaPmeAssistantResponse,
  calculatePmeBudget,
  createCatalogItemFromSinapi,
  getSinapiCompositionDetails,
  hasMixedSinapiReference,
  listSinapiStates,
  listSinapiVersions,
  saveAdaptedSinapiItem,
  searchSinapiCompositions,
  type PmeBudgetCalculationItemInput,
  type SinapiCompositionDetail,
  type SinapiCompositionSearchResult,
  type SinapiSavedItemPayload,
  type SinapiState,
  type SinapiVersion
} from "@obrasys/domain";

import type { PmeAxiaRequestValues, PmeAxiaResponse } from "./pmeAxiaSchemas";
import type { PmeBudgetFormValues, PmeBudgetStatus } from "./pmeBudgetSchemas";
import type {
  PmeBudgetConversionResult,
  PmeBudgetConversionValues
} from "./pmeBudgetConversionSchemas";
import type { PmeSinapiAdaptationValues, PmeSinapiSearchValues } from "./pmeSinapiSchemas";
import type {
  PmeBudgetCalculationPreview,
  PmeBudgetFilters,
  PmeBudgetRecord,
  PmeBudgetSummary,
  PmeCatalogPickerEntry
} from "./pmeBudgetUiTypes";

const nowIso = () => new Date().toISOString();

const catalogEntries: PmeCatalogPickerEntry[] = [
  {
    id: "catalog-item-1",
    name: "Pintura de parede interna",
    description: "Preparação simples e pintura com duas demãos.",
    category: "servico",
    type: "item",
    unit: "m2",
    quantity: "1",
    unitCost: "12.00",
    unitPrice: "24.00",
    isActive: true
  },
  {
    id: "catalog-item-2",
    name: "Instalação de piso cerâmico",
    description: "Assentamento com argamassa e rejunte, sem material.",
    category: "servico",
    type: "composition",
    unit: "m2",
    quantity: "1",
    unitCost: "48.00",
    unitPrice: "82.00",
    isActive: true
  },
  {
    id: "catalog-kit-1",
    name: "Kit Reforma de Banheiro Econômico",
    description: "Serviços base para banheiro pequeno.",
    category: "servico",
    type: "kit",
    unit: "kit",
    quantity: "1",
    unitCost: "1320.00",
    unitPrice: "2180.00",
    isActive: true,
    items: [
      {
        description: "Remoção de revestimento antigo",
        category: "servico",
        unit: "m2",
        quantity: "12",
        unitCost: "35.00",
        unitPrice: "55.00"
      },
      {
        description: "Assentamento de revestimento",
        category: "servico",
        unit: "m2",
        quantity: "12",
        unitCost: "62.00",
        unitPrice: "98.00"
      }
    ]
  },
  {
    id: "catalog-item-inactive",
    name: "Item antigo desativado",
    description: "Exemplo de item preservado no histórico.",
    category: "outro",
    type: "item",
    unit: "un",
    quantity: "1",
    unitCost: "10.00",
    unitPrice: "15.00",
    isActive: false
  }
];

const initialBudget: PmeBudgetRecord = {
  id: "budget-demo-1",
  convertedProjectId: null,
  budgetNumber: "PME-0001",
  title: "Reforma de banheiro",
  clientName: "Cliente exemplo",
  clientPhone: "",
  clientEmail: "",
  workAddress: "Rua das Obras, 100",
  description: "Orçamento rápido para validar o fluxo PME.",
  budgetType: "reforma_banheiro",
  status: "draft",
  pricingMode: "simple_margin",
  validUntil: "",
  overheadPercentage: "8",
  taxPercentage: "6",
  profitPercentage: "18",
  discountAmount: "0.00",
  environments: [
    {
      id: "env-1",
      name: "Banheiro",
      description: "Ambiente principal da reforma"
    }
  ],
  items: [
    {
      id: "item-1",
      environmentId: "env-1",
      description: "Remoção de revestimento antigo",
      category: "servico",
      sourceType: "manual",
      source: "manual",
      unit: "m2",
      quantity: "12",
      unitCost: "35.00",
      unitPrice: "55.00",
      marginPercentage: "20",
      showOnProposal: true
    }
  ],
  materials: [
    {
      id: "mat-1",
      itemId: "item-1",
      description: "Argamassa ACII",
      unit: "sc",
      quantity: "3",
      unitCost: "42.00",
      wastePercentage: "0",
      supplierName: "Fornecedor local",
      purchaseStatus: "quoted"
    }
  ],
  labor: [
    {
      id: "labor-1",
      itemId: "item-1",
      laborType: "pedreiro",
      roleName: "Pedreiro",
      unit: "dia",
      quantity: "2",
      unitCost: "220.00",
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
      dueCondition: "Na aprovação",
      amount: "",
      percentage: "50"
    },
    {
      id: "pay-2",
      installmentNumber: 2,
      description: "Entrega",
      dueOffsetDays: 20,
      dueCondition: "Na entrega",
      amount: "",
      percentage: "50"
    }
  ],
  subtotalCost: "986.00",
  subtotalPrice: "1226.00",
  overheadAmount: "78.88",
  taxAmount: "59.16",
  profitAmount: "177.48",
  finalPrice: "1301.52",
  createdAt: nowIso(),
  updatedAt: nowIso(),
  responsibleName: "Equipe PME"
};

let budgets: PmeBudgetRecord[] = [recalculateRecord(initialBudget)];
let savedSinapiItems: SinapiSavedItemPayload[] = [];

export async function listPmeBudgets(filters: PmeBudgetFilters): Promise<PmeBudgetSummary[]> {
  await wait();

  return budgets
    .filter((budget) => matchesFilters(budget, filters))
    .map((budget) => ({
      id: budget.id,
      budgetNumber: budget.budgetNumber,
      title: budget.title,
      clientName: budget.clientName,
      responsibleName: budget.responsibleName,
      status: budget.status,
      validUntil: budget.validUntil ?? "",
      finalPrice: budget.finalPrice,
      subtotalCost: budget.subtotalCost,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt
    }));
}

export async function getPmeBudget(id: string): Promise<PmeBudgetRecord | null> {
  await wait();

  return budgets.find((budget) => budget.id === id) ?? null;
}

export async function savePmeBudget(input: PmeBudgetFormValues): Promise<PmeBudgetRecord> {
  await wait();

  const id = input.id ?? createId("budget");
  const existing = budgets.find((budget) => budget.id === id);
  const nextBudget = recalculateRecord({
    ...input,
    id,
    convertedProjectId: existing?.convertedProjectId ?? null,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    responsibleName: existing?.responsibleName ?? "Equipe PME",
    subtotalCost: "0.00",
    subtotalPrice: "0.00",
    overheadAmount: "0.00",
    taxAmount: "0.00",
    profitAmount: "0.00",
    finalPrice: "0.00"
  });

  budgets = existing
    ? budgets.map((budget) => (budget.id === id ? nextBudget : budget))
    : [nextBudget, ...budgets];

  return nextBudget;
}

export async function updatePmeBudgetStatus(
  id: string,
  status: PmeBudgetStatus
): Promise<PmeBudgetRecord> {
  await wait();

  const existing = budgets.find((budget) => budget.id === id);
  if (typeof existing === "undefined") {
    throw new Error("Orçamento não encontrado.");
  }

  const nextBudget = { ...existing, status, updatedAt: nowIso() };
  budgets = budgets.map((budget) => (budget.id === id ? nextBudget : budget));
  return nextBudget;
}

export async function convertPmeBudgetToProject(
  input: PmeBudgetConversionValues
): Promise<PmeBudgetConversionResult> {
  await wait();

  const existing = budgets.find((budget) => budget.id === input.budgetId);
  if (typeof existing === "undefined") {
    throw new Error("Orçamento não encontrado.");
  }

  if (existing.convertedProjectId !== null) {
    return {
      budgetId: existing.id,
      projectId: existing.convertedProjectId,
      status: "converted_to_project"
    };
  }

  if (existing.status !== "approved") {
    throw new Error("Somente orçamentos aprovados podem virar obra.");
  }

  const projectId = createId("project");
  const nextBudget: PmeBudgetRecord = {
    ...existing,
    status: "converted_to_project",
    convertedProjectId: projectId,
    updatedAt: nowIso()
  };
  budgets = budgets.map((budget) => (budget.id === existing.id ? nextBudget : budget));

  return {
    budgetId: existing.id,
    projectId,
    status: "converted_to_project"
  };
}

export async function runPmeAxiaAssistant(input: PmeAxiaRequestValues): Promise<PmeAxiaResponse> {
  await wait();

  const budget = input.budgetId
    ? budgets.find((candidate) => candidate.id === input.budgetId)
    : undefined;
  const axiaContext =
    typeof budget === "undefined"
      ? {}
      : {
          budgetId: budget.id,
          budgetNumber: budget.budgetNumber,
          title: budget.title,
          ...(typeof budget.description === "string" && budget.description.length > 0
            ? { description: budget.description }
            : {}),
          budgetType: budget.budgetType,
          status: budget.status,
          environments: budget.environments,
          items: budget.items.map((item) => ({
            description: item.description,
            category: item.category,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            showOnProposal: item.showOnProposal
          })),
          totals: {
            subtotalCost: budget.subtotalCost,
            finalPrice: budget.finalPrice,
            profitPercentage: budget.profitPercentage,
            taxPercentage: budget.taxPercentage,
            discountAmount: budget.discountAmount
          },
          paymentTerms: budget.paymentTerms.map((term) => ({
            description: term.description,
            percentage: term.percentage ?? null,
            amount: term.amount ?? null,
            dueCondition: term.dueCondition ?? null
          })),
          sinapiReferences: budget.items.flatMap((item) =>
            typeof item.sinapiSnapshot === "undefined"
              ? []
              : [
                  {
                    code: item.sinapiSnapshot.code,
                    description: item.sinapiSnapshot.description,
                    stateCode: item.sinapiSnapshot.stateCode,
                    referenceMonth: item.sinapiSnapshot.referenceMonth,
                    referenceYear: item.sinapiSnapshot.referenceYear,
                    originalUnitCost: item.sinapiSnapshot.originalUnitCost,
                    adaptedUnitPrice: item.sinapiSnapshot.adaptedUnitPrice
                  }
                ]
          )
        };
  const response = buildAxiaPmeAssistantResponse({
    actionType: input.actionType,
    userMessage: input.userMessage ?? "",
    context: axiaContext
  });

  return {
    runId: createId("axia-run"),
    ...response
  };
}

export async function calculatePmeBudgetOfficial(
  input: PmeBudgetFormValues
): Promise<PmeBudgetCalculationPreview> {
  await wait();
  return calculatePmeBudgetPreview(input);
}

export async function searchPmeCatalogEntries(input: {
  query: string;
  category: string;
  type: string;
  includeInactive: boolean;
}): Promise<PmeCatalogPickerEntry[]> {
  await wait();

  const normalizedQuery = input.query.trim().toLocaleLowerCase("pt-BR");
  return catalogEntries.filter((entry) => {
    if (!input.includeInactive && !entry.isActive) {
      return false;
    }

    const matchesQuery =
      normalizedQuery.length === 0 ||
      entry.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ||
      entry.description.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    const matchesCategory = input.category === "all" || entry.category === input.category;
    const matchesType = input.type === "all" || entry.type === input.type;

    return matchesQuery && matchesCategory && matchesType;
  });
}

export async function listPmeSinapiStates(): Promise<SinapiState[]> {
  await wait();
  return listSinapiStates();
}

export async function listPmeSinapiVersions(): Promise<SinapiVersion[]> {
  await wait();
  return listSinapiVersions();
}

export async function searchPmeSinapiCompositions(
  input: PmeSinapiSearchValues
): Promise<SinapiCompositionSearchResult> {
  await wait();

  return searchSinapiCompositions({
    stateCode: input.uf,
    uf: input.uf,
    referenceMonth: input.referenceMonth,
    referenceYear: input.referenceYear,
    regime: input.regime,
    query: input.query,
    page: input.page,
    pageSize: 6,
    compositions: SINAPI_DEMO_COMPOSITIONS
  });
}

export async function getPmeSinapiCompositionDetails(
  compositionId: string,
  versionId: string
): Promise<SinapiCompositionDetail | null> {
  await wait();
  return getSinapiCompositionDetails({ compositionId, versionId });
}

export async function addPmeSinapiCompositionToBudget(input: {
  budgetId: string;
  compositionId: string;
  versionId: string;
  adaptation: PmeSinapiAdaptationValues;
}): Promise<PmeBudgetRecord> {
  await wait();

  const budget = budgets.find((candidate) => candidate.id === input.budgetId);
  if (typeof budget === "undefined") {
    throw new Error("Orçamento não encontrado.");
  }

  const composition = SINAPI_DEMO_COMPOSITIONS.find(
    (candidate) => candidate.id === input.compositionId && candidate.versionId === input.versionId
  );
  if (typeof composition === "undefined") {
    throw new Error("Composição SINAPI não encontrada.");
  }

  const adaptation = adaptSinapiComposition({
    composition,
    quantity: input.adaptation.quantity,
    adaptedDescription: input.adaptation.adaptedDescription,
    adaptedUnit: input.adaptation.adaptedUnit,
    adaptedUnitCost: input.adaptation.adaptedUnitCost,
    adaptedUnitPrice: input.adaptation.adaptedUnitPrice,
    productivityAdjustmentPercentage: input.adaptation.productivityAdjustmentPercentage,
    wastePercentage: input.adaptation.wastePercentage,
    marginPercentage: input.adaptation.marginPercentage
  });
  const nextItem: PmeBudgetFormValues["items"][number] = {
    id: createId("item"),
    environmentId: "",
    description: adaptation.adaptedDescription,
    category: "servico",
    sourceType: "sinapi",
    sourceReferenceId: adaptation.compositionId,
    source: "sinapi_optional",
    unit: adaptation.adaptedUnit,
    quantity: adaptation.quantity,
    unitCost: adaptation.adaptedUnitCost,
    unitPrice: adaptation.adaptedUnitPrice,
    wastePercentage: adaptation.wastePercentage,
    marginPercentage: adaptation.marginPercentage,
    sinapiSnapshot: {
      compositionId: adaptation.compositionId,
      versionId: adaptation.versionId,
      code: adaptation.code,
      description: adaptation.description,
      unit: adaptation.originalUnit,
      stateCode: adaptation.uf ?? adaptation.stateCode,
      referenceMonth: adaptation.referenceMonth,
      referenceYear: adaptation.referenceYear,
      originalUnitCost: adaptation.originalUnitCost,
      adaptedUnitPrice: adaptation.adaptedUnitPrice,
      productivityFactor: adaptation.productivityFactor,
      wastePercentage: adaptation.wastePercentage,
      marginPercentage: adaptation.marginPercentage,
      usedAt: adaptation.usedAt
    },
    showOnProposal: true
  };
  const nextBudget = recalculateRecord({
    ...budget,
    items: [...budget.items, nextItem],
    updatedAt: nowIso()
  });

  budgets = budgets.map((candidate) => (candidate.id === budget.id ? nextBudget : candidate));

  if (input.adaptation.saveToCatalog) {
    const catalogPayload = createCatalogItemFromSinapi({
      organizationId: "demo-organization",
      createdBy: "demo-user",
      adaptation
    });
    savedSinapiItems = [
      saveAdaptedSinapiItem({
        organizationId: "demo-organization",
        createdBy: "demo-user",
        adaptation,
        savedToCatalogItemId: catalogPayload.source_reference_id
      }),
      ...savedSinapiItems
    ];
  }

  return nextBudget;
}

export function hasBudgetMixedSinapiReference(
  budget: PmeBudgetFormValues,
  nextReference: {
    stateCode: string;
    referenceMonth: number;
    referenceYear: number;
    regime: string;
  }
): boolean {
  const existingReferences = budget.items.flatMap((item) => {
    if (typeof item.sinapiSnapshot === "undefined") {
      return [];
    }

    return [
      {
        stateCode: item.sinapiSnapshot.stateCode,
        referenceMonth: item.sinapiSnapshot.referenceMonth,
        referenceYear: item.sinapiSnapshot.referenceYear,
        regime: "nao_desonerado" as const
      }
    ];
  });

  return hasMixedSinapiReference(existingReferences, {
    stateCode: nextReference.stateCode,
    referenceMonth: nextReference.referenceMonth,
    referenceYear: nextReference.referenceYear,
    regime: nextReference.regime === "desonerado" ? "desonerado" : "nao_desonerado"
  });
}

export function createPmeBudgetDraft(): PmeBudgetFormValues {
  return {
    budgetNumber: `PME-${String(budgets.length + 1).padStart(4, "0")}`,
    title: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    workAddress: "",
    description: "",
    budgetType: "outro",
    status: "draft",
    pricingMode: "simple_margin",
    validUntil: "",
    overheadPercentage: "0",
    taxPercentage: "0",
    profitPercentage: "20",
    discountAmount: "0.00",
    environments: [
      {
        id: createId("env"),
        name: "Ambiente principal",
        description: ""
      }
    ],
    items: [],
    materials: [],
    labor: [],
    paymentTerms: [
      {
        id: createId("pay"),
        installmentNumber: 1,
        description: "Entrada",
        dueOffsetDays: 0,
        dueCondition: "Na aprovação",
        amount: "",
        percentage: "50"
      },
      {
        id: createId("pay"),
        installmentNumber: 2,
        description: "Entrega",
        dueOffsetDays: 15,
        dueCondition: "Na entrega",
        amount: "",
        percentage: "50"
      }
    ]
  };
}

export function calculatePmeBudgetPreview(input: PmeBudgetFormValues): PmeBudgetCalculationPreview {
  const calculationItems: PmeBudgetCalculationItemInput[] = [
    ...input.items.map((item) => ({
      id: item.id,
      description: item.description || "Serviço sem descrição",
      kind: item.category ?? "servico",
      quantity: item.quantity || "0",
      unitCost: item.unitCost || "0.00",
      unitPrice: item.unitPrice || "0.00"
    })),
    ...input.materials.map((material) => ({
      id: material.id,
      description: material.description || "Material sem descrição",
      kind: "material" as const,
      quantity: material.quantity || "0",
      unitCost: material.unitCost || "0.00",
      unitPrice: material.unitCost || "0.00"
    })),
    ...input.labor.map((labor) => ({
      id: labor.id,
      description: labor.roleName || "Mão de obra sem descrição",
      kind: "mao_de_obra" as const,
      quantity: labor.quantity || "0",
      unitCost: labor.unitCost || "0.00",
      unitPrice: labor.unitCost || "0.00"
    }))
  ];
  const result = calculatePmeBudget({
    items: calculationItems,
    overheadPercentage: input.overheadPercentage || "0",
    taxPercentage: input.taxPercentage || "0",
    profitPercentage: input.profitPercentage || "0",
    discountAmount: input.discountAmount || "0.00"
  });

  return {
    subtotalCost: result.subtotalCost,
    subtotalPrice: result.subtotalPrice,
    overheadAmount: result.overheadAmount,
    taxAmount: result.taxAmount,
    profitAmount: result.profitAmount,
    discountAmount: result.discountAmount,
    finalPrice: result.finalPrice
  };
}

function recalculateRecord(record: PmeBudgetRecord): PmeBudgetRecord {
  const preview = calculatePmeBudgetPreview(record);

  return {
    ...record,
    subtotalCost: preview.subtotalCost,
    subtotalPrice: preview.subtotalPrice,
    overheadAmount: preview.overheadAmount,
    taxAmount: preview.taxAmount,
    profitAmount: preview.profitAmount,
    finalPrice: preview.finalPrice
  };
}

function matchesFilters(budget: PmeBudgetRecord, filters: PmeBudgetFilters): boolean {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("pt-BR");
  const normalizedClient = filters.client.trim().toLocaleLowerCase("pt-BR");
  const matchesStatus = filters.status === "all" || budget.status === filters.status;
  const matchesClient =
    normalizedClient.length === 0 ||
    budget.clientName.toLocaleLowerCase("pt-BR").includes(normalizedClient);
  const matchesQuery =
    normalizedQuery.length === 0 ||
    budget.title.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ||
    budget.budgetNumber.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ||
    budget.clientName.toLocaleLowerCase("pt-BR").includes(normalizedQuery);

  return matchesStatus && matchesClient && matchesQuery && matchesPeriod(budget, filters.period);
}

function matchesPeriod(budget: PmeBudgetRecord, period: PmeBudgetFilters["period"]): boolean {
  if (
    period === "all" ||
    typeof budget.validUntil === "undefined" ||
    budget.validUntil.length === 0
  ) {
    return true;
  }

  const validUntil = new Date(`${budget.validUntil}T23:59:59`);
  const today = new Date();

  return period === "valid" ? validUntil >= today : validUntil < today;
}

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

async function wait(): Promise<void> {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, 80);
  });
}
