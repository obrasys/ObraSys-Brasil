import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  dailyLogId: string;
  manualSummary?: string;
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
  update: (payload: Record<string, unknown>) => QueryBuilderLike;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
  single: () => Promise<{ data: unknown; error: Error | null }>;
}

interface DailyLogRow {
  id: string;
  organization_id: string;
  project_id: string;
  log_date: string;
}

Deno.serve(async (request) => {
  const auth = await authenticate(request);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, 401);
  }
  const body: unknown = await request.json();
  if (!isRequestBody(body)) {
    return jsonResponse({ error: "Invalid weather payload." }, 400);
  }
  const dailyLog = await fetchDailyLog(auth.supabase, body.dailyLogId);
  if (!dailyLog.ok) {
    return jsonResponse({ error: dailyLog.error }, 404);
  }
  const source = Deno.env.get("WEATHER_API_KEY") ? "automatic" : "manual";
  const summary =
    source === "automatic"
      ? "Clima automatico consultado."
      : (body.manualSummary ?? "Clima manual pendente.");
  const { data, error } = await auth.supabase
    .from("pme_project_daily_log_weather")
    .insert({
      organization_id: dailyLog.row.organization_id,
      project_id: dailyLog.row.project_id,
      daily_log_id: dailyLog.row.id,
      weather_date: dailyLog.row.log_date,
      source,
      morning_condition: summary,
      raw_weather_data: source === "automatic" ? { provider: "configured" } : null
    })
    .select("id")
    .single();
  if (error !== null || !isIdRow(data)) {
    return jsonResponse({ error: "Could not save weather." }, 400);
  }
  await auth.supabase
    .from("pme_project_daily_logs")
    .update({ weather_source: source, weather_summary: summary })
    .eq("id", dailyLog.row.id);
  return jsonResponse({ id: data.id, source, summary });
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
    .select("id,organization_id,project_id,log_date")
    .eq("id", dailyLogId)
    .maybeSingle();
  return error === null && isDailyLogRow(data)
    ? { ok: true, row: data }
    : { ok: false, error: "Daily log was not found or is not accessible." };
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) && !hasForbiddenAuthorizationKeys(value) && typeof value.dailyLogId === "string"
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

function isDailyLogRow(value: unknown): value is DailyLogRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.project_id === "string" &&
    typeof value.log_date === "string"
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
