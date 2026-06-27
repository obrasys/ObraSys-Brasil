import { z } from "zod";

export const pmeBudgetConversionSchema = z.object({
  budgetId: z.string().min(1, "Informe o orçamento."),
  confirmed: z.literal(true, "Confirme a conversão para continuar."),
  optionalProjectName: z.string().trim().max(120, "Use até 120 caracteres.").optional(),
  optionalStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data válida.")
    .optional(),
  optionalNotes: z.string().trim().max(1000, "Use até 1000 caracteres.").optional()
});

export type PmeBudgetConversionValues = z.infer<typeof pmeBudgetConversionSchema>;

export interface PmeBudgetConversionResult {
  budgetId: string;
  projectId: string;
  status: "converted_to_project";
}
