import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  purchaseOrderId: string;
  confirmedDuplicate?: boolean;
}

interface SupabaseClientLike {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }> };
  from: (table: string) => QueryBuilderLike;
  rpc: (
    functionName: string,
    args: Record<string, string | string[]>
  ) => Promise<{ data: boolean | null; error: Error | null }>;
}

interface QueryBuilderLike {
  select: (columns: string) => QueryBuilderLike;
  eq: (column: string, value: string) => QueryBuilderLike;
  update: (payload: Record<string, unknown>) => QueryBuilderLike;
  insert: (payload: Record<string, unknown>) => QueryBuilderLike;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
  single: () => Promise<{ data: unknown; error: Error | null }>;
}

interface OrderRow {
  id: string;
  organization_id: string;
  project_id: string;
  supplier_name_snapshot: string;
  status: string;
  payment_status: string;
  paid_at: string | null;
  total_amount: string;
  actual_cost_id: string | null;
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
    return jsonResponse({ error: "Invalid actual cost payload." }, 400);
  }
  const order = await fetchOrder(auth.supabase, body.purchaseOrderId);
  if (!order.ok) {
    return jsonResponse({ error: order.error }, 404);
  }
  if (order.row.status === "cancelled") {
    return jsonResponse({ error: "Cancelled purchase orders cannot generate actual costs." }, 400);
  }
  if (order.row.actual_cost_id && body.confirmedDuplicate !== true) {
    return jsonResponse({ error: "Purchase order already has an actual cost." }, 409);
  }
  const role = await assertManager(auth.supabase, order.row.organization_id);
  if (!role.ok) {
    return jsonResponse({ error: role.error }, 403);
  }
  const { data, error } = await auth.supabase
    .from("pme_project_actual_costs")
    .insert({
      organization_id: order.row.organization_id,
      project_id: order.row.project_id,
      purchase_id: null,
      cost_type: "material",
      description: `Compra ${order.row.supplier_name_snapshot}`,
      amount: order.row.total_amount,
      payment_status: order.row.payment_status === "paid" ? "paid" : "pending",
      payment_date: order.row.payment_status === "paid" ? order.row.paid_at : null,
      supplier_name: order.row.supplier_name_snapshot,
      created_by: auth.userId
    })
    .select("id")
    .single();
  if (error !== null || !isIdRow(data)) {
    return jsonResponse({ error: "Could not create actual cost." }, 400);
  }
  await auth.supabase
    .from("pme_purchase_orders")
    .update({ actual_cost_id: data.id })
    .eq("id", order.row.id);
  await auth.supabase.from("audit_logs").insert({
    organization_id: order.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_purchase.actual_cost_created",
    entity_table: "pme_project_actual_costs",
    entity_id: data.id,
    metadata: { purchase_order_id: order.row.id }
  });
  return jsonResponse({ id: data.id });
});

async function authenticate(
  request: Request
): Promise<
  { ok: true; supabase: SupabaseClientLike; userId: string } | { ok: false; error: string }
> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("authorization");
  if (!url || !key || authorization === null) {
    return { ok: false, error: "Missing authentication configuration." };
  }
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: authorization } }
  }) as SupabaseClientLike;
  const { data, error } = await supabase.auth.getUser();
  return error === null && data.user !== null
    ? { ok: true, supabase, userId: data.user.id }
    : { ok: false, error: "Invalid authentication token." };
}

async function fetchOrder(
  supabase: SupabaseClientLike,
  orderId: string
): Promise<{ ok: true; row: OrderRow } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("pme_purchase_orders")
    .select(
      "id,organization_id,project_id,supplier_name_snapshot,status,payment_status,paid_at,total_amount,actual_cost_id"
    )
    .eq("id", orderId)
    .maybeSingle();
  return error === null && isOrderRow(data)
    ? { ok: true, row: data }
    : { ok: false, error: "Purchase order was not found or is not accessible." };
}

async function assertManager(
  supabase: SupabaseClientLike,
  organizationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("has_organization_role", {
    target_organization_id: organizationId,
    allowed_roles: ["owner", "admin", "manager"]
  });
  return error === null && data === true
    ? { ok: true }
    : { ok: false, error: "User is not allowed to manage purchases." };
}

function isRequestBody(value: unknown): value is RequestBody {
  return isRecord(value) && typeof value.purchaseOrderId === "string";
}

function isOrderRow(value: unknown): value is OrderRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.project_id === "string" &&
    typeof value.supplier_name_snapshot === "string" &&
    typeof value.status === "string" &&
    typeof value.payment_status === "string" &&
    typeof value.total_amount === "string" &&
    (typeof value.paid_at === "string" || value.paid_at === null) &&
    (typeof value.actual_cost_id === "string" || value.actual_cost_id === null)
  );
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
