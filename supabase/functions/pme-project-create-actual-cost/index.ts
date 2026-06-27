import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  projectId: string;
  costType: string;
  description: string;
  amount: string;
  paymentStatus: "pending" | "paid" | "cancelled";
  paymentDate?: string;
  supplierName?: string;
  notes?: string;
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
  single: () => Promise<{ data: unknown; error: Error | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
}

interface ProjectRow {
  id: string;
  organization_id: string;
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

  const access = await resolveProjectAccess(auth.supabase, body.projectId);
  if (!access.ok) {
    return jsonResponse({ error: access.error }, access.status);
  }

  const { data, error } = await auth.supabase
    .from("pme_project_actual_costs")
    .insert({
      organization_id: access.project.organization_id,
      project_id: access.project.id,
      cost_type: body.costType,
      description: body.description,
      amount: body.amount,
      payment_status: body.paymentStatus,
      payment_date: body.paymentDate ?? null,
      supplier_name: body.supplierName ?? null,
      notes: body.notes ?? null,
      created_by: auth.userId
    })
    .select("id")
    .single();

  if (error !== null || !isIdRow(data)) {
    return jsonResponse({ error: "Could not create actual cost." }, 400);
  }

  await createAuditLog(
    auth.supabase,
    access.project.organization_id,
    auth.userId,
    "pme_project.actual_cost_created",
    data.id
  );
  return jsonResponse({ id: data.id });
});

async function resolveProjectAccess(
  supabase: SupabaseClientLike,
  projectId: string
): Promise<{ ok: true; project: ProjectRow } | { ok: false; error: string; status: 403 | 404 }> {
  try {
    const project = await fetchProject(supabase, projectId);
    await assertManager(supabase, project.organization_id);
    return { ok: true, project };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project access failed.";
    return {
      ok: false,
      error: message,
      status: message.includes("not found") ? 404 : 403
    };
  }
}

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

async function fetchProject(supabase: SupabaseClientLike, projectId: string): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (error !== null || !isProjectRow(data)) {
    throw new Error("Project was not found or is not accessible.");
  }
  return data;
}

async function assertManager(supabase: SupabaseClientLike, organizationId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_organization_role", {
    target_organization_id: organizationId,
    allowed_roles: ["owner", "admin", "manager"]
  });
  if (error !== null || data !== true) {
    throw new Error("User is not allowed to manage this project.");
  }
}

async function createAuditLog(
  supabase: SupabaseClientLike,
  organizationId: string,
  userId: string,
  action: string,
  entityId: string
): Promise<void> {
  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: userId,
    action,
    entity_table: "pme_project_actual_costs",
    entity_id: entityId,
    metadata: {}
  });
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    typeof value.projectId === "string" &&
    typeof value.costType === "string" &&
    typeof value.description === "string" &&
    /^\d+(\.\d{1,2})?$/.test(String(value.amount)) &&
    (value.paymentStatus === "pending" ||
      value.paymentStatus === "paid" ||
      value.paymentStatus === "cancelled") &&
    (value.paymentStatus !== "paid" || typeof value.paymentDate === "string")
  );
}

function isProjectRow(value: unknown): value is ProjectRow {
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
