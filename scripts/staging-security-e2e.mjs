import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const ORG_A = "10000000-0000-0000-0000-000000000001";
const ORG_B = "10000000-0000-0000-0000-000000000002";
const PASSWORD = "ObraSysDemo#2026";
const RUN_ID = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, "")
  .slice(0, 14);
const BASE_ID_PREFIX = "81000000-0000-0000-0000-";

const requiredBuckets = [
  "project-photos",
  "project-attachments",
  "budget-proposals",
  "project-reports",
  "purchase-attachments",
  "daily-log-photos"
];

const sensitiveTerms = [
  "unit_cost",
  "total_cost",
  "subtotal_cost",
  "planned_cost",
  "actual_cost",
  "supplier price",
  "purchase price",
  "margem",
  "lucro",
  "profit_percentage",
  "profit_amount",
  "expected_profit",
  "actual_profit",
  "cost_variance",
  "profit_variance"
];

const env = loadEnv();
const fetch = globalThis.fetch;
const serviceHeaders = {
  apikey: env.SUPABASE_ANON_KEY,
  authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
};

const report = {
  runId: RUN_ID,
  projectRefConfirmed: env.SUPABASE_URL.includes("ndfivxfmijjwakeeunhd"),
  url: env.SUPABASE_URL,
  users: [],
  organizations: [ORG_A, ORG_B],
  tables: [],
  edgeFunctions: [],
  storage: [],
  financialPermissions: [],
  failures: [],
  warnings: []
};

if (!report.projectRefConfirmed) {
  throw new Error("SUPABASE_URL is not the confirmed staging project.");
}

const users = await createHomologationUsers();
await createFixtures(users);
const ids = await loadFixtureIds();
await validateCrossTenantTables(users.adminA.token, users.adminA.id, ids);
await validateEdgeFunctions(users.adminA.token, ids);
await validateFinancialRestrictions(users.noFinanceA.token);
await validateStorage(users.adminA.token, users.adminB.token, ids);
await writeReport();

if (report.failures.length > 0) {
  console.error(JSON.stringify({ status: "failed", failures: report.failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      runId: report.runId,
      users: report.users.map((user) => ({
        email: user.email,
        organizationId: user.organizationId,
        role: user.role
      })),
      tableChecks: report.tables.length,
      edgeFunctionChecks: report.edgeFunctions.length,
      storageChecks: report.storage.length,
      financialChecks: report.financialPermissions.length,
      warnings: report.warnings
    },
    null,
    2
  )
);

function loadEnv() {
  if (!fs.existsSync(".env")) {
    throw new Error(".env is required for staging validation.");
  }
  const values = Object.fromEntries(
    fs
      .readFileSync(".env", "utf8")
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
  if (!values.SUPABASE_URL || !values.SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  }
  return values;
}

async function createHomologationUsers() {
  const specs = {
    adminA: {
      email: `admin-org-a-${RUN_ID}@staging.obrasys.local`,
      organizationId: ORG_A,
      role: "admin"
    },
    engineerA: {
      email: `engenheiro-obra-a-${RUN_ID}@staging.obrasys.local`,
      organizationId: ORG_A,
      role: "manager"
    },
    masterA: {
      email: `mestre-obra-a-${RUN_ID}@staging.obrasys.local`,
      organizationId: ORG_A,
      role: "member"
    },
    noFinanceA: {
      email: `sem-financeiro-a-${RUN_ID}@staging.obrasys.local`,
      organizationId: ORG_A,
      role: "member"
    },
    adminB: {
      email: `admin-org-b-${RUN_ID}@staging.obrasys.local`,
      organizationId: ORG_B,
      role: "admin"
    },
    engineerB: {
      email: `engenheiro-obra-b-${RUN_ID}@staging.obrasys.local`,
      organizationId: ORG_B,
      role: "manager"
    }
  };

  const created = {};
  for (const [key, spec] of Object.entries(specs)) {
    const user = await adminCreateUser(spec.email);
    await serviceUpsert("profiles", {
      id: user.id,
      full_name: spec.email,
      display_name: spec.email.split("@")[0]
    });
    await serviceUpsert(
      "organization_members",
      {
        organization_id: spec.organizationId,
        user_id: user.id,
        role: spec.role,
        status: "active"
      },
      "organization_id,user_id"
    );
    const token = await login(spec.email);
    created[key] = { ...spec, id: user.id, token };
    report.users.push({
      email: spec.email,
      id: user.id,
      organizationId: spec.organizationId,
      role: spec.role
    });
  }
  return created;
}

async function adminCreateUser(email) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { ...serviceHeaders, "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true })
  });
  const json = await response.json();
  if (!response.ok || typeof json.id !== "string") {
    throw new Error(`Could not create user ${email}: ${response.status}`);
  }
  return json;
}

async function login(email) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD })
  });
  const json = await response.json();
  if (!response.ok || typeof json.access_token !== "string") {
    throw new Error(`Could not login user ${email}: ${response.status}`);
  }
  return json.access_token;
}

async function createFixtures(users) {
  const b = users.adminB.id;
  const [activePrompt] = await serviceSelect(
    "axia_prompts",
    "prompt_key=eq.pme_budget_assistant&is_active=eq.true&order=version.desc&limit=1"
  );
  if (typeof activePrompt?.id !== "string") {
    throw new Error("Active Axia PME prompt was not found in staging.");
  }
  const projectB = uuid("000001");
  const budgetB = uuid("000002");
  const budgetItemB = uuid("000003");
  const taskB = uuid("000004");
  const dailyLogB = uuid("000005");
  const costB = uuid("000006");
  const receiptB = uuid("000007");
  const supplierB = uuid("000008");
  const orderB = uuid("000009");
  const reportB = uuid("000010");
  const reportExportB = uuid("000011");
  const notificationB = uuid("000012");
  const axiaRunB = uuid("000013");
  const axiaSnapshotB = uuid("000014");
  const photoB = uuid("000015");
  const attachmentB = uuid("000016");
  const closeoutB = uuid("000017");

  await serviceUpsert("projects", {
    id: projectB,
    organization_id: ORG_B,
    created_by: b,
    updated_by: b,
    name: `Obra Cross Tenant B ${RUN_ID}`,
    code: `E2E-B-${RUN_ID}`,
    description: "Fixture B para validacao cross-tenant.",
    status: "active",
    starts_on: "2026-06-27"
  });
  await serviceUpsert("pme_budgets", {
    id: budgetB,
    organization_id: ORG_B,
    project_id: projectB,
    client_name: "Cliente B Homologacao",
    work_address: "Rua B, 200",
    budget_number: `PME-B-${RUN_ID}`,
    title: "Orcamento B Cross Tenant",
    description: "Fixture B para teste de isolamento.",
    budget_type: "renovation",
    status: "approved",
    pricing_mode: "margin",
    subtotal_cost: "1000.00",
    overhead_percentage: "5",
    tax_percentage: "5",
    profit_percentage: "15",
    discount_amount: "0",
    final_price: "1250.00",
    valid_until: "2026-07-27",
    approved_at: new Date().toISOString(),
    created_by: b,
    updated_by: b
  });
  await serviceUpsert("pme_budget_items", {
    id: budgetItemB,
    organization_id: ORG_B,
    budget_id: budgetB,
    item_type: "service",
    description: "Item B isolado",
    unit: "un",
    quantity: "1",
    unit_cost: "1000.00",
    subtotal_cost: "1000.00",
    unit_price: "1250.00",
    final_price: "1250.00",
    category: "servico",
    source_type: "manual",
    total_cost: "1000.00",
    total_price: "1250.00",
    show_on_proposal: true,
    created_by: b,
    updated_by: b
  });
  await serviceUpsert("pme_project_tasks", {
    id: taskB,
    organization_id: ORG_B,
    project_id: projectB,
    title: "Tarefa B isolada",
    description: "Nao deve ser vista pela Organizacao A.",
    status: "todo",
    priority: "medium",
    created_by: b
  });
  await serviceUpsert("pme_project_actual_costs", {
    id: costB,
    organization_id: ORG_B,
    project_id: projectB,
    cost_type: "material",
    description: "Custo B isolado",
    amount: "100.00",
    payment_status: "pending",
    supplier_name: "Fornecedor B",
    created_by: b
  });
  await serviceUpsert("pme_project_receipts", {
    id: receiptB,
    organization_id: ORG_B,
    project_id: projectB,
    description: "Recebimento B isolado",
    amount: "200.00",
    receipt_status: "planned",
    created_by: b
  });
  await serviceUpsert("pme_project_daily_logs", {
    id: dailyLogB,
    organization_id: ORG_B,
    project_id: projectB,
    log_date: "2026-06-27",
    work_performed: "Diario B isolado.",
    status: "completed",
    created_by: b
  });
  await serviceUpsert("pme_suppliers", {
    id: supplierB,
    organization_id: ORG_B,
    name: "Fornecedor B Homologacao",
    supplier_type: "material",
    created_by: b
  });
  await serviceUpsert("pme_purchase_orders", {
    id: orderB,
    organization_id: ORG_B,
    project_id: projectB,
    supplier_id: supplierB,
    supplier_name_snapshot: "Fornecedor B Homologacao",
    order_number: `PCB-${RUN_ID}`,
    title: "Pedido B isolado",
    status: "draft",
    subtotal_amount: "100.00",
    total_amount: "100.00",
    created_by: b
  });
  await serviceUpsert("pme_project_reports", {
    id: reportB,
    organization_id: ORG_B,
    project_id: projectB,
    report_type: "client_delivery",
    title: "Relatorio cliente B",
    visibility: "client",
    data_snapshot: { project: "Obra B", hiddenFields: ["actual_cost", "profit", "margin"] },
    generated_by: b
  });
  await serviceUpsert("pme_project_report_exports", {
    id: reportExportB,
    organization_id: ORG_B,
    project_id: projectB,
    report_id: reportB,
    export_type: "html",
    html_snapshot: "<h1>Relatorio cliente B</h1>",
    generated_by: b
  });
  await serviceUpsert("pme_notifications", {
    id: notificationB,
    organization_id: ORG_B,
    user_id: users.adminB.id,
    project_id: projectB,
    budget_id: budgetB,
    notification_type: "system_notice",
    severity: "info",
    title: "Notificacao B isolada",
    message: "Mensagem B sem dados financeiros.",
    action_url: "/app/dashboard"
  });
  await serviceUpsert("pme_project_photos", {
    id: photoB,
    organization_id: ORG_B,
    project_id: projectB,
    daily_log_id: dailyLogB,
    file_url: `${ORG_B}/projects/${projectB}/daily_logs/${dailyLogB}/photos/photo-b.txt`,
    file_name: "photo-b.txt",
    uploaded_by: b
  });
  await serviceUpsert("pme_project_attachments", {
    id: attachmentB,
    organization_id: ORG_B,
    project_id: projectB,
    related_table: "pme_purchase_orders",
    related_id: orderB,
    file_url: `${ORG_B}/projects/${projectB}/purchases/${orderB}/attachments/attachment-b.txt`,
    file_name: "attachment-b.txt",
    file_type: "text/plain",
    uploaded_by: b
  });
  await serviceUpsert("axia_runs", {
    id: axiaRunB,
    organization_id: ORG_B,
    budget_id: budgetB,
    task: "suggest_missing_items",
    module: "pme_budgets",
    prompt_id: activePrompt.id,
    action_type: "suggest_missing_items",
    status: "completed",
    model: "axia-local-structured-v2",
    model_provider: "local",
    model_name: "axia-local-structured-v2",
    input_summary: "Fixture B",
    output_summary: "Fixture B",
    created_by: b,
    completed_at: new Date().toISOString()
  });
  await serviceUpsert("axia_context_snapshots", {
    id: axiaSnapshotB,
    organization_id: ORG_B,
    run_id: axiaRunB,
    axia_run_id: axiaRunB,
    budget_id: budgetB,
    purpose: "suggest_missing_items",
    sanitized_context: { budgetId: budgetB, title: "B" },
    removed_fields: [],
    redaction_summary: {}
  });
  await serviceUpsert("pme_project_closeouts", {
    id: closeoutB,
    organization_id: ORG_B,
    project_id: projectB,
    source_pme_budget_id: budgetB,
    status: "ready_to_close",
    planned_cost: "1000.00",
    actual_cost: "100.00",
    planned_revenue: "1250.00",
    received_revenue: "0.00",
    pending_receivables: "1250.00",
    expected_profit: "250.00",
    actual_profit: "0.00",
    profit_variance: "-250.00",
    cost_variance: "-900.00"
  });

  await serviceInsert("audit_logs", {
    organization_id: ORG_B,
    actor_user_id: b,
    action: "homologation.fixture_created",
    entity_table: "projects",
    entity_id: projectB,
    metadata: { runId: RUN_ID }
  });
}

async function loadFixtureIds() {
  const [budgetA] = await serviceSelect("pme_budgets", `organization_id=eq.${ORG_A}&limit=1`);
  const [projectA] = await serviceSelect("projects", `organization_id=eq.${ORG_A}&limit=1`);
  const [dailyLogA] = await serviceSelect(
    "pme_project_daily_logs",
    `organization_id=eq.${ORG_A}&limit=1`
  );
  const [budgetB] = await serviceSelect(
    "pme_budgets",
    `organization_id=eq.${ORG_B}&order=created_at.desc&limit=1`
  );
  const [projectB] = await serviceSelect(
    "projects",
    `organization_id=eq.${ORG_B}&order=created_at.desc&limit=1`
  );
  const [dailyLogB] = await serviceSelect(
    "pme_project_daily_logs",
    `organization_id=eq.${ORG_B}&order=created_at.desc&limit=1`
  );
  const [closeoutB] = await serviceSelect(
    "pme_project_closeouts",
    `organization_id=eq.${ORG_B}&order=created_at.desc&limit=1`
  );
  return {
    budgetA,
    projectA,
    dailyLogA,
    budgetB,
    projectB,
    dailyLogB,
    closeoutB
  };
}

async function validateCrossTenantTables(userToken, userId, ids) {
  const tables = [
    "pme_budgets",
    "pme_budget_items",
    "pme_budget_exports",
    "projects",
    "pme_project_tasks",
    "pme_project_actual_costs",
    "pme_project_receipts",
    "pme_project_daily_logs",
    "pme_project_photos",
    "pme_project_attachments",
    "pme_suppliers",
    "pme_purchase_orders",
    "pme_project_reports",
    "pme_project_report_exports",
    "pme_notifications",
    "axia_runs",
    "axia_context_snapshots",
    "audit_logs"
  ];

  for (const table of tables) {
    const sample = await firstServiceRow(table, ORG_B);
    if (sample === null) {
      report.tables.push({ table, status: "skipped", reason: "table missing or no sample" });
      continue;
    }

    const selectResult = await userRequest(
      userToken,
      "GET",
      `/rest/v1/${table}?select=*&id=eq.${sample.id}`
    );
    recordTable(table, "select", isEmptyArray(selectResult), selectResult);

    const updateResult = await userRequest(
      userToken,
      "PATCH",
      `/rest/v1/${table}?id=eq.${sample.id}&select=id`,
      buildUpdateAttempt(table)
    );
    recordTable(table, "update", isEmptyArray(updateResult), updateResult);

    const insertPayload = buildInsertAttempt(table, sample, userId, ids);
    if (insertPayload !== null) {
      const insertResult = await userRequest(
        userToken,
        "POST",
        `/rest/v1/${table}?select=id`,
        insertPayload
      );
      recordTable(table, "insert", isBlockedOrEmpty(insertResult), insertResult);
    }

    const deleteResult = await userRequest(
      userToken,
      "DELETE",
      `/rest/v1/${table}?id=eq.${sample.id}&select=id`
    );
    recordTable(table, "delete", isEmptyArray(deleteResult), deleteResult);
  }
}

function recordTable(table, operation, passed, result) {
  report.tables.push({
    table,
    operation,
    passed,
    status: result.status,
    body: safeBody(result.body)
  });
  if (!passed) {
    report.failures.push({
      area: "cross-tenant",
      table,
      operation,
      status: result.status,
      body: safeBody(result.body)
    });
  }
}

async function validateEdgeFunctions(userToken, ids) {
  const calls = [
    ["pme-budget-convert-to-project", { budgetId: ids.budgetB.id, confirmed: true }],
    [
      "pme-budget-generate-proposal",
      { budgetId: ids.budgetB.id, format: "json", organizationId: ORG_B }
    ],
    [
      "pme-project-create-actual-cost",
      {
        projectId: ids.projectB.id,
        costType: "material",
        description: "Cross",
        amount: "1.00",
        paymentStatus: "pending"
      }
    ],
    [
      "pme-project-create-receipt",
      { projectId: ids.projectB.id, description: "Cross", amount: "1.00", receiptStatus: "planned" }
    ],
    ["pme-project-lock-daily-log", { dailyLogId: ids.dailyLogB.id }],
    [
      "pme-project-generate-report",
      { projectId: ids.projectB.id, reportType: "client_delivery", visibility: "client" }
    ],
    [
      "pme-project-close",
      {
        projectId: ids.projectB.id,
        closeoutId: ids.closeoutB.id,
        closeoutNotes: "Cross tenant should fail."
      }
    ],
    ["pme-notifications-generate", { runMode: "manual", organizationId: ORG_B }],
    [
      "axia-pme-budget-assistant",
      { budgetId: ids.budgetB.id, actionType: "suggest_missing_items", organizationId: ORG_B }
    ],
    [
      "pme-daily-log-process-voice",
      {
        dailyLogId: ids.dailyLogB.id,
        transcriptText: "Cross tenant should fail.",
        organizationId: ORG_B
      }
    ],
    [
      "pme-daily-log-fetch-weather",
      {
        dailyLogId: ids.dailyLogB.id,
        manualSummary: "Cross tenant should fail.",
        organizationId: ORG_B
      }
    ]
  ];

  for (const [name, payload] of calls) {
    const noJwt = await functionRequest("", name, payload);
    const noJwtPassed = noJwt.status === 401;
    const cross = await functionRequest(userToken, name, payload);
    const passed =
      noJwtPassed &&
      cross.status >= 400 &&
      !containsSensitiveTerm(JSON.stringify(cross.body).toLowerCase());
    report.edgeFunctions.push({
      name,
      requiresJwt: noJwtPassed,
      blocksCrossTenant: cross.status >= 400,
      status: cross.status,
      body: safeBody(cross.body),
      passed
    });
    if (!passed) {
      report.failures.push({
        area: "edge-function",
        name,
        status: cross.status,
        body: safeBody(cross.body)
      });
    }
  }
}

async function validateFinancialRestrictions(noFinanceToken) {
  const checks = [
    ["/rest/v1/pme_budgets?select=*&limit=5", "orçamento"],
    ["/rest/v1/pme_project_actual_costs?select=*&limit=5", "obra custos"],
    ["/rest/v1/pme_project_reports?select=*&limit=5", "relatórios"],
    ["/rest/v1/pme_notifications?select=*&limit=5", "notificações"]
  ];
  for (const [path, label] of checks) {
    const result = await userRequest(noFinanceToken, "GET", path);
    const text = JSON.stringify(removeHiddenFields(result.body)).toLowerCase();
    const passed = result.status < 400 && !containsSensitiveTerm(text);
    report.financialPermissions.push({
      label,
      status: result.status,
      passed,
      body: safeBody(result.body)
    });
    if (!passed) {
      report.failures.push({
        area: "financial-permission",
        label,
        status: result.status,
        body: safeBody(result.body)
      });
    }
  }
}

async function validateStorage(adminAToken, adminBToken, ids) {
  const bucketRows = await serviceStorageBuckets();
  for (const bucket of requiredBuckets) {
    const bucketRow = bucketRows.find((row) => row.id === bucket);
    const privateBucket = bucketRow?.public === false;
    if (!privateBucket) {
      report.failures.push({
        area: "storage",
        bucket,
        operation: "private-check",
        public: bucketRow?.public
      });
    }

    const pathA = storagePathFor(
      bucket,
      ORG_A,
      ids.projectA?.id,
      ids.budgetA?.id,
      ids.dailyLogA?.id
    );
    const upload = await storageUpload(
      adminAToken,
      bucket,
      pathA,
      `storage validation ${RUN_ID} ${bucket}`
    );
    const signedA = await storageSign(adminAToken, bucket, pathA, 10);
    const signedB = await storageSign(adminBToken, bucket, pathA, 60);
    const directB = await storageDownload(adminBToken, bucket, pathA);
    const signedOpen = signedA.url
      ? await fetchSignedUrl(signedA.url)
      : { status: 0, body: "missing signed url" };
    await sleep(12000);
    const expiredOpen = signedA.url
      ? await fetchSignedUrl(signedA.url)
      : { status: 0, body: "missing signed url" };
    const passed =
      privateBucket &&
      upload.status >= 200 &&
      upload.status < 300 &&
      signedA.status >= 200 &&
      signedA.status < 300 &&
      signedOpen.status === 200 &&
      expiredOpen.status >= 400 &&
      signedB.status >= 400 &&
      directB.status >= 400;
    report.storage.push({
      bucket,
      path: pathA,
      privateBucket,
      uploadStatus: upload.status,
      signedAStatus: signedA.status,
      signedOpenStatus: signedOpen.status,
      expiredOpenStatus: expiredOpen.status,
      signedBStatus: signedB.status,
      directBStatus: directB.status,
      passed
    });
    if (!passed) {
      report.failures.push({ area: "storage", bucket, path: pathA });
    }
  }
}

function storagePathFor(bucket, organizationId, projectId, budgetId, dailyLogId) {
  const suffix = `${RUN_ID}-${bucket}.txt`;
  if (bucket === "budget-proposals") {
    return `${organizationId}/budgets/${budgetId ?? "budget"}/proposals/${suffix}`;
  }
  if (bucket === "purchase-attachments") {
    return `${organizationId}/projects/${projectId ?? "project"}/purchases/purchase-${RUN_ID}/attachments/${suffix}`;
  }
  if (bucket === "daily-log-photos") {
    return `${organizationId}/projects/${projectId ?? "project"}/daily_logs/${dailyLogId ?? "daily-log"}/photos/${suffix}`;
  }
  if (bucket === "project-reports") {
    return `${organizationId}/projects/${projectId ?? "project"}/reports/report-${RUN_ID}/exports/${suffix}`;
  }
  return `${organizationId}/projects/${projectId ?? "project"}/${bucket}/${suffix}`;
}

async function serviceUpsert(table, payload, onConflict = "id") {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      ...serviceHeaders,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`service upsert ${table} failed ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function serviceInsert(table, payload) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...serviceHeaders,
      "content-type": "application/json",
      prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`service insert ${table} failed ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function serviceSelect(table, query) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=*&${query}`, {
    headers: serviceHeaders
  });
  if (response.status === 404) {
    return [];
  }
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`service select ${table} failed ${response.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function firstServiceRow(table, organizationId) {
  const rows = await serviceSelect(table, `organization_id=eq.${organizationId}&limit=1`);
  return rows[0] ?? null;
}

async function userRequest(token, method, path, body) {
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    authorization: `Bearer ${token}`,
    prefer: "return=representation"
  };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }
  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: parseBody(text) };
}

async function functionRequest(token, name, body) {
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    "content-type": "application/json"
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${env.SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const text = await response.text();
  return { status: response.status, body: parseBody(text) };
}

async function serviceStorageBuckets() {
  const response = await fetch(`${env.SUPABASE_URL}/storage/v1/bucket`, {
    headers: serviceHeaders
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`bucket list failed ${response.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function storageUpload(token, bucket, path, content) {
  const response = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
        "content-type": "text/plain",
        "x-upsert": "true"
      },
      body: content
    }
  );
  return { status: response.status, body: parseBody(await response.text()) };
}

async function storageSign(token, bucket, path, expiresIn) {
  const response = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encodeURI(path)}`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ expiresIn })
    }
  );
  const body = parseBody(await response.text());
  const signedURL = typeof body?.signedURL === "string" ? body.signedURL : null;
  return {
    status: response.status,
    body,
    url: signedURL?.startsWith("http")
      ? signedURL
      : signedURL
        ? `${env.SUPABASE_URL}/storage/v1${signedURL}`
        : null
  };
}

async function storageDownload(token, bucket, path) {
  const response = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`,
    {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${token}`
      }
    }
  );
  return { status: response.status, body: await response.text() };
}

async function fetchSignedUrl(url) {
  const response = await fetch(url);
  return { status: response.status, body: await response.text() };
}

function buildInsertAttempt(table, sample, userId, ids) {
  if (table === "pme_budget_exports") {
    return null;
  }
  const payload = JSON.parse(JSON.stringify(sample));
  payload.id = randomUUID();
  payload.organization_id = ORG_B;
  if ("created_by" in payload) payload.created_by = userId;
  if ("updated_by" in payload) payload.updated_by = userId;
  if ("generated_by" in payload) payload.generated_by = userId;
  if ("uploaded_by" in payload) payload.uploaded_by = userId;
  if ("actor_user_id" in payload) payload.actor_user_id = userId;
  if ("user_id" in payload) payload.user_id = userId;
  if ("created_at" in payload) delete payload.created_at;
  if ("updated_at" in payload) delete payload.updated_at;
  if ("generated_at" in payload) delete payload.generated_at;
  if ("completed_at" in payload) delete payload.completed_at;
  if ("closed_at" in payload) delete payload.closed_at;
  if ("budget_number" in payload) payload.budget_number = `INSERT-B-${RUN_ID}-${table}`;
  if ("code" in payload) payload.code = `INSERT-B-${RUN_ID}`;
  if ("order_number" in payload) payload.order_number = `INSERT-B-${RUN_ID}`;
  if ("project_id" in payload && ids.projectB?.id) payload.project_id = ids.projectB.id;
  if ("budget_id" in payload && ids.budgetB?.id) payload.budget_id = ids.budgetB.id;
  if ("daily_log_id" in payload && ids.dailyLogB?.id) payload.daily_log_id = ids.dailyLogB.id;
  if ("closeout_id" in payload && ids.closeoutB?.id) payload.closeout_id = ids.closeoutB.id;
  return payload;
}

function buildUpdateAttempt(table) {
  const now = new Date().toISOString();
  const byTable = {
    pme_project_photos: { caption: `cross tenant update ${RUN_ID}` },
    pme_project_attachments: { description: `cross tenant update ${RUN_ID}` },
    pme_project_reports: { description: `cross tenant update ${RUN_ID}` },
    pme_project_report_exports: { html_snapshot: `<p>cross tenant update ${RUN_ID}</p>` },
    axia_runs: { output_summary: `cross tenant update ${RUN_ID}` },
    axia_context_snapshots: { redaction_summary: { crossTenantUpdate: RUN_ID } },
    audit_logs: { metadata: { crossTenantUpdate: RUN_ID } }
  };
  return byTable[table] ?? { updated_at: now };
}

function isEmptyArray(result) {
  return result.status < 400 && Array.isArray(result.body) && result.body.length === 0;
}

function isBlockedOrEmpty(result) {
  return result.status === 401 || result.status === 403 || isEmptyArray(result);
}

function containsSensitiveTerm(text) {
  return sensitiveTerms.some((term) => text.includes(term.toLowerCase()));
}

function removeHiddenFields(value) {
  if (Array.isArray(value)) {
    return value.map(removeHiddenFields);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "hiddenFields")
        .map(([key, nested]) => [key, removeHiddenFields(nested)])
    );
  }
  return value;
}

function safeBody(body) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return text.length > 500 ? `${text.slice(0, 500)}...` : text;
}

function parseBody(text) {
  if (!text) {
    return "";
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function uuid(suffix) {
  return `${BASE_ID_PREFIX}${RUN_ID.slice(8, 14)}${suffix}`;
}

async function writeReport() {
  await mkdir(".codex", { recursive: true });
  await fs.promises.writeFile(
    `.codex/staging-security-e2e-${RUN_ID}.json`,
    JSON.stringify(report, null, 2)
  );
}
