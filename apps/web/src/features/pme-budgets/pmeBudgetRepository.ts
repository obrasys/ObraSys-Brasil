import {
  calculatePmeBudget,
  createCatalogItemFromSinapi,
  createSinapiSnapshotPayload,
  type PmeBudgetCalculationItemInput,
  type SinapiCatalogItemPayload,
  type SinapiSavedSnapshotPayload
} from "@obrasys/domain";

import type { PmeBudgetFormValues } from "./pmeBudgetSchemas";

export interface PmeBudgetSummary {
  id: string;
  budgetNumber: string;
  title: string;
  clientName: string;
  status: PmeBudgetFormValues["status"];
  finalPrice: string;
  subtotalCost: string;
  updatedAt: string;
}

export interface PmeBudgetRecord extends PmeBudgetFormValues {
  id: string;
  subtotalCost: string;
  finalPrice: string;
  updatedAt: string;
  savedSinapiSnapshots: SinapiSavedSnapshotPayload[];
}

export interface PmeBudgetCalculationPreview {
  subtotalCost: string;
  overheadAmount: string;
  taxAmount: string;
  profitAmount: string;
  discountAmount: string;
  finalPrice: string;
}

const nowIso = () => new Date().toISOString();

const initialBudget: PmeBudgetRecord = {
  id: "budget-demo-1",
  budgetNumber: "PME-0001",
  title: "Reforma de banheiro",
  clientName: "Cliente exemplo",
  clientPhone: "",
  clientEmail: "",
  workAddress: "Rua das Obras, 100",
  description: "Orçamento rápido para validar o fluxo PME.",
  status: "draft",
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
      source: "manual",
      unit: "m2",
      quantity: "12",
      unitCost: "35.00",
      unitPrice: "55.00",
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
      supplierName: "Fornecedor local"
    }
  ],
  labor: [
    {
      id: "labor-1",
      itemId: "item-1",
      roleName: "Pedreiro",
      unit: "h",
      quantity: "16",
      unitCost: "38.00"
    }
  ],
  paymentTerms: [
    {
      id: "pay-1",
      description: "Entrada",
      dueOffsetDays: 0,
      amount: "",
      percentage: "40"
    },
    {
      id: "pay-2",
      description: "Entrega",
      dueOffsetDays: 20,
      amount: "",
      percentage: "60"
    }
  ],
  subtotalCost: "1154.00",
  finalPrice: "1523.28",
  updatedAt: nowIso(),
  savedSinapiSnapshots: []
};

let budgets: PmeBudgetRecord[] = [initialBudget];

export async function listPmeBudgets(): Promise<PmeBudgetSummary[]> {
  await wait();

  return budgets.map(
    ({ id, budgetNumber, title, clientName, status, finalPrice, subtotalCost, updatedAt }) => ({
      id,
      budgetNumber,
      title,
      clientName,
      status,
      finalPrice,
      subtotalCost,
      updatedAt
    })
  );
}

export async function getPmeBudget(id: string): Promise<PmeBudgetRecord | null> {
  await wait();

  return budgets.find((budget) => budget.id === id) ?? null;
}

export async function savePmeBudget(input: PmeBudgetFormValues): Promise<PmeBudgetRecord> {
  await wait();

  const preview = calculatePmeBudgetPreview(input);
  const id = input.id ?? createId("budget");
  const nextBudget: PmeBudgetRecord = {
    ...input,
    id,
    subtotalCost: preview.subtotalCost,
    finalPrice: preview.finalPrice,
    updatedAt: nowIso(),
    savedSinapiSnapshots: createSavedSinapiSnapshots(input, id)
  };
  const existingIndex = budgets.findIndex((budget) => budget.id === id);

  if (existingIndex >= 0) {
    budgets = budgets.map((budget) => (budget.id === id ? nextBudget : budget));
  } else {
    budgets = [nextBudget, ...budgets];
  }

  return nextBudget;
}

export function saveSinapiItemToCatalog(
  input: NonNullable<PmeBudgetFormValues["items"][number]["sinapiSnapshot"]>
): SinapiCatalogItemPayload {
  return createCatalogItemFromSinapi({
    organizationId: "demo-organization",
    createdBy: "demo-user",
    adaptation: {
      compositionId: input.compositionId,
      versionId: input.versionId,
      code: input.code,
      description: input.description,
      unit: input.unit,
      stateCode: input.stateCode,
      referenceMonth: input.referenceMonth,
      referenceYear: input.referenceYear,
      quantity: "1",
      originalUnitCost: input.originalUnitCost,
      adaptedUnitPrice: input.adaptedUnitPrice,
      totalOriginalCost: input.originalUnitCost,
      totalAdaptedPrice: input.adaptedUnitPrice,
      productivityFactor: input.productivityFactor,
      wastePercentage: input.wastePercentage,
      marginPercentage: input.marginPercentage,
      usedAt: input.usedAt
    }
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
    status: "draft",
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
    items: [
      {
        id: createId("item"),
        environmentId: "",
        description: "",
        source: "manual",
        unit: "un",
        quantity: "1",
        unitCost: "0.00",
        unitPrice: "0.00",
        showOnProposal: true
      }
    ],
    materials: [],
    labor: [],
    paymentTerms: [
      {
        id: createId("pay"),
        description: "Entrada",
        dueOffsetDays: 0,
        amount: "",
        percentage: "50"
      },
      {
        id: createId("pay"),
        description: "Entrega",
        dueOffsetDays: 15,
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
      kind: "service" as const,
      quantity: item.quantity,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice
    })),
    ...input.materials.map((material) => ({
      id: material.id,
      description: material.description || "Material sem descrição",
      kind: "material" as const,
      quantity: material.quantity,
      unitCost: material.unitCost,
      unitPrice: material.unitCost
    })),
    ...input.labor.map((labor) => ({
      id: labor.id,
      description: labor.roleName || "Mão de obra sem descrição",
      kind: "labor" as const,
      quantity: labor.quantity,
      unitCost: labor.unitCost,
      unitPrice: labor.unitCost
    }))
  ];
  const result = calculatePmeBudget({
    items: calculationItems,
    overheadPercentage: input.overheadPercentage,
    taxPercentage: input.taxPercentage,
    profitPercentage: input.profitPercentage,
    discountAmount: input.discountAmount
  });

  return {
    subtotalCost: result.subtotalCost,
    overheadAmount: result.overheadAmount,
    taxAmount: result.taxAmount,
    profitAmount: result.profitAmount,
    discountAmount: result.discountAmount,
    finalPrice: result.finalPrice
  };
}

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function createSavedSinapiSnapshots(
  input: PmeBudgetFormValues,
  budgetId: string
): SinapiSavedSnapshotPayload[] {
  return input.items.flatMap((item) => {
    if (typeof item.sinapiSnapshot === "undefined") {
      return [];
    }

    return [
      createSinapiSnapshotPayload({
        organizationId: "demo-organization",
        budgetId,
        budgetItemId: item.id,
        createdBy: "demo-user",
        adaptation: {
          compositionId: item.sinapiSnapshot.compositionId,
          versionId: item.sinapiSnapshot.versionId,
          code: item.sinapiSnapshot.code,
          description: item.sinapiSnapshot.description,
          unit: item.sinapiSnapshot.unit,
          stateCode: item.sinapiSnapshot.stateCode,
          referenceMonth: item.sinapiSnapshot.referenceMonth,
          referenceYear: item.sinapiSnapshot.referenceYear,
          quantity: item.quantity,
          originalUnitCost: item.sinapiSnapshot.originalUnitCost,
          adaptedUnitPrice: item.sinapiSnapshot.adaptedUnitPrice,
          totalOriginalCost: item.sinapiSnapshot.originalUnitCost,
          totalAdaptedPrice: item.sinapiSnapshot.adaptedUnitPrice,
          productivityFactor: item.sinapiSnapshot.productivityFactor,
          wastePercentage: item.sinapiSnapshot.wastePercentage,
          marginPercentage: item.sinapiSnapshot.marginPercentage,
          usedAt: item.sinapiSnapshot.usedAt
        }
      })
    ];
  });
}

async function wait(): Promise<void> {
  await new Promise((resolve) => {
    globalThis.setTimeout(resolve, 120);
  });
}
