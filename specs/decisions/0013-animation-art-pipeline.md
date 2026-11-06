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
5. **A folha é importada como data URL** (`?inline`), como o quadro parado da Etapa 3: o _hit-test_ lê o alfa de cada quadro, e uma imagem vinda de `file://` contaminaria o canvas.

## Alternativas consideradas

- **Script em Node** (`sharp`, `gifuct-js`, `pngjs`): mantém tudo em JavaScript, mas `sharp` é módulo nativo e as bibliotecas puras exigiriam reescrever remoção de fundo, contorno e redução de qualidade. Python + Pillow já fez o mesmo trabalho na Etapa 3 e só roda na máquina de quem converte a arte.
- **Converter o GIF no app, em tempo de execução**: sem script, mas cada início faria remoção de fundo e contorno, e o resultado dependeria do navegador.
- **Formato próprio de metadado**: um pouco mais simples, mas perderia a compatibilidade com o Aseprite prevista no ADR-0005.

## Consequências

- Quem converte a arte precisa de Python 3 e Pillow (`pip install Pillow`); o README explica. Rodar o app e os testes continua exigindo só Node.
- A folha embutida aumenta o JavaScript do renderer (estimativa: 1–2 MB em base64). Para um app local isso não pesa; se pesar, as máscaras de alfa podem ir pré-calculadas no JSON e a imagem sair do bundle.
- Trocar a arte provisória pela definitiva é rodar o script de novo com os arquivos novos; o código não muda.
