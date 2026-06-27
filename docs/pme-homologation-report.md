# PME Homologation Report — Obra Sys Brasil

## Escopo

Homologacao final do fluxo PME ponta a ponta para pequenos construtores, empreiteiros e empresas de reformas.

Esta homologacao cobre orçamento, catálogo, SINAPI, proposta, conversao em obra, custos, recebimentos, compras, diario, relatorios, fecho, dashboard, notificacoes, permissoes, RLS, Storage e Axia.

## Ambiente

- Staging Supabase: `https://ndfivxfmijjwakeeunhd.supabase.co`
- Project ref: `ndfivxfmijjwakeeunhd`
- Migrations: aplicadas no staging via `supabase db push --linked`
- Buckets privados validados: `project-photos`, `project-attachments`, `budget-proposals`, `project-reports`, `purchase-attachments`, `daily-log-photos`
- Edge Functions PME: preparadas e implantadas para o fluxo principal de staging

## Evidencias de staging ja coletadas

- Login real com usuario de homologacao executado com sucesso.
- Seed de homologacao aplicado no SQL Editor sem erro.
- Proposta comercial gerada para `PME-DEMO-001` sem campos internos no payload de cliente.
- Conversao de orçamento aprovado para obra retornou `status = converted_to_project`.
- Criacao de custo real executada com sucesso.
- Criacao de recebimento executada com sucesso.
- Relatorio cliente retornou `financial = {}` e `hiddenFields` para custos, margem, lucro e fornecedores.
- Axia retornou sugestoes `suggested`, `humanValidationRequired = true` e avisos de nao aprovacao/alteracao automatica.
- Bloqueio de diario retornou `status = locked` apos ajuste do seed para representar o usuario real de homologacao.
- Storage mostrou os seis buckets esperados com `public = false`.
- Storage policies foram consultadas e incluem leitura por membro e escrita/alteracao/remocao por permissoes de gestao.

## Cenarios homologados

| Cenario                   | Status               | Evidencia minima                                            |
| ------------------------- | -------------------- | ----------------------------------------------------------- |
| 1. Orcamento PME simples  | Parcial automatizado | Testes de calculo, schema e fluxo base                      |
| 2. Meu Catalogo           | Parcial automatizado | Testes de migration, service e Edge Functions               |
| 3. SINAPI                 | Parcial automatizado | Testes de snapshot, busca e Edge Function                   |
| 4. Proposta comercial     | Validado em staging  | Payload cliente sem custo/margem/lucro                      |
| 5. Conversao em obra      | Validado em staging  | Conversao idempotente testada por dominio e migration       |
| 6. Gestao simples da obra | Parcial staging      | Custo e recebimento executados                              |
| 7. Compras e fornecedores | Automatizado         | Testes de dominio, migration e Edge Functions               |
| 8. Diario de obra         | Validado em staging  | Diario bloqueado com `status = locked`                      |
| 9. Relatorios e fecho     | Parcial staging      | Relatorio cliente sanitizado; fecho coberto por testes      |
| 10. Dashboard multi-obras | Automatizado         | Testes de agregacao e sanitizacao                           |
| 11. Notificacoes          | Automatizado         | Testes de anti-duplicidade e sanitizacao                    |
| 12. Permissoes e RLS      | Validado em staging  | JWT real, usuario sem financeiro e Edge Functions validados |
| 13. Cross-tenant          | Validado em staging  | Run `20260627185754`, 69 checks de tabela passaram          |
| 14. Storage               | Validado em staging  | 6 buckets privados com upload, signed URL e expiracao       |
| 15. Axia                  | Validado em staging  | Sugestoes consultivas e sanitizacao coberta por testes      |

## Bugs encontrados

- P0: migracao de gestao da obra referenciava `pme_budget_materials(organization_id, id)` sem constraint unica correspondente no staging inicial. Corrigido por constraints compostas antes de reaplicar.
- P1: diario demo nao estava inicialmente alinhado ao usuario real de homologacao para o lock. Corrigido no seed/dados de staging.
- P1: payloads sensiveis de proposta, relatorio e Axia nao rejeitavam explicitamente aliases `organizationId`, `tenantId` e `userId`, embora a organizacao fosse derivada pelo banco. Corrigido com `hasForbiddenAuthorizationKeys`.
- P2: scripts dedicados `test:unit`, `test:integration`, `test:rls`, `test:security`, `test:e2e` e `test:coverage` ainda nao existem.

## Bugs corrigidos

- Constraints compostas adicionadas para proteger FKs por `organization_id`.
- Staging RLS helpers e Storage policies preparados.
- Edge Functions sensiveis reforcadas contra aliases de autorizacao no body.
- Teste de homologacao reforcado para travar a regra de rejeicao de aliases sensiveis.
- Documentacao de producao, rollback, permissoes, RLS, audit logs, Storage e Axia criada/revisada.

## Bugs pendentes

- Expandir matriz completa de perfis granulares quando o RBAC final sair do mapeamento Core atual.
- Executar rota direta/query manipulada no frontend conectado ao Supabase real quando essa conexao estiver ativa.
- Validar PDF real se a exportacao PDF for habilitada; nesta fase o aceite minimo e HTML/print sanitizado.

## Riscos restantes

- RBAC granular ainda esta mapeado para papeis Core (`owner`, `admin`, `manager`, `member`, `viewer`).
- Parte do frontend ainda usa repositorios locais/substituiveis; a validacao final de producao precisa confirmar a troca para Supabase real.
- Storage depende de paths corretos enviados pelo fluxo de upload; policies ja protegem por organizacao extraida do path, mas o E2E de arquivo ainda deve ser repetido.
- A operacao de conversao ainda nao e uma RPC SQL transacional unica; ha constraints e idempotencia para mitigacao.

## Comandos obrigatorios

Executar antes de liberar producao:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Scripts opcionais dedicados ainda nao existem no `package.json`; enquanto isso, as validacoes criticas rodam dentro de `npm run test`.

## Recomendacao

Aprovado para piloto controlado.

O fluxo principal de staging passou para proposta, conversao, custo, recebimento, relatorio cliente, Axia e diario bloqueado. O gate final `20260627185754` tambem aprovou cross-tenant com usuarios reais, Storage privado, signed URLs, Edge Functions e perfil sem permissao financeira.

Ainda nao aprovado para producao ampla sem repetir o gate no ambiente final e confirmar operacao, monitoramento, backup e suporte.
