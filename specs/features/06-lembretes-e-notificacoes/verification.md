# Verificação — Feature 06: Lembretes e notificações

## Linux

| Máquina                                                               | Data       | Commit    | Node     |
| --------------------------------------------------------------------- | ---------- | --------- | -------- |
| Ubuntu 24.04.5 LTS, kernel 6.8.0-40, sessão Wayland (app em XWayland) | 2026-11-13 | `f10a2c2` | v22.23.2 |

### Resultado por critério

| CA   | Como foi verificado                                                                                                                                                               | Resultado                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| CA1  | `src/domain/reminders/reminders.test.ts`, `src/main/reminders/reminder-service.test.ts`, `PanelApp.reminders.test.tsx` + 2 mutações; roteiro manual, passo 5                      | aprovado                                                        |
| CA2  | `reminders.test.ts` (`reminderView`), `time.test.ts` (rótulos), `PanelApp.reminders.test.tsx`; roteiro manual, passos 6 e 12                                                      | aprovado (Linux)                                                |
| CA3  | `src/domain/reminders/time.test.ts` (fuso fixo, virada de dia, mês e ano) + mutação; `PanelApp.reminders.test.tsx`; roteiro manual, passo 4                                       | aprovado                                                        |
| CA4  | roteiro automatizado (aviso 1,6 s depois do horário, `late: false`); a dona do projeto viu as notificações e a Fai piscando; roteiro manual, passo 7                              | aprovado no Linux; **pendente: Windows**                        |
| CA5  | `panel-controller.test.ts`, `PanelApp.reminders.test.tsx`; a dona do projeto clicou na notificação e o painel abriu em "Lembretes" (T6.10 e passo 8)                              | aprovado no Linux; **pendente: Windows**                        |
| CA6  | `scheduler.test.ts` (grava antes de notificar, falha não repete, nunca duas vezes) + 2 mutações; roteiro automatizado (`notifiedAt` inalterado depois do aviso)                   | aprovado                                                        |
| CA7  | `reminders.test.ts` (59/60/61 s) e `scheduler.test.ts` + mutação; roteiro automatizado (5 vencidos semeados com o app fechado → todos `late: true` ao iniciar)                    | aprovado; suspensão real: **pendente: manual**                  |
| CA8  | `reminders.test.ts` (3 um por um, 4 em resumo) e `scheduler.test.ts` + 2 mutações; roteiro automatizado (5 atrasados); a dona do projeto viu "Você tem 5 lembretes atrasados"     | aprovado                                                        |
| CA9  | `PanelApp.reminders.test.tsx` + mutações da T6.10; roteiro manual, passos 8 e 12                                                                                                  | aprovado (Linux)                                                |
| CA10 | `PanelApp.reminders.test.tsx` (abas por clique, setas, Home, End; aba inicial); roteiro manual, passos 2 e 3                                                                      | aprovado no Linux; **pendente: Windows**                        |
| CA11 | roteiro automatizado (fechar e reabrir o app preserva tarefas, lembretes e posição)                                                                                               | reabrir: aprovado; reiniciar o computador: **pendente: manual** |
| CA12 | `data-store-load.test.ts` (ida e volta, v2 → v3), `migrations.test.ts`, `schema.test.ts` + mutação; roteiro automatizado (v2 real migrado para v3, posição e tarefas preservadas) | aprovado                                                        |
| CA13 | `tests/ui/panel-contrast.test.ts` (pares novos) e nomes acessíveis nos testes RTL; roteiro manual, passos 3 e 14                                                                  | aprovado (Linux)                                                |
| CA14 | testes do domínio, migração, componentes, `schemas.test.ts`, `register-handlers.test.ts` + mutação (lembretes aceitando a janela da mascote)                                      | aprovado                                                        |

### Comandos executados

- `npm run check`: typecheck, lint e Prettier sem erros; **46 arquivos, 326 testes aprovados**.
- `npm run build`: código de saída 0 (main, preloads e renderer).
- Testes da feature isolados (`npx vitest run` em domínio de lembretes, texto, dados, persistência, `main/reminders`, `main/os`, IPC, preloads, painel, janela, mascote e `tests/ui`): **32 arquivos, 248 testes aprovados**.
- Mutações (10, todas mortas, cada uma desfeita logo depois): `dueAt` igual a agora aceito; texto sem validação; "amanhã 9h" às 10h; avisados voltando a vencer; gravar depois de notificar; atrasado a partir de 30 s; resumo só acima de 4; resumo com `>=`; migração 2 → 3 sem `reminders`; canais de lembrete aceitando qualquer janela. Depois delas, `git diff` vazio e `git status` limpo.
- Revisão do diff `cac9e29..HEAD` (67 arquivos): sem `any`, `@ts-ignore` ou estilo inline; `electron` só em `src/main/os/` e no main; o domínio não lê o relógio (`time.ts` só cria datas a partir do instante recebido); canais novos com zod estrito e guarda da janela do painel; CSP e preloads sem mudança de política; nenhuma dependência nova; textos da UI em pt-BR. README e `architecture.md` refletem a feature.

### Roteiro automatizado com o app

Script em `scratchpad/verify06/run.py` (fora do repositório), só observando arquivos, processos e janelas, sem cliques nem teclas. O `fai-data.json` foi copiado antes e restaurado no fim (mesmo SHA-256).

| Passo                                                                           | Resultado                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A. `fai-data.json` v2 (posição + 2 tarefas) e app aberto                        | `schemaVersion: 3`, `reminders: []`, posição e tarefas iguais                   |
| A. Janela do painel                                                             | 320×520                                                                         |
| B. 5 lembretes vencidos há 2 h semeados com o app fechado + 1 para daqui a 60 s | os 5 com `notifiedAt` e `late: true` logo ao iniciar; o outro pendente          |
| B. Espera do lembrete no horário                                                | avisado 1,583 s depois do `dueAt`, `late: false`                                |
| B. 20 s depois                                                                  | `notifiedAt` inalterado (nenhum aviso repetido)                                 |
| C. Fechar e abrir de novo                                                       | documento idêntico                                                              |
| C. `node tools/measure/measure-fai.mjs --seconds 60` (repouso)                  | CPU 1,23 % de um núcleo = 0,15 % da máquina; memória privada 135 MB (RNF-08 OK) |
| Logs                                                                            | sem erros além do aviso de VSync da GPU                                         |
| Fim                                                                             | nenhum processo `electron`                                                      |

Também nesta sessão, nas T6.09 e T6.10: 4 atrasados semeados viraram um resumo; o clique na notificação abriu o painel em "Lembretes".

### Roteiro manual

Executado pela dona do projeto com o app construído e os dados reais (copiados antes e restaurados depois), seguindo `specs/manual-tests.md`, Etapa 6:

| Passo                                             | Resultado                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Notificações do roteiro automatizado              | viu o resumo "Você tem 5 lembretes atrasados", o aviso no horário e a Fai piscando |
| 2–3 (aba inicial, setas, Tab, foco)               | aprovado                                                                           |
| 4–5 (atalhos e mensagens de recusa)               | aprovado                                                                           |
| 6–8 (ordem, rótulos, aviso, piscada, clique)      | aprovado                                                                           |
| 12, 14 (excluir, "Avisados" recolhida, aparência) | aprovado                                                                           |
| 1                                                 | coberto pelo roteiro automatizado (passo A)                                        |
| 9, 10                                             | cobertos pelo roteiro automatizado (passo B) e pelas notificações vistas           |
| 11 (suspensão real do computador)                 | **pendente: manual**                                                               |
| 13 (reiniciar o computador)                       | **pendente: manual** (fechar e abrir o app aprovado no passo C)                    |
| 15 (Windows)                                      | **pendente: Windows**                                                              |

### Problemas encontrados

Nenhum defeito. Observações:

- A janela do painel ainda tem o título interno "Tarefas da Fai" (não aparece na tela; o painel mostra "✿ Fai").
- A piscada da Fai não pôde ser capturada por script: o XWayland bloqueia captura da tela inteira. Ficou com os testes e o olhar da dona do projeto.
