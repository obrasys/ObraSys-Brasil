import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  addSinapiCompositionToPmeBudget,
  adaptSinapiComposition,
  calculatePmeBudget,
  type SinapiCompositionSearchItem,
  type SinapiRegime
} from "../../../packages/domain/src/index.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  budgetId: string;
  compositionId: string;
  quantity: string;
  adaptedDescription: string;
  adaptedUnit: string;
  adaptedUnitCost: string;
  adaptedUnitPrice: string;
  wastePercentage: string;
  productivityAdjustmentPercentage: string;
  marginPercentage: string;
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

interface BudgetItemRow {
  id: string;
  description: string;
  category: string | null;
  quantity: string | number;
  unit_cost: string | number;
  unit_price: string | number;
}

interface SinapiCompositionRow {
  id: string;
  version_id: string;
  uf: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  code: string;
  description: string;
  unit: string;
  total_cost: string | number;
  labor_cost: string | number | null;
  material_cost: string | number | null;
  equipment_cost: string | number | null;
  category: string | null;
  is_active: boolean;
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
  update: (payload: Record<string, unknown>) => QueryLike;
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
    const [budget, composition] = await Promise.all([
      fetchBudget(auth.supabase, body.budgetId),
      fetchComposition(auth.supabase, body.compositionId)
    ]);
    await assertManager(auth, budget.organization_id);

    const adaptation = adaptSinapiComposition({
      composition: mapComposition(composition),
      quantity: body.quantity,
      adaptedDescription: body.adaptedDescription,
      adaptedUnit: body.adaptedUnit,
      adaptedUnitCost: body.adaptedUnitCost,
      adaptedUnitPrice: body.adaptedUnitPrice,
      productivityAdjustmentPercentage: body.productivityAdjustmentPercentage,
      wastePercentage: body.wastePercentage,
      marginPercentage: body.marginPercentage
    });
    const budgetItemId = crypto.randomUUID();
    const plan = addSinapiCompositionToPmeBudget({
      organizationId: budget.organization_id,
      budgetId: budget.id,
      budgetItemId,
      createdBy: auth.userId,
      adaptation
    });

    const { data: itemData, error: itemError } = await auth.supabase
      .from("pme_budget_items")
      .insert({ id: budgetItemId, ...plan.item })
      .select("id")
      .single();
    if (itemError !== null || !isIdRow(itemData)) {
      throw new Error("Could not create PME budget item from SINAPI.");
    }

    const { error: snapshotError } = await auth.supabase
      .from("pme_budget_sinapi_snapshots")
      .insert(plan.snapshot);
    if (snapshotError !== null) {
      throw new Error("Could not create SINAPI snapshot.");
    }

    const existingItems = await fetchBudgetItems(auth.supabase, budget.id);
    const calculation = calculatePmeBudget({
      items: [
        ...existingItems.map((item) => ({
          id: item.id,
          description: item.description,
          kind: normalizeCalculationKind(item.category),
          quantity: String(item.quantity),
          unitCost: String(item.unit_cost),
          unitPrice: String(item.unit_price)
        })),
        {
          id: budgetItemId,
          description: plan.item.description,
          kind: "servico",
          quantity: plan.item.quantity,
          unitCost: plan.item.unit_cost,
          unitPrice: plan.item.unit_price
        }
      ],
      overheadPercentage: String(budget.overhead_percentage),
      taxPercentage: String(budget.tax_percentage),
      profitPercentage: String(budget.profit_percentage),
      discountAmount: String(budget.discount_amount)
    });

    await updateBudgetTotals(
      auth.supabase,
      budget.id,
      calculation.subtotalCost,
      calculation.finalPrice
    );
    await createAuditLog(
      auth,
      budget.organization_id,
      "pme_sinapi.composition_added_to_budget",
      budgetItemId,
      {
        budgetId: budget.id,
        compositionId: composition.id,
        sinapiCode: composition.code,
        uf: composition.uf,
        referenceMonth: composition.reference_month,
        referenceYear: composition.reference_year,
        regime: composition.regime
      }
    );

    return jsonResponse({
      budgetItemId,
      snapshotCreated: true,
      subtotalCost: calculation.subtotalCost,
      finalPrice: calculation.finalPrice
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

async function fetchComposition(supabase: SupabaseLike, id: string): Promise<SinapiCompositionRow> {
  const { data, error } = await supabase
    .from("sinapi_compositions")
    .select(
      "id,version_id,uf,reference_month,reference_year,regime,code,description,unit,total_cost,labor_cost,material_cost,equipment_cost,category,is_active"
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error !== null || !isCompositionRow(data)) {
    throw new Error("SINAPI composition was not found or is inactive.");
  }

  return data;
}

async function fetchBudgetItems(
  supabase: SupabaseLike,
  budgetId: string
): Promise<BudgetItemRow[]> {
  const { data, error } = await supabase
    .from("pme_budget_items")
    .select("id,description,category,quantity,unit_cost,unit_price")
    .eq("budget_id", budgetId);
  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not load budget items.");
  }

  return data.filter(isBudgetItemRow);
}

async function updateBudgetTotals(
  supabase: SupabaseLike,
  budgetId: string,
  subtotalCost: string,
  finalPrice: string
): Promise<void> {
  const { error } = await supabase
    .from("pme_budgets")
    .update({ subtotal_cost: subtotalCost, final_price: finalPrice })
    .eq("id", budgetId);
  if (error !== null) {
    throw new Error("Could not update budget totals.");
  }
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

function mapComposition(row: SinapiCompositionRow): SinapiCompositionSearchItem {
  return {
    id: row.id,
    versionId: row.version_id,
    stateCode: row.uf,
    uf: row.uf,
    referenceMonth: row.reference_month,
    referenceYear: row.reference_year,
    regime: row.regime,
    code: row.code,
    description: row.description,
    unit: row.unit,
    category: row.category ?? "outro",
    originalUnitCost: String(row.total_cost),
    totalCost: String(row.total_cost),
    laborCost: String(row.labor_cost ?? "0.00"),
    materialCost: String(row.material_cost ?? "0.00"),
    equipmentCost: String(row.equipment_cost ?? "0.00"),
    isActive: row.is_active
  };
}

function normalizeCalculationKind(value: string | null) {
  if (
    value === "material" ||
    value === "mao_de_obra" ||
    value === "servico" ||
    value === "terceiro" ||
    value === "equipamento" ||
    value === "transporte" ||
    value === "descarte" ||
    value === "taxa" ||
    value === "outro"
  ) {
    return value;
  }

  return "outro";
}

function isBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    typeof value.budgetId === "string" &&
    typeof value.compositionId === "string" &&
    typeof value.quantity === "string" &&
    typeof value.adaptedDescription === "string" &&
    typeof value.adaptedUnit === "string" &&
    typeof value.adaptedUnitCost === "string" &&
    typeof value.adaptedUnitPrice === "string" &&
    typeof value.wastePercentage === "string" &&
    typeof value.productivityAdjustmentPercentage === "string" &&
    typeof value.marginPercentage === "string" &&
    !("organizationId" in value) &&
    !("tenantId" in value) &&
    !("userId" in value)
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

function isBudgetItemRow(value: unknown): value is BudgetItemRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    (typeof value.category === "string" || value.category === null) &&
    isStringOrNumber(value.quantity) &&
    isStringOrNumber(value.unit_cost) &&
    isStringOrNumber(value.unit_price)
  );
}

function isCompositionRow(value: unknown): value is SinapiCompositionRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.version_id === "string" &&
    typeof value.uf === "string" &&
    typeof value.reference_month === "number" &&
    typeof value.reference_year === "number" &&
    isRegime(value.regime) &&
    typeof value.code === "string" &&
    typeof value.description === "string" &&
    typeof value.unit === "string" &&
    isStringOrNumber(value.total_cost) &&
    (isStringOrNumber(value.labor_cost) || value.labor_cost === null) &&
    (isStringOrNumber(value.material_cost) || value.material_cost === null) &&
    (isStringOrNumber(value.equipment_cost) || value.equipment_cost === null) &&
    (typeof value.category === "string" || value.category === null) &&
    typeof value.is_active === "boolean"
  );
}

function isIdRow(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === "string";
}

function isRegime(value: unknown): value is SinapiRegime {
  return value === "desonerado" || value === "nao_desonerado";
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
