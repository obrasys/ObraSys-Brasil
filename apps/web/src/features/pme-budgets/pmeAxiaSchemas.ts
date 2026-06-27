import { z } from "zod";

export const pmeAxiaActionTypeSchema = z.enum([
  "create_budget_draft",
  "suggest_missing_items",
  "review_budget_margin",
  "compare_with_sinapi",
  "generate_proposal_text",
  "generate_execution_checklist",
  "explain_budget_to_client"
]);

export const pmeAxiaSuggestedActionSchema = z.enum([
  "create_environment",
  "create_budget_item",
  "create_material",
  "create_labor",
  "update_margin_warning",
  "create_proposal_text",
  "create_checklist_item",
  "add_note"
]);

const axiaJsonSchema: z.ZodType<
  string | number | boolean | null | { [key: string]: unknown } | unknown[]
> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown())
]);

export const pmeAxiaSuggestionItemSchema = z.object({
  suggestedAction: pmeAxiaSuggestedActionSchema,
  payload: axiaJsonSchema
});

export const pmeAxiaSuggestionSchema = z.object({
  type: z.enum([
    "budget_draft",
    "missing_item",
    "margin_alert",
    "sinapi_comparison",
    "proposal_text",
    "execution_checklist",
    "client_explanation",
    "risk_alert"
  ]),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  confidenceScore: z.number().min(0).max(1),
  status: z.enum(["draft", "suggested", "pending_approval"]),
  items: z.array(pmeAxiaSuggestionItemSchema)
});

export const pmeAxiaRequestSchema = z
  .object({
    actionType: pmeAxiaActionTypeSchema,
    budgetId: z.string().optional(),
    userMessage: z.string().max(4000, "Use até 4000 caracteres.").optional(),
    options: z.record(z.string(), z.unknown()).optional()
  })
  .refine(
    (value) =>
      value.actionType === "create_budget_draft" ||
      (typeof value.budgetId === "string" && value.budgetId.trim().length > 0),
    {
      message: "Esta ação precisa de um orçamento.",
      path: ["budgetId"]
    }
  );

export const pmeAxiaResponseSchema = z.object({
  runId: z.string(),
  summary: z.string(),
  suggestions: z.array(pmeAxiaSuggestionSchema),
  warnings: z.array(z.string()),
  humanValidationRequired: z.literal(true)
});

export type PmeAxiaActionType = z.infer<typeof pmeAxiaActionTypeSchema>;
export type PmeAxiaRequestValues = z.infer<typeof pmeAxiaRequestSchema>;
export type PmeAxiaResponse = z.infer<typeof pmeAxiaResponseSchema>;
export type PmeAxiaSuggestion = z.infer<typeof pmeAxiaSuggestionSchema>;
export type PmeAxiaSuggestionItem = z.infer<typeof pmeAxiaSuggestionItemSchema>;
