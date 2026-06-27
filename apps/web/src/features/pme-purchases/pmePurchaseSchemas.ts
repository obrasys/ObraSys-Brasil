import { z } from "zod";

const decimalSchema = (message: string, scale: number) =>
  z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`), message);

const moneySchema = decimalSchema("Use um valor monetario valido.", 2).refine(
  (value) => Number(value) >= 0,
  { message: "O valor nao pode ser negativo." }
);

const quantitySchema = decimalSchema("Use uma quantidade valida.", 4).refine(
  (value) => Number(value) > 0,
  { message: "A quantidade deve ser maior que zero." }
);

export const pmeSupplierTypeSchema = z.enum([
  "material",
  "mao_de_obra",
  "servico",
  "equipamento",
  "transporte",
  "descarte",
  "misto",
  "outro"
]);

export const pmePurchaseRequestStatusSchema = z.enum([
  "draft",
  "requested",
  "quoted",
  "approved",
  "converted_to_order",
  "cancelled"
]);

export const pmeSupplierQuoteStatusSchema = z.enum([
  "draft",
  "received",
  "selected",
  "rejected",
  "expired",
  "cancelled"
]);

export const pmePurchaseOrderStatusSchema = z.enum([
  "draft",
  "ordered",
  "partially_delivered",
  "delivered",
  "cancelled"
]);

export const pmePurchasePaymentStatusSchema = z.enum([
  "pending",
  "partially_paid",
  "paid",
  "cancelled"
]);

export const pmePurchaseDeliveryStatusSchema = z.enum([
  "pending",
  "partial",
  "complete",
  "rejected"
]);

export const pmeSupplierSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Informe o fornecedor."),
  tradeName: z.string().trim().optional(),
  supplierType: pmeSupplierTypeSchema,
  phone: z.string().trim().optional(),
  email: z.string().email("E-mail invalido.").optional().or(z.literal("")),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  isActive: z.boolean()
});

export const pmePurchaseRequestSchema = z.object({
  id: z.string(),
  requestNumber: z.string().trim().min(1, "Informe o numero."),
  title: z.string().trim().min(1, "Informe a solicitacao."),
  status: pmePurchaseRequestStatusSchema,
  neededByDate: z.string().optional()
});

export const pmePurchaseRequestItemSchema = z.object({
  id: z.string(),
  description: z.string().trim().min(1, "Informe o item."),
  quantity: quantitySchema,
  unit: z.string().trim().min(1, "Informe a unidade."),
  estimatedUnitCost: moneySchema.optional(),
  estimatedTotalCost: moneySchema.optional()
});

export const pmeSupplierQuoteSchema = z.object({
  id: z.string(),
  supplierNameSnapshot: z.string().trim().min(1, "Informe o fornecedor."),
  status: pmeSupplierQuoteStatusSchema,
  totalAmount: moneySchema,
  deliveryCost: moneySchema,
  discountAmount: moneySchema,
  finalAmount: moneySchema,
  validUntil: z.string().optional(),
  deliveryDeadline: z.string().optional(),
  paymentTerms: z.string().trim().optional()
});

export const pmeSupplierQuoteItemSchema = z.object({
  id: z.string(),
  description: z.string().trim().min(1, "Informe o item."),
  quantity: quantitySchema,
  unit: z.string().trim().min(1, "Informe a unidade."),
  unitPrice: moneySchema,
  totalPrice: moneySchema
});

export const pmePurchaseOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().trim().min(1, "Informe o numero."),
  supplierNameSnapshot: z.string().trim().min(1, "Informe o fornecedor."),
  title: z.string().trim().min(1, "Informe o pedido."),
  status: pmePurchaseOrderStatusSchema,
  totalAmount: moneySchema,
  expectedDeliveryDate: z.string().optional(),
  paymentStatus: pmePurchasePaymentStatusSchema,
  actualCostId: z.string().optional()
});

export const pmePurchaseDeliverySchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string().min(1, "Informe o pedido."),
  deliveryDate: z.string().min(1, "Informe a data."),
  status: pmePurchaseDeliveryStatusSchema,
  notes: z.string().trim().optional()
});

export const pmePurchasePaymentSchema = z.object({
  purchaseOrderId: z.string().min(1, "Informe o pedido."),
  paidAt: z.string().min(1, "Informe a data de pagamento."),
  paymentMethod: z.string().trim().optional()
});

export const pmePurchaseAttachmentSchema = z.object({
  id: z.string(),
  fileUrl: z.string().trim().min(1, "Informe o arquivo."),
  fileName: z.string().trim().min(1, "Informe o nome."),
  fileType: z.string().trim().optional(),
  description: z.string().trim().optional()
});
