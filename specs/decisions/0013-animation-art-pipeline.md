# ADR-0013 — Da arte da dona do projeto para a folha de quadros

- **Status:** aceito em 2026-11-06 (implementação na Etapa 4; ajusta o tamanho da janela do ADR-0004 e a resolução dos quadros do ADR-0011)
- **Data:** 2026-11-06

## Contexto

A animação de repouso chegou como GIF (`resources/art/fai-idle-flap-source.gif`): 8 quadros de 160 ms, 438×390, fundo branco, sem o contorno branco de adesivo da ilustração parada. Somando todos os quadros, o desenho ocupa 415×355 px, mais largo que alto por causa das asas. Os quadros não vêm do Aseprite, e a dona do projeto vai mandar mais arte do mesmo jeito (GIF ou imagens soltas, com fundo branco).

## Decisão

1. **Um script versionado faz a conversão**, `tools/art/build-sprites.py` (Python 3 + Pillow), executado à mão quando a arte muda. A saída (folha PNG + JSON) é versionada. Não entra em `npm run build` nem no app.
   - Para cada quadro: remove o fundo branco por preenchimento a partir das bordas (como no ADR-0011), recorta pela área que todos os quadros ocupam juntos (as asas não "pulam"), acrescenta um **contorno branco** (estilo adesivo, escolha da dona do projeto em 2026-11-06), reduz com Lanczos sobre alfa pré-multiplicado e encaixa encostado na base.
   - O script também monta as animações provisórias `react` e `dragged` a partir de quadros do GIF; a lista de animações e durações fica no topo do script.
2. **Janela de 188×160 px lógicos** (antes 160×160): a Fai mantém a altura de hoje e as asas abertas cabem (escolha da dona do projeto em 2026-11-06). Quadros com o dobro da resolução: **376×320**.
3. **Formato: o "JSON (Array)" do Aseprite** (`frames[]` com `frame` e `duration`; `meta.frameTags[]` com `name`, `from`, `to`), como o ADR-0005 previa. Se um dia a dona do projeto usar o Aseprite, a exportação dele serve direto. Quadros reaproveitados com outra duração (a piscada do `react` é mais lenta que no `idle`) são repetidos na folha. Se a animação repete ou toca uma vez fica no código, por nome (`idle` e `dragged` repetem; `react` toca uma vez).
4. **O JSON é validado com zod** ao carregar (schema em `src/shared/`), como todo dado que vem de fora do código.
5. **Máscaras de clique prontas e folha como arquivo comum** (ajuste de 2026-11-06, T4.11): o script grava também `fai-sheet.masks.json`, com a máscara de cada quadro em sequências de pixels transparentes e clicáveis (alfa acima de 128, o mesmo limiar do _hit-test_). O app lê as máscaras do JSON e importa a folha como arquivo (`img-src 'self'`), sem `getImageData`, então ela não precisa mais ser data URL. A versão anterior embutia a folha como data URL (`?inline`) para poder ler o alfa sem contaminar o canvas.

_Nota de 2026-11-06 (Etapa 5):_ várias entradas de `frames[]` podem apontar para o mesmo retângulo da folha (como a opção _merge duplicates_ do Aseprite exporta). O script grava cada desenho uma vez só e as animações (`react`, `dragged`, `celebrate`) reaproveitam os retângulos com as durações delas; o carregador reaproveita imagem e máscara por retângulo.

## Alternativas consideradas

- **Script em Node** (`sharp`, `gifuct-js`, `pngjs`): mantém tudo em JavaScript, mas `sharp` é módulo nativo e as bibliotecas puras exigiriam reescrever remoção de fundo, contorno e redução de qualidade. Python + Pillow já fez o mesmo trabalho na Etapa 3 e só roda na máquina de quem converte a arte.
- **Converter o GIF no app, em tempo de execução**: sem script, mas cada início faria remoção de fundo e contorno, e o resultado dependeria do navegador.
- **Formato próprio de metadado**: um pouco mais simples, mas perderia a compatibilidade com o Aseprite prevista no ADR-0005.

## Consequências

- Quem converte a arte precisa de Python 3 e Pillow (`pip install Pillow`); o README explica. Rodar o app e os testes continua exigindo só Node.
- Com a folha embutida, o JavaScript do renderer tinha 3,27 MB; com a folha como arquivo e as máscaras prontas (47 KB), caiu para 0,83 MB e a memória privada em repouso de 140 para 128 MB (Linux, `tools/measure/`). O tempo até a janela aparecer não mudou (~700 ms). O limiar do _hit-test_ existe em dois lugares (`hit-test.ts` e o script); o app recusa máscaras feitas com outro limiar.
- Trocar a arte provisória pela definitiva é rodar o script de novo com os arquivos novos; o código não muda.
