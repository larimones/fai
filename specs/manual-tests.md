# Testes manuais

Roteiros para os critérios marcados **[manual]** em `requirements.md`. Rode com o build de produção (`npm run build` e depois `npm run preview`), a não ser quando o passo disser outra coisa. Anote o resultado de cada execução na seção "Notas" do `tasks.md` da etapa, com a data, a máquina e o que falhou.

Antes de começar, guarde uma cópia do arquivo de dados (caminho no README, seção "Seus dados") e restaure-a no fim, se quiser voltar ao estado anterior.

No Linux, rode fora do VS Code ou com `env -u ELECTRON_RUN_AS_NODE npm run preview`. Para medir a posição exata da janela no Linux, use `xwininfo -root -tree | grep '"Fai"'`.

## Etapa 3 — janela da mascote (RF-04 a RF-07)

### Preparação

1. Feche a Fai, se estiver aberta (bandeja → "Sair").
2. Apague o `fai-data.json` para começar sem posição salva.
3. Abra a Fai.

### RF-04 — transparente, flutuante e sem foco

| #   | Passo                                                                                                     | Esperado                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Olhe o canto inferior direito do monitor principal.                                                       | A Fai aparece ali, sem moldura e sem caixa em volta: só o desenho, com o contorno branco de adesivo.              |
| 2   | Antes de abrir a Fai, deixe um editor de texto em foco; depois abra a Fai.                                | O cursor de texto continua no editor; a Fai não rouba o foco.                                                     |
| 3   | Arraste outra janela por cima da Fai.                                                                     | A Fai continua por cima.                                                                                          |
| 4   | Olhe a barra de tarefas (Windows) ou o dock (Linux) e use Alt+Tab.                                        | A Fai não tem botão na barra nem aparece no Alt+Tab.                                                              |
| 5   | **Windows:** repita o passo 1 com a escala da tela em 100%, 125% e 150% (Configurações → Sistema → Tela). | A Fai fica nítida nas três escalas, sem serrilhado nem borrão perceptível. Reinicie a Fai a cada troca de escala. |

### RF-05 — cliques atravessando as áreas vazias

| #   | Passo                                                                                                                                                                        | Esperado                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | **Windows:** arraste a Fai para cima de um ícone da área de trabalho, de modo que o ícone fique entre as asas e o corpo. Clique duas vezes no espaço vazio em cima do ícone. | O ícone recebe o clique e abre.                                                                                      |
| 2   | **Windows:** clique sobre o desenho da Fai.                                                                                                                                  | O clique não passa para trás (nada atrás da Fai é ativado).                                                          |
| 3   | **Windows:** passe o cursor devagar do vazio para o desenho e de volta, várias vezes; depois clique no vazio.                                                                | O clique no vazio continua atravessando; a Fai nunca fica "travada" bloqueando cliques.                              |
| 4   | **Linux:** clique no espaço vazio dentro do quadrado da Fai.                                                                                                                 | O clique **não** atravessa (limitação conhecida, ADR-0004): o quadrado inteiro de 160×160 bloqueia cliques no Linux. |

### RF-06 — arrastar

| #   | Passo                                                             | Esperado                                                                                                                               |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pressione o botão esquerdo sobre o desenho e arraste devagar.     | A Fai acompanha o cursor, mantendo o ponto onde foi segurada, sem saltos.                                                              |
| 2   | Arraste rápido em círculos.                                       | A Fai acompanha sem ficar para trás de forma perceptível.                                                                              |
| 3   | Com dois monitores, leve a Fai de um para o outro e volte.        | Ela passa de monitor sem saltos e sem mudar de tamanho. **Windows:** repita com os monitores em escalas diferentes (ex.: 100% e 150%). |
| 4   | Dê um clique curto sobre o desenho, sem mover o mouse.            | A Fai não se mexe (é um clique, não um arrasto; a reação ao clique chega na Etapa 4).                                                  |
| 5   | Pressione o botão **direito** sobre o desenho e arraste.          | A Fai não se mexe.                                                                                                                     |
| 6   | Tente arrastar segurando no espaço vazio entre as asas e o corpo. | Windows: o arrasto não começa (o clique atravessa). Linux: o arrasto também não começa.                                                |

### RF-07 — posição lembrada

| #   | Passo                                                                                                                       | Esperado                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Arraste a Fai para um lugar fácil de reconhecer e solte **ainda em movimento**. Feche pela bandeja ("Sair") e abra de novo. | Ela reabre exatamente onde foi solta.                                  |
| 2   | Com dois monitores, deixe a Fai no monitor secundário, feche, e reabra.                                                     | Ela reabre no monitor secundário.                                      |
| 3   | Com a Fai no monitor secundário e o app aberto, desconecte esse monitor (ou desative-o nas configurações de tela).          | A Fai vai para o canto inferior direito do monitor principal.          |
| 4   | Feche a Fai, edite o `fai-data.json` e ponha `"position": { "x": 6000, "y": 3000 }`. Abra a Fai.                            | Ela aparece no canto inferior direito do monitor principal, sem aviso. |

### Bandeja, instância única e encerramento (RF-01 a RF-03 com a mascote)

| #   | Passo                                                                                                                       | Esperado                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Bandeja → "Mostrar/ocultar Fai", duas vezes.                                                                                | A Fai some e volta, no mesmo lugar e sem roubar o foco. No Windows, o clique esquerdo na estrela faz o mesmo. |
| 2   | Com a Fai oculta, abra o app de novo (`npx electron .` em outro terminal; no Linux, `npx electron --ozone-platform=x11 .`). | O segundo processo termina sozinho e a Fai reaparece.                                                         |
| 3   | Bandeja → "Sair".                                                                                                           | A Fai e a estrela somem; nenhum processo `electron` fica (Gerenciador de Tarefas ou `ps`).                    |
