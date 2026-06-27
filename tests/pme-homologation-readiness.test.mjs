import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

const requiredDocs = [
  "docs/permissions.md",
  "docs/pme-permission-matrix.md",
  "docs/rls-audit.md",
  "docs/audit-logs.md",
  "docs/storage-security.md",
  "docs/axia-security.md",
  "docs/production-readiness.md",
  "docs/rollback-plan.md",
  "docs/pme-homologation-report.md"
];

const requiredScenarioLabels = [
  "Orcamento PME simples",
  "Meu Catalogo",
  "SINAPI",
  "Proposta comercial",
  "Conversao em obra",
  "Gestao simples da obra",
  "Compras e fornecedores",
  "Diario de obra",
  "Relatorios e fecho",
  "Dashboard multi-obras",
  "Notificacoes",
  "Permissoes e RLS",
  "Cross-tenant",
  "Storage",
  "Axia"
];

test("PME homologation required documentation exists", async () => {
  for (const path of requiredDocs) {
    const source = await readFile(path, "utf8");
    assert.ok(source.length > 200, `${path} should not be empty`);
  }

  const productionReadiness = await readFile("docs/production-readiness.md", "utf8");
  assert.match(productionReadiness, /Banco de dados/);
  assert.match(productionReadiness, /Seguranca/);
  assert.match(productionReadiness, /Financeiro/);
  assert.match(productionReadiness, /Axia/);
  assert.match(productionReadiness, /npm run typecheck/);

  const rollback = await readFile("docs/rollback-plan.md", "utf8");
  assert.match(rollback, /Frontend/);
  assert.match(rollback, /Migrations/);
  assert.match(rollback, /Edge Functions/);
  assert.match(rollback, /Storage/);
});

test("PME homologation seed covers organizations, roles and core flow records", async () => {
  const seed = JSON.parse(await readFile("tests/fixtures/pme-homologation-seed.json", "utf8"));

  assert.equal(seed.organizations.length, 2);
  assert.ok(seed.users.some((user) => user.role === "admin"));
  assert.ok(seed.users.some((user) => user.role === "manager"));
  assert.ok(seed.users.some((user) => user.role === "viewer"));
  assert.ok(seed.budgets.some((budget) => budget.status === "approved"));
  assert.ok(seed.catalog.kits.includes("Kit banheiro simples"));
  assert.equal(seed.sinapi.regime, "nao_desonerado");
  assert.equal(seed.project.sourceBudgetId, "budget-banheiro-a");
});

test("PME homologation scenario matrix is represented by automated suites or docs", async () => {
  const testFiles = await readdir("tests");
  const availableSuites = testFiles.filter((file) => file.endsWith(".test.mjs")).join("\n");
  const productionReadiness = await readFile("docs/production-readiness.md", "utf8");
  const homologationReport = await readFile("docs/pme-homologation-report.md", "utf8");
  const permissions = await readFile("docs/pme-permission-matrix.md", "utf8");
  const storage = await readFile("docs/storage-security.md", "utf8");
  const axia = await readFile("docs/axia-security.md", "utf8");
  const evidence = `${availableSuites}\n${productionReadiness}\n${homologationReport}\n${permissions}\n${storage}\n${axia}`;

  for (const label of requiredScenarioLabels) {
    const normalized = label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const normalizedEvidence = evidence
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    assert.ok(normalizedEvidence.includes(normalized.split(" ")[0]), `${label} lacks evidence`);
  }
});

test("PME Edge Functions keep authentication and body-authorization guardrails", async () => {
  const functionDirs = await readdir("supabase/functions", { withFileTypes: true });
  const indexFiles = functionDirs
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => join("supabase/functions", dirent.name, "index.ts"));

  for (const path of indexFiles) {
    const source = await readFile(path, "utf8");
    assert.match(source, /supabase\.auth\.getUser\(\)/, `${path} must authenticate with getUser`);
    assert.doesNotMatch(source, /service_role/i, `${path} must not use service_role`);

    const bodyInterface = source.match(/interface RequestBody \{[\s\S]*?\}/)?.[0] ?? "";
    const axiaBodyInterface = source.match(/interface AxiaRequestBody \{[\s\S]*?\}/)?.[0] ?? "";
    const requestContract = `${bodyInterface}\n${axiaBodyInterface}`;
    assert.doesNotMatch(
      requestContract,
      /organization/i,
      `${path} body must not accept organization`
    );
    assert.doesNotMatch(requestContract, /tenant/i, `${path} body must not accept tenant`);
    assert.doesNotMatch(requestContract, /userId|user_id/i, `${path} body must not accept user id`);
  }
});

test("Sensitive PME Edge Functions explicitly reject body authorization aliases", async () => {
  const sensitiveFunctionPaths = [
    "supabase/functions/pme-budget-generate-proposal/index.ts",
    "supabase/functions/pme-project-generate-report/index.ts",
    "supabase/functions/axia-pme-budget-assistant/index.ts",
    "supabase/functions/pme-notifications-generate/index.ts",
    "supabase/functions/pme-daily-log-fetch-weather/index.ts",
    "supabase/functions/pme-daily-log-process-voice/index.ts"
  ];
  const forbiddenKeys = [
    "organization_id",
    "organizationId",
    "tenant_id",
    "tenantId",
    "user_id",
    "userId"
  ];

  for (const path of sensitiveFunctionPaths) {
    const source = await readFile(path, "utf8");
    assert.match(source, /hasForbiddenAuthorizationKeys/, `${path} must reject auth aliases`);
    for (const key of forbiddenKeys) {
      assert.match(source, new RegExp(`"${key}" in value`), `${path} must reject ${key}`);
    }
  }
});

test("PME migrations keep RLS, sensitive reports and notification protections", async () => {
  const migrations = await readdir("supabase/migrations");
  const combined = (
    await Promise.all(migrations.map((file) => readFile(join("supabase/migrations", file), "utf8")))
  ).join("\n");

  assert.match(combined, /enable row level security/);
  assert.match(combined, /foreign key \(organization_id, project_id\)/);
  assert.match(combined, /visibility = 'client'/);
  assert.match(combined, /pme_project_reports_client_type_check/);
  assert.match(combined, /pme_notifications_active_source_unique_idx/);
  assert.match(combined, /action_url is null or action_url ~ '\^\/app\/'/);
});
