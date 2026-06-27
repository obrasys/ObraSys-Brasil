import { z } from "zod";

const decimalSchema = (message: string, scale: number) =>
  z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`), message);

const moneySchema = decimalSchema("Use um valor monetário válido.", 2);
const nonNegativeMoneySchema = moneySchema.refine((value) => Number(value) >= 0, {
  message: "O valor não pode ser negativo."
});
const quantitySchema = decimalSchema("Use uma quantidade válida.", 4).refine(
  (value) => Number(value) > 0,
  {
    message: "A quantidade deve ser maior que zero."
  }
);
const percentageSchema = decimalSchema("Use um percentual válido.", 4).refine(
  (value) => Number(value) >= 0 && Number(value) <= 100,
  {
    message: "Use um percentual entre 0 e 100."
  }
);
const optionalMoneySchema = z.union([nonNegativeMoneySchema, z.literal("")]).optional();
const optionalPercentageSchema = z.union([percentageSchema, z.literal("")]).optional();

export const pmeBudgetTypeSchema = z.enum([
  "reforma_banheiro",
  "reforma_cozinha",
  "pintura",
  "troca_piso",
  "reforma_apartamento",
  "manutencao",
  "construcao_pequena",
  "outro"
]);

export const pmeBudgetPricingModeSchema = z.enum(["simple_margin", "detailed_bdi"]);

export const pmeBudgetItemCategorySchema = z.enum([
  "material",
  "mao_de_obra",
  "servico",
  "terceiro",
  "equipamento",
  "transporte",
  "descarte",
  "taxa",
  "outro"
]);

export const pmeBudgetItemSourceTypeSchema = z.enum([
  "manual",
  "meu_catalogo",
  "sinapi",
  "kit",
  "axia_suggestion",
  "supplier_quote"
]);

export const pmeBudgetPurchaseStatusSchema = z.enum([
  "not_purchased",
  "quoted",
  "purchased",
  "delivered",
  "used"
]);

export const pmeBudgetStatusSchema = z.enum([
  "draft",
  "sent",
  "negotiation",
  "approved",
  "rejected",
  "converted_to_project",
  "cancelled"
]);

export const pmeBudgetEnvironmentSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Informe o ambiente."),
  description: z.string().trim().optional()
});

export const pmeBudgetItemSchema = z.object({
  id: z.string(),
  environmentId: z.string().optional(),
  costCenterId: z.string().optional(),
  itemCode: z.string().trim().optional(),
  description: z.string().trim().min(1, "Informe o serviço."),
  category: pmeBudgetItemCategorySchema.optional(),
  sourceType: pmeBudgetItemSourceTypeSchema.optional(),
  sourceReferenceId: z.string().optional(),
  source: z.enum(["manual", "catalog", "sinapi_optional"]),
  unit: z.string().trim().min(1, "Informe a unidade."),
  quantity: quantitySchema,
  unitCost: nonNegativeMoneySchema,
  unitPrice: nonNegativeMoneySchema,
  wastePercentage: percentageSchema.optional(),
  marginPercentage: percentageSchema.optional(),
  notes: z.string().trim().optional(),
  sinapiSnapshot: z
    .object({
      compositionId: z.string(),
      versionId: z.string(),
      code: z.string(),
      description: z.string(),
      unit: z.string(),
      stateCode: z.string(),
      referenceMonth: z.number(),
      referenceYear: z.number(),
      originalUnitCost: moneySchema,
      adaptedUnitPrice: moneySchema,
      productivityFactor: quantitySchema,
      wastePercentage: percentageSchema,
      marginPercentage: percentageSchema,
      usedAt: z.string()
    })
    .optional(),
  showOnProposal: z.boolean()
});

export const pmeBudgetMaterialSchema = z.object({
  id: z.string(),
  itemId: z.string().optional(),
  budgetItemId: z.string().optional(),
  description: z.string().trim().min(1, "Informe o material."),
  unit: z.string().trim().min(1, "Informe a unidade."),
  quantity: quantitySchema,
  unitCost: nonNegativeMoneySchema,
  wastePercentage: percentageSchema.optional(),
  supplierName: z.string().trim().optional(),
  purchaseStatus: pmeBudgetPurchaseStatusSchema.optional()
});

export const pmeBudgetLaborSchema = z.object({
  id: z.string(),
  itemId: z.string().optional(),
  budgetItemId: z.string().optional(),
  laborType: z.string().trim().optional(),
  roleName: z.string().trim().min(1, "Informe a função."),
  workerName: z.string().trim().optional(),
  unit: z.string().trim().min(1, "Informe a unidade."),
  quantity: quantitySchema,
  unitCost: nonNegativeMoneySchema,
  days: quantitySchema.optional(),
  contractType: z.string().trim().optional()
});

export const pmeBudgetPaymentTermSchema = z
  .object({
    id: z.string(),
    installmentNumber: z.number().int().min(1).optional(),
    description: z.string().trim().min(1, "Informe a condição."),
    dueOffsetDays: z.number().int().min(0),
    dueCondition: z.string().trim().optional(),
    dueDate: z.string().optional(),
    amount: optionalMoneySchema,
    percentage: optionalPercentageSchema
  })
  .refine((value) => Boolean(value.amount) !== Boolean(value.percentage), {
    message: "Use valor fixo ou percentual.",
    path: ["amount"]
  });

export const pmeBudgetFormSchema = z.object({
  id: z.string().optional(),
  budgetNumber: z.string().trim().min(1, "Informe o número."),
  title: z.string().trim().min(1, "Informe o título."),
  clientName: z.string().trim().min(1, "Informe o cliente."),
  clientPhone: z.string().trim().optional(),
  clientEmail: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  workAddress: z.string().trim().optional(),
  description: z.string().trim().optional(),
  budgetType: pmeBudgetTypeSchema,
  status: pmeBudgetStatusSchema,
  pricingMode: pmeBudgetPricingModeSchema,
  validUntil: z.string().optional(),
  overheadPercentage: percentageSchema,
  taxPercentage: percentageSchema,
  profitPercentage: percentageSchema,
  discountAmount: nonNegativeMoneySchema,
  environments: z.array(pmeBudgetEnvironmentSchema),
  items: z.array(pmeBudgetItemSchema),
  materials: z.array(pmeBudgetMaterialSchema),
  labor: z.array(pmeBudgetLaborSchema),
  paymentTerms: z.array(pmeBudgetPaymentTermSchema)
});

export type PmeBudgetFormValues = z.infer<typeof pmeBudgetFormSchema>;
export type PmeBudgetStatus = z.infer<typeof pmeBudgetStatusSchema>;
