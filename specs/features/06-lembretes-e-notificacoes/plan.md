# Plano — Feature 06: Lembretes e notificações

## Perguntas e respostas

| Pergunta                                                      | Resposta                                                                                                    | Data       |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- |
| Onde ficam os lembretes?                                      | Aba própria: "Tarefas" e "Lembretes".                                                                       | 2026-11-13 |
| Como escolher o horário?                                      | Atalhos ("em 15 min", "em 1 h", "amanhã 9h") e campo de data e hora.                                        | 2026-11-13 |
| O que acontece depois do aviso?                               | Vai para "Avisados (N)", recolhida; atrasados marcados.                                                     | 2026-11-13 |
| Reação da Fai ao lembrete                                     | Piscada sorrindo 3 vezes (provisória).                                                                      | 2026-11-13 |
| Vários lembretes perdidos                                     | Até 3, um aviso para cada; acima, um resumo.                                                                | 2026-11-13 |
| Aba inicial                                                   | "Tarefas" pelo menu e pela bandeja; "Lembretes" pela notificação.                                           | 2026-11-13 |
| Maquete da aba Lembretes (renderizada com o `panel.css` real) | **Aprovada.** Ajustes de implementação: "atrasado" fora do texto riscado; barra de rolagem no estilo lilás. | 2026-11-13 |
| Tamanho do painel com o formulário de lembrete                | **320×520** (antes 320×440), nas duas abas.                                                                 | 2026-11-13 |

Protótipo descartável no Linux (Electron 44, Ubuntu 24.04, X11): `Notification.isSupported()` verdadeiro; a notificação apareceu (pelo portal de notificações do sistema, `libnotify` em "modo confinado") e o evento `click` chegou ao app quando a dona do projeto clicou.

## Desenho

```
                 ┌───────────────────────────── main ─────────────────────────────┐
painel ──reminders:create──► reminder-service ─► domínio (regras) ─► data.reminders ─► DataStore
painel ──reminders:list/delete──►                                    │
                                                                      ▼
   início / a cada 15 s / powerMonitor 'resume' / depois de criar ─► scheduler.check(now)
        1. vencidos = pendentes com dueAt ≤ now            (domínio)
        2. grava notifiedAt e late (> 60 s de atraso)     (antes de avisar)
        3. avisos: no horário, um por lembrete; atrasados, um por um até 3, ou 1 resumo
        4. desktop.notify({ title: 'Fai ✨', body, onClick: abrir painel em 'reminders' })
        5. Fai ◄──mascot:reaction {kind:'reminder'}── (piscada 3 vezes)
        6. painel ◄──reminders:changed── (recarrega a aba, se aberto)
                 └─────────────────────────────────────────────────────────────────┘
painel ◄──panel:opened {tab}──  menu/bandeja → 'tasks'; clique na notificação → 'reminders'
```

**Formulário:** os atalhos preenchem o campo de data e hora, que é a única fonte do horário; sem horário, a criação mostra "Escolha quando lembrar." O renderer converte o valor local do campo em instante ISO antes de enviar; o main valida "no futuro" com o próprio relógio.

**Atrasado** (ADR-0016): avisado mais de 60 s depois do `dueAt`. Cobre o app fechado (RF-16 ao iniciar) e a suspensão (`resume`); um aviso normal chega em até ~15 s e nunca é marcado.

## Mudanças por camada

- `src/domain/text.ts` (novo): `validateShortText` (_trim_, 1 a 200 pontos de código), usado por tarefas e lembretes; `validateTitle` passa a usá-lo, sem mudar o comportamento.
- `src/domain/reminders/reminders.ts` (novo): `Reminder`; `createReminder` (`INVALID_TEXT`, `DUE_NOT_IN_FUTURE`), `deleteReminder` (`NOT_FOUND`), `dueReminders`, `markNotified`, `planAnnouncements` (um por um no horário; atrasados um por um até 3, acima disso um resumo), `reminderView` (ordem da aba).
- `src/domain/reminders/time.ts` (novo): `quickTimes(now)` e `dueLabel(dueAt, now)` em fuso local.
- `src/domain/data/fai-data.ts`: `FaiDataV3`, `CURRENT_SCHEMA_VERSION = 3`, migração `2 → 3`.
- `src/domain/mascot/animation.ts` e `sprite-sheet.ts`: estado `reminding`, evento `remind`, animação `remind` obrigatória (toca uma vez).
- `src/shared/ipc/`: `reminders:list` (→ `Reminder[]`), `reminders:create` (`{ text ≤ 1000, dueAt: ISO }` → `Reminder`), `reminders:delete` (`{ id: UUID }` → `null`), `reminders:changed` (evento main → painel, sem payload); `panel:opened` passa a `{ tab }`; `mascot:reaction` aceita `'reminder'`; códigos `INVALID_TEXT`, `DUE_NOT_IN_FUTURE`.
- `src/main/persistence/schema.ts`: schemas v2 (origem) e v3.
- `src/main/os/`: `prepareNotifications()` e `notify()` na `DesktopIntegration`, nas duas implementações (ADR-0016).
- `src/main/reminders/reminder-service.ts` e `scheduler.ts` (novos); `index.ts` liga o agendador (intervalo, `powerMonitor.on('resume')`, verificação inicial), o clique da notificação ao painel e os canais `reminders:*` com a guarda do painel.
- `src/main/panel/panel-controller.ts`: `open(tab)`; `src/main/windows/panel-window.ts`: 320×520.
- `src/preload/panel-api.ts`: `reminders.*`, `onOpened(listener(tab))`, `onRemindersChanged`; `src/preload/mascot-api.ts`: reação `reminder`.
- `src/renderer/src/panel/`: abas acessíveis; aba "Tarefas" (o conteúdo de hoje); aba "Lembretes" (`ReminderForm` com atalhos e `datetime-local`, `ReminderRow` com rótulo de horário e confirmação na linha, "Avisados (N)" recolhida, "atrasado" fora do riscado); barra de rolagem lilás; cores novas no teste de contraste.
- `src/renderer/src/Mascot.tsx`: reação por tipo (`celebrate` ou `remind`).
- `tools/art/build-sprites.py`: animação `remind` (quadros da piscada, 3 vezes, retângulos compartilhados).
- `vitest.config.mts`: `TZ` fixo para os testes de fuso local.

## Segurança

- Três canais novos de pedido e um de evento, todos com schema zod estrito e guarda da janela do painel; `panel:opened` e `mascot:reaction` validados no preload (`eventContract`), como hoje.
- A notificação é criada só no main, com texto vindo dos dados já validados; nenhum conteúdo remoto nem permissão nova para o renderer (as permissões continuam negadas; a API `Notification` da página não é usada).
- CSP inalterada.

## Dependências novas

Nenhuma (`Notification` e `powerMonitor` são do Electron).

## ADRs

- **ADR-0016 (novo):** formato v3, regras, atrasado, resumo, agendador, notificação na `DesktopIntegration`, `AppUserModelID`, abas e painel de 320×520, reação `reminder`.
- **ADR-0014:** nota do novo tamanho do painel (320×520).
- **ADR-0006:** continua valendo; o ADR-0016 detalha.

## Estratégia de testes

- **Automatizados:**
  - Domínio: texto (mesmos casos do título); `dueAt` no passado e igual a `now` recusados; vencidos; `markNotified` com e sem atraso (59 s, 61 s); `planAnnouncements` com 0, 1, 3 e 4 atrasados misturados a avisos no horário; ordem da aba; atalhos e rótulos com `TZ` fixo, inclusive a virada do dia e do mês.
  - Migração v2 → v3 com tarefas e posição; v2 inválido em quarentena; ida e volta com lembretes.
  - Agendador com relógio falso: avisa no primeiro _poll_ depois do `dueAt`; nunca duas vezes; grava antes de avisar (falha ao notificar não reavisa); `resume` dispara a verificação; atrasados acima de 3 viram um resumo; reação da Fai uma vez por verificação com avisos; `reminders:changed` só quando algo mudou.
  - `DesktopIntegration.notify` com `electron` mockado: cria, mostra, liga o clique, mantém a referência até `close`; `prepareNotifications` no Windows chama `setAppUserModelId`.
  - Contrato e preloads: schemas, guarda do painel, `onOpened` com a aba, `onRemindersChanged` sem `event`.
  - Componentes (RTL): abas por clique e por setas; aba inicial pelo `panel:opened`; criar com atalho e com o campo; mensagens de recusa; ordem; "Avisados" recolhida a cada abertura; excluir com confirmação; recarga em `reminders:changed`.
  - Animação: `reminding` toca uma vez e volta; folha real com a animação `remind`.
  - Contraste das cores novas; mutações nas regras centrais (atraso de 60 s, limite do resumo, gravar antes de avisar, `dueAt` no futuro).
- **Roteiro automatizado com o app construído** (`/spec:verify`, cliques conferidos, sem teclas): migração v2 → v3; lembrete semeado no arquivo para daqui a 1 min → `notifiedAt` gravado em até 30 s depois do horário, `late: false`, quadros da Fai mostrando a reação; 5 lembretes vencidos semeados com o app fechado → ao abrir, todos `late: true` e `notifiedAt`; reinício preserva tudo; posição e tamanho do painel (320×520); CPU e memória com `tools/measure/`.
- **Manual:** ver a notificação na tela (texto, resumo "Você tem N lembretes atrasados") e clicar nela (abre em "Lembretes"); criar pelos atalhos e pelo campo; aparência da aba; suspensão real do computador; tudo também no Windows (com atenção ao nome e à aparição da notificação antes do instalador).

## Riscos

| Risco                                                                                                         | Mitigação                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No Windows, antes do instalador (Etapa 7), a notificação não aparece ou aparece como "electron.app.Electron". | `setAppUserModelId` no início; a reação da Fai não depende da notificação; conferir no Windows e, se não aparecer em desenvolvimento, registrar como pendência da Etapa 7. |
| Notificações do Linux passam pelo portal ("modo confinado"): alguns recursos (ícone, ações) não funcionam.    | Usamos só título, corpo e clique, que o protótipo confirmou.                                                                                                               |
| Coletor de lixo leva a `Notification` e o clique deixa de funcionar.                                          | Referência guardada até `close`; teste da implementação.                                                                                                                   |
| Mudança de fuso ou de relógio do sistema.                                                                     | Instantes em UTC no arquivo; o _poll_ compara com o relógio atual a cada 15 s.                                                                                             |
| `datetime-local` do Chromium com aparência diferente entre Windows e Linux.                                   | Estilo mínimo (borda, cor); conferido nas duas máquinas.                                                                                                                   |
| Painel mais alto passa da área de trabalho em telas pequenas.                                                 | `placePanel` já prende o painel à área de trabalho (testado com área menor que o painel).                                                                                  |
