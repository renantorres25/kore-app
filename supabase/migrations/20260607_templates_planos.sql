-- Biblioteca de modelos de plano alimentar (FEATURE 3)
-- Estrutura já preparada para nutricionistas salvarem seus próprios modelos no futuro
-- (coluna criado_por + publico), mesmo que ainda não exista interface para isso.

create table if not exists templates_planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  objetivo text not null,
  conteudo jsonb not null,
  criado_por uuid references perfis(id),
  publico boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_templates_planos_objetivo on templates_planos (objetivo);

alter table templates_planos enable row level security;

create policy "templates_planos_select"
  on templates_planos for select
  using (publico = true or criado_por = auth.uid());

create policy "templates_planos_insert_proprio"
  on templates_planos for insert
  with check (criado_por = auth.uid());

create policy "templates_planos_update_proprio"
  on templates_planos for update
  using (criado_por = auth.uid());

create policy "templates_planos_delete_proprio"
  on templates_planos for delete
  using (criado_por = auth.uid());

-- ── Modelos pré-cadastrados (públicos, sem dono) ────────────────────────────

insert into templates_planos (nome, descricao, objetivo, conteudo, publico) values

('Emagrecimento equilibrado',
 'Déficit calórico moderado com proteínas magras e fibras para manter saciedade ao longo do dia.',
 'perda_peso',
 $$
{
  "nota_nutri": "Plano com déficit calórico moderado, priorizando proteínas magras, vegetais e fibras para sustentar a saciedade entre as refeições.",
  "refeicoes": [
    { "nome": "Café da manhã", "horario": "07:00", "calorias": 270, "proteina": 16,
      "alimentos": [
        { "nome": "Ovos mexidos", "quantidade": "2 unidades", "calorias": 140, "proteina": 12 },
        { "nome": "Pão integral", "quantidade": "1 fatia", "calorias": 70, "proteina": 3 },
        { "nome": "Mamão", "quantidade": "1 fatia média", "calorias": 60, "proteina": 1 }
      ] },
    { "nome": "Lanche da manhã", "horario": "10:00", "calorias": 190, "proteina": 11,
      "alimentos": [
        { "nome": "Iogurte natural desnatado", "quantidade": "170g", "calorias": 100, "proteina": 10 },
        { "nome": "Banana", "quantidade": "1 unidade", "calorias": 90, "proteina": 1 }
      ] },
    { "nome": "Almoço", "horario": "12:30", "calorias": 355, "proteina": 43,
      "alimentos": [
        { "nome": "Frango grelhado", "quantidade": "120g", "calorias": 200, "proteina": 36 },
        { "nome": "Arroz integral", "quantidade": "4 colheres de sopa", "calorias": 110, "proteina": 3 },
        { "nome": "Brócolis refogado", "quantidade": "1 xícara", "calorias": 35, "proteina": 3 },
        { "nome": "Salada verde à vontade", "quantidade": "1 prato", "calorias": 10, "proteina": 1 }
      ] },
    { "nome": "Lanche da tarde", "horario": "15:30", "calorias": 200, "proteina": 24,
      "alimentos": [
        { "nome": "Whey protein", "quantidade": "1 dose (30g)", "calorias": 120, "proteina": 24 },
        { "nome": "Maçã", "quantidade": "1 unidade", "calorias": 80, "proteina": 0 }
      ] },
    { "nome": "Jantar", "horario": "19:30", "calorias": 280, "proteina": 32,
      "alimentos": [
        { "nome": "Tilápia grelhada", "quantidade": "120g", "calorias": 140, "proteina": 28 },
        { "nome": "Batata doce cozida", "quantidade": "100g", "calorias": 90, "proteina": 2 },
        { "nome": "Legumes no vapor", "quantidade": "1 xícara", "calorias": 50, "proteina": 2 }
      ] }
  ],
  "hidratacao": { "litros_dia": 2.5, "orientacao": "Beba água ao longo de todo o dia, especialmente antes das refeições — ajuda na saciedade." },
  "orientacao_treino": "Consuma uma fonte leve de carboidrato antes do treino e combine proteína com carboidrato na refeição seguinte para recuperação.",
  "estrategia_desafio": "Nos momentos de fome fora de hora, priorize alimentos ricos em fibra e proteína, que prolongam a saciedade.",
  "dica_fome": "Mantenha sempre frutas e iogurte à mão para evitar escolhas por impulso entre as refeições."
}
$$::jsonb,
 true),

('Ganho de massa muscular',
 'Superávit calórico moderado com alta ingestão proteica distribuída ao longo do dia, incluindo refeições ao redor do treino.',
 'ganho_massa',
 $$
{
  "nota_nutri": "Plano com superávit calórico moderado e proteína elevada em todas as refeições, com atenção especial ao período próximo ao treino.",
  "refeicoes": [
    { "nome": "Café da manhã", "horario": "07:00", "calorias": 450, "proteina": 24,
      "alimentos": [
        { "nome": "Ovos inteiros", "quantidade": "3 unidades", "calorias": 210, "proteina": 18 },
        { "nome": "Aveia em flocos", "quantidade": "40g", "calorias": 150, "proteina": 5 },
        { "nome": "Banana", "quantidade": "1 unidade", "calorias": 90, "proteina": 1 }
      ] },
    { "nome": "Lanche da manhã", "horario": "10:00", "calorias": 235, "proteina": 10,
      "alimentos": [
        { "nome": "Pão integral", "quantidade": "2 fatias", "calorias": 140, "proteina": 6 },
        { "nome": "Pasta de amendoim", "quantidade": "1 colher de sopa", "calorias": 95, "proteina": 4 }
      ] },
    { "nome": "Almoço", "horario": "12:30", "calorias": 570, "proteina": 48,
      "alimentos": [
        { "nome": "Carne bovina magra", "quantidade": "150g", "calorias": 280, "proteina": 38 },
        { "nome": "Arroz branco", "quantidade": "5 colheres de sopa", "calorias": 150, "proteina": 3 },
        { "nome": "Feijão", "quantidade": "1 concha", "calorias": 80, "proteina": 5 },
        { "nome": "Legumes refogados", "quantidade": "1 xícara", "calorias": 60, "proteina": 2 }
      ] },
    { "nome": "Pré-treino", "horario": "16:00", "calorias": 200, "proteina": 4,
      "alimentos": [
        { "nome": "Banana", "quantidade": "1 unidade", "calorias": 90, "proteina": 1 },
        { "nome": "Pão integral com mel", "quantidade": "1 fatia", "calorias": 110, "proteina": 3 }
      ] },
    { "nome": "Pós-treino", "horario": "18:00", "calorias": 310, "proteina": 39,
      "alimentos": [
        { "nome": "Whey protein", "quantidade": "1,5 dose (45g)", "calorias": 180, "proteina": 36 },
        { "nome": "Batata doce cozida", "quantidade": "150g", "calorias": 130, "proteina": 3 }
      ] },
    { "nome": "Jantar", "horario": "20:30", "calorias": 530, "proteina": 60,
      "alimentos": [
        { "nome": "Frango grelhado", "quantidade": "180g", "calorias": 300, "proteina": 54 },
        { "nome": "Arroz integral", "quantidade": "5 colheres de sopa", "calorias": 140, "proteina": 4 },
        { "nome": "Salada com azeite", "quantidade": "1 prato", "calorias": 90, "proteina": 2 }
      ] }
  ],
  "hidratacao": { "litros_dia": 3, "orientacao": "Aumente a ingestão de água nos dias de treino para compensar a perda pelo suor." },
  "orientacao_treino": "Faça uma refeição rica em carboidratos cerca de 1h30 antes do treino e combine proteína com carboidrato logo após para recuperação.",
  "estrategia_desafio": "Se tiver dificuldade em bater as calorias do dia, fracione as porções maiores em refeições adicionais ao longo do dia.",
  "dica_fome": "Tenha sempre lanches calóricos práticos por perto — oleaginosas, frutas secas, pão com pasta de amendoim — para não pular refeições."
}
$$::jsonb,
 true),

('Manutenção equilibrada',
 'Plano variado e sustentável para manter peso e composição corporal no dia a dia.',
 'manutencao',
 $$
{
  "nota_nutri": "Plano equilibrado, com boa variedade de grupos alimentares, pensado para sustentar o peso e a composição corporal no longo prazo.",
  "refeicoes": [
    { "nome": "Café da manhã", "horario": "07:30", "calorias": 270, "proteina": 15,
      "alimentos": [
        { "nome": "Pão integral", "quantidade": "2 fatias", "calorias": 140, "proteina": 6 },
        { "nome": "Ovo cozido", "quantidade": "1 unidade", "calorias": 70, "proteina": 6 },
        { "nome": "Café com leite", "quantidade": "1 xícara", "calorias": 60, "proteina": 3 }
      ] },
    { "nome": "Lanche da manhã", "horario": "10:00", "calorias": 190, "proteina": 12,
      "alimentos": [
        { "nome": "Iogurte natural", "quantidade": "170g", "calorias": 100, "proteina": 10 },
        { "nome": "Granola", "quantidade": "2 colheres de sopa", "calorias": 90, "proteina": 2 }
      ] },
    { "nome": "Almoço", "horario": "12:30", "calorias": 420, "proteina": 40,
      "alimentos": [
        { "nome": "Peixe grelhado", "quantidade": "130g", "calorias": 180, "proteina": 30 },
        { "nome": "Arroz", "quantidade": "4 colheres de sopa", "calorias": 110, "proteina": 3 },
        { "nome": "Feijão", "quantidade": "1 concha", "calorias": 80, "proteina": 5 },
        { "nome": "Salada variada", "quantidade": "1 prato", "calorias": 50, "proteina": 2 }
      ] },
    { "nome": "Lanche da tarde", "horario": "16:00", "calorias": 180, "proteina": 4,
      "alimentos": [
        { "nome": "Fruta da estação", "quantidade": "1 unidade", "calorias": 80, "proteina": 1 },
        { "nome": "Castanhas", "quantidade": "1 punhado (30g)", "calorias": 100, "proteina": 3 }
      ] },
    { "nome": "Jantar", "horario": "19:30", "calorias": 290, "proteina": 19,
      "alimentos": [
        { "nome": "Omelete", "quantidade": "2 ovos", "calorias": 160, "proteina": 14 },
        { "nome": "Legumes salteados", "quantidade": "1 xícara", "calorias": 60, "proteina": 2 },
        { "nome": "Pão integral", "quantidade": "1 fatia", "calorias": 70, "proteina": 3 }
      ] }
  ],
  "hidratacao": { "litros_dia": 2.5, "orientacao": "Distribua a ingestão de água ao longo de todo o dia." },
  "orientacao_treino": "Combine carboidratos e proteínas nas refeições próximas ao treino para sustentar o desempenho.",
  "estrategia_desafio": "Mantenha a rotina alimentar estruturada mesmo nos dias mais corridos, priorizando preparações simples e práticas.",
  "dica_fome": "Inclua uma fonte de fibra nas refeições principais para prolongar a sensação de saciedade."
}
$$::jsonb,
 true),

('Performance esportiva',
 'Plano com foco em timing nutricional ao redor do treino, para sustentar energia e recuperação em rotinas de alta demanda física.',
 'performance',
 $$
{
  "nota_nutri": "Plano voltado para alta demanda energética, organizando carboidratos e proteínas em torno dos horários de treino para otimizar desempenho e recuperação.",
  "refeicoes": [
    { "nome": "Café da manhã", "horario": "06:30", "calorias": 340, "proteina": 14,
      "alimentos": [
        { "nome": "Aveia com banana", "quantidade": "50g de aveia + 1 banana", "calorias": 270, "proteina": 8 },
        { "nome": "Ovo cozido", "quantidade": "1 unidade", "calorias": 70, "proteina": 6 }
      ] },
    { "nome": "Pré-treino", "horario": "08:00", "calorias": 190, "proteina": 3,
      "alimentos": [
        { "nome": "Pão branco com mel", "quantidade": "1 fatia", "calorias": 100, "proteina": 2 },
        { "nome": "Suco de frutas natural", "quantidade": "200ml", "calorias": 90, "proteina": 1 }
      ] },
    { "nome": "Pós-treino", "horario": "10:30", "calorias": 210, "proteina": 25,
      "alimentos": [
        { "nome": "Whey protein", "quantidade": "1 dose (30g)", "calorias": 120, "proteina": 24 },
        { "nome": "Banana", "quantidade": "1 unidade", "calorias": 90, "proteina": 1 }
      ] },
    { "nome": "Almoço", "horario": "13:00", "calorias": 590, "proteina": 61,
      "alimentos": [
        { "nome": "Frango grelhado", "quantidade": "180g", "calorias": 300, "proteina": 54 },
        { "nome": "Arroz branco", "quantidade": "5 colheres de sopa", "calorias": 150, "proteina": 3 },
        { "nome": "Batata doce cozida", "quantidade": "100g", "calorias": 90, "proteina": 2 },
        { "nome": "Salada", "quantidade": "1 prato", "calorias": 50, "proteina": 2 }
      ] },
    { "nome": "Lanche da tarde", "horario": "16:00", "calorias": 220, "proteina": 12,
      "alimentos": [
        { "nome": "Iogurte natural", "quantidade": "170g", "calorias": 100, "proteina": 10 },
        { "nome": "Granola", "quantidade": "2 colheres de sopa", "calorias": 90, "proteina": 2 },
        { "nome": "Mel", "quantidade": "1 colher de chá", "calorias": 30, "proteina": 0 }
      ] },
    { "nome": "Jantar", "horario": "20:00", "calorias": 430, "proteina": 41,
      "alimentos": [
        { "nome": "Carne magra", "quantidade": "150g", "calorias": 270, "proteina": 36 },
        { "nome": "Arroz integral", "quantidade": "4 colheres de sopa", "calorias": 110, "proteina": 3 },
        { "nome": "Legumes no vapor", "quantidade": "1 xícara", "calorias": 50, "proteina": 2 }
      ] }
  ],
  "hidratacao": { "litros_dia": 3.5, "orientacao": "Hidrate-se antes, durante e depois dos treinos — em sessões longas ou intensas, considere uma bebida isotônica." },
  "orientacao_treino": "Priorize carboidratos de fácil digestão antes do treino e combine proteína com carboidrato na primeira hora após o esforço.",
  "estrategia_desafio": "Em dias de competição ou treino mais intenso, ajuste as porções de carboidrato conforme a duração e intensidade do esforço.",
  "dica_fome": "Fracione as refeições ao redor dos treinos para manter a energia estável e evitar quedas de rendimento."
}
$$::jsonb,
 true),

('Low carb',
 'Redução de carboidratos refinados, com ênfase em proteínas, gorduras boas e vegetais para controle de apetite e energia estável.',
 'low_carb',
 $$
{
  "nota_nutri": "Plano com redução de carboidratos refinados, priorizando proteínas, gorduras boas e vegetais — pensado para controle de apetite e energia mais estável ao longo do dia.",
  "refeicoes": [
    { "nome": "Café da manhã", "horario": "07:00", "calorias": 295, "proteina": 19,
      "alimentos": [
        { "nome": "Ovos mexidos", "quantidade": "3 unidades", "calorias": 210, "proteina": 18 },
        { "nome": "Abacate", "quantidade": "1/4 unidade", "calorias": 80, "proteina": 1 },
        { "nome": "Café sem açúcar", "quantidade": "1 xícara", "calorias": 5, "proteina": 0 }
      ] },
    { "nome": "Lanche da manhã", "horario": "10:00", "calorias": 230, "proteina": 12,
      "alimentos": [
        { "nome": "Iogurte natural integral", "quantidade": "170g", "calorias": 130, "proteina": 9 },
        { "nome": "Castanhas", "quantidade": "1 punhado (30g)", "calorias": 100, "proteina": 3 }
      ] },
    { "nome": "Almoço", "horario": "12:30", "calorias": 430, "proteina": 50,
      "alimentos": [
        { "nome": "Frango grelhado", "quantidade": "150g", "calorias": 250, "proteina": 45 },
        { "nome": "Salada variada com azeite", "quantidade": "1 prato grande", "calorias": 120, "proteina": 3 },
        { "nome": "Legumes refogados", "quantidade": "1 xícara", "calorias": 60, "proteina": 2 }
      ] },
    { "nome": "Lanche da tarde", "horario": "16:00", "calorias": 160, "proteina": 11,
      "alimentos": [
        { "nome": "Queijo branco", "quantidade": "50g", "calorias": 130, "proteina": 10 },
        { "nome": "Tomate cereja", "quantidade": "10 unidades", "calorias": 30, "proteina": 1 }
      ] },
    { "nome": "Jantar", "horario": "19:30", "calorias": 360, "proteina": 39,
      "alimentos": [
        { "nome": "Salmão grelhado", "quantidade": "150g", "calorias": 280, "proteina": 34 },
        { "nome": "Aspargos grelhados", "quantidade": "1 xícara", "calorias": 40, "proteina": 3 },
        { "nome": "Salada verde", "quantidade": "1 prato", "calorias": 40, "proteina": 2 }
      ] }
  ],
  "hidratacao": { "litros_dia": 2.5, "orientacao": "Mantenha boa ingestão de água e, nos primeiros dias de adaptação, fique atento à reposição de eletrólitos." },
  "orientacao_treino": "Treinos leves a moderados costumam se adaptar bem ao baixo carboidrato; em treinos intensos, inclua uma porção extra de carboidrato de qualidade perto do esforço.",
  "estrategia_desafio": "Nos primeiros dias é comum sentir mais fadiga durante a adaptação — priorize gorduras boas e proteína para sustentar a energia.",
  "dica_fome": "Gorduras boas e proteínas prolongam a saciedade — garanta a presença delas em todas as refeições principais."
}
$$::jsonb,
 true),

('Vegetariano balanceado',
 'Plano vegetariano que combina leguminosas, ovos, laticínios e cereais para garantir aporte proteico completo.',
 'vegetariano',
 $$
{
  "nota_nutri": "Plano vegetariano balanceado, combinando leguminosas, ovos, laticínios e cereais integrais para garantir um aporte proteico completo e variado.",
  "refeicoes": [
    { "nome": "Café da manhã", "horario": "07:00", "calorias": 325, "proteina": 11,
      "alimentos": [
        { "nome": "Pão integral", "quantidade": "2 fatias", "calorias": 140, "proteina": 6 },
        { "nome": "Pasta de amendoim", "quantidade": "1 colher de sopa", "calorias": 95, "proteina": 4 },
        { "nome": "Banana", "quantidade": "1 unidade", "calorias": 90, "proteina": 1 }
      ] },
    { "nome": "Lanche da manhã", "horario": "10:00", "calorias": 190, "proteina": 12,
      "alimentos": [
        { "nome": "Iogurte natural", "quantidade": "170g", "calorias": 100, "proteina": 10 },
        { "nome": "Granola", "quantidade": "2 colheres de sopa", "calorias": 90, "proteina": 2 }
      ] },
    { "nome": "Almoço", "horario": "12:30", "calorias": 420, "proteina": 25,
      "alimentos": [
        { "nome": "Grão de bico cozido", "quantidade": "1 concha", "calorias": 140, "proteina": 8 },
        { "nome": "Arroz integral", "quantidade": "4 colheres de sopa", "calorias": 110, "proteina": 3 },
        { "nome": "Legumes salteados", "quantidade": "1 xícara", "calorias": 60, "proteina": 2 },
        { "nome": "Tofu grelhado", "quantidade": "100g", "calorias": 110, "proteina": 12 }
      ] },
    { "nome": "Lanche da tarde", "horario": "16:00", "calorias": 280, "proteina": 10,
      "alimentos": [
        { "nome": "Vitamina de frutas com leite", "quantidade": "1 copo (300ml)", "calorias": 180, "proteina": 7 },
        { "nome": "Castanhas", "quantidade": "1 punhado (30g)", "calorias": 100, "proteina": 3 }
      ] },
    { "nome": "Jantar", "horario": "19:30", "calorias": 340, "proteina": 21,
      "alimentos": [
        { "nome": "Omelete de legumes", "quantidade": "2 ovos", "calorias": 180, "proteina": 15 },
        { "nome": "Quinoa cozida", "quantidade": "4 colheres de sopa", "calorias": 110, "proteina": 4 },
        { "nome": "Salada verde", "quantidade": "1 prato", "calorias": 50, "proteina": 2 }
      ] }
  ],
  "hidratacao": { "litros_dia": 2.5, "orientacao": "Distribua a ingestão de água ao longo do dia, especialmente perto das refeições mais ricas em fibra." },
  "orientacao_treino": "Combine leguminosas com cereais (arroz e feijão, grão de bico e quinoa) nas refeições próximas ao treino para garantir todos os aminoácidos essenciais.",
  "estrategia_desafio": "Varie as fontes de proteína vegetal — leguminosas, tofu, ovos, laticínios — para evitar monotonia e garantir nutrientes variados.",
  "dica_fome": "Combine fibras (legumes, grãos integrais) com proteína em cada refeição para prolongar a sensação de saciedade."
}
$$::jsonb,
 true);
