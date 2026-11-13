# ADR-0016 — Lembretes: formato v3, agendador e avisos

- **Status:** aceito em 2026-11-13 (implementação na Etapa 6; detalha o ADR-0006 e ajusta o tamanho do painel do ADR-0014)
- **Data:** 2026-11-13

## Contexto

A Etapa 6 traz lembretes com notificação nativa (RF-14 a RF-16). O ADR-0006 já decidiu o essencial: notificação no main, _poll_ de 15 s mais `powerMonitor` `resume`, `notifiedAt` gravado antes de exibir, atrasados avisados ao iniciar, clique abre o painel. Faltava o formato dos dados, onde fica cada regra, o que é "atrasado", o resumo pedido pela dona do projeto e como o painel mostra tudo. Um protótipo no Linux (Electron 44, Ubuntu 24.04) mostrou a notificação e o evento `click` chegando ao app, pelo portal de notificações do sistema.

## Decisão

1. **Formato v3 do documento:** `reminders: Reminder[]`, com `Reminder = { id, text, dueAt, createdAt, notifiedAt, late }` (`dueAt`, `createdAt` e `notifiedAt` em ISO 8601 UTC; `notifiedAt: null` enquanto pendente; `late: boolean`). Migração `2 → 3` acrescenta `reminders: []`; leitura pela versão de origem, como no ADR-0015.
2. **Regras no domínio** (`src/domain/reminders/`), puras, com instante e ID por parâmetro: texto com a mesma regra do título das tarefas (_trim_, 1 a 200 pontos de código; a regra passa a morar num lugar só, `domain/text.ts`); `dueAt` precisa ser posterior ao instante da criação; vencidos = pendentes com `dueAt ≤ now`; **atrasado = avisado mais de 60 s depois do `dueAt`** (o _poll_ de 15 s avisa em até ~15 s; 60 s deixa folga e pega o app fechado ou a suspensão); **resumo = mais de 3 atrasados de uma vez viram um aviso só** ("Você tem N lembretes atrasados"); os no horário sempre avisam um por um; ordem da aba: pendentes pelo `dueAt` crescente, avisados pelo `notifiedAt` decrescente.
3. **Atalhos e rótulos de horário no domínio**, com fuso local: "em 15 min", "em 1 h", "amanhã 9h" (09:00 do dia seguinte) e rótulos "hoje 15:30", "amanhã 09:00", "ontem 21:00" ou "20/11 09:00". Usam os métodos locais de `Date` sobre um instante recebido por parâmetro; os testes fixam o fuso (`TZ`) na configuração do Vitest.
4. **Agendador no main** (`main/reminders/scheduler.ts`): `check()` roda ao iniciar, a cada 15 s, no `resume` e depois de criar um lembrete. Ele grava `notifiedAt` e `late` **antes** de avisar, pede à `DesktopIntegration` as notificações, pede à Fai a reação `reminder` (uma vez por verificação com avisos) e avisa o painel (`reminders:changed`) para recarregar a aba.
5. **Notificação atrás da `DesktopIntegration`:** `prepareNotifications()` no início (Windows: `app.setAppUserModelId('io.github.larimones.fai')`, o mesmo ID que o instalador da Etapa 7 vai usar; Linux: nada) e `notify({ title, body, onClick })`. A implementação guarda a referência da `Notification` até ela fechar (sem isso o coletor de lixo leva junto o tratador de clique) e registra no log o `failed` do Windows. O clique abre o painel na aba "Lembretes".
6. **Painel com abas:** `panel:opened` passa a levar `{ tab: 'tasks' | 'reminders' }`; pelo menu e pela bandeja, `tasks`; pela notificação, `reminders`. Abas acessíveis (`role="tablist"`, `tab`, `tabpanel`, setas para trocar). **Painel de 320×520** (antes 320×440), escolha da dona do projeto ao ver a maquete.
7. **Reação `reminder` da Fai:** animação `remind` = a piscada sorrindo 3 vezes, com quadros compartilhados (ADR-0013); estado `reminding`, que toca uma vez e volta ao repouso, como `reacting`.

## Alternativas consideradas

- **`setTimeout` até o próximo lembrete:** descartado no ADR-0006 (para na suspensão, limite de ~24,8 dias).
- **Atrasado = qualquer aviso depois do `dueAt`:** todo aviso seria "atrasado", porque o _poll_ sempre chega alguns segundos depois.
- **Atrasado = só os vencidos com o app fechado:** não pegaria a suspensão com o app aberto, que o RF-16 também cobre.
- **Painel recarregando a lista por _poll_:** mais simples, mas faria IPC a cada poucos segundos com o painel aberto; um evento só quando algo muda é mais barato.

## Consequências

- O `fai-data.json` passa para a v3 no primeiro início da versão nova (cópia da v2 não é necessária: a migração só acrescenta).
- No Windows, em desenvolvimento, a notificação pode aparecer com nome genérico ou nem aparecer antes do instalador (ADR-0006); a reação da Fai continua. O que der para conferir antes da Etapa 7 fica registrado na verificação.
- O tipo `mascot:reaction` volta a ter dois valores, e a checagem por tipo na Fai volta (T5.09).
