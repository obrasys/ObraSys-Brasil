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

## Tabelas PME

### pme_budgets

Tabela raiz do orçamento PME.

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
- `item_type`
- `description`
- `unit`
- `quantity`
- `unit_cost`
- `subtotal_cost`
- `unit_price`
- `final_price`
- `is_optional`
- `show_on_proposal`
- `sort_order`

Tipos de item permitidos:

- `service`
- `material`
- `labor`
- `equipment`
- `other`

SINAPI e Axia ficam fora da Fase 1.

## Meu Catálogo PME

Migration:

- `supabase/migrations/20260626000200_create_pme_catalog.sql`

O Meu Catálogo permite que cada organização guarde itens, composições e kits próprios para reutilização em novos orçamentos PME.

Tabelas:

- `pme_catalog_items`
- `pme_catalog_compositions`
- `pme_catalog_composition_items`
- `pme_catalog_kits`
- `pme_catalog_kit_items`

### pme_catalog_items

Itens reutilizáveis do catálogo da organização.

Campos principais:

- `organization_id`
- `name`
- `description`
- `item_type`
- `origin`
- `unit`
- `unit_cost`
- `unit_price`
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

Origens permitidas:

- `manual`
- `sinapi`
- `supplier_quote`
- `axia_suggestion`

Observações:

- `unit_cost` representa custo interno e não deve aparecer em proposta para cliente sem permissão adequada.
- `unit_price` representa preço de venda sugerido.
- Itens editados no orçamento poderão ser salvos aqui em fase de aplicação/serviço com Supabase.
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
- `catalog_item_id`
- `quantity`
- `unit_cost`
- `unit_price`
- `sort_order`

### pme_catalog_kits

Kits reutilizáveis para acelerar o orçamento PME.

Campos principais:

- `name`
- `description`
- `category`
- `suggested_tier`
- `total_cost`
- `total_price`
- `is_seed`
- `is_active`

Kits iniciais criados para cada organização:

- Reforma de Banheiro Econômico
- Reforma de Banheiro Médio
- Reforma de Banheiro Premium
- Pintura Apartamento 60m²
- Troca de Piso
- Reforma de Cozinha

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
- `quantity`
- `unit_cost`
- `unit_price`
- `sort_order`

## SINAPI Simplificado

Migration:

- `supabase/migrations/20260626000300_create_sinapi_simplified.sql`

O SINAPI entra como referência técnica e de custo opcional para Orçamentos PME. Ele não é obrigatório para criar orçamento e não deve substituir a decisão comercial do pequeno construtor.

Tabelas públicas de referência:

- `sinapi_versions`
- `sinapi_import_batches`
- `sinapi_compositions`
- `sinapi_composition_items`
- `sinapi_inputs`
- `sinapi_prices`

Tabela tenant-scoped de snapshot:

- `pme_saved_sinapi_items`

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

Snapshot imutável do item SINAPI usado em orçamento PME.

Campos obrigatórios de rastreabilidade:

- `sinapi_code`
- `sinapi_description`
- `state_code`
- `reference_month`
- `reference_year`
- `original_unit_cost`
- `adapted_unit_price`
- `used_at`

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
- recebe apenas `budgetId` e opcionalmente `projectId`;
- não aceita `organization_id`, `tenant_id` ou `user_id` no body;
- busca o orçamento via RLS;
- deriva `organization_id` do orçamento;
- valida role `owner`, `admin` ou `manager`;
- exige orçamento com status `approved` e `approved_at`;
- bloqueia conversão duplicada quando `converted_project_id` já existe ou status já é `converted_to_project`;
- cria ou vincula `projects`;
- usa `calculatePmeBudget` via serviço centralizado para montar previsão inicial;
- atualiza o orçamento para `converted_to_project`;
- registra `audit_log` com ambientes, itens copiados, previsão inicial de custos, previsão inicial de recebimentos e cálculo usado.

Limites:

- ainda não há tabelas finais de orçamento da obra ou motor financeiro completo;
- ambientes, itens e previsões iniciais ficam registrados no `audit_logs.metadata` como snapshot auditável;
- a execução ainda não é uma transação SQL única. Uma RPC transacional deve ser criada quando as tabelas financeiras oficiais existirem.

## Axia PME Assistant

Migration:

- `supabase/migrations/20260626000400_create_axia_pme_assistant.sql`

Edge Function:

- `axia-pme-budget-assistant`

Tabelas:

- `axia_prompts`
- `axia_runs`
- `axia_context_snapshots`
- `axia_insights`

Regras:

- Axia é consultiva;
- não altera orçamento oficial automaticamente;
- não aprova orçamento;
- não converte orçamento em obra;
- não altera preço final sem validação humana;
- toda sugestão entra como `draft` ou `suggested`;
- toda execução gera log em `axia_runs`;
- o contexto sanitizado fica em `axia_context_snapshots`;
- as sugestões estruturadas ficam em `axia_insights`;
- prompts são versionados em `axia_prompts`.

Sanitização:

- remove CPF/CNPJ, e-mail, telefone, dados bancários, tokens, senhas e chaves;
- não envia `client_phone` ou `client_email`;
- usa apenas contexto mínimo do orçamento PME.

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
- Conversão PME para projeto valida status aprovado, usa cálculo centralizado, não aceita `organization_id` no body e registra `audit_log`.
- Axia PME cria prompt versionado, logs de execução, contexto sanitizado, insights `draft`/`suggested` e Edge Function segura.

Quando houver ambiente Supabase local, adicionar testes executando policies com usuários de organizações diferentes.

## Riscos conhecidos

- RLS real ainda não foi testado contra um banco Supabase local.
- O motor financeiro oficial ainda não existe.
- SINAPI completo ainda não está implementado.
- SINAPI ainda não tem importador automático completo.
- Permissões finas para ocultar margem/custo interno serão detalhadas em fase posterior.
- Kits iniciais ainda são templates sem itens financeiros oficiais.
- Axia ainda usa resposta estruturada local; integração com provedor externo deve manter a mesma sanitização e logs.
