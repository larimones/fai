# CLAUDE.md — Fai ✨

Regras permanentes do projeto. Valem para toda sessão de trabalho. Em caso de conflito, **as specs em `specs/` são a fonte da verdade**; este arquivo resume como trabalhar nelas.

## O que é

A Fai é uma mascote feérica de desktop em pixel art (Electron + React + TypeScript). Primeiro alvo de entrega: **Windows**. O Linux deve continuar funcionando em desenvolvimento.

## Processo: Spec-Driven Development

1. Spec primeiro (`specs/requirements.md`, `specs/architecture.md`, ADRs), depois plano (`specs/tasks.md`), depois código.
2. Implemente **somente** a etapa atual do `specs/roadmap.md`. Marque cada tarefa no `tasks.md` ao concluí-la.
3. Se o código divergir da spec, corrija um dos dois **e registre o motivo** (no ADR ou na própria spec).
4. Toda decisão técnica relevante ganha um ADR curto em `specs/decisions/NNNN-titulo.md`.
5. **Não antecipe escopo.** Itens do `specs/backlog.md` estão fora de escopo: nada de implementações nem de abstrações especulativas para eles.
6. Nenhum teste, lint ou verificação de tipos é declarado aprovado sem ter sido executado de verdade.

## Onde estamos

O projeto é desenvolvido em duas máquinas (Linux no trabalho, Windows em casa), sincronizadas pelo git. **No início de cada sessão**, leia `specs/roadmap.md` e `specs/tasks.md` (incluindo a seção "Notas") para saber a etapa atual e o que está pendente. Ao fim, deixe `tasks.md` atualizado para a outra máquina continuar. As ferramentas necessárias estão no `README.md`.

## Stack

- Electron + electron-vite (build/dev), React, TypeScript `strict`.
- npm (lockfile `package-lock.json` versionado). Node 22 LTS (`.nvmrc`).
- Vitest + React Testing Library (jsdom). ESLint (flat config) + typescript-eslint + Prettier.
- zod para validar payloads de IPC e dados persistidos.
- Persistência: arquivo JSON versionado em `userData` (sem módulos nativos).
- **Não adicione dependências sem justificar** (no PR/commit e, se estrutural, em ADR).

## Estrutura de pastas

```
src/
  main/        processo principal: ciclo de vida, janelas, handlers IPC
    os/        integração com o SO, atrás de interface (uma implementação por plataforma)
    persistence/  leitura/escrita do JSON, migrações
  preload/     ponte contextBridge: API pequena, tipada, um preload por tipo de janela
  renderer/    UI React (sem acesso a Node)
  shared/      contrato IPC (nomes de canais + schemas zod), tipos compartilhados
  domain/      regras de negócio puras: sem electron, sem node:*, sem React, sem I/O
specs/         especificação (fonte da verdade)
```

Regra de dependência: `renderer → shared, domain`; `preload → shared`; `main → shared, domain`; `domain → nada`. O domínio recebe tempo e IDs por parâmetro (nada de `Date.now()`/`crypto` escondidos).

## Segurança (inegociável)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` em toda janela. Exceções só com ADR.
- Renderer não acessa sistema de arquivos, shell nem Node. Tudo passa por IPC.
- IPC: apenas canais explícitos e nomeados definidos em `src/shared/ipc`. Todo payload é validado com zod no processo principal; o remetente (frame/janela) é verificado.
- Nunca expor `ipcRenderer` inteiro nem funções genéricas (`invoke(channel, ...)`) ao renderer.
- CSP definida; nenhum conteúdo remoto; navegação e `window.open` bloqueados; permissões negadas por padrão.
- Somente assets locais. Nenhum serviço externo para renderizar a mascote.
- Segredos (ex.: chaves de API futuras) nunca no renderer nem no repositório.

## Multiplataforma

- Toda chamada específica de SO fica em `src/main/os/` atrás de uma interface.
- Scripts do `package.json` sem comandos exclusivos de bash ou PowerShell (`&&` entre comandos é aceito; nada de `rm -rf`, `export`, `set`, `cp`).
- Caminhos sempre com `node:path`; nunca separadores fixos.
- `.gitattributes` força `eol=lf`.

## Comandos

```
npm install          # instala dependências
npm run dev          # app em modo desenvolvimento
npm run build        # build de produção (sem empacotar)
npm run typecheck    # tsc --noEmit (node + web)
npm run lint         # ESLint
npm run format       # Prettier (escrita)
npm test             # Vitest (execução única)
npm run check        # typecheck + lint + test — rodar antes de todo commit
```

## Convenções de código

- Código, identificadores, nomes de arquivos e mensagens de commit em **inglês**. Documentação, specs e textos da UI em **português do Brasil**.
- Arquivos em `kebab-case.ts`; componentes React em `PascalCase.tsx`.
- Testes ao lado do código: `*.test.ts` / `*.test.tsx`.
- Sem `any` (use `unknown` + validação). Sem `// @ts-ignore`.
- Estilos em arquivos CSS (sem atributos `style` inline, por causa da CSP).

## Commits

Conventional Commits em inglês: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, `build:`. Escopo opcional (`feat(ipc): ...`). Citar o ID da tarefa/requisito no corpo quando aplicável (`Refs: T1.09, RNF-03`).
