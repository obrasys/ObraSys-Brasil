# Fluxo de Trabalho com Codex — Obra Sys Brasil

## Regra principal

Toda tarefa deve ser pequena, rastreável e validável.

Não pedir:
"Construa o sistema inteiro."

Pedir:
"Implemente a migration e RLS do módulo Orçamentos PME, sem frontend ainda."

## Ordem obrigatória

1. Banco
2. RLS
3. Tipos
4. Serviços
5. Hooks
6. UI
7. Testes
8. Documentação

## Modelo de tarefa

Contexto:
Explique o módulo.

Objetivo:
Explique a entrega.

Escopo permitido:
Liste o que pode alterar.

Fora de escopo:
Liste o que não pode mexer.

Critérios de aceite:
Liste como validar.

Comandos obrigatórios:
npm run typecheck
npm run lint
npm run test
npm run build

## Fundação técnica

Antes de módulos de produto, o projeto deve manter:

- React + Vite em `apps/web`
- TypeScript strict
- ESLint
- Prettier
- workspaces em `apps/*` e `packages/*`
- documentação arquitetural em `docs/architecture.md`
- documentação de banco em `docs/database.md`
- documentação de segurança em `docs/security.md`
- Definition of Done em `docs/definition-of-done.md`

## Regras de sequência

1. Não criar UI antes de banco, RLS e tipos.
2. Não criar tabelas de negócio sem migration.
3. Não criar tabela de organização sem RLS.
4. Não implementar cálculo financeiro oficial no frontend.
5. Não implementar Axia antes de existir contrato de dados, logs e aprovação humana.
6. Não avançar Orçamentos PME sem Core multi-tenant validado.
