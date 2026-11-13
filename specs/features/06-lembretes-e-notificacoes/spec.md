# Feature 06 — Lembretes e notificações

- **Etapa:** 6 (Lembretes e notificações)
- **Status:** em verificação
- **Requisitos:** RF-14, RF-15, RF-16, RF-17, RNF-03, RNF-09, RNF-10

## Objetivo

As tarefas ajudam a lembrar o que fazer; falta lembrar **quando**. Com esta feature, dá para pedir à Fai que avise numa data e hora: no momento certo aparece uma notificação do sistema e a Fai chama atenção. Se o computador estava desligado ou suspenso na hora, ela avisa assim que volta, sem encher a tela de avisos. Os lembretes ficam guardados entre um uso e outro, como as tarefas.

## Escopo

- **Painel com duas abas, "Tarefas" e "Lembretes"**, com o painel mais alto: 320×520 (decisão de 2026-11-13, ao ver a maquete). Pelo menu de contexto ou pela bandeja, o painel abre em "Tarefas"; ao clicar numa notificação, abre em "Lembretes".
- **Criar lembrete:** texto (obrigatório, 1 a 200 caracteres, sem espaços nas pontas) e data e hora (obrigatória e no futuro). A hora sai de **atalhos** — "em 15 min", "em 1 h", "amanhã 9h" — ou de um **campo de data e hora** para qualquer outro horário.
- **Lista de lembretes pendentes** ordenada pela data (o mais próximo primeiro); excluir com a mesma confirmação na linha usada nas tarefas.
- **Avisados:** depois de avisar, o lembrete vai para a seção recolhida "Avisados (N)", de onde dá para excluí-lo; os que avisaram atrasados aparecem marcados como atrasados.
- **Notificação nativa** no horário (tolerância de 30 s), com o texto do lembrete; clicar nela abre o painel na aba "Lembretes".
- **Reação da Fai** a cada lembrete: a piscada sorrindo tocada 3 vezes seguidas (arte provisória). A reação acontece mesmo que o sistema esconda a notificação (por exemplo, no "Não perturbe" do Windows).
- **Lembretes perdidos:** ao iniciar e ao voltar da suspensão, os vencidos e ainda não avisados são avisados uma única vez, marcados "(atrasado)". Até 3: uma notificação para cada; mais de 3: uma só, com o resumo ("Você tem N lembretes atrasados").
- **Persistência:** lembretes no `fai-data.json`, que passa da v2 para a v3 por migração, sem perder posição nem tarefas.
- Acessibilidade e textos em pt-BR, como no painel de tarefas.

## Fora de escopo

- Recorrência (lembretes que se repetem), adiar ou "soneca", editar o texto ou o horário, prioridades e categorias (`product.md`: fora do MVP).
- Lembretes de rotina com comemoração (backlog).
- Iniciar com o sistema (backlog): os lembretes só avisam com a Fai aberta; os que vencerem com ela fechada avisam ao abrir, como atrasados.
- Som próprio da notificação; ícone definitivo e atalho no Menu Iniciar do Windows (Etapa 7, empacotamento).
- Arte definitiva da reação ao lembrete (chega depois, trocando arquivos, como as outras animações).
- Ligar lembretes a tarefas.

## Critérios de aceitação

- CA1 [auto] RF-14 CA1: texto obrigatório (1 a 200 caracteres, _trim_); data e hora obrigatória e no futuro no momento da criação; fora disso a criação é recusada com mensagem.
- CA2 [manual] RF-14 CA2: lembretes pendentes aparecem na aba "Lembretes" ordenados pela data; é possível excluí-los com confirmação na linha.
- CA3 [auto] Os atalhos calculam o horário certo a partir do instante atual: "em 15 min", "em 1 h" e "amanhã 9h" (09:00 do dia seguinte, no fuso local).
- CA4 [manual, Windows e Linux] RF-15 CA1: no horário do lembrete (tolerância de 30 s), aparece uma notificação nativa com o texto do lembrete, e a Fai reage com a piscada repetida.
- CA5 [manual] RF-15 CA2: clicar na notificação abre o painel na aba "Lembretes".
- CA6 [auto] RF-15 CA3: cada lembrete gera no máximo uma notificação (estado `notifiedAt`, gravado antes de exibir).
- CA7 [auto] RF-16 CA1: ao iniciar ou ao voltar da suspensão, lembretes vencidos e não avisados são avisados uma única vez, marcados como atrasados.
- CA8 [auto] Com mais de 3 lembretes atrasados de uma vez, sai uma única notificação de resumo; todos ficam marcados como avisados e atrasados. Com até 3, uma notificação para cada.
- CA9 [manual] Depois de avisar, o lembrete aparece em "Avisados (N)", recolhida a cada abertura do painel; os atrasados aparecem marcados; dá para excluí-los.
- CA10 [manual] O painel abre em "Tarefas" pelo menu de contexto e pela bandeja; as abas funcionam pelo teclado.
- CA11 [manual] RF-17 CA1: tarefas, lembretes e posição da Fai permanecem depois de fechar e reabrir o app e depois de reiniciar o computador.
- CA12 [auto] RF-17 CA2: ida e volta (salvar → carregar) preserva os lembretes exatamente; um `fai-data.json` v2 é migrado para a v3 sem perder posição nem tarefas.
- CA13 [manual] RNF-10: a aba "Lembretes" mantém o contraste mínimo de 4,5:1, rótulos acessíveis e foco visível.
- CA14 [auto] RNF-09 e RNF-03: o domínio de lembretes (validação, vencimento, atrasados, resumo, atalhos) e a migração têm testes unitários; os componentes novos têm testes com React Testing Library; os canais IPC novos validam o payload com zod e verificam a janela que envia.

## Decisões da dona do projeto

- 2026-11-13: lembretes numa **aba própria** do painel ("Tarefas" e "Lembretes").
- 2026-11-13: horário por **atalhos** ("em 15 min", "em 1 h", "amanhã 9h") **e** por um campo de data e hora.
- 2026-11-13: depois de avisar, o lembrete vai para **"Avisados (N)", recolhida**, com os atrasados marcados.
- 2026-11-13: a Fai reage ao lembrete com a **piscada sorrindo repetida** (provisória).
- 2026-11-13: lembretes perdidos: **até 3, um aviso para cada; acima de 3, um resumo**.
- 2026-11-13: o painel abre em **"Tarefas"**; a notificação abre em **"Lembretes"**.
- 2026-11-13: maquete da aba "Lembretes" **aprovada**; painel passa a **320×520**.

## Perguntas em aberto

- Nenhuma. As técnicas foram respondidas no `plan.md` e no ADR-0016.
