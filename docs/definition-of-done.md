# Definition of Done — Obra Sys Brasil

Uma tarefa só está pronta quando:

- escopo aprovado foi respeitado;
- TypeScript strict passa;
- lint passa;
- testes passam;
- build passa;
- migrations foram criadas quando houve alteração de schema;
- RLS foi incluído para dados de organização;
- tipos TypeScript foram atualizados;
- não há `any` explícito;
- documentação relevante foi atualizada;
- impactos de segurança, produto e regressão foram descritos.

## Comandos obrigatórios

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Regras de bloqueio

Bloquear entrega se:

- cálculo financeiro oficial estiver apenas no frontend;
- Edge Function confiar em `organization_id` vindo do body;
- tabela de negócio não tiver RLS;
- margem ou custo interno forem expostos indevidamente;
- Axia executar ação crítica sozinha;
- alteração financeira não tiver teste.
