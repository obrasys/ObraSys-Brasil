# Pilot Rollback Plan — Obra Sys Brasil PME

## Objetivo

Permitir pausar ou reverter o piloto controlado sem perda de dados, sem relaxar seguranca e sem apagar evidencias necessarias para auditoria.

## Gatilhos De Rollback Ou Pausa

Pausar imediatamente se houver:

- vazamento de dados entre empresas;
- acesso indevido a arquivos privados;
- exposicao de custo, margem ou lucro para cliente;
- perda de dados;
- erro grave de calculo financeiro;
- falha repetida de conversao de orcamento;
- falha repetida de Storage;
- Edge Function critica quebrada;
- suporte incapaz de acompanhar incidentes.

## Acoes Imediatas

1. Bloquear novos logins da empresa afetada, se necessario.
2. Desativar temporariamente a funcao ou fluxo problematico.
3. Manter banco integro.
4. Preservar audit logs.
5. Nao apagar dados reais sem backup e aprovacao.
6. Registrar horario, usuario, empresa e impacto.
7. Comunicar a empresa piloto com clareza.
8. Corrigir em staging antes de reativar.

## Frontend

- Reverter para artefato anterior se a falha estiver em UI ou fluxo.
- Desativar rota/chamada especifica quando possivel.
- Confirmar que proposta, relatorio, diario e dashboard continuam seguros.
- Registrar versao revertida.

## Edge Functions

- Reverter funcao para versao anterior quando o problema for regressao.
- Desativar chamada no frontend se a funcao estiver insegura.
- Confirmar que chamadas criticas retornam erro seguro.
- Reexecutar smoke test com JWT real.
- Rotacionar secrets se houver exposicao.

## Banco De Dados

- Nao executar rollback destrutivo de migration com dados reais.
- Aplicar patch forward-only quando houver policy, constraint ou validacao incorreta.
- Fazer backup antes de qualquer correcao que altere dados.
- Se houver falha de RLS, aplicar policy corretiva de bloqueio antes de qualquer ajuste de UX.
- Se houver duplicidade financeira, congelar fluxo afetado e reconciliar com script auditavel.

## Storage

- Confirmar que buckets continuam privados.
- Revogar URLs publicas indevidas, se existirem.
- Ajustar policies antes de liberar novo upload.
- Preservar arquivos e metadados.
- Bloquear acesso ate corrigir policy insegura.
- Gerar novas signed URLs somente depois da validacao.

## Axia

- Desativar chamadas Axia se houver risco de envio de dado sensivel.
- Preservar `axia_runs` e snapshots.
- Confirmar que sugestoes pendentes nao foram aplicadas automaticamente.
- Reativar apenas apos validar sanitizacao.

## Comunicacao

Mensagem minima para empresa piloto:

- o que ocorreu;
- qual fluxo foi pausado;
- se houve ou nao impacto em dados;
- prazo estimado de correcao;
- proximo check-in;
- orientacao para nao repetir a acao ate liberacao.

## Validacao Antes De Reativar

- [ ] QA validou fluxo afetado.
- [ ] Seguranca validou RLS/Storage.
- [ ] Financeiro validou dados oficiais.
- [ ] Produto validou mensagem e continuidade operacional.
- [ ] Typecheck, lint, test e build passaram quando houve alteracao de codigo.
- [ ] Empresa piloto foi comunicada.

## Responsaveis Pela Validacao

- QA: fluxo e regressao.
- Seguranca: RLS, Storage, JWT e dados sensiveis.
- Financeiro: custos, margens, recebimentos e duplicidades.
- Produto PME: impacto no usuario e comunicacao.
- Deploy: versao aplicada, rollback e reativacao.
