# Pilot Entry Checklist — Obra Sys Brasil PME

## Objetivo

Checklist final antes de ativar a primeira empresa real no piloto controlado.

Status permitido: 1 empresa piloto, dados limitados, acompanhamento diario e sem producao ampla.

## Ambiente

- [ ] Confirmar que o ambiente e o correto para piloto.
- [ ] Confirmar que producao ampla continua bloqueada.
- [ ] Confirmar que nao ha liberacao para segunda empresa.
- [ ] Confirmar project ref Supabase usado no piloto.
- [ ] Confirmar URL do frontend liberado para a empresa.
- [ ] Confirmar versao do frontend.
- [ ] Confirmar versao das Edge Functions.
- [ ] Confirmar migrations aplicadas.

## Backup E Evidencias

- [ ] Confirmar backup/snapshot antes de inserir dados reais.
- [ ] Registrar data e hora do backup.
- [ ] Registrar responsavel pelo backup.
- [ ] Registrar versao do frontend no momento do backup.
- [ ] Registrar versao das Edge Functions no momento do backup.
- [ ] Confirmar que `audit_logs` estao ativos.
- [ ] Confirmar onde evidencias de erro serao guardadas.

## Seguranca

- [ ] Confirmar RLS ativo.
- [ ] Confirmar cross-tenant aprovado no staging.
- [ ] Confirmar Storage privado.
- [ ] Confirmar signed URLs validadas.
- [ ] Confirmar que buckets nao estao publicos.
- [ ] Confirmar que `service_role` nao esta no frontend.
- [ ] Confirmar que proposta cliente nao mostra custo, margem ou lucro.
- [ ] Confirmar que relatorio cliente nao mostra custo, margem ou lucro.
- [ ] Confirmar que usuario sem permissao financeira nao ve dados sensiveis.

## Empresa Piloto

- [ ] Confirmar nome da empresa.
- [ ] Confirmar responsavel principal.
- [ ] Confirmar aceite de piloto controlado.
- [ ] Confirmar aceite de dados limitados.
- [ ] Confirmar canal de suporte direto.
- [ ] Confirmar horario do primeiro acompanhamento.
- [ ] Confirmar que a empresa aceita validacao manual dos dados criticos.

## Limites Iniciais

- [ ] Maximo de 2 usuarios.
- [ ] Maximo de 2 obras.
- [ ] Maximo de 5 orcamentos PME.
- [ ] Maximo de 10 fornecedores.
- [ ] Maximo de 20 fotos/anexos por obra.
- [ ] Sem importacao massiva.
- [ ] Sem uso fiscal ou contabil oficial.
- [ ] Sem portal cliente.
- [ ] Sem cobranca automatica.

## Usuarios

- [ ] Criar usuario admin da empresa.
- [ ] Criar usuario operacional, se necessario.
- [ ] Confirmar permissao do admin.
- [ ] Confirmar permissao do operacional.
- [ ] Confirmar login dos usuarios.
- [ ] Confirmar que usuario operacional nao ve custo, margem ou lucro se nao tiver permissao.

## Fluxo Guiado Inicial

- [ ] Criar organizacao.
- [ ] Configurar dados basicos da empresa.
- [ ] Criar primeiro cliente.
- [ ] Criar primeiro orcamento PME.
- [ ] Adicionar ambiente.
- [ ] Adicionar item manual.
- [ ] Adicionar item do catalogo.
- [ ] Gerar proposta.
- [ ] Aprovar orcamento.
- [ ] Converter em obra.
- [ ] Criar tarefa.
- [ ] Lancar custo real.
- [ ] Registrar recebimento.
- [ ] Criar diario.
- [ ] Adicionar foto/anexo.
- [ ] Gerar relatorio cliente.
- [ ] Ver dashboard.
- [ ] Confirmar entendimento do usuario.

## Decisao De Entrada

- [ ] Liberado para iniciar piloto.
- [ ] Aguardar correcao P0/P1.
- [ ] Pausar entrada da empresa.

Observacoes:
