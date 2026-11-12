# Feature 05 — Painel de tarefas

- **Etapa:** 5 (Tarefas)
- **Status:** em verificação
- **Requisitos:** RF-10, RF-11, RF-12, RF-13, RF-17, RF-03 CA1 ("Abrir painel"), RNF-09, RNF-10

## Objetivo

Até aqui a Fai é só companhia. Esta feature a torna útil no dia a dia: com um clique direito nela, abre-se um painel pequeno, ao lado dela, onde dá para anotar tarefas, marcá-las como feitas, reabri-las e excluí-las. Ao concluir uma tarefa, a Fai comemora. O painel é discreto: some sozinho quando a pessoa volta a outra coisa, e as tarefas ficam guardadas entre um uso e outro.

## Escopo

- **Menu de contexto da Fai:** clique direito sobre o desenho abre um menu com um único item, "Abrir painel".
- **Bandeja:** o menu ganha "Abrir painel" (completa o RF-03 CA1: "Mostrar/ocultar Fai", "Abrir painel", "Sair").
- **Painel:** janela pequena que abre **perto da Fai**, inteira dentro da tela, **acompanha a Fai** quando ela é arrastada e **fecha sozinha ao perder o foco** ou com Esc. Usável só pelo teclado. Estilo em tons pastel, lilás e branco.
- **Tarefas:** criar (título obrigatório, 1 a 200 caracteres depois de tirar espaços das pontas; a nova aparece no topo das pendentes), concluir, reabrir e excluir (com confirmação **na própria linha**: "Excluir esta tarefa? Sim / Não").
- **Concluídas:** numa seção "Concluídas (N)" abaixo das pendentes, **recolhida por padrão**; aberta, permite reabrir e excluir.
- **Comemoração:** ao concluir uma tarefa, a Fai faz uma animação curta de comemoração (`celebrate`) e volta ao repouso. Arte **provisória**, feita com quadros que já existem, até a arte definitiva da dona do projeto.
- **Persistência:** as tarefas ficam no `fai-data.json` e sobrevivem ao reinício; o documento passa da v1 para a v2 por migração (planejado em `architecture.md`).
- **Acessibilidade e leitura:** contraste WCAG AA, rótulos acessíveis, foco visível; textos em pt-BR.

## Fora de escopo

- Lembretes, notificações e o clique na notificação abrindo o painel (Etapa 6).
- Editar o título de uma tarefa, reordenar tarefas, prioridades, prazos, categorias e recorrência (fora do MVP pelo `product.md`; editar e reordenar também não estão nos requisitos).
- Outros itens no menu de contexto da Fai (decisão de 2026-11-06: por enquanto, só "Abrir painel").
- Conversa com IA e demais itens do `backlog.md`.
- Arte definitiva de `celebrate` (chega depois, trocando arquivos, como em `react` e `dragged`).

## Critérios de aceitação

- CA1 [manual] RF-10 CA1: o painel abre pelo menu de contexto da Fai (clique direito) e pelo menu da bandeja.
- CA2 [manual] RF-10 CA2: o painel é navegável por teclado (Tab, Enter; Esc fecha).
- CA3 [manual] O painel abre ao lado da Fai, inteiro dentro da área de trabalho do monitor dela, inclusive com a Fai encostada numa borda ou num canto.
- CA4 [manual] O painel fecha sozinho ao perder o foco (clique em outra janela, na área de trabalho, ou ao abrir o menu da bandeja ou o da Fai) e com Esc; "Abrir painel" sempre abre. (Ajuste de 2026-11-06: fechar por "Abrir painel" não é observável, porque abrir o menu já tira o foco do painel; ver ADR-0014.)
- CA5 [auto] RF-11 CA1: título obrigatório, com _trim_ e de 1 a 200 caracteres; fora disso a criação é recusada com mensagem.
- CA6 [manual] RF-11 CA2: a tarefa criada aparece no topo da lista de pendentes.
- CA7 [auto] RF-12 CA1: concluir registra `completedAt`; reabrir limpa `completedAt`.
- CA8 [manual] RF-12 CA2: concluir uma tarefa provoca uma comemoração breve da Fai, que depois volta ao repouso.
- CA9 [manual] RF-13 CA1: excluir pede confirmação na própria linha; confirmada, a tarefa some; "Não" mantém a tarefa.
- CA10 [auto] RF-13 CA2: excluir um ID inexistente retorna erro tratado, sem alterar os dados.
- CA11 [manual] As concluídas ficam numa seção "Concluídas (N)", recolhida ao abrir o painel; aberta, permite reabrir e excluir.
- CA12 [manual] RF-17 CA1: as tarefas permanecem depois de fechar e reabrir o app.
- CA13 [auto] RF-17 CA2: ida e volta (salvar → carregar) preserva as tarefas exatamente; um `fai-data.json` v1 existente é migrado para a v2 sem perder a posição da Fai.
- CA14 [manual] RNF-10 CA1 e CA2: texto com contraste mínimo de 4,5:1; todo elemento interativo com rótulo acessível e foco visível.
- CA15 [auto] RNF-09 CA1 e CA2: o domínio de tarefas e a migração têm testes unitários; os componentes do painel têm testes com React Testing Library.
- CA16 [auto] RNF-03: os canais IPC novos validam o payload com zod e verificam o remetente; o painel só recebe a API de que precisa.

## Decisões da dona do projeto

- 2026-11-06: o painel abre **perto da Fai**.
- 2026-11-06: o painel **fecha sozinho** ao perder o foco (além de Esc e de pedir "Abrir painel" de novo).
- 2026-11-06: as concluídas ficam numa **seção recolhida** "Concluídas (N)".
- 2026-11-06: a confirmação de exclusão é **na própria linha** do painel.
- 2026-11-06: o menu de contexto da Fai tem, por enquanto, **só "Abrir painel"**.
- 2026-11-06: a arte de `celebrate` começa **provisória**.
- 2026-11-06: estilo do painel **A — lilás e branco**, em tons pastel ("toque mais garota, coquete").
- 2026-11-06: comemoração provisória **A — asas rápidas + piscada** (dois ciclos de asas a 80 ms, depois a piscada sorrindo).
- 2026-11-06: arrastando a Fai com o painel aberto, **o painel acompanha**.

## Perguntas em aberto

- Nenhuma. As técnicas foram respondidas no `plan.md`, no ADR-0014 e no ADR-0015.
