import { z } from "zod";

const moneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Use um valor monetário válido.");
const quantitySchema = z.string().regex(/^\d+(\.\d{1,4})?$/, "Use uma quantidade válida.");
const percentageSchema = z.string().regex(/^\d+(\.\d{1,4})?$/, "Use um percentual válido.");

export const pmeCatalogCategorySchema = z.enum([
  "material",
  "mao_de_obra",
  "servico",
  "terceiro",
  "equipamento",
  "transporte",
  "descarte",
  "taxa",
  "composicao",
  "outro"
]);

export const pmeCatalogSourceTypeSchema = z.enum([
  "manual",
  "sinapi",
  "supplier_quote",
  "axia_suggestion",
  "imported",
  "budget_item"
]);

export const pmeCatalogKitTypeSchema = z.enum([
  "reforma_banheiro",
  "reforma_cozinha",
  "pintura",
  "troca_piso",
  "reforma_apartamento",
  "eletrica",
  "hidraulica",
  "gesso_drywall",
  "telhado",
  "area_externa",
  "manutencao",
  "personalizado"
]);

export const pmeCatalogItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome do item."),
  description: z.string().trim().optional(),
  category: pmeCatalogCategorySchema,
  unit: z.string().trim().min(1, "Informe a unidade."),
  defaultUnitCost: moneySchema,
  defaultUnitPrice: moneySchema,
  defaultMarginPercentage: percentageSchema,
  sourceType: pmeCatalogSourceTypeSchema,
  sourceReferenceId: z.string().optional(),
  sinapiCode: z.string().trim().optional(),
  uf: z.string().trim().length(2).optional(),
  referenceMonth: z.number().int().min(1).max(12).optional(),
  referenceYear: z.number().int().min(2000).optional(),
  isActive: z.boolean().default(true)
});

export const pmeCatalogCompositionItemSchema = z.object({
  id: z.string().optional(),
  catalogItemId: z.string().optional(),
  description: z.string().trim().min(1, "Informe a descrição."),
  category: pmeCatalogCategorySchema,
  quantity: quantitySchema,
  unit: z.string().trim().min(1, "Informe a unidade."),
  unitCost: moneySchema,
  unitPrice: moneySchema,
  sortOrder: z.number().int().min(0).default(0)
});

export const pmeCatalogCompositionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome da composição."),
  description: z.string().trim().optional(),
  unit: z.string().trim().min(1, "Informe a unidade."),
  totalUnitCost: moneySchema,
  totalUnitPrice: moneySchema,
  defaultMarginPercentage: percentageSchema,
  isActive: z.boolean().default(true),
  items: z.array(pmeCatalogCompositionItemSchema).default([])
});

export const pmeCatalogKitItemSchema = z
  .object({
    id: z.string().optional(),
    catalogItemId: z.string().optional(),
    compositionId: z.string().optional(),
    description: z.string().trim().min(1, "Informe a descrição."),
    category: pmeCatalogCategorySchema,
    quantity: quantitySchema,
    unit: z.string().trim().min(1, "Informe a unidade."),
    unitCost: moneySchema,
    unitPrice: moneySchema,
    sortOrder: z.number().int().min(0).default(0),
    isOptional: z.boolean().default(false)
  })
  .refine((value) => !(value.catalogItemId && value.compositionId), {
    message: "Use item ou composição, não ambos.",
    path: ["catalogItemId"]
  });

export const pmeCatalogKitSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome do kit."),
  description: z.string().trim().optional(),
  kitType: pmeCatalogKitTypeSchema,
  defaultEnvironment: z.string().trim().optional(),
  totalEstimatedCost: moneySchema,
  totalEstimatedPrice: moneySchema,
  isActive: z.boolean().default(true),
  items: z.array(pmeCatalogKitItemSchema).default([])
});

export const saveBudgetItemToCatalogSchema = z.object({
  budgetItemId: z.string(),
  name: z.string().trim().optional(),
  defaultMarginPercentage: percentageSchema.optional()
});

export const addCatalogItemToBudgetSchema = z.object({
  budgetId: z.string(),
  catalogItemId: z.string(),
  quantity: quantitySchema,
  sortOrder: z.number().int().min(0).optional()
});

export const addCatalogKitToBudgetSchema = z.object({
  budgetId: z.string(),
  kitId: z.string()
});

export type PmeCatalogItemValues = z.infer<typeof pmeCatalogItemSchema>;
export type PmeCatalogCompositionValues = z.infer<typeof pmeCatalogCompositionSchema>;
export type PmeCatalogKitValues = z.infer<typeof pmeCatalogKitSchema>;
