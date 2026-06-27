# Production Readiness — Obra Sys Brasil PME

## Banco de dados

- Aplicar migrations em ordem.
- Confirmar RLS ativo em todas as tabelas tenant-scoped.
- Confirmar indices criticos de busca, status, datas, `organization_id`, `project_id` e `budget_id`.
- Confirmar constraints financeiras com `numeric`.
- Separar seeds de homologacao de dados de producao.
- Confirmar FKs compostas com `organization_id` em tabelas filhas de orçamento, obra, compras, diario, relatorios e notificacoes.
- Confirmar que tabelas append-only nao tenham update/delete por policy comum.
- Confirmar que seeds de producao nao criam usuarios demo, senhas demo ou dados de cliente real.

## Seguranca

- `service_role` nao deve estar no frontend.
- Secrets devem ficar em variaveis de ambiente.
- Revisar policies antes do deploy.
- Revisar permissao de relatorios, dashboard e notificacoes financeiras.
- Configurar Storage privado com signed URLs.
- Garantir logs sem CPF, dados bancarios, tokens, senhas e secrets.
- Confirmar que Edge Functions chamam `supabase.auth.getUser()`.
- Confirmar que Edge Functions derivam organizacao por RLS/membership.
- Confirmar que payloads com `organization_id`, `organizationId`, `tenant_id`, `tenantId`, `user_id` ou `userId` nao autorizam nenhuma operacao.
- Executar teste cross-tenant com usuario da Organizacao B tentando ler, editar, apagar, exportar e acessar anexos da Organizacao A.

## Produto

- Fluxo PME ponta a ponta homologado.
- Estados vazios e mensagens de erro claros.
- Proposta e relatorio cliente sem dados internos.
- Interface validada em desktop e tablet.
- SINAPI e Meu Catalogo opcionais.
- Fluxo minimo validado: orçamento -> proposta -> aprovacao -> obra -> custo -> recebimento -> relatorio -> diario locked.
- Erros bloqueantes devem mostrar mensagem acionavel, sem revelar SQL, token, policy ou payload interno.

## Financeiro

- `calculatePmeBudget` validado.
- Snapshots SINAPI preservados.
- Conversao de orcamento idempotente.
- Custo real de compra sem duplicidade.
- Relatorios e fecho com snapshots.
- Perfis sem permissao financeira nao veem custo interno, margem, lucro, preco minimo ou fornecedor interno.
- Relatorio cliente e proposta cliente devem ter apenas preco de venda e informacoes operacionais aprovadas.

## Axia

- Sanitizacao ativa.
- Prompts versionados.
- Sugestoes nao automaticas.
- Logs por organizacao.
- Sem dados financeiros sensiveis para perfis sem permissao.
- Axia nao aprova orçamento, pagamento, contrato, BM, conversao ou fecho.
- Sugestao aplicada exige acao humana e permissao.

## Observabilidade

- Edge Functions retornam erros claros.
- `audit_logs` ativo para operacoes criticas.
- Falhas criticas rastreaveis por `entity_table`, `entity_id` e `action`.

## Deploy

- Rodar `npm run typecheck`.
- Rodar `npm run lint`.
- Rodar `npm run test`.
- Rodar `npm run build`.
- Aplicar migrations em ambiente de staging antes de producao.
- Validar login, RLS, Edge Functions e Storage em staging.
- Executar smoke test de orcamento -> obra -> custo -> recebimento -> relatorio.
- Fazer deploy das Edge Functions somente depois de migrations e secrets.
- Confirmar buckets privados antes de liberar upload/export.
- Registrar data, commit, project ref, operador e resultado do smoke test.

## Pos-deploy

- Validar criacao de organizacao.
- Validar criacao de orcamento PME.
- Validar conversao em obra.
- Validar dashboard e notificacoes.
- Validar proposta/relatorio cliente sanitizados.

## Gate Final De Staging

Run aprovado: `20260627185754`.

- Cross-tenant com JWT real: aprovado.
- Storage privado com upload real e signed URLs: aprovado.
- Edge Functions com dados de outra organizacao: aprovado.
- Usuario sem permissao financeira: aprovado.
- Proposta e relatorio cliente sanitizados: aprovado.

Relatorios:

- `docs/cross-tenant-e2e-report.md`
- `docs/storage-signed-url-report.md`
- `docs/staging-validation-report.md`

Classificacao atual: aprovado para piloto controlado, ainda nao aprovado para producao ampla.

## Gate De Piloto Controlado

Antes de liberar qualquer empresa piloto:

- confirmar que o piloto continua limitado a 1 a 3 empresas;
- confirmar que a primeira liberacao usa no maximo 1 empresa na primeira semana;
- confirmar aceite explicito de uso controlado e dados limitados;
- confirmar backup ou snapshot antes de dados reais;
- confirmar versao do frontend, migrations e Edge Functions;
- confirmar que `docs/pilot-onboarding-checklist.md` foi preenchido;
- confirmar que `docs/pilot-daily-checklist.md` sera executado na primeira semana;
- confirmar que `docs/pilot-rollback-plan.md` esta entendido pela equipe;
- confirmar canal de feedback e responsavel principal da empresa;
- bloquear ampliacao caso exista qualquer P0 aberto.

Documentos do piloto:

- `docs/pilot-plan.md`
- `docs/pilot-entry-checklist.md`
- `docs/pilot-onboarding-checklist.md`
- `docs/pilot-daily-checklist.md`
- `docs/pilot-daily-report.md`
- `docs/pilot-weekly-report-template.md`
- `docs/pilot-final-report.md`
- `docs/pilot-rollback-plan.md`
- `docs/pilot-backlog.md`

Classificacao permitida neste momento: iniciar piloto controlado, sem producao ampla.

## Backlog P2 Conhecido

- Aviso do Vite sobre chunk acima de 500 kB: nao bloqueia piloto. Registrar em `docs/pilot-backlog.md` e avaliar lazy loading, divisao de modulos, imports grandes e `manualChunks` em fase futura.
