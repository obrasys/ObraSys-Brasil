import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  addCatalogKitToBudget,
  type CatalogKitItemSource,
  type PmeCatalogCategory
} from "../../../packages/domain/src/pme/catalog.ts";
import type { PmeBudgetCalculationItemInput } from "../../../packages/domain/src/pme/calculatePmeBudget.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  budgetId: string;
  kitId: string;
}

interface AuthContext {
  supabase: SupabaseLike;
  userId: string;
}

interface BudgetRow {
  id: string;
  organization_id: string;
  overhead_percentage: string | number;
  tax_percentage: string | number;
  profit_percentage: string | number;
  discount_amount: string | number;
}

interface CatalogKitRow {
  id: string;
  organization_id: string;
  is_active: boolean;
}

interface CatalogKitItemRow {
  description: string;
  category: string;
  quantity: string | number;
  unit: string;
  unit_cost: string | number;
  unit_price: string | number;
  sort_order: number | null;
  is_optional: boolean | null;
}

interface ExistingBudgetItemRow {
  description: string;
  category: string;
  quantity: string | number;
  unit_cost: string | number;
  unit_price: string | number;
}

interface SupabaseLike {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
  };
  from: (table: string) => QueryLike;
  rpc: (
    functionName: string,
    args: Record<string, string | string[]>
  ) => Promise<{ data: boolean | null; error: Error | null }>;
}

interface QueryLike {
  select: (columns: string) => QueryLike;
  eq: (column: string, value: string | boolean) => QueryLike;
  insert: (payload: Record<string, unknown> | Array<Record<string, unknown>>) => QueryLike;
  update: (payload: Record<string, unknown>) => QueryLike;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
  single: () => Promise<{ data: unknown; error: Error | null }>;
  then: Promise<{ data: unknown; error: Error | null }>["then"];
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  const auth = await authenticate(request);
  if (auth === null) {
    return jsonResponse({ error: "Invalid authentication token." }, 401);
  }
  const body: unknown = await request.json();
  if (!isBody(body)) {
    return jsonResponse({ error: "Invalid payload." }, 400);
  }

  try {
    const [budget, kit] = await Promise.all([
      fetchBudget(auth.supabase, body.budgetId),
      fetchKit(auth.supabase, body.kitId)
    ]);
    if (!kit.is_active) {
      throw new Error("Catalog kit is inactive.");
    }
    if (budget.organization_id !== kit.organization_id) {
      throw new Error("Catalog kit and budget must belong to the same organization.");
    }
    await assertManager(auth, budget.organization_id);

    const [kitItems, existingItems] = await Promise.all([
      fetchKitItems(auth.supabase, kit.id),
      fetchExistingBudgetItems(auth.supabase, budget.id)
    ]);
    const result = addCatalogKitToBudget({
      organizationId: budget.organization_id,
      budgetId: budget.id,
      createdBy: auth.userId,
      items: kitItems.map(toCatalogKitItemSource),
      existingCalculationItems: existingItems.map(toCalculationItem),
      overheadPercentage: String(budget.overhead_percentage),
      taxPercentage: String(budget.tax_percentage),
      profitPercentage: String(budget.profit_percentage),
      discountAmount: String(budget.discount_amount)
    });

    const { data: insertedRows, error: insertError } = await auth.supabase
      .from("pme_budget_items")
      .insert(result.budgetItems)
      .select("id");
    if (insertError !== null || !Array.isArray(insertedRows) || !insertedRows.every(isIdRow)) {
      throw new Error("Could not add catalog kit to budget.");
    }

    const { error: updateError } = await auth.supabase
      .from("pme_budgets")
      .update({
        subtotal_cost: result.calculation.subtotalCost,
        final_price: result.calculation.finalPrice,
        updated_by: auth.userId
      })
      .eq("id", budget.id);
    if (updateError !== null) {
      throw new Error("Could not update budget totals.");
    }

    await createAuditLog(auth, budget.organization_id, "pme_catalog.kit_added_to_budget", kit.id, {
      budgetId: budget.id,
      kitId: kit.id,
      insertedFirstItemId: insertedRows[0]?.id ?? null,
      insertedItemCount: result.budgetItems.length,
      finalPrice: result.calculation.finalPrice
    });

    return jsonResponse({
      insertedItemCount: result.budgetItems.length,
      calculation: result.calculation
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Request failed." }, 400);
  }
});

async function authenticate(request: Request): Promise<AuthContext | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorizationHeader = request.headers.get("authorization");
  if (!supabaseUrl || !supabaseAnonKey || authorizationHeader === null) {
    return null;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorizationHeader } }
  }) as SupabaseLike;
  const { data, error } = await supabase.auth.getUser();
  return error === null && data.user !== null ? { supabase, userId: data.user.id } : null;
}

async function assertManager(context: AuthContext, organizationId: string): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_organization_role", {
    target_organization_id: organizationId,
    allowed_roles: ["owner", "admin", "manager"]
  });
  if (error !== null || data !== true) {
    throw new Error("User is not allowed to manage this budget.");
  }
}

async function fetchBudget(supabase: SupabaseLike, id: string): Promise<BudgetRow> {
  const { data, error } = await supabase
    .from("pme_budgets")
    .select(
      "id,organization_id,overhead_percentage,tax_percentage,profit_percentage,discount_amount"
    )
    .eq("id", id)
    .maybeSingle();
  if (error !== null || !isBudgetRow(data)) {
    throw new Error("Budget was not found or is not accessible.");
  }
  return data;
}

async function fetchKit(supabase: SupabaseLike, id: string): Promise<CatalogKitRow> {
  const { data, error } = await supabase
    .from("pme_catalog_kits")
    .select("id,organization_id,is_active")
    .eq("id", id)
    .maybeSingle();
  if (error !== null || !isKitRow(data)) {
    throw new Error("Catalog kit was not found or is not accessible.");
  }
  return data;
}

async function fetchKitItems(supabase: SupabaseLike, kitId: string): Promise<CatalogKitItemRow[]> {
  const { data, error } = await supabase
    .from("pme_catalog_kit_items")
    .select("description,category,quantity,unit,unit_cost,unit_price,sort_order,is_optional")
    .eq("kit_id", kitId);
  if (error !== null || !Array.isArray(data) || !data.every(isKitItemRow)) {
    throw new Error("Catalog kit items were not found or are invalid.");
  }
  return data;
}

async function fetchExistingBudgetItems(
  supabase: SupabaseLike,
  budgetId: string
): Promise<ExistingBudgetItemRow[]> {
  const { data, error } = await supabase
    .from("pme_budget_items")
    .select("description,category,quantity,unit_cost,unit_price")
    .eq("budget_id", budgetId);
  if (error !== null || !Array.isArray(data) || !data.every(isExistingBudgetItemRow)) {
    throw new Error("Budget items were not found or are invalid.");
  }
  return data;
}

async function createAuditLog(
  context: AuthContext,
  organizationId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { error } = await context.supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: context.userId,
    action,
    entity_table: "pme_catalog_kits",
    entity_id: entityId,
    metadata
  });
  if (error !== null) {
    throw new Error("Could not create audit log.");
  }
}

function toCatalogKitItemSource(row: CatalogKitItemRow): CatalogKitItemSource {
  return {
    description: row.description,
    category: normalizeCategory(row.category),
    quantity: String(row.quantity),
    unit: row.unit,
    unitCost: String(row.unit_cost),
    unitPrice: String(row.unit_price),
    sortOrder: row.sort_order ?? 0,
    isOptional: row.is_optional ?? false
  };
}

function toCalculationItem(row: ExistingBudgetItemRow): PmeBudgetCalculationItemInput {
  return {
    description: row.description,
    kind: normalizeCategory(row.category),
    quantity: String(row.quantity),
    unitCost: String(row.unit_cost),
    unitPrice: String(row.unit_price)
  };
}

function isBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    typeof value.budgetId === "string" &&
    typeof value.kitId === "string" &&
    !("organizationId" in value)
  );
}

function isBudgetRow(value: unknown): value is BudgetRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    isStringOrNumber(value.overhead_percentage) &&
    isStringOrNumber(value.tax_percentage) &&
    isStringOrNumber(value.profit_percentage) &&
    isStringOrNumber(value.discount_amount)
  );
}

function isKitRow(value: unknown): value is CatalogKitRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.is_active === "boolean"
  );
}

function isKitItemRow(value: unknown): value is CatalogKitItemRow {
  return (
    isRecord(value) &&
    typeof value.description === "string" &&
    typeof value.category === "string" &&
    isStringOrNumber(value.quantity) &&
    typeof value.unit === "string" &&
    isStringOrNumber(value.unit_cost) &&
    isStringOrNumber(value.unit_price) &&
    (typeof value.sort_order === "number" || value.sort_order === null) &&
    (typeof value.is_optional === "boolean" || value.is_optional === null)
  );
}

function isExistingBudgetItemRow(value: unknown): value is ExistingBudgetItemRow {
  return (
    isRecord(value) &&
    typeof value.description === "string" &&
    typeof value.category === "string" &&
    isStringOrNumber(value.quantity) &&
    isStringOrNumber(value.unit_cost) &&
    isStringOrNumber(value.unit_price)
  );
}

function normalizeCategory(value: string): PmeCatalogCategory {
  if (
    value === "material" ||
    value === "mao_de_obra" ||
    value === "servico" ||
    value === "terceiro" ||
    value === "equipamento" ||
    value === "transporte" ||
    value === "descarte" ||
    value === "taxa" ||
    value === "composicao" ||
    value === "outro"
  ) {
    return value;
  }
  return "outro";
}

function isIdRow(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === "string";
}

function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
