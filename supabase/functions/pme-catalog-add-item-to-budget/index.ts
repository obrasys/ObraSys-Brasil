import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { addCatalogItemToBudget } from "../../../packages/domain/src/pme/catalog.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  budgetId: string;
  catalogItemId: string;
  quantity: string;
}

interface AuthContext {
  supabase: SupabaseLike;
  userId: string;
}

interface BudgetRow {
  id: string;
  organization_id: string;
}

interface CatalogItemRow {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  unit: string;
  default_unit_cost: string | number;
  default_unit_price: string | number;
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
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
  insert: (payload: Record<string, unknown>) => QueryLike;
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
    const [budget, item] = await Promise.all([
      fetchBudget(auth.supabase, body.budgetId),
      fetchCatalogItem(auth.supabase, body.catalogItemId)
    ]);
    if (budget.organization_id !== item.organization_id) {
      throw new Error("Catalog item and budget must belong to the same organization.");
    }
    await assertManager(auth, budget.organization_id);

    const payload = addCatalogItemToBudget({
      organizationId: budget.organization_id,
      budgetId: budget.id,
      createdBy: auth.userId,
      catalogItemId: item.id,
      description: item.name,
      category: normalizeCategory(item.category),
      unit: item.unit,
      quantity: body.quantity,
      unitCost: String(item.default_unit_cost),
      unitPrice: String(item.default_unit_price)
    });
    const { data, error } = await auth.supabase
      .from("pme_budget_items")
      .insert(payload)
      .select("id")
      .single();
    if (error !== null || !isIdRow(data)) {
      throw new Error("Could not add catalog item to budget.");
    }

    await createAuditLog(
      auth,
      budget.organization_id,
      "pme_catalog.item_added_to_budget",
      data.id,
      {
        budgetId: budget.id,
        catalogItemId: item.id
      }
    );

    return jsonResponse({ budgetItemId: data.id });
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
    .select("id,organization_id")
    .eq("id", id)
    .maybeSingle();
  if (error !== null || !isBudgetRow(data)) {
    throw new Error("Budget was not found or is not accessible.");
  }
  return data;
}

async function fetchCatalogItem(supabase: SupabaseLike, id: string): Promise<CatalogItemRow> {
  const { data, error } = await supabase
    .from("pme_catalog_items")
    .select("id,organization_id,name,category,unit,default_unit_cost,default_unit_price")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error !== null || !isCatalogItemRow(data)) {
    throw new Error("Catalog item was not found or is inactive.");
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
    entity_table: "pme_budget_items",
    entity_id: entityId,
    metadata
  });
  if (error !== null) {
    throw new Error("Could not create audit log.");
  }
}

function isBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    typeof value.budgetId === "string" &&
    typeof value.catalogItemId === "string" &&
    typeof value.quantity === "string"
  );
}

function isBudgetRow(value: unknown): value is BudgetRow {
  return (
    isRecord(value) && typeof value.id === "string" && typeof value.organization_id === "string"
  );
}

function isCatalogItemRow(value: unknown): value is CatalogItemRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    typeof value.unit === "string" &&
    (typeof value.default_unit_cost === "string" || typeof value.default_unit_cost === "number") &&
    (typeof value.default_unit_price === "string" || typeof value.default_unit_price === "number")
  );
}

function normalizeCategory(value: string) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
