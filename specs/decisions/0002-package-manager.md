# ADR-0002 — Gerenciador de pacotes: npm

- **Status:** aceito em 2026-10-22
- **Data:** 2026-10-22

## Contexto

Desenvolvimento em Windows e Linux, uma pessoa, poucas dependências. O ecossistema Electron baixa binários em scripts de `postinstall` (o próprio pacote `electron`).

## Alternativas

| Opção        | Prós                                                                                                                                                            | Contras                                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **npm**      | Vem com o Node, zero instalação extra nos dois SOs; `node_modules` plano, que é o que electron-builder espera; scripts de `postinstall` rodam sem configuração. | Instalação mais lenta e mais disco que pnpm.                                                                                                                                                       |
| pnpm         | Rápido e econômico; isolamento estrito de dependências.                                                                                                         | pnpm 10 bloqueia scripts de instalação por padrão (`onlyBuiltDependencies` para `electron`, `esbuild`); electron-builder costuma exigir `node-linker=hoisted`; mais um ponto de atrito no Windows. |
| Yarn (Berry) | PnP rápido.                                                                                                                                                     | PnP incompatível com Electron/empacotamento sem `nodeLinker: node-modules`; ferramenta extra.                                                                                                      |

## Decisão

**npm**, com `package-lock.json` versionado e `npm ci` documentado para instalações limpas.

## Consequências

- Nenhuma ferramenta além do Node 22 é necessária.
- Se o tempo de instalação incomodar, migrar para pnpm é barato (só lockfile e `.npmrc`), e ficaria registrado em novo ADR.
