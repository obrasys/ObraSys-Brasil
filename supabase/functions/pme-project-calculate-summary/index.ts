import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  projectId: string;
}

interface SupabaseClientLike {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }> };
  from: (table: string) => QueryBuilderLike;
  rpc: (
    functionName: string,
    args: Record<string, string | string[]>
  ) => Promise<{ data: boolean | null; error: Error | null }>;
}

interface QueryResultLike {
  data: unknown;
  error: Error | null;
}

interface QueryBuilderLike extends PromiseLike<QueryResultLike> {
  select: (columns: string) => QueryBuilderLike;
  eq: (column: string, value: string) => QueryBuilderLike;
  neq: (column: string, value: string) => QueryBuilderLike;
  upsert: (payload: Record<string, unknown>, options?: Record<string, string>) => QueryBuilderLike;
  insert: (payload: Record<string, unknown>) => QueryBuilderLike;
  maybeSingle: () => Promise<QueryResultLike>;
}

interface ProjectRow {
  id: string;
  organization_id: string;
  source_id?: string | null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const auth = await authenticate(request);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const body: unknown = await request.json();
  if (!isRequestBody(body)) {
    return jsonResponse({ error: "Invalid summary payload." }, 400);
  }

  const access = await resolveProjectAccess(auth.supabase, body.projectId);
  if (!access.ok) {
    return jsonResponse({ error: access.error }, access.status);
  }

  const [costForecasts, receivableForecasts, actualCosts, receipts] = await Promise.all([
    selectRows(auth.supabase, "pme_project_cost_forecasts", access.project.id),
    selectRows(auth.supabase, "pme_project_receivable_forecasts", access.project.id),
    selectRows(auth.supabase, "pme_project_actual_costs", access.project.id),
    selectRows(auth.supabase, "pme_project_receipts", access.project.id)
  ]);

  const summary = calculateSummary(costForecasts, receivableForecasts, actualCosts, receipts);

  const { error } = await auth.supabase.from("pme_project_financial_summary").upsert(
    {
      organization_id: access.project.organization_id,
      project_id: access.project.id,
      source_pme_budget_id: access.project.source_id ?? null,
      planned_cost: summary.plannedCost,
      actual_cost: summary.actualCost,
      planned_revenue: summary.plannedRevenue,
      received_revenue: summary.receivedRevenue,
      pending_receivables: summary.pendingReceivables,
      expected_profit: summary.expectedProfit,
      actual_profit: summary.actualProfit,
      profit_variance: summary.profitVariance,
      cost_variance: summary.costVariance,
      last_calculated_at: new Date().toISOString()
    },
    { onConflict: "project_id" }
  );

  if (error !== null) {
    return jsonResponse({ error: "Could not persist financial summary." }, 400);
  }

  await auth.supabase.from("audit_logs").insert({
    organization_id: access.project.organization_id,
    actor_user_id: auth.userId,
    action: "pme_project.financial_summary_calculated",
    entity_table: "projects",
    entity_id: access.project.id,
    metadata: summary
  });

  return jsonResponse(summary);
});

async function authenticate(
  request: Request
): Promise<
  { ok: true; supabase: SupabaseClientLike; userId: string } | { ok: false; error: string }
> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorizationHeader = request.headers.get("authorization");
  if (!supabaseUrl || !supabaseAnonKey || authorizationHeader === null) {
    return { ok: false, error: "Missing authentication configuration." };
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorizationHeader } }
  }) as SupabaseClientLike;
  const { data, error } = await supabase.auth.getUser();
  if (error !== null || data.user === null) {
    return { ok: false, error: "Invalid authentication token." };
  }
  return { ok: true, supabase, userId: data.user.id };
}

async function resolveProjectAccess(
  supabase: SupabaseClientLike,
  projectId: string
): Promise<{ ok: true; project: ProjectRow } | { ok: false; error: string; status: 403 | 404 }> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id,organization_id,source_id")
      .eq("id", projectId)
      .maybeSingle();
    if (error !== null || !isProjectRow(data)) {
      throw new Error("Project was not found or is not accessible.");
    }
    const role = await supabase.rpc("has_organization_role", {
      target_organization_id: data.organization_id,
      allowed_roles: ["owner", "admin", "manager"]
    });
    if (role.error !== null || role.data !== true) {
      throw new Error("User is not allowed to manage this project.");
    }
    return { ok: true, project: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project access failed.";
    return { ok: false, error: message, status: message.includes("not found") ? 404 : 403 };
  }
}

async function selectRows(
  supabase: SupabaseClientLike,
  table: string,
  projectId: string
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(table).select("*").eq("project_id", projectId);
  if (error !== null || !Array.isArray(data)) {
    return [];
  }
  return data.filter(isRecord);
}

function calculateSummary(
  costForecasts: Record<string, unknown>[],
  receivableForecasts: Record<string, unknown>[],
  actualCosts: Record<string, unknown>[],
  receipts: Record<string, unknown>[]
) {
  const plannedCost = sumMoney(
    costForecasts.filter((row) => row.status !== "cancelled").map((row) => row.total_cost)
  );
  const actualCost = sumMoney(
    actualCosts.filter((row) => row.payment_status === "paid").map((row) => row.amount)
  );
  const plannedRevenue = sumMoney(
    receivableForecasts.filter((row) => row.status !== "cancelled").map((row) => row.amount)
  );
  const receivedRevenue = sumMoney(
    receipts.filter((row) => row.receipt_status === "received").map((row) => row.amount)
  );
  const pendingReceivables = sumMoney(
    receivableForecasts
      .filter(
        (row) => row.status === "planned" || row.status === "invoiced" || row.status === "overdue"
      )
      .map((row) => row.amount)
  );
  const expectedProfit = plannedRevenue - plannedCost;
  const actualProfit = receivedRevenue - actualCost;
  return {
    plannedCost: formatMoney(plannedCost),
    actualCost: formatMoney(actualCost),
    plannedRevenue: formatMoney(plannedRevenue),
    receivedRevenue: formatMoney(receivedRevenue),
    pendingReceivables: formatMoney(pendingReceivables),
    expectedProfit: formatSignedMoney(expectedProfit),
    actualProfit: formatSignedMoney(actualProfit),
    profitVariance: formatSignedMoney(actualProfit - expectedProfit),
    costVariance: formatSignedMoney(actualCost - plannedCost)
  };
}

function sumMoney(values: unknown[]): bigint {
  return values.reduce((total, value) => total + parseMoney(String(value ?? "0")), 0n);
}

function parseMoney(value: string): bigint {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) {
    return 0n;
  }
  const negative = value.startsWith("-");
  const normalized = negative ? value.slice(1) : value;
  const [integerPart, decimalPart = ""] = normalized.split(".");
  const cents = BigInt(integerPart + decimalPart.padEnd(2, "0"));
  return negative ? -cents : cents;
}

function formatMoney(cents: bigint): string {
  return formatSignedMoney(cents < 0n ? 0n : cents);
}

function formatSignedMoney(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const reais = absolute / 100n;
  const centavos = absolute % 100n;
  return `${negative ? "-" : ""}${reais}.${centavos.toString().padStart(2, "0")}`;
}

function isRequestBody(value: unknown): value is RequestBody {
  return isRecord(value) && typeof value.projectId === "string";
}

function isProjectRow(value: unknown): value is ProjectRow {
  return (
    isRecord(value) && typeof value.id === "string" && typeof value.organization_id === "string"
  );
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
