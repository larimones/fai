# Fai ✨

<p align="center">
  <img src="docs/fai-idle.webp" alt="A Fai, uma fadinha de cabelo branco e asas lilás, batendo as asas e piscando sorridente" width="188" height="160">
</p>

Mascote feérica de desktop: uma pequena fada que flutua sobre as janelas, reage a cliques, pode ser arrastada e ajuda com tarefas e lembretes. Feita com Electron, React e TypeScript.

> **Status:** Etapa 6 (lembretes e notificações) verificada no Linux, falta o Windows: lembretes com data e hora numa aba do painel, avisados por notificação e pela Fai, inclusive os perdidos. A Etapa 5 (painel de tarefas) está concluída. Veja [specs/features/06-lembretes-e-notificacoes/tasks.md](specs/features/06-lembretes-e-notificacoes/tasks.md). A Etapa 8 (conversa com a Fai num balão, por um serviço de IA) foi verificada no Linux e falta o Windows; ela veio antes da Etapa 7 por decisão da dona do projeto. Veja [specs/features/07-conversa-com-a-fai/tasks.md](specs/features/07-conversa-com-a-fai/tasks.md). A Etapa 7 (instalador para Windows) tem as tarefas prontas; veja [specs/features/08-empacotamento-windows/tasks.md](specs/features/08-empacotamento-windows/tasks.md).

## Ferramentas necessárias

| Ferramenta                               | Versão                               | Windows                                                                              | Linux                                | Para quê                                       |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------- |
| **Git**                                  | 2.40+                                | [Git for Windows](https://git-scm.com/download/win)                                  | `sudo apt install git`               | Versionamento                                  |
| **nvm** (gerenciador de versões do Node) | —                                    | [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) (`nvm-setup.exe`) | [nvm](https://github.com/nvm-sh/nvm) | Instalar e alternar o Node                     |
| **Node.js**                              | **22 LTS**, ≥ 22.22.2 (ver `.nvmrc`) | via nvm-windows                                                                      | via nvm                              | Runtime de build e testes (Vite exige ≥ 20.19) |
| **npm**                                  | 10+ (vem com o Node 22)              | —                                                                                    | —                                    | Gerenciador de pacotes (ADR-0002)              |
| VS Code (recomendado)                    | atual                                | —                                                                                    | —                                    | Editor; extensões: ESLint, Prettier            |

**Não é necessário** instalar Visual Studio Build Tools nem compiladores C++: o projeto não usa módulos nativos (ADR-0003). Python 3 com Pillow só é preciso para converter arte nova da Fai (`tools/art/`, ADR-0013); rodar o app e os testes não depende dele. O Electron, o electron-vite, o Vite e as demais ferramentas são instalados pelo `npm install`, com versões fixadas no `package-lock.json`.

Arte da Fai: a dona do projeto entrega ilustrações ou GIFs com fundo branco liso, e `tools/art/build-sprites.py` gera a folha de quadros (veja [tools/art/README.md](tools/art/README.md)). Quem preferir pode exportar do Aseprite no formato "JSON (Array)", que o app lê direto.

### Preparar o Windows (uma vez)

```powershell
# 1. Instale Git for Windows e nvm-windows (links acima); abra um novo terminal.
nvm install 22  # se o seu nvm-windows pedir a versão completa: nvm install 22.23.2
nvm use 22
node -v        # deve mostrar v22.22.2 ou mais nova

# 2. Evite conversões de fim de linha (o repositório usa LF; ver .gitattributes)
git config --global core.autocrlf false
```

O nvm-windows não lê o `.nvmrc` automaticamente: use `nvm use 22` ao abrir o terminal.

### Preparar o Linux (uma vez)

```bash
nvm install    # lê o .nvmrc
nvm use
node -v        # deve mostrar v22.x
```

No Linux, a transparência da mascote exige um compositor (padrão no GNOME e no KDE). No Wayland, o app roda sob XWayland: `npm run dev` e `npm run preview` já passam `--ozone-platform=x11` ao Electron (ADR-0004 e ADR-0010).

## Obter o projeto

```bash
git clone https://github.com/larimones/fai.git
cd fai
nvm use 22
npm ci         # instalação limpa a partir do lockfile (baixa também o binário do Electron)
npm run check  # confirma que está tudo certo
npm run dev    # abre a Fai
```

## Comandos

Os scripts são os mesmos no Windows (PowerShell/cmd) e no Linux:

| Comando                           | O que faz                                                                 |
| --------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                     | Abre o app em modo desenvolvimento, com recarga automática                |
| `npm run build`                   | Build de produção em `out/`, sem empacotar                                |
| `npm run preview`                 | Abre o app a partir do build de produção                                  |
| `npm run typecheck`               | Verificação de tipos (TypeScript strict)                                  |
| `npm run lint`                    | ESLint, incluindo as regras de dependência entre camadas                  |
| `npm run format` / `format:check` | Formata / confere a formatação com Prettier                               |
| `npm test` / `test:watch`         | Testes (Vitest), execução única / modo observação                         |
| `npm run check`                   | typecheck + lint + format:check + testes, para rodar antes de cada commit |

## Usando a Fai (por enquanto)

- **A Fai:** aparece no canto inferior direito do monitor principal, por cima das outras janelas, sem moldura e sem botão na barra de tarefas. Ela não rouba o foco de quem está digitando.
- **Arrastar:** segure a Fai com o botão esquerdo e arraste; ela pode ir para qualquer monitor. Ela reabre onde você a deixou. Se aquele monitor não estiver mais conectado, ela volta para o canto do monitor principal.
- **Cliques em volta dela:** no Windows, os cliques no espaço vazio em volta do desenho (entre as asas, por exemplo) passam para o que estiver atrás. No Linux isso não é possível: o retângulo inteiro de 188×160 px bloqueia cliques (ADR-0004).
- **Animação:** em repouso, a Fai bate as asas e pisca sorrindo. Um clique rápido nela faz uma piscada sorridente, e ela volta ao repouso; enquanto é arrastada, fica com as asas paradas no alto. Quando está oculta, a animação para e não gasta processamento. Num lembrete, ela pisca sorrindo três vezes. A reação ao clique, a pose de "sendo carregada", a comemoração e a piscada do lembrete ainda usam arte provisória.
- **Tarefas:** clique com o botão direito sobre o desenho da Fai e escolha "Abrir painel" (ou use "Abrir painel" na bandeja). O painel abre ao lado dela, na aba **Tarefas**, já com o campo pronto para digitar (as setas ← → trocam de aba):
  - escreva a tarefa e aperte Enter (ou clique em **+**); a nova aparece no topo;
  - clique na bolinha para concluir: a Fai comemora, e a tarefa vai para **Concluídas (N)**, que fica recolhida e abre com um clique; lá a bolinha reabre a tarefa;
  - o **✕** pergunta "Excluir esta tarefa?" na própria linha, com **Sim** e **Não**;
  - o painel fecha sozinho quando você clica fora dele, e também com Esc; ele acompanha a Fai se você a arrastar com ele aberto;
  - tudo funciona pelo teclado (Tab, Enter, Espaço, Esc).
- **Lembretes:** na aba **Lembretes** do painel, escreva do que a Fai deve lembrar e escolha quando: um atalho (**em 15 min**, **em 1 h**, **amanhã 9h**) preenche o campo de data e hora, que também dá para ajustar à mão; depois aperte Enter ou **+**.
  - na hora (com até uns 15 s de atraso), aparece uma notificação do sistema com o texto, e a Fai pisca; clicar na notificação abre o painel direto em **Lembretes**;
  - os já avisados vão para **Avisados (N)**, recolhida; dá para excluir pendentes e avisados pelo **✕**, com confirmação na linha;
  - se a Fai estava fechada ou o computador dormindo na hora, o aviso sai assim que ela abre ou o computador acorda, marcado **atrasado**; com mais de 3 atrasados de uma vez, sai uma notificação só: "Você tem N lembretes atrasados";
  - cada lembrete avisa uma vez só, mesmo que a notificação falhe.
- **Conversar com a Fai:** clique com o botão direito sobre ela (ou na bandeja) e escolha "Conversar". Um balão de fala abre perto dela:
  - na primeira vez, ele pede a chave de um serviço de IA (Claude, da Anthropic): crie uma em console.anthropic.com, em "API Keys", e cole no balão. A Fai confere a chave antes de guardar;
  - escreva e aperte Enter: aparece "Fai está pensando…", e a resposta vem aos poucos, em português e em poucas frases; a Fai pisca a cada resposta;
  - **custo:** cada mensagem gasta um pouquinho de crédito da sua conta no serviço (cerca de US$ 0,01 por mensagem curta com o modelo Claude Opus 5.5);
  - **o que sai do computador:** só as mensagens da conversa aberta e as instruções de personalidade da Fai, e só quando você envia. Tarefas, lembretes e o resto ficam no computador;
  - **nada da conversa é gravado:** fechar o balão (clicar fora ou Esc) apaga a conversa, e abrir de novo começa do zero. Com 30 mensagens numa conversa, a Fai pede para descansar; feche e abra o balão para começar outra;
  - sem internet, com a chave errada ou com o serviço fora do ar, ela avisa com carinho e devolve o que você escreveu, para tentar de novo;
  - a chave fica cifrada pelo sistema, num arquivo próprio (`fai-ai-key.bin`, na mesma pasta dos dados). Para trocar ou apagar, use a bandeja. No Linux sem cofre de senhas (libsecret ou KWallet), ela vale só até fechar a Fai.
- **Bandeja do sistema** (área de notificação, perto do relógio): a estrela da Fai. No Windows, se ela não aparecer, clique na setinha **^**; dá para arrastá-la para a barra. Clique esquerdo mostra/oculta a Fai (só no Windows); o botão direito abre o menu com "Mostrar/ocultar Fai", "Abrir painel", "Conversar", "Trocar chave da IA…", "Apagar chave da IA" e "Sair".
- **Fechar:** a Fai não tem botão de fechar; use "Sair" no menu da bandeja. "Mostrar/ocultar Fai" só a esconde, e o app continua rodando.
- **Instância única:** abrir o app de novo não cria outra Fai; se ela estiver oculta, reaparece.

## Seus dados

Tudo fica em um arquivo JSON local (ADR-0003); a única coisa que usa a rede é a conversa com a Fai (veja acima):

| Sistema | Arquivo                                                                     |
| ------- | --------------------------------------------------------------------------- |
| Windows | `%APPDATA%\Fai\fai-data.json` (ex.: `C:\Users\<você>\AppData\Roaming\Fai\`) |
| Linux   | `~/.config/Fai/fai-data.json` (ou `$XDG_CONFIG_HOME/Fai/`)                  |

`npm run dev`, `npm run preview` e o build usam o mesmo arquivo. Ele guarda a posição da Fai, as tarefas e os lembretes (versão 3 do formato; arquivos das versões 1 e 2, de antes das Etapas 5 e 6, são convertidos sozinhos no primeiro início, sem perder nada).

- **Arquivo danificado:** se o arquivo não puder ser lido, a Fai guarda uma cópia como `fai-data.corrupt-<data>.json` na mesma pasta, começa do zero e avisa. A data no nome está em UTC (sufixo `Z`). Se o arquivo existir mas não puder ser lido nem movido (por exemplo, por permissão), a Fai avisa e não salva nada naquela execução, para não sobrescrevê-lo.
- **Começar do zero:** feche a Fai (menu da bandeja → "Sair") e apague ou renomeie o `fai-data.json`. Ele é recriado no próximo início.
- **Cópia de segurança:** com a Fai fechada, copie o `fai-data.json`.
- **Chave da IA:** fica em `fai-ai-key.bin`, na mesma pasta, cifrada pelo sistema; não serve em outro computador nem em outra conta. Apague pela bandeja ("Apagar chave da IA").

## Estrutura

```
src/main/       processo principal: ciclo de vida, janelas, bandeja, IPC, segurança
  os/           integração com o SO (DesktopIntegration: Windows e Linux)
  persistence/  DataStore: leitura, gravação atômica, migração e quarentena do JSON
src/preload/    ponte segura (contextBridge) → window.fai
src/renderer/   interface React
src/shared/     contrato IPC (canais e schemas zod)
src/domain/     regras de negócio puras
tests/          testes de arquitetura
resources/      ícones do app e da bandeja; art/ guarda as ilustrações originais da Fai
tools/art/      script que converte a arte na folha de quadros do app (Python + Pillow)
docs/           imagens da documentação (a Fai do topo deste README, gerada pelo script de arte)
specs/          especificação (fonte da verdade)
```

## Segurança

Toda janela roda com `contextIsolation`, `sandbox` e sem `nodeIntegration`. O renderer só fala com o processo principal pelas funções de `window.fai`, `window.faiPanel` e `window.faiChat`; cada chamada tem o remetente verificado e o payload validado com zod. A CSP bloqueia scripts e conexões externas, e a navegação, as novas janelas e os pedidos de permissão são negados. A conversa com a Fai é feita só pelo processo principal, que é quem guarda a chave ([ADR-0017](specs/decisions/0017-ai-conversation.md)). Detalhes no [ADR-0007](specs/decisions/0007-electron-security-baseline.md).

## Solução de problemas

- **`Cannot read properties of undefined (reading 'isPackaged')` ao rodar `npm run dev`:** a variável de ambiente `ELECTRON_RUN_AS_NODE` está definida (acontece em processos iniciados pelo VS Code). Remova-a: `env -u ELECTRON_RUN_AS_NODE npm run dev` no Linux, ou `Remove-Item Env:ELECTRON_RUN_AS_NODE` no PowerShell.
- **Linux: erro sobre `chrome-sandbox` / "SUID sandbox helper":** algumas distribuições restringem _user namespaces_. No Ubuntu 24.04 desta máquina funcionou sem ajustes. Se acontecer, siga a [documentação do Electron](https://www.electronjs.org/docs/latest/tutorial/sandbox#linux); **nunca** use `--no-sandbox`.
- **Windows: a estrela não aparece na bandeja:** o Windows esconde ícones novos na setinha **^** perto do relógio. Para deixá-la sempre visível, arraste-a para a barra ou ative-a em Configurações → Personalização → Barra de tarefas → Outros ícones da bandeja do sistema.
- **Linux: a estrela não aparece na bandeja:** o ícone exige suporte a AppIndicator/StatusNotifier. No Ubuntu, a extensão "Ubuntu AppIndicators" já vem ativa; em outros GNOME, instale a extensão "AppIndicator and KStatusNotifierItem Support". KDE tem suporte nativo. Sem a bandeja, a Fai funciona, mas não há como fechá-la pela interface: encerre com Ctrl+C no terminal onde rodou `npm run dev`/`npm run preview`.
- **Linux/Wayland: o app fecha sozinho (`exited with signal SIGTRAP`) ao mostrar um aviso:** o Electron está no backend Wayland nativo, em que os diálogos derrubam o processo. Use `npm run dev`/`npm run preview`, que já forçam XWayland, ou rode `electron --ozone-platform=x11 .` (ADR-0010).
- **A notificação de um lembrete não aparece:** confira se o sistema não está em "Não perturbe" (ou "Assistente de foco", no Windows); a Fai pisca e o lembrete vai para "Avisados" mesmo assim. No Windows, antes do instalador (Etapa 7), a notificação pode aparecer com nome genérico ou não aparecer ao rodar pelo `npm run dev`/`preview` (ADR-0016).
- **A Fai pede a chave da IA toda vez que abre:** no Linux, o computador não tem um cofre de senhas (libsecret ou KWallet) e a chave vale só até fechar a Fai; o balão avisa isso. Instale e desbloqueie o cofre do seu ambiente (no Ubuntu, já vem com o GNOME).
- **"Algo deu errado por aqui" na conversa:** tente de novo. Se repetir, o terminal mostra `Fai: a resposta da conversa falhou (unknown: …)` com o tipo do erro (nunca a chave).
- **`Error: Electron uninstall` ou `Electron failed to install correctly`:** o binário do Electron não foi baixado durante o `npm ci` (a pasta `node_modules/electron/dist` não existe). Com o Node 22 ativo (`nvm use`), rode `node node_modules/electron/install.js` e tente de novo.
- **`npm ci` reclama da versão do Node:** rode `nvm use 22` e confira `node -v` (precisa ser ≥ 22.22.2).

## Trabalhando em mais de uma máquina

Todo o contexto do projeto é versionado:

- [CLAUDE.md](CLAUDE.md): regras permanentes (stack, segurança, convenções). O Claude Code o lê automaticamente.
- [specs/](specs/): produto, requisitos, arquitetura, ADRs, roadmap e tarefas. É a fonte da verdade.
- [specs/features/](specs/features/README.md): uma pasta por feature (spec, plano, tarefas, verificação), criadas pelos comandos `/spec:create`, `/spec:plan`, `/spec:tasks`, `/spec:implement` e `/spec:verify` do Claude Code ([ADR-0012](specs/decisions/0012-feature-workflow.md)). O índice diz o que já foi feito e o que vem a seguir.

Ao trocar de máquina: `git pull`, `nvm use 22` e `npm ci` (se o lockfile mudou). Ao terminar: `npm run check`, commit e `git push`.

## Documentação

- [Produto](specs/product.md) · [Requisitos](specs/requirements.md) · [Arquitetura](specs/architecture.md)
- [Decisões (ADRs)](specs/decisions/) · [Roadmap](specs/roadmap.md) · [Backlog](specs/backlog.md)
