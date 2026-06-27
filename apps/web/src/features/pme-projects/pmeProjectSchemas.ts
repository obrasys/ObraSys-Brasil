import { z } from "zod";

const decimalSchema = (message: string, scale: number) =>
  z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`), message);

const moneySchema = decimalSchema("Use um valor monetario valido.", 2).refine(
  (value) => Number(value) >= 0,
  {
    message: "O valor nao pode ser negativo."
  }
);

const quantitySchema = decimalSchema("Use uma quantidade valida.", 4).refine(
  (value) => Number(value) > 0,
  {
    message: "A quantidade deve ser maior que zero."
  }
);

const percentageSchema = decimalSchema("Use um percentual valido.", 4).refine(
  (value) => Number(value) >= 0 && Number(value) <= 100,
  {
    message: "Use um percentual entre 0 e 100."
  }
);

export const pmeProjectStageStatusSchema = z.enum([
  "planned",
  "in_progress",
  "paused",
  "completed",
  "cancelled"
]);

export const pmeProjectTaskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "blocked",
  "done",
  "cancelled"
]);

export const pmeProjectTaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const pmeProjectPurchaseStatusSchema = z.enum([
  "planned",
  "quoted",
  "ordered",
  "partially_delivered",
  "delivered",
  "cancelled"
]);

export const pmeProjectCostTypeSchema = z.enum([
  "material",
  "mao_de_obra",
  "terceiro",
  "equipamento",
  "transporte",
  "descarte",
  "taxa",
  "ajuste",
  "outro"
]);

export const pmeProjectPaymentStatusSchema = z.enum(["pending", "paid", "cancelled"]);

export const pmeProjectReceiptStatusSchema = z.enum([
  "planned",
  "invoiced",
  "received",
  "overdue",
  "cancelled"
]);

export const pmeProjectDailyLogStatusSchema = z.enum(["draft", "completed", "locked"]);

export const pmeProjectStageSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Informe a etapa."),
  description: z.string().trim().optional(),
  progressPercentage: percentageSchema,
  status: pmeProjectStageStatusSchema,
  sortOrder: z.number().int().min(0)
});

export const pmeProjectTaskSchema = z
  .object({
    id: z.string(),
    stageId: z.string().optional(),
    title: z.string().trim().min(1, "Informe a tarefa."),
    description: z.string().trim().optional(),
    responsibleName: z.string().trim().optional(),
    plannedEndDate: z.string().optional(),
    progressPercentage: percentageSchema,
    status: pmeProjectTaskStatusSchema,
    priority: pmeProjectTaskPrioritySchema,
    completedAt: z.string().optional()
  })
  .refine((value) => value.status !== "done" || Boolean(value.completedAt), {
    message: "Tarefa concluida precisa ter data de conclusao.",
    path: ["completedAt"]
  });

export const pmeProjectPurchaseSchema = z.object({
  id: z.string(),
  supplierName: z.string().trim().optional(),
  description: z.string().trim().min(1, "Informe a compra."),
  status: pmeProjectPurchaseStatusSchema,
  expectedTotalAmount: moneySchema,
  actualTotalAmount: moneySchema,
  expectedDeliveryDate: z.string().optional(),
  sourceType: z.enum(["budget_material", "manual", "catalog", "sinapi_snapshot", "other"])
});

export const pmeProjectPurchaseItemSchema = z.object({
  id: z.string(),
  description: z.string().trim().min(1, "Informe o item."),
  quantity: quantitySchema,
  unit: z.string().trim().min(1, "Informe a unidade."),
  unitCost: moneySchema,
  totalCost: moneySchema,
  deliveredQuantity: decimalSchema("Use uma quantidade valida.", 4)
});

export const pmeProjectActualCostSchema = z
  .object({
    id: z.string(),
    costType: pmeProjectCostTypeSchema,
    description: z.string().trim().min(1, "Informe o custo."),
    amount: moneySchema,
    paymentStatus: pmeProjectPaymentStatusSchema,
    paymentDate: z.string().optional(),
    supplierName: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .refine((value) => value.paymentStatus !== "paid" || Boolean(value.paymentDate), {
    message: "Custo pago precisa ter data de pagamento.",
    path: ["paymentDate"]
  });

export const pmeProjectReceiptSchema = z
  .object({
    id: z.string(),
    description: z.string().trim().min(1, "Informe o recebimento."),
    amount: moneySchema,
    receiptStatus: pmeProjectReceiptStatusSchema,
    dueDate: z.string().optional(),
    receivedAt: z.string().optional(),
    paymentMethod: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .refine((value) => value.receiptStatus !== "received" || Boolean(value.receivedAt), {
    message: "Recebimento confirmado precisa ter data.",
    path: ["receivedAt"]
  });

export const pmeProjectDailyLogSchema = z.object({
  id: z.string(),
  logDate: z.string().min(1, "Informe a data."),
  weatherMorning: z.string().trim().optional(),
  weatherAfternoon: z.string().trim().optional(),
  laborCount: z.number().int().min(0).optional(),
  workPerformed: z.string().trim().min(1, "Informe o que foi feito."),
  issues: z.string().trim().optional(),
  nextSteps: z.string().trim().optional(),
  materialsDelivered: z.string().trim().optional(),
  clientNotes: z.string().trim().optional(),
  photosCount: z.number().int().min(0),
  status: pmeProjectDailyLogStatusSchema
});

export const pmeProjectPhotoSchema = z.object({
  id: z.string(),
  fileUrl: z.string().trim().min(1, "Informe o arquivo."),
  fileName: z.string().trim().min(1, "Informe o nome do arquivo."),
  caption: z.string().trim().optional(),
  takenAt: z.string().optional()
});

export const pmeProjectAttachmentSchema = pmeProjectPhotoSchema.extend({
  fileType: z.string().trim().optional(),
  description: z.string().trim().optional()
});

export type PmeProjectTaskStatus = z.infer<typeof pmeProjectTaskStatusSchema>;
export type PmeProjectReceiptStatus = z.infer<typeof pmeProjectReceiptStatusSchema>;
