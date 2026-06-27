import { z } from "zod";

const decimalSchema = (message: string, scale: number) =>
  z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`), message);

const quantitySchema = decimalSchema("Use uma quantidade valida.", 4).refine(
  (value) => Number(value) > 0,
  { message: "A quantidade deve ser maior que zero." }
);

const percentageSchema = decimalSchema("Use um percentual valido.", 2).refine(
  (value) => Number(value) >= 0 && Number(value) <= 100,
  { message: "Use um percentual entre 0 e 100." }
);

export const pmeDailyLogStatusSchema = z.enum([
  "draft",
  "in_review",
  "completed",
  "locked",
  "cancelled"
]);

export const pmeDailyLogWorkerTypeSchema = z.enum([
  "pedreiro",
  "servente",
  "pintor",
  "eletricista",
  "encanador",
  "gesseiro",
  "azulejista",
  "marceneiro",
  "jardineiro",
  "mestre_de_obras",
  "ajudante_geral",
  "terceiro",
  "outro"
]);

export const pmeDailyLogSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const pmeDailyLogSchema = z.object({
  id: z.string(),
  logDate: z.string().min(1, "Informe a data."),
  status: pmeDailyLogStatusSchema,
  weatherSource: z.enum(["manual", "automatic", "imported"]).optional(),
  weatherSummary: z.string().trim().optional(),
  workPerformed: z.string().trim().optional(),
  nextSteps: z.string().trim().optional(),
  clientNotes: z.string().trim().optional(),
  voiceSummary: z.string().trim().optional()
});

export const pmeDailyLogLaborSchema = z.object({
  id: z.string(),
  workerType: pmeDailyLogWorkerTypeSchema,
  workerName: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  quantity: quantitySchema,
  notes: z.string().trim().optional()
});

export const pmeDailyLogActivitySchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1, "Informe a atividade."),
  description: z.string().trim().min(1, "Descreva a atividade."),
  progressPercentage: percentageSchema.optional(),
  status: z.enum(["planned", "in_progress", "completed", "blocked", "cancelled"])
});

export const pmeDailyLogOccurrenceSchema = z.object({
  id: z.string(),
  occurrenceType: z.enum([
    "atraso",
    "problema_tecnico",
    "falta_material",
    "alteracao_cliente",
    "acidente",
    "clima",
    "fornecedor",
    "qualidade",
    "seguranca",
    "outro"
  ]),
  title: z.string().trim().min(1, "Informe a ocorrencia."),
  description: z.string().trim().min(1, "Descreva a ocorrencia."),
  severity: pmeDailyLogSeveritySchema,
  requiresFollowUp: z.boolean()
});

export const pmeDailyLogMaterialSchema = z.object({
  id: z.string(),
  materialName: z.string().trim().min(1, "Informe o material."),
  quantity: quantitySchema,
  unit: z.string().trim().min(1, "Informe a unidade."),
  usageType: z.enum(["delivered", "used", "returned", "missing", "damaged"]),
  supplierName: z.string().trim().optional()
});

export const pmeDailyLogEquipmentSchema = z.object({
  id: z.string(),
  equipmentName: z.string().trim().min(1, "Informe o equipamento."),
  quantity: quantitySchema,
  usageHours: decimalSchema("Use horas validas.", 2).optional(),
  status: z.enum(["available", "in_use", "broken", "returned", "not_used"])
});

export const pmeDailyLogPhotoSchema = z.object({
  id: z.string(),
  fileUrl: z.string().trim().min(1, "Informe a foto."),
  fileName: z.string().trim().min(1, "Informe o nome."),
  caption: z.string().trim().optional()
});

export const pmeDailyLogVoiceNoteSchema = z.object({
  id: z.string(),
  transcriptText: z.string().trim().min(1, "Informe o relato.").max(12000),
  processingStatus: z.enum(["pending", "processing", "completed", "failed"])
});
