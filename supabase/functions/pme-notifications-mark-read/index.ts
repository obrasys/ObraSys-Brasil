import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  notificationId: string;
}

interface SupabaseClientLike {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }> };
  from: (table: string) => QueryBuilderLike;
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
    return jsonResponse({ error: "Invalid notification payload." }, 400);
  }
  const notification = await resolveNotificationAccess(auth.supabase, body.notificationId);
  if (!notification.ok) {
    return jsonResponse({ error: notification.error }, notification.status);
  }
  const now = new Date().toISOString();
  await auth.supabase
    .from("pme_notifications")
    .update({ status: "read", read_at: now })
    .eq("id", body.notificationId);
  await auth.supabase.from("pme_notification_status_history").insert({
    organization_id: notification.row.organization_id,
    notification_id: body.notificationId,
    old_status: notification.row.status,
    new_status: "read",
    changed_by: auth.userId
  });
  return jsonResponse({ id: body.notificationId, status: "read" });
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

async function resolveNotificationAccess(
  supabase: SupabaseClientLike,
  notificationId: string
): Promise<
  { ok: true; row: Record<string, string> } | { ok: false; error: string; status: 403 | 404 }
> {
  const { data, error } = await supabase
    .from("pme_notifications")
    .select("id,organization_id,status")
    .eq("id", notificationId)
    .maybeSingle();
  if (error !== null || !isNotificationRow(data)) {
    return { ok: false, error: "Notification was not found or is not accessible.", status: 404 };
  }
  return { ok: true, row: data };
}

function isRequestBody(value: unknown): value is RequestBody {
  return isRecord(value) && typeof value.notificationId === "string";
}

function isNotificationRow(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) && typeof value.organization_id === "string" && typeof value.status === "string"
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
