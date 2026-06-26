import { z } from "zod";

const moneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Use um valor monetário válido.");
const quantitySchema = z.string().regex(/^\d+(\.\d{1,4})?$/, "Use uma quantidade válida.");
const percentageSchema = z.string().regex(/^\d+(\.\d{1,4})?$/, "Use um percentual válido.");

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
  description: z.string().trim().min(1, "Informe o serviço."),
  source: z.enum(["manual", "catalog", "sinapi_optional"]),
  unit: z.string().trim().min(1, "Informe a unidade."),
  quantity: quantitySchema,
  unitCost: moneySchema,
  unitPrice: moneySchema,
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
  description: z.string().trim().min(1, "Informe o material."),
  unit: z.string().trim().min(1, "Informe a unidade."),
  quantity: quantitySchema,
  unitCost: moneySchema,
  supplierName: z.string().trim().optional()
});

export const pmeBudgetLaborSchema = z.object({
  id: z.string(),
  itemId: z.string().optional(),
  roleName: z.string().trim().min(1, "Informe a função."),
  unit: z.string().trim().min(1, "Informe a unidade."),
  quantity: quantitySchema,
  unitCost: moneySchema
});

export const pmeBudgetPaymentTermSchema = z
  .object({
    id: z.string(),
    description: z.string().trim().min(1, "Informe a condição."),
    dueOffsetDays: z.number().int().min(0),
    amount: z.string().optional(),
    percentage: z.string().optional()
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
  status: pmeBudgetStatusSchema,
  validUntil: z.string().optional(),
  overheadPercentage: percentageSchema,
  taxPercentage: percentageSchema,
  profitPercentage: percentageSchema,
  discountAmount: moneySchema,
  environments: z.array(pmeBudgetEnvironmentSchema),
  items: z.array(pmeBudgetItemSchema).min(1, "Adicione pelo menos um serviço."),
  materials: z.array(pmeBudgetMaterialSchema),
  labor: z.array(pmeBudgetLaborSchema),
  paymentTerms: z.array(pmeBudgetPaymentTermSchema)
});

export type PmeBudgetFormValues = z.infer<typeof pmeBudgetFormSchema>;
export type PmeBudgetStatus = z.infer<typeof pmeBudgetStatusSchema>;
