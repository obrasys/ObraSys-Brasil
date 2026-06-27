import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  quoteId?: string;
  projectId?: string;
  supplierNameSnapshot?: string;
  title?: string;
  orderNumber?: string;
  totalAmount?: string;
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
  insert: (payload: Record<string, unknown>) => QueryBuilderLike;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
  single: () => Promise<{ data: unknown; error: Error | null }>;
}

interface SourceRow {
  id: string;
  organization_id: string;
  project_id: string;
  purchase_request_id?: string | null;
  supplier_id?: string | null;
  supplier_name_snapshot?: string;
  final_amount?: string;
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
    return jsonResponse({ error: "Invalid order payload." }, 400);
  }

  const source = await resolveSource(auth.supabase, body);
  if (!source.ok) {
    return jsonResponse({ error: source.error }, source.status);
  }
  const role = await assertManager(auth.supabase, source.row.organization_id);
  if (!role.ok) {
    return jsonResponse({ error: role.error }, 403);
  }

  const { data, error } = await auth.supabase
    .from("pme_purchase_orders")
    .insert({
      organization_id: source.row.organization_id,
      project_id: source.row.project_id,
      purchase_request_id: source.row.purchase_request_id ?? null,
      supplier_quote_id: body.quoteId ?? null,
      supplier_id: source.row.supplier_id ?? null,
      supplier_name_snapshot:
        source.row.supplier_name_snapshot ??
        body.supplierNameSnapshot ??
        "Fornecedor nao informado",
      order_number: body.orderNumber ?? `PC-${Date.now()}`,
      title: body.title ?? "Compra PME",
      status: "draft",
      subtotal_amount: source.row.final_amount ?? body.totalAmount ?? "0.00",
      total_amount: source.row.final_amount ?? body.totalAmount ?? "0.00",
      created_by: auth.userId
    })
    .select("id")
    .single();

  if (error !== null || !isIdRow(data)) {
    return jsonResponse({ error: "Could not create purchase order." }, 400);
  }
  await auth.supabase.from("audit_logs").insert({
    organization_id: source.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_purchase.order_created",
    entity_table: "pme_purchase_orders",
    entity_id: data.id,
    metadata: { supplier_quote_id: body.quoteId ?? null }
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
  if (error !== null || data.user === null) {
    return { ok: false, error: "Invalid authentication token." };
  }
  return { ok: true, supabase, userId: data.user.id };
}

async function resolveSource(
  supabase: SupabaseClientLike,
  body: RequestBody
): Promise<{ ok: true; row: SourceRow } | { ok: false; error: string; status: 400 | 404 }> {
  if (body.quoteId) {
    const { data, error } = await supabase
      .from("pme_supplier_quotes")
      .select(
        "id,organization_id,project_id,purchase_request_id,supplier_id,supplier_name_snapshot,final_amount"
      )
      .eq("id", body.quoteId)
      .maybeSingle();
    return error === null && isSourceRow(data)
      ? { ok: true, row: data }
      : { ok: false, error: "Quote was not found or is not accessible.", status: 404 };
  }
  if (!body.projectId) {
    return { ok: false, error: "Manual order requires projectId.", status: 400 };
  }
  const { data, error } = await supabase
    .from("projects")
    .select("id,organization_id")
    .eq("id", body.projectId)
    .maybeSingle();
  return error === null && isProjectRow(data)
    ? { ok: true, row: { id: data.id, organization_id: data.organization_id, project_id: data.id } }
    : { ok: false, error: "Project was not found or is not accessible.", status: 404 };
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
  return (
    isRecord(value) &&
    (typeof value.quoteId === "string" || typeof value.projectId === "string") &&
    !("organization_id" in value) &&
    !("organizationId" in value) &&
    !("tenant_id" in value) &&
    !("tenantId" in value) &&
    !("user_id" in value) &&
    !("userId" in value)
  );
}

function isSourceRow(value: unknown): value is SourceRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.project_id === "string"
  );
}

function isProjectRow(value: unknown): value is { id: string; organization_id: string } {
  return (
    isRecord(value) && typeof value.id === "string" && typeof value.organization_id === "string"
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
