import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  assertCanCreateActualCostFromPurchase,
  assertPurchaseOrderCanBePaid,
  assertPurchaseOrderCanReceiveDelivery,
  calculatePmePurchaseTotals,
  calculatePurchaseSummaryByProject,
  compareSupplierQuotes
} from "../packages/domain/src/pme-purchases/pmePurchases.ts";

const migrationPath = "supabase/migrations/20260627000200_create_pme_purchases_and_suppliers.sql";

test("PME purchases migration creates supplier and purchase tables with RLS", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const tables = [
    "pme_suppliers",
    "pme_supplier_contacts",
    "pme_purchase_requests",
    "pme_purchase_request_items",
    "pme_supplier_quotes",
    "pme_supplier_quote_items",
    "pme_purchase_orders",
    "pme_purchase_order_items",
    "pme_purchase_deliveries",
    "pme_purchase_delivery_items",
    "pme_purchase_attachments",
    "pme_purchase_status_history"
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`${table}.*organization_id`, "s"));
  }

  assert.match(migration, /foreign key \(organization_id, project_id\)/);
  assert.match(migration, /numeric\(14, 2\)/);
  assert.match(
    migration,
    /has_organization_role\(organization_id, array\['owner', 'admin', 'manager'\]\)/
  );
});

test("PME purchase domain calculates totals and summary", () => {
  const totals = calculatePmePurchaseTotals({
    deliveryCost: "50.00",
    discountAmount: "10.00",
    items: [
      { id: "1", description: "Argamassa", quantity: "2", unitPrice: "40.00" },
      { id: "2", description: "Rejunte", quantity: "1.5", unitPrice: "20.00" }
    ]
  });
  assert.equal(totals.subtotalAmount, "110.00");
  assert.equal(totals.totalAmount, "150.00");

  const summary = calculatePurchaseSummaryByProject({
    expectedTotalAmount: "100.00",
    today: "2026-06-27",
    orders: [
      {
        totalAmount: "150.00",
        status: "ordered",
        paymentStatus: "pending",
        expectedDeliveryDate: "2026-06-20"
      }
    ]
  });
  assert.equal(summary.isOverExpected, true);
  assert.equal(summary.delayedDeliveries, 1);
});

test("PME purchase domain compares quotes and blocks invalid transitions", () => {
  const comparison = compareSupplierQuotes(
    [
      {
        id: "quote-1",
        supplierNameSnapshot: "A",
        finalAmount: "100.00",
        deliveryDeadline: "2026-07-02",
        validUntil: "2026-07-10",
        status: "received"
      },
      {
        id: "quote-2",
        supplierNameSnapshot: "B",
        finalAmount: "120.00",
        deliveryDeadline: "2026-06-30",
        validUntil: "2026-06-20",
        status: "selected"
      }
    ],
    "2026-06-27"
  );

  assert.equal(comparison[0]?.isBestPrice, true);
  assert.equal(comparison[1]?.isFastestDelivery, true);
  assert.equal(comparison[1]?.isExpired, true);
  assert.throws(() => assertPurchaseOrderCanReceiveDelivery("cancelled"), /cannot receive/);
  assert.throws(() => assertPurchaseOrderCanBePaid("cancelled"), /cannot be paid/);
  assert.throws(
    () =>
      assertCanCreateActualCostFromPurchase({
        status: "delivered",
        existingActualCostId: "cost-1"
      }),
    /already has an actual cost/
  );
});

test("PME purchase Edge Functions authenticate, audit and ignore organization body auth", async () => {
  const functions = [
    "supabase/functions/pme-purchase-select-quote/index.ts",
    "supabase/functions/pme-purchase-create-order/index.ts",
    "supabase/functions/pme-purchase-register-delivery/index.ts",
    "supabase/functions/pme-purchase-create-actual-cost/index.ts"
  ];

  for (const functionPath of functions) {
    const source = await readFile(functionPath, "utf8");
    const bodyInterface = source.match(/interface RequestBody \{[\s\S]*?\}/)?.[0] ?? "";

    assert.match(source, /supabase\.auth\.getUser\(\)/);
    assert.match(source, /has_organization_role/);
    assert.match(source, /audit_logs/);
    assert.doesNotMatch(source, /service_role/i);
    assert.doesNotMatch(bodyInterface, /organization/i);
    assert.doesNotMatch(bodyInterface, /tenant/i);
    assert.doesNotMatch(bodyInterface, /userId/i);
  }

  const createOrderSource = await readFile(
    "supabase/functions/pme-purchase-create-order/index.ts",
    "utf8"
  );
  assert.match(createOrderSource, /!\("organizationId" in value\)/);
  assert.match(createOrderSource, /!\("tenantId" in value\)/);
  assert.match(createOrderSource, /!\("userId" in value\)/);
});

test("PME purchase UI exposes suppliers, manual purchase and quote comparison", async () => {
  const suppliers = await readFile(
    "apps/web/src/features/pme-purchases/PmeSuppliersListPage.tsx",
    "utf8"
  );
  const purchases = await readFile(
    "apps/web/src/features/pme-purchases/PmeProjectPurchasesPage.tsx",
    "utf8"
  );
  const comparison = await readFile(
    "apps/web/src/features/pme-purchases/components/PmeSupplierQuoteComparison.tsx",
    "utf8"
  );
  const schemas = await readFile(
    "apps/web/src/features/pme-purchases/pmePurchaseSchemas.ts",
    "utf8"
  );

  assert.match(suppliers, /Criar fornecedor/);
  assert.match(purchases, /Nova compra/);
  assert.match(purchases, /Registrar entrega/);
  assert.match(purchases, /Gerar custo/);
  assert.match(comparison, /Melhor preco/);
  assert.match(comparison, /Cotacao vencida/);
  assert.match(schemas, /A quantidade deve ser maior que zero/);
  assert.match(schemas, /O valor nao pode ser negativo/);
});
