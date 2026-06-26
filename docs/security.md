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
- cliente, fornecedor, corretor e investidor não devem receber dados internos sem permissão explícita;
- aprovação de orçamento, contrato, pagamento ou medição exige validação humana e auditoria.

## Edge Functions

Toda Edge Function deve:

1. validar o usuário com `supabase.auth.getUser()`;
2. derivar permissões por membership no banco;
3. ignorar `organization_id`, `tenant_id` e `user_id` do body como fonte de autorização;
4. evitar `service_role` sempre que possível;
5. auditar operação crítica.

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
- registra `axia_runs`, `axia_context_snapshots` e `axia_insights`;
- toda sugestão fica como draft ou suggested;
- não aprova orçamento, não altera preço final, não converte orçamento em obra e não executa ação financeira oficial.
