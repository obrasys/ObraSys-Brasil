import type { z } from "zod";

import type {
  pmePurchaseDeliverySchema,
  pmePurchaseOrderSchema,
  pmePurchaseRequestItemSchema,
  pmePurchaseRequestSchema,
  pmeSupplierQuoteSchema,
  pmeSupplierSchema
} from "./pmePurchaseSchemas";

export type PmeSupplier = z.infer<typeof pmeSupplierSchema>;
export type PmePurchaseRequest = z.infer<typeof pmePurchaseRequestSchema>;
export type PmePurchaseRequestItem = z.infer<typeof pmePurchaseRequestItemSchema>;
export type PmeSupplierQuote = z.infer<typeof pmeSupplierQuoteSchema>;
export type PmePurchaseOrder = z.infer<typeof pmePurchaseOrderSchema>;
export type PmePurchaseDelivery = z.infer<typeof pmePurchaseDeliverySchema>;

export interface PmePurchaseSummary {
  expectedTotalAmount: string;
  totalPurchased: string;
  totalDelivered: string;
  totalPaid: string;
  pendingOrders: number;
  delayedDeliveries: number;
  isOverExpected: boolean;
}

export interface PmeProjectPurchasesSnapshot {
  projectId: string;
  summary: PmePurchaseSummary;
  requests: PmePurchaseRequest[];
  quotes: PmeSupplierQuote[];
  orders: PmePurchaseOrder[];
  deliveries: PmePurchaseDelivery[];
}
