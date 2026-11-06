# Arte da Fai

`build-sprites.py` transforma a arte original em `resources/art/` na folha de quadros que o app usa (`src/renderer/src/assets/fai-sheet.png` + `fai-sheet.json`). Decisões no [ADR-0013](../../specs/decisions/0013-animation-art-pipeline.md).

## O que ele faz

1. Lê `resources/art/fai-idle-flap-source.gif`.
2. Remove o fundo branco (o branco ligado às bordas da imagem; o branco do cabelo e da roupa fica).
3. Recorta todos os quadros pela mesma caixa, para o desenho não pular.
4. Acrescenta o contorno branco de adesivo.
5. Reduz para 376×320 (o dobro da janela de 188×160), encostado na base.
6. Monta a folha (4 colunas) e o JSON no formato "JSON (Array)" do Aseprite, com uma _tag_ por animação.
7. Grava `fai-sheet.masks.json`: a máscara de clique de cada quadro (alfa acima de 128, o mesmo `HIT_ALPHA_THRESHOLD` de `src/domain/mascot/hit-test.ts`; se um mudar, mude o outro), em sequências de pixels transparentes e clicáveis. O arquivo fica fora do Prettier de propósito: uma linha por quadro.
8. Grava `docs/fai-idle.webp`, a animação de repouso que aparece no topo do README.

As animações, os quadros do GIF que cada uma usa e as durações ficam na lista `ANIMATIONS`, no topo do script. `react` e `dragged` são provisórias até a arte definitiva chegar.

## Como rodar

Só é preciso quando a arte muda. O app e os testes não dependem do Python.

```bash
# uma vez: Python 3 e Pillow
pip install Pillow

# na raiz do repositório
python3 tools/art/build-sprites.py --preview-dir <pasta fora do repositório>
```

No Windows, use `py` no lugar de `python3`. O `--preview-dir` grava cada animação como WebP animado, sobre fundo escuro e claro, no tamanho da janela; abra no navegador para aprovar antes de commitar.

A saída é determinística: rodar duas vezes com a mesma arte gera os mesmos arquivos. Depois de rodar, `npm run check` confere a folha nova (o teste do metadado lê o JSON real).
