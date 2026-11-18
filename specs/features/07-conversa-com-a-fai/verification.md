# Verificação — Feature 07: Conversa com a Fai

## Linux

| Máquina                                                               | Data       | Commit                                   | Node     |
| --------------------------------------------------------------------- | ---------- | ---------------------------------------- | -------- |
| Ubuntu 24.04.5 LTS, kernel 6.8.0-40, sessão Wayland (app em XWayland) | 2026-11-18 | `30e7841` (+ correção desta verificação) | v22.23.2 |

### Resultado por critério

| CA   | Como foi verificado                                                                                                                                                                                                  | Resultado                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| CA1  | `chat-controller.test.ts`, `mascot-menu.test.ts`, `tray-menu.test.ts`, `bubble-placement.test.ts`; app: a dona do projeto abriu pelo menu da Fai e pela bandeja (T7.10) e viu o balão acompanhar o arrasto (passo 7) | aprovado (Linux)                 |
| CA2  | `claude-chat.test.ts`, `ChatApp.test.tsx`; app: a dona do projeto conversou (português, carinho, poucas frases, texto aos poucos, piscada) e viu a rolagem (passo 4)                                                 | aprovado (Linux)                 |
| CA3  | `conversation.test.ts`, `chat-service.test.ts`, `ChatApp.test.tsx` + mutações (texto vazio, `BUSY`)                                                                                                                  | aprovado                         |
| CA4  | `chat-controller.test.ts` (blur, Esc); roteiro manual, passos 5 e 6                                                                                                                                                  | aprovado (Linux)                 |
| CA5  | `chat-service.test.ts` (fechar apaga, nada no disco, pedaços atrasados descartados), `ChatApp.test.tsx` + mutações; app: palavra marcadora em nenhum arquivo de `~/.config/Fai` (T7.11); passo 5                     | aprovado                         |
| CA6  | `claude-chat.test.ts` (11 classes de erro), `chat-service.test.ts` (8 mensagens) + mutações; roteiro manual, passo 8 (internet desligada e religada)                                                                 | aprovado                         |
| CA7  | `KeyForm` em `ChatApp.test.tsx`, `chat-service.test.ts`; roteiro manual, passos 2, 9 e 10 (chave errada recusada, certa aceita, reinício abre direto na conversa, "Cancelar" mantém)                                 | aprovado (Linux)                 |
| CA8  | `api-key-store.test.ts`, `desktop-integration.test.ts`, `claude-chat.test.ts` (ambiente ignorado) + mutações; app: arquivo `0600`, prefixo `v11`, sem `sk-ant`, lido depois de reiniciar                             | aprovado no Linux                |
| CA9  | `schemas.test.ts`, `register-handlers.test.ts` (guarda do balão), `chat.test.ts` (preload), `ai-sdk-boundary.test.ts`, `pages-csp.test.ts` + mutações; build: CSP de produção nas três páginas, SDK só no main       | aprovado                         |
| CA10 | `claude-chat.test.ts` (corpo do pedido: só a personalidade e as mensagens) + mutação; revisão do código                                                                                                              | aprovado                         |
| CA11 | `tests/ui/chat-contrast.test.ts` (14 pares) + mutação; a dona do projeto aprovou o balão e viu o foco lilás pelo teclado (passo 6)                                                                                   | aprovado (Linux)                 |
| CA12 | —                                                                                                                                                                                                                    | **pendente: Windows** (passo 13) |

### Comandos executados

- `npm run check`: typecheck, lint e Prettier sem erros; **58 arquivos, 455 testes** antes da correção; **59 arquivos, 457 testes** depois dela.
- `npm run build`: saída 0.
- Testes da feature isolados (domínio da conversa, `main/chat`, `main/os`, janela do balão, IPC, menus, painel, preload do balão, contrato, interface do balão, mascote, `tests/ui`, `tests/architecture`): **25 arquivos, 225 testes**.
- Mutações (13, todas mortas, cada uma desfeita em seguida): texto vazio aceito, `BUSY` ignorado, fechar sem apagar, balão guardando a conversa ao reabrir, sem rede como desconhecido, erro sem devolver o texto, chave gravada em claro, Linux aceitando `basic_text`, token do ambiente, canal aceitando qualquer janela, schema aceitando extras, pedido sem personalidade, limite em 31. Depois, `git diff` vazio e `git status` limpo.
- Revisão do diff `f2a6c4c..HEAD`: sem `any`, `@ts-ignore` nem atributo `style` (a ponta usa uma variável CSS pelo CSSOM); o SDK só em `src/main/chat/claude-chat.ts` (lint e teste); `electron` só no main; o domínio não lê relógio nem rede; canais novos com zod estrito e guarda da janela do balão; CSP sem mudança; uma dependência nova (`@anthropic-ai/sdk` 1.8.0), aprovada e justificada; textos da interface em pt-BR; README e `architecture.md` refletem a feature.

### Roteiro automatizado com o app

Script em `scratchpad/verify07/run.py` (fora do repositório), só observando arquivos, processos e janelas, sem cliques nem teclas. `fai-data.json` copiado antes e restaurado no fim (mesmo SHA-256).

| Conferência                                                 | Resultado                                                                                                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| CSP de produção em `index.html`, `panel.html` e `chat.html` | ok                                                                                                                                              |
| Nada do serviço de IA no renderer                           | uma ocorrência: o texto de ajuda do campo da chave ("Crie uma em console.anthropic.com…"), sem protocolo e sem carregar nada; aceito na revisão |
| SDK e endereço no preload                                   | nenhum                                                                                                                                          |
| Endereço oficial do serviço no main                         | ok (`out/main/index.js`)                                                                                                                        |
| `out/preload/chat.js` sem `require` local                   | ok                                                                                                                                              |
| Janela do balão                                             | 300×380, criada escondida                                                                                                                       |
| Chave guardada lida no início                               | ok, sem aviso                                                                                                                                   |
| Arquivo da chave                                            | permissão `0600`, prefixo `v11` (cofre do sistema), sem `sk-ant`; intacto depois; nenhum `.tmp`                                                 |
| CPU e memória em repouso, 60 s (`tools/measure/`)           | 0,30% da máquina, 154 MB de memória privada (RNF-08 ok)                                                                                         |
| Log                                                         | **antes da correção:** `No handler registered` para `app:get-info`, `tasks:list` e `reminders:list`; **depois:** limpo                          |
| Processos no fim                                            | nenhum `electron`                                                                                                                               |

### Roteiro manual

Executado pela dona do projeto com o app construído e os dados reais (copiados e restaurados), seguindo `specs/manual-tests.md`, Etapa 8. Parte dele nesta verificação e parte durante a T7.10 e a T7.11, nesta mesma sessão e máquina:

| Passo                                                     | Resultado                                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1 (abrir pelo menu e pela bandeja, modo chave)            | aprovado (T7.10)                                                                                     |
| 2 (chave errada recusada, certa aceita)                   | aprovado                                                                                             |
| 3 (pensando, resposta aos poucos, poucas frases, piscada) | aprovado (T7.11)                                                                                     |
| 4 (rolagem com conversa longa)                            | aprovado                                                                                             |
| 5 (fechar clicando fora e com Esc; reabrir vazio)         | aprovado; a dona do projeto confirmou que a conversa sumir ao fechar está bom, como decidido na spec |
| 6 (só teclado, foco lilás)                                | aprovado                                                                                             |
| 7 (acompanhar o arrasto; painel tira o balão da frente)   | aprovado                                                                                             |
| 8 (internet desligada e religada)                         | aprovado                                                                                             |
| 9 (reiniciar abre direto na conversa)                     | aprovado (T7.11, depois da correção da cifra)                                                        |
| 10 (trocar; apagar → Cancelar)                            | aprovado; "Apagar" de fato coberto pelos testes e pela T7.10 (confirmação nativa)                    |
| 11 (arquivo ilegível; palavra em nenhum arquivo)          | coberto pelo roteiro automatizado e pela T7.11                                                       |
| 12 (aparência)                                            | aprovado (T7.11)                                                                                     |
| 13 (Windows)                                              | **pendente: Windows**                                                                                |

### Problemas encontrados

1. **Canais registrados depois das páginas carregarem (corrigido aqui).** As esperas da guarda da chave (`await desktop.secretStorage()` e `await apiKeys.load()`), entradas na T7.10/T7.11, ficavam entre criar as janelas e registrar os canais. As páginas carregavam nesse intervalo e chamavam `app:get-info`, `tasks:list` e `reminders:list` antes de existirem: a Fai podia ficar sem o nome acessível (RF-01 CA3) e a primeira carga do painel falhava (ele se recuperava ao abrir). Correção: as esperas vão antes de criar as janelas. Teste novo, `tests/architecture/startup-order.test.ts`, que falha com o código antigo e passa com o novo; o roteiro automatizado também passou a procurar `No handler registered` no log, e falhou antes e passou depois.
2. **Conferência automática estrita demais:** "nada do serviço de IA no renderer" pegou o texto de ajuda da chave. Não é defeito (só texto, sem carregar nada; registrado como desvio na T7.11).
3. **Observação sem explicação:** na sessão manual, a dona do projeto viu o aviso de "sem conexão" no passo 8, mas a linha `Fai: a resposta da conversa falhou (offline…)` não apareceu no log daquela execução. Nas execuções da T7.11, linhas iguais apareceram. Fica em "Pendências" para conferir no Windows e na próxima vez.
4. **Durante a implementação** (registrados no `tasks.md`): a chave cifrada pela API síncrona do `safeStorage` não voltava depois de reiniciar no Linux (corrigido na T7.11), e uma falha `unknown` não reproduzida (o log agora diz a causa).
