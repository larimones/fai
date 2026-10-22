# Fai ✨

Mascote feérica de desktop em pixel art: uma pequena fada que flutua sobre as janelas, reage a cliques, pode ser arrastada e ajuda com tarefas e lembretes. Feita com Electron, React e TypeScript.

> **Status:** Fase de especificação concluída. A Etapa 1 (fundação executável) ainda não foi implementada, então os comandos `npm` abaixo passam a funcionar a partir dela. Veja [specs/roadmap.md](specs/roadmap.md) e [specs/tasks.md](specs/tasks.md).

## Ferramentas necessárias

| Ferramenta | Versão | Windows | Linux | Para quê |
|---|---|---|---|---|
| **Git** | 2.40+ | [Git for Windows](https://git-scm.com/download/win) | `sudo apt install git` | Versionamento |
| **nvm** (gerenciador de versões do Node) | — | [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) (`nvm-setup.exe`) | [nvm](https://github.com/nvm-sh/nvm) | Instalar e alternar o Node |
| **Node.js** | **22 LTS** (ver `.nvmrc`) | via nvm-windows | via nvm | Runtime de build e testes (Vite exige ≥ 20.19) |
| **npm** | 10+ (vem com o Node 22) | — | — | Gerenciador de pacotes (ADR-0002) |
| VS Code (recomendado) | atual | — | — | Editor; extensões: ESLint, Prettier |

**Não é necessário** instalar Python, Visual Studio Build Tools nem compiladores C++: o projeto não usa módulos nativos (ADR-0003). O Electron, o electron-vite, o Vite e as demais ferramentas são instalados pelo `npm install`, com versões fixadas no `package-lock.json`.

Ferramentas opcionais para a arte (a partir da Etapa 4, ADR-0005): LibreSprite ou Piskel (gratuitos), ou Aseprite.

### Preparar o Windows (uma vez)

```powershell
# 1. Instale Git for Windows e nvm-windows (links acima); abra um novo terminal.
nvm install 22
nvm use 22
node -v        # deve mostrar v22.x

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

No Linux, a transparência da mascote exige um compositor (padrão no GNOME e no KDE). No Wayland, rode o app sob XWayland (detalhes no ADR-0004).

## Obter o projeto

```bash
git clone https://github.com/larimones/fai.git
cd fai
nvm use 22
npm ci         # instalação limpa a partir do lockfile (disponível a partir da Etapa 1)
```

## Comandos (a partir da Etapa 1)

Os scripts são os mesmos no Windows (PowerShell/cmd) e no Linux:

| Comando | O que faz |
|---|---|
| `npm run dev` | Abre o app em modo desenvolvimento (HMR) |
| `npm run build` | Build de produção, sem empacotar |
| `npm run typecheck` | Verificação de tipos (TypeScript strict) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Testes (Vitest) |
| `npm run check` | typecheck + lint + testes, para rodar antes de cada commit |

## Trabalhando em mais de uma máquina

Todo o contexto do projeto é versionado:

- [CLAUDE.md](CLAUDE.md): regras permanentes (stack, segurança, convenções). O Claude Code o lê automaticamente.
- [specs/](specs/): produto, requisitos, arquitetura, ADRs, roadmap e tarefas. É a fonte da verdade.
- [specs/tasks.md](specs/tasks.md): o que já foi feito e o que vem a seguir.

Ao trocar de máquina: `git pull`, `nvm use 22` e `npm ci` (se o lockfile mudou). Ao terminar: `npm run check`, commit e `git push`.

## Documentação

- [Produto](specs/product.md) · [Requisitos](specs/requirements.md) · [Arquitetura](specs/architecture.md)
- [Decisões (ADRs)](specs/decisions/) · [Roadmap](specs/roadmap.md) · [Backlog](specs/backlog.md)
