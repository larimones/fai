# ADR-0006 — Notificações locais

- **Status:** proposto (implementação na Etapa 6)
- **Data:** 2026-10-22

## Contexto

Lembretes devem gerar notificação no horário, sem serviço externo, e não podem se perder se o app estiver fechado ou o computador suspenso.

## Alternativas

| Opção | Prós | Contras |
|---|---|---|
| **`Notification` do Electron no main + agendador próprio** | API nativa nos dois SOs (Toast no Windows, libnotify no Linux); zero dependências; controle total. | Só notifica com o app rodando. |
| Web Notification API no renderer | Mesma aparência. | Exige permissão no renderer (que negamos por padrão) e a lógica ficaria na UI. |
| Toasts agendados do Windows (`ScheduledToastNotification`) | Notifica mesmo com o app fechado. | Exige módulo nativo/WinRT; específico de Windows; fora da simplicidade do MVP. |
| `node-notifier` | Mais opções de layout. | Dependência extra com binários auxiliares; desnecessária. |

## Decisão

- Notificações com `new Notification({ title: 'Fai ✨', body })` **no processo principal**, atrás da `DesktopIntegration` (o comportamento varia por SO).
- **Agendador:** verificação periódica a cada **15 s** comparando `now` com `dueAt` dos lembretes pendentes, mais uma verificação imediata ao iniciar, ao criar lembrete e no evento `powerMonitor.on('resume')`. A regra "o que está vencido e ainda não foi notificado" é uma função pura do domínio.
  - Por que não um `setTimeout` até o próximo lembrete? Timers do Node param durante a suspensão e têm limite de ~24,8 dias; um *poll* barato é imune a suspensão e a mudanças de relógio, com precisão ≤ 15 s (dentro da tolerância de 30 s do RF-15).
- `notifiedAt` é persistido antes de exibir, para cada lembrete notificar no máximo uma vez.
- Lembretes vencidos com o app fechado são notificados ao iniciar, com o texto "(atrasado)".
- Clique na notificação abre o painel. A Fai também reage visualmente.

## Requisitos do Windows

- `app.setAppUserModelId('<appId>')` antes de qualquer notificação; o mesmo ID do instalador (Etapa 7). Sem isso, o toast não aparece ou aparece como "electron.app.Electron".
- Em produção o toast depende do atalho no Menu Iniciar criado pelo instalador NSIS.
- O modo "Não perturbe"/Assistente de foco suprime toasts — limitação documentada; a reação visual da Fai continua.

## Linux

- Depende de um servidor de notificações D-Bus (presente em GNOME/KDE). Ausente → falha silenciosa registrada em log; a reação visual continua.

## Consequências

- O app precisa estar rodando para lembrar. Iniciar com o sistema fica para avaliação pós-MVP (fora de escopo agora).
