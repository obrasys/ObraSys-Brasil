export interface PmeDailyLogCompletionInput {
  logDate?: string;
  workPerformed?: string;
  activitiesCount: number;
  laborCount?: number | null;
  laborEntriesCount: number;
  weatherSource?: "manual" | "automatic" | "imported" | null;
  createdBy?: string;
}

export interface PmeDailyLogCompletionResult {
  canComplete: boolean;
  missingFields: string[];
}

export interface PmeDailyLogVoiceSuggestion {
  weather: Record<string, string>;
  labor: Array<Record<string, string>>;
  activities: Array<Record<string, string>>;
  occurrences: Array<Record<string, string>>;
  materials: Array<Record<string, string>>;
  equipment: Array<Record<string, string>>;
  next_steps: string[];
  client_notes: string[];
  warnings: string[];
  human_validation_required: true;
}

export interface PmeDailyLogReportInput {
  companyName: string;
  projectName: string;
  logDate: string;
  status: string;
  weatherSummary?: string;
  laborSummary?: string;
  activities: string[];
  occurrences: string[];
  materials: string[];
  equipment: string[];
  photos: Array<{ caption?: string; fileUrl: string }>;
  nextSteps?: string;
  clientNotes?: string;
  responsibleName: string;
  completedAt?: string | null;
  lockedAt?: string | null;
}

export const dailyLogAxiaSystemPrompt =
  "Você é a Axia, assistente operacional do Obra Sys Brasil para Diário de Obra PME. A sua função é transformar relatos de voz ou texto em campos estruturados do diário de obra. Separe corretamente informações sobre clima, mão de obra, atividades executadas, ocorrências, materiais, equipamentos, próximos passos, fotos mencionadas e observações do cliente. Não invente dados. Se algo não foi dito, deixe vazio ou marque como não informado. Não aprove, conclua ou bloqueie o diário. Tudo deve ser apresentado como sugestão para validação humana.";

export function validatePmeDailyLogCompletion(
  input: PmeDailyLogCompletionInput
): PmeDailyLogCompletionResult {
  const missingFields: string[] = [];
  if (!input.logDate) {
    missingFields.push("log_date");
  }
  if (!input.workPerformed && input.activitiesCount === 0) {
    missingFields.push("work_performed_or_activity");
  }
  if ((input.laborCount ?? 0) <= 0 && input.laborEntriesCount === 0) {
    missingFields.push("labor");
  }
  if (!input.weatherSource) {
    missingFields.push("weather");
  }
  if (!input.createdBy) {
    missingFields.push("created_by");
  }

  return {
    canComplete: missingFields.length === 0,
    missingFields
  };
}

export function assertPmeDailyLogCanEdit(status: string): void {
  if (status === "locked") {
    throw new Error("Locked daily logs cannot be edited.");
  }
}

export function buildDailyLogVoiceSuggestion(transcriptText: string): PmeDailyLogVoiceSuggestion {
  const normalized = transcriptText.toLowerCase();
  const weather: Record<string, string> = {};
  const warnings: string[] = [];

  if (normalized.includes("chuva")) {
    weather.summary = "Relato menciona chuva.";
  }
  if (normalized.includes("sol")) {
    weather.summary = weather.summary ?? "Relato menciona sol.";
  }
  if (Object.keys(weather).length === 0) {
    warnings.push("Clima nao informado no relato.");
  }

  return {
    weather,
    labor: normalized.includes("pedreiro") ? [{ worker_type: "pedreiro", quantity: "1" }] : [],
    activities: transcriptText.trim()
      ? [{ title: "Atividade relatada por voz", description: transcriptText.trim() }]
      : [],
    occurrences: normalized.includes("problema")
      ? [
          {
            occurrence_type: "problema_tecnico",
            severity: "medium",
            title: "Problema mencionado no relato"
          }
        ]
      : [],
    materials: normalized.includes("material")
      ? [{ material_name: "Material citado", quantity: "1" }]
      : [],
    equipment: normalized.includes("equipamento")
      ? [{ equipment_name: "Equipamento citado", quantity: "1" }]
      : [],
    next_steps: normalized.includes("amanha") ? ["Revisar proximos passos mencionados."] : [],
    client_notes: normalized.includes("cliente") ? ["Relato menciona observacao do cliente."] : [],
    warnings,
    human_validation_required: true
  };
}

export function generateDailyLogReportHtml(input: PmeDailyLogReportInput): string {
  const photoList = input.photos
    .map(
      (photo) =>
        `<li>${escapeHtml(photo.caption ?? "Foto do diario")} - ${escapeHtml(photo.fileUrl)}</li>`
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Diario de Obra - ${escapeHtml(input.logDate)}</title>
</head>
<body>
  <header>
    <h1>Diario de Obra</h1>
    <p>Gerado pelo Obra Sys Brasil</p>
  </header>
  <section>
    <h2>Dados gerais</h2>
    <p><strong>Empresa:</strong> ${escapeHtml(input.companyName)}</p>
    <p><strong>Obra:</strong> ${escapeHtml(input.projectName)}</p>
    <p><strong>Data:</strong> ${escapeHtml(input.logDate)}</p>
    <p><strong>Status:</strong> ${escapeHtml(input.status)}</p>
  </section>
  <section><h2>Clima</h2><p>${escapeHtml(input.weatherSummary ?? "Nao informado")}</p></section>
  <section><h2>Mao de obra</h2><p>${escapeHtml(input.laborSummary ?? "Nao informado")}</p></section>
  <section><h2>Atividades</h2>${renderList(input.activities)}</section>
  <section><h2>Ocorrencias</h2>${renderList(input.occurrences)}</section>
  <section><h2>Materiais</h2>${renderList(input.materials)}</section>
  <section><h2>Equipamentos</h2>${renderList(input.equipment)}</section>
  <section><h2>Fotos</h2><ul>${photoList || "<li>Sem fotos</li>"}</ul></section>
  <section><h2>Proximos passos</h2><p>${escapeHtml(input.nextSteps ?? "Nao informado")}</p></section>
  <section><h2>Observacoes do cliente</h2><p>${escapeHtml(input.clientNotes ?? "Nao informado")}</p></section>
  <footer>
    <p><strong>Responsavel:</strong> ${escapeHtml(input.responsibleName)}</p>
    <p><strong>Concluido em:</strong> ${escapeHtml(input.completedAt ?? "Nao concluido")}</p>
    <p><strong>Bloqueado em:</strong> ${escapeHtml(input.lockedAt ?? "Nao bloqueado")}</p>
  </footer>
</body>
</html>`;
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "<p>Nao informado</p>";
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
