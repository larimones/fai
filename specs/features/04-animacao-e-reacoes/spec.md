# Feature 04 — Animação e reações

- **Etapa:** 4 (Animação e reações)
- **Status:** planejada
- **Requisitos:** RF-08, RF-09, RNF-08

## Objetivo

Hoje a Fai é uma imagem parada. Ela deve parecer viva sem atrapalhar: em repouso, bate as asas e pisca sorrindo, como no GIF que a dona do projeto animou. Quando recebe um clique, reage e depois volta ao repouso. Quando é arrastada, mostra que está sendo carregada. Tudo isso continua leve: a animação não pode pesar no computador e para quando a Fai está oculta.

## Escopo

- Animação de repouso (`idle`) em loop a partir de `resources/art/fai-idle-flap-source.gif`: 8 quadros de 160 ms (ciclo de 1,28 s), com o fundo branco removido e os traços de movimento e brilhos mantidos.
- Reação ao clique (`react`): toca uma vez e volta ao repouso. Clique durante a reação não empilha outra.
- Animação de "sendo carregada" (`dragged`) durante o arrasto, voltando ao repouso ao soltar.
- Arte provisória para `react` e `dragged`, montada com quadros do próprio GIF. As animações são identificadas por nome, para que a arte definitiva da dona do projeto substitua a provisória sem mudar código.
- O _hit-test_ (cliques atravessando o vazio, RF-05) acompanha o quadro que está na tela.
- Desenho nítido nas escalas 100%, 125% e 150% do Windows.
- Animação pausada enquanto a Fai está oculta.
- Medição de CPU e memória com a Fai em repouso.

## Fora de escopo

- Animação de comemoração (`celebrate`): entra na Etapa 5, junto com o que a dispara (concluir uma tarefa). Decisão de 2026-11-05.
- Animação ao passar o cursor (`hover`): opcional no ADR-0005, não pedida.
- Arte definitiva de `react` e `dragged`: chega da dona do projeto quando estiver pronta, sem bloquear a etapa.
- Sombra no chão (ver notas da feature 03).
- Ciclo de sono, casinha de cogumelo, várias interações por clique e skins (backlog).
- Menu de contexto e painel (Etapa 5).

## Critérios de aceitação

- CA1 [manual] RF-08 CA1: em repouso, a Fai executa o `idle` em loop, sem serrilhado nem borrão perceptível em escala 100%, 125% e 150% do Windows.
- CA2 [auto] RF-08 CA2: a máquina de estados retorna o quadro correto para um instante dado, conforme as durações de cada quadro.
- CA3 [manual] RF-09 CA1: um clique na Fai dispara a reação e, ao terminar, ela volta ao `idle`.
- CA4 [manual] RF-09 CA2: durante o arrasto, a Fai exibe a animação de "sendo carregada".
- CA5 [auto] RF-09 CA3: transições `idle → reacting → idle` e `idle → dragging → idle`; clique durante `reacting` não empilha reações.
- CA6 [manual, Windows] RNF-08 CA1: com a Fai em `idle`, uso médio de CPU do app < 3% em 60 s e memória total < 250 MB.
- CA7 [manual] RNF-08 CA2: a animação pausa quando a Fai está oculta.
- CA8 [manual, Windows] RF-05 CA1 e CA2 continuam valendo com a Fai animada: em qualquer quadro, o clique no vazio atravessa e o clique no desenho é recebido, acompanhando o quadro que está na tela. Os traços de movimento são opacos e fazem parte do desenho, então recebem clique (ajuste de 2026-11-06, ver `plan.md`).

## Decisões da dona do projeto

- 2026-11-05: o GIF "Fadinha Encantada em Voo Cintilante" é a animação de repouso, com o ritmo do GIF (loop contínuo, 160 ms por quadro).
- 2026-11-05: os traços de movimento e os brilhos do GIF ficam ao tirar o fundo.
- 2026-11-05: `react` e `dragged` usam arte provisória feita com quadros do GIF; a arte definitiva substitui depois, sem mudar código.
- 2026-11-05: `celebrate` passa para a Etapa 5 (roadmap ajustado).
- 2026-11-06: janela de 188×160 (a Fai mantém a altura e as asas cabem), com contorno branco de adesivo acrescentado à animação.
- 2026-11-06: `react` provisório = piscada sorrindo (quadros 4 a 6, uma vez, 240 ms cada); `dragged` provisório = quadro 1 (asas no alto), fixo.

## Perguntas em aberto

- Nenhuma. As perguntas técnicas foram respondidas no `plan.md` e no ADR-0013.
