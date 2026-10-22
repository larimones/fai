# Arquitetura

## Visão geral

```
┌──────────────────────── Processo principal (Node) ─────────────────────────┐
│  main/index.ts      ciclo de vida, instância única, segurança global        │
│  main/windows/      fábrica de janelas (mascote, painel) c/ webPreferences   │
│  main/ipc/          handlers: validam remetente + payload (zod), chamam      │
│                     serviços                                                │
│  main/services/     orquestração: carrega estado, aplica regra do domínio,  │
│                     persiste, avisa as janelas                              │
│  main/persistence/  DataStore JSON (atômico, versionado, migrações)          │
│  main/os/           DesktopIntegration (interface) + windows.ts / linux.ts   │
└───────────────▲──────────────────────────────────────────────▲──────────────┘
                │ IPC (canais nomeados em shared/ipc)          │
┌───────────────┴───────────┐                   ┌──────────────┴──────────────┐
│ preload/mascot.ts         │                   │ preload/panel.ts            │
│ contextBridge → window.fai│                   │ contextBridge → window.fai  │
├───────────────────────────┤                   ├─────────────────────────────┤
│ renderer: janela mascote  │                   │ renderer: janela painel     │
│ (canvas + máquina de      │                   │ (React: tarefas, lembretes) │
│  estados de animação)     │                   │                             │
└───────────────────────────┘                   └─────────────────────────────┘
        domain/  ← funções puras usadas por main e renderer
        shared/  ← contrato IPC (canais, schemas zod, tipos)
```

## Camadas

| Camada              | Pasta                  | Pode depender de                    | Responsabilidade                                                                                                                               |
| ------------------- | ---------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Domínio             | `src/domain`           | nada (TypeScript puro)              | Regras puras: tarefas, lembretes, vencimento, máquina de estados da animação, hit-test, migrações de dados. Recebe `now` e `id` por parâmetro. |
| Contrato            | `src/shared`           | `zod`, tipos do domínio             | Nomes de canais IPC, schemas de request/response, tipos derivados.                                                                             |
| Persistência        | `src/main/persistence` | domínio, `node:fs`, `node:path`     | Ler/gravar o documento JSON; escrita atômica e serializada; migração; quarentena de arquivo corrompido.                                        |
| Integração com o SO | `src/main/os`          | `electron`                          | Tudo que muda entre Windows e Linux (ver abaixo).                                                                                              |
| Aplicação (main)    | `src/main/*`           | domínio, contrato, persistência, SO | Janelas, IPC, serviços, agendador de lembretes.                                                                                                |
| UI                  | `src/renderer`         | domínio, contrato (tipos)           | React; fala com o main **só** via `window.fai`.                                                                                                |

O domínio não importa `zod`: schemas vivem em `shared` e validam a fronteira; o domínio trabalha com tipos já validados.

## Processos do Electron

- **Main**: único com acesso a Node e ao SO. Dono do estado (fonte da verdade dos dados).
- **Preload** (um por tipo de janela, princípio do menor privilégio): roda em sandbox; só importa `electron` (`contextBridge`, `ipcRenderer`) e o contrato. Expõe funções nomeadas e tipadas.
- **Renderer**: React sem Node. Janelas:
  - **Principal (Etapa 1)**: janela comum com moldura, só para validar a fundação. Na Etapa 3 ela é substituída pela janela da mascote; na Etapa 5 surge o painel.
  - **Mascote (Etapa 3)**: transparente, sem moldura, always-on-top, `skipTaskbar`, sem foco. Detalhes no ADR-0004.
  - **Painel (Etapa 5)**: janela pequena, sem barra de tarefas, para tarefas e lembretes.

## Contrato IPC

Regras:

1. Canais nomeados `dominio:acao`, declarados em `src/shared/ipc/channels.ts` como constantes.
2. Cada canal tem schema zod de entrada e saída em `src/shared/ipc/schemas.ts`.
3. Renderer → main por `ipcRenderer.invoke` (request/response) ou `send` (eventos de alta frequência, como arrasto). Main → renderer por `webContents.send` em canais de evento declarados.
4. O handler no main: (a) verifica o remetente — o `webContents` pertence a uma janela conhecida e `senderFrame.url` tem a origem do app; (b) faz `schema.parse` do payload; (c) executa; (d) retorna objeto validado. Erros viram `{ ok: false, error: { code, message } }`, sem stack para o renderer.
5. O preload nunca repassa o `event` do Electron ao renderer.

Canais (✅ Etapa 1; demais planejados, revisados em cada etapa):

| Canal                    | Tipo          | Janela  | Entrada                                               | Saída                         |
| ------------------------ | ------------- | ------- | ----------------------------------------------------- | ----------------------------- |
| `app:get-info` ✅        | invoke        | todas   | —                                                     | `{ name, version, platform }` |
| `mascot:set-interactive` | send          | mascote | `{ interactive: boolean }`                            | —                             |
| `mascot:drag`            | send          | mascote | `{ phase: 'start'\|'move'\|'end', screenX, screenY }` | —                             |
| `mascot:open-menu`       | send          | mascote | —                                                     | —                             |
| `mascot:reaction`        | evento main→r | mascote | `{ kind: 'celebrate'\|'reminder' }`                   | —                             |
| `tasks:list`             | invoke        | painel  | —                                                     | `Task[]`                      |
| `tasks:create`           | invoke        | painel  | `{ title }`                                           | `Task`                        |
| `tasks:set-done`         | invoke        | painel  | `{ id, done }`                                        | `Task`                        |
| `tasks:delete`           | invoke        | painel  | `{ id }`                                              | —                             |
| `reminders:list`         | invoke        | painel  | —                                                     | `Reminder[]`                  |
| `reminders:create`       | invoke        | painel  | `{ text, dueAt (ISO 8601) }`                          | `Reminder`                    |
| `reminders:delete`       | invoke        | painel  | `{ id }`                                              | —                             |
| `data:changed`           | evento main→r | painel  | `{ tasks, reminders }`                                | —                             |

API exposta (forma final ilustrativa): `window.fai.app.getInfo()`, `window.fai.tasks.create({ title })`, … Tipada por `src/shared/ipc/api.ts` e declarada em `src/renderer/env.d.ts`.

## Persistência

Um documento JSON em `app.getPath('userData')/fai-data.json` (ADR-0003):

```json
{ "schemaVersion": 1, "mascot": { "position": null } }
```

A v1 traz só o que existe na Etapa 2. Tarefas (`tasks: []`) e lembretes (`reminders: []`) entram por migração nas Etapas 5 e 6, quando seus formatos forem definidos (decisão de 2026-10-22).

- Leitura na inicialização → validação zod → migração para a versão atual.
- Escrita: fila serializada, _debounce_ curto, `writeFile(tmp)` + `rename(tmp, final)` (com novas tentativas em `EPERM`/`EBUSY` no Windows, comuns com antivírus).
- Corrompido/versão desconhecida: renomeia para `fai-data.corrupt-<timestamp>.json` e começa vazio.

## Estratégia multiplataforma

`src/main/os/desktop-integration.ts` define a interface; `createDesktopIntegration(process.platform)` escolhe a implementação. Ela só ganha métodos quando uma etapa precisa deles (sem antecipação). Pontos de variação já conhecidos:

| Necessidade                       | Windows                                                              | Linux                                                                              |
| --------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Cliques atravessando áreas vazias | `setIgnoreMouseEvents(true, { forward: true })` + hit-test por pixel | `forward` não é suportado → janela do tamanho do sprite, sem atravessar (ADR-0004) |
| Transparência                     | nativa                                                               | exige compositor; Wayland limitado → recomendar X11/XWayland                       |
| Notificações                      | Toast; exige `AppUserModelID`                                        | libnotify via D-Bus                                                                |
| Bandeja                           | nativa                                                               | depende de suporte a AppIndicator/StatusNotifier no ambiente                       |

Código de plataforma fica **só** ali; o resto do app conversa com a interface. A versão Linux completa vira uma nova implementação da interface.

## Segurança (resumo; detalhes no ADR-0007)

- `app.enableSandbox()`; `webPreferences` seguras centralizadas em uma única fábrica testada.
- `will-navigate` e `setWindowOpenHandler` negam tudo; `setPermissionRequestHandler` nega tudo.
- CSP estrita em produção, entregue por `<meta>` gerado no build a partir de `src/main/security/csp.ts` (cabeçalhos não existem em `file://`).
- Sem `remote`, sem `shell.openExternal` com entrada do renderer.
- Etapa 7: Electron Fuses e assinatura (se houver certificado) no empacotamento.

## Testes

- **Domínio**: Vitest, ambiente `node`, sem mocks (funções puras).
- **Contrato/preload/handlers**: Vitest com `electron` mockado (`vi.mock('electron')`).
- **Componentes**: Vitest + jsdom + React Testing Library; `window.fai` falso.
- **Arquitetura**: teste que varre `src/domain` e falha com imports proibidos (reforça a regra de lint).
- Fluxos de janela (transparência, click-through, notificações nativas): roteiros manuais em `specs/manual-tests.md` (criado na Etapa 3). E2E com Playwright fica fora do MVP.
