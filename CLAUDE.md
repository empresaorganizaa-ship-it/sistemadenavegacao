# Instruções para o Claude Code

- A dona do projeto não é programadora: explique cada passo em português simples.
- Especificação: `SPEC-sistema-acompanhamento.md`. Construir uma fase por vez (seção 7).
- Interface 100% em pt-BR, mobile-first, R$ e dd/mm/aaaa (use `src/lib/formatos.ts`).
- Toda tabela nova: coluna `workspace_id`, colunas de auditoria (`created_by`, `created_at`,
  `updated_by`, `updated_at`) com o gatilho `tg_auditoria`, RLS ativado e políticas usando
  `sou_membro`, `pode_editar_operacional` (dados do dia a dia) ou `pode_administrar`
  (entregáveis e configurações). Acrescente casos em `testes/banco/rls_test.sql`.
- Migrations novas em arquivos novos (`supabase/migrations/AAAAMMDDHHMMSS_nome.sql`); nunca
  editar uma migration que já foi aplicada em produção.
- Cores e fontes: só via tokens em `src/app/globals.css` e `src/app/layout.tsx`.
- Nunca colocar chaves secretas no código; só `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` são usadas.
- Antes de entregar: `npm test`, `npm run test:db`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
