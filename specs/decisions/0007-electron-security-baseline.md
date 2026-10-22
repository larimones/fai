# ADR-0007 — Linha de base de segurança do Electron

- **Status:** proposto (implementação na Etapa 1)
- **Data:** 2026-10-22

## Decisão

1. **Isolamento:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`, `webviewTag: false`, `experimentalFeatures: false`. Centralizado em `secureWebPreferences(preloadPath)`, coberto por teste. Também `app.enableSandbox()` antes de `ready`.
2. **Preload mínimo:** um preload por tipo de janela; expõe via `contextBridge.exposeInMainWorld('fai', api)` apenas funções nomeadas. Nunca expõe `ipcRenderer`, `event` ou um `invoke(channel)` genérico.
3. **IPC:** canais de `src/shared/ipc/channels.ts`; handlers registrados por um *helper* que verifica remetente (janela conhecida + origem do `senderFrame`) e valida entrada com zod antes de chamar a lógica.
4. **Navegação:** `will-navigate` → `preventDefault()` para qualquer URL diferente da página do app; `setWindowOpenHandler` → `{ action: 'deny' }`; `will-attach-webview` bloqueado.
5. **Permissões:** `session.setPermissionRequestHandler` e `setPermissionCheckHandler` negam tudo (notificações são feitas no main e não dependem disso).
6. **CSP:**
   - Produção (meta no `index.html` **e** cabeçalho via `session.defaultSession.webRequest.onHeadersReceived`):
     `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`.
   - Desenvolvimento: o servidor do Vite injeta um script inline de *React Refresh* e usa WebSocket para HMR. A flexibilização permitida é **apenas** a origem do servidor local (`http://localhost:<porta>` e `ws://localhost:<porta>`) e o que for estritamente necessário para o preâmbulo do React Refresh, aplicada só quando `!app.isPackaged`. A política exata usada fica registrada aqui ao fim da Etapa 1.
7. **Conteúdo:** nenhuma URL remota carregada; janelas carregam `file://` (produção) ou o servidor local do Vite (desenvolvimento).
8. **Segredos:** nunca no renderer nem no repositório; quando existirem (pós-MVP), ficam no main com `safeStorage`.
9. **Empacotamento (Etapa 7):** Electron Fuses — `RunAsNode` off, `EnableNodeOptionsEnvironmentVariable` off, `EnableNodeCliInspectArguments` off, `EnableEmbeddedAsarIntegrityValidation` on, `OnlyLoadAppFromAsar` on.

## Alternativas

Relaxar `sandbox` para usar módulos Node no preload foi rejeitado: nada no MVP precisa disso; o preload só faz ponte.

## Consequências

- Preloads não podem importar módulos Node além do subconjunto permitido em sandbox (`electron`, `events`, `timers`, `url`); o contrato compartilhado precisa ser empacotado junto (o bundler cuida disso).
- O teste de contrato garante que a superfície exposta não cresce sem querer.
