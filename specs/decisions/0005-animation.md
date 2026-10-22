# ADR-0005 — Técnica de animação: sprite sheet em canvas 2D

- **Status:** aceito em 2026-10-22 (implementação na Etapa 4)
- **Data:** 2026-10-22

## Conceitos (para quem nunca animou sprites)

- **Quadro (frame):** uma imagem parada da Fai. Animação é trocar quadros rapidamente, como um flipbook.
- **Sprite sheet:** uma única imagem PNG com todos os quadros lado a lado, em grade. Carregar 1 arquivo é mais simples e rápido que carregar 40 PNGs, e garante que todos têm o mesmo tamanho.
- **Metadado:** um JSON que diz onde está cada quadro na folha (`x, y, w, h`), quanto tempo ele dura (`duration` em ms) e quais quadros formam cada animação ("idle" = quadros 0–5, "reação" = 6–11…). Editores de pixel art exportam esse JSON automaticamente.
- **Duração por quadro, não FPS fixo:** em pixel art é comum um quadro ficar mais tempo (ex.: a piscada fica 80 ms, o olho aberto 400 ms). Por isso o tempo vem do metadado.
- **Máquina de estados:** decide _qual_ animação tocar (`idle`, `reacting`, `dragging`, `celebrating`…) e quando voltar ao `idle`. É lógica pura, testável sem tela.

## Alternativas

| Opção                               | Como funciona                                                                             | Prós                                                                                                                                                | Contras                                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GIF/APNG animado                    | `<img src="fai.gif">`                                                                     | Trivial.                                                                                                                                            | Sem controle (não dá para saber quando a animação acabou nem trocar de estado no meio); GIF tem transparência de 1 bit, bordas serrilhadas; difícil sincronizar com cliques.                                         |
| CSS `steps()`                       | `background-position` animado em passos sobre a sprite sheet                              | Simples, declarativo, sem JS de desenho.                                                                                                            | Duração igual para todos os quadros (sem tempos por quadro sem gambiarras); fim de animação só por evento CSS; **não permite hit-test por pixel** (precisaríamos do alfa do pixel para o click-through do ADR-0004). |
| **Canvas 2D + sprite sheet + JSON** | Um laço `requestAnimationFrame` desenha o quadro atual com `drawImage` recortando a folha | Controle total (durações por quadro, eventos de fim, espelhar); alfa por pixel disponível para o hit-test; escala inteira nítida; sem dependências. | Um pouco mais de código (pequeno: ~100 linhas de renderizador).                                                                                                                                                      |
| PixiJS / WebGL / Lottie             | Engine de renderização                                                                    | Efeitos, partículas.                                                                                                                                | Dependência grande para um único sprite; Lottie é vetorial, não pixel art.                                                                                                                                           |

## Decisão

**Sprite sheet PNG + metadado JSON, desenhados em `<canvas>` 2D**, com:

- **Formato do metadado:** exportação "JSON (Array)" com _frame tags_ do Aseprite. LibreSprite (gratuito) e Aseprite (pago, ou compilado do código-fonte) geram esse formato; Piskel (gratuito, no navegador) também serve, com conversão simples. O leitor do formato vive no domínio e é validado.
- **Domínio puro:** `animation-state-machine` (transições) e `frameAt(animation, elapsedMs)` (qual quadro mostrar). Testados sem DOM.
- **Renderer:** laço `requestAnimationFrame` que só redesenha quando o quadro muda; pausa quando a janela está oculta.
- **Hit-test:** `getImageData` do pixel sob o cursor (alfa > limiar).

### Pixel art nítido (regras)

1. Desenhar em tamanho pequeno (sugestão: quadros de **48×48 px**) e ampliar por **fator inteiro** (×3 ou ×4).
2. `ctx.imageSmoothingEnabled = false` e `image-rendering: pixelated` no CSS.
3. Considerar `devicePixelRatio`: com escala 125%/150% do Windows, o tamanho do canvas em pixels físicos deve ser múltiplo do sprite, senão um pixel vira 1,25 pixel e borra. O renderizador calcula o tamanho do _backing store_ a partir do DPR.

### Animações mínimas do MVP

`idle` (loop, com piscada), `hover` (opcional), `react` (clique), `dragged` (sendo carregada), `celebrate` (tarefa concluída / lembrete). Até existir arte final, usamos um _placeholder_ local simples com os mesmos nomes de tags, para que trocar a arte não mude código.

## Consequências

- Nenhuma dependência nova de animação.
- A arte precisa seguir uma convenção de _tags_ — documentada em `assets/README.md` na Etapa 4.
