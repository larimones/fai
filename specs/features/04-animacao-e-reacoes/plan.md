# Plano — Feature 04: Animação e reações

## Perguntas e respostas

| Pergunta                                                                  | Resposta                                                                                            | Data       |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| O GIF é mais largo que alto (415×355 de desenho). Qual tamanho de janela? | **188×160**: a Fai mantém a altura de hoje e as asas cabem (comparado com 160×160 em tamanho real). | 2026-11-06 |
| Acrescentar o contorno branco de adesivo à animação?                      | **Sim**, feito pelo script, igual em todos os quadros (comparado sobre fundo claro).                | 2026-11-06 |
| Reação provisória ao clique                                               | **Piscada sorrindo**: quadros 4 a 6 do GIF, uma vez, 240 ms cada (mais lenta que no repouso).       | 2026-11-06 |
| Animação provisória de "sendo carregada"                                  | **Asas paradas no alto**: quadro 1 do GIF, fixo.                                                    | 2026-11-06 |
| Ritmo do repouso, traços de movimento, `celebrate`, arte provisória       | Respondidas no `/spec:create` (ver `spec.md`).                                                      | 2026-11-05 |

## Desenho

```
tools/art/build-sprites.py  (à mão, quando a arte muda)
  GIF ──► sem fundo ──► recorte comum ──► contorno ──► 376×320 ──► fai-sheet.png + fai-sheet.json (Aseprite)
                                                                    └─ versionados em src/renderer/src/assets/

Renderer (janela da mascote)
  MascotApp ── carrega folha (data URL) + JSON (zod) ──► SpriteSheet { quadros, máscaras, animações }
     │
     ├─ AnimationPlayer (domínio, puro)       estado: idle | reacting | dragging
     │     event('click') ─► reacting ──fim──► idle
     │     event('dragStart') ─► dragging ── event('dragEnd') ─► idle
     │     frameAt(agora) ─► índice do quadro + quando muda de novo
     │
     ├─ Mascot (canvas)  desenha o quadro atual; temporizador até a próxima troca (não usa rAF a 60 fps);
     │                   backing store = 188×160 × devicePixelRatio; para quando document.hidden
     │
     └─ PointerController  hit-test com a máscara DO QUADRO ATUAL; reavalia ao trocar de quadro;
                           press/move/release ─► IPC (já existe) + gestos para o AnimationPlayer
                           (clique = soltou com deslocamento < 4 px, medido em screenX/screenY)

Main: muda só o tamanho da janela (188×160). Nenhum canal IPC novo.
```

**Estados** (RF-09 CA3): `idle` (repete), `reacting` (toca `react` uma vez e volta a `idle`; clique durante a reação é ignorado), `dragging` (repete `dragged`; ao soltar volta a `idle`). Um arrasto que começa durante a reação interrompe a reação. O relógio é passado por parâmetro (`now`), como manda a regra do domínio.

**Clique ou arrasto no renderer:** o main já decide isso para a posição (`endDrag`), mas o renderer precisa saber na hora para trocar a animação. Ele mede o deslocamento com `screenX/screenY` dos eventos de ponteiro e usa o mesmo `DRAG_THRESHOLD_PX` do domínio. As coordenadas são do próprio renderer, mas aqui só a distância importa, não a posição. Assim não há canal IPC novo.

**Hit-test animado (CA8):** cada quadro tem sua máscara de alfa, calculada uma vez ao carregar. Quando o quadro troca com o cursor parado (a asa passa por baixo dele), o controle de ponteiro reavalia com o último ponto conhecido. Os traços de movimento são opacos e fazem parte do desenho, então recebem clique (são pequenos); o CA8 da spec foi ajustado.

**Desempenho (RNF-08):** o repouso troca de quadro a cada 160 ms. Em vez de `requestAnimationFrame` a 60 fps, um `setTimeout` agenda o próximo desenho para quando o quadro muda (cerca de 6 desenhos por segundo).

**Pausa (RNF-08 CA2):** com `backgroundThrottling` ligado (padrão), ocultar a janela deixa `document.hidden` verdadeiro (documentação do Electron 44: "This also affects the Page Visibility API"). O renderer escuta `visibilitychange`, cancela o temporizador e retoma ao reaparecer, recomeçando o `idle`.

**Nitidez com DPR:** o canvas tem tamanho CSS 188×160 e _backing store_ `round(188 × dpr) × round(160 × dpr)`; o desenho usa `setTransform(dpr)`. Uma consulta `matchMedia('(resolution: Xdppx)')` avisa quando a escala muda (monitor com outra escala) e o canvas é refeito.

## Mudanças por camada

- `src/domain/mascot/dimensions.ts`: janela 188×160; quadro 376×320 (`FRAME_SIZE` vira largura e altura); `FRAME_TO_WINDOW_SCALE` continua 0,5.
- `src/domain/mascot/animation.ts` (novo): tipos `SpriteAnimation` (`frames: { index, durationMs }[]`, `loop`), `frameAt(animation, elapsedMs)` (índice + ms até a próxima troca; animação sem repetição termina no último quadro e informa que acabou) e a máquina de estados `AnimationState` com `start(now)`, `handle(event, now)` e `current(now)`.
- `src/domain/mascot/sprite-sheet.ts` (novo): converte o metadado já validado (formato Aseprite) em animações por nome; erro tratado se faltar `idle`, `react` ou `dragged` ou se um `from`/`to` apontar para fora.
- `src/shared/sprite-sheet-schema.ts` (novo): schema zod do "JSON (Array)" do Aseprite (só os campos usados; os demais são ignorados, porque o Aseprite exporta muitos).
- `src/shared/ipc/…`: **nenhum canal novo**.
- `src/main/windows/mascot-window.ts`: nada além do tamanho, que vem de `MASCOT_WINDOW_SIZE`. Posições salvas continuam válidas (`resolveMascotPosition` usa o tamanho atual).
- `src/main/os/…`, `src/main/persistence/…`: nada; o documento JSON não muda.
- `src/preload/…`: nada.
- `src/renderer/src/mascot/load-sprite-sheet.ts` (substitui `load-frame.ts`): decodifica a folha, recorta e guarda cada quadro, calcula as máscaras e valida o JSON.
- `src/renderer/src/mascot/pointer-controller.ts`: máscara do quadro atual por função (`getMask()`), `refresh()` ao trocar de quadro, gestos `click`/`dragStart`/`dragEnd` para quem anima.
- `src/renderer/src/Mascot.tsx`: laço de animação por temporizador, DPR, pausa por visibilidade.
- `src/renderer/src/assets/`: `fai-sheet.png` e `fai-sheet.json` gerados; `fai-idle.png` sai.
- `tools/art/build-sprites.py` (novo) e `tools/art/README.md` (como rodar).

## Segurança

Nenhum impacto: nenhum canal IPC, permissão ou origem nova. A folha continua local e embutida como data URL, já permitida pela CSP (`img-src 'self' data:`). O JSON da folha é validado com zod mesmo sendo gerado por nós.

## Dependências novas

Nenhuma no `package.json`. O script de arte usa Python 3 + Pillow, só na máquina de quem converte a arte (ADR-0013).

## ADRs

- **ADR-0013 (novo):** pipeline da arte, formato Aseprite, contorno, janela 188×160 e quadros 376×320.
- **ADR-0004:** tamanho da janela passa a 188×160 (remete ao ADR-0013).
- **ADR-0011:** resolução dos quadros passa a 376×320 (remete ao ADR-0013).
- **ADR-0005:** "Animações mínimas do MVP" e o leitor de metadado continuam valendo; nota de que `celebrate` passou para a Etapa 5.

## Estratégia de testes

- **Automatizados:**
  - `frameAt`: quadro certo em cada instante, inclusive nas bordas das durações; loop; animação de uma vez termina e informa o fim; tempo até a próxima troca (RF-08 CA2).
  - Máquina de estados: `idle → reacting → idle` ao fim da reação; `idle → dragging → idle`; clique durante a reação não reinicia nem empilha; arrasto durante a reação vai para `dragging` (RF-09 CA3).
  - Conversão do metadado: folha real do repositório passa no schema e tem `idle` (8 quadros de 160 ms), `react` e `dragged`; metadado sem animação obrigatória, com índice fora do intervalo ou com campo de tipo errado é recusado.
  - Controle de ponteiro: usa a máscara do quadro atual; `refresh()` muda o click-through com o cursor parado; deslocamento < 4 px gera `click`, ≥ 4 px gera `dragStart` e `dragEnd`.
  - `Mascot`/`MascotApp` (RTL, relógio falso): troca de quadro no tempo certo; clique troca para a reação; `visibilitychange` para e retoma o temporizador.
  - Teste de arquitetura: `src/domain/mascot/` continua puro.
  - Mutação: inverter a condição de "clique durante a reação" e trocar `>=` por `>` na borda de duração fazem os testes falharem.
- **Roteiro automatizado com o app construído** (`/spec:verify`): `npm run check` e `npm run build`; abrir a Fai e medir a janela (188×160 com `xwininfo` no Linux, `GetWindowRect` no Windows); medir CPU e memória por 60 s em repouso (`ps`/`pidstat` no Linux, contadores de processo no Windows); ocultar pela bandeja e conferir que o uso de CPU do renderer cai a perto de zero.
- **Manual** (só o que precisa de olhos): animação fluida e nítida em 100/125/150% (Windows); reação ao clique e volta ao repouso; "sendo carregada" durante o arrasto; cliques atravessando o vazio em qualquer quadro (Windows); contorno e traços aprovados pela dona do projeto.

## Riscos

| Risco                                                                                                                          | Mitigação                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GIF com 256 cores e transparência de 1 bit: bordas serrilhadas, halo branco ou manchas brancas fechadas (entre trança e capa). | O contorno branco esconde o halo; o script gera uma prévia sobre fundo escuro e claro para conferir; se houver manchas, tratar regiões brancas fechadas. |
| Folha embutida deixa o JavaScript do renderer pesado (1–2 MB).                                                                 | Aceitável para app local; se o início ficar lento, máscaras pré-calculadas no JSON e imagem fora do bundle (ADR-0013).                                   |
| `document.hidden` não muda ao ocultar a janela no Linux/X11.                                                                   | Conferir no `/spec:verify`; se falhar, o main avisa o renderer por um canal `mascot:visibility` (evento main → renderer), com ADR.                       |
| CPU acima de 3% mesmo com ~6 desenhos por segundo (desenho suavizado de 376×320 com DPR alto).                                 | Medir no `/spec:verify`; se passar do limite, guardar cada quadro já redimensionado para o DPR atual (`ImageBitmap`) e só copiar.                        |
| Hit-test oscilando quando a asa passa sob o cursor parado (liga e desliga o click-through a cada quadro).                      | Só envia `setInteractive` quando o estado muda (já é assim); no pior caso são poucas mensagens por segundo.                                              |
| Janela mais larga muda a posição aparente da Fai salva antes (o canto esquerdo fica no mesmo lugar).                           | Aceitável: a correção de posição só age se ela sair da tela.                                                                                             |
