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

| Camada              | Pasta                  | Pode depender de                                        | Responsabilidade                                                                                                                               |
| ------------------- | ---------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Domínio             | `src/domain`           | nada (TypeScript puro)                                  | Regras puras: tarefas, lembretes, vencimento, máquina de estados da animação, hit-test, migrações de dados. Recebe `now` e `id` por parâmetro. |
| Contrato            | `src/shared`           | `zod`, tipos do domínio                                 | Nomes de canais IPC, schemas de request/response, tipos derivados.                                                                             |
| Persistência        | `src/main/persistence` | domínio, `zod`, `node:fs`, `node:path` (sem `electron`) | Ler/gravar o documento JSON; escrita atômica e serializada; migração; quarentena de arquivo corrompido.                                        |
| Integração com o SO | `src/main/os`          | `electron`                                              | Tudo que muda entre Windows e Linux (ver abaixo).                                                                                              |
| Aplicação (main)    | `src/main/*`           | domínio, contrato, persistência, SO                     | Janelas, IPC, serviços, agendador de lembretes.                                                                                                |
| UI                  | `src/renderer`         | domínio, contrato (tipos)                               | React; fala com o main **só** via `window.fai`.                                                                                                |

O domínio não importa `zod`: schemas vivem na fronteira que validam (`shared` para o IPC, `main/persistence` para o documento JSON); o domínio trabalha com tipos já validados. A persistência não importa `electron` (regra de lint): recebe o caminho do arquivo e callbacks por parâmetro, o que permite testá-la com arquivos reais em diretório temporário.

## Processos do Electron

- **Main**: único com acesso a Node e ao SO. Dono do estado (fonte da verdade dos dados).
- **Preload** (um por tipo de janela, princípio do menor privilégio): roda em sandbox; só importa `electron` (`contextBridge`, `ipcRenderer`) e o contrato. Expõe funções nomeadas e tipadas.
- **Renderer**: React sem Node. Janelas:
  - **Principal (Etapa 1)**: janela comum com moldura, só para validar a fundação. Substituída pela janela da mascote na Etapa 3; na Etapa 5 surge o painel.
  - **Mascote (Etapa 3)**: 188×160 px lógicos (ADR-0013), transparente, sem moldura, always-on-top, `skipTaskbar`, sem foco. Sem botão de fechar: o app encerra pelo "Sair" da bandeja. Detalhes no ADR-0004.
  - **Painel (Etapa 5)**: 320×440 px lógicos, sem moldura, fora da barra de tarefas, sempre no topo; ao contrário da mascote, recebe foco. Abre ao lado da Fai e fecha ao perder o foco ou com Esc. Detalhes no ADR-0014 e na seção "Painel de tarefas (Etapa 5)".

## Contrato IPC

Regras:

1. Canais nomeados `dominio:acao`, declarados em `src/shared/ipc/channels.ts` como constantes.
2. Cada canal tem schema zod de entrada e saída em `src/shared/ipc/schemas.ts`.
3. Renderer → main por `ipcRenderer.invoke` (request/response) ou `send` (eventos de alta frequência, como arrasto). Main → renderer por `webContents.send` em canais de evento declarados.
4. O handler no main: (a) verifica o remetente — o `webContents` é **a janela dona do canal** (`mascot:*` só a mascote, `tasks:*` só o painel, `app:get-info` as duas; ADR-0014) e `senderFrame.url` é uma das páginas do app; (b) faz `schema.parse` do payload; (c) executa; (d) retorna objeto validado. Erros viram `{ ok: false, error: { code, message } }`, sem stack para o renderer; recusas de regra (`INVALID_TITLE`, `NOT_FOUND`) vêm do serviço como `IpcRuleError`, com mensagem em pt-BR para mostrar na tela.
5. O preload nunca repassa o `event` do Electron ao renderer, e valida com o `eventContract` o payload dos eventos main → janela antes de repassá-lo.

Canais (✅ implementados; demais planejados, revisados em cada etapa):

| Canal                       | Tipo          | Janela  | Entrada                                                                                                | Saída                         |
| --------------------------- | ------------- | ------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `app:get-info` ✅           | invoke        | todas   | —                                                                                                      | `{ name, version, platform }` |
| `mascot:set-interactive` ✅ | send          | mascote | `{ interactive: boolean }`                                                                             | —                             |
| `mascot:drag` ✅            | send          | mascote | `{ phase: 'start'\|'move'\|'end' }` (cursor lido no main)                                              | —                             |
| `mascot:open-menu` ✅       | send          | mascote | —                                                                                                      | —                             |
| `mascot:reaction` ✅        | evento main→r | mascote | `{ kind: 'celebrate' }` (`'reminder'` na Etapa 6)                                                      | —                             |
| `tasks:list` ✅             | invoke        | painel  | —                                                                                                      | `Task[]`                      |
| `tasks:create` ✅           | invoke        | painel  | `{ title }`                                                                                            | `Task`                        |
| `tasks:set-done` ✅         | invoke        | painel  | `{ id, done }`                                                                                         | `Task`                        |
| `tasks:delete` ✅           | invoke        | painel  | `{ id }`                                                                                               | —                             |
| `reminders:list`            | invoke        | painel  | —                                                                                                      | `Reminder[]`                  |
| `reminders:create`          | invoke        | painel  | `{ text, dueAt (ISO 8601) }`                                                                           | `Reminder`                    |
| `reminders:delete`          | invoke        | painel  | `{ id }`                                                                                               | —                             |
| `panel:opened` ✅           | evento main→r | painel  | — (o painel recarrega a lista, recolhe "Concluídas" e foca o campo)                                    | —                             |
| `data:changed`              | evento main→r | painel  | `{ tasks, reminders }` (adiado: só o painel muda tarefas e recebe cada resultado; plano da feature 05) | —                             |

API exposta (forma final ilustrativa): `window.fai.app.getInfo()`, `window.fai.tasks.create({ title })`, … Tipada por `src/shared/ipc/api.ts` e declarada em `src/renderer/env.d.ts`.

## Persistência

Um documento JSON em `app.getPath('userData')/fai-data.json` (ADR-0003):

```json
{
  "schemaVersion": 2,
  "mascot": { "position": { "x": 1716, "y": 864 } },
  "tasks": [
    {
      "id": "6f1c2a4e-…",
      "title": "Regar as plantas",
      "createdAt": "2026-11-12T15:00:00.000Z",
      "completedAt": null
    }
  ]
}
```

A v1 (Etapas 2 a 4) tinha só `mascot`. A v2 (Etapa 5, ADR-0015) acrescenta `tasks`, na ordem de criação; a migração `1 → 2` acrescenta `tasks: []`. Lembretes (`reminders`) entram por migração na Etapa 6.

Implementado na Etapa 2 em `src/main/persistence/` (`createDataStore`):

- **Leitura** (`load()`, na inicialização, antes de criar janelas): envelope zod (`schemaVersion` inteiro positivo) → schema estrito **da versão de origem** (`sourceSchemas`) → `migrateToCurrent` (domínio) → schema estrito da versão atual. Nunca rejeita; devolve um `status`:
  - `created` (arquivo ausente), `loaded`, `migrated`;
  - `quarantined`: JSON inválido, documento inválido, versão futura ou sem caminho de migração → o arquivo é renomeado para `fai-data.corrupt-<AAAAMMDDTHHMMSSZ>.json` (UTC, sem `:`), o app começa vazio e avisa com um diálogo;
  - `unavailable`: o arquivo existe, mas não pôde ser lido nem renomeado → o app começa vazio, avisa e **não grava** nesta execução, para não sobrescrever o arquivo.
- **Escrita** (`save()`): _debounce_ de 200 ms (o último dado vence), fila serializada, `writeFile(fai-data.json.tmp)` + `rename` para o final; novas tentativas em `EPERM`/`EBUSY`/`EACCES` após 50, 100, 200 e 400 ms (antivírus no Windows). Falha persistente → `onError`, `.tmp` removido, arquivo anterior intacto.
- **Inicialização e encerramento** (`startup.ts`): `created`, `migrated` e `quarantined` gravam o documento na hora; `before-quit` espera o `flush()` antes de encerrar.
- O schema da v2 só aceita tarefas que o domínio poderia ter criado (UUID, instantes ISO, título dentro da regra); um arquivo editado à mão com tarefa inválida vai para a quarentena.

## Estratégia multiplataforma

`src/main/os/desktop-integration.ts` define a interface; `createDesktopIntegration(process.platform)` escolhe a implementação. Ela só ganha métodos quando uma etapa precisa deles (sem antecipação). Pontos de variação já conhecidos:

| Necessidade                       | Windows                                                              | Linux                                                                               |
| --------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Cliques atravessando áreas vazias | `setIgnoreMouseEvents(true, { forward: true })` + hit-test por pixel | `forward` não é suportado → janela do tamanho do sprite, sem atravessar (ADR-0004)  |
| Transparência                     | nativa                                                               | exige compositor; Wayland limitado → XWayland via `--ozone-platform=x11` (ADR-0010) |
| Notificações                      | Toast; exige `AppUserModelID`                                        | libnotify via D-Bus                                                                 |
| Bandeja                           | nativa                                                               | depende de suporte a AppIndicator/StatusNotifier no ambiente                        |

Código de plataforma fica **só** ali; o resto do app conversa com a interface. A versão Linux completa vira uma nova implementação da interface.

Métodos atuais: `createTray({ icon, tooltip, menu, onActivate })` (Etapa 2) e `setClickThrough(window, enabled)` (Etapa 3: `setIgnoreMouseEvents` com `forward` no Windows; nada no Linux). No Windows, o clique esquerdo chama `onActivate` (mostrar/ocultar a Fai) e o direito abre o menu; no Linux só há o menu, porque o AppIndicator não emite `click`. Outras plataformas são recusadas com erro. Os ícones ficam em `resources/` e são carregados de `join(app.getAppPath(), 'resources', …)`.

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

## Janela da mascote (Etapa 3)

Implementada conforme o ADR-0004 e o ADR-0011:

- **Janela** (`main/windows/mascot-window.ts`): 188×160 px lógicos desde a Etapa 4 (160×160 na Etapa 3), transparente, sem moldura, sempre no topo (`'floating'`), fora da barra de tarefas, sem foco; aparece com `showInactive()`. Preload `preload/mascot.ts` expõe `app.getInfo`, `mascot.setInteractive` e `mascot.drag`.
- **Renderer** (`renderer/src/`): `MascotApp` carrega a arte e o nome acessível; `Mascot` desenha a Fai (animada desde a Etapa 4, ver abaixo). O controle de ponteiro (`mascot/pointer-controller.ts`, sem DOM) faz o _hit-test_ a cada movimento, avisa o main só quando o cursor entra ou sai do desenho e manda `start`/`move`/`end` do arrasto, no máximo um `move` por quadro.
- **Main** (`main/mascot/mascot-controller.ts`): liga o click-through ao abrir e o alterna só quando muda; no arrasto lê o cursor com `screen.getCursorScreenPoint()` e chama `setPosition`; no fim grava a última posição que **ele mesmo aplicou** (no X11, `getPosition` atrasa em relação a `setPosition`); `display-removed` e `display-metrics-changed` trazem a Fai de volta para a tela, depois de 1 s sem novos eventos (o GNOME passa por arranjos intermediários ao trocar de monitores).
- **Domínio** (`domain/mascot/`): _hit-test_ por alfa (limiar 128), gesto de arrasto (limiar de 4 px, sem salto) e posição inicial (posição salva se ainda visível; senão, canto inferior direito do monitor principal, margem de 16 px).

## Animação (Etapa 4)

Implementada conforme o ADR-0005, o ADR-0011 e o ADR-0013:

- **Arte** (`tools/art/build-sprites.py`, Python + Pillow, rodado à mão): a arte da dona do projeto em `resources/art/` vira `renderer/src/assets/fai-sheet.png` (12 quadros de 376×320, contorno branco) e `fai-sheet.json` ("JSON (Array)" do Aseprite, uma _tag_ por animação). O app não depende do Python.
- **Domínio** (`domain/mascot/animation.ts`, `sprite-sheet.ts`): `frameAt` escolhe o quadro pelo tempo decorrido e pelas durações; a máquina de estados (`idle`, `reacting`, `dragging`) é um valor imutável com o relógio por parâmetro. Clique só reage a partir do `idle`; arrasto interrompe tudo; o fim da reação devolve ao `idle` a partir do instante exato em que ela acabou. A conversão do metadado decide por nome se a animação repete (`idle`, `dragged`) ou toca uma vez (`react`).
- **Contrato** (`shared/sprite-sheet-schema.ts`): schema zod do metadado; os campos do Aseprite que o app não usa são descartados.
- **Renderer**: `load-sprite-sheet.ts` valida o JSON da folha e o das máscaras de clique (prontas, geradas pelo script; `domain/mascot/mask-runs.ts` as decodifica), decodifica a folha, importada como arquivo comum, e recorta os quadros (`ImageBitmap`); nenhum pixel é lido de volta do canvas. `Mascot.tsx` guarda o estado da animação e o controle de ponteiro dentro de um único efeito; desenha só quando o quadro muda e dorme num `setTimeout` até a próxima troca (cerca de 6 desenhos por segundo no repouso). O canvas tem _backing store_ de 188×160 × `devicePixelRatio`, refeito quando a escala muda. O _hit-test_ usa a máscara do quadro na tela e é refeito quando o quadro troca sob o cursor parado. Os gestos (clique, início e fim de arrasto) saem do controle de ponteiro com o mesmo limiar de 4 px do main, sem canal IPC novo.
- **Pausa**: com `document.hidden` (ocultar a janela afeta a Page Visibility API, `backgroundThrottling` ligado), o laço não desenha nem agenda nada; ao reaparecer, recomeça o `idle`.

## Painel de tarefas (Etapa 5)

Implementado conforme o ADR-0014 e o ADR-0015:

- **Domínio** (`domain/tasks/tasks.ts`, `domain/panel/placement.ts`): regras das tarefas como funções puras sobre uma lista imutável, com ID e instante por parâmetro (título de 1 a 200 pontos de código, concluir e reabrir, `NOT_FOUND`, ordem do painel); posição do painel à esquerda da Fai, senão à direita, alinhado pela base e dentro da área de trabalho. A animação ganhou o estado `celebrating` (toca uma vez, ignorado durante o arrasto).
- **Main**: `tasks/task-service.ts` aplica as regras sobre `data.tasks`, grava pelo `DataStore`, gera o UUID e o instante, e pede a comemoração (`mascot:reaction`) só quando uma tarefa pendente é concluída. `panel/panel-controller.ts` posiciona, mostra e foca a janela do painel (`windows/panel-window.ts`), avisa `panel:opened`, esconde no `blur` e no Esc (`before-input-event`) e acompanha a posição que o controle da Fai acabou de aplicar (`onMoved`; no X11 `getPosition` atrasa). O menu de contexto da Fai (`mascot/mascot-menu.ts`, só "Abrir painel") abre com `Menu.popup` a partir de `mascot:open-menu`; a bandeja ganhou "Abrir painel". Os canais são registrados por janela (`registerAppHandlers`, `registerMascotHandlers`, `registerTaskHandlers`), cada um com a guarda da sua janela.
- **Preloads**: dois, cada um num arquivo único (`isolatedEntries` no `electron.vite.config.mts`: um preload em sandbox não carrega pedaços separados por `require`). `preload/panel.ts` expõe `window.faiPanel` (`tasks.*`, `onOpened`); o da mascote ganhou `openMenu` e `onReaction`.
- **Renderer**: segunda página, `panel.html`. `panel/PanelApp.tsx` (estado e ações), `TaskForm.tsx` e `TaskRow.tsx`; a cada `panel:opened` recarrega a lista, recolhe "Concluídas (N)", desfaz a pergunta de exclusão e foca o campo. Estilo em `panel.css`, com as cores em variáveis no `:root`; `tests/ui/panel-contrast.test.ts` mede cada par (4,5:1 para texto, 3:1 para bordas e foco). A mascote abre o menu no clique direito sobre o desenho e comemora ao receber `mascot:reaction`.
