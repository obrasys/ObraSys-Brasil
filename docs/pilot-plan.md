# Pilot Plan — Obra Sys Brasil PME

## Objetivo

Executar um piloto controlado do Obra Sys Brasil PME com 1 a 3 empresas, em ambiente acompanhado, com dados reais limitados, backup ativo, monitoramento minimo e processo claro de feedback.

O piloto nao e producao ampla. A liberacao deve ser reversivel e restrita a empresas selecionadas.

## Classificacao Atual

Status: aprovado para piloto controlado.

Base da decisao:

- staging validado;
- cross-tenant aprovado com JWT real;
- Storage privado e signed URLs aprovados;
- Edge Functions aprovadas contra acesso cross-tenant;
- proposta e relatorio cliente sanitizados;
- usuario sem permissao financeira sem acesso a custo, margem ou lucro.

## Perfil Das Empresas Piloto

Selecionar 1 a 3 empresas com:

- pequeno volume inicial de obras;
- responsavel principal definido;
- disponibilidade para feedback frequente;
- baixa complexidade operacional;
- aceite explicito de uso controlado e dados limitados;
- expectativa alinhada de que funcionalidades grandes fora do escopo nao entram no piloto.

Perfis recomendados:

- pequena construtora;
- empresa de reformas;
- empreiteiro organizado.

## Criterios De Entrada

A empresa so entra no piloto se:

- entende que o ambiente esta em piloto controlado;
- aceita usar dados reais limitados no inicio;
- indica 1 responsavel principal;
- aceita reportar erros rapidamente;
- aceita acompanhamento proximo;
- nao exige funcionalidades fora do escopo;
- aceita validacao manual dos dados criticos;
- autoriza backup e auditoria das operacoes feitas no sistema.

## Limites Por Empresa

Limites iniciais recomendados:

- ate 2 usuarios ativos;
- ate 2 obras ativas;
- ate 5 orcamentos PME;
- ate 10 fornecedores;
- ate 20 fotos/anexos por obra;
- sem importacao massiva;
- sem uso fiscal ou contabil oficial;
- sem integracao bancaria;
- sem portal de cliente final.

Qualquer ampliacao deve passar por revisao semanal e nao pode ocorrer com P0 aberto.

## Modulos Liberados

- Orcamentos PME;
- Meu Catalogo;
- proposta comercial;
- conversao de orcamento em obra;
- gestao simples da obra;
- custos reais;
- recebimentos;
- compras simples;
- diario de obra;
- fotos e anexos;
- relatorios cliente e interno;
- dashboard;
- notificacoes;
- Axia apenas como assistente consultiva, quando validada.

## Modulos E Acoes Restritas

- producao ampla;
- autosservico para qualquer empresa;
- cobranca automatica;
- assinatura digital;
- portal cliente;
- integracoes externas criticas;
- pagamentos online;
- faturacao fiscal;
- importacao massiva;
- permissoes avancadas customizadas;
- automacoes autonomas da Axia.

## Monitoramento Minimo

Validar diariamente:

- erros de Edge Functions;
- falhas de autenticacao;
- erros de RLS;
- erros de Storage;
- falhas de upload;
- falhas de geracao de proposta HTML/PDF;
- falhas de conversao orcamento para obra;
- falhas de calculo financeiro;
- falhas de diario bloqueado;
- notificacoes duplicadas;
- lentidao nas paginas principais.

Sem ferramenta dedicada de observabilidade, usar rotina manual:

- revisar logs do Supabase;
- revisar retornos das Edge Functions;
- revisar `audit_logs` de operacoes criticas;
- registrar incidentes no relatorio semanal.

## Backups

Antes de iniciar:

- fazer backup ou snapshot do banco;
- registrar versao do frontend;
- registrar versao das Edge Functions;
- registrar migrations aplicadas;
- confirmar que seeds demo nao serao misturados com dados reais.

Durante o piloto:

- validar backups periodicos;
- manter `audit_logs` ativos;
- preservar evidencias de erros criticos;
- nunca apagar dados reais sem backup e aprovacao.

## Feedback

Manter canal simples para cada empresa piloto registrar:

- dificuldade encontrada;
- funcionalidade usada;
- erro percebido;
- sugestao;
- urgencia;
- print ou descricao;
- usuario afetado;
- obra, orcamento ou fornecedor relacionado.

## Classificacao De Bugs

P0, corrigir imediatamente:

- vazamento de dados entre empresas;
- exposicao de custo, lucro ou margem para cliente;
- falha de login generalizada;
- perda de dados;
- erro em conversao de orcamento;
- erro grave de calculo financeiro;
- acesso indevido a arquivos;
- Edge Function critica quebrada.

P1, corrigir antes de ampliar:

- upload instavel;
- relatorio cliente quebrado;
- PDF/HTML com erro;
- diario que nao bloqueia corretamente;
- compra que gera custo duplicado;
- notificacao excessivamente duplicada;
- UX que impede fluxo principal.

P2, documentar para fase futura:

- ajustes visuais;
- textos melhores;
- filtros adicionais;
- atalhos;
- dashboards mais completos;
- permissoes granulares avancadas;
- melhorias de performance nao criticas.

## Criterios Para Continuar

- nenhum P0 aberto;
- P1 controlados ou corrigidos;
- fluxo principal usado por pelo menos uma empresa;
- dados financeiros coerentes;
- sem reclamacao grave de seguranca;
- usuarios conseguem criar orcamento e obra com pouca ajuda.

## Criterios Para Ampliar

- 7 a 14 dias sem P0;
- P1 principais corrigidos;
- feedback positivo ou aceitavel;
- suporte consegue acompanhar;
- monitoramento estavel;
- backups validados.

## Criterios Para Pausar

- qualquer P0 de seguranca;
- perda de dados;
- calculo financeiro errado relevante;
- falhas repetidas de Storage;
- falhas repetidas de Edge Functions;
- cliente nao consegue concluir o fluxo principal;
- suporte nao consegue acompanhar.

## Decisao Recomendada

Iniciar piloto controlado com 1 empresa, manter acompanhamento diario na primeira semana e ampliar somente apos revisao semanal sem P0.

## Execucao Do Primeiro Piloto

Estado atual:

- documentos operacionais preparados;
- relatorio diario preparado em `docs/pilot-daily-report.md`;
- relatorio final preparado em `docs/pilot-final-report.md`;
- backlog P2 preparado em `docs/pilot-backlog.md`;
- checklist final de entrada preparado em `docs/pilot-entry-checklist.md`.

Pendencias antes de criar a organizacao real:

- nome legal e nome curto da empresa piloto;
- email do usuario admin;
- email do usuario operacional, se houver;
- confirmacao do backup/snapshot antes de dados reais;
- confirmacao do ambiente exato onde a empresa sera criada;
- confirmacao do canal de suporte direto.
