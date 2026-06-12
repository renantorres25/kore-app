# Handoff de Auditoria — KORE
### Instruções para o Claude que mantém o sistema (a "raiz")

> **Quem escreveu isto:** um Claude rodando em modo Cowork que auditou o KORE em produção e a campo (logado nos três perfis), navegando `https://kore-app-blue.vercel.app` e lendo o código-fonte no repositório. Este documento é para **você**, o Claude que tem acesso de escrita ao sistema matriz, executar as correções com segurança.
>
> **Você recebeu 3 anexos:**
> 1. `Auditoria_KORE_v2.docx` — o relatório completo (narrativo, por severidade).
> 2. `Auditoria_KORE_Tracker.xlsx` — a planilha de execução (1 linha por item, com status).
> 3. **Este arquivo** — como ler tudo e como executar.

---

## 0. Leia isto antes de tocar em qualquer linha (verdades que vão te poupar horas)

1. **A auditoria foi feita sobre o site em produção, que estava DESATUALIZADO.** Em 07/06/2026 fizemos um redeploy do `main`, então produção agora deve refletir o código atual — mas a consequência permanece: **vários "bugs" do relatório já estavam corrigidos no código.** Exemplos confirmados: `F23` (CTAs da landing já iam para `/login`) e `F15` (badge do sino já condicionado a `notifCount > 0`). **Regra de ouro: antes de "corrigir" qualquer item, reproduza-o no código atual. Se já estiver resolvido, marque como concluído e siga.** Não confie na descrição do site, confie no código.

2. **Ruído de fim-de-linha (CRLF).** O working tree tem ~60 arquivos marcados como modificados, mas o conteúdo é idêntico — é só CRLF. Use `git diff --ignore-all-space` para ver mudanças reais. **Ao commitar, adicione apenas os arquivos que você realmente alterou (por nome), nunca `git add -A`** — senão você sobe 60 arquivos de ruído.

3. **Navegação: NavBar = mobile, SidebarProfissional = desktop — por design (NÃO é menu duplo).** `app/components/NavBar.tsx` cobre o mobile e **retorna `null` no desktop para profissionais** — confirmado em `NavBar.tsx` linha 85: `if (isDesktop && (tipo === 'nutricionista' || tipo === 'personal')) return null`. `app/components/SidebarProfissional.tsx` é a sidebar de desktop. Portanto, páginas que renderizam OS DOIS (`agenda`, `perfil`, `nutricionista/pacientes`) **não têm bug de menu duplo** — é o split mobile/desktop intencional. **Não remova essa coexistência.**
   - **O problema real (F25):** `app/personal/page.tsx` e `app/personal/aluno/[id]/page.tsx` renderizam **só o `NavBar`** — como ele some no desktop para profissionais, essas telas ficam **sem sidebar no desktop**. Falta aplicar o `SidebarProfissional` nelas (igual às telas do nutri). Isso já está na lista de pendências do próprio time. Detalhes na seção 5.

4. **Há uma migração de banco pendente.** O pull trouxe `supabase/migrations/20260607_templates_planos.sql`. Publicar o front **não** aplica isso no Supabase. Se features de "templates de planos" derem erro em produção, é porque essa migração não foi aplicada. Avise o Giovanni antes de assumir que é bug de código.

5. **Stack:** Next.js 16 (App Router, `app/`), React 19, Tailwind v4, TypeScript, Supabase (auth + dados via `app/components/AuthProvider.tsx` e `app/lib/supabase.ts`), `@anthropic-ai/sdk` (features de IA). Deploy: Vercel auto-deploy ao `git push origin main`. Giovanni publica pelo terminal.

6. **App em produção, com usuários e dados reais.** Não rode operações destrutivas no banco. Valide build antes de subir. Prefira branch + verificação. Os cadastros vivem no Supabase e **não** são afetados por deploy de código.

---

## 1. Como ler a planilha (`Auditoria_KORE_Tracker.xlsx`)

Aba **"Auditoria KORE"** — uma linha por item. Colunas:

| Coluna | O que é |
|---|---|
| **ID** | Código do achado (ex.: `F24`). Bate com o relatório v2 e com este doc. |
| **Prioridade** | `Concluído` (verde) / `Alta` (vermelho) / `Média` (amarelo) / `Baixa` / `Validar` (azul). Cor na própria célula. |
| **Área / Tela** | Onde acontece. |
| **Problema** | O sintoma. |
| **Como corrigir** | Direção da correção (resumo; detalhe no relatório v2 e seção 5 daqui). |
| **Quem faz** | `Claude (fix seguro)` = isolado, baixo risco · `Precisa dev` = estrutural · `Decisão sua` = depende de escolha do Giovanni · `Validar em ambiente` = testar, não codar. |
| **Status** | `Concluído ✅` / `A fazer`. **Atualize aqui conforme avança.** |
| **Notas** | Observações / onde conferir. |

Aba **"Resumo"** — contagem por categoria. Hoje: **4 concluídos**, **29 pendentes** (6 Alta, 10 Média, 9 Baixa, 4 Validar).

**Como trabalhar a planilha:** filtre por `Prioridade = Alta`, pegue um item, **verifique no código se ainda existe** (regra de ouro), corrija, rode `npm run build`, atualize o `Status`. Repita.

---

## 2. Como ler o relatório (`Auditoria_KORE_v2.docx`)

Estrutura: seção 1 (o que mudou da v1), 2 (sumário executivo), 3 (cobertura/metodologia + o que NÃO foi testado), 4 (mapa do sistema), **5 (achados detalhados, por severidade)**, 6 (análise visual transversal: cores, consistência, a11y, mobile), 7 (plano de execução), 8 (próximos passos).

Cada achado traz **Severidade, Confiança, Área, Evidência, Impacto, Recomendação**. Atenção: **`F01` está RETRATADO** — na 1ª passada (deslogado) concluí que Personal e Nutri "não existiam"; logado, confirmei que existem e funcionam. Não aja sobre F01.

A confiança importa: `[Certeza]` = verificado; `[Provável]` = inferência forte; trate `[Provável]` como hipótese a confirmar no código.

---

## 3. Método de execução recomendado (por item)

1. **Branch:** trabalhe fora do `main` (ex.: `fix/auditoria-lote-N`).
2. **Reproduza no código atual** (regra de ouro). Já corrigido → marque concluído, pule.
3. **Mudança mínima**, preservando o CRLF do arquivo (edite só o trecho; não reescreva o arquivo inteiro).
4. **Valide com `npm run build`.** ⚠️ Não confie em transpilar arquivo isolado (`ts.transpileModule`) para validar: ele dá falsos "unterminated string / no closing tag" em alguns `.tsx` deste projeto (por `<` de comparação interpretado como JSX). O validador confiável é o **build completo**. `npm run build` lê `.env.local` (presente).
5. **Commit cirúrgico:** `git add <só os arquivos tocados>` → `git commit`. Nunca `git add -A`.
6. **Atualize o Status** na planilha.
7. **Ordem sugerida:** Alta (estrutural/legal) → Média → Baixa. Mas `F24` precisa da decisão do Giovanni sobre o componente-alvo antes de executar.

---

## 4. Já feito (não refaça)

- **F04** — `app/not-found.tsx` criado (404 em PT-BR, identidade KORE). Commitado e no ar.
- **F10** — removido `textTransform:'capitalize'` da data em `app/treino/page.tsx` (L645), `app/sono/page.tsx` (L711), `app/nutricao/page.tsx` (L919); aplicada capitalização só da 1ª letra. Sugestão de melhoria futura: extrair um util único de data (hoje a formatação está duplicada em várias telas).
- **F23, F15** — já estavam corretos no código; só faltava o deploy (feito). Apenas confirme no ar.

---

## 5. Guia técnico dos itens de Alta prioridade

### F25 — Aplicar SidebarProfissional nas telas de Personal (já é pendência do time)
- **O quê:** `app/personal/page.tsx` e `app/personal/aluno/[id]/page.tsx` usam só `<NavBar tipo="personal">`, que retorna `null` no desktop para profissionais → essas telas ficam **sem sidebar no desktop**. Aplicar o mesmo padrão das telas do nutri (que já funcionam). O design system já está decidido; é só terminar a migração aqui.
- **`SidebarProfissional` já aceita `tipo="personal"`** (navItems prontos: Início, Alunos, Agenda, Perfil).
- **Padrão de wrapper** (copiar de `app/nutricionista/pacientes/page.tsx`):
  ```tsx
  <main className="min-h-[100dvh] text-white md:flex">
    <SidebarProfissional tipo="personal" />
    <div className="flex-1 md:overflow-y-auto md:h-screen">
      <div className="max-w-md mx-auto px-4 pb-28 md:max-w-3xl md:px-8">
        {/* conteúdo */}
      </div>
    </div>
  </main>
  ```
- **NÃO é "menu duplo":** páginas com NavBar + SidebarProfissional usam o split mobile/desktop intencional (NavBar some no desktop p/ pros — `NavBar.tsx` L85). Mantenha o NavBar para o mobile.
- Mantenha a regra do design system: nunca pôr `background` sólido no `<main>` (bloqueia o gradiente global); usar glass nos cards.

### F02 — Hidratação (1º clique engolido)
- Sintoma: o 1º clique em botões logo após carregar não dispara; o 2º sim. Reproduz em "Entrar", "EDITAR" (meta) e CTAs.
- Direções: verificar se handlers dependem de estado de auth assíncrono (`AuthProvider`) que só resolve após hidratar; procurar hydration mismatch no console; considerar desabilitar/indicar "carregando" nos controles até interativos.

### F26 — Consentimento LGPD no cadastro
- `app/login/page.tsx` (aba "Criar conta"): adicionar checkbox obrigatório + links de Termos e Política de Privacidade antes de habilitar "CRIAR CONTA". App coleta dados de saúde (sono, peso, lesões) — prioridade legal. Texto legal é decisão do Giovanni.

### F27 — Validação e guard no login
- `app/login/page.tsx`: inputs de e-mail/senha com `required=false`, sem `minLength`, sem `autocomplete`. Adicionar `required`, `minLength` na senha, `autocomplete="email" | "current-password" | "new-password"`. E redirecionar usuário já autenticado que acessa `/login` para `/dashboard` (hoje não há guard).

### PERIO — `/personal/periodizacao` em 404
- A rota base 404a (a página real exige `[clienteId]`). Garantir acesso só com o parâmetro ou criar um índice. Com o F04 (404 PT-BR) já fica menos grave.

> Para os itens de Média/Baixa, a coluna "Como corrigir" da planilha + a "Recomendação" de cada achado no relatório v2 são suficientes. Itens marcados `Claude (fix seguro)` (F32, F19, F29, F31, F20, F21) são isolados e bons para começar a ganhar tração.

---

## 6. O que NÃO dá para resolver só no código (passar ao Giovanni / testar)

- **Mobile (MOB):** a responsividade é **inconsistente** — parte das telas usa classes `md:` (mobile-first), parte não (ex.: dashboard do atleta). Precisa teste em device real + padronização. É a validação mais importante (app é mobile-first).
- **Acessibilidade (A11Y):** contraste estático medido OK; faltam foco de teclado, ordem de tabulação, leitor de tela e contraste sobre gradientes.
- **Formulários (FORM):** envio/validação/erro não foram exercitados (não submetemos dados reais).
- **Performance (PERF):** medir CLS/LCP (o jank de scroll sugere CLS alto).
- **Decisões do Giovanni:** componente-alvo de navegação (F24), modelo de "semana do ciclo" (F07), fórmula de progresso da meta (F08), CTA primário da home (F18), texto legal (F26).

---

## 7. Guardrails finais

- Confirme cada item no código antes de "corrigir" (regra de ouro — repetida de propósito).
- `npm run build` verde antes de qualquer push.
- Commits cirúrgicos; nada de `git add -A` (CRLF).
- Não rode migrações/escritas destrutivas no Supabase de produção.
- Deploy é por `git push origin main` → Vercel. Em caso de problema no ar, dá para reverter no painel da Vercel (Deployments → versão anterior → "Promote to Production"); os dados não são afetados.
- Atualize o `Status` na planilha a cada item — é assim que o Giovanni acompanha.

Boa execução. O sistema é melhor do que aparenta por fora; o que falta é, na maior parte, **costura e consistência** — e a base para isso (tokens em `globals.css`, `SidebarProfissional`) já existe no próprio código.
