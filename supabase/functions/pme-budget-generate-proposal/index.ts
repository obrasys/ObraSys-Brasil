import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  budgetId: string;
  format?: "html" | "json";
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
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilderLike;
  insert: (payload: Record<string, unknown>) => QueryBuilderLike;
  maybeSingle: () => Promise<QueryResultLike>;
}

interface BudgetRow {
  id: string;
  organization_id: string;
  budget_number: string;
  title: string;
  client_name: string;
  work_address: string | null;
  description: string | null;
  final_price: string | number;
  valid_until: string | null;
}

interface BudgetItemRow {
  description: string;
  unit: string;
  quantity: string | number;
  unit_price: string | number;
  final_price: string | number;
  show_on_proposal: boolean;
  sort_order: number;
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
    return jsonResponse({ error: "Invalid proposal payload." }, 400);
  }

  const budgetResult = await fetchBudget(auth.supabase, body.budgetId);
  if (!budgetResult.ok) {
    return jsonResponse({ error: budgetResult.error }, 404);
  }

  const allowed = await auth.supabase.rpc("can_manage_budget", {
    target_organization_id: budgetResult.budget.organization_id
  });
  if (allowed.error !== null || allowed.data !== true) {
    return jsonResponse({ error: "User is not allowed to generate budget proposals." }, 403);
  }

  const items = await fetchProposalItems(auth.supabase, budgetResult.budget.id);
  const proposal = buildProposalSnapshot(budgetResult.budget, items);

  await auth.supabase.from("audit_logs").insert({
    organization_id: budgetResult.budget.organization_id,
    actor_user_id: auth.userId,
    action: "pme_budget.proposal_generated",
    entity_table: "pme_budgets",
    entity_id: budgetResult.budget.id,
    metadata: {
      format: body.format ?? "json",
      proposalNumber: budgetResult.budget.budget_number
    }
  });

  if (body.format === "html") {
    return htmlResponse(renderProposalHtml(proposal));
  }

  return jsonResponse(proposal);
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

async function fetchBudget(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<{ ok: true; budget: BudgetRow } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("pme_budgets")
    .select(
      "id,organization_id,budget_number,title,client_name,work_address,description,final_price,valid_until"
    )
    .eq("id", budgetId)
    .maybeSingle();

  if (error !== null || !isBudgetRow(data)) {
    return { ok: false, error: "Budget was not found or is not accessible." };
  }

  return { ok: true, budget: data };
}

async function fetchProposalItems(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<BudgetItemRow[]> {
  const { data, error } = await supabase
    .from("pme_budget_items")
    .select("description,unit,quantity,unit_price,final_price,show_on_proposal,sort_order")
    .eq("budget_id", budgetId)
    .eq("show_on_proposal", "true")
    .order("sort_order", { ascending: true });

  if (error !== null || !Array.isArray(data)) {
    return [];
  }

  return data.filter(isBudgetItemRow);
}

function buildProposalSnapshot(budget: BudgetRow, items: BudgetItemRow[]): Record<string, unknown> {
  return {
    budgetId: budget.id,
    budgetNumber: budget.budget_number,
    title: budget.title,
    clientName: budget.client_name,
    workAddress: budget.work_address,
    description: budget.description,
    validUntil: budget.valid_until,
    totalPrice: budget.final_price,
    items: items.map((item) => ({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.final_price
    })),
    hiddenFields: ["unit_cost", "subtotal_cost", "margin", "profit", "internal_snapshot"],
    generatedAt: new Date().toISOString()
  };
}

function renderProposalHtml(proposal: Record<string, unknown>): string {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>${escapeHtml(String(proposal.title ?? "Proposta"))}</title></head>
<body>
<h1>${escapeHtml(String(proposal.title ?? "Proposta"))}</h1>
<p>Cliente: ${escapeHtml(String(proposal.clientName ?? ""))}</p>
<p>Total: ${escapeHtml(String(proposal.totalPrice ?? "0"))}</p>
</body>
</html>`;
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    !hasForbiddenAuthorizationKeys(value) &&
    typeof value.budgetId === "string" &&
    (typeof value.format === "undefined" || value.format === "html" || value.format === "json")
  );
}

function hasForbiddenAuthorizationKeys(value: Record<string, unknown>): boolean {
  return (
    "organization_id" in value ||
    "organizationId" in value ||
    "tenant_id" in value ||
    "tenantId" in value ||
    "user_id" in value ||
    "userId" in value
  );
}

function isBudgetRow(value: unknown): value is BudgetRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.budget_number === "string" &&
    typeof value.title === "string" &&
    typeof value.client_name === "string"
  );
}

function isBudgetItemRow(value: unknown): value is BudgetItemRow {
  return (
    isRecord(value) &&
    typeof value.description === "string" &&
    typeof value.unit === "string" &&
    typeof value.show_on_proposal === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
