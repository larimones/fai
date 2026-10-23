# Fai ✨

Mascote feérica de desktop em pixel art: uma pequena fada que flutua sobre as janelas, reage a cliques, pode ser arrastada e ajuda com tarefas e lembretes. Feita com Electron, React e TypeScript.

> **Status:** Etapa 2 (base do aplicativo residente) concluída: instância única, ícone e menu na bandeja e dados salvos localmente. A janela atual é provisória; a mascote chega na Etapa 3. Veja [specs/roadmap.md](specs/roadmap.md) e [specs/tasks.md](specs/tasks.md).

## Ferramentas necessárias

| Ferramenta                               | Versão                               | Windows                                                                              | Linux                                | Para quê                                       |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------- |
| **Git**                                  | 2.40+                                | [Git for Windows](https://git-scm.com/download/win)                                  | `sudo apt install git`               | Versionamento                                  |
| **nvm** (gerenciador de versões do Node) | —                                    | [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) (`nvm-setup.exe`) | [nvm](https://github.com/nvm-sh/nvm) | Instalar e alternar o Node                     |
| **Node.js**                              | **22 LTS**, ≥ 22.22.2 (ver `.nvmrc`) | via nvm-windows                                                                      | via nvm                              | Runtime de build e testes (Vite exige ≥ 20.19) |
| **npm**                                  | 10+ (vem com o Node 22)              | —                                                                                    | —                                    | Gerenciador de pacotes (ADR-0002)              |
| VS Code (recomendado)                    | atual                                | —                                                                                    | —                                    | Editor; extensões: ESLint, Prettier            |

**Não é necessário** instalar Python, Visual Studio Build Tools nem compiladores C++: o projeto não usa módulos nativos (ADR-0003). O Electron, o electron-vite, o Vite e as demais ferramentas são instalados pelo `npm install`, com versões fixadas no `package-lock.json`.

Ferramentas opcionais para a arte (a partir da Etapa 4, ADR-0005): LibreSprite ou Piskel (gratuitos), ou Aseprite.

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

- **Janela:** mostra o nome, a versão e o sistema. Até a Etapa 3 ela faz o papel da mascote. Fechá-la encerra o app.
- **Bandeja do sistema** (área de notificação, perto do relógio): a estrela da Fai. No Windows, se ela não aparecer, clique na setinha **^**; dá para arrastá-la para a barra. Clique esquerdo mostra/oculta a janela (só no Windows); o botão direito abre o menu com "Mostrar/ocultar Fai" e "Sair".
- **Instância única:** abrir o app de novo não cria outra Fai; a janela que já existe volta para a frente.

## Seus dados

Tudo fica em um arquivo JSON local, sem rede (ADR-0003):

| Sistema | Arquivo                                                                     |
| ------- | --------------------------------------------------------------------------- |
| Windows | `%APPDATA%\Fai\fai-data.json` (ex.: `C:\Users\<você>\AppData\Roaming\Fai\`) |
| Linux   | `~/.config/Fai/fai-data.json` (ou `$XDG_CONFIG_HOME/Fai/`)                  |

`npm run dev`, `npm run preview` e o build usam o mesmo arquivo.

- **Arquivo danificado:** se o arquivo não puder ser lido, a Fai guarda uma cópia como `fai-data.corrupt-<data>.json` na mesma pasta, começa do zero e avisa. A data no nome está em UTC (sufixo `Z`). Se o arquivo existir mas não puder ser lido nem movido (por exemplo, por permissão), a Fai avisa e não salva nada naquela execução, para não sobrescrevê-lo.
- **Começar do zero:** feche a Fai (menu da bandeja → "Sair") e apague ou renomeie o `fai-data.json`. Ele é recriado no próximo início.
- **Cópia de segurança:** com a Fai fechada, copie o `fai-data.json`.

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
resources/      ícones do app e da bandeja (e as artes originais)
specs/          especificação (fonte da verdade)
```

## Segurança

Toda janela roda com `contextIsolation`, `sandbox` e sem `nodeIntegration`. O renderer só fala com o processo principal pelas funções de `window.fai`; cada chamada tem o remetente verificado e o payload validado com zod. A CSP bloqueia scripts e conexões externas, e a navegação, as novas janelas e os pedidos de permissão são negados. Detalhes no [ADR-0007](specs/decisions/0007-electron-security-baseline.md).

## Solução de problemas

- **`Cannot read properties of undefined (reading 'isPackaged')` ao rodar `npm run dev`:** a variável de ambiente `ELECTRON_RUN_AS_NODE` está definida (acontece em processos iniciados pelo VS Code). Remova-a: `env -u ELECTRON_RUN_AS_NODE npm run dev` no Linux, ou `Remove-Item Env:ELECTRON_RUN_AS_NODE` no PowerShell.
- **Linux: erro sobre `chrome-sandbox` / "SUID sandbox helper":** algumas distribuições restringem _user namespaces_. No Ubuntu 24.04 desta máquina funcionou sem ajustes. Se acontecer, siga a [documentação do Electron](https://www.electronjs.org/docs/latest/tutorial/sandbox#linux); **nunca** use `--no-sandbox`.
- **Windows: a estrela não aparece na bandeja:** o Windows esconde ícones novos na setinha **^** perto do relógio. Para deixá-la sempre visível, arraste-a para a barra ou ative-a em Configurações → Personalização → Barra de tarefas → Outros ícones da bandeja do sistema.
- **Linux: a estrela não aparece na bandeja:** o ícone exige suporte a AppIndicator/StatusNotifier. No Ubuntu, a extensão "Ubuntu AppIndicators" já vem ativa; em outros GNOME, instale a extensão "AppIndicator and KStatusNotifierItem Support". KDE tem suporte nativo. Sem a bandeja, o app funciona, mas só fecha pela janela.
- **Linux/Wayland: o app fecha sozinho (`exited with signal SIGTRAP`) ao mostrar um aviso:** o Electron está no backend Wayland nativo, em que os diálogos derrubam o processo. Use `npm run dev`/`npm run preview`, que já forçam XWayland, ou rode `electron --ozone-platform=x11 .` (ADR-0010).
- **Linux: `Electron failed to install correctly` ou `Electron uninstall`:** o binário do Electron não foi baixado no `npm ci`. Com o Node 22 ativo (`nvm use`), rode `node node_modules/electron/install.js`.
- **`Error: Electron uninstall` ao rodar `npm run dev`:** o binário do Electron não foi baixado durante o `npm ci` (a pasta `node_modules/electron/dist` não existe). Rode `node node_modules/electron/install.js` para baixá-lo e tente de novo.
- **`npm ci` reclama da versão do Node:** rode `nvm use 22` e confira `node -v` (precisa ser ≥ 22.22.2).

## Trabalhando em mais de uma máquina

Todo o contexto do projeto é versionado:

- [CLAUDE.md](CLAUDE.md): regras permanentes (stack, segurança, convenções). O Claude Code o lê automaticamente.
- [specs/](specs/): produto, requisitos, arquitetura, ADRs, roadmap e tarefas. É a fonte da verdade.
- [specs/tasks.md](specs/tasks.md): o que já foi feito e o que vem a seguir.

Ao trocar de máquina: `git pull`, `nvm use 22` e `npm ci` (se o lockfile mudou). Ao terminar: `npm run check`, commit e `git push`.

## Documentação

- [Produto](specs/product.md) · [Requisitos](specs/requirements.md) · [Arquitetura](specs/architecture.md)
- [Decisões (ADRs)](specs/decisions/) · [Roadmap](specs/roadmap.md) · [Backlog](specs/backlog.md)
