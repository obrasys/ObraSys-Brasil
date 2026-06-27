import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  period: "7d" | "30d" | "90d" | "current_month" | "custom";
  status?: string;
  includeClosedProjects?: boolean;
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
  limit: (count: number) => QueryBuilderLike;
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
    return jsonResponse({ error: "Invalid dashboard payload." }, 400);
  }

  const organization = await resolveActiveOrganization(auth.supabase, auth.userId);
  if (!organization.ok) {
    return jsonResponse({ error: organization.error }, organization.status);
  }

  const canSeeFinancials = await auth.supabase.rpc("has_organization_role", {
    target_organization_id: organization.organizationId,
    allowed_roles: ["owner", "admin", "manager"]
  });

  const { data } = await auth.supabase
    .from("pme_dashboard_snapshots")
    .select("*")
    .eq("organization_id", organization.organizationId)
    .limit(1)
    .maybeSingle();

  return jsonResponse({
    period: body.period,
    canSeeFinancials: canSeeFinancials.data === true,
    snapshot: canSeeFinancials.data === true ? data : sanitizeFinancialSnapshot(data)
  });
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

async function resolveActiveOrganization(
  supabase: SupabaseClientLike,
  userId: string
): Promise<{ ok: true; organizationId: string } | { ok: false; error: string; status: 403 }> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error !== null || !isRecord(data) || typeof data.organization_id !== "string") {
    return { ok: false, error: "User does not belong to an active organization.", status: 403 };
  }
  return { ok: true, organizationId: data.organization_id };
}

function sanitizeFinancialSnapshot(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }
  return {
    ...value,
    total_planned_cost: null,
    total_actual_cost: null,
    total_expected_profit: null,
    total_actual_profit: null,
    total_cost_variance: null
  };
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    (value.period === "7d" ||
      value.period === "30d" ||
      value.period === "90d" ||
      value.period === "current_month" ||
      value.period === "custom")
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
