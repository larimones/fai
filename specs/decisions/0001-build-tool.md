# ADR-0001 — Ferramenta de build: electron-vite

- **Status:** proposto
- **Data:** 2026-10-22

## Contexto

Precisamos compilar três alvos (main, preload, renderer) com TypeScript, ter HMR no renderer, recarga do main/preload em desenvolvimento e, mais tarde (Etapa 7), gerar instalador Windows.

## Alternativas

| Opção | Prós | Contras |
|---|---|---|
| **electron-vite** | Um único `electron.vite.config.ts` para os três alvos; HMR do renderer e *hot restart* do main/preload prontos; suporte de primeira classe a preload em sandbox; muito usado com React+TS. | Não empacota: precisa de um empacotador à parte (electron-builder). |
| Electron Forge + plugin Vite | Ferramenta oficial; build + empacotamento + publicação num só lugar. | Plugin Vite marcado como experimental por muito tempo; configuração em vários arquivos (`forge.config`, `vite.main/preload/renderer.config`); *makers* do Windows (Squirrel) menos flexíveis que NSIS. |
| Vite + scripts manuais | Controle total. | Reinventa recarga do main, orquestração dos processos e build de preload. |

## Decisão

**electron-vite** para desenvolvimento e build. O empacotamento Windows será feito na Etapa 7 com **electron-builder** (alvo NSIS), em ADR próprio.

O projeto é montado manualmente (não pelo template `create @quick-start/electron`) para não trazer dependências que ainda não usamos.

## Consequências

- Estrutura padrão `src/main`, `src/preload`, `src/renderer`, que já é a nossa.
- Versões de Electron, electron-vite e Vite são fixadas pelo lockfile na instalação (as estáveis mais recentes e compatíveis entre si naquele momento).
- Vite atual exige Node ≥ 20.19 → o projeto exige **Node 22 LTS** (`.nvmrc` + `engines`).
