import { z } from "zod";

const moneySchema = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Use um valor monetario valido.");

const nonNegativeMoneySchema = moneySchema.refine((value) => Number(value) >= 0, {
  message: "O valor nao pode ser negativo."
});

const percentageSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Use um percentual valido.")
  .refine((value) => Number(value) >= 0 && Number(value) <= 100, {
    message: "Use um percentual entre 0 e 100."
  });

export const pmeProjectReportTypeSchema = z.enum([
  "financial_summary",
  "operational_summary",
  "purchases_summary",
  "receipts_summary",
  "daily_logs_summary",
  "client_delivery",
  "closeout_internal",
  "closeout_client"
]);

export const pmeProjectReportVisibilitySchema = z.enum(["internal", "client", "management"]);
export const pmeProjectReportExportTypeSchema = z.enum(["html", "pdf", "print_view"]);
export const pmeProjectCloseoutStatusSchema = z.enum([
  "draft",
  "ready_to_close",
  "closed",
  "reopened",
  "cancelled"
]);
export const pmeProjectCloseoutChecklistStatusSchema = z.enum(["pending", "completed", "waived"]);
export const pmeProjectCloseoutChecklistItemTypeSchema = z.enum([
  "financeiro",
  "operacional",
  "cliente",
  "documentos",
  "fotos",
  "compras",
  "recebimentos",
  "qualidade",
  "outro"
]);

export const pmeProjectReportSettingsSchema = z
  .object({
    showInternalCosts: z.boolean(),
    showProfit: z.boolean(),
    showMargin: z.boolean(),
    showPurchaseDetails: z.boolean(),
    showSupplierNames: z.boolean(),
    showPaymentStatus: z.boolean(),
    showDailyLogs: z.boolean(),
    showPhotos: z.boolean(),
    showOccurrences: z.boolean(),
    showPendingItems: z.boolean(),
    showClientNotes: z.boolean(),
    customIntroText: z.string().trim().max(2000).optional(),
    customFooterText: z.string().trim().max(2000).optional(),
    visibility: pmeProjectReportVisibilitySchema
  })
  .refine(
    (settings) =>
      settings.visibility !== "client" ||
      (!settings.showInternalCosts && !settings.showProfit && !settings.showMargin),
    {
      message: "Relatorio para cliente nao pode mostrar custo interno, lucro ou margem.",
      path: ["visibility"]
    }
  );

export const pmeProjectReportGenerateSchema = z.object({
  projectId: z.string().min(1, "Informe a obra."),
  reportType: pmeProjectReportTypeSchema,
  visibility: pmeProjectReportVisibilitySchema
});

export const pmeProjectReportExportSchema = z.object({
  projectId: z.string().min(1, "Informe a obra."),
  reportId: z.string().min(1, "Informe o relatorio."),
  exportType: pmeProjectReportExportTypeSchema
});

export const pmeProjectCloseoutSchema = z.object({
  id: z.string(),
  status: pmeProjectCloseoutStatusSchema,
  plannedCost: nonNegativeMoneySchema,
  actualCost: nonNegativeMoneySchema,
  plannedRevenue: nonNegativeMoneySchema,
  receivedRevenue: nonNegativeMoneySchema,
  pendingReceivables: nonNegativeMoneySchema,
  expectedProfit: moneySchema,
  actualProfit: moneySchema,
  profitVariance: moneySchema,
  costVariance: moneySchema,
  progressPercentage: percentageSchema,
  completedTasksCount: z.number().int().min(0),
  pendingTasksCount: z.number().int().min(0),
  unresolvedOccurrencesCount: z.number().int().min(0),
  openPurchasesCount: z.number().int().min(0),
  unpaidCostsCount: z.number().int().min(0),
  overdueReceiptsCount: z.number().int().min(0),
  closeoutNotes: z.string().trim().max(4000).optional()
});

export const pmeProjectCloseoutChecklistItemSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1, "Informe o item."),
  description: z.string().trim().optional(),
  itemType: pmeProjectCloseoutChecklistItemTypeSchema,
  status: pmeProjectCloseoutChecklistStatusSchema,
  isRequired: z.boolean()
});

export const pmeProjectCloseProjectSchema = z
  .object({
    projectId: z.string().min(1, "Informe a obra."),
    closeoutId: z.string().min(1, "Informe o fecho."),
    closeoutNotes: z.string().trim().max(4000).optional(),
    hasCriticalPendencies: z.boolean()
  })
  .refine((value) => !value.hasCriticalPendencies || Boolean(value.closeoutNotes?.trim()), {
    message: "Informe uma justificativa para fechar com pendencias.",
    path: ["closeoutNotes"]
  });

export const pmeProjectReopenSchema = z.object({
  projectId: z.string().min(1, "Informe a obra."),
  closeoutId: z.string().min(1, "Informe o fecho."),
  reason: z.string().trim().min(1, "Informe o motivo da reabertura.").max(2000)
});
