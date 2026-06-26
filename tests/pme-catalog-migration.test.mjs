import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationPath = "supabase/migrations/20260626000200_create_pme_catalog.sql";
const typesPath = "src/types/database.ts";

const catalogTables = [
  "pme_catalog_items",
  "pme_catalog_compositions",
  "pme_catalog_composition_items",
  "pme_catalog_kits",
  "pme_catalog_kit_items"
];

const catalogItemTypes = [
  "material",
  "labor",
  "service",
  "third_party",
  "equipment",
  "transport",
  "disposal",
  "fee",
  "other"
];

const catalogOrigins = ["manual", "sinapi", "supplier_quote", "axia_suggestion"];

const seedKitNames = [
  "Reforma de Banheiro Econômico",
  "Reforma de Banheiro Médio",
  "Reforma de Banheiro Premium",
  "Pintura Apartamento 60m²",
  "Troca de Piso",
  "Reforma de Cozinha"
];

test("PME catalog migration creates all approved tables with RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of catalogTables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test("PME catalog tables are tenant-scoped and membership-protected", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of catalogTables) {
    const tableDefinitionStart = sql.indexOf(`create table if not exists public.${table}`);
    assert.notEqual(tableDefinitionStart, -1);

    const nextTableStart = sql.indexOf(
      "create table if not exists public.",
      tableDefinitionStart + 1
    );
    const tableDefinition = sql.slice(
      tableDefinitionStart,
      nextTableStart === -1 ? sql.length : nextTableStart
    );

    assert.match(tableDefinition, /organization_id uuid not null/);
    assert.match(tableDefinition, /created_by uuid not null/);
  }

  assert.ok(sql.includes("public.is_organization_member(organization_id)"));
  assert.ok(
    sql.includes(
      "public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])"
    )
  );
  assert.doesNotMatch(sql, /service_role/i);
});

test("PME catalog migration includes item types, origins, numeric money and cross-tenant FKs", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const itemType of catalogItemTypes) {
    assert.match(sql, new RegExp(`'${itemType}'`));
  }

  for (const origin of catalogOrigins) {
    assert.match(sql, new RegExp(`'${origin}'`));
  }

  assert.doesNotMatch(sql, /\bfloat\b/i);
  assert.doesNotMatch(sql, /\breal\b/i);
  assert.match(sql, /unit_cost numeric\(14, 2\)/);
  assert.match(sql, /unit_price numeric\(14, 2\)/);
  assert.match(sql, /total_cost numeric\(14, 2\)/);
  assert.match(sql, /total_price numeric\(14, 2\)/);
  assert.match(sql, /foreign key \(\s*organization_id,\s*composition_id\s*\)/);
  assert.match(sql, /foreign key \(\s*organization_id,\s*catalog_item_id\s*\)/);
  assert.match(sql, /foreign key \(organization_id, kit_id\)/);
});

test("PME catalog migration seeds initial kit templates", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /seed_pme_catalog_kits_for_organization/);
  assert.match(sql, /organizations_seed_pme_catalog_kits/);
  assert.match(sql, /select public\.seed_pme_catalog_kits_for_organization\(id, created_by\)/);
  assert.match(
    sql,
    /revoke execute on function public\.seed_pme_catalog_kits_for_organization\(uuid, uuid\)/
  );

  for (const kitName of seedKitNames) {
    assert.match(sql, new RegExp(kitName));
  }
});

test("PME catalog TypeScript types cover all approved tables", async () => {
  const types = await readFile(typesPath, "utf8");

  for (const table of catalogTables) {
    assert.match(types, new RegExp(`${table}: \\{`));
  }

  assert.match(types, /export type PmeCatalogItemType/);
  assert.match(types, /export type PmeCatalogOrigin/);
  assert.doesNotMatch(types, /\bany\b/);
});
