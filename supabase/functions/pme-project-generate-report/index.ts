import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  projectId: string;
  reportType: string;
  visibility: "internal" | "client" | "management";
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

interface ProjectRow {
  id: string;
  organization_id: string;
  name?: string;
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
    return jsonResponse({ error: "Invalid report payload." }, 400);
  }
  const access = await resolveProjectAccess(auth.supabase, body.projectId);
  if (!access.ok) {
    return jsonResponse({ error: access.error }, access.status);
  }

  const snapshot =
    body.visibility === "client"
      ? buildClientSnapshot(access.project, body)
      : buildInternalSnapshot(access.project, body);
  const { error } = await auth.supabase.from("pme_project_reports").insert({
    organization_id: access.project.organization_id,
    project_id: access.project.id,
    report_type: body.reportType,
    title: snapshot.title,
    visibility: body.visibility,
    data_snapshot: snapshot,
    generated_by: auth.userId
  });
  if (error !== null) {
    return jsonResponse({ error: "Could not generate report." }, 400);
  }
  await auth.supabase.from("audit_logs").insert({
    organization_id: access.project.organization_id,
    actor_user_id: auth.userId,
    action: "pme_project.report_generated",
    entity_table: "projects",
    entity_id: access.project.id,
    metadata: { reportType: body.reportType, visibility: body.visibility }
  });
  return jsonResponse(snapshot);
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

async function resolveProjectAccess(
  supabase: SupabaseClientLike,
  projectId: string
): Promise<{ ok: true; project: ProjectRow } | { ok: false; error: string; status: 403 | 404 }> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,organization_id,name")
    .eq("id", projectId)
    .maybeSingle();
  if (error !== null || !isProjectRow(data)) {
    return { ok: false, error: "Project was not found or is not accessible.", status: 404 };
  }
  const role = await supabase.rpc("has_organization_role", {
    target_organization_id: data.organization_id,
    allowed_roles: ["owner", "admin", "manager"]
  });
  if (role.error !== null || role.data !== true) {
    return { ok: false, error: "User is not allowed to generate reports.", status: 403 };
  }
  return { ok: true, project: data };
}

function buildInternalSnapshot(project: ProjectRow, body: RequestBody): Record<string, unknown> {
  return {
    title: "Relatorio interno da obra",
    reportType: body.reportType,
    visibility: body.visibility,
    project: { id: project.id, name: project.name },
    financial: { includeInternalCosts: true, includeProfit: true },
    generatedAt: new Date().toISOString()
  };
}

function buildClientSnapshot(project: ProjectRow, body: RequestBody): Record<string, unknown> {
  return {
    title: "Relatorio para cliente",
    reportType: body.reportType,
    visibility: "client",
    project: { id: project.id, name: project.name },
    financial: {},
    hiddenFields: ["actual_cost", "planned_cost", "margin", "profit", "supplier_names"],
    generatedAt: new Date().toISOString()
  };
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    !hasForbiddenAuthorizationKeys(value) &&
    typeof value.projectId === "string" &&
    typeof value.reportType === "string" &&
    (value.visibility === "internal" ||
      value.visibility === "client" ||
      value.visibility === "management")
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

function isProjectRow(value: unknown): value is ProjectRow {
  return (
    isRecord(value) && typeof value.id === "string" && typeof value.organization_id === "string"
  );
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
