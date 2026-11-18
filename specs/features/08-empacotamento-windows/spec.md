# Feature 08 — Empacotamento para Windows

- **Etapa:** 7 (Empacotamento e fechamento do MVP)
- **Status:** especificada
- **Requisitos:** RNF-13, RNF-14; fecha a "Definição de pronto do MVP" (`roadmap.md`)

## Objetivo

Hoje a Fai só roda pelo terminal, com `npm run dev` ou `npm run preview`. A dona do projeto quer instalá-la no Windows como um app de verdade: um instalador que ela abre com dois cliques, um atalho para chamar a Fai, as notificações com o nome "Fai" e a estrela dela, e a tranquilidade de que desinstalar não leva embora as tarefas, os lembretes e a chave da IA. Esta etapa também fecha o MVP: revisão de segurança do app empacotado, README de uso e limitações, e a conferência da definição de pronto.

## Escopo

- `npm run dist:win` gera um instalador `.exe` para Windows.
- Instalação só para o usuário atual, sem pedir administrador, num assistente curto.
- Atalhos no Menu Iniciar e na área de trabalho; a Fai abre sozinha quando a instalação termina.
- O atalho do Menu Iniciar carrega o mesmo `AppUserModelID` do app (`io.github.larimones.fai`, ADR-0016), para as notificações aparecerem como "Fai".
- Ícone do app, do instalador e dos atalhos: a estrela dourada (`resources/app-icon.png`).
- Desinstalação pelo Windows ("Aplicativos instalados"), que fecha a Fai e não deixa processo rodando; os dados ficam (`fai-data.json`, `fai-ai-key.bin`), e reinstalar devolve tudo.
- Instalador sem assinatura de código: o aviso do SmartScreen na primeira vez é esperado e explicado no README.
- Electron Fuses de proteção aplicadas ao executável (RNF-13 CA2, ADR-0007 item 9).
- Revisão de segurança do app empacotado, contra a linha de base do ADR-0007 e o ADR-0017 (rede só no main).
- README: instalação, uso e limitações (RNF-14 CA1), inclusive o aviso do SmartScreen, onde ficam os dados e como apagá-los à mão.
- Conferência da "Definição de pronto do MVP", item a item, com o que foi verificado em cada máquina.

## Fora de escopo

- Instalador ou pacote para Linux (não objetivo do MVP, `product.md`); Linux continua só em desenvolvimento.
- macOS.
- Assinatura de código e certificado (fica para se a Fai for distribuída).
- Atualização automática.
- Iniciar com o sistema (backlog).
- Loja da Microsoft (MSIX) e instalação para todos os usuários.
- Funcionalidade nova no app.

## Critérios de aceitação

- CA1 [manual, Windows] RNF-13 CA1: `npm run dist:win` gera um instalador `.exe` que instala, abre a Fai, exibe notificações com o nome "Fai" e desinstala sem deixar o app em execução.
- CA2 [manual, Windows] O instalador não pede administrador, instala só para o usuário atual, cria atalhos no Menu Iniciar e na área de trabalho e abre a Fai ao terminar.
- CA3 [manual, Windows] O ícone da estrela aparece no instalador, nos atalhos, em "Aplicativos instalados" e nas notificações.
- CA4 [manual, Windows] Com o aviso do SmartScreen ("O Windows protegeu o computador"), "Mais informações" → "Executar assim mesmo" instala normalmente, como o README descreve.
- CA5 [manual, Windows] Desinstalar mantém `fai-data.json` e `fai-ai-key.bin`; reinstalar devolve tarefas, lembretes, a posição da Fai e a chave da IA (a conversa abre sem pedir a chave).
- CA6 [manual, Windows] No app instalado, os fluxos principais funcionam: a Fai transparente e arrastável, reações, painel com tarefas e lembretes, notificação de lembrete com clique abrindo o painel, conversa com a Fai.
- CA7 [script] RNF-13 CA2: as Electron Fuses do executável estão como o ADR decide (`RunAsNode` desligada, entre outras), conferidas lendo o próprio `.exe`; com `ELECTRON_RUN_AS_NODE=1` no ambiente, a Fai instalada abre normalmente.
- CA8 [revisão] Revisão de segurança do app empacotado registrada: isolamento das janelas, CSP, IPC, navegação e permissões, conteúdo do pacote (sem testes, specs, fontes ou segredos), rede só no main.
- CA9 [revisão] RNF-14 CA1: o README explica instalação, uso e limitações no Windows, inclusive o aviso do SmartScreen e onde ficam os dados.
- CA10 [revisão] A "Definição de pronto do MVP" do `roadmap.md` é conferida item a item, com a evidência (ou a pendência aceita) de cada um.
- CA11 [auto] `npm run check` passa; os scripts novos do `package.json` seguem a regra de multiplataforma (sem comandos exclusivos de um shell).

## Decisões da dona do projeto

- 2026-11-18: instalação **só para o usuário atual, sem administrador**.
- 2026-11-18: **sem assinatura de código**; o aviso do SmartScreen fica explicado no README.
- 2026-11-18: ícone do app é **a estrela dourada** (`resources/app-icon.png`).
- 2026-11-18: desinstalar **mantém os dados**; o README diz onde apagá-los à mão.
- 2026-11-18: atalhos no **Menu Iniciar e na área de trabalho**, e a Fai **abre ao terminar** a instalação.

## Perguntas em aberto

Para o `/spec:plan`:

- Versão do electron-builder e das ferramentas de Fuses (dependências novas, a justificar), e quais Fuses ligar além das do ADR-0007.
- Gerar o instalador no Windows ou também a partir do Linux.
- Número da versão do app no primeiro instalador.
- Como o `fai-ai-key.bin` e o `safeStorage` se comportam no app instalado (a cifra do Windows ainda não foi vista funcionando; ver feature 07).
- Tamanho do instalador e o que entra no pacote (só o `out/` e o necessário de `node_modules`).
- Roteiro de verificação no Windows: o que dá para automatizar (Fuses, conteúdo do pacote) e o que fica manual.
