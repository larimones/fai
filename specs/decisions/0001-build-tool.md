# ADR-0001 — Ferramenta de build: electron-vite

- **Status:** aceito em 2026-10-22
- **Data:** 2026-10-22

## Contexto

Precisamos compilar três alvos (main, preload, renderer) com TypeScript, ter HMR no renderer, recarga do main/preload em desenvolvimento e, mais tarde (Etapa 7), gerar instalador Windows.

## Alternativas

| Opção                        | Prós                                                                                                                                                                                       | Contras                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **electron-vite**            | Um único `electron.vite.config.ts` para os três alvos; HMR do renderer e _hot restart_ do main/preload prontos; suporte de primeira classe a preload em sandbox; muito usado com React+TS. | Não empacota: precisa de um empacotador à parte (electron-builder).                                                                                                                                    |
| Electron Forge + plugin Vite | Ferramenta oficial; build + empacotamento + publicação num só lugar.                                                                                                                       | Plugin Vite marcado como experimental por muito tempo; configuração em vários arquivos (`forge.config`, `vite.main/preload/renderer.config`); _makers_ do Windows (Squirrel) menos flexíveis que NSIS. |
| Vite + scripts manuais       | Controle total.                                                                                                                                                                            | Reinventa recarga do main, orquestração dos processos e build de preload.                                                                                                                              |

## Decisão

**electron-vite** para desenvolvimento e build. O empacotamento Windows será feito na Etapa 7 com **electron-builder** (alvo NSIS), em ADR próprio.

O projeto é montado manualmente (não pelo template `create @quick-start/electron`) para não trazer dependências que ainda não usamos.

## Consequências

- Estrutura padrão `src/main`, `src/preload`, `src/renderer`, que já é a nossa.
- Versões de Electron, electron-vite e Vite são fixadas pelo lockfile na instalação (as estáveis mais recentes e compatíveis entre si naquele momento).
- Vite atual exige Node ≥ 20.19 → o projeto exige **Node 22 LTS** (`.nvmrc` + `engines`).

## Registro da instalação (Etapa 1, 2026-10-22)

| Pacote                      | Versão                            | Observação                                                                                                       |
| --------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| electron                    | 44.9.3 (Node 24.22, Chromium 152) | A 45.0.0 havia saído na véspera; preferimos a linha 44, já estabilizada. Atualizar quando a 45 tiver patches.    |
| electron-vite               | 6.0.0                             | Vite 8 usa Rolldown: a opção de entradas é `build.rolldownOptions`.                                              |
| vite / @vitejs/plugin-react | 8.3.5 / 6.1.2                     | —                                                                                                                |
| typescript                  | 6.0.3                             | **Não** a 7.x: o typescript-eslint 8.72 aceita TypeScript `<6.1`. Rever quando o typescript-eslint suportar a 7. |
| @types/node                 | 24.x                              | Acompanha o Node embutido no Electron 44.                                                                        |

- O `package.json` **não** usa `"type": "module"`: assim o electron-vite gera main e preload em CommonJS, e o preload em sandbox **só** aceita CommonJS. Os arquivos de configuração usam extensão `.mts` para continuarem em ESM.
