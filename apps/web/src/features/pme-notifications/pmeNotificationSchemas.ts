import { z } from "zod";

export const pmeNotificationTypeSchema = z.enum([
  "overdue_receipt",
  "late_purchase",
  "blocked_task",
  "missing_daily_log",
  "cost_overrun",
  "low_margin",
  "budget_follow_up",
  "budget_approved_not_converted",
  "project_ready_to_close",
  "critical_occurrence",
  "pending_cost",
  "purchase_without_actual_cost",
  "daily_log_pending_review",
  "closeout_pending",
  "system_notice",
  "other"
]);

export const pmeNotificationSeveritySchema = z.enum(["info", "low", "medium", "high", "critical"]);
export const pmeNotificationStatusSchema = z.enum([
  "unread",
  "read",
  "archived",
  "resolved",
  "dismissed"
]);
export const pmeNotificationFrequencySchema = z.enum([
  "immediate",
  "daily_digest",
  "weekly_digest",
  "disabled"
]);

const internalActionUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("/app/"), {
    message: "A acao deve apontar para uma rota interna segura."
  });

const quietHourSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:mm.")
  .optional();

export const pmeNotificationSchema = z.object({
  id: z.string(),
  userId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  budgetId: z.string().nullable().optional(),
  sourceTable: z.string().nullable().optional(),
  sourceId: z.string().nullable().optional(),
  notificationType: pmeNotificationTypeSchema,
  severity: pmeNotificationSeveritySchema,
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  actionUrl: internalActionUrlSchema.nullable().optional(),
  status: pmeNotificationStatusSchema,
  dueDate: z.string().nullable().optional(),
  readAt: z.string().nullable().optional(),
  archivedAt: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  createdBySystem: z.boolean(),
  createdAt: z.string()
});

export const pmeNotificationFiltersSchema = z.object({
  status: pmeNotificationStatusSchema.or(z.literal("all")),
  severity: pmeNotificationSeveritySchema.or(z.literal("all")),
  notificationType: pmeNotificationTypeSchema.or(z.literal("all")),
  projectId: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "all"])
});

export const pmeNotificationPreferenceSchema = z.object({
  notificationType: pmeNotificationTypeSchema,
  enabled: z.boolean(),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  frequency: pmeNotificationFrequencySchema,
  quietHoursStart: quietHourSchema,
  quietHoursEnd: quietHourSchema
});

export const pmeNotificationPreferencesSchema = z.array(pmeNotificationPreferenceSchema);

export const pmeNotificationActionSchema = z.object({
  notificationId: z.string().min(1, "Informe a notificacao.")
});
