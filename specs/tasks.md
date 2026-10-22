# Tarefas — Etapa 1: fundação executável

Objetivo: aplicação executável, segura e testável, sem funcionalidades de produto. Marque `[x]` ao concluir; registre desvios na seção "Notas".

Legenda: **Dep.** = depende de; **Atende** = requisito(s).

| ID | Tarefa | Dep. | Atende | Pronto quando |
|---|---|---|---|---|
| [ ] T1.01 | Arquivos de ambiente: `.nvmrc` (22), `.gitignore`, `.gitattributes` (`* text=auto eol=lf`), `.editorconfig`, `package.json` base (`private`, `engines.node >=22`, `type: module` se compatível com electron-vite). | — | RNF-05 | `node -v` com nvm usa 22; `npm pkg get engines` mostra a restrição. |
| [ ] T1.02 | Instalar e configurar electron-vite: `electron`, `electron-vite`, `vite`, `react`, `react-dom`, `@vitejs/plugin-react`, `typescript`; `electron.vite.config.ts` com entradas `src/main`, `src/preload`, `src/renderer`; scripts `dev`, `build`, `preview`. | T1.01 | RF-01 | `npm run dev` abre uma janela em branco. |
| [ ] T1.03 | TypeScript `strict`: `tsconfig.json` (referências), `tsconfig.node.json` (main/preload/shared/domain), `tsconfig.web.json` (renderer/shared/domain); aliases `@domain`, `@shared`; script `typecheck`. | T1.02 | RNF-06 | `npm run typecheck` sem erros. |
| [ ] T1.04 | Vitest + jsdom + RTL + jest-dom: `vitest.config.ts` (ambiente `node` padrão, `jsdom` para `src/renderer`), *setup* de matchers; scripts `test` e `test:watch`. | T1.03 | RNF-06 | `npm test` executa (mesmo com teste trivial). |
| [ ] T1.05 | ESLint flat + typescript-eslint (com tipo) + react-hooks + Prettier; `no-restricted-imports` em `src/domain` (proibir `electron`, `node:*`, `react`, `@shared`, camadas de app); scripts `lint`, `format`, `format:check`, `check`. | T1.03 | RNF-06 | `npm run lint` e `npm run check` sem erros. |
| [ ] T1.06 | Domínio mínimo: `src/domain/index.ts` com o tipo `AppInfo` (nome, versão, plataforma) e a função pura `describeAppInfo(info)` usada pela UI. | T1.03 | RNF-06 | Compila; sem imports proibidos. |
| [ ] T1.07 | Fábrica de janela segura: `secureWebPreferences(preload)` + `createMainWindow()`; ciclo de vida (`ready`, `window-all-closed` → `quit`); DevTools só em dev e destacado. | T1.02 | RF-01, RNF-01 | Janela abre e fechar encerra o processo. |
| [ ] T1.08 | Endurecimento global: `app.enableSandbox()`; bloqueio de `will-navigate`, `setWindowOpenHandler`, `will-attach-webview`; negar permissões; CSP de produção (meta + cabeçalho) e de dev (mínima para HMR); registrar política final no ADR-0007. | T1.07 | RNF-01, RNF-02, RNF-04 | Sem aviso de CSP insegura no console; `typeof require === 'undefined'` no DevTools. |
| [ ] T1.09 | Contrato IPC: `src/shared/ipc/{channels,schemas,api}.ts` com `app:get-info`; *helper* `handle(channel, schema, fn)` no main com verificação de remetente + zod; preload `main.ts` expondo `window.fai.app.getInfo()`; `src/renderer/env.d.ts`. Instalar `zod`. | T1.07 | RNF-03 | `window.fai` tem só `app.getInfo`. |
| [ ] T1.10 | UI placeholder: `App.tsx` mostra "Fai ✨" + `describeAppInfo` via `window.fai`; `index.html` com CSP; tokens CSS da paleta (`product.md`). | T1.06, T1.08, T1.09 | RF-01 | Janela mostra nome, versão e plataforma. |
| [ ] T1.11 | Testes de infraestrutura: (a) **domínio**: `describeAppInfo` + teste de arquitetura que varre `src/domain` buscando imports proibidos; (b) **componente**: `App` renderiza dados de um `window.fai` falso e trata erro; (c) **contrato**: preload expõe exatamente a API declarada (electron mockado), handler rejeita payload inválido e remetente desconhecido, e `secureWebPreferences` tem as flags exigidas. | T1.04, T1.05, T1.06, T1.09, T1.10 | RF-01 CA3, RNF-01 CA1, RNF-03, RNF-06 CA4 | `npm test` verde com saída registrada. |
| [ ] T1.12 | README: pré-requisitos (Node 22 via nvm / nvm-windows), instalação, `dev`, `build`, testes, lint, typecheck, no Windows e no Linux; nota sobre Wayland. | T1.10 | RNF-14 | Comandos do README conferidos. |
| [ ] T1.13 | Verificação final: `npm run check` e `npm run build` no Linux (saída real); `npm run dev` no Linux; roteiro curto de validação no Windows (para eu executar) e registro do resultado. | T1.11, T1.12 | RF-01, RNF-05 | Resultados anotados em "Notas". |

## Fora da Etapa 1 (explicitamente)

Janela transparente, sprite, animação, bandeja, instância única, persistência, tarefas, lembretes, notificações, `DesktopIntegration` (nasce na Etapa 2, quando houver a primeira integração real), empacotamento.

## Notas

_(preenchido durante a implementação: desvios, saídas de verificação, pendências)_

- **2026-10-22, Fase A:** specs revisadas pela dona do projeto. Confirmados: (1) a Etapa 1 usa uma janela comum, que será substituída pela janela da mascote na Etapa 3; (2) sprite de 48×48 ampliado ×3 ou ×4 como ponto de partida; (3) excluir tarefa pede confirmação; (4) `DesktopIntegration` nasce na Etapa 2.
- **2026-10-22, T1.01 (parcial):** `.nvmrc`, `.gitattributes`, `.gitignore` e `.editorconfig` foram criados antes do primeiro commit, para que o clone no Windows já venha com fim de linha LF. Falta o `package.json` base.
- **Próximo passo:** aguardando "aprovado" para iniciar a implementação da Etapa 1 (T1.01 em diante).
