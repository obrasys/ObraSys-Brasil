import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { saveBudgetItemToCatalog } from "../../../packages/domain/src/pme/catalog.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface RequestBody {
  budgetItemId: string;
}

interface BudgetItemRow {
  id: string;
  organization_id: string;
  description: string;
  category: string;
  unit: string;
  unit_cost: string | number;
  unit_price: string | number;
  margin_percentage: string | number;
  source_type: string;
  source_reference_id: string | null;
}

interface AuthContext {
  supabase: SupabaseLike;
  userId: string;
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
  eq: (column: string, value: string) => QueryLike;
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
    const item = await fetchBudgetItem(auth.supabase, body.budgetItemId);
    await assertManager(auth, item.organization_id);

    const payload = saveBudgetItemToCatalog({
      organizationId: item.organization_id,
      createdBy: auth.userId,
      description: item.description,
      category: normalizeCategory(item.category),
      unit: item.unit,
      unitCost: String(item.unit_cost),
      unitPrice: String(item.unit_price),
      marginPercentage: String(item.margin_percentage),
      sourceType: "budget_item",
      sourceReferenceId: item.id
    });
    const { data, error } = await auth.supabase
      .from("pme_catalog_items")
      .insert(payload)
      .select("id")
      .single();

    if (error !== null || !isIdRow(data)) {
      throw new Error("Could not save budget item to catalog.");
    }

    await createAuditLog(
      auth,
      item.organization_id,
      "pme_catalog.item_saved_from_budget",
      data.id,
      {
        budgetItemId: item.id
      }
    );

    return jsonResponse({ catalogItemId: data.id });
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
  if (error !== null || data.user === null) {
    return null;
  }

  return { supabase, userId: data.user.id };
}

async function assertManager(context: AuthContext, organizationId: string): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_organization_role", {
    target_organization_id: organizationId,
    allowed_roles: ["owner", "admin", "manager"]
  });
  if (error !== null || data !== true) {
    throw new Error("User is not allowed to manage this catalog.");
  }
}

async function fetchBudgetItem(supabase: SupabaseLike, id: string): Promise<BudgetItemRow> {
  const { data, error } = await supabase
    .from("pme_budget_items")
    .select(
      "id,organization_id,description,category,unit,unit_cost,unit_price,margin_percentage,source_type,source_reference_id"
    )
    .eq("id", id)
    .maybeSingle();
  if (error !== null || !isBudgetItemRow(data)) {
    throw new Error("Budget item was not found or is not accessible.");
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
    entity_table: "pme_catalog_items",
    entity_id: entityId,
    metadata
  });
  if (error !== null) {
    throw new Error("Could not create audit log.");
  }
}

function isBody(value: unknown): value is RequestBody {
  return isRecord(value) && typeof value.budgetItemId === "string";
}

function isBudgetItemRow(value: unknown): value is BudgetItemRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.description === "string" &&
    typeof value.category === "string" &&
    typeof value.unit === "string" &&
    (typeof value.unit_cost === "string" || typeof value.unit_cost === "number") &&
    (typeof value.unit_price === "string" || typeof value.unit_price === "number") &&
    (typeof value.margin_percentage === "string" || typeof value.margin_percentage === "number") &&
    typeof value.source_type === "string" &&
    (typeof value.source_reference_id === "string" || value.source_reference_id === null)
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
