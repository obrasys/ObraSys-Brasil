# Axia Security — Obra Sys Brasil

## Principio

Axia e consultiva. O humano decide, o sistema audita.

## Dados proibidos no contexto

- CPF/CNPJ quando nao necessario;
- dados bancarios;
- tokens;
- senhas;
- secrets;
- chaves privadas;
- audit logs completos;
- dados de outra organizacao;
- margem, lucro e custo interno para perfis sem permissao.

## Regras obrigatorias

- toda execucao cria `axia_runs`;
- contexto sanitizado cria `axia_context_snapshots`;
- redacoes criam `axia_redaction_logs`;
- sugestoes entram como `suggested`, `draft` ou `pending_approval`;
- Axia nao aprova orcamento, pagamento, contrato, BM, conversao ou fecho;
- Axia nao altera dados financeiros oficiais;
- sugestao aplicada exige acao humana e permissao.

## Homologacao

Validar que `sanitizeAxiaText`, `sanitizeAxiaContext` e sanitizadores de diario removem CPF, e-mail, telefone, dados bancarios, tokens e senhas antes de chamada ao provedor.
