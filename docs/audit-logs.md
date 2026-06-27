# Audit Logs — Obra Sys Brasil

## Objetivo

`audit_logs` registra eventos criticos de forma append-only para rastreabilidade operacional, financeira e de seguranca.

## Eventos obrigatorios PME

- conversao de orcamento em obra;
- criacao de custo real;
- criacao de recebimento;
- recalculo de resumo financeiro;
- selecao de cotacao;
- criacao de pedido de compra;
- registro de entrega;
- geracao de custo real por compra;
- processamento de voz/Axia;
- conclusao, bloqueio e exportacao de diario;
- geracao/exportacao de relatorio;
- fechamento e reabertura de obra;
- geracao/resolucao de alertas e notificacoes criticas;
- tentativa bloqueada por permissao quando a funcao suportar registro.

## Regras

- nao atualizar nem apagar audit logs por fluxo comum;
- nao registrar secrets, tokens, senhas ou dados bancarios;
- guardar `organization_id`, `actor_user_id`, `action`, `entity_table`, `entity_id` e `metadata` minima;
- preferir IDs e resumos em vez de payloads completos com dados sensiveis.
