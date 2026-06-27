import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  quoteId: string;
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
  neq: (column: string, value: string) => QueryBuilderLike;
  update: (payload: Record<string, unknown>) => QueryBuilderLike;
  insert: (payload: Record<string, unknown>) => QueryBuilderLike;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
}

interface QuoteRow {
  id: string;
  organization_id: string;
  project_id: string;
  purchase_request_id: string | null;
  status: string;
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
    return jsonResponse({ error: "Invalid quote selection payload." }, 400);
  }

  const quote = await fetchQuote(auth.supabase, body.quoteId);
  if (!quote.ok) {
    return jsonResponse({ error: quote.error }, 404);
  }
  const role = await assertManager(auth.supabase, quote.row.organization_id);
  if (!role.ok) {
    return jsonResponse({ error: role.error }, 403);
  }

  await auth.supabase
    .from("pme_supplier_quotes")
    .update({ status: "rejected" })
    .eq("organization_id", quote.row.organization_id)
    .eq("purchase_request_id", quote.row.purchase_request_id ?? "")
    .neq("id", quote.row.id);
  await auth.supabase
    .from("pme_supplier_quotes")
    .update({ status: "selected" })
    .eq("id", quote.row.id);
  await auth.supabase.from("pme_purchase_status_history").insert({
    organization_id: quote.row.organization_id,
    project_id: quote.row.project_id,
    entity_type: "supplier_quote",
    entity_id: quote.row.id,
    old_status: quote.row.status,
    new_status: "selected",
    changed_by: auth.userId
  });
  await auth.supabase.from("audit_logs").insert({
    organization_id: quote.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_purchase.quote_selected",
    entity_table: "pme_supplier_quotes",
    entity_id: quote.row.id,
    metadata: { purchase_request_id: quote.row.purchase_request_id }
  });

  return jsonResponse({ id: quote.row.id, status: "selected" });
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

async function fetchQuote(
  supabase: SupabaseClientLike,
  quoteId: string
): Promise<{ ok: true; row: QuoteRow } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("pme_supplier_quotes")
    .select("id,organization_id,project_id,purchase_request_id,status")
    .eq("id", quoteId)
    .maybeSingle();
  if (error !== null || !isQuoteRow(data)) {
    return { ok: false, error: "Quote was not found or is not accessible." };
  }
  return { ok: true, row: data };
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
  return isRecord(value) && typeof value.quoteId === "string";
}

function isQuoteRow(value: unknown): value is QuoteRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.project_id === "string" &&
    (typeof value.purchase_request_id === "string" || value.purchase_request_id === null) &&
    typeof value.status === "string"
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
