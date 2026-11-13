# Verificação — Feature 05: Painel de tarefas

| Máquina                                                                          | Data       | Commit    | Node                                                      |
| -------------------------------------------------------------------------------- | ---------- | --------- | --------------------------------------------------------- |
| Linux: Ubuntu 24.04.5, GNOME 46 sob XWayland, 8 núcleos, HDMI + tela do notebook | 2026-11-13 | `49a1720` | v22.23.2 (forçado no `PATH`; o Node 24 do shell continua) |

## Resultado por critério (Linux)

| CA                                             | Como foi verificado                                                                                                                                                                                                                                | Resultado                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| CA1 (RF-10 CA1) abrir pelo menu e pela bandeja | App: clique direito (XTest) sobre o desenho abriu o menu com "Abrir painel"; clique no item abriu o painel. Bandeja → "Abrir painel": dona do projeto. Clique direito no vazio sem menu: T5.09. `mascot-menu.test.ts`, `register-handlers.test.ts` | aprovado no Linux; **pendente: Windows** |
| CA2 (RF-10 CA2) teclado                        | Dona do projeto: Tab por todos os controles, Enter, Esc fecha                                                                                                                                                                                      | aprovado no Linux; **pendente: Windows** |
| CA3 posição ao lado da Fai                     | `placement.test.ts` + mutação; app: Fai em `2600, 700` → painel em `2272, 420` (esquerda, base alinhada); Fai arrastada para `1400, 700` → painel em `1596, 420` (direita, perto da borda do HDMI)                                                 | aprovado no Linux; **pendente: Windows** |
| CA4 fecha ao perder o foco e com Esc           | `panel-controller.test.ts` + mutação; dona do projeto: Esc e clique na área de trabalho fecham                                                                                                                                                     | aprovado no Linux; **pendente: Windows** |
| CA5 (RF-11 CA1) regra do título                | `tasks.test.ts`, `task-service.test.ts` + mutação; dona do projeto: Enter vazio mostra "Escreva um título para a tarefa." e a mensagem some ao digitar                                                                                             | aprovado                                 |
| CA6 (RF-11 CA2) nova no topo                   | `PanelApp.test.tsx`; app: com duas tarefas no arquivo, a mais nova ("ler") no topo; dona do projeto criou uma com Enter                                                                                                                            | aprovado no Linux; **pendente: Windows** |
| CA7 (RF-12 CA1) concluir e reabrir             | `tasks.test.ts` + mutação; app: clique na bolinha gravou `completedAt`, reabrir em "Concluídas" o limpou                                                                                                                                           | aprovado                                 |
| CA8 (RF-12 CA2) comemoração                    | `animation.test.ts`, `task-service.test.ts` + mutação; app: logo após concluir, 7 quadros distintos em 0,5 s na janela da Fai, contra 4 em repouso (ritmo de 80 ms da comemoração); dona do projeto viu na T5.10                                   | aprovado no Linux; **pendente: Windows** |
| CA9 (RF-13 CA1) excluir com confirmação        | App: ✕ mostrou "Excluir esta tarefa? Sim / Não"; "Não" manteve as duas tarefas no arquivo; "Sim" removeu a tarefa do arquivo e da lista                                                                                                            | aprovado no Linux; **pendente: Windows** |
| CA10 (RF-13 CA2) ID inexistente                | `tasks.test.ts`, `task-service.test.ts`, `PanelApp.test.tsx` + mutação                                                                                                                                                                             | aprovado                                 |
| CA11 concluídas recolhidas                     | `PanelApp.test.tsx` + mutação; app: "Concluídas (1)" recolhida depois de concluir, abriu com um clique                                                                                                                                             | aprovado no Linux; **pendente: Windows** |
| CA12 (RF-17 CA1) sobrevive ao reinício         | App: encerrado e reaberto, arquivo idêntico (tarefa e posição) e Fai no mesmo lugar                                                                                                                                                                | aprovado no Linux; **pendente: Windows** |
| CA13 (RF-17 CA2) ida e volta e migração        | `data-store-load.test.ts`, `schema.test.ts`, `migrations.test.ts` + 2 mutações; app: arquivo v1 com a Fai em `2600, 700` virou v2 com `tasks: []` e a mesma posição                                                                                | aprovado                                 |
| CA14 (RNF-10) contraste, rótulos, foco         | `tests/ui/panel-contrast.test.ts` (15 pares) + mutação; `PanelApp.test.tsx` (nomes acessíveis); dona do projeto: foco lilás visível, visual aprovado                                                                                               | aprovado no Linux; **pendente: Windows** |
| CA15 (RNF-09) testes                           | Domínio de tarefas, migração e componentes do painel com testes (154 testes da feature)                                                                                                                                                            | aprovado                                 |
| CA16 (RNF-03) IPC                              | `schemas.test.ts`, `register-handlers.test.ts`, `sender-guard.test.ts`, preloads + 3 mutações; CSP estrita nas duas páginas do build; cada preload só faz `require("electron")`                                                                    | aprovado                                 |

## Comandos executados

- `node --version` → `v22.23.2` (com `~/.nvm/versions/node/v22.23.2/bin` na frente do `PATH`).
- `npm run check` → `tsc` (node + web), ESLint, Prettier ok; **40 arquivos, 256 testes aprovados**.
- `npm run build` → `out/main/index.js` 35,02 kB; `out/preload/mascot.js` 163,52 kB e `panel.js` 163,42 kB, cada um só com `require("electron")`; `out/renderer/index.html` e `panel.html`; `panel-*.js` 8,03 kB, `panel-*.css` 3,73 kB.
- `npx vitest run` nos 15 caminhos da feature → **154 testes aprovados**.
- Mutações (script fora do repositório, restaurando o conteúdo original): **12 de 12 mortas** — limite do título, reabrir sem limpar `completedAt`, excluir sem `NOT_FOUND`, migração sem `tasks: []`, leitura sem validar pela versão de origem, canais de tarefa aceitando qualquer janela, `id` sem UUID, preload repassando payload sem validar, comemorar ao reabrir, painel sem fechar no `blur`, painel sempre à esquerda, "Concluídas" sem recolher ao abrir. `git diff` vazio depois.
- `npx vitest run tests/architecture` → 2 aprovados.
- CSP no build: `default-src 'none'; script-src 'self'; …` em `index.html` e em `panel.html`.

## Roteiro automatizado com o app

Build de produção, `env -u ELECTRON_RUN_AS_NODE`, `--ozone-platform=x11`. Cópia do `fai-data.json` da dona do projeto antes; restaurada e conferida com igualdade de bytes no fim. Entrada por XTest (`ctypes`, sem instalar nada), **só cliques**, cada um conferindo antes que o ponto cai dentro de uma janela da Fai, do painel ou do menu, mapeada; telas capturadas por `xwd` para localizar os controles.

| Passo                            | Saída real                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Migração                         | `{"schemaVersion":1,"mascot":{"position":{"x":2600,"y":700}}}` → `{"schemaVersion":2,…,"tasks":[]}`, Fai em `2600, 700`                 |
| Menu de contexto                 | clique direito em `(94, 85)` da Fai → janela nova de 170×105 com "Abrir painel"                                                         |
| Abrir                            | clique no item → painel `320x440+2272+420` (esperado `2272, 420`), janela ativa = painel                                                |
| Lista                            | "ler" (mais nova) acima de "regar as plantas"; "2 pendentes"                                                                            |
| Concluir                         | bolinha de "ler" → `completedAt` gravado; "1 pendente"; "Concluídas (1)" recolhida; Fai com 7 quadros distintos em 0,5 s (4 em repouso) |
| Reabrir                          | "Concluídas (1)" aberta, "ler" riscada; bolinha → `completedAt: null`; "2 pendentes"                                                    |
| Excluir                          | ✕ → "Excluir esta tarefa? Sim / Não"; "Não" manteve 2 tarefas; ✕ + "Sim" → `['ler']`                                                    |
| Acompanhar                       | arrasto pelo desenho de `2600` para `1400`: painel em `1596, 420` (direita, base alinhada); posição `1400, 700` gravada                 |
| Reinício                         | encerrado (0 processos), reaberto: arquivo idêntico, Fai em `1400, 700`, painel fechado                                                 |
| Medição (`tools/measure/`, 20 s) | painel aberto: 2,15% de um núcleo = 0,27% da máquina, 149 MB privados, PSS 288 MB; painel fechado: 0,26% da máquina, 151 MB, PSS 283 MB |
| Logs                             | três execuções sem mensagem recusada, `[ipc]` nem erro de preload                                                                       |
| Fim                              | 0 processos `electron`; dados da dona do projeto restaurados (`17, 852`, duas tarefas)                                                  |

## Roteiro manual

Feito pela dona do projeto nesta máquina, em 2026-11-13: "Abrir painel" pela bandeja abre o painel com o cursor no campo; Enter vazio mostra "Escreva um título para a tarefa." e a mensagem some ao digitar; criação com Enter; Tab com o contorno lilás em cada controle; Esc fecha; clique na área de trabalho fecha. Todos ok. Na T5.08 a T5.10 ela também conferiu o arrasto com o painel aberto, o clique direito no vazio sem menu, a comemoração e o visual.

**Pendente no Windows** (`specs/manual-tests.md`, "Etapa 5 — painel de tarefas"): passos 1 a 15, com prioridade para o passo 15 (menu de contexto a partir de uma janela sem foco e foco do painel ao abrir, ADR-0014) e para a medição de memória (abaixo).

## Problemas encontrados

1. **Roteiro automatizado digitou na janela errada (erro do roteiro, não do app).** A primeira versão abria o menu com teclas (seta + Enter) e digitava as tarefas. O menu não recebeu as teclas, o painel não abriu, e o texto ("regar as plantas", "ler") foi parar no chat da dona do projeto no VS Code, que tinha o foco. O roteiro conferia o foco, mas não parava quando a conferência falhava. Os dados dela foram restaurados da cópia (conferidos byte a byte). A segunda versão usa só cliques, cada um conferindo o alvo, e aborta na primeira falha.
2. **Memória em repouso subiu de ~133 MB (Etapa 4) para ~150 MB** com a janela do painel criada e escondida desde o início (um renderer a mais). Continua abaixo dos 250 MB do RNF-08; no Linux o PSS (283 MB) segue acima, como já registrado na feature 04. Medir no Windows.
3. **Preload da mascote cresceu de 1 kB para 163 kB:** agora valida eventos com o `eventContract` (zod embutido, como o do painel). Sem efeito visível; anotado como referência.
4. Os demais defeitos achados durante a implementação (pedaço compartilhado entre os preloads, atraso de posição no X11, testes fracos revelados por mutação) já foram corrigidos e estão em "Verificações executadas" do `tasks.md`.

## Fechamento

2026-11-13: a dona do projeto aceitou fechar a feature com a verificação no Windows pendente. Um segundo `/spec:verify` no mesmo dia, nesta máquina e no mesmo código (`b60892a`, que só acrescentou este registro), não repetiu as verificações: os resultados acima continuam valendo, e a parte que faltava só pode ser executada no Windows. Fica aberto, sem bloquear a Etapa 6: o roteiro "Etapa 5 — painel de tarefas" de `specs/manual-tests.md` no Windows (prioridade: passo 15, menu de contexto a partir da Fai sem foco e foco do painel ao abrir) e a memória com `tools/measure/`.
