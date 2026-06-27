import { calculatePurchaseSummaryByProject, compareSupplierQuotes } from "@obrasys/domain";

import type {
  PmeProjectPurchasesSnapshot,
  PmePurchaseDelivery,
  PmePurchaseOrder,
  PmePurchaseRequest,
  PmeSupplier,
  PmeSupplierQuote
} from "./pmePurchaseTypes";

const suppliers: PmeSupplier[] = [
  {
    id: "supplier-1",
    name: "Dep. Central Materiais",
    tradeName: "Deposito Central",
    supplierType: "material",
    phone: "(11) 99999-1000",
    email: "vendas@central.example",
    city: "Sao Paulo",
    state: "SP",
    isActive: true
  },
  {
    id: "supplier-2",
    name: "Transporte Rapido Entulho",
    supplierType: "transporte",
    phone: "(11) 98888-2000",
    city: "Guarulhos",
    state: "SP",
    isActive: true
  }
];

const snapshot: PmeProjectPurchasesSnapshot = {
  projectId: "project-demo-1",
  summary: {
    expectedTotalAmount: "0.00",
    totalPurchased: "0.00",
    totalDelivered: "0.00",
    totalPaid: "0.00",
    pendingOrders: 0,
    delayedDeliveries: 0,
    isOverExpected: false
  },
  requests: [
    {
      id: "request-1",
      requestNumber: "SC-001",
      title: "Revestimento banheiro",
      status: "quoted",
      neededByDate: "2026-07-01"
    }
  ],
  quotes: [
    {
      id: "quote-1",
      supplierNameSnapshot: "Dep. Central Materiais",
      status: "selected",
      totalAmount: "1800.00",
      deliveryCost: "120.00",
      discountAmount: "0.00",
      finalAmount: "1920.00",
      validUntil: "2026-07-05",
      deliveryDeadline: "2026-07-01",
      paymentTerms: "PIX na entrega"
    },
    {
      id: "quote-2",
      supplierNameSnapshot: "Casa do Revestimento",
      status: "received",
      totalAmount: "1760.00",
      deliveryCost: "260.00",
      discountAmount: "0.00",
      finalAmount: "2020.00",
      validUntil: "2026-06-20",
      deliveryDeadline: "2026-07-04",
      paymentTerms: "50% entrada"
    }
  ],
  orders: [
    {
      id: "order-1",
      orderNumber: "PC-001",
      supplierNameSnapshot: "Dep. Central Materiais",
      title: "Revestimento banheiro",
      status: "ordered",
      totalAmount: "1920.00",
      expectedDeliveryDate: "2026-07-01",
      paymentStatus: "pending"
    }
  ],
  deliveries: []
};

export async function listPmeSuppliers(): Promise<PmeSupplier[]> {
  return structuredClone(suppliers);
}

export async function createPmeSupplier(
  supplier: Omit<PmeSupplier, "id">
): Promise<{ id: string }> {
  const created = { ...supplier, id: createId("supplier") };
  suppliers.push(created);
  return { id: created.id };
}

export async function deactivatePmeSupplier(supplierId: string): Promise<void> {
  const supplier = suppliers.find((item) => item.id === supplierId);
  if (supplier) {
    supplier.isActive = false;
  }
}

export async function getProjectPurchases(projectId: string): Promise<PmeProjectPurchasesSnapshot> {
  if (projectId !== snapshot.projectId) {
    throw new Error("Compras da obra nao encontradas.");
  }
  const clone = structuredClone(snapshot);
  clone.summary = calculatePurchaseSummaryByProject({
    expectedTotalAmount: "1800.00",
    today: "2026-06-27",
    orders: clone.orders.map((order) => ({
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      expectedDeliveryDate: order.expectedDeliveryDate ?? null
    }))
  });
  return clone;
}

export async function createPurchaseRequest(
  projectId: string,
  request: Omit<PmePurchaseRequest, "id">
): Promise<{ id: string }> {
  ensureProject(projectId);
  const created = { ...request, id: createId("request") };
  snapshot.requests.push(created);
  return { id: created.id };
}

export async function createSupplierQuote(
  projectId: string,
  quote: Omit<PmeSupplierQuote, "id">
): Promise<{ id: string }> {
  ensureProject(projectId);
  const created = { ...quote, id: createId("quote") };
  snapshot.quotes.push(created);
  return { id: created.id };
}

export async function selectSupplierQuote(projectId: string, quoteId: string): Promise<void> {
  ensureProject(projectId);
  snapshot.quotes = snapshot.quotes.map((quote) => ({
    ...quote,
    status:
      quote.id === quoteId ? "selected" : quote.status === "received" ? "rejected" : quote.status
  }));
}

export async function createPurchaseOrderManual(
  projectId: string,
  order: Omit<PmePurchaseOrder, "id">
): Promise<{ id: string }> {
  ensureProject(projectId);
  const created = { ...order, id: createId("order") };
  snapshot.orders.push(created);
  return { id: created.id };
}

export async function registerPurchaseDelivery(
  projectId: string,
  delivery: Omit<PmePurchaseDelivery, "id">
): Promise<{ id: string }> {
  ensureProject(projectId);
  const order = snapshot.orders.find((item) => item.id === delivery.purchaseOrderId);
  if (order?.status === "cancelled") {
    throw new Error("Pedido cancelado nao permite entrega.");
  }
  const created = { ...delivery, id: createId("delivery") };
  snapshot.deliveries.push(created);
  if (order) {
    order.status = delivery.status === "complete" ? "delivered" : "partially_delivered";
  }
  return { id: created.id };
}

export async function markPurchaseOrderAsPaid(projectId: string, orderId: string): Promise<void> {
  ensureProject(projectId);
  const order = snapshot.orders.find((item) => item.id === orderId);
  if (order?.status === "cancelled") {
    throw new Error("Pedido cancelado nao pode ser pago.");
  }
  if (order) {
    order.paymentStatus = "paid";
  }
}

export async function createActualCostFromPurchaseOrder(
  projectId: string,
  orderId: string
): Promise<void> {
  ensureProject(projectId);
  const order = snapshot.orders.find((item) => item.id === orderId);
  if (!order || order.status === "cancelled") {
    throw new Error("Pedido nao pode gerar custo.");
  }
  if (order.actualCostId) {
    throw new Error("Custo ja gerado para este pedido.");
  }
  order.actualCostId = createId("cost");
}

export function compareProjectSupplierQuotes(quotes: PmeSupplierQuote[]) {
  return compareSupplierQuotes(
    quotes.map((quote) => ({
      id: quote.id,
      supplierNameSnapshot: quote.supplierNameSnapshot,
      finalAmount: quote.finalAmount,
      deliveryDeadline: quote.deliveryDeadline ?? null,
      validUntil: quote.validUntil ?? null,
      paymentTerms: quote.paymentTerms ?? null,
      status: quote.status
    })),
    "2026-06-27"
  );
}

function ensureProject(projectId: string): void {
  if (projectId !== snapshot.projectId) {
    throw new Error("Obra nao encontrada.");
  }
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}
