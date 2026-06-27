# Storage Security — Obra Sys Brasil

## Principio

Fotos, anexos, propostas e relatorios devem ser privados por padrao.

## Organizacao de paths

Usar paths com escopo:

- `organizations/{organization_id}/projects/{project_id}/daily_logs/{daily_log_id}/photos/...`
- `organizations/{organization_id}/projects/{project_id}/purchases/{purchase_id}/attachments/...`
- `organizations/{organization_id}/projects/{project_id}/reports/{report_id}/exports/...`
- `organizations/{organization_id}/budgets/{budget_id}/proposals/...`

## Regras

- validar organizacao e projeto antes de salvar metadados;
- nao confiar em path enviado pelo cliente como autorizacao;
- nao criar URLs publicas permanentes para documentos internos;
- usar signed URLs de curta duracao quando necessario;
- bloquear acesso cross-tenant;
- validar tipo e tamanho de arquivo;
- nao aceitar executaveis ou tipos inseguros;
- registrar audit log para uploads/exportacoes criticas.

## Homologacao pendente

Validacao completa executada no Supabase staging.

Run `20260627185754`:

- buckets privados confirmados;
- upload real autorizado para usuario da Organizacao A;
- paths com `organization_id` no primeiro segmento;
- signed URL gerada para usuario autorizado;
- signed URL abriu antes da expiracao;
- signed URL expirou e passou a retornar erro;
- usuario da Organizacao B nao gerou signed URL para arquivo da Organizacao A;
- usuario da Organizacao B nao abriu arquivo da Organizacao A por URL direta.

Relatorio detalhado: `docs/storage-signed-url-report.md`.
