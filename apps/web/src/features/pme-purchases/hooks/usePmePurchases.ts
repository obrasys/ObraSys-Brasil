import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  PmePurchaseDelivery,
  PmePurchaseOrder,
  PmePurchaseRequest,
  PmeSupplier,
  PmeSupplierQuote
} from "../pmePurchaseTypes";
import { pmePurchaseClient } from "../services/pmePurchaseClient";

export const pmePurchaseKeys = {
  suppliers: ["pme-suppliers"] as const,
  project: (projectId: string) => ["pme-project-purchases", projectId] as const
};

export function usePmeSuppliers() {
  return useQuery({
    queryKey: pmePurchaseKeys.suppliers,
    queryFn: pmePurchaseClient.listSuppliers
  });
}

export function usePmeProjectPurchases(projectId: string) {
  return useQuery({
    queryKey: pmePurchaseKeys.project(projectId),
    queryFn: () => pmePurchaseClient.getProjectPurchases(projectId)
  });
}

export function usePmePurchaseMutations(projectId: string) {
  const queryClient = useQueryClient();
  const invalidateProject = () =>
    queryClient.invalidateQueries({ queryKey: pmePurchaseKeys.project(projectId) });
  const invalidateSuppliers = () =>
    queryClient.invalidateQueries({ queryKey: pmePurchaseKeys.suppliers });

  return {
    createSupplier: useMutation({
      mutationFn: (supplier: Omit<PmeSupplier, "id">) => pmePurchaseClient.createSupplier(supplier),
      onSuccess: invalidateSuppliers
    }),
    deactivateSupplier: useMutation({
      mutationFn: (supplierId: string) => pmePurchaseClient.deactivateSupplier(supplierId),
      onSuccess: invalidateSuppliers
    }),
    createRequest: useMutation({
      mutationFn: (request: Omit<PmePurchaseRequest, "id">) =>
        pmePurchaseClient.createPurchaseRequest(projectId, request),
      onSuccess: invalidateProject
    }),
    createQuote: useMutation({
      mutationFn: (quote: Omit<PmeSupplierQuote, "id">) =>
        pmePurchaseClient.createSupplierQuote(projectId, quote),
      onSuccess: invalidateProject
    }),
    selectQuote: useMutation({
      mutationFn: (quoteId: string) => pmePurchaseClient.selectSupplierQuote(projectId, quoteId),
      onSuccess: invalidateProject
    }),
    createOrder: useMutation({
      mutationFn: (order: Omit<PmePurchaseOrder, "id">) =>
        pmePurchaseClient.createPurchaseOrderManual(projectId, order),
      onSuccess: invalidateProject
    }),
    registerDelivery: useMutation({
      mutationFn: (delivery: Omit<PmePurchaseDelivery, "id">) =>
        pmePurchaseClient.registerPurchaseDelivery(projectId, delivery),
      onSuccess: invalidateProject
    }),
    markAsPaid: useMutation({
      mutationFn: (orderId: string) =>
        pmePurchaseClient.markPurchaseOrderAsPaid(projectId, orderId),
      onSuccess: invalidateProject
    }),
    createActualCost: useMutation({
      mutationFn: (orderId: string) =>
        pmePurchaseClient.createActualCostFromPurchaseOrder(projectId, orderId),
      onSuccess: invalidateProject
    })
  };
}
