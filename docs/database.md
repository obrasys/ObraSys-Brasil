# Database — Obra Sys Brasil

## Escopo atual

Este documento descreve o estado atual do banco no repositório.

Existem migrations para:

- Core SaaS multi-tenant
- Fase 1 do módulo Orçamentos PME Brasil
- Meu Catálogo do módulo Orçamentos PME Brasil
- SINAPI simplificado para Orçamentos PME
- Axia PME Assistant

O Core deve ser aplicado antes das tabelas PME.

## Core SaaS multi-tenant

Migration:

- `supabase/migrations/20260626000000_create_core_multi_tenant.sql`

Tabelas:

- `organizations`
- `profiles`
- `organization_members`
- `projects`
- `cost_centers`
- `audit_logs`

### organizations

Representa uma empresa cliente do SaaS.

Campos principais:

- `id`
- `name`
- `legal_name`
- `document_number`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

Status permitidos:

- `active`
- `suspended`
- `archived`

### profiles

Perfil do usuário autenticado em `auth.users`.

Campos principais:

- `id`
- `full_name`
- `display_name`
- `phone`
- `created_at`
- `updated_at`

### organization_members

Vincula usuários a organizações.

Campos principais:

- `organization_id`
- `user_id`
- `role`
- `status`
- `invited_by`

Papéis permitidos:

- `owner`
- `admin`
- `manager`
- `member`
- `viewer`

Status permitidos:

- `active`
- `invited`
- `disabled`

### projects

Projeto/obra pertencente a uma organização.

Campos principais:

- `organization_id`
- `name`
- `code`
- `description`
- `status`
- `starts_on`
- `ends_on`

### cost_centers

Centro de custo pertencente a uma organização.

Cada nova organização recebe automaticamente os centros de custo padrão do Brasil:

- `CC-1000` Terreno e Aquisições
- `CC-2000` Custos Diretos
- `CC-2100` Infraestrutura e Estrutura
- `CC-2200` Arquitetura e Acabamentos
- `CC-2300` Instalações Elétricas e Hidráulicas
- `CC-3000` Custo Indireto
- `CC-4000` Custos Administrativos da Obra
- `CC-5000` Comercial e Marketing
- `CC-6000` Receitas de Vendas
- `CC-7000` Contingência
- `CC-8000` Impostos, Taxas e Legalização

Centros padrão usam `is_system_default = true` e não podem ser apagados pelas policies.

### audit_logs

Registro append-only de eventos relevantes.

Campos principais:

- `organization_id`
- `actor_user_id`
- `action`
- `entity_table`
- `entity_id`
- `metadata`
- `created_at`

Usuários autenticados membros podem inserir logs da própria organização. Não há policy de update/delete.

## Funções auxiliares

- `public.is_organization_member(target_organization_id uuid)`
- `public.has_organization_role(target_organization_id uuid, allowed_roles text[])`
- `public.organization_has_members(target_organization_id uuid)`

As funções usam `security definer` com `search_path = public` para evitar recursão de RLS e padronizar autorização por membership.

Fase 1 cobre apenas:

- `pme_budgets`
- `pme_budget_environments`
- `pme_budget_items`
- `pme_budget_materials`
- `pme_budget_labor`
- `pme_budget_payment_terms`
- `pme_budget_versions`
- `pme_budget_status_history`

Fora de escopo nesta fase:

- Frontend
- Axia
- SINAPI
- Motor financeiro completo
- Conversão de orçamento aprovado em obra

## Orçamentos PME Fase 1

Migration:

- `supabase/migrations/20260626000100_create_pme_budgets_phase_1.sql`
- `supabase/migrations/20260626000500_align_pme_budgets_phase_1_contract.sql`

Fase 1 cobre apenas:

- `pme_budgets`
- `pme_budget_environments`
- `pme_budget_items`
- `pme_budget_materials`
- `pme_budget_labor`
- `pme_budget_payment_terms`
- `pme_budget_versions`
- `pme_budget_status_history`

## Regras gerais PME

- Todas as tabelas PME têm `organization_id`.
- Todas as tabelas PME têm RLS ativo.
- Todas as tabelas PME têm `created_by`, `updated_by`, `created_at` e `updated_at`.
- Tabelas append-only como versões e histórico não têm update/delete por policy.
- Valores monetários usam `numeric`, nunca `float`, `real` ou `double precision`.
- Tabelas filhas usam FKs compostas com `organization_id` para impedir vínculo cross-tenant com registros pai.
- Cálculos financeiros oficiais completos ainda não estão implementados nesta fase, mas campos críticos já ficam persistidos no banco.
- Tabelas internas de orçamento PME guardam custo, margem e snapshots internos; leitura completa deve ficar restrita a `owner`, `admin` e `manager`.
- A futura proposta ao cliente deve ser gerada por view/RPC sanitizada, sem custo interno, margem, preço mínimo ou `internal_snapshot`.

## Tabelas PME

### pme_budgets

Tabela raiz do orçamento PME.

## Relatorios PME e Fecho Simples da Obra

Migration:

- `supabase/migrations/20260627000400_create_pme_project_reports_closeout.sql`

Tabelas:

- `pme_project_closeouts`
- `pme_project_closeout_checklist_items`
- `pme_project_closeout_snapshots`
- `pme_project_reports`
- `pme_project_report_exports`
- `pme_project_report_settings`

Regras principais:

- todas as tabelas têm `organization_id` e RLS ativo;
- relacionamentos com `projects`, closeouts e relatórios usam FK composta com `organization_id`;
- valores monetários usam `numeric(14, 2)`;
- relatórios internos/management podem conter custo interno e lucro somente para perfis autorizados;
- relatórios `client` devem usar `data_snapshot` sanitizado sem custo interno, margem, lucro,
  fornecedores internos, notas internas ou audit logs;
- snapshots de fecho são append-only e preservam o estado consolidado da obra no momento do fecho;
- exports guardam `html_snapshot` ou `file_url`, sem exigir PDF avançado nesta fase.

## Dashboard PME e Visao Multi-Obras

Migration:

- `supabase/migrations/20260627000500_create_pme_dashboard.sql`

Tabelas:

- `pme_dashboard_snapshots`
- `pme_dashboard_alerts`
- `pme_dashboard_user_preferences`

Regras principais:

- todas as tabelas têm `organization_id` e RLS ativo;
- snapshots guardam agregados financeiros e operacionais por organização;
- alertas guardam tipo, severidade, status e origem opcional por `source_table/source_id`;
- índice único parcial evita alerta aberto duplicado para a mesma condição;
- preferências são por `organization_id` e `user_id`;
- lucro, margem e custo interno devem ser ocultados no serviço/UI para perfis sem permissão;
- ações críticas de alertas devem registrar `audit_logs`.

## Notificacoes, Lembretes e Alertas PME

Migration:

- `supabase/migrations/20260627000600_create_pme_notifications.sql`

Tabelas:

- `pme_notifications`
- `pme_notification_preferences`
- `pme_notification_rules`
- `pme_notification_events`
- `pme_notification_deliveries`
- `pme_notification_status_history`

Regras principais:

- todas as tabelas têm `organization_id` e RLS ativo;
- notificações podem ser por usuário ou gerais da organização;
- `action_url` aceita apenas rotas internas `/app/`;
- índice único parcial evita notificação ativa duplicada para o mesmo problema;
- preferências são por usuário, organização e tipo de notificação;
- deliveries incluem `email` e `push`, mas nesta fase a entrega funcional é apenas `in_app`;
- eventos e histórico preservam rastreabilidade de leitura, resolução, arquivamento e dispensa.

Campos principais:

- `organization_id`
- `project_id`
- `converted_project_id`
- `created_by`
- `updated_by`
- `client_name`
- `client_phone`
- `client_email`
- `work_address`
- `budget_number`
- `title`
- `description`
- `budget_type`
- `status`
- `pricing_mode`
- `valid_until`
- `subtotal_cost`
- `overhead_percentage`
- `tax_percentage`
- `profit_percentage`
- `discount_amount`
- `final_price`
- `approved_at`

Status permitidos:

- `draft`
- `sent`
- `negotiation`
- `approved`
- `rejected`
- `converted_to_project`
- `cancelled`

Observações:

- `subtotal_cost` representa custo interno.
- `final_price` representa preço de venda.
- `overhead_percentage`, `tax_percentage`, `profit_percentage` e `discount_amount` dão suporte à precificação inicial.
- A regra oficial completa de cálculo financeiro será definida em fase posterior.
- A proposta para cliente deve usar dados de venda e nunca expor margem interna.

### pme_budget_environments

Ambientes ou etapas do orçamento.

Relações:

- pertence a `pme_budgets`
- mantém o mesmo `organization_id` do orçamento pai

Campos principais:

- `budget_id`
- `name`
- `description`
- `sort_order`
- `subtotal_cost`
- `subtotal_price`
- `final_price`

### pme_budget_items

Itens do orçamento, ligados ao orçamento e opcionalmente a um ambiente.

Relações:

- pertence a `pme_budgets`
- pode pertencer a `pme_budget_environments`
- mantém o mesmo `organization_id` do orçamento pai

Campos principais:

- `budget_id`
- `environment_id`
- `cost_center_id`
- `item_code`
- `item_type`
- `category`
- `source_type`
- `source_reference_id`
- `description`
- `unit`
- `quantity`
- `unit_cost`
- `subtotal_cost`
- `unit_price`
- `final_price`
- `waste_percentage`
- `margin_percentage`
- `total_cost`
- `total_price`
- `is_optional`
- `show_on_proposal`
- `sort_order`
- `notes`

Categorias permitidas em `category`:

- `material`
- `mao_de_obra`
- `servico`
- `terceiro`
- `equipamento`
- `transporte`
- `descarte`
- `taxa`
- `outro`

Origens permitidas em `source_type`:

- `manual`
- `meu_catalogo`
- `sinapi`
- `kit`
- `axia_suggestion`
- `supplier_quote`

SINAPI e Axia ficam fora da Fase 1.

### pme_budget_materials

Materiais vinculados ao orçamento e opcionalmente a um item.

Campos principais:

- `budget_id`
- `budget_item_id`
- `description`
- `quantity`
- `unit`
- `unit_cost`
- `waste_percentage`
- `total_cost`
- `supplier_name`
- `purchase_status`

Status de compra permitidos:

- `not_purchased`
- `quoted`
- `purchased`
- `delivered`
- `used`

### pme_budget_labor

Mão de obra vinculada ao orçamento e opcionalmente a um item.

Campos principais:

- `budget_id`
- `budget_item_id`
- `labor_type`
- `worker_name`
- `quantity`
- `unit`
- `unit_cost`
- `days`
- `total_cost`
- `contract_type`

### pme_budget_payment_terms

Condições de pagamento do orçamento.

Campos principais:

- `budget_id`
- `installment_number`
- `description`
- `percentage`
- `amount`
- `due_condition`
- `due_date`

## Meu Catálogo PME

Migration:

- `supabase/migrations/20260626000200_create_pme_catalog.sql`
- `supabase/migrations/20260626000600_align_pme_catalog_contract.sql`

O Meu Catálogo permite que cada organização guarde itens, composições e kits próprios para reutilização em novos orçamentos PME.

Tabelas:

- `pme_catalog_items`
- `pme_catalog_compositions`
- `pme_catalog_composition_items`
- `pme_catalog_kits`
- `pme_catalog_kit_items`
- `pme_catalog_status_history`

Regras gerais:

- todas as tabelas têm `organization_id` e RLS ativo;
- dados de custo, preço sugerido e margem padrão são internos da organização;
- registros usados em orçamentos antigos devem ser desativados com `is_active = false`, não apagados;
- `pme_catalog_status_history` registra mudanças de ativo/inativo para itens, composições e kits;
- itens vindos de SINAPI, fornecedor, Axia ou orçamento são suportados como origem, mas nenhum deles altera orçamento antigo automaticamente.

### pme_catalog_items

Itens reutilizáveis do catálogo da organização.

Campos principais:

- `organization_id`
- `name`
- `description`
- `item_type`
- `category`
- `origin`
- `source_type`
- `source_reference_id`
- `sinapi_code`
- `uf`
- `reference_month`
- `reference_year`
- `unit`
- `unit_cost`
- `unit_price`
- `default_unit_cost`
- `default_unit_price`
- `default_margin_percentage`
- `supplier_name`
- `source_reference`
- `metadata`
- `is_active`

Tipos permitidos:

- `material`
- `labor`
- `service`
- `third_party`
- `equipment`
- `transport`
- `disposal`
- `fee`
- `other`

Categorias oficiais:

- `material`
- `mao_de_obra`
- `servico`
- `terceiro`
- `equipamento`
- `transporte`
- `descarte`
- `taxa`
- `composicao`
- `outro`

Origens permitidas:

- `manual`
- `sinapi`
- `supplier_quote`
- `axia_suggestion`

Source types oficiais:

- `manual`
- `sinapi`
- `supplier_quote`
- `axia_suggestion`
- `imported`
- `budget_item`

Observações:

- `unit_cost` representa custo interno e não deve aparecer em proposta para cliente sem permissão adequada.
- `unit_price` representa preço de venda sugerido.
- `default_unit_cost`, `default_unit_price` e `default_margin_percentage` são usados para reutilização em novos orçamentos.
- Itens editados no orçamento podem ser salvos no catálogo pela Edge Function `pme-catalog-save-budget-item`.
- `is_active = false` deve ser usado para desativar itens sem apagar histórico.

### pme_catalog_compositions

Composições próprias da organização, formadas por itens do catálogo.

Relações:

- pertence a `organizations`
- contém linhas em `pme_catalog_composition_items`

Campos principais:

- `name`
- `description`
- `origin`
- `unit`
- `total_cost`
- `total_price`
- `total_unit_cost`
- `total_unit_price`
- `default_margin_percentage`
- `metadata`
- `is_active`

### pme_catalog_composition_items

Itens dentro de uma composição.

Relações:

- pertence a `pme_catalog_compositions`
- referencia `pme_catalog_items`
- usa FK composta com `organization_id` para evitar vínculo cross-tenant

Campos principais:

- `composition_id`
- `catalog_item_id` nullable
- `description`
- `category`
- `quantity`
- `unit`
- `unit_cost`
- `unit_price`
- `total_cost`
- `total_price`
- `sort_order`

### pme_catalog_kits

Kits reutilizáveis para acelerar o orçamento PME.

Campos principais:

- `name`
- `description`
- `category`
- `kit_type`
- `default_environment`
- `suggested_tier`
- `total_cost`
- `total_price`
- `total_estimated_cost`
- `total_estimated_price`
- `is_seed`
- `is_active`

Tipos oficiais de kit:

- `reforma_banheiro`
- `reforma_cozinha`
- `pintura`
- `troca_piso`
- `reforma_apartamento`
- `eletrica`
- `hidraulica`
- `gesso_drywall`
- `telhado`
- `area_externa`
- `manutencao`
- `personalizado`

Kits iniciais criados para cada organização:

- Reforma de Banheiro Econômico
- Reforma de Banheiro Médio
- Reforma de Banheiro Premium
- Reforma de Cozinha
- Pintura Apartamento 60m²
- Troca de Piso
- Reforma de Apartamento
- Elétrica Residencial Básica
- Hidráulica Residencial Básica
- Gesso e Drywall Básico

### pme_catalog_kit_items

Itens dentro de um kit.

Relações:

- pertence a `pme_catalog_kits`
- referencia um item do catálogo ou uma composição, nunca ambos ao mesmo tempo
- usa FKs compostas com `organization_id` para evitar vínculo cross-tenant

Campos principais:

- `kit_id`
- `catalog_item_id`
- `composition_id`
- `description`
- `category`
- `quantity`
- `unit`
- `unit_cost`
- `unit_price`
- `total_cost`
- `total_price`
- `sort_order`
- `is_optional`

### pme_catalog_status_history

Histórico append-only para mudanças de status do catálogo.

Campos principais:

- `organization_id`
- `entity_type`
- `entity_id`
- `from_status`
- `to_status`
- `notes`
- `changed_by`
- `changed_at`

Valores permitidos:

- `entity_type`: `item`, `composition`, `kit`
- status: `active`, `inactive`

### Serviços e Edge Functions do catálogo

Serviços TypeScript em `packages/domain/src/pme/catalog.ts`:

- `createCatalogItem`, `updateCatalogItem`, `deactivateCatalogItem`, `listCatalogItems`, `getCatalogItemById`
- `createCatalogComposition`, `updateCatalogComposition`, `deactivateCatalogComposition`, `listCatalogCompositions`
- `createCatalogKit`, `updateCatalogKit`, `deactivateCatalogKit`, `listCatalogKits`
- `saveBudgetItemToCatalog`
- `addCatalogItemToBudget`
- `addCatalogKitToBudget`

Edge Functions:

- `pme-catalog-save-budget-item`
- `pme-catalog-add-item-to-budget`
- `pme-catalog-add-kit-to-budget`

As Edge Functions validam usuário autenticado, derivam a organização do orçamento/catálogo no banco, validam papel de `owner`, `admin` ou `manager`, gravam `audit_logs` e não aceitam `organization_id` como fonte de autorização no body.

## SINAPI Simplificado

Migration:

- `supabase/migrations/20260626000300_create_sinapi_simplified.sql`

O SINAPI entra como referência técnica e de custo opcional para Orçamentos PME. Ele não é obrigatório para criar orçamento e não deve substituir a decisão comercial do pequeno construtor.

Tabelas públicas de referência:

- `sinapi_states`
- `sinapi_versions`
- `sinapi_import_batches`
- `sinapi_compositions`
- `sinapi_composition_items`
- `sinapi_inputs`
- `sinapi_prices`

Tabela tenant-scoped de snapshot:

- `pme_saved_sinapi_items`
- `pme_budget_sinapi_snapshots`

Migration de alinhamento:

- `supabase/migrations/20260626000700_align_sinapi_simplified_contract.sql`

Ela adiciona o contrato canônico com `uf`, `regime`, status publicado/processando, custos
originais por composição e snapshots separados por orçamento.

### sinapi_states

Lista UFs e regiões disponíveis para busca.

Campos principais:

- `uf`
- `name`
- `region`
- `is_active`

### sinapi_versions

Versiona a referência SINAPI por UF, mês, ano e regime.

Campos principais:

- `state_code`
- `reference_month`
- `reference_year`
- `regime`
- `source_label`
- `published_at`

### sinapi_import_batches

Registra lotes de importação SINAPI. Nesta fase há apenas estrutura e dados mínimos de exemplo, sem importador automático.

Campos principais:

- `version_id`
- `state_code`
- `reference_month`
- `reference_year`
- `regime`
- `source_file_name`
- `status`
- `imported_by`
- `imported_at`

### sinapi_inputs

Insumos públicos de referência.

Campos principais:

- `code`
- `description`
- `input_type`
- `unit`

### sinapi_compositions

Composições públicas de referência.

Campos principais:

- `code`
- `description`
- `unit`
- `category`

### sinapi_composition_items

Itens/insumos que compõem uma composição SINAPI.

Campos principais:

- `composition_id`
- `input_id`
- `quantity`
- `unit`
- `item_role`

### sinapi_prices

Preços por versão, UF e mês/ano.

Campos principais:

- `version_id`
- `state_code`
- `reference_month`
- `reference_year`
- `composition_id`
- `input_id`
- `unit_cost`
- `source_label`

### pme_saved_sinapi_items

Item SINAPI adaptado e salvo pela organização para reutilização.

Campos obrigatórios de rastreabilidade:

- `sinapi_code`
- `sinapi_description`
- `uf`
- `reference_month`
- `reference_year`
- `regime`
- `original_unit`
- `original_total_cost`
- `adapted_description`
- `adapted_unit`
- `adapted_unit_cost`
- `adapted_unit_price`
- `waste_percentage`
- `productivity_adjustment_percentage`
- `margin_percentage`
- `created_by`

### pme_budget_sinapi_snapshots

Snapshot imutável do SINAPI usado em um item de orçamento PME.

Campos principais:

- `organization_id`
- `budget_id`
- `budget_item_id`
- `sinapi_composition_id`
- `sinapi_code`
- `sinapi_description`
- `uf`
- `reference_month`
- `reference_year`
- `regime`
- `original_unit`
- `original_total_cost`
- `original_labor_cost`
- `original_material_cost`
- `original_equipment_cost`
- `adapted_description`
- `adapted_unit`
- `adapted_quantity`
- `adapted_unit_cost`
- `adapted_unit_price`
- `waste_percentage`
- `productivity_adjustment_percentage`
- `margin_percentage`
- `snapshot_data`
- `created_by`
- `created_at`

Regras:

- tem `organization_id` e RLS ativo;
- usa FK composta com orçamento e item para evitar vínculo cross-tenant;
- não expõe update/delete comum;
- atualizações futuras do SINAPI não alteram o snapshot.

Campos de adaptação:

- `quantity`
- `productivity_factor`
- `waste_percentage`
- `margin_percentage`
- `snapshot`

Regras:

- atualização futura do SINAPI não altera orçamento antigo;
- o snapshot fica vinculado à organização e ao orçamento;
- não há policy de update/delete para snapshots;
- misturar UF ou mês/ano em um mesmo orçamento deve gerar aviso na UI;
- valores monetários usam `numeric`.

### pme_budget_materials

Materiais associados a um item.

Relações:

- pertence a `pme_budgets`
- pertence a `pme_budget_items`
- mantém o mesmo `organization_id` do orçamento e item pai

Campos principais:

- `item_id`
- `description`
- `unit`
- `quantity`
- `unit_cost`
- `subtotal_cost`
- `supplier_name`

### pme_budget_labor

Mão de obra associada a um item.

Relações:

- pertence a `pme_budgets`
- pertence a `pme_budget_items`
- mantém o mesmo `organization_id` do orçamento e item pai

Campos principais:

- `item_id`
- `role_name`
- `unit`
- `quantity`
- `unit_cost`
- `subtotal_cost`

### pme_budget_payment_terms

Condições de pagamento do orçamento.

Relações:

- pertence a `pme_budgets`
- mantém o mesmo `organization_id` do orçamento pai

Campos principais:

- `budget_id`
- `description`
- `due_offset_days`
- `amount`
- `percentage`
- `sort_order`

Regras:

- Cada condição deve usar `amount` ou `percentage`, nunca ambos.
- `percentage` deve ser maior que 0 e menor ou igual a 100.
- `amount` deve ser maior ou igual a 0.

### pme_budget_versions

Versões imutáveis do orçamento.

Relações:

- pertence a `pme_budgets`
- mantém o mesmo `organization_id` do orçamento pai

Campos principais:

- `version_number`
- `status`
- `subtotal_cost`
- `overhead_percentage`
- `tax_percentage`
- `profit_percentage`
- `discount_amount`
- `final_price`
- `proposal_snapshot`
- `internal_snapshot`
- `created_by`
- `created_at`

`proposal_snapshot` deve conter somente informações apropriadas para cliente. `internal_snapshot` pode conter custo/margem e deve ser tratado como sensível.

### pme_budget_status_history

Histórico append-only de mudança de status.

Relações:

- pertence a `pme_budgets`
- mantém o mesmo `organization_id` do orçamento pai

Campos principais:

- `from_status`
- `to_status`
- `notes`
- `changed_by`
- `changed_at`

## RLS

RLS está ativo em todas as tabelas Core e PME.

Regra base:

- usuário autenticado só acessa registros cuja `organization_id` esteja vinculada ao seu `auth.uid()` em `public.organization_members`.

As policies usam:

```sql
exists (
  select 1
  from public.organization_members om
  where om.organization_id = <table>.organization_id
    and om.user_id = auth.uid()
)
```

## Serviço de cálculo PME

Os serviços centralizados do módulo Orçamentos PME ficam em:

- `packages/domain/src/pme/calculatePmeBudget.ts`
- `packages/domain/src/pme/convertToProject.ts`
- `supabase/functions/pme-budget-calculate/index.ts`
- `supabase/functions/pme-budget-convert-to-project/index.ts`
- `packages/domain/src/pme/catalog.ts`
- `packages/domain/src/sinapi/sinapi.ts`

O frontend pode usar o serviço para simulação, mas a fonte oficial deve ser o serviço centralizado ou uma chamada backend/Edge Function.
A Edge Function valida o usuário autenticado com `supabase.auth.getUser()` antes de calcular, mesmo sem persistir dados de organização.

Regras implementadas:

- `item_total_cost = quantity * unit_cost`
- `item_total_price = quantity * unit_price`
- `subtotal_cost = soma dos custos internos dos itens, materiais, mão de obra e terceiros`
- `overhead_amount = subtotal_cost * overhead_percentage / 100`
- `tax_amount = subtotal_cost * tax_percentage / 100`
- `profit_amount = subtotal_cost * profit_percentage / 100`
- `final_price = subtotal_cost + overhead_amount + tax_amount + profit_amount - discount_amount`

Dinheiro é recebido como string decimal e convertido internamente para centavos com `bigint`. Quantidades usam escala de 4 casas decimais. Percentuais usam escala de 4 casas decimais. O arredondamento monetário é half-up para centavos.

## Conversão PME para Projeto

Edge Function:

- `pme-budget-convert-to-project`

Fluxo:

- valida o usuário autenticado com `supabase.auth.getUser()`;
- recebe `budgetId`, `confirmed` e campos opcionais seguros de nome/data/observação;
- não aceita `organization_id`, `tenant_id` ou `user_id` no body;
- busca o orçamento via RLS;
- deriva `organization_id` do orçamento;
- valida role `owner`, `admin` ou `manager`;
- exige orçamento com status `approved` e `approved_at`;
- bloqueia conversão duplicada quando `converted_project_id` já existe ou status já é `converted_to_project`;
- cria ou reaproveita `projects` com `source_module = 'pme_budget'` e `source_id = budget_id`;
- usa `calculatePmeBudget` via serviço centralizado para montar previsão inicial;
- persiste snapshot completo em `pme_project_budget_snapshots`;
- cria previsões em `pme_project_cost_forecasts`;
- cria previsões em `pme_project_receivable_forecasts`;
- cria fallback de recebimento 100% se o orçamento não tiver condições de pagamento;
- preserva snapshots SINAPI existentes no `snapshot_data`;
- registra `pme_budget_conversion_logs`;
- atualiza o orçamento para `converted_to_project`;
- registra histórico de status e `audit_log` com ambientes, itens copiados, previsão inicial de custos, previsão inicial de recebimentos e cálculo usado.

Tabelas staging criadas pela migration `20260626000800_create_pme_budget_conversion_to_project.sql`:

- `pme_project_budget_snapshots`
- `pme_project_cost_forecasts`
- `pme_project_receivable_forecasts`
- `pme_budget_conversion_logs`

Essas tabelas têm `organization_id`, FKs compostas por organização, RLS ativo e policies baseadas em
`is_organization_member`/`has_organization_role`.

Idempotência:

- `projects_pme_budget_source_unique` impede dois projetos para o mesmo orçamento PME;
- `pme_project_budget_snapshots_budget_unique` impede dois snapshots base para o mesmo orçamento;
- `pme_budget_conversion_logs_success_unique` impede dois logs de sucesso para o mesmo orçamento;
- a Edge Function retorna o `converted_project_id` existente se o orçamento já estiver convertido.

Limites:

- ainda não há tabelas finais de orçamento da obra ou motor financeiro completo;
- snapshots e previsões ficam em tabelas staging PME;
- a execução ainda não é uma transação SQL única. Uma RPC transacional deve ser criada quando as tabelas financeiras oficiais existirem.

## Axia PME Assistant

Migration:

- `supabase/migrations/20260626000400_create_axia_pme_assistant.sql`
- `supabase/migrations/20260626000900_align_axia_pme_assistant_contract.sql`
- `supabase/migrations/20260627000100_create_pme_project_management.sql`
- `supabase/migrations/20260627000200_create_pme_purchases_and_suppliers.sql`
- `supabase/migrations/20260627000300_enhance_pme_daily_logs.sql`

Edge Function:

- `axia-pme-budget-assistant`

Tabelas:

- `axia_prompts`
- `axia_runs`
- `axia_context_snapshots`
- `axia_insights`
- `axia_suggestions`
- `axia_suggestion_items`
- `axia_feedback`
- `axia_redaction_logs`

Regras:

- Axia é consultiva;
- não altera orçamento oficial automaticamente;
- não aprova orçamento;
- não converte orçamento em obra;
- não altera preço final sem validação humana;
- toda sugestão entra como `suggested`, `draft` ou `pending_approval` na resposta e como `suggested` no banco até revisão;
- toda execução gera log em `axia_runs`;
- o contexto sanitizado fica em `axia_context_snapshots`;
- remoções LGPD ficam em `axia_redaction_logs`;
- as sugestões estruturadas ficam em `axia_suggestions`;
- ações individuais sugeridas ficam em `axia_suggestion_items`;
- feedback do usuário fica em `axia_feedback`;
- prompts são versionados em `axia_prompts`.

Sanitização:

- remove CPF/CNPJ, e-mail, telefone, dados bancários, tokens, senhas e chaves;
- não envia `client_phone` ou `client_email`;
- usa apenas contexto mínimo do orçamento PME.
- não envia `audit_logs` completos;
- não envia custo interno ou margem para perfis sem permissão.

## Testes mínimos

Os testes atuais validam estaticamente:

- todas as seis tabelas Core existem na migration;
- todas as oito tabelas PME existem na migration;
- tabelas multi-tenant têm `organization_id`;
- tabelas de negócio ativam RLS;
- funções auxiliares de membership existem;
- centros de custo padrão são criados;
- migrations não usam `service_role`;
- dinheiro usa `numeric`;
- migration PME não usa `float` ou `real`;
- FKs compostas protegem consistência de `organization_id`;
- tipos TypeScript cobrem Core e PME;
- tipos TypeScript não usam `any`.
- cálculo PME sem desconto, com desconto, com margem, com imposto, com material/mão de obra e arredondamento monetário.
- Meu Catálogo cria tabelas, RLS, FKs compostas, seeds de kits e tipos TypeScript.
- Serviços de Meu Catálogo montam payloads de buscar, criar, editar e desativar itens.
- SINAPI simplificado cria tabelas de referência, RLS de leitura autenticada, snapshot PME e tipos TypeScript.
- Serviços SINAPI buscam composição, adaptam preço, detectam mistura de referência e montam snapshot.
- Conversão PME para projeto valida status aprovado, usa cálculo centralizado, não aceita `organization_id` no body, cria tabelas staging com RLS, preserva SINAPI snapshot, cria previsões e registra `audit_log`.
- Axia PME cria prompt versionado, logs de execução, contexto sanitizado, insights `draft`/`suggested` e Edge Function segura.
- Gestão simples da obra PME cria tabelas operacionais, RLS, cálculo previsto vs. realizado, Edge Functions seguras e UI com abas.
- Compras PME cria fornecedores, solicitações, cotações, pedidos, entregas, anexos, histórico de status e integração com custo real.
- Diário de Obra PME guiado cria tabelas de equipe, atividades, ocorrências, materiais, equipamentos, clima, voz, revisões e exports.

Quando houver ambiente Supabase local, adicionar testes executando policies com usuários de organizações diferentes.

## Riscos conhecidos

- RLS real ainda não foi testado contra um banco Supabase local.
- O motor financeiro oficial ainda não existe.
- Conversão PME para obra usa tabelas staging; RPC transacional única deve ser priorizada quando o motor financeiro oficial existir.
- SINAPI completo ainda não está implementado.
- SINAPI ainda não tem importador automático completo.
- Permissões finas para ocultar margem/custo interno serão detalhadas em fase posterior.
- Kits iniciais ainda são templates sem itens financeiros oficiais.
- Axia ainda usa resposta estruturada local; integração com provedor externo deve manter a mesma sanitização e logs.

## Gestão Simples da Obra PME

Migration:

- `supabase/migrations/20260627000100_create_pme_project_management.sql`

Tabelas:

- `pme_project_stages`
- `pme_project_tasks`
- `pme_project_purchases`
- `pme_project_purchase_items`
- `pme_project_actual_costs`
- `pme_project_receipts`
- `pme_project_daily_logs`
- `pme_project_photos`
- `pme_project_attachments`
- `pme_project_progress_snapshots`
- `pme_project_financial_summary`

Regras de banco:

- todas as tabelas têm `organization_id`;
- todas as tabelas têm RLS ativo;
- FKs compostas com `(organization_id, project_id)` protegem vínculo cross-tenant;
- dinheiro usa `numeric(14, 2)`;
- progresso usa `numeric(5, 2)` com `check` entre 0 e 100;
- custos pagos exigem `payment_date`;
- recebimentos `received` exigem `received_at`;
- diário `locked` é protegido por trigger contra edição;
- índices cobrem `organization_id`, `project_id`, status, datas e criação de fotos.

Serviço financeiro:

- `packages/domain/src/pme-projects/projectManagement.ts`
- `supabase/functions/pme-project-calculate-summary/index.ts`

Regras implementadas:

- `planned_cost` vem das previsões de custo não canceladas;
- `actual_cost` soma custos reais com `payment_status = 'paid'`;
- `planned_revenue` vem das previsões de recebimento não canceladas;
- `received_revenue` soma recebimentos com `receipt_status = 'received'`;
- `pending_receivables` soma previsões `planned`, `invoiced` e `overdue`;
- `expected_profit = planned_revenue - planned_cost`;
- `actual_profit = received_revenue - actual_cost`;
- `profit_variance = actual_profit - expected_profit`;
- `cost_variance = actual_cost - planned_cost`.

Limites:

- RLS real ainda precisa ser validado contra Supabase local/remoto;
- não há motor financeiro completo, conciliação bancária, fiscal ou compras com aprovação;
- tabelas de fotos/anexos persistem metadados; regras de Storage devem ser adicionadas ao plugar upload real.

## Compras e Fornecedores PME

Migration:

- `supabase/migrations/20260627000200_create_pme_purchases_and_suppliers.sql`

Tabelas:

- `pme_suppliers`
- `pme_supplier_contacts`
- `pme_purchase_requests`
- `pme_purchase_request_items`
- `pme_supplier_quotes`
- `pme_supplier_quote_items`
- `pme_purchase_orders`
- `pme_purchase_order_items`
- `pme_purchase_deliveries`
- `pme_purchase_delivery_items`
- `pme_purchase_attachments`
- `pme_purchase_status_history`

Regras:

- todas as tabelas têm `organization_id` e RLS ativo;
- FKs compostas protegem vínculos cross-tenant;
- dinheiro usa `numeric(14, 2)`;
- quantidade usa `numeric(14, 4)`;
- pedido de compra guarda snapshot do fornecedor;
- cotação selecionada pode virar pedido;
- pedido cancelado não deve gerar entrega, pagamento ou custo real;
- pedido entregue/pago pode gerar custo real na obra;
- geração de custo real deve evitar duplicidade por `actual_cost_id`;
- anexos de compra guardam metadados e devem usar Storage privado.

## Diário de Obra PME Guiado

Migration:

- `supabase/migrations/20260627000300_enhance_pme_daily_logs.sql`

Tabelas novas:

- `pme_project_daily_log_labor`
- `pme_project_daily_log_activities`
- `pme_project_daily_log_occurrences`
- `pme_project_daily_log_materials`
- `pme_project_daily_log_equipment`
- `pme_project_daily_log_weather`
- `pme_project_daily_log_voice_notes`
- `pme_project_daily_log_reviews`
- `pme_project_daily_log_exports`

Alterações em `pme_project_daily_logs`:

- adiciona `weather_source`, `weather_summary`, `voice_summary`, `completion_notes`;
- adiciona `locked_by`, `locked_at`, `completed_by`, `completed_at`;
- adiciona snapshots de relatório;
- expande status para `draft`, `in_review`, `completed`, `locked`, `cancelled`.

Regras:

- todas as tabelas novas têm `organization_id` e RLS ativo;
- FKs compostas protegem vínculo cross-tenant com projeto e diário;
- voz salva `transcript_text` e `structured_payload` como sugestão;
- clima salva `source = manual | automatic | imported`;
- exports salvam `html_snapshot` e metadados;
- diário `locked` continua protegido contra edição comum.
