# Verificação — Feature 04: Animação e reações

| Máquina                                                                          | Data       | Commit                             | Node                                                      |
| -------------------------------------------------------------------------------- | ---------- | ---------------------------------- | --------------------------------------------------------- |
| Linux: Ubuntu 24.04.5, GNOME 46 sob XWayland, 8 núcleos, HDMI + tela do notebook | 2026-11-06 | `380b0ae` (+ simplificação abaixo) | v22.23.2 (forçado no `PATH`; ver "Problemas encontrados") |

## Resultado por critério (Linux)

| CA                                | Como foi verificado                                                                                                                        | Resultado                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| CA1 (RF-08 CA1)                   | App construído: dona do projeto viu a Fai batendo as asas e piscando, nítida, sem cortar as asas; janela 188×160 (`xwininfo`).             | aprovado no Linux (100%); **pendente: manual, Windows 100/125/150%** |
| CA2 (RF-08 CA2)                   | `animation.test.ts` (`frameAt`, 5 testes), `sprite-sheet-asset.test.ts` (JSON real), `MascotApp.test.tsx` (troca a cada 160 ms) + mutações | aprovado                                                             |
| CA3 (RF-09 CA1)                   | App construído: clique faz a piscada e volta ao repouso; cliques rápidos não reiniciam (dona do projeto); `MascotApp.test.tsx` + mutação   | aprovado no Linux; **pendente: manual, Windows**                     |
| CA4 (RF-09 CA2)                   | App construído: asas no alto durante o arrasto e volta ao soltar (dona do projeto); `MascotApp.test.tsx` + mutação                         | aprovado no Linux; **pendente: manual, Windows**                     |
| CA5 (RF-09 CA3)                   | `animation.test.ts` (máquina de estados, 6 testes) + 3 mutações                                                                            | aprovado                                                             |
| CA6 (RNF-08 CA1, Windows)         | Não executável aqui (critério do Gerenciador de Tarefas). Medido no Linux só como referência: ver abaixo.                                  | **pendente: Windows**                                                |
| CA7 (RNF-08 CA2)                  | `MascotApp.test.tsx` (pausa) + mutação; app: CPU de 2,07% para 0,20% de um núcleo com a janela oculta (`IsUnMapped`); volta animada        | aprovado no Linux; **pendente: manual, Windows**                     |
| CA8 (RF-05 com animação, Windows) | `pointer-controller.test.ts` (máscara do quadro atual, `refresh`) + mutação. O click-through não existe no Linux (ADR-0004).               | parte automática aprovada; **pendente: manual, Windows**             |

## Comandos executados

- `node --version` → `v24.18.0` com o `PATH` padrão do shell; `v22.23.2` depois de pôr `~/.nvm/versions/node/v22.23.2/bin` na frente. Tudo abaixo rodou com o Node 22.
- `npm run check` → `tsc` (node + web) ok, ESLint ok, Prettier ok, **29 arquivos, 155 testes aprovados**.
- `npm run build` → `out/main/index.js` (22,97 kB), `out/preload/mascot.js` (0,82 kB), `out/renderer/assets/index-*.js` (3.270,77 kB, com a folha embutida).
- `npx vitest run` nos 6 arquivos de teste da feature → **42 testes aprovados**.
- Mutações (script fora do repositório, um arquivo por vez, restaurado com `git checkout`): 8 de 9 mortas na primeira rodada — borda do quadro (`<` → `<=`), clique aceito durante a reação, reação que não volta ao repouso, `dragEnd` ignorado, `refresh` desligado (CA8), `click`/`dragEnd` trocados (2 testes), pausa removida (CA7), checagem de _tag_ fora dos quadros. **Sobreviveu:** tirar o desvio "animação de uma vez terminou" de `frameAt` — mutação equivalente (o laço cai no `return` final com o mesmo resultado). O desvio redundante foi removido; a nova saída final foi mutada (`finished: false`) e 2 testes falharam. `git status` limpo depois das mutações; o único diff restante é a simplificação.
- Depois da simplificação: `npm run check` → 29 arquivos, 155 testes aprovados.

## Roteiro automatizado com o app

Build de produção aberto com `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron --ozone-platform=x11 --enable-logging=stderr .`. Cópia do `fai-data.json` antes (`{ x: 1121, y: 874 }`).

| Item                       | Saída real                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Janela                     | `xwininfo`: `188x160+1121+874`, na posição salva                                                                                                                                                               |
| CPU em repouso, 60 s       | `/proc/<pid>/stat`, % de um núcleo: main 0,02, GPU 1,25, utilitário 0,00, renderer 0,80 → **2,07% de um núcleo (0,26% da máquina de 8 núcleos)**                                                               |
| Memória em repouso         | `smaps_rollup`, todos os processos: **PSS 256 MB**; **privada ~143 MB** (main 50, GPU 36, renderer 40, utilitário 12, zygotes e auxiliar ~2). RSS somado (~499 MB) conta várias vezes a memória compartilhada. |
| CPU com a Fai oculta, 20 s | janela `IsUnMapped`; main 0,00, GPU 0,10, utilitário 0,05, renderer 0,05 → **0,20% de um núcleo**                                                                                                              |
| Log                        | sem erros de CSP, canvas, IPC ou exceção (só avisos conhecidos do GTK e do D-Bus da bandeja)                                                                                                                   |
| Encerramento               | o primeiro `pkill` não pegou a instância (padrão sem `--enable-logging`); com o padrão certo, 0 processos `electron`                                                                                           |
| Dados                      | durante o teste a dona do projeto arrastou a Fai (`{ x: 3060, y: 823 }`); a cópia foi restaurada e conferida com `cmp` (`{ x: 1121, y: 874 }`)                                                                 |

## Roteiro manual

Executado no Linux pela dona do projeto, com o build desta verificação: repouso animado e nítido, asas inteiras; clique com a piscada e volta; cliques rápidos sem reiniciar; asas no alto durante o arrasto; ocultar e mostrar pela bandeja, voltando animada. Todos ok.

**Pendente no Windows** (`specs/manual-tests.md`, "Etapa 4 — animação e reações"):

1. Passos 1 e 2: animação nítida em 100%, 125% e 150% (CA1).
2. Passos 3 a 5: reação ao clique, cliques rápidos, pose de arrasto (CA3, CA4).
3. Passo 6: CPU média < 3% e memória < 250 MB em 60 s, no Gerenciador de Tarefas (CA6).
4. Passo 7: ocultar e conferir a CPU perto de zero; mostrar e ver a animação voltar (CA7).
5. Passos 8 e 9: cliques atravessando o vazio com a Fai animada, inclusive com a asa passando sob o cursor parado (CA8).

## Problemas encontrados

1. **Node 24 na frente do nvm nesta máquina (ambiente, não do projeto).** `~/.local/node/bin` (Node 24.18.0) entra no `PATH` antes do nvm, e `nvm use` não muda o `node` que o shell encontra. A implementação da feature 04 hoje provavelmente rodou `npm run check` com o Node 24; nesta verificação tudo foi repetido com o Node 22 e passou. Correção sugerida à dona do projeto: tirar `~/.local/node/bin` do `PATH` (ou pôr o nvm antes) no perfil do shell. Registrado em "Pendências" do `tasks.md`.
2. **Mutação equivalente em `frameAt`:** código redundante removido (`refactor`), sem mudança de comportamento; testes continuam cobrindo a saída final.
3. **Memória no Linux por PSS (256 MB) um pouco acima dos 250 MB** do CA6. O CA6 é medido no Windows pelo Gerenciador de Tarefas (memória privada), cujo equivalente aqui é ~143 MB. Fica como referência para a medição no Windows.
4. **Roteiro de encerramento:** o padrão do `pkill` precisa incluir as flags com que o app foi aberto; anotado para os próximos roteiros (o app em si encerrou normalmente).

## Fechamento

2026-11-06: a dona do projeto aceitou fechar a feature com a verificação no Windows pendente ("toda essa parte da animação e da boneca está bem ok"). Ficam abertos, sem bloquear a Etapa 5: CA1 em 125% e 150%, CA3, CA4 e CA7 no Windows, CA6 (CPU e memória pelo Gerenciador de Tarefas ou por `tools/measure/`), CA8 (cliques atravessando com a Fai animada) e o carregamento da folha de `file://` com a CSP. A lista está em "Pendências" do `tasks.md`.
