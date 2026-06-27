import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  dailyLogId: string;
  exportType: "html" | "pdf" | "print_view";
}

interface SupabaseClientLike {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }> };
  from: (table: string) => QueryBuilderLike;
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
  log_date: string;
  status: string;
  work_performed: string;
  weather_summary: string | null;
}

Deno.serve(async (request) => {
  const auth = await authenticate(request);
  if (!auth.ok) return jsonResponse({ error: auth.error }, 401);
  const body: unknown = await request.json();
  if (!isRequestBody(body)) return jsonResponse({ error: "Invalid export payload." }, 400);
  const dailyLog = await fetchDailyLog(auth.supabase, body.dailyLogId);
  if (!dailyLog.ok) return jsonResponse({ error: dailyLog.error }, 404);
  const html = generateHtml(dailyLog.row);
  const { data, error } = await auth.supabase
    .from("pme_project_daily_log_exports")
    .insert({
      organization_id: dailyLog.row.organization_id,
      project_id: dailyLog.row.project_id,
      daily_log_id: dailyLog.row.id,
      export_type: body.exportType,
      html_snapshot: html,
      generated_by: auth.userId
    })
    .select("id")
    .single();
  if (error !== null || !isIdRow(data))
    return jsonResponse({ error: "Could not export daily log." }, 400);
  await auth.supabase
    .from("pme_project_daily_logs")
    .update({ report_html_snapshot: html })
    .eq("id", dailyLog.row.id);
  await auth.supabase.from("audit_logs").insert({
    organization_id: dailyLog.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_daily_log.exported",
    entity_table: "pme_project_daily_log_exports",
    entity_id: data.id,
    metadata: { daily_log_id: dailyLog.row.id, export_type: body.exportType }
  });
  return jsonResponse({ id: data.id, html });
});

async function authenticate(
  request: Request
): Promise<
  { ok: true; supabase: SupabaseClientLike; userId: string } | { ok: false; error: string }
> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("authorization");
  if (!url || !key || authorization === null)
    return { ok: false, error: "Missing authentication configuration." };
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
    .select("id,organization_id,project_id,log_date,status,work_performed,weather_summary")
    .eq("id", dailyLogId)
    .maybeSingle();
  return error === null && isDailyLogRow(data)
    ? { ok: true, row: data }
    : { ok: false, error: "Daily log was not found or is not accessible." };
}

function generateHtml(row: DailyLogRow): string {
  return `<!doctype html><html lang="pt-BR"><body><h1>Diario de Obra</h1><p>Gerado pelo Obra Sys Brasil</p><p>Data: ${row.log_date}</p><p>Status: ${row.status}</p><p>Clima: ${row.weather_summary ?? "Nao informado"}</p><p>Atividades: ${row.work_performed}</p></body></html>`;
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    typeof value.dailyLogId === "string" &&
    (value.exportType === "html" || value.exportType === "pdf" || value.exportType === "print_view")
  );
}

function isDailyLogRow(value: unknown): value is DailyLogRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.project_id === "string" &&
    typeof value.log_date === "string" &&
    typeof value.status === "string" &&
    typeof value.work_performed === "string" &&
    (typeof value.weather_summary === "string" || value.weather_summary === null)
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
