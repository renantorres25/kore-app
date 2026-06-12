# Auditoria KORE — revisão pós-alterações
**Data:** 12/06/2026 · **Base:** código atual do repositório (não o site no ar) · **Status:** catálogo para execução posterior (nada foi corrigido nesta passada)

Cada achado tem **ID**, **severidade**, **o que é**, **por que importa** e **recomendação**. Confiança marcada como [Certeza] (lido no código), [Provável] (inferência forte) ou [Validar] (precisa de teste no ambiente).

---

## 🔴 Segurança (prioridade real)

### RA-S01 · Webhook da Terra sem validação de assinatura — [Certeza] · Alta
`app/api/terra/webhook/route.ts` é um endpoint **público** que grava dados de saúde (sono, atividades) com base no `user.reference_id` que vem no corpo da requisição. Há um `// TODO: validar assinatura` não implementado. Qualquer pessoa que descubra um `usuario_id` pode injetar dados falsos de wearable.
**Recomendação:** validar o header `terra-signature` com `TERRA_WEBHOOK_SECRET` antes de processar; rejeitar o que não bater.

### RA-S02 · Rota de convite pública e sem autenticação — [Provável] · Alta
`app/api/convite/route.ts` aceita `profissional_id` e `email_convidado` do corpo, cria o convite e dispara e-mail — **sem verificar quem está chamando**. Um terceiro pode disparar convites/e-mails em nome de qualquer profissional (spam, abuso da conta Resend, poluição da tabela `convites`).
**Recomendação:** exigir sessão autenticada e confirmar que o `profissional_id` é o próprio usuário logado (token via `Authorization`, como nas rotas admin).

### RA-S03 · `/api/admin/equipe` (GET) sem restrição de papel — [Certeza] · Média
O menu esconde "Equipe" de quem não é super-admin, mas a **API GET não restringe papel**. Um admin `sac`/`financeiro`/`analista` pode chamar a rota direto e ver toda a equipe (nomes, e-mails, papéis). Princípio do menor privilégio.
**Recomendação:** gatear o GET a `super_admin` (igual ao POST e ao nav). Observação leve: `/api/admin/analise` também não tem gate de papel — aceitável por ser só agregado, mas vale revisar.

### RA-S05 · Webhook do Strava (POST) sem verificação de origem — [Certeza] · Baixa
O GET valida `STRAVA_VERIFY_TOKEN` (ok). O POST processa por `owner_id` sem assinatura — é o modelo do próprio Strava (não assina payloads), então risco baixo. Apenas monitorar.

---

## 🟠 Entrega de e-mail (trava o núcleo do produto)

### RA-X01 · Fluxo de convite (o "triângulo") está cego sem e-mail — [Certeza] · Alta
Convites e digest usam o remetente de teste `onboarding@resend.dev`, que **só entrega ao dono da conta Resend**. Resultado: o profissional convida o atleta, acha que deu certo, e o e-mail **não chega**. Como a conexão atleta–profissional é o coração da proposta do KORE, isso é mais do que um bug de e-mail — trava o valor central.
**Recomendação (dois caminhos):** (1) registrar um **domínio** e verificar no Resend — resolve convite + digest + aviso de SAC de uma vez; e/ou (2) **independente de e-mail**, expor o **link do convite para o profissional copiar e enviar manualmente** (WhatsApp, etc.). O caminho 2 destrava o fluxo hoje.

---

## 🟡 Performance / escala

### RA-P01 · Enumeração completa de `auth.users` repetida — [Certeza] · Média
`kpis`, `alertas` e `digest` cada um pagina **todos** os usuários do Auth (até 50 páginas de 1000). Numa carga do Cockpit isso são até 3 varreduras completas independentes. No piloto tudo bem; conforme a base cresce, vira gargalo e custo.
**Recomendação:** centralizar num único helper com cache curto (ex.: 60s) ou materializar `last_sign_in_at`/`created_at` numa tabela/视图 alimentada por evento.

### RA-P02 · Contagens "distinct" em memória (limit 10.000) — [Certeza] · Baixa
`analise` e `alertas` carregam até 10k linhas para contar valores distintos (sono, bem-estar, wearables). Ok agora; reavaliar com volume (mover a contagem para SQL `count(distinct ...)`).

---

## 🟢 Qualidade de código / limpeza

### RA-Q01 · Logs de diagnóstico em produção — [Certeza] · Baixa
`app/dashboard/Dashboard.tsx` tem `console.debug('[F02-diag] …')` disparando **a cada resize**. No total há ~25 `console.*` espalhados.
**Recomendação:** uma passada de limpeza removendo logs de diagnóstico; manter só logs de erro intencionais (ex.: `[digest] Resend error`).

### RA-Q02 · URL base hardcoded como fallback — [Certeza] · Baixa
7 rotas usam `https://kore-app-blue.vercel.app` como fallback de `NEXT_PUBLIC_APP_URL` (convite, reset de senha, strava, terra). Ao migrar para domínio próprio, **definir `NEXT_PUBLIC_APP_URL`** no ambiente — senão links de convite/reset apontam para o domínio antigo.

---

## 🔵 Funcional / UX

### RA-U01 · Convite sem feedback quando o e-mail não sai — [Provável] · Média
Ligado ao RA-X01: o profissional não recebe sinal de que o convidado não foi notificado. **Recomendação:** mostrar o link do convite na tela após criar (copiável), independente do e-mail.

### RA-U02 · `/suporte`: falha silenciosa ao enviar mensagem — [Certeza] · Baixa
Se o `insert` em `ticket_mensagens` falhar, o usuário não vê erro. **Recomendação:** exibir mensagem de erro como já é feito na abertura do chamado.

### RA-A01 · Status "suspenso" na ficha — [Validar] · Baixa
A ficha já calcula suspensão por `banned_until`. Falta só **validar no ambiente** com um usuário suspenso de teste para confirmar que o Supabase devolve o campo como esperado.

### RA-A02 · Mensagem genérica ao adicionar admin — [Certeza] · Baixa
`equipe` adicionar junta "já é admin" com falha real numa só mensagem. Diferenciar para clareza.

### RA-U03 · Admin não-responsivo no mobile — [Certeza] · Baixa
Sidebar fixa de 220px; admin pensado para desktop. Baixa prioridade (adiado da Onda 5 como AD18).

---

## ⚪ Já mapeados / dependentes de decisão externa
- **Cobrança/financeiro real** (checkout, webhook de pagamento, MRR real): depende da escolha do **provedor de pagamento**.
- **Digest por e-mail** e **aviso de resposta do SAC por e-mail**: dependem de **domínio** verificado no Resend. (A conversa do SAC e o aviso in-app já funcionam.)
- **Coortes de retenção (D1/D7/D30)**: aguardam acúmulo de telemetria.

---

## Resumo executivo
O sistema está sólido após as alterações. Os dois pontos que eu trataria **primeiro**, porque têm impacto real e não dependem de mais ninguém além de pequenas correções de código, são: **RA-S01 (webhook Terra)** e **RA-S02 (convite sem auth)**. Logo depois, **RA-X01/RA-U01 (link de convite copiável)** destrava o núcleo do produto sem precisar esperar o domínio. O resto é higiene (limpeza de logs, performance preventiva, mensagens de erro) e pode entrar aos poucos.
