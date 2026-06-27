import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  projectId: string;
  reportId: string;
  exportType: "html" | "pdf" | "print_view";
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
    return jsonResponse({ error: "Invalid export payload." }, 400);
  }
  const report = await resolveReportAccess(auth.supabase, body.projectId, body.reportId);
  if (!report.ok) {
    return jsonResponse({ error: report.error }, report.status);
  }
  const html = `<!doctype html><html lang="pt-BR"><body><h1>${escapeHtml(String(report.row.title))}</h1><p>Relatorio gerado pelo Obra Sys Brasil</p></body></html>`;
  const { error } = await auth.supabase.from("pme_project_report_exports").insert({
    organization_id: report.row.organization_id,
    project_id: body.projectId,
    report_id: body.reportId,
    export_type: body.exportType,
    html_snapshot: html,
    generated_by: auth.userId
  });
  if (error !== null) {
    return jsonResponse({ error: "Could not export report." }, 400);
  }
  await auth.supabase.from("audit_logs").insert({
    organization_id: report.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_project.report_exported",
    entity_table: "pme_project_reports",
    entity_id: body.reportId,
    metadata: { exportType: body.exportType }
  });
  return jsonResponse({ htmlSnapshot: html });
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

async function resolveReportAccess(
  supabase: SupabaseClientLike,
  projectId: string,
  reportId: string
): Promise<
  { ok: true; row: Record<string, unknown> } | { ok: false; error: string; status: 403 | 404 }
> {
  const { data, error } = await supabase
    .from("pme_project_reports")
    .select("id,organization_id,project_id,title")
    .eq("id", reportId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error !== null || !isRecord(data) || typeof data.organization_id !== "string") {
    return { ok: false, error: "Report was not found or is not accessible.", status: 404 };
  }
  const role = await supabase.rpc("has_organization_role", {
    target_organization_id: data.organization_id,
    allowed_roles: ["owner", "admin", "manager"]
  });
  if (role.error !== null || role.data !== true) {
    return { ok: false, error: "User is not allowed to export reports.", status: 403 };
  }
  return { ok: true, row: data };
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    typeof value.projectId === "string" &&
    typeof value.reportId === "string" &&
    (value.exportType === "html" || value.exportType === "pdf" || value.exportType === "print_view")
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
    headers: { "content-type": "application/json" }
  });
}
