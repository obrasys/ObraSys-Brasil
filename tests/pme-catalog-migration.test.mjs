import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const baseMigrationPath = "supabase/migrations/20260626000200_create_pme_catalog.sql";
const contractMigrationPath = "supabase/migrations/20260626000600_align_pme_catalog_contract.sql";
const typesPath = "src/types/database.ts";

const catalogTables = [
  "pme_catalog_items",
  "pme_catalog_compositions",
  "pme_catalog_composition_items",
  "pme_catalog_kits",
  "pme_catalog_kit_items"
];

const contractTables = [...catalogTables, "pme_catalog_status_history"];

const catalogCategories = [
  "material",
  "mao_de_obra",
  "servico",
  "terceiro",
  "equipamento",
  "transporte",
  "descarte",
  "taxa",
  "composicao",
  "outro"
];

const catalogSourceTypes = [
  "manual",
  "sinapi",
  "supplier_quote",
  "axia_suggestion",
  "imported",
  "budget_item"
];

const kitTypes = [
  "reforma_banheiro",
  "reforma_cozinha",
  "pintura",
  "troca_piso",
  "reforma_apartamento",
  "eletrica",
  "hidraulica",
  "gesso_drywall",
  "telhado",
  "area_externa",
  "manutencao",
  "personalizado"
];

const seedKitNames = [
  "Reforma de Banheiro Econômico",
  "Reforma de Banheiro Médio",
  "Reforma de Banheiro Premium",
  "Reforma de Cozinha",
  "Pintura Apartamento 60m²",
  "Troca de Piso",
  "Reforma de Apartamento",
  "Elétrica Residencial Básica",
  "Hidráulica Residencial Básica",
  "Gesso e Drywall Básico"
];

test("PME catalog base migration creates approved tables with RLS", async () => {
  const sql = await readFile(baseMigrationPath, "utf8");

  for (const table of catalogTables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test("PME catalog contract migration adds required fields, constraints and status history", async () => {
  const sql = await readFile(contractMigrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.pme_catalog_status_history/);
  assert.match(sql, /alter table public\.pme_catalog_status_history enable row level security/);
  assert.match(sql, /add column if not exists category text not null default 'servico'/);
  assert.match(sql, /add column if not exists default_unit_cost numeric\(14, 2\)/);
  assert.match(sql, /add column if not exists default_unit_price numeric\(14, 2\)/);
  assert.match(sql, /add column if not exists default_margin_percentage numeric\(7, 4\)/);
  assert.match(sql, /add column if not exists source_type text not null default 'manual'/);
  assert.match(sql, /alter column catalog_item_id drop not null/);
  assert.match(sql, /drop policy if exists "Managers can delete inactive PME catalog items"/);
  assert.match(
    sql,
    /drop policy if exists "Managers can delete inactive PME catalog compositions"/
  );
  assert.match(sql, /drop policy if exists "Managers can delete inactive PME catalog kits"/);
});

test("PME catalog contract migration includes categories, source types and kit types", async () => {
  const sql = await readFile(contractMigrationPath, "utf8");

  for (const category of catalogCategories) {
    assert.match(sql, new RegExp(`'${category}'`));
  }
  for (const sourceType of catalogSourceTypes) {
    assert.match(sql, new RegExp(`'${sourceType}'`));
  }
  for (const kitType of kitTypes) {
    assert.match(sql, new RegExp(`'${kitType}'`));
  }

  assert.doesNotMatch(sql, /\bfloat\b/i);
  assert.doesNotMatch(sql, /\breal\b/i);
  assert.match(sql, /total_estimated_cost numeric\(14, 2\)/);
  assert.match(sql, /total_estimated_price numeric\(14, 2\)/);
});

test("PME catalog migrations are tenant-scoped and membership-protected", async () => {
  const baseSql = await readFile(baseMigrationPath, "utf8");
  const contractSql = await readFile(contractMigrationPath, "utf8");
  const combinedSql = `${baseSql}\n${contractSql}`;

  for (const table of catalogTables) {
    const tableDefinitionStart = baseSql.indexOf(`create table if not exists public.${table}`);
    assert.notEqual(tableDefinitionStart, -1);
    const nextTableStart = baseSql.indexOf(
      "create table if not exists public.",
      tableDefinitionStart + 1
    );
    const tableDefinition = baseSql.slice(
      tableDefinitionStart,
      nextTableStart === -1 ? baseSql.length : nextTableStart
    );

    assert.match(tableDefinition, /organization_id uuid not null/);
  }

  assert.ok(combinedSql.includes("public.is_organization_member(organization_id)"));
  assert.ok(
    combinedSql.includes(
      "public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])"
    )
  );
  assert.doesNotMatch(combinedSql, /service_role/i);
});

test("PME catalog migration seeds all approved kit templates", async () => {
  const sql = await readFile(contractMigrationPath, "utf8");

  assert.match(sql, /seed_pme_catalog_kits_for_organization/);
  assert.match(sql, /on conflict \(organization_id, name\) do update/);

  for (const kitName of seedKitNames) {
    assert.match(sql, new RegExp(kitName));
  }
});

test("PME catalog TypeScript types cover the approved contract", async () => {
  const types = await readFile(typesPath, "utf8");

  for (const table of contractTables) {
    assert.match(types, new RegExp(`${table}: \\{`));
  }

  assert.match(types, /export type PmeCatalogCategory/);
  assert.match(types, /export type PmeCatalogSourceType/);
  assert.match(types, /export type PmeCatalogKitType/);
  assert.match(types, /export interface PmeCatalogStatusHistoryRow/);
  assert.doesNotMatch(types, /\bany\b/);
});
