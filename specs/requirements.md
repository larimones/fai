# Requisitos do MVP

Cada requisito tem critérios de aceitação (CA) verificáveis. A coluna **Etapa** aponta onde ele é entregue (ver `roadmap.md`). "Verificação" indica como o CA é conferido: **[auto]** teste automatizado, **[manual]** roteiro manual documentado, **[script]** comando do `package.json`.

Plataforma de aceite: Windows 10/11 x64. No Linux, os requisitos valem em desenvolvimento, com as limitações registradas no ADR-0004.

## Requisitos funcionais

### RF-01 — Ciclo de vida da aplicação (Etapa 1)
A aplicação inicia, exibe a janela principal e encerra sem deixar processos.
- CA1 [manual] `npm run dev` abre a janela principal em até 10 s no Windows e no Linux.
- CA2 [manual] Fechar a janela principal encerra a aplicação; nenhum processo `electron`/`Fai` permanece (Gerenciador de Tarefas / `ps`).
- CA3 [auto] A UI da janela principal renderiza o nome e a versão da aplicação obtidos via IPC.

### RF-02 — Instância única (Etapa 2)
- CA1 [manual] Abrir o app uma segunda vez não cria nova instância; a instância existente mostra a Fai.

### RF-03 — Ícone na bandeja do sistema (Etapa 2)
Como a mascote não tem moldura nem botão na barra de tarefas, a bandeja é o controle de último recurso.
- CA1 [manual] Há um ícone na bandeja com menu: "Mostrar/ocultar Fai", "Abrir painel", "Sair".
- CA2 [manual] "Sair" encerra a aplicação completamente.

### RF-04 — Mascote transparente e flutuante (Etapa 3)
- CA1 [manual] A Fai aparece em uma janela sem moldura, com fundo transparente, acima das janelas comuns.
- CA2 [manual] A janela da Fai não aparece na barra de tarefas nem no Alt+Tab e não rouba o foco ao surgir.

### RF-05 — Cliques atravessam áreas vazias (Etapa 3)
- CA1 [manual, Windows] Um clique em pixel transparente da janela da Fai chega à janela que está atrás.
- CA2 [manual, Windows] Um clique em pixel visível da Fai é recebido pela Fai.
- CA3 [auto] A função de *hit-test* retorna "interativo" apenas para pixels com alfa acima do limiar definido.

### RF-06 — Arrastar a Fai (Etapa 3)
- CA1 [manual] Pressionar e arrastar a Fai move a janela acompanhando o cursor, sem saltos, inclusive entre monitores.
- CA2 [auto] Um clique curto (deslocamento < 4 px) é tratado como clique, não como arrasto.

### RF-07 — Posição lembrada (Etapa 3)
- CA1 [manual] Após reiniciar, a Fai reaparece na última posição.
- CA2 [auto] Se a posição salva não intersecta nenhum monitor atual, a Fai é reposicionada no canto inferior direito da área de trabalho do monitor principal.

### RF-08 — Animação contínua (Etapa 4)
- CA1 [manual] Em repouso, a Fai executa uma animação *idle* em loop, com pixels nítidos (sem borrão) em escala 100%, 125% e 150% do Windows.
- CA2 [auto] A máquina de estados de animação retorna o quadro correto para um instante dado, conforme as durações do metadado do sprite sheet.

### RF-09 — Reações a cliques (Etapa 4)
- CA1 [manual] Um clique na Fai dispara uma animação de reação e, ao terminar, ela volta ao *idle*.
- CA2 [manual] Durante o arrasto, a Fai exibe a animação de "sendo carregada".
- CA3 [auto] Transições da máquina de estados: `idle → reacting → idle`, `idle → dragging → idle`; clique durante `reacting` não empilha reações.

### RF-10 — Painel (Etapa 5)
- CA1 [manual] O painel abre pelo menu de contexto da Fai (botão direito) e pelo menu da bandeja.
- CA2 [manual] O painel é navegável por teclado (Tab, Enter, Esc fecha).

### RF-11 — Criar tarefa (Etapa 5)
- CA1 [auto] Título é obrigatório, sofre *trim* e tem 1 a 200 caracteres; fora disso, a criação é rejeitada com mensagem.
- CA2 [manual] A tarefa criada aparece no topo da lista "pendentes".

### RF-12 — Concluir e reabrir tarefa (Etapa 5)
- CA1 [auto] Concluir registra `completedAt`; reabrir limpa `completedAt`.
- CA2 [manual] Concluir uma tarefa provoca uma reação de comemoração breve da Fai.

### RF-13 — Excluir tarefa (Etapa 5)
- CA1 [manual] Excluir pede confirmação; confirmada, a tarefa some da lista.
- CA2 [auto] Excluir um ID inexistente retorna erro tratado, sem alterar os dados.

### RF-14 — Criar e excluir lembrete (Etapa 6)
- CA1 [auto] Texto obrigatório (1 a 200 caracteres, *trim*); data/hora obrigatória e no futuro no momento da criação.
- CA2 [manual] Lembretes pendentes aparecem no painel ordenados pela data; é possível excluí-los.

### RF-15 — Notificação local do lembrete (Etapa 6)
- CA1 [manual, Windows] No horário do lembrete (tolerância de 30 s), uma notificação nativa do sistema é exibida com o texto do lembrete; a Fai também reage.
- CA2 [manual] Clicar na notificação abre o painel.
- CA3 [auto] Cada lembrete gera no máximo uma notificação (estado `notifiedAt`).

### RF-16 — Lembretes perdidos (Etapa 6)
- CA1 [auto] Ao iniciar ou ao voltar da suspensão, lembretes vencidos e não notificados são notificados uma única vez, marcados como atrasados.

### RF-17 — Dados sobrevivem ao reinício (Etapas 2, 5 e 6)
- CA1 [manual] Tarefas, lembretes e posição da Fai permanecem após fechar e reabrir o app e após reiniciar o computador.
- CA2 [auto] Ida e volta (salvar → carregar) preserva os dados exatamente.

## Requisitos não funcionais

### RNF-01 — Isolamento do renderer (Etapa 1)
- CA1 [auto] Toda janela é criada com `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` e `webSecurity: true` (teste sobre a fábrica de opções da janela).
- CA2 [manual] No DevTools da janela, `typeof require` e `typeof process` retornam `"undefined"`.

### RNF-02 — Content Security Policy (Etapa 1)
- CA1 [auto/manual] Em produção, a CSP é `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` (ou mais restritiva).
- CA2 [manual] Em desenvolvimento, a única flexibilização é a necessária para o servidor local do Vite (HMR), registrada no ADR-0007.
- CA3 [manual] O console não mostra o aviso "Insecure Content-Security-Policy" do Electron.

### RNF-03 — Contrato IPC restrito e validado (Etapa 1)
- CA1 [auto] O preload expõe somente as funções listadas no contrato; nenhum objeto `ipcRenderer` ou função genérica de canal chega ao renderer.
- CA2 [auto] Payload inválido é rejeitado pelo handler com erro, sem executar a operação.
- CA3 [auto] Chamada vinda de remetente não reconhecido é rejeitada.

### RNF-04 — Sem conteúdo remoto (Etapa 1)
- CA1 [auto/manual] Navegação para fora do app e `window.open` são bloqueados; pedidos de permissão (câmera, geolocalização etc.) são negados.
- CA2 [manual] O app funciona com a rede desligada.

### RNF-05 — Multiplataforma (Etapa 1 em diante)
- CA1 [script] Todos os scripts do `package.json` rodam em `cmd.exe`/PowerShell e em bash/zsh.
- CA2 [revisão] Toda API específica de SO está em `src/main/os/` atrás de interface.
- CA3 [revisão] Nenhum caminho montado com separador fixo.

### RNF-06 — Qualidade de código (Etapa 1)
- CA1 [script] `npm run typecheck` sem erros, com `strict: true`.
- CA2 [script] `npm run lint` sem erros.
- CA3 [script] `npm test` passa; `npm run check` agrega os três.
- CA4 [auto] O domínio não importa `electron`, `node:*`, `react` nem módulos de `main/`, `preload/` e `renderer/` (regra de lint + teste de arquitetura).

### RNF-07 — Integridade dos dados (Etapa 2)
- CA1 [auto] Gravações são atômicas (arquivo temporário + `rename`) e serializadas.
- CA2 [auto] Arquivo corrompido ou com `schemaVersion` desconhecida não derruba o app: é preservado como `*.corrupt-<data>.json` e o app inicia com dados vazios, avisando o usuário.
- CA3 [auto] Migrações levam qualquer versão anterior suportada à versão atual.

### RNF-08 — Discrição e desempenho (Etapa 4)
- CA1 [manual, Windows] Com a Fai em *idle*, uso médio de CPU do app < 3% em 60 s (Gerenciador de Tarefas) e memória total < 250 MB.
- CA2 [manual] A animação pausa quando a Fai está oculta.

### RNF-09 — Testes dos fluxos críticos (Etapas 1 a 6)
- CA1 [auto] Domínio de tarefas, lembretes (agendamento/vencimento), animação e persistência têm testes unitários.
- CA2 [auto] Componentes do painel têm testes com React Testing Library.

### RNF-10 — Legibilidade e acessibilidade do painel (Etapa 5)
- CA1 [manual] Texto com contraste mínimo WCAG AA (4,5:1) sobre o fundo.
- CA2 [manual] Elementos interativos com rótulo acessível e foco visível.

### RNF-11 — Idioma (todas)
- CA1 [revisão] Textos da UI e notificações em português do Brasil.

### RNF-12 — Assets locais e segredos (todas)
- CA1 [revisão] Nenhuma URL remota em código, HTML ou CSS do app.
- CA2 [revisão] Nenhum segredo no repositório ou no renderer.

### RNF-13 — Empacotamento Windows (Etapa 7)
- CA1 [manual] `npm run dist:win` gera um instalador `.exe` que instala, abre a Fai, exibe notificações com o nome "Fai" e desinstala sem deixar o app em execução.
- CA2 [revisão] Electron Fuses de *hardening* aplicadas (ex.: `RunAsNode` desativado), registradas em ADR.

### RNF-14 — Documentação (Etapas 1 e 7)
- CA1 [revisão] O README explica instalação, execução e testes no Windows e no Linux (Etapa 1) e uso e limitações (Etapa 7).
