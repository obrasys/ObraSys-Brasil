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
  in: (column: string, values: string[]) => QueryBuilderLike;
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
    return jsonResponse({ error: "Invalid closeout payload." }, 400);
  }

  const access = await resolveProjectAccess(auth.supabase, body.projectId);
  if (!access.ok) {
    return jsonResponse({ error: access.error }, access.status);
  }

  const [forecasts, receivables, actualCosts, receipts, tasks, purchases] = await Promise.all([
    selectRows(auth.supabase, "pme_project_cost_forecasts", access.project.id),
    selectRows(auth.supabase, "pme_project_receivable_forecasts", access.project.id),
    selectRows(auth.supabase, "pme_project_actual_costs", access.project.id),
    selectRows(auth.supabase, "pme_project_receipts", access.project.id),
    selectRows(auth.supabase, "pme_project_tasks", access.project.id),
    selectRows(auth.supabase, "pme_project_purchases", access.project.id)
  ]);

  const closeout = calculateCloseout(
    forecasts,
    receivables,
    actualCosts,
    receipts,
    tasks,
    purchases
  );
  const { error } = await auth.supabase.from("pme_project_closeouts").upsert(
    {
      organization_id: access.project.organization_id,
      project_id: access.project.id,
      source_pme_budget_id: access.project.source_id ?? null,
      status: "draft",
      planned_cost: closeout.plannedCost,
      actual_cost: closeout.actualCost,
      planned_revenue: closeout.plannedRevenue,
      received_revenue: closeout.receivedRevenue,
      pending_receivables: closeout.pendingReceivables,
      expected_profit: closeout.expectedProfit,
      actual_profit: closeout.actualProfit,
      profit_variance: closeout.profitVariance,
      cost_variance: closeout.costVariance,
      progress_percentage: closeout.progressPercentage,
      completed_tasks_count: closeout.completedTasksCount,
      pending_tasks_count: closeout.pendingTasksCount,
      open_purchases_count: closeout.openPurchasesCount,
      unpaid_costs_count: closeout.unpaidCostsCount,
      overdue_receipts_count: closeout.overdueReceiptsCount
    },
    { onConflict: "organization_id,project_id" }
  );

  if (error !== null) {
    return jsonResponse({ error: "Could not persist project closeout." }, 400);
  }

  await auth.supabase.from("audit_logs").insert({
    organization_id: access.project.organization_id,
    actor_user_id: auth.userId,
    action: "pme_project.closeout_calculated",
    entity_table: "projects",
    entity_id: access.project.id,
    metadata: closeout
  });

  return jsonResponse(closeout);
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
  const { data, error } = await supabase
    .from("projects")
    .select("id,organization_id,source_id")
    .eq("id", projectId)
    .maybeSingle();
  if (error !== null || !isProjectRow(data)) {
    return { ok: false, error: "Project was not found or is not accessible.", status: 404 };
  }
  const role = await supabase.rpc("has_organization_role", {
    target_organization_id: data.organization_id,
    allowed_roles: ["owner", "admin", "manager"]
  });
  if (role.error !== null || role.data !== true) {
    return { ok: false, error: "User is not allowed to manage this project.", status: 403 };
  }
  return { ok: true, project: data };
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

function calculateCloseout(
  forecasts: Record<string, unknown>[],
  receivables: Record<string, unknown>[],
  actualCosts: Record<string, unknown>[],
  receipts: Record<string, unknown>[],
  tasks: Record<string, unknown>[],
  purchases: Record<string, unknown>[]
) {
  const plannedCost = sumMoney(
    forecasts.filter((row) => row.status !== "cancelled").map((row) => row.total_cost)
  );
  const actualCost = sumMoney(
    actualCosts.filter((row) => row.payment_status === "paid").map((row) => row.amount)
  );
  const plannedRevenue = sumMoney(
    receivables.filter((row) => row.status !== "cancelled").map((row) => row.amount)
  );
  const receivedRevenue = sumMoney(
    receipts.filter((row) => row.receipt_status === "received").map((row) => row.amount)
  );
  const pendingReceivables = sumMoney(
    receivables
      .filter(
        (row) => row.status === "planned" || row.status === "invoiced" || row.status === "overdue"
      )
      .map((row) => row.amount)
  );
  const expectedProfit = plannedRevenue - plannedCost;
  const actualProfit = receivedRevenue - actualCost;
  const completedTasksCount = tasks.filter((row) => row.status === "done").length;
  const pendingTasksCount = tasks.filter(
    (row) => row.status === "todo" || row.status === "in_progress" || row.status === "blocked"
  ).length;
  return {
    plannedCost: formatMoney(plannedCost),
    actualCost: formatMoney(actualCost),
    plannedRevenue: formatMoney(plannedRevenue),
    receivedRevenue: formatMoney(receivedRevenue),
    pendingReceivables: formatMoney(pendingReceivables),
    expectedProfit: formatSignedMoney(expectedProfit),
    actualProfit: formatSignedMoney(actualProfit),
    profitVariance: formatSignedMoney(actualProfit - expectedProfit),
    costVariance: formatSignedMoney(actualCost - plannedCost),
    progressPercentage:
      tasks.length === 0 ? "0.00" : ((completedTasksCount / tasks.length) * 100).toFixed(2),
    completedTasksCount,
    pendingTasksCount,
    openPurchasesCount: purchases.filter(
      (row) => row.status !== "delivered" && row.status !== "cancelled"
    ).length,
    unpaidCostsCount: actualCosts.filter((row) => row.payment_status === "pending").length,
    overdueReceiptsCount: receivables.filter((row) => row.status === "overdue").length
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
  return `${negative ? "-" : ""}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
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
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
