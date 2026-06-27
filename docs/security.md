# Security — Obra Sys Brasil

## Princípios

- O sistema é multi-tenant por padrão.
- RLS é obrigatório para dados de organização.
- Autorização deve ser validada no backend e no banco.
- Dados sensíveis devem ser minimizados.
- Operações críticas devem gerar auditoria.

## RLS

Toda tabela de negócio deve ter:

- `organization_id`
- RLS ativo
- policies baseadas em membership
- constraints que evitem relação cross-tenant entre registros pai e filho

## Core multi-tenant

O Core usa:

- `organizations` para empresas clientes;
- `profiles` para dados básicos do usuário;
- `organization_members` para membership e papéis;
- `projects` e `cost_centers` com `organization_id`;
- `audit_logs` append-only por organização.

Funções auxiliares:

- `public.is_organization_member(target_organization_id uuid)`
- `public.has_organization_role(target_organization_id uuid, allowed_roles text[])`

Essas funções centralizam a checagem de membership e evitam confiar em `organization_id` enviado pelo frontend.

## Permissões

A matriz detalhada será definida no Core. Até lá, as regras mínimas são:

- somente membros da organização acessam dados da organização;
- `owner` e `admin` administram organização e membros;
- `owner`, `admin` e `manager` podem criar/editar projetos e centros de custo;
- centros de custo padrão não podem ser apagados;
- `audit_logs` não tem update/delete para usuários comuns;
- margem, custo interno e preço mínimo são dados sensíveis;
- tabelas internas de Orçamentos PME com custo/margem devem ser lidas apenas por `owner`, `admin` e `manager`;
- campos internos do Meu Catálogo PME, como `default_unit_cost`, `default_unit_price`, `default_margin_percentage`, `unit_cost` e `unit_price`, devem ser tratados como dados internos da organização;
- membros comuns e visões de cliente devem usar views/RPCs sanitizadas sem custo interno, margem ou preço mínimo;
- cliente, fornecedor, corretor e investidor não devem receber dados internos sem permissão explícita;
- aprovação de orçamento, contrato, pagamento ou medição exige validação humana e auditoria.

## Edge Functions

Toda Edge Function deve:

1. validar o usuário com `supabase.auth.getUser()`;
2. derivar permissões por membership no banco;
3. ignorar `organization_id`, `tenant_id` e `user_id` do body como fonte de autorização;
4. evitar `service_role` sempre que possível;
5. auditar operação crítica.

### Meu Catálogo PME

Edge Functions:

- `pme-catalog-save-budget-item`
- `pme-catalog-add-item-to-budget`
- `pme-catalog-add-kit-to-budget`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` do body como fonte de autorização;
- buscar orçamento, item ou kit pelo banco e comparar `organization_id` derivado desses registros;
- exigir papel `owner`, `admin` ou `manager` para criar itens de orçamento a partir do catálogo, salvar item do orçamento no catálogo ou adicionar kit ao orçamento;
- registrar `audit_logs` para operações que alteram orçamento ou catálogo;
- desativar itens, composições e kits com `is_active = false`, preservando histórico e evitando quebra de orçamentos antigos;
- impedir delete por policy no contrato novo do catálogo;
- manter custo interno e margem fora de futuras visões de cliente.

### SINAPI PME

Edge Function:

- `pme-sinapi-add-composition-to-budget`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` no body;
- derivar `organization_id` pelo orçamento PME lido no banco;
- exigir papel `owner`, `admin` ou `manager` para adicionar composição SINAPI ao orçamento;
- nunca alterar tabelas globais SINAPI ao usar referência no orçamento;
- criar `pme_budget_items` com `source_type = 'sinapi'`;
- criar `pme_budget_sinapi_snapshots` preservando UF, mês, ano, regime e custo original;
- recalcular o orçamento no backend com serviço centralizado;
- registrar `audit_logs`;
- manter custo interno, margem e preço mínimo fora de futuras visões de cliente.

### Conversão PME para Obra

Edge Function:

- `pme-budget-convert-to-project`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` no body;
- exigir confirmação explícita no payload;
- derivar `organization_id` pelo orçamento PME lido via RLS;
- exigir papel `owner`, `admin` ou `manager` enquanto o RBAC granular não existir;
- bloquear orçamentos `draft`, `sent`, `negotiation`, `rejected`, `cancelled` e já convertidos;
- criar projeto com origem `pme_budget` e vínculo ao orçamento;
- persistir snapshot e previsões apenas em tabelas com `organization_id` e RLS;
- preservar snapshots SINAPI antigos sem consultar preço SINAPI atual;
- registrar `pme_budget_conversion_logs`, histórico de status e `audit_logs`;
- não usar `service_role`;
- manter custo interno e margem fora de futuras visões de cliente.

### Gestão Simples da Obra PME

Edge Functions:

- `pme-project-create-actual-cost`
- `pme-project-create-receipt`
- `pme-project-calculate-summary`
- `pme-project-lock-daily-log`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` no body;
- derivar `organization_id` pelo projeto, diário ou registros lidos via RLS;
- exigir papel `owner`, `admin` ou `manager` enquanto o RBAC granular não existir;
- registrar `audit_logs` para custo real, recebimento, recálculo de resumo e bloqueio de diário;
- manter RLS em todas as tabelas operacionais da obra;
- impedir custo ou recebimento em obra de outra organização por FK composta e policy;
- ocultar lucro/margem para perfis sem permissão na UI e em futuras views/RPCs sanitizadas;
- não expor fotos/anexos fora da organização;
- diário bloqueado não pode ser alterado.

### Compras e Fornecedores PME

Edge Functions:

- `pme-purchase-select-quote`
- `pme-purchase-create-order`
- `pme-purchase-register-delivery`
- `pme-purchase-create-actual-cost`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` no body;
- derivar organização pelo fornecedor, projeto, cotação ou pedido lido via RLS;
- exigir `owner`, `admin` ou `manager` enquanto RBAC granular não existir;
- impedir fornecedor de outra organização em compra/cotação;
- impedir anexo em compra de outra organização por FK composta e policy;
- registrar `audit_logs` em seleção de cotação, pedido, entrega e custo real;
- não usar `service_role`;
- custo real gerado de compra deve ser criado no backend e não pelo frontend.

### Diário de Obra PME Guiado

Edge Functions:

- `pme-daily-log-process-voice`
- `pme-daily-log-fetch-weather`
- `pme-daily-log-complete`
- `pme-daily-log-lock`
- `pme-daily-log-export`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` no body;
- derivar organização pelo diário ou projeto lido via RLS;
- não enviar CPF/CNPJ, dados bancários, tokens ou secrets para Axia;
- sugestões de voz entram como `structured_payload` para revisão humana;
- Axia não conclui, bloqueia nem edita diário automaticamente;
- clima automático tem fallback manual;
- conclusão, bloqueio, exportação e processamento de voz registram `audit_logs`;
- fotos/anexos de diário devem usar Storage privado por `organization_id/project_id/daily_logs`;
- diário `locked` não pode ser editado pelo fluxo comum.

### Relatorios PME e Fecho Simples da Obra

Edge Functions:

- `pme-project-calculate-closeout`
- `pme-project-generate-report`
- `pme-project-export-report`
- `pme-project-close`
- `pme-project-reopen`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` no body;
- derivar organização pelo projeto, relatório ou fecho lido via RLS;
- exigir `owner`, `admin` ou `manager` enquanto RBAC granular não existir;
- relatório para cliente deve ser sanitizado antes de persistir/exportar;
- relatório para cliente não pode conter custo interno, margem, lucro, fornecedores internos, notas
  internas ou audit logs;
- fecho cria snapshot rastreável e registra `audit_logs`;
- reabertura exige motivo e registra `audit_logs`;
- snapshots e exports internos só podem ser lidos por perfis de gestão.

### Dashboard PME e Visao Multi-Obras

Edge Functions:

- `pme-dashboard-summary`
- `pme-dashboard-generate-alerts`
- `pme-dashboard-resolve-alert`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` no body;
- derivar organização pelo membership ativo do usuário;
- ocultar lucro, margem e custo interno para perfis sem permissão financeira;
- alertas só podem ser gerados/resolvidos por perfis de gestão enquanto RBAC granular não existir;
- preferências não podem ativar cards de lucro/margem para perfil sem permissão;
- geração e resolução de alertas registram `audit_logs`;
- agregações multi-obras não podem consultar dados fora da organização do usuário.

### Notificacoes, Lembretes e Alertas PME

Edge Functions:

- `pme-notifications-generate`
- `pme-notifications-mark-read`
- `pme-notifications-resolve`

Regras de segurança:

- autenticar com `supabase.auth.getUser()`;
- não aceitar `organization_id`, `tenant_id` ou `user_id` no body;
- derivar organização por membership ou pela notificação lida via RLS;
- usuário só lê notificações destinadas a ele ou gerais autorizadas da organização;
- preferências só podem ser lidas/alteradas pelo próprio usuário;
- mensagens financeiras devem ocultar custo, lucro e margem para perfis sem permissão;
- `action_url` deve ser rota interna `/app/`;
- geração manual e resolução de notificações registram `audit_logs`;
- email/push ficam sem entrega real nesta fase para evitar canal externo sem infraestrutura.

## Axia

Não enviar CPF, dados bancários, tokens, senhas ou dados sensíveis desnecessários para IA.

Toda execução deve registrar finalidade, usuário, organização, prompt/modelo, evidências e status sem salvar segredo em texto puro.

Edge Function:

- `axia-pme-budget-assistant`

Regras de segurança:

- autentica com `supabase.auth.getUser()`;
- não aceita `organization_id`, `tenant_id` ou `user_id` no body;
- deriva organização do orçamento via RLS ou do membership ativo do usuário;
- aplica sanitização em texto e contexto antes de registrar ou enviar para a Axia;
- remove CPF/CNPJ, e-mail, telefone, dados bancários, tokens, senhas e chaves;
- registra `axia_runs`, `axia_context_snapshots`, `axia_redaction_logs`, `axia_suggestions` e `axia_suggestion_items`;
- toda sugestão fica como rascunho/suggested até ação humana;
- aceitar ou aplicar sugestão deve ser uma ação explícita do usuário;
- não envia `audit_logs` completos para IA;
- não inventa código SINAPI quando não houver snapshot ou referência no contexto;
- não aprova orçamento, não altera preço final, não converte orçamento em obra e não executa ação financeira oficial.

## Validacao Final De Staging

Run `20260627185754`:

- JWT real de usuarios das Organizacoes A e B validou isolamento cross-tenant.
- Usuario da Organizacao A nao acessou dados da Organizacao B nas tabelas PME, Axia e `audit_logs` testadas.
- Edge Functions criticas exigiram JWT e bloquearam dados de outra organizacao.
- Payloads com `organization_id`, `organizationId`, `tenant_id`, `tenantId`, `user_id` ou `userId` foram rejeitados nas funcoes sensiveis reforcadas.
- Usuario sem permissao financeira nao recebeu valores internos de custo, margem ou lucro.
- Storage privado e signed URLs foram validados em `docs/storage-signed-url-report.md`.

Resultado: aprovado para piloto controlado, sem autorizacao para producao ampla.
