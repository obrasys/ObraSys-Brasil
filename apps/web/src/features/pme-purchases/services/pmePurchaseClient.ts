import {
  createActualCostFromPurchaseOrder,
  createPmeSupplier,
  createPurchaseOrderManual,
  createPurchaseRequest,
  createSupplierQuote,
  deactivatePmeSupplier,
  getProjectPurchases,
  listPmeSuppliers,
  markPurchaseOrderAsPaid,
  registerPurchaseDelivery,
  selectSupplierQuote
} from "../pmePurchaseRepository";
import type {
  PmePurchaseDelivery,
  PmePurchaseOrder,
  PmePurchaseRequest,
  PmeSupplier,
  PmeSupplierQuote
} from "../pmePurchaseTypes";

export const pmePurchaseClient = {
  listSuppliers: listPmeSuppliers,
  createSupplier: (supplier: Omit<PmeSupplier, "id">) => createPmeSupplier(supplier),
  deactivateSupplier: deactivatePmeSupplier,
  getProjectPurchases,
  createPurchaseRequest: (projectId: string, request: Omit<PmePurchaseRequest, "id">) =>
    createPurchaseRequest(projectId, request),
  createSupplierQuote: (projectId: string, quote: Omit<PmeSupplierQuote, "id">) =>
    createSupplierQuote(projectId, quote),
  selectSupplierQuote,
  createPurchaseOrderManual: (projectId: string, order: Omit<PmePurchaseOrder, "id">) =>
    createPurchaseOrderManual(projectId, order),
  registerPurchaseDelivery: (projectId: string, delivery: Omit<PmePurchaseDelivery, "id">) =>
    registerPurchaseDelivery(projectId, delivery),
  markPurchaseOrderAsPaid,
  createActualCostFromPurchaseOrder
};
