# RLS Audit — Obra Sys Brasil

## Checklist

Para cada tabela de negocio:

- possui `organization_id`, exceto referencias globais como SINAPI;
- possui `alter table ... enable row level security`;
- possui policies de leitura por membership;
- possui policies de escrita por papel adequado;
- usa FKs compostas `(organization_id, parent_id)` quando referencia registros tenant-scoped;
- evita policies `using (true)` ou escrita publica;
- nao permite update/delete em tabelas append-only.

## Resultado de homologacao estatica

As migrations PME atuais criam RLS para Core, Orçamentos PME, Meu Catalogo, SINAPI organizacional, Axia, conversao, gestao da obra, compras, diario, relatorios/fecho, dashboard e notificacoes.

SINAPI de referencia e global, com leitura para autenticados e sem escrita publica por policy comum.

## Pontos que exigem teste em Supabase real

Os testes do repositorio validam SQL estaticamente. O run `20260627185754` executou validacao contra Supabase staging real e confirmou:

- usuario da Organizacao A nao le, altera, insere ou apaga dados da Organizacao B nas tabelas testadas;
- Edge Functions respeitam RLS com JWT real;
- Storage privado respeita paths por organizacao;
- policies nao geram recursao nem erro de permissao nos fluxos validados.

Relatorios:

- `docs/cross-tenant-e2e-report.md`
- `docs/storage-signed-url-report.md`
