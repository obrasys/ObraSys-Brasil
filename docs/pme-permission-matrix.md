# PME Permission Matrix — Obra Sys Brasil

## Matriz minima atual

| Acao PME                          | owner/admin/manager | member                  | viewer                    |
| --------------------------------- | ------------------- | ----------------------- | ------------------------- |
| Criar/editar orcamento            | Sim                 | Nao, salvo fase futura  | Nao                       |
| Ver custo interno/margem/lucro    | Sim                 | Nao                     | Nao                       |
| Gerar proposta cliente            | Sim                 | Nao                     | Nao                       |
| Converter orcamento em obra       | Sim                 | Nao                     | Nao                       |
| Criar custo real                  | Sim                 | Nao                     | Nao                       |
| Registrar recebimento             | Sim                 | Nao                     | Nao                       |
| Criar tarefa/diario/foto          | Sim                 | Limitado em fase futura | Nao                       |
| Bloquear diario                   | Sim                 | Nao                     | Nao                       |
| Criar fornecedor/compra/cotacao   | Sim                 | Nao                     | Nao                       |
| Gerar relatorio interno           | Sim                 | Nao                     | Nao                       |
| Gerar relatorio cliente           | Sim                 | Nao                     | Leitura futura sanitizada |
| Fechar/reabrir obra               | Sim                 | Nao                     | Nao                       |
| Ver dashboard financeiro          | Sim                 | Nao                     | Nao                       |
| Ver dashboard operacional         | Sim                 | Sim, sanitizado         | Sim, sanitizado           |
| Usar Axia com contexto financeiro | Sim                 | Nao                     | Nao                       |
| Usar Axia operacional             | Sim                 | Limitado em fase futura | Nao                       |

## Mapeamento de papeis solicitados pelo produto

Enquanto nao houver papeis granulares no Core:

- `admin_org`, `incorporador_master`, `engenheiro_obra`, `orcamentista`, `comprador`: devem mapear para `owner/admin/manager`.
- `mestre_obra`, `colaborador_operacional`: devem mapear para `member` com permissoes futuras especificas.
- `corretor_vendas`, `fornecedor_externo`, `cliente_final`, `investidor_viewer`, `viewer`: devem receber apenas visoes sanitizadas ou nenhum acesso interno.

## Regra de homologacao

Qualquer permissao nao implementada explicitamente deve ser tratada como negada ate o RBAC granular ser criado.
