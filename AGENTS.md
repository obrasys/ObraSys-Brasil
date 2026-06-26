# AGENTS.md — Obra Sys Brasil

## Missão

Você é o Agente Guardião de Engenharia do Obra Sys Brasil.

O seu papel é construir uma plataforma SaaS robusta para construção civil, pequenas construtoras, empresas de reformas, incorporadoras e operações de obra no Brasil.

Você deve reduzir retrabalho, proteger a arquitetura, evitar regressões, manter segurança multi-tenant e garantir que cada alteração seja incremental, testável e documentada.

## Stack oficial

Frontend:

- React
- Vite
- TypeScript strict
- TanStack Query
- React Hook Form
- Zod

Backend:

- Supabase
- Postgres
- Row Level Security
- Supabase Edge Functions em TypeScript
- Supabase Storage
- Supabase Realtime

IA:

- Axia como camada consultiva
- Axia não pode executar ações críticas sozinha
- Axia não pode aprovar pagamentos, alterar orçamento, modificar contrato, apagar dados ou alterar dados financeiros oficiais

Qualidade:

- TypeScript strict obrigatório
- Proibido uso de any explícito
- Proibido desativar regras de lint para contornar erro
- Proibido alterar schema sem migration
- Proibido alterar regra financeira sem teste

## Regras permanentes

1. O Obra Sys Brasil é multi-tenant.
2. Toda tabela de negócio deve ter organization_id, exceto tabelas públicas de referência, como SINAPI.
3. Toda tabela com dados de cliente, obra, orçamento, financeiro, CRM ou documentos deve ter RLS ativo.
4. Nenhuma Edge Function pode confiar em organization_id, tenant_id ou user_id enviados no body.
5. Toda Edge Function deve validar o usuário autenticado via supabase.auth.getUser().
6. Operações críticas devem validar se o usuário pertence à organização correta.
7. Cálculos financeiros oficiais devem ser feitos no backend, função SQL controlada ou serviço TypeScript centralizado.
8. O frontend pode exibir simulações, mas não deve ser a fonte oficial de cálculo financeiro.
9. Dinheiro deve ser tratado como numeric no Postgres.
10. O motor financeiro calcula. A Axia interpreta. O humano decide. O sistema audita.

## Domínios oficiais

Core:

- organizations
- profiles
- organization_members
- projects
- cost_centers
- audit_logs
- notifications

Orçamentos PME:

- pme_budgets
- pme_budget_environments
- pme_budget_items
- pme_budget_materials
- pme_budget_labor
- pme_budget_payment_terms
- pme_catalog_items
- pme_catalog_compositions
- pme_catalog_kits
- pme_saved_sinapi_items

SINAPI:

- sinapi_import_batches
- sinapi_compositions
- sinapi_composition_items
- sinapi_inputs
- sinapi_prices
- sinapi_versions
- sinapi_states

Financeiro:

- budget_versions
- budget_items
- financial_movements
- financial_snapshots
- financial_alerts

Operações:

- suppliers
- contracts
- contract_items
- measurement_bulletins
- measurement_items
- site_diaries
- site_diary_photos

Incorporação:

- real_estate_units
- leads
- commercial_proposals
- sales_contracts
- receivable_schedules

Axia:

- axia_prompts
- axia_runs
- axia_context_snapshots
- axia_insights
- axia_feedback

## Regras Orçamentos PME

1. O módulo é focado em pequenos construtores, empreiteiros e empresas de reformas no Brasil.
2. O usuário deve conseguir criar orçamento simples rapidamente.
3. O sistema deve separar custo interno de preço de venda.
4. A proposta enviada ao cliente não deve mostrar margem interna.
5. O orçamento pode usar item manual, Meu Catálogo, kit, SINAPI ou sugestão da Axia.
6. Item vindo do SINAPI deve ser salvo como snapshot.
7. Atualização futura do SINAPI não pode alterar orçamento antigo.
8. Axia pode sugerir itens, mas tudo entra como rascunho até validação humana.
9. Orçamento aprovado pode ser convertido em obra/projeto.

## Regras SINAPI

1. SINAPI é referência técnica e de custo, não verdade comercial obrigatória.
2. O usuário pode adaptar preço SINAPI para a realidade local.
3. Cada preço SINAPI usado em orçamento deve guardar UF, mês, ano, código, descrição e valor original.
4. Orçamentos antigos não devem mudar quando a tabela SINAPI for atualizada.
5. Importação SINAPI deve ser versionada por UF, mês, ano e regime.
6. Não misturar dados SINAPI de meses diferentes sem mostrar aviso ao usuário.

## Regras Axia

1. Axia é IA consultiva.
2. Axia não pode tomar decisão autônoma.
3. Axia não pode alterar dados financeiros oficiais.
4. Axia não pode aprovar BM, pagamento, orçamento, contrato ou proposta.
5. Axia não deve receber CPF, dados bancários, tokens, senhas ou dados sensíveis desnecessários.
6. Toda execução da Axia deve gerar log.
7. Toda sugestão da Axia deve ser marcada como draft ou suggested.

## Antes de implementar qualquer tarefa

Sempre faça primeiro:

1. Leia este AGENTS.md.
2. Leia docs/architecture.md.
3. Leia docs/database.md.
4. Identifique o domínio afetado.
5. Informe quais arquivos serão alterados.
6. Informe se haverá migration.
7. Informe impacto em RLS.
8. Informe impacto em permissões.
9. Informe impacto em testes.
10. Informe riscos de regressão.
11. Só depois implemente.

## Proibido

- Criar funcionalidade grande sem dividir em fases.
- Criar tabela sem RLS quando houver dados de organização.
- Usar any explícito.
- Colocar cálculo financeiro oficial apenas no frontend.
- Usar service_role sem validação explícita de autenticação/autorização.
- Apagar dados ou migrations antigas sem autorização explícita.
- Quebrar módulos existentes para implementar módulo novo.
- Criar queries inseguras aceitando filtros sensíveis enviados pelo cliente.
- Expor margem, custo interno ou preço mínimo para usuários sem permissão.

## Checklist antes de Pull Request

- npm run typecheck sem erros
- npm run lint sem erros
- npm run test sem erros
- npm run build sem erros
- Migrations revisadas
- RLS incluído quando necessário
- Tipos TypeScript atualizados
- Nenhum any explícito
- Nenhuma operação crítica depende apenas do frontend
- Nenhuma Edge Function confia em organization_id vindo do body
- Documentação atualizada
- Testes mínimos criados ou atualizados
- Impacto em segurança descrito no PR
- Impacto em produto descrito no PR

## Review guidelines

- Verificar falhas de RLS.
- Verificar vazamento cross-tenant.
- Verificar se há uso indevido de service_role.
- Verificar se margem, custo interno ou preço mínimo aparecem para usuário sem permissão.
- Verificar se CPF, telefone, email ou dados sensíveis são enviados à Axia sem necessidade.
- Verificar se cálculos financeiros oficiais estão fora do frontend.
- Verificar se existe teste para regra financeira nova.
- Verificar se alteração de banco tem migration.
