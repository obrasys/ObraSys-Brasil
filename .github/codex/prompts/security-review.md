# Security Review — Obra Sys Brasil

Leia `AGENTS.md`.

Atue como Agente Segurança.

Revise este PR procurando:

1. RLS ausente ou fraco
2. vazamento cross-tenant
3. organization_id confiado do frontend
4. user_id confiado do body
5. uso indevido de service_role
6. endpoint público inseguro
7. dados sensíveis enviados para Axia
8. margem interna exposta para usuários sem permissão

Responda com problemas objetivos e patches mínimos.
