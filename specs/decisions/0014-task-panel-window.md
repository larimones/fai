# ADR-0014 — Janela do painel de tarefas

- **Status:** aceito em 2026-11-06 (implementação na Etapa 5)
- **Data:** 2026-11-06

## Contexto

A Etapa 5 traz o painel de tarefas: ele abre perto da Fai pelo menu de contexto dela e pela bandeja, fecha sozinho ao perder o foco e precisa de teclado (a janela da mascote nunca recebe foco). Um protótipo descartável no Linux (Electron 44, X11) mostrou: o painel recebe o foco cerca de 12 ms depois de `show()` + `focus()`; o `blur` dispara ao clicar fora; `Menu.popup({ window })` funciona a partir da janela da mascote, mesmo sem foco; clicar na Fai **não** tira o foco do painel; abrir o menu de contexto tira.

## Decisão

1. **Janela própria**, `BrowserWindow` sem moldura, transparente (para os cantos arredondados), 320×440 px lógicos (320×520 a partir da Etapa 6, ADR-0016), `skipTaskbar`, sempre no topo (`'floating'`), `resizable: false`, criada escondida no início e reaproveitada (mostrar e esconder, sem recriar). Ela recebe foco: `show()` + `focus()`.
2. **Fecha** no `blur` e no Esc (tratado no main por `before-input-event`, sem canal IPC). **"Abrir painel" sempre abre** (e foca, se já estiver aberto). Abrir o menu da bandeja ou o da Fai tira o foco do painel, que então fecha; escolher "Abrir painel" em seguida o reabre. Um "Abrir painel" que fechasse o painel aberto não é observável: o menu já o fechou antes do clique (o CA4 da spec foi ajustado).
3. **Posição** calculada por uma função pura do domínio a partir da caixa da Fai e da área de trabalho do monitor dela: à esquerda da Fai (ela mora no canto direito por padrão), senão à direita, alinhado pela base e sempre inteiro dentro da área de trabalho. Enquanto a Fai é arrastada, o painel aberto **acompanha** (decisão da dona do projeto).
4. **Menu de contexto nativo** (`Menu.popup({ window: mascote })`) com um item, "Abrir painel". O renderer da mascote envia `mascot:open-menu` no `contextmenu`, só quando o ponteiro está sobre o desenho (no Linux o retângulo inteiro recebe cliques). O menu tira o foco do painel; escolher "Abrir painel" o reabre.
5. **Página e preload próprios** (princípio do menor privilégio, `architecture.md`): `panel.html` como segunda entrada do renderer, `preload/panel.ts` expondo `window.faiPanel` só com as funções de tarefas e o aviso de abertura. O verificador de URL aceita as duas páginas.
6. **Remetente verificado por janela**: além de URL e quadro principal, cada canal só aceita a janela dona dele (`mascot:*` só a mascote; `tasks:*` só o painel; `app:get-info` as duas).
7. **Estilo** em tons pastel, lilás e branco (escolha da dona do projeto entre duas maquetes), com contraste WCAG AA conferido nos textos e botões.

## Alternativas consideradas

- **Painel dentro da janela da mascote** (janela maior): sem segunda janela, mas a mascote precisaria de foco e de tamanho variável, o que quebra o ADR-0004 (click-through, sem foco, tamanho fixo).
- **Menu de contexto desenhado em HTML**: visual combinando com o painel, mas a janela da mascote é pequena demais para conter o menu e não recebe foco para teclado.
- **Mesma página com rota por _hash_ (`#painel`)**: um build só, mas o painel carregaria o código e a folha de quadros da mascote, e o preload teria de expor as duas APIs.

## Consequências

- O verificador de URL e o `electron.vite.config.mts` passam a conhecer duas páginas.
- No Windows o comportamento de foco e do `Menu.popup` a partir de uma janela `focusable: false` não foi testado; a verificação de lá confere.
- No Linux, o protótipo mostrou uma queda do processo de GPU do Electron (`exit_code=512`) depois de cerca de 10 min com janelas transparentes; depois dela as janelas pararam de desenhar. Fica registrado como risco geral do app no Linux (não é desta feature).
