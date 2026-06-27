import { z } from "zod";

const moneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, "Use um valor monetário válido.");
const quantitySchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Use uma quantidade válida.")
  .refine((value) => Number(value) > 0, "A quantidade deve ser maior que zero.");
const percentageSchema = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, "Use um percentual válido.")
  .refine(
    (value) => Number(value) >= 0 && Number(value) <= 100,
    "Use um percentual entre 0 e 100."
  );
const productivitySchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, "Use um percentual válido.")
  .refine(
    (value) => Number(value) >= -90 && Number(value) <= 300,
    "Use produtividade entre -90% e 300%."
  );

export const pmeSinapiRegimeSchema = z.enum(["desonerado", "nao_desonerado"]);

export const pmeSinapiSearchSchema = z.object({
  uf: z.string().trim().length(2, "Informe a UF."),
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2000),
  regime: pmeSinapiRegimeSchema,
  query: z.string().trim(),
  page: z.number().int().min(1)
});

export const pmeSinapiAdaptationSchema = z.object({
  quantity: quantitySchema,
  adaptedDescription: z.string().trim().min(1, "Informe a descrição."),
  adaptedUnit: z.string().trim().min(1, "Informe a unidade."),
  adaptedUnitCost: moneySchema.refine(
    (value) => Number(value) >= 0,
    "O custo não pode ser negativo."
  ),
  adaptedUnitPrice: moneySchema.refine(
    (value) => Number(value) >= 0,
    "O preço não pode ser negativo."
  ),
  wastePercentage: percentageSchema,
  productivityAdjustmentPercentage: productivitySchema,
  marginPercentage: percentageSchema,
  saveToCatalog: z.boolean()
});

export type PmeSinapiSearchValues = z.infer<typeof pmeSinapiSearchSchema>;
export type PmeSinapiAdaptationValues = z.infer<typeof pmeSinapiAdaptationSchema>;
