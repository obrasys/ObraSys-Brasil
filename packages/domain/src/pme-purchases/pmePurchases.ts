export interface PmePurchaseMoneyInput {
  amount: string;
}

export interface PmePurchaseLineInput {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface PmePurchaseTotalsInput {
  items: PmePurchaseLineInput[];
  deliveryCost: string;
  discountAmount: string;
}

export interface PmePurchaseTotalsResult {
  subtotalAmount: string;
  deliveryCost: string;
  discountAmount: string;
  totalAmount: string;
}

export interface PmeSupplierQuoteComparisonInput {
  id: string;
  supplierNameSnapshot: string;
  finalAmount: string;
  deliveryDeadline?: string | null;
  validUntil?: string | null;
  paymentTerms?: string | null;
  status: "draft" | "received" | "selected" | "rejected" | "expired" | "cancelled";
}

export interface PmeSupplierQuoteComparisonResult extends PmeSupplierQuoteComparisonInput {
  isBestPrice: boolean;
  isFastestDelivery: boolean;
  isSelected: boolean;
  isExpired: boolean;
}

export interface PmePurchaseSummaryInput {
  orders: Array<{
    totalAmount: string;
    status: "draft" | "ordered" | "partially_delivered" | "delivered" | "cancelled";
    paymentStatus: "pending" | "partially_paid" | "paid" | "cancelled";
    expectedDeliveryDate?: string | null;
  }>;
  expectedTotalAmount?: string | null;
  today: string;
}

export interface PmePurchaseSummaryResult {
  expectedTotalAmount: string;
  totalPurchased: string;
  totalDelivered: string;
  totalPaid: string;
  pendingOrders: number;
  delayedDeliveries: number;
  isOverExpected: boolean;
}

export function calculatePmePurchaseTotals(input: PmePurchaseTotalsInput): PmePurchaseTotalsResult {
  const subtotal = input.items.reduce(
    (total, item) => total + multiplyDecimal(item.quantity, item.unitPrice),
    0n
  );
  const deliveryCost = parseMoney(input.deliveryCost);
  const discountAmount = parseMoney(input.discountAmount);
  const totalAmount = subtotal + deliveryCost - discountAmount;

  if (totalAmount < 0n) {
    throw new Error("Purchase total cannot be negative.");
  }

  return {
    subtotalAmount: formatMoney(subtotal),
    deliveryCost: formatMoney(deliveryCost),
    discountAmount: formatMoney(discountAmount),
    totalAmount: formatMoney(totalAmount)
  };
}

export function compareSupplierQuotes(
  quotes: PmeSupplierQuoteComparisonInput[],
  today: string
): PmeSupplierQuoteComparisonResult[] {
  const activeQuotes = quotes.filter(
    (quote) => quote.status !== "cancelled" && quote.status !== "rejected"
  );
  const bestPrice = activeQuotes.reduce<bigint | null>((best, quote) => {
    const amount = parseMoney(quote.finalAmount);
    return best === null || amount < best ? amount : best;
  }, null);
  const fastestDelivery = activeQuotes.reduce<string | null>((fastest, quote) => {
    if (!quote.deliveryDeadline) {
      return fastest;
    }
    return fastest === null || quote.deliveryDeadline < fastest ? quote.deliveryDeadline : fastest;
  }, null);

  return quotes.map((quote) => ({
    ...quote,
    isBestPrice: bestPrice !== null && parseMoney(quote.finalAmount) === bestPrice,
    isFastestDelivery: fastestDelivery !== null && quote.deliveryDeadline === fastestDelivery,
    isSelected: quote.status === "selected",
    isExpired: Boolean(quote.validUntil && quote.validUntil < today)
  }));
}

export function calculatePurchaseSummaryByProject(
  input: PmePurchaseSummaryInput
): PmePurchaseSummaryResult {
  const expectedTotal = parseMoney(input.expectedTotalAmount ?? "0.00");
  const activeOrders = input.orders.filter((order) => order.status !== "cancelled");
  const totalPurchased = activeOrders.reduce(
    (total, order) => total + parseMoney(order.totalAmount),
    0n
  );
  const totalDelivered = activeOrders
    .filter((order) => order.status === "delivered")
    .reduce((total, order) => total + parseMoney(order.totalAmount), 0n);
  const totalPaid = activeOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((total, order) => total + parseMoney(order.totalAmount), 0n);
  const pendingOrders = activeOrders.filter(
    (order) => order.status === "draft" || order.status === "ordered"
  ).length;
  const delayedDeliveries = activeOrders.filter(
    (order) =>
      order.status !== "delivered" &&
      Boolean(order.expectedDeliveryDate) &&
      String(order.expectedDeliveryDate) < input.today
  ).length;

  return {
    expectedTotalAmount: formatMoney(expectedTotal),
    totalPurchased: formatMoney(totalPurchased),
    totalDelivered: formatMoney(totalDelivered),
    totalPaid: formatMoney(totalPaid),
    pendingOrders,
    delayedDeliveries,
    isOverExpected: expectedTotal > 0n && totalPurchased > expectedTotal
  };
}

export function assertPurchaseOrderCanReceiveDelivery(status: string): void {
  if (status === "cancelled") {
    throw new Error("Cancelled purchase orders cannot receive deliveries.");
  }
}

export function assertPurchaseOrderCanBePaid(status: string): void {
  if (status === "cancelled") {
    throw new Error("Cancelled purchase orders cannot be paid.");
  }
}

export function assertCanCreateActualCostFromPurchase(input: {
  status: string;
  existingActualCostId?: string | null;
  confirmedDuplicate?: boolean;
}): void {
  if (input.status === "cancelled") {
    throw new Error("Cancelled purchase orders cannot generate actual costs.");
  }
  if (input.existingActualCostId && input.confirmedDuplicate !== true) {
    throw new Error("Purchase order already has an actual cost.");
  }
}

function parseMoney(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error("Expected a non-negative money value with up to two decimals.");
  }

  const [integerPart, decimalPart = ""] = value.split(".");
  return BigInt(integerPart + decimalPart.padEnd(2, "0"));
}

function multiplyDecimal(quantity: string, unitPrice: string): bigint {
  if (!/^\d+(\.\d{1,4})?$/.test(quantity)) {
    throw new Error("Expected a quantity with up to four decimals.");
  }

  const quantityParts = quantity.split(".");
  const integerPart = quantityParts[0] ?? "0";
  const decimalPart = quantityParts[1] ?? "";
  const quantityScaled = BigInt(integerPart + decimalPart.padEnd(4, "0"));
  const cents = parseMoney(unitPrice);
  return (quantityScaled * cents + 5000n) / 10000n;
}

function formatMoney(cents: bigint): string {
  const reais = cents / 100n;
  const centavos = cents % 100n;
  return `${reais}.${centavos.toString().padStart(2, "0")}`;
}
