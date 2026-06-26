export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PmeBudgetStatus =
  | "draft"
  | "sent"
  | "negotiation"
  | "approved"
  | "rejected"
  | "converted_to_project"
  | "cancelled";
export type PmeBudgetType = "service" | "renovation" | "construction" | "maintenance";
export type PmePricingMode = "margin" | "markup" | "fixed_price";
export type PmeBudgetItemType = "service" | "material" | "labor" | "equipment" | "other";
export type PmeCatalogItemType =
  | "material"
  | "labor"
  | "service"
  | "third_party"
  | "equipment"
  | "transport"
  | "disposal"
  | "fee"
  | "other";
export type PmeCatalogOrigin = "manual" | "sinapi" | "supplier_quote" | "axia_suggestion";
export type SinapiRegime = "desonerado" | "nao_desonerado";
export type SinapiImportStatus = "draft" | "imported" | "failed" | "archived";
export type SinapiInputType =
  | "material"
  | "labor"
  | "equipment"
  | "transport"
  | "service"
  | "other";
export type AxiaPmeTask =
  | "suggest_missing_items"
  | "draft_from_text"
  | "draft_from_renovation_description"
  | "suggest_environments_services"
  | "low_margin_alert"
  | "compare_sinapi_reference"
  | "commercial_proposal_text"
  | "execution_checklist";
export type AxiaRunStatus = "completed" | "failed";
export type AxiaInsightStatus = "draft" | "suggested";
export type AxiaInsightType =
  | "missing_item"
  | "draft_budget"
  | "environment_service"
  | "margin_alert"
  | "sinapi_comparison"
  | "commercial_text"
  | "execution_checklist";
export type OrganizationStatus = "active" | "suspended" | "archived";
export type OrganizationMemberRole = "owner" | "admin" | "manager" | "member" | "viewer";
export type OrganizationMemberStatus = "active" | "invited" | "disabled";
export type ProjectStatus = "planning" | "active" | "paused" | "completed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      organization_members: {
        Row: OrganizationMemberRow;
        Insert: OrganizationMemberInsert;
        Update: OrganizationMemberUpdate;
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      cost_centers: {
        Row: CostCenterRow;
        Insert: CostCenterInsert;
        Update: CostCenterUpdate;
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
      };
      pme_budgets: {
        Row: PmeBudgetRow;
        Insert: PmeBudgetInsert;
        Update: PmeBudgetUpdate;
      };
      pme_budget_environments: {
        Row: PmeBudgetEnvironmentRow;
        Insert: PmeBudgetEnvironmentInsert;
        Update: PmeBudgetEnvironmentUpdate;
      };
      pme_budget_items: {
        Row: PmeBudgetItemRow;
        Insert: PmeBudgetItemInsert;
        Update: PmeBudgetItemUpdate;
      };
      pme_budget_materials: {
        Row: PmeBudgetMaterialRow;
        Insert: PmeBudgetMaterialInsert;
        Update: PmeBudgetMaterialUpdate;
      };
      pme_budget_labor: {
        Row: PmeBudgetLaborRow;
        Insert: PmeBudgetLaborInsert;
        Update: PmeBudgetLaborUpdate;
      };
      pme_budget_payment_terms: {
        Row: PmeBudgetPaymentTermRow;
        Insert: PmeBudgetPaymentTermInsert;
        Update: PmeBudgetPaymentTermUpdate;
      };
      pme_budget_versions: {
        Row: PmeBudgetVersionRow;
        Insert: PmeBudgetVersionInsert;
        Update: PmeBudgetVersionUpdate;
      };
      pme_budget_status_history: {
        Row: PmeBudgetStatusHistoryRow;
        Insert: PmeBudgetStatusHistoryInsert;
        Update: PmeBudgetStatusHistoryUpdate;
      };
      pme_catalog_items: {
        Row: PmeCatalogItemRow;
        Insert: PmeCatalogItemInsert;
        Update: PmeCatalogItemUpdate;
      };
      pme_catalog_compositions: {
        Row: PmeCatalogCompositionRow;
        Insert: PmeCatalogCompositionInsert;
        Update: PmeCatalogCompositionUpdate;
      };
      pme_catalog_composition_items: {
        Row: PmeCatalogCompositionItemRow;
        Insert: PmeCatalogCompositionItemInsert;
        Update: PmeCatalogCompositionItemUpdate;
      };
      pme_catalog_kits: {
        Row: PmeCatalogKitRow;
        Insert: PmeCatalogKitInsert;
        Update: PmeCatalogKitUpdate;
      };
      pme_catalog_kit_items: {
        Row: PmeCatalogKitItemRow;
        Insert: PmeCatalogKitItemInsert;
        Update: PmeCatalogKitItemUpdate;
      };
      sinapi_versions: {
        Row: SinapiVersionRow;
        Insert: SinapiVersionInsert;
        Update: SinapiVersionUpdate;
      };
      sinapi_import_batches: {
        Row: SinapiImportBatchRow;
        Insert: SinapiImportBatchInsert;
        Update: SinapiImportBatchUpdate;
      };
      sinapi_inputs: {
        Row: SinapiInputRow;
        Insert: SinapiInputInsert;
        Update: SinapiInputUpdate;
      };
      sinapi_compositions: {
        Row: SinapiCompositionRow;
        Insert: SinapiCompositionInsert;
        Update: SinapiCompositionUpdate;
      };
      sinapi_composition_items: {
        Row: SinapiCompositionItemRow;
        Insert: SinapiCompositionItemInsert;
        Update: SinapiCompositionItemUpdate;
      };
      sinapi_prices: {
        Row: SinapiPriceRow;
        Insert: SinapiPriceInsert;
        Update: SinapiPriceUpdate;
      };
      pme_saved_sinapi_items: {
        Row: PmeSavedSinapiItemRow;
        Insert: PmeSavedSinapiItemInsert;
        Update: PmeSavedSinapiItemUpdate;
      };
      axia_prompts: {
        Row: AxiaPromptRow;
        Insert: AxiaPromptInsert;
        Update: AxiaPromptUpdate;
      };
      axia_runs: {
        Row: AxiaRunRow;
        Insert: AxiaRunInsert;
        Update: AxiaRunUpdate;
      };
      axia_context_snapshots: {
        Row: AxiaContextSnapshotRow;
        Insert: AxiaContextSnapshotInsert;
        Update: AxiaContextSnapshotUpdate;
      };
      axia_insights: {
        Row: AxiaInsightRow;
        Insert: AxiaInsightInsert;
        Update: AxiaInsightUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_organization_member: {
        Args: {
          target_organization_id: string;
        };
        Returns: boolean;
      };
      has_organization_role: {
        Args: {
          target_organization_id: string;
          allowed_roles: string[];
        };
        Returns: boolean;
      };
      organization_has_members: {
        Args: {
          target_organization_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}

export interface AuditedTenantRow {
  id: string;
  organization_id: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  legal_name: string | null;
  document_number: string | null;
  status: OrganizationStatus;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationInsert = Omit<
  OrganizationRow,
  "id" | "status" | "created_at" | "updated_at" | "updated_by"
> &
  Partial<Pick<OrganizationRow, "id" | "status" | "created_at" | "updated_at" | "updated_by">>;

export type OrganizationUpdate = Partial<Omit<OrganizationInsert, "created_by">>;

export interface ProfileRow {
  id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at"> &
  Partial<Pick<ProfileRow, "created_at" | "updated_at">>;

export type ProfileUpdate = Partial<Omit<ProfileInsert, "id">>;

export interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationMemberInsert = Omit<
  OrganizationMemberRow,
  "id" | "role" | "status" | "created_at" | "updated_at"
> &
  Partial<Pick<OrganizationMemberRow, "id" | "role" | "status" | "created_at" | "updated_at">>;

export type OrganizationMemberUpdate = Partial<
  Omit<OrganizationMemberInsert, "organization_id" | "user_id">
>;

export interface ProjectRow extends AuditedTenantRow {
  name: string;
  code: string | null;
  description: string | null;
  status: ProjectStatus;
  starts_on: string | null;
  ends_on: string | null;
}

export type ProjectInsert = Omit<
  ProjectRow,
  "id" | "status" | "created_at" | "updated_at" | "updated_by"
> &
  Partial<Pick<ProjectRow, "id" | "status" | "created_at" | "updated_at" | "updated_by">>;

export type ProjectUpdate = Partial<Omit<ProjectInsert, "organization_id" | "created_by">>;

export interface CostCenterRow extends AuditedTenantRow {
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_system_default: boolean;
  is_active: boolean;
}

export type CostCenterInsert = Omit<
  CostCenterRow,
  "id" | "is_system_default" | "is_active" | "created_at" | "updated_at" | "updated_by"
> &
  Partial<
    Pick<
      CostCenterRow,
      "id" | "is_system_default" | "is_active" | "created_at" | "updated_at" | "updated_by"
    >
  >;

export type CostCenterUpdate = Partial<Omit<CostCenterInsert, "organization_id" | "created_by">>;

export interface AuditLogRow {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
}

export type AuditLogInsert = Omit<AuditLogRow, "id" | "metadata" | "created_at"> &
  Partial<Pick<AuditLogRow, "id" | "metadata" | "created_at">>;

export type AuditLogUpdate = never;

export interface PmeBudgetRow extends AuditedTenantRow {
  project_id: string | null;
  converted_project_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  work_address: string | null;
  budget_number: string;
  title: string;
  description: string | null;
  budget_type: PmeBudgetType;
  status: PmeBudgetStatus;
  pricing_mode: PmePricingMode;
  subtotal_cost: number;
  overhead_percentage: number;
  tax_percentage: number;
  profit_percentage: number;
  discount_amount: number;
  final_price: number;
  valid_until: string | null;
  approved_at: string | null;
}

export type PmeBudgetInsert = Omit<
  PmeBudgetRow,
  | "id"
  | "budget_type"
  | "status"
  | "pricing_mode"
  | "subtotal_cost"
  | "overhead_percentage"
  | "tax_percentage"
  | "profit_percentage"
  | "discount_amount"
  | "final_price"
  | "created_at"
  | "updated_at"
  | "updated_by"
  | "approved_at"
> &
  Partial<
    Pick<
      PmeBudgetRow,
      | "id"
      | "budget_type"
      | "status"
      | "pricing_mode"
      | "subtotal_cost"
      | "overhead_percentage"
      | "tax_percentage"
      | "profit_percentage"
      | "discount_amount"
      | "final_price"
      | "created_at"
      | "updated_at"
      | "updated_by"
      | "approved_at"
    >
  >;

export type PmeBudgetUpdate = Partial<Omit<PmeBudgetInsert, "organization_id" | "created_by">>;

export interface PmeBudgetEnvironmentRow extends AuditedTenantRow {
  budget_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  subtotal_cost: number;
  final_price: number;
}

export type PmeBudgetEnvironmentInsert = Omit<
  PmeBudgetEnvironmentRow,
  "id" | "sort_order" | "subtotal_cost" | "final_price" | "created_at" | "updated_at" | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetEnvironmentRow,
      | "id"
      | "sort_order"
      | "subtotal_cost"
      | "final_price"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetEnvironmentUpdate = Partial<
  Omit<PmeBudgetEnvironmentInsert, "organization_id" | "budget_id" | "created_by">
>;

export interface PmeBudgetItemRow extends AuditedTenantRow {
  budget_id: string;
  environment_id: string | null;
  item_type: PmeBudgetItemType;
  description: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  subtotal_cost: number;
  unit_price: number;
  final_price: number;
  is_optional: boolean;
  show_on_proposal: boolean;
  sort_order: number;
}

export type PmeBudgetItemInsert = Omit<
  PmeBudgetItemRow,
  | "id"
  | "item_type"
  | "unit"
  | "quantity"
  | "unit_cost"
  | "subtotal_cost"
  | "unit_price"
  | "final_price"
  | "is_optional"
  | "show_on_proposal"
  | "sort_order"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetItemRow,
      | "id"
      | "item_type"
      | "unit"
      | "quantity"
      | "unit_cost"
      | "subtotal_cost"
      | "unit_price"
      | "final_price"
      | "is_optional"
      | "show_on_proposal"
      | "sort_order"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetItemUpdate = Partial<
  Omit<PmeBudgetItemInsert, "organization_id" | "budget_id" | "created_by">
>;

export interface PmeBudgetMaterialRow extends AuditedTenantRow {
  budget_id: string;
  item_id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  subtotal_cost: number;
  supplier_name: string | null;
}

export type PmeBudgetMaterialInsert = Omit<
  PmeBudgetMaterialRow,
  | "id"
  | "unit"
  | "quantity"
  | "unit_cost"
  | "subtotal_cost"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetMaterialRow,
      | "id"
      | "unit"
      | "quantity"
      | "unit_cost"
      | "subtotal_cost"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetMaterialUpdate = Partial<
  Omit<PmeBudgetMaterialInsert, "organization_id" | "budget_id" | "item_id" | "created_by">
>;

export interface PmeBudgetLaborRow extends AuditedTenantRow {
  budget_id: string;
  item_id: string;
  role_name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  subtotal_cost: number;
}

export type PmeBudgetLaborInsert = Omit<
  PmeBudgetLaborRow,
  | "id"
  | "unit"
  | "quantity"
  | "unit_cost"
  | "subtotal_cost"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetLaborRow,
      | "id"
      | "unit"
      | "quantity"
      | "unit_cost"
      | "subtotal_cost"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetLaborUpdate = Partial<
  Omit<PmeBudgetLaborInsert, "organization_id" | "budget_id" | "item_id" | "created_by">
>;

export interface PmeBudgetPaymentTermRow extends AuditedTenantRow {
  budget_id: string;
  description: string;
  due_offset_days: number;
  amount: number | null;
  percentage: number | null;
  sort_order: number;
}

export type PmeBudgetPaymentTermInsert = Omit<
  PmeBudgetPaymentTermRow,
  "id" | "due_offset_days" | "sort_order" | "created_at" | "updated_at" | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetPaymentTermRow,
      "id" | "due_offset_days" | "sort_order" | "created_at" | "updated_at" | "updated_by"
    >
  >;

export type PmeBudgetPaymentTermUpdate = Partial<
  Omit<PmeBudgetPaymentTermInsert, "organization_id" | "budget_id" | "created_by">
>;

export interface PmeBudgetVersionRow {
  id: string;
  organization_id: string;
  budget_id: string;
  version_number: number;
  status: PmeBudgetStatus;
  subtotal_cost: number;
  overhead_percentage: number;
  tax_percentage: number;
  profit_percentage: number;
  discount_amount: number;
  final_price: number;
  proposal_snapshot: Json;
  internal_snapshot: Json;
  created_by: string;
  created_at: string;
}

export type PmeBudgetVersionInsert = Omit<PmeBudgetVersionRow, "id" | "created_at"> &
  Partial<Pick<PmeBudgetVersionRow, "id" | "created_at">>;

export type PmeBudgetVersionUpdate = never;

export interface PmeBudgetStatusHistoryRow {
  id: string;
  organization_id: string;
  budget_id: string;
  from_status: PmeBudgetStatus | null;
  to_status: PmeBudgetStatus;
  notes: string | null;
  changed_by: string;
  changed_at: string;
}

export type PmeBudgetStatusHistoryInsert = Omit<PmeBudgetStatusHistoryRow, "id" | "changed_at"> &
  Partial<Pick<PmeBudgetStatusHistoryRow, "id" | "changed_at">>;

export type PmeBudgetStatusHistoryUpdate = never;

export interface PmeCatalogItemRow extends AuditedTenantRow {
  name: string;
  description: string | null;
  item_type: PmeCatalogItemType;
  origin: PmeCatalogOrigin;
  unit: string;
  unit_cost: number;
  unit_price: number;
  supplier_name: string | null;
  source_reference: string | null;
  metadata: Json;
  is_active: boolean;
}

export type PmeCatalogItemInsert = Omit<
  PmeCatalogItemRow,
  | "id"
  | "origin"
  | "unit"
  | "unit_cost"
  | "unit_price"
  | "metadata"
  | "is_active"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogItemRow,
      | "id"
      | "origin"
      | "unit"
      | "unit_cost"
      | "unit_price"
      | "metadata"
      | "is_active"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogItemUpdate = Partial<
  Omit<PmeCatalogItemInsert, "organization_id" | "created_by">
>;

export interface PmeCatalogCompositionRow extends AuditedTenantRow {
  name: string;
  description: string | null;
  origin: PmeCatalogOrigin;
  unit: string;
  total_cost: number;
  total_price: number;
  metadata: Json;
  is_active: boolean;
}

export type PmeCatalogCompositionInsert = Omit<
  PmeCatalogCompositionRow,
  | "id"
  | "origin"
  | "unit"
  | "total_cost"
  | "total_price"
  | "metadata"
  | "is_active"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogCompositionRow,
      | "id"
      | "origin"
      | "unit"
      | "total_cost"
      | "total_price"
      | "metadata"
      | "is_active"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogCompositionUpdate = Partial<
  Omit<PmeCatalogCompositionInsert, "organization_id" | "created_by">
>;

export interface PmeCatalogCompositionItemRow extends AuditedTenantRow {
  composition_id: string;
  catalog_item_id: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  sort_order: number;
}

export type PmeCatalogCompositionItemInsert = Omit<
  PmeCatalogCompositionItemRow,
  | "id"
  | "quantity"
  | "unit_cost"
  | "unit_price"
  | "sort_order"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogCompositionItemRow,
      | "id"
      | "quantity"
      | "unit_cost"
      | "unit_price"
      | "sort_order"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogCompositionItemUpdate = Partial<
  Omit<
    PmeCatalogCompositionItemInsert,
    "organization_id" | "composition_id" | "catalog_item_id" | "created_by"
  >
>;

export interface PmeCatalogKitRow extends AuditedTenantRow {
  name: string;
  description: string | null;
  category: string;
  suggested_tier: string | null;
  total_cost: number;
  total_price: number;
  is_seed: boolean;
  is_active: boolean;
}

export type PmeCatalogKitInsert = Omit<
  PmeCatalogKitRow,
  | "id"
  | "category"
  | "total_cost"
  | "total_price"
  | "is_seed"
  | "is_active"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogKitRow,
      | "id"
      | "category"
      | "total_cost"
      | "total_price"
      | "is_seed"
      | "is_active"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogKitUpdate = Partial<
  Omit<PmeCatalogKitInsert, "organization_id" | "created_by">
>;

export interface PmeCatalogKitItemRow extends AuditedTenantRow {
  kit_id: string;
  catalog_item_id: string | null;
  composition_id: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  sort_order: number;
}

export type PmeCatalogKitItemInsert = Omit<
  PmeCatalogKitItemRow,
  | "id"
  | "quantity"
  | "unit_cost"
  | "unit_price"
  | "sort_order"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogKitItemRow,
      | "id"
      | "quantity"
      | "unit_cost"
      | "unit_price"
      | "sort_order"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogKitItemUpdate = Partial<
  Omit<PmeCatalogKitItemInsert, "organization_id" | "kit_id" | "created_by">
>;

export interface SinapiVersionRow {
  id: string;
  state_code: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  source_label: string;
  published_at: string | null;
  created_at: string;
}

export type SinapiVersionInsert = Omit<SinapiVersionRow, "id" | "regime" | "created_at"> &
  Partial<Pick<SinapiVersionRow, "id" | "regime" | "created_at">>;

export type SinapiVersionUpdate = never;

export interface SinapiImportBatchRow {
  id: string;
  version_id: string;
  state_code: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  source_file_name: string | null;
  status: SinapiImportStatus;
  imported_by: string | null;
  imported_at: string | null;
  created_at: string;
}

export type SinapiImportBatchInsert = Omit<SinapiImportBatchRow, "id" | "status" | "created_at"> &
  Partial<Pick<SinapiImportBatchRow, "id" | "status" | "created_at">>;

export type SinapiImportBatchUpdate = never;

export interface SinapiInputRow {
  id: string;
  code: string;
  description: string;
  input_type: SinapiInputType;
  unit: string;
  created_at: string;
}

export type SinapiInputInsert = Omit<SinapiInputRow, "id" | "created_at"> &
  Partial<Pick<SinapiInputRow, "id" | "created_at">>;

export type SinapiInputUpdate = never;

export interface SinapiCompositionRow {
  id: string;
  code: string;
  description: string;
  unit: string;
  category: string | null;
  created_at: string;
}

export type SinapiCompositionInsert = Omit<SinapiCompositionRow, "id" | "created_at"> &
  Partial<Pick<SinapiCompositionRow, "id" | "created_at">>;

export type SinapiCompositionUpdate = never;

export interface SinapiCompositionItemRow {
  id: string;
  composition_id: string;
  input_id: string;
  quantity: number;
  unit: string;
  item_role: "component" | "labor" | "material" | "equipment" | "other";
  created_at: string;
}

export type SinapiCompositionItemInsert = Omit<
  SinapiCompositionItemRow,
  "id" | "item_role" | "created_at"
> &
  Partial<Pick<SinapiCompositionItemRow, "id" | "item_role" | "created_at">>;

export type SinapiCompositionItemUpdate = never;

export interface SinapiPriceRow {
  id: string;
  version_id: string;
  state_code: string;
  reference_month: number;
  reference_year: number;
  composition_id: string | null;
  input_id: string | null;
  unit_cost: number;
  source_label: string;
  created_at: string;
}

export type SinapiPriceInsert = Omit<SinapiPriceRow, "id" | "created_at"> &
  Partial<Pick<SinapiPriceRow, "id" | "created_at">>;

export type SinapiPriceUpdate = never;

export interface PmeSavedSinapiItemRow {
  id: string;
  organization_id: string;
  budget_id: string;
  budget_item_id: string | null;
  catalog_item_id: string | null;
  sinapi_composition_id: string;
  sinapi_version_id: string;
  sinapi_code: string;
  sinapi_description: string;
  state_code: string;
  reference_month: number;
  reference_year: number;
  original_unit_cost: number;
  adapted_unit_price: number;
  quantity: number;
  productivity_factor: number;
  waste_percentage: number;
  margin_percentage: number;
  snapshot: Json;
  created_by: string;
  used_at: string;
}

export type PmeSavedSinapiItemInsert = Omit<PmeSavedSinapiItemRow, "id" | "used_at" | "snapshot"> &
  Partial<Pick<PmeSavedSinapiItemRow, "id" | "used_at" | "snapshot">>;

export type PmeSavedSinapiItemUpdate = never;

export interface AxiaPromptRow {
  id: string;
  prompt_key: string;
  version: number;
  title: string;
  system_prompt: string;
  response_schema: Json;
  is_active: boolean;
  created_at: string;
}

export type AxiaPromptInsert = Omit<AxiaPromptRow, "id" | "is_active" | "created_at"> &
  Partial<Pick<AxiaPromptRow, "id" | "is_active" | "created_at">>;

export type AxiaPromptUpdate = never;

export interface AxiaRunRow {
  id: string;
  organization_id: string;
  budget_id: string | null;
  prompt_id: string;
  task: AxiaPmeTask;
  status: AxiaRunStatus;
  model: string;
  created_by: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export type AxiaRunInsert = Omit<
  AxiaRunRow,
  "id" | "status" | "model" | "started_at" | "completed_at" | "error_message"
> &
  Partial<
    Pick<AxiaRunRow, "id" | "status" | "model" | "started_at" | "completed_at" | "error_message">
  >;

export type AxiaRunUpdate = never;

export interface AxiaContextSnapshotRow {
  id: string;
  organization_id: string;
  run_id: string;
  budget_id: string | null;
  purpose: string;
  sanitized_context: Json;
  removed_fields: Json;
  created_at: string;
}

export type AxiaContextSnapshotInsert = Omit<AxiaContextSnapshotRow, "id" | "created_at"> &
  Partial<Pick<AxiaContextSnapshotRow, "id" | "created_at">>;

export type AxiaContextSnapshotUpdate = never;

export interface AxiaInsightRow {
  id: string;
  organization_id: string;
  run_id: string;
  budget_id: string | null;
  insight_type: AxiaInsightType;
  status: AxiaInsightStatus;
  title: string;
  summary: string;
  evidence: Json;
  suggested_payload: Json;
  created_at: string;
}

export type AxiaInsightInsert = Omit<AxiaInsightRow, "id" | "status" | "created_at"> &
  Partial<Pick<AxiaInsightRow, "id" | "status" | "created_at">>;

export type AxiaInsightUpdate = never;
