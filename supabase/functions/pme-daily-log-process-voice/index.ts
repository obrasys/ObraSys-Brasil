import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

interface RequestBody {
  dailyLogId: string;
  transcriptText: string;
  audioFileUrl?: string;
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
  status: string;
}

const axiaSystemPrompt =
  "Você é a Axia, assistente operacional do Obra Sys Brasil para Diário de Obra PME. A sua função é transformar relatos de voz ou texto em campos estruturados do diário de obra. Separe corretamente informações sobre clima, mão de obra, atividades executadas, ocorrências, materiais, equipamentos, próximos passos, fotos mencionadas e observações do cliente. Não invente dados. Se algo não foi dito, deixe vazio ou marque como não informado. Não aprove, conclua ou bloqueie o diário. Tudo deve ser apresentado como sugestão para validação humana.";

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
    return jsonResponse({ error: "Invalid voice payload." }, 400);
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

  const structuredPayload = buildSuggestion(body.transcriptText);
  const { data, error } = await auth.supabase
    .from("pme_project_daily_log_voice_notes")
    .insert({
      organization_id: dailyLog.row.organization_id,
      project_id: dailyLog.row.project_id,
      daily_log_id: dailyLog.row.id,
      audio_file_url: body.audioFileUrl ?? null,
      transcript_text: sanitizeTranscript(body.transcriptText),
      structured_payload: structuredPayload,
      processing_status: "completed",
      created_by: auth.userId
    })
    .select("id")
    .single();
  if (error !== null || !isIdRow(data)) {
    return jsonResponse({ error: "Could not process voice note." }, 400);
  }
  await auth.supabase.from("audit_logs").insert({
    organization_id: dailyLog.row.organization_id,
    actor_user_id: auth.userId,
    action: "pme_daily_log.voice_processed",
    entity_table: "pme_project_daily_log_voice_notes",
    entity_id: data.id,
    metadata: { daily_log_id: dailyLog.row.id, axia_prompt: axiaSystemPrompt }
  });
  return jsonResponse({ id: data.id, structuredPayload });
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
    .select("id,organization_id,project_id,status")
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
    : { ok: false, error: "User is not allowed to manage this daily log." };
}

function buildSuggestion(transcriptText: string) {
  return {
    weather: transcriptText.toLowerCase().includes("chuva")
      ? { summary: "Relato menciona chuva." }
      : {},
    labor: transcriptText.toLowerCase().includes("pedreiro")
      ? [{ worker_type: "pedreiro", quantity: "1" }]
      : [],
    activities: [{ title: "Atividade relatada por voz", description: transcriptText }],
    occurrences: transcriptText.toLowerCase().includes("problema")
      ? [{ occurrence_type: "problema_tecnico", title: "Problema mencionado", severity: "medium" }]
      : [],
    materials: transcriptText.toLowerCase().includes("material")
      ? [{ material_name: "Material citado", quantity: "1" }]
      : [],
    equipment: transcriptText.toLowerCase().includes("equipamento")
      ? [{ equipment_name: "Equipamento citado", quantity: "1" }]
      : [],
    next_steps: transcriptText.toLowerCase().includes("amanha") ? ["Revisar proximos passos."] : [],
    client_notes: transcriptText.toLowerCase().includes("cliente")
      ? ["Relato menciona observacao do cliente."]
      : [],
    warnings: ["Sugestoes geradas para revisao humana."],
    human_validation_required: true
  };
}

function sanitizeTranscript(value: string): string {
  return value
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf_removido]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[cnpj_removido]")
    .slice(0, 12000);
}

function isRequestBody(value: unknown): value is RequestBody {
  return (
    isRecord(value) &&
    !hasForbiddenAuthorizationKeys(value) &&
    typeof value.dailyLogId === "string" &&
    typeof value.transcriptText === "string" &&
    value.transcriptText.trim().length > 0 &&
    value.transcriptText.length <= 12000
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
    typeof value.status === "string"
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
