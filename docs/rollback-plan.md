# Rollback Plan — Obra Sys Brasil PME

## Frontend

1. Reverter para o artefato frontend anterior.
2. Manter migrations aplicadas se ja houver dados gravados.
3. Desativar rotas novas por feature flag ou rollback de deploy quando necessario.
4. Validar que rotas de proposta, obra, compras, relatorios, dashboard e notificacoes retornam para o comportamento anterior.
5. Comunicar ao suporte quais fluxos ficam temporariamente indisponiveis.

## Migrations

1. Nao apagar tabelas com dados de cliente sem plano aprovado.
2. Para migration problematica sem dados, aplicar migration corretiva.
3. Para migration com dados, criar patch forward-only que restaure constraints/policies seguras.
4. Fazer backup antes de qualquer alteracao corretiva em producao.
5. Se houver vazamento de RLS, aplicar policy corretiva de bloqueio antes de qualquer correcao de UX.
6. Se houver duplicidade financeira, congelar Edge Function afetada e criar script de reconciliacao auditavel antes de ajuste de dados.

## Edge Functions

1. Reverter a funcao para versao anterior.
2. Se a funcao for insegura, desativar temporariamente a rota/chamada no frontend.
3. Confirmar que chamadas criticas passam a retornar erro seguro.
4. Rotacionar secrets se logs ou payloads indicarem exposicao.
5. Reexecutar smoke test da funcao revertida com JWT real.

## Axia

1. Desativar chamadas ao provider.
2. Manter logs existentes.
3. Continuar permitindo revisao de sugestoes ja criadas.
4. Bloquear novas execucoes se houver risco LGPD.
5. Confirmar que nenhuma sugestao pendente foi aplicada automaticamente.
6. Preservar `axia_runs`, snapshots e redaction logs para auditoria.

## Notificacoes

1. Desativar geracao manual/rotina.
2. Manter leitura das notificacoes existentes.
3. Corrigir anti-duplicidade ou sanitizacao antes de reativar.
4. Arquivar ou resolver duplicadas somente com trilha de auditoria.
5. Bloquear mensagens financeiras para perfis sem permissao ate correcao.

## Storage

1. Revogar URLs publicas indevidas.
2. Rotacionar signed URLs se necessario.
3. Ajustar bucket policies.
4. Preservar metadados e bloquear acesso ate policy segura.
5. Tornar buckets privados caso algum tenha sido alterado para publico.
6. Revisar paths fora do padrao `organizations/{organization_id}/...`.
7. Gerar nova signed URL apenas depois da policy corrigida.

## Protecao de dados

1. Preservar audit logs.
2. Nao apagar registros financeiros para "corrigir" visualmente um bug.
3. Isolar organizacoes afetadas se houver suspeita de vazamento cross-tenant.
4. Exportar evidencias minimas para auditoria antes do patch corretivo.

## Validacao do rollback

- QA valida fluxo afetado.
- Seguranca valida RLS/Storage.
- Financeiro valida que nao houve alteracao indevida em valores oficiais.
- Produto valida mensagem ao usuario e continuidade operacional.
- Responsavel tecnico confirma comando executado, horario, ambiente e resultado.
