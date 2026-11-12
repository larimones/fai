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
| 4   | Dê um clique curto sobre o desenho, sem mover o mouse.            | A Fai não se mexe (é um clique, não um arrasto); desde a Etapa 4, ela pisca sorrindo.                                                  |
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

## Etapa 4 — animação e reações (feature 04)

Critérios em `specs/features/04-animacao-e-reacoes/spec.md`. A arte de `react` e `dragged` ainda é provisória: o que se confere é o comportamento, não o desenho definitivo.

| #   | Passo                                                                                                                                                           | Esperado                                                                                                                                        | CA  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 1   | Abra a Fai e observe por 10 s.                                                                                                                                  | Ela bate as asas e pisca sorrindo, em loop, sem tremer nem pular; contorno branco contínuo; as asas não são cortadas nas bordas.                | CA1 |
| 2   | **Windows:** repita o passo 1 com a escala da tela em 100%, 125% e 150%, reiniciando a Fai a cada troca.                                                        | Sem serrilhado nem borrão perceptível nas três escalas.                                                                                         | CA1 |
| 3   | Dê um clique rápido sobre o desenho, sem mover o mouse.                                                                                                         | A Fai pisca sorrindo (um pouco mais devagar que no repouso) e volta a bater as asas.                                                            | CA3 |
| 4   | Clique várias vezes seguidas, rápido.                                                                                                                           | Uma reação só, até o fim; os cliques durante ela não a reiniciam nem empilham.                                                                  | CA3 |
| 5   | Arraste a Fai e segure parada em algum lugar por 3 s; depois solte.                                                                                             | Durante o arrasto, asas paradas no alto; ao soltar, volta a bater as asas. Um arrasto curto (menos de 4 px) conta como clique.                  | CA4 |
| 6   | **Windows:** com a Fai em repouso por 60 s, olhe o Gerenciador de Tarefas (aba Detalhes, processos `electron.exe` da Fai; some CPU e memória de todos).         | CPU média < 3% e memória total < 250 MB. Números exatos: `node tools/measure/measure-fai.mjs --seconds 60` (também no Linux).                   | CA6 |
| 7   | Oculte a Fai pela bandeja e espere 20 s; no Windows, olhe a CPU no Gerenciador de Tarefas; no Linux, use `top` nos processos `electron`. Depois mostre de novo. | Oculta, a CPU fica perto de zero. Ao reaparecer, ela volta animada.                                                                             | CA7 |
| 8   | **Windows:** deixe o cursor parado no espaço vazio entre a asa e o corpo enquanto ela bate as asas, e clique várias vezes em momentos diferentes.               | O clique atravessa quando o vazio está sob o cursor e é recebido pela Fai quando a asa passa por baixo dele; ela nunca fica bloqueando cliques. | CA8 |
| 9   | **Windows:** repita o RF-05 passo 1 da Etapa 3 com a Fai animada.                                                                                               | O clique no vazio continua chegando ao ícone atrás dela.                                                                                        | CA8 |

## Etapa 5 — painel de tarefas (feature 05)

Critérios em `specs/features/05-painel-de-tarefas/spec.md`. A comemoração ainda usa arte provisória (asas rápidas e a piscada sorrindo). Para o teste de migração (passo 1), guarde antes uma cópia do `fai-data.json`.

| #   | Passo                                                                                                                                      | Esperado                                                                                                                                       | CA        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Feche a Fai, ponha no `fai-data.json` um documento v1 (`{ "schemaVersion": 1, "mascot": { "position": { "x": 300, "y": 300 } } }`) e abra. | A Fai abre em `300, 300`, sem aviso; o arquivo passa a ter `"schemaVersion": 2` e `"tasks": []`.                                               | CA13      |
| 2   | Clique com o botão direito sobre o desenho da Fai.                                                                                         | Um menu só com "Abrir painel".                                                                                                                 | CA1       |
| 3   | Clique com o botão direito no espaço vazio dentro do retângulo da Fai (Linux) ou em volta dela (Windows).                                  | Nenhum menu da Fai.                                                                                                                            | CA1       |
| 4   | Escolha "Abrir painel"; depois feche e abra pelo menu da bandeja.                                                                          | O painel abre ao lado da Fai (à esquerda, ou à direita perto da borda esquerda), inteiro na tela, já com o cursor no campo.                    | CA1, CA3  |
| 5   | Arraste a Fai para cada canto do monitor e para o outro monitor, abrindo o painel em cada lugar; arraste também com o painel aberto.       | O painel sempre inteiro na área de trabalho, sem passar por baixo da barra de tarefas, e acompanhando a Fai.                                   | CA3       |
| 6   | Com o painel aberto, clique na área de trabalho; abra de novo e aperte Esc; abra de novo e abra o menu da bandeja.                         | Nos três casos o painel fecha. "Abrir painel" sempre o abre de novo.                                                                           | CA4       |
| 7   | Digite " Regar as plantas " e aperte Enter; depois "Ler" e clique em **+**.                                                                | "Ler" no topo, "Regar as plantas" abaixo (sem os espaços); campo vazio; contagem "2 pendentes".                                                | CA6       |
| 8   | Aperte Enter com o campo vazio; depois cole um texto com mais de 200 caracteres e aperte Enter.                                            | Mensagens "Escreva um título para a tarefa." e "O título pode ter até 200 caracteres."; o texto continua no campo; a mensagem some ao digitar. | CA5       |
| 9   | Clique na bolinha de "Ler".                                                                                                                | A Fai comemora e volta ao repouso; "Ler" vai para "Concluídas (1)", que está recolhida.                                                        | CA8, CA11 |
| 10  | Abra "Concluídas (1)" e clique na bolinha de "Ler"; feche e reabra o painel.                                                               | "Ler" volta para as pendentes, sem comemoração; ao reabrir, "Concluídas" está recolhida.                                                       | CA7, CA11 |
| 11  | Clique no ✕ de uma tarefa e escolha "Não"; depois ✕ de novo e "Sim".                                                                       | Primeiro a linha mostra "Excluir esta tarefa?" e volta ao normal; depois a tarefa some.                                                        | CA9       |
| 12  | Use só o teclado: Tab pelo campo, bolinhas, ✕ e "Concluídas"; Espaço/Enter para acionar; Esc para fechar.                                  | Contorno lilás visível em cada controle; tudo funciona; Esc fecha.                                                                             | CA2, CA14 |
| 13  | Com tarefas pendentes e concluídas, saia pela bandeja ("Sair") e abra a Fai de novo.                                                       | As mesmas tarefas, no mesmo estado.                                                                                                            | CA12      |
| 14  | Olhe o painel com atenção (textos, botões, texto riscado das concluídas).                                                                  | Tudo legível; a interface segue o estilo lilás e branco aprovado.                                                                              | CA14      |
| 15  | **Windows:** repita os passos 2 a 6.                                                                                                       | Mesmo comportamento; em especial, o menu de contexto aparece a partir da Fai (que não recebe foco) e o painel recebe o foco ao abrir.          | CA1, CA4  |
