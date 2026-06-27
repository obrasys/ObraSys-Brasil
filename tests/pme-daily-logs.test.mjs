import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  assertPmeDailyLogCanEdit,
  buildDailyLogVoiceSuggestion,
  dailyLogAxiaSystemPrompt,
  generateDailyLogReportHtml,
  validatePmeDailyLogCompletion
} from "../packages/domain/src/pme-daily-logs/pmeDailyLogs.ts";

const migrationPath = "supabase/migrations/20260627000300_enhance_pme_daily_logs.sql";

test("PME daily log migration evolves daily logs and creates guided tables with RLS", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const tables = [
    "pme_project_daily_log_labor",
    "pme_project_daily_log_activities",
    "pme_project_daily_log_occurrences",
    "pme_project_daily_log_materials",
    "pme_project_daily_log_equipment",
    "pme_project_daily_log_weather",
    "pme_project_daily_log_voice_notes",
    "pme_project_daily_log_reviews",
    "pme_project_daily_log_exports"
  ];

  assert.match(migration, /add column if not exists weather_source/);
  assert.match(migration, /add column if not exists locked_by/);
  assert.match(migration, /status in \('draft', 'in_review', 'completed', 'locked', 'cancelled'\)/);
  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`${table}.*organization_id`, "s"));
  }
  assert.match(migration, /foreign key \(organization_id, daily_log_id\)/);
  assert.match(
    migration,
    /has_organization_role\(organization_id, array\['owner', 'admin', 'manager'\]\)/
  );
});

test("PME daily log domain validates completion and locked edit rule", () => {
  const invalid = validatePmeDailyLogCompletion({
    activitiesCount: 0,
    laborEntriesCount: 0
  });
  assert.equal(invalid.canComplete, false);
  assert.match(invalid.missingFields.join(","), /weather/);

  const valid = validatePmeDailyLogCompletion({
    logDate: "2026-06-27",
    workPerformed: "Assentamento de piso",
    activitiesCount: 0,
    laborCount: 2,
    laborEntriesCount: 1,
    weatherSource: "manual",
    createdBy: "user-1"
  });
  assert.equal(valid.canComplete, true);
  assert.throws(() => assertPmeDailyLogCanEdit("locked"), /cannot be edited/);
});

test("PME daily log voice suggestion is structured and requires human validation", () => {
  const suggestion = buildDailyLogVoiceSuggestion(
    "Hoje teve sol, um pedreiro fez impermeabilizacao, houve problema de material e amanha revisar."
  );

  assert.equal(suggestion.human_validation_required, true);
  assert.equal(suggestion.activities.length, 1);
  assert.equal(suggestion.labor[0]?.worker_type, "pedreiro");
  assert.equal(suggestion.occurrences.length, 1);
  assert.match(dailyLogAxiaSystemPrompt, /Não aprove, conclua ou bloqueie/);
});

test("PME daily log report HTML contains required sections", () => {
  const html = generateDailyLogReportHtml({
    companyName: "Construtora PME",
    projectName: "Reforma banheiro",
    logDate: "2026-06-27",
    status: "completed",
    weatherSummary: "Sol",
    laborSummary: "2 profissionais",
    activities: ["Impermeabilizacao"],
    occurrences: ["Sem ocorrencias"],
    materials: ["Argamassa"],
    equipment: ["Betoneira"],
    photos: [{ fileUrl: "https://example.com/foto.jpg", caption: "Foto do dia" }],
    nextSteps: "Assentar revestimento",
    clientNotes: "Cliente aprovou",
    responsibleName: "Mestre"
  });

  assert.match(html, /Diario de Obra/);
  assert.match(html, /Mao de obra/);
  assert.match(html, /Ocorrencias/);
  assert.match(html, /Gerado pelo Obra Sys Brasil/);
});

test("PME daily log Edge Functions authenticate, audit critical actions and avoid organization body auth", async () => {
  const functions = [
    "supabase/functions/pme-daily-log-process-voice/index.ts",
    "supabase/functions/pme-daily-log-fetch-weather/index.ts",
    "supabase/functions/pme-daily-log-complete/index.ts",
    "supabase/functions/pme-daily-log-lock/index.ts",
    "supabase/functions/pme-daily-log-export/index.ts"
  ];

  for (const functionPath of functions) {
    const source = await readFile(functionPath, "utf8");
    const bodyInterface = source.match(/interface RequestBody \{[\s\S]*?\}/)?.[0] ?? "";
    assert.match(source, /supabase\.auth\.getUser\(\)/);
    assert.doesNotMatch(source, /service_role/i);
    assert.doesNotMatch(bodyInterface, /organization/i);
    assert.doesNotMatch(bodyInterface, /tenant/i);
    assert.doesNotMatch(bodyInterface, /userId/i);
  }

  const voiceSource = await readFile(
    "supabase/functions/pme-daily-log-process-voice/index.ts",
    "utf8"
  );
  assert.match(voiceSource, /human_validation_required: true/);
  assert.match(voiceSource, /sanitizeTranscript/);
  assert.match(voiceSource, /pme_daily_log\.voice_processed/);

  const weatherSource = await readFile(
    "supabase/functions/pme-daily-log-fetch-weather/index.ts",
    "utf8"
  );
  assert.match(weatherSource, /WEATHER_API_KEY/);
  assert.match(weatherSource, /manual/);

  const lockSource = await readFile("supabase/functions/pme-daily-log-lock/index.ts", "utf8");
  assert.match(lockSource, /pme_daily_log\.locked/);
});

test("PME daily log UI exposes wizard steps, voice suggestions and report actions", async () => {
  const wizard = await readFile(
    "apps/web/src/features/pme-daily-logs/PmeDailyLogWizard.tsx",
    "utf8"
  );
  const schemas = await readFile(
    "apps/web/src/features/pme-daily-logs/pmeDailyLogSchemas.ts",
    "utf8"
  );
  const repository = await readFile(
    "apps/web/src/features/pme-daily-logs/pmeDailyLogRepository.ts",
    "utf8"
  );

  for (const label of [
    "Clima",
    "Equipe",
    "Atividades",
    "Ocorrencias",
    "Materiais",
    "Equipamentos",
    "Fotos",
    "Voz",
    "Revisao",
    "Concluir"
  ]) {
    assert.match(wizard, new RegExp(label));
  }
  assert.match(wizard, /Sugestoes da Axia/);
  assert.match(wizard, /Gerar relatorio/);
  assert.match(schemas, /A quantidade deve ser maior que zero/);
  assert.match(schemas, /Use um percentual entre 0 e 100/);
  assert.match(repository, /Fallback manual/);
  assert.match(repository, /buildDailyLogVoiceSuggestion/);
});
