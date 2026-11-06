# Plano — Feature 05: Painel de tarefas

## Perguntas e respostas

| Pergunta                                                            | Resposta                                                                                                                                  | Data       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Onde o painel abre?                                                 | Perto da Fai.                                                                                                                             | 2026-11-06 |
| Clicar fora fecha o painel?                                         | Sim, fecha sozinho ao perder o foco (e com Esc).                                                                                          | 2026-11-06 |
| Onde ficam as concluídas?                                           | Seção "Concluídas (N)", recolhida por padrão.                                                                                             | 2026-11-06 |
| Como confirmar a exclusão?                                          | Na própria linha ("Excluir esta tarefa? Sim / Não").                                                                                      | 2026-11-06 |
| O que tem no menu de contexto da Fai?                               | Por enquanto, só "Abrir painel".                                                                                                          | 2026-11-06 |
| Arte de `celebrate`?                                                | Provisória, com quadros existentes.                                                                                                       | 2026-11-06 |
| Estilo do painel (duas maquetes pastel renderizadas pelo Electron)  | **A — lilás e branco** ("toque mais garota, coquete, tons pastel da Fai").                                                                | 2026-11-06 |
| Comemoração provisória (três prévias animadas com os quadros reais) | **A — asas rápidas + piscada**: dois ciclos de asas a 80 ms por quadro, terminando na piscada sorrindo (240 ms por quadro), cerca de 2 s. | 2026-11-06 |
| Arrastar a Fai com o painel aberto                                  | **O painel acompanha**, sempre ao lado dela e dentro da tela.                                                                             | 2026-11-06 |

Protótipo descartável no Linux (Electron 44, X11), com a dona do projeto: o painel recebe o foco cerca de 12 ms depois de `show()` + `focus()` e dá para digitar direto; o `blur` dispara ao clicar fora; `Menu.popup({ window })` funciona a partir da janela da mascote sem foco; clicar na Fai não tira o foco do painel; abrir o menu de contexto tira. Durante o teste, o processo de GPU do Electron caiu uma vez (ver "Riscos").

## Desenho

```
Fai (mascote, sem foco)                 Main                                   Painel (com foco)
─────────────────────                   ────                                   ─────────────────
clique direito no desenho ──mascot:open-menu──► Menu.popup("Abrir painel")
                                                 │  (ou bandeja → "Abrir painel")
                                                 ▼
                                        PanelController.open()
                                          posição = placePanel(caixa da Fai, 320×440, área de trabalho)
                                          show() + focus() ──panel:opened──────►  recarrega a lista,
                                                                                  recolhe "Concluídas",
                                                                                  foca "Nova tarefa"
                                          blur / Esc ──► hide()
arrasto da Fai ──mascot:drag──► MascotController.setPosition ──► PanelController.follow()

                                        tasks:list / create / set-done / delete ◄──── painel
                                          domínio (regras) → data.tasks → DataStore.save
                                          concluir ──mascot:reaction {celebrate}──► Fai comemora
```

**Estados da animação:** entra `celebrating` (animação `celebrate`, toca uma vez e volta ao `idle`). O evento `celebrate` interrompe `idle` e `reacting`; durante um arrasto é ignorado (a Fai está "sendo carregada").

**Arte de `celebrate` sem aumentar a folha:** o "JSON (Array)" do Aseprite permite que várias entradas de quadro apontem para o mesmo retângulo da imagem (é o que a opção _merge duplicates_ do Aseprite exporta). O script passa a gravar cada desenho uma vez só (os 8 quadros do GIF) e as animações referenciam esses retângulos com as durações delas: `react` aponta para os quadros 4–6, `dragged` para o 1 e `celebrate` para 1–8, 1–8 a 80 ms e 4–6 a 240 ms. A folha cai de 12 para 8 desenhos; o carregador reaproveita imagem e máscara por retângulo.

**Ordem e textos:** pendentes da mais nova para a mais antiga; concluídas da concluída por último para a primeira. Mensagens de erro em pt-BR vindas do main ("Escreva um título para a tarefa.", "O título pode ter até 200 caracteres.", "Essa tarefa não existe mais.").

## Mudanças por camada

- `src/domain/tasks/tasks.ts` (novo): `Task`; `validateTitle`; `createTask(tasks, { id, title, now })`; `setTaskDone(tasks, id, done, now)`; `deleteTask(tasks, id)`; `panelView(tasks)` (pendentes e concluídas ordenadas). Resultados como valores (`{ ok: false, code }`), sem exceções.
- `src/domain/data/fai-data.ts`: `FaiDataV2`, `CURRENT_SCHEMA_VERSION = 2`, migração `1 → 2` (`tasks: []`), `createEmptyData()` na v2 (ADR-0015).
- `src/domain/panel/placement.ts` (novo): `placePanel(mascot, panelSize, workArea)` — à esquerda, senão à direita, alinhado pela base, preso à área de trabalho.
- `src/domain/mascot/animation.ts` e `sprite-sheet.ts`: estado `celebrating`, evento `celebrate`, animação `celebrate` obrigatória (toca uma vez).
- `src/shared/ipc/`: canais novos, com schemas zod estritos:
  - `mascot:open-menu` (send, mascote, sem payload);
  - `mascot:reaction` (evento main → mascote, `{ kind: 'celebrate' }`);
  - `panel:opened` (evento main → painel, sem payload);
  - `tasks:list` (invoke, painel) → `Task[]`;
  - `tasks:create` (invoke, painel) `{ title: string ≤ 1000 }` → `Task`;
  - `tasks:set-done` (invoke, painel) `{ id: uuid, done: boolean }` → `Task`;
  - `tasks:delete` (invoke, painel) `{ id: uuid }` → `null`.
  - Novos códigos de erro: `INVALID_TITLE` e `NOT_FOUND`, com mensagem em pt-BR. O `data:changed` previsto na `architecture.md` não é necessário (só o painel muda tarefas e ele recebe cada resultado); fica fora até haver outra fonte de mudanças.
- `src/main/persistence/schema.ts`: schemas v1 e v2; leitura valida pela versão de origem antes de migrar (ADR-0015).
- `src/main/ipc/`: `createInvokeHandler` aceita erros de regra (código + mensagem) além dos de contrato; registro com guarda **por janela** (ADR-0014).
- `src/main/security/app-url.ts`: aceita as duas páginas (`index.html` e `panel.html`; no dev, a mesma origem).
- `src/main/windows/panel-window.ts` (novo): opções da janela (ADR-0014).
- `src/main/panel/panel-controller.ts` (novo): abrir (posiciona, mostra, foca, avisa `panel:opened`), esconder no `blur` e no Esc, acompanhar a Fai.
- `src/main/tasks/task-service.ts` (novo): aplica as regras do domínio sobre `data.tasks`, grava pelo `DataStore`, pede a comemoração ao concluir.
- `src/main/mascot/`: menu de contexto (`Menu.popup`) e aviso de movimento para o painel acompanhar.
- `src/main/tray/tray-menu.ts`: item "Abrir painel".
- `src/main/os/`: nada (menu, foco e posição se comportam igual nas duas plataformas pela API do Electron; diferenças de foco no Windows ficam para a verificação).
- `src/preload/panel.ts` + `panel-api.ts` (novos): `window.faiPanel` com `tasks.*` e `onOpened`. `src/preload/mascot-api.ts`: `mascot.openMenu()` e `mascot.onReaction()`. As inscrições devolvem uma função para cancelar e nunca repassam o `event`.
- `src/renderer/panel.html` + `src/renderer/src/panel/` (novos): `PanelApp`, formulário, lista, linha com confirmação, seção recolhida; CSS em arquivo (`panel.css`, sem estilo inline), estilo A (lilás e branco).
- `src/renderer/src/Mascot.tsx`: `contextmenu` sobre o desenho → `openMenu()`; `onReaction` → evento `celebrate`.
- `electron.vite.config.mts`: segunda entrada do renderer e do preload.
- `tools/art/build-sprites.py`: quadros únicos, entradas apontando para retângulos compartilhados, animação `celebrate`; máscaras por entrada (o carregador reaproveita por retângulo).

## Segurança

- **IPC:** sete canais novos, todos com schema zod estrito e remetente verificado **por janela**; o painel só recebe `faiPanel` (tarefas e aviso de abertura), a mascote só o dela. Nada de `ipcRenderer` exposto, e as inscrições não repassam o `event`.
- **CSP:** a mesma política para `panel.html` (o plugin do Vite preenche todas as páginas). Nenhuma fonte, imagem ou conexão externa; a fonte do painel é a do sistema.
- **Janela nova:** as mesmas `webPreferences` seguras (`contextIsolation`, `sandbox`, sem `nodeIntegration`), navegação e `window.open` bloqueados pelo endurecimento global.
- **Dados:** o título passa por limite no contrato (≤ 1000) e pela regra do domínio (1 a 200); o main é a fonte da verdade.

## Dependências novas

Nenhuma. `crypto.randomUUID()` é do Node; React e zod já existem.

## ADRs

- **ADR-0014 (novo):** janela do painel, foco e fechamento, posição, menu de contexto nativo, página e preload próprios, remetente por janela, estilo.
- **ADR-0015 (novo):** tarefas no documento v2, regras e migração.
- **ADR-0013:** nota sobre quadros que compartilham o mesmo retângulo da folha (sem mudar a decisão).
- **`product.md`:** direção visual do painel (pastel, lilás e branco).
- **`architecture.md`:** tabela de canais revista (`panel:opened` novo; `data:changed` adiado); atualizada na tarefa de documentação.

## Estratégia de testes

- **Automatizados:**
  - Domínio de tarefas: título com _trim_, vazio, só espaços, 200 e 201 caracteres (com emoji contando 1); criar põe `createdAt`; concluir/reabrir gravam e limpam `completedAt`; excluir e alterar ID inexistente devolvem `NOT_FOUND` sem mudar a lista; ordem do painel (CA5, CA7, CA10).
  - Migração: v1 real vira v2 com `tasks: []` e a mesma posição; ida e volta de um documento v2 com tarefas pelo `DataStore` em diretório temporário; v1 inválido continua em quarentena (CA13).
  - Posição do painel: à esquerda; à direita quando não cabe; preso às bordas e à barra de tarefas; Fai em cada canto (CA3).
  - Animação: `celebrate` interrompe `idle` e `reacting`, é ignorado no arrasto, volta ao `idle` no fim.
  - Contrato e registro IPC: schemas aceitam o válido e recusam extras; cada canal só aceita a janela dona; erros de regra chegam com código e mensagem (CA16).
  - Preloads: cada um expõe exatamente a sua API; `onReaction`/`onOpened` não repassam o `event` e cancelam a inscrição.
  - Controle do painel no main (com _fakes_): abre posicionado e focado, avisa `panel:opened`, esconde no `blur` e no Esc, acompanha o movimento da Fai.
  - Componentes do painel (RTL): criar (Enter, mensagem de erro), nova no topo, concluir, reabrir, confirmação de exclusão (Sim e Não), seção recolhida com contagem, foco no campo ao abrir, rótulos acessíveis (CA6, CA9, CA11, CA14 parcial, CA15).
  - Mutações nas regras centrais (limite de 200, `NOT_FOUND`, ordem, guarda por janela).
- **Roteiro automatizado com o app construído** (`/spec:verify`): `npm run check` e `npm run build`; abrir com um `fai-data.json` v1 e conferir a migração no arquivo; criar, concluir, reabrir e excluir pelo painel e conferir o arquivo depois de cada passo; reiniciar e conferir as tarefas (CA12); medir a posição do painel em relação à Fai com `xwininfo` (Linux) em cada canto; CPU e memória com `tools/measure/` com o painel aberto e fechado.
- **Manual:** abrir pelo clique direito e pela bandeja (CA1); teclado (CA2); fechar ao clicar fora e com Esc (CA4); comemoração (CA8); visual e contraste (CA14); painel acompanhando o arrasto; tudo também no Windows.

## Riscos

| Risco                                                                                                                     | Mitigação                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No Windows, `Menu.popup` a partir de uma janela `focusable: false` ou o foco do painel se comportam diferente do Linux.   | Conferir cedo no Windows (passo do roteiro manual); se o menu não abrir, chamar `popup` sem `window` ou focar a mascote só durante o menu (com ADR).                     |
| O processo de GPU do Electron caiu no protótipo do Linux (janelas transparentes deixaram de desenhar).                    | Fora do escopo desta feature; registrar como pendência geral: observar `child-process-gone` (tipo `GPU`) no main, registrar no log e, se repetir, recarregar as janelas. |
| Janela do painel transparente com sombra e cantos arredondados mal desenhados sem compositor (Linux).                     | Mesma premissa da mascote (compositor ativo, ADR-0004); a sombra fica dentro da janela, com margem.                                                                      |
| Contraste dos tons pastel abaixo de 4,5:1 (texto branco em lilás claro, texto riscado das concluídas).                    | Medir cada par de cores na implementação; escurecer o texto dos botões e o riscado até passar.                                                                           |
| Painel acompanhando a Fai faz muitos `setBounds` durante o arrasto.                                                       | No máximo um por `move` (o renderer já limita a um por quadro); só quando o painel está visível.                                                                         |
| O painel abre em `panel.html`, mas o verificador de URL só conhecia `index.html`; erro ali bloqueia todo o IPC do painel. | Teste do verificador com as duas páginas e com uma terceira recusada.                                                                                                    |
