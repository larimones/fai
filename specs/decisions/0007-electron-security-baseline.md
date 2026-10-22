# ADR-0007 — Linha de base de segurança do Electron

- **Status:** aceito em 2026-10-22 (implementação na Etapa 1)
- **Data:** 2026-10-22

## Decisão

1. **Isolamento:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`, `webviewTag: false`, `experimentalFeatures: false`. Centralizado em `secureWebPreferences(preloadPath)`, coberto por teste. Também `app.enableSandbox()` antes de `ready`.
2. **Preload mínimo:** um preload por tipo de janela; expõe via `contextBridge.exposeInMainWorld('fai', api)` apenas funções nomeadas. Nunca expõe `ipcRenderer`, `event` ou um `invoke(channel)` genérico.
3. **IPC:** canais de `src/shared/ipc/channels.ts`; handlers registrados por um _helper_ que verifica remetente (janela conhecida + origem do `senderFrame`) e valida entrada com zod antes de chamar a lógica.
4. **Navegação:** `will-navigate` → `preventDefault()` para qualquer URL diferente da página do app; `setWindowOpenHandler` → `{ action: 'deny' }`; `will-attach-webview` bloqueado.
5. **Permissões:** `session.setPermissionRequestHandler` e `setPermissionCheckHandler` negam tudo (notificações são feitas no main e não dependem disso).
6. **CSP:**
   - Fonte única: `src/main/security/csp.ts`. Um plugin no `electron.vite.config.mts` preenche o marcador `%FAI_CSP%` do `<meta>` em `index.html`: política de produção no `build` e de desenvolvimento no `dev`.
   - Produção:
     `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'`.
   - Desenvolvimento (só no servidor do Vite): `script-src 'self' 'unsafe-inline'` (preâmbulo inline do React Refresh), `style-src 'self' 'unsafe-inline'` (o Vite injeta CSS como `<style>`), `connect-src 'self' ws://localhost:*` (HMR). Nenhuma origem remota.
   - **Desvio do plano original (registrado na Etapa 1):** o cabeçalho via `session.webRequest.onHeadersReceived` foi descartado porque não há cabeçalhos HTTP em `file://`, então ele nunca valeria em produção; o `<meta>` é o mecanismo efetivo. `frame-ancestors` saiu da política porque navegadores ignoram essa diretiva em `<meta>`. O bloqueio de iframes de terceiros já vem de `default-src 'none'`.
   - Verificado em execução (Linux, dev e build): `fetch('https://example.com')` é bloqueado pela CSP e o Electron não emite o aviso "Insecure Content-Security-Policy".
7. **Conteúdo:** nenhuma URL remota carregada; janelas carregam `file://` (produção) ou o servidor local do Vite (desenvolvimento).
8. **Segredos:** nunca no renderer nem no repositório; quando existirem (pós-MVP), ficam no main com `safeStorage`.
9. **Empacotamento (Etapa 7):** Electron Fuses — `RunAsNode` off, `EnableNodeOptionsEnvironmentVariable` off, `EnableNodeCliInspectArguments` off, `EnableEmbeddedAsarIntegrityValidation` on, `OnlyLoadAppFromAsar` on.

## Alternativas

Relaxar `sandbox` para usar módulos Node no preload foi rejeitado: nada no MVP precisa disso; o preload só faz ponte.

## Consequências

- Preloads não podem importar módulos Node além do subconjunto permitido em sandbox (`electron`, `events`, `timers`, `url`); o contrato compartilhado precisa ser empacotado junto (o bundler cuida disso).
- O teste de contrato garante que a superfície exposta não cresce sem querer.
