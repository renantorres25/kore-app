# KORE App — Contexto do Projeto

> Última atualização: 07/06/2026
> Repositório: https://github.com/renantorres25/kore-app
> Deploy: https://kore-app-blue.vercel.app

---

## 🧠 O que é o KORE

Plataforma de performance integrada com IA — treino, sono, nutrição e recuperação. Atende dois perfis:

- **Cliente/Atleta** — acessa dashboard pessoal, registra sono/treino/nutrição, vê score de recuperação
- **Profissional** (Nutricionista / Personal Trainer) — acessa painel com lista de pacientes/alunos, agenda, perfil profissional, e página detalhada de cada paciente

Stack: **Next.js 15 (App Router) + TypeScript + Supabase + Vercel**

---

## 🎨 Design System — "Energetic Precision"

### Paleta de cores
```
C.energy   = '#FF5A36'  // laranja principal — CTAs, tabs ativas
C.energy2  = '#FF8A3D'  // laranja secundário — gradientes
C.good     = '#2DD4A7'  // verde teal — recuperação, nutricionista
C.sleep    = '#60A5FA'  // azul — sono, personal trainer
C.recovery = '#A78BFA'  // roxo — recuperação
C.warn     = '#F5B544'  // âmbar — alertas
C.danger   = '#FB7185'  // vermelho — perigo
C.t1       = '#F5F6F8'  // texto primário
C.t2       = '#9AA0AD'  // texto secundário
C.t3       = '#7A8290'  // texto terciário
```

### Fontes
- Display: `'Sora', system-ui` — headings, números grandes
- Body: `'Plus Jakarta Sans', system-ui` — texto corrido
- Mono: `'JetBrains Mono', ui-monospace` — dados, labels

### Glass card padrão
```css
background: rgba(255,255,255,0.065);
backdropFilter: blur(16px) saturate(130%);
border: 1px solid rgba(255,255,255,0.12);
borderRadius: 20px;
boxShadow: 0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5);
```

### Gradiente global (layout.tsx — fixo em todas as páginas)
```css
background: radial-gradient(ellipse 75% 55% at 8% 15%, rgba(255,90,54,0.38) ...)
/* Energia: vermelho-laranja no canto superior esquerdo */
/* + azul inferior esquerdo, verde inferior direito */
```

### Regras visuais
- **Nunca** usar `background: var(--bg-base)` ou `background: '#0d1117'` no `<main>` — bloqueia o gradiente global
- Cards usam glass com `backdropFilter` — não `background: var(--surface-1)`
- `style={{ }}` sempre com chaves duplas em JSX (não `style={ }`)
- Stat tiles de profissional: cada um com sua cor semântica + glow

---

## 📁 Arquivos principais

```
app/
├── layout.tsx                          # Gradiente global + noise overlay
├── dashboard/Dashboard.tsx             # Dashboard principal (todos os perfis)
│   ├── DashboardCliente                # Score ring, sono mini chart, plano
│   ├── DashboardPersonal               # Stat tiles azul, alunos
│   └── DashboardNutricionista          # Stat tiles coloridos (azul/verde/laranja)
├── components/
│   ├── SidebarProfissional.tsx         # Sidebar desktop para nutri/personal
│   └── NavBar.tsx                      # Nav mobile (clientes) + sidebar desktop (clientes)
├── nutricionista/
│   ├── pacientes/page.tsx              # Lista de pacientes
│   └── paciente/[id]/page.tsx          # Página detalhada do paciente (2545 linhas)
├── agenda/page.tsx                     # Agenda de consultas
├── perfil/page.tsx                     # Perfil do profissional
├── evolucao/page.tsx                   # Evolução do cliente (ScoreCard + Sparkline)
└── sono/page.tsx                       # Registro de sono
```

---

## ✅ O que foi feito nesta sessão

### 1. Score de Recuperação (Dashboard cliente)
- **`SonoMiniChart`**: curva bezier suave, label clampado (não clipa no topo), dias nulos mostram `—`, gradiente dinâmico pela cor do score
- **`ScoreRing`**: número 30px → 38px, peso 800 → 900, animação spring bounce

### 2. ScoreCard Evolução (`/evolucao`)
- **Sparkline**: escala honesta `domain=[40,100]` em vez de min-max (eliminava quedas dramáticas falsas)
- **Area path**: fecha no último ponto válido, não na borda direita do SVG
- **ScoreCard header**: número 60px/900, glow, `máx 14d` reposicionado

### 3. Dashboard Nutricionista
- **Lateral dupla removida**: `DashboardNutricionista` e `DashboardPersonal` não renderizavam mais `SidebarProfissional` internamente (já havia sidebar no Dashboard pai)
- **Stat tiles coloridos**: Pacientes=azul, Boa recuperação=verde, Treinaram=laranja — cada tile com glow e borda semântica
- **`MiniSparkline`**: aceita prop `color` para cor por tile

### 4. Sidebar e NavBar
- **`SidebarProfissional.tsx`** reescrita com design system: logo KORE gradiente energy, dot colorido por tipo, items com underline energy no ativo, avatar com cor semântica
- **`NavBar.tsx`**: profissionais no desktop retornam `null` — sem sidebar dupla
- Regra: `if (isDesktop && (tipo === 'nutricionista' || tipo === 'personal')) return null`

### 5. Páginas de profissional
- **`/perfil`**: removido `paddingLeft: isDesktop ? 220 : 0` (causava deslocamento duplo com sidebar flex)
- **`/agenda`**: fundo sólido removido, header/toggle atualizados, `NavBar` mobile suprimida para profissionais
- **`/nutricionista/pacientes`**: fundo sólido removido

### 6. Página de paciente `/nutricionista/paciente/[id]`
- **Fundo**: removido `background: var(--bg-base)` — gradiente global aparece
- **Header**: glass backdrop-blur, gradiente sutil energy, avatar verde com glow
- **Tabs**: underline laranja energy no ativo
- **Cards Visão Geral**: glass (backdropFilter) em todos
- **Dados de hoje**: Recuperação=verde, Treino hoje=laranja, Bem-estar=azul — cada um com glow de fundo
- **Plano empty state**: card glass com borda energy, botão "Gerar IA" laranja gradiente
- **IA Clínica**: botão energy orange, empty state glass, resumo com borda energy, verde excessivo removido
- **Nota clínica**: movida de `fixed bottom-20 left-4` (conflitava com sidebar) para `fixed bottom-24 right-24` (bottom-right)
- **NavBar mobile**: removida para nutricionista
- **`var(--surface-1)` e `var(--accent)`**: 100% substituídos por valores explícitos KORE

---

## ⚠️ Problemas recorrentes desta sessão

### File truncation via Edit tool
O `Edit` tool truncou arquivos várias vezes quando o `old_string` tinha correspondência parcial ou múltipla. **Solução adotada**: usar Python via bash — ler arquivo do git (`git show origin/main:path`), aplicar `.replace()` targetado, escrever o arquivo inteiro de volta.

### JSX style braces
f-strings Python: `f"style={{ {VAR} }}"` produz `style={ content }` (uma chave) em vez de `style={{ content }}` (duas chaves). **Solução**: usar strings literais ou regex de verificação pós-escrita.

### Commits simultâneos
Renan e Giovanni commitando ao mesmo tempo causou conflitos de merge e arquivos corrompidos. O amigo do Renan (renantorres25) corrigiu arquivos via commits de fix. Sempre fazer `git pull origin main --rebase` antes do push.

### index.lock
Frequente `fatal: Unable to create '.git/index.lock'` — resolver com `del .git\index.lock` no PowerShell antes do `git add`.

### Dashboard_HEAD_test.tsx
Arquivo de teste criado acidentalmente no `app/dashboard/` causou build failures no Vercel por 5+ commits. Removido manualmente.

---

## 🔄 Workflow de mudanças (seguro)

```python
# 1. Obter arquivo limpo do git
result = subprocess.run(['git', 'show', 'origin/main:path/to/file.tsx'], ...)
content = result.stdout

# 2. Aplicar mudanças com .replace() ou regex
content = content.replace(old_string, new_string)

# 3. Verificar integridade
assert content.count("var(--surface-1)") == 0
assert len(re.findall(r'style=\{ [^{]', content)) == 0  # zero single-brace
assert content.splitlines()[-1] == '}'  # arquivo não truncado

# 4. Escrever
with open('/path/to/file.tsx', 'w') as f:
    f.write(content)
```

### Commit no terminal do usuário
```bash
cd Desktop/Kore/kore-app
git add .
git commit -m "mensagem descritiva"
git pull origin main --rebase
git push origin main
```

---

## 🚧 Pendente / Próximos passos

- [ ] Verificar visual das abas Plano, Treino, Anamnese, Evolução na página de paciente
- [ ] Testar Nota clínica no novo posicionamento (bottom-right)
- [ ] Verificar comportamento mobile do profissional (sem NavBar)
- [ ] Página `/personal/aluno/[id]` — mesma aplicação de design system
- [ ] `app/bem-estar/page.tsx` — tem erros TSC pré-existentes (não bloqueiam build)

---

## 🔑 Variáveis de ambiente (Supabase)
Configuradas no Vercel — não estão no repositório. Ver `.env.local` local ou Vercel Dashboard > Settings > Environment Variables.
