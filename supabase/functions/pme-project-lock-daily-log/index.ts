import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  dailyLogId: string;
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
  single: () => Promise<{ data: unknown; error: Error | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
}

interface DailyLogRow {
  id: string;
  organization_id: string;
  project_id: string;
  status: "draft" | "completed" | "locked";
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
    return jsonResponse({ error: "Invalid daily log payload." }, 400);
  }

  const dailyLog = await fetchDailyLog(auth.supabase, body.dailyLogId);
  if (!dailyLog.ok) {
    return jsonResponse({ error: dailyLog.error }, dailyLog.status);
  }

  const allowed = await assertManager(auth.supabase, dailyLog.row.organization_id);
  if (!allowed.ok) {
    return jsonResponse({ error: allowed.error }, 403);
  }

  if (dailyLog.row.status === "locked") {
    return jsonResponse({ error: "Daily log is already locked." }, 400);
  }

  const { data, error } = await auth.supabase
    .from("pme_project_daily_logs")
    .update({ status: "locked" })
    .eq("id", dailyLog.row.id)
    .select("id")
    .single();

  if (error !== null || !isIdRow(data)) {
    return jsonResponse({ error: "Could not lock daily log." }, 400);
  }

  await auth.supabase.from("audit_logs").insert({
    organization_id: dailyLog.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_project.daily_log_locked",
    entity_table: "pme_project_daily_logs",
    entity_id: dailyLog.row.id,
    metadata: { project_id: dailyLog.row.project_id }
  });

  return jsonResponse({ id: dailyLog.row.id, status: "locked" });
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

async function fetchDailyLog(
  supabase: SupabaseClientLike,
  dailyLogId: string
): Promise<{ ok: true; row: DailyLogRow } | { ok: false; error: string; status: 404 }> {
  const { data, error } = await supabase
    .from("pme_project_daily_logs")
    .select("id,organization_id,project_id,status")
    .eq("id", dailyLogId)
    .maybeSingle();
  if (error !== null || !isDailyLogRow(data)) {
    return { ok: false, error: "Daily log was not found or is not accessible.", status: 404 };
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
  if (error !== null || data !== true) {
    return { ok: false, error: "User is not allowed to lock this daily log." };
  }
  return { ok: true };
}

function isRequestBody(value: unknown): value is RequestBody {
  return isRecord(value) && typeof value.dailyLogId === "string";
}

function isDailyLogRow(value: unknown): value is DailyLogRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.project_id === "string" &&
    (value.status === "draft" || value.status === "completed" || value.status === "locked")
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
