import { z } from "zod";

export const pmeDashboardPeriodSchema = z.enum(["7d", "30d", "90d", "current_month", "custom"]);
export const pmeDashboardSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export const pmeDashboardAlertStatusSchema = z.enum([
  "open",
  "acknowledged",
  "resolved",
  "archived"
]);
export const pmeDashboardProjectStatusSchema = z.enum([
  "planned",
  "active",
  "paused",
  "completed",
  "closed",
  "cancelled"
]);
export const pmeDashboardAlertTypeSchema = z.enum([
  "cost_overrun",
  "low_margin",
  "overdue_receipt",
  "late_purchase",
  "blocked_task",
  "missing_daily_log",
  "project_delay",
  "open_occurrence",
  "closeout_pending",
  "no_recent_activity",
  "budget_not_converted",
  "other"
]);

export const pmeDashboardFiltersSchema = z
  .object({
    period: pmeDashboardPeriodSchema,
    status: pmeDashboardProjectStatusSchema.or(z.literal("all")),
    responsibleName: z.string().trim().max(120).optional(),
    projectSearch: z.string().trim().max(120).optional(),
    severity: pmeDashboardSeveritySchema.or(z.literal("all")),
    showClosedProjects: z.boolean()
  })
  .refine((value) => value.period !== "custom" || Boolean(value.projectSearch ?? true), {
    message: "Periodo personalizado deve ser validado pelo backend quando habilitado."
  });

export const pmeDashboardAlertSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  alertType: pmeDashboardAlertTypeSchema,
  severity: pmeDashboardSeveritySchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  status: pmeDashboardAlertStatusSchema,
  sourceTable: z.string().trim().optional(),
  sourceId: z.string().optional()
});

export const pmeDashboardAlertUpdateSchema = z.object({
  alertId: z.string().min(1, "Informe o alerta."),
  status: pmeDashboardAlertStatusSchema.refine((status) => status !== "open", {
    message: "Use uma acao explicita para marcar o alerta."
  })
});

export const pmeDashboardPreferencesSchema = z
  .object({
    defaultPeriod: pmeDashboardPeriodSchema,
    showProfitCards: z.boolean(),
    showMarginCards: z.boolean(),
    showClosedProjects: z.boolean(),
    preferredProjectStatuses: z.array(pmeDashboardProjectStatusSchema).optional(),
    canSeeFinancials: z.boolean()
  })
  .refine(
    (preferences) =>
      preferences.canSeeFinancials ||
      (!preferences.showProfitCards && !preferences.showMarginCards),
    {
      message: "Perfil sem permissao nao pode ativar lucro ou margem.",
      path: ["showProfitCards"]
    }
  );
