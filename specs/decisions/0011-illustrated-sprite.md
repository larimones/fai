# ADR-0011 — A Fai é uma ilustração suave, não pixel art

- **Status:** aceito em 2026-10-26 (substitui as regras de "pixel art nítido" do ADR-0005 e o tamanho de janela do ADR-0004)
- **Data:** 2026-10-26

## Contexto

O plano previa pixel art de 32×32 ampliada ×4. A dona do projeto entregou o primeiro quadro de repouso como uma **ilustração pintada** de 1024×1024 (`resources/art/fai-idle-01-source.webp`), em estilo adesivo, com contorno branco. Reduzida para 32×32, o rosto vira 2 ou 3 pixels borrados; em 64×64 ela é reconhecível, mas perde o traço. Postas lado a lado, a dona do projeto escolheu manter a ilustração como ela é.

## Decisão

1. **Estilo:** a Fai é uma ilustração com bordas suaves (alfa intermediário nas bordas), sem pixel art. A direção visual em `product.md` muda de acordo.
2. **Tamanho na tela:** janela de **160×160 px lógicos** (escolha da dona do projeto, depois de comparar 128 e 160 em tamanho real).
3. **Resolução dos quadros:** **320×320 px**, o dobro do tamanho lógico, para continuar nítida em escala de até 200%. Os quadros são reduzidos a partir do original com um filtro de alta qualidade (Lanczos), fora do app; o original fica em `resources/art/`.
4. **Desenho no canvas:** `imageSmoothingEnabled = true` com `imageSmoothingQuality = 'high'`, sem `image-rendering: pixelated`. O ajuste do _backing store_ pelo `devicePixelRatio` continua na Etapa 4 (roadmap).
5. **Fundo:** a dona do projeto pode entregar os quadros com fundo branco liso. O fundo é removido por preenchimento a partir das bordas da imagem, que para na linha cinza fina em volta do contorno branco de adesivo; o contorno faz parte do desenho e destaca a Fai em qualquer papel de parede.
6. **_Hit-test_:** sem mudança de regra. A máscara de alfa sai do quadro de 320×320 e a escala entre janela e quadro é 0,5; pixels com alfa acima de 128 recebem cliques.

Continuam valendo do ADR-0005: sprite sheet + metadado JSON, canvas 2D, durações por quadro e a máquina de estados. Como os quadros não virão do Aseprite, a folha e o JSON serão montados a partir de PNGs soltos e numerados (decisão detalhada na Etapa 4).

## Consequências

- Cada quadro da animação precisa ser pintado nesse estilo; animações tendem a ter menos quadros que em pixel art.
- Quadros de 320×320 pesam mais que os de 32×32 (dezenas de KB por quadro em PNG); para um único sprite isso é irrelevante.
- RF-08 CA1 deixa de exigir "pixels nítidos" e passa a exigir a Fai sem serrilhado nem borrão perceptível.
