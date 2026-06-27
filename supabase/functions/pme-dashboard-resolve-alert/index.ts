import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  alertId: string;
  status: "acknowledged" | "resolved" | "archived";
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
  update: (payload: Record<string, unknown>) => QueryBuilderLike;
  insert: (payload: Record<string, unknown>) => QueryBuilderLike;
  maybeSingle: () => Promise<QueryResultLike>;
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
    return jsonResponse({ error: "Invalid alert update payload." }, 400);
  }
  const alert = await resolveAlertAccess(auth.supabase, body.alertId);
  if (!alert.ok) {
    return jsonResponse({ error: alert.error }, alert.status);
  }
  const resolvedAt =
    body.status === "resolved" || body.status === "archived" ? new Date().toISOString() : null;
  await auth.supabase
    .from("pme_dashboard_alerts")
    .update({ status: body.status, resolved_by: auth.userId, resolved_at: resolvedAt })
    .eq("id", body.alertId);
  await auth.supabase.from("audit_logs").insert({
    organization_id: alert.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_dashboard.alert_resolved",
    entity_table: "pme_dashboard_alerts",
    entity_id: body.alertId,
    metadata: { status: body.status }
  });
  return jsonResponse({ id: body.alertId, status: body.status });
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

async function resolveAlertAccess(
  supabase: SupabaseClientLike,
  alertId: string
): Promise<
  { ok: true; row: Record<string, string> } | { ok: false; error: string; status: 403 | 404 }
> {
  const { data, error } = await supabase
    .from("pme_dashboard_alerts")
    .select("id,organization_id")
    .eq("id", alertId)
    .maybeSingle();
  if (error !== null || !isAlertRow(data)) {
    return { ok: false, error: "Alert was not found or is not accessible.", status: 404 };
  }
  const role = await supabase.rpc("has_organization_role", {
    target_organization_id: data.organization_id,
    allowed_roles: ["owner", "admin", "manager"]
  });
  if (role.error !== null || role.data !== true) {
    return { ok: false, error: "User is not allowed to resolve this alert.", status: 403 };
  }
  return { ok: true, row: data };
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    typeof value.alertId === "string" &&
    (value.status === "acknowledged" || value.status === "resolved" || value.status === "archived")
  );
}

function isAlertRow(value: unknown): value is Record<string, string> {
  return isRecord(value) && typeof value.organization_id === "string";
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
