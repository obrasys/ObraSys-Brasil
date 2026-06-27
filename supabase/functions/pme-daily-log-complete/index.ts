import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  dailyLogId: string;
  completionNotes?: string;
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

interface DailyLogRow {
  id: string;
  organization_id: string;
  project_id: string;
  status: string;
  log_date: string;
  work_performed: string;
  labor_count: number | null;
  weather_source: string | null;
  created_by: string;
}

Deno.serve(async (request) => {
  const auth = await authenticate(request);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, 401);
  }
  const body: unknown = await request.json();
  if (!isRequestBody(body)) {
    return jsonResponse({ error: "Invalid completion payload." }, 400);
  }
  const dailyLog = await fetchDailyLog(auth.supabase, body.dailyLogId);
  if (!dailyLog.ok) {
    return jsonResponse({ error: dailyLog.error }, 404);
  }
  if (dailyLog.row.status === "locked") {
    return jsonResponse({ error: "Locked daily logs cannot be edited." }, 400);
  }
  const allowed = await assertManager(auth.supabase, dailyLog.row.organization_id);
  if (!allowed.ok) {
    return jsonResponse({ error: allowed.error }, 403);
  }
  const missing = validateCompletion(dailyLog.row);
  if (missing.length > 0) {
    return jsonResponse({ error: "Daily log is missing required fields.", missing }, 400);
  }
  const completedAt = new Date().toISOString();
  const { data, error } = await auth.supabase
    .from("pme_project_daily_logs")
    .update({
      status: "completed",
      completed_by: auth.userId,
      completed_at: completedAt,
      completion_notes: body.completionNotes ?? null
    })
    .eq("id", dailyLog.row.id)
    .select("id")
    .single();
  if (error !== null || !isIdRow(data)) {
    return jsonResponse({ error: "Could not complete daily log." }, 400);
  }
  await auth.supabase.from("audit_logs").insert({
    organization_id: dailyLog.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_daily_log.completed",
    entity_table: "pme_project_daily_logs",
    entity_id: dailyLog.row.id,
    metadata: { completed_at: completedAt }
  });
  return jsonResponse({ id: data.id, status: "completed" });
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

async function fetchDailyLog(
  supabase: SupabaseClientLike,
  dailyLogId: string
): Promise<{ ok: true; row: DailyLogRow } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("pme_project_daily_logs")
    .select(
      "id,organization_id,project_id,status,log_date,work_performed,labor_count,weather_source,created_by"
    )
    .eq("id", dailyLogId)
    .maybeSingle();
  return error === null && isDailyLogRow(data)
    ? { ok: true, row: data }
    : { ok: false, error: "Daily log was not found or is not accessible." };
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
    : { ok: false, error: "User is not allowed to complete this daily log." };
}

function validateCompletion(row: DailyLogRow): string[] {
  const missing: string[] = [];
  if (!row.log_date) missing.push("log_date");
  if (!row.work_performed) missing.push("work_performed_or_activity");
  if ((row.labor_count ?? 0) <= 0) missing.push("labor");
  if (!row.weather_source) missing.push("weather");
  if (!row.created_by) missing.push("created_by");
  return missing;
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
    typeof value.status === "string" &&
    typeof value.log_date === "string" &&
    typeof value.work_performed === "string" &&
    (typeof value.labor_count === "number" || value.labor_count === null) &&
    (typeof value.weather_source === "string" || value.weather_source === null) &&
    typeof value.created_by === "string"
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
