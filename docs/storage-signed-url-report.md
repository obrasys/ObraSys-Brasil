# Storage Signed URL Report — Obra Sys Brasil PME

Data: 2026-06-27

Ambiente: Supabase staging `ndfivxfmijjwakeeunhd`

Run ID: `20260627185754`

## Resultado

Status: Aprovado

Todos os buckets esperados estavam privados, aceitaram upload por usuario autorizado, geraram signed URL para usuario autorizado, bloquearam geracao/acesso por usuario de outra organizacao e as signed URLs expiraram.

## Buckets testados

| Bucket                 | Privado | Upload autorizado | Signed URL autorizada | URL abriu antes de expirar | URL expirada bloqueou | Org B bloqueada |
| ---------------------- | ------- | ----------------- | --------------------- | -------------------------- | --------------------- | --------------- |
| `project-photos`       | Sim     | Sim               | Sim                   | Sim                        | Sim                   | Sim             |
| `project-attachments`  | Sim     | Sim               | Sim                   | Sim                        | Sim                   | Sim             |
| `budget-proposals`     | Sim     | Sim               | Sim                   | Sim                        | Sim                   | Sim             |
| `project-reports`      | Sim     | Sim               | Sim                   | Sim                        | Sim                   | Sim             |
| `purchase-attachments` | Sim     | Sim               | Sim                   | Sim                        | Sim                   | Sim             |
| `daily-log-photos`     | Sim     | Sim               | Sim                   | Sim                        | Sim                   | Sim             |

## Arquivos enviados

- Foto de obra: `project-photos`
- Anexo de obra: `project-attachments`
- Proposta exportada: `budget-proposals`
- Relatorio exportado: `project-reports`
- Anexo de compra/comprovativo: `purchase-attachments`
- Foto de diario: `daily-log-photos`

Todos os paths iniciaram com `organization_id` e incluiram projeto, orçamento, diario, compra ou entidade relacionada quando aplicavel.

Exemplo de path validado:

```text
10000000-0000-0000-0000-000000000001/projects/30000000-0000-0000-0000-000000000001/daily_logs/60000000-0000-0000-0000-000000000001/photos/20260627185754-daily-log-photos.txt
```

## Signed URLs

Para cada bucket:

- Usuario autorizado da Organizacao A gerou signed URL.
- Signed URL abriu antes da expiracao.
- A mesma signed URL retornou erro apos expiracao.
- Usuario da Organizacao B nao conseguiu gerar signed URL para arquivo da Organizacao A.
- Usuario da Organizacao B nao conseguiu abrir arquivo da Organizacao A por URL direta.

## Proposta e relatorio cliente

Os arquivos de proposta/relatorio cliente foram testados como objetos privados. A sanitizacao de conteudo continua validada pelas Edge Functions e testes automatizados:

- proposta cliente sem valores de custo, margem ou lucro;
- relatorio cliente sem valores de custo, margem ou lucro.

## Falhas encontradas

Nenhuma falha de policy Storage no run final.

Durante a preparacao do teste foi ajustado o TTL usado pelo script: TTL de 1 segundo podia expirar antes da primeira abertura em alguns runs. O run final usou TTL suficiente para validar abertura antes de expiracao e bloqueio depois da expiracao.

## Riscos restantes

- Nao tornar buckets publicos em nenhuma etapa de piloto.
- Manter paths iniciando com `organization_id`, pois a policy extrai a organizacao do primeiro segmento do path.
- Repetir este teste sempre que uma nova categoria de arquivo ou bucket for adicionada.

## Recomendacao

Aprovado para piloto controlado quanto a Storage privado e signed URLs.
