# Permissions — Obra Sys Brasil

## Principio

Na duvida, negar acesso.

O Obra Sys Brasil usa `organization_members` como base minima de autorizacao. Enquanto o RBAC granular de producao nao existir, os papeis do Core sao mapeados assim:

- `owner`, `admin`, `manager`: gestao completa da organizacao.
- `member`: operacao limitada, sem lucro, margem ou custo interno sensivel.
- `viewer`: leitura limitada e sanitizada.

## Dados sensiveis

Sao dados sensiveis:

- custo interno;
- margem;
- lucro;
- preco minimo;
- dados bancarios;
- CPF/CNPJ de cliente quando nao for necessario;
- tokens, senhas, secrets e chaves privadas;
- audit logs completos;
- snapshots internos.

Esses dados nao devem aparecer para perfis sem permissao financeira, em proposta de cliente, relatorio de cliente, notificacao restrita ou contexto da Axia sem necessidade.

## Operacoes criticas

Operacoes criticas exigem backend, membership e audit log:

- aprovar ou converter orcamento;
- criar custo real;
- registrar recebimento;
- selecionar cotacao;
- criar pedido de compra;
- bloquear diario;
- fechar ou reabrir obra;
- gerar/exportar relatorio interno;
- resolver alerta/notificacao critica;
- processar contexto Axia com dados operacionais.

## Edge Functions

Toda Edge Function deve:

1. chamar `supabase.auth.getUser()`;
2. derivar organizacao por registros lidos via RLS ou membership;
3. ignorar `organization_id`, `organizationId`, `tenant_id`, `tenantId`, `user_id` e `userId` enviados no body;
4. usar `has_organization_role` quando a acao exigir gestao;
5. registrar `audit_logs` quando alterar estado critico.
