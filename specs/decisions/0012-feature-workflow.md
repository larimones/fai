# ADR-0012 — Fluxo SDD por feature e comandos `/spec:*`

- **Status:** aceito em 2026-10-26
- **Data:** 2026-10-24 (rascunho), 2026-10-26 (aceito)

## Contexto

Nas Etapas 1 a 3, o plano de cada etapa ficou num único `specs/tasks.md`, sobrescrito a cada etapa. A dona do projeto quer um fluxo explícito, conduzido por comandos do Claude Code, com fases separadas: descrever a feature, planejar (com perguntas), quebrar em tarefas, implementar e verificar. Ao fim de cada feature, o Claude deve sugerir o próximo passo e apontar pendências e melhorias.

Os comandos precisam funcionar nas duas máquinas (Windows e Linux), então ficam versionados no repositório.

## Decisão

1. **Comandos de projeto** em `.claude/commands/spec/`: `create.md`, `plan.md`, `tasks.md`, `implement.md` e `verify.md`. No Claude Code 2.1.x, um arquivo em subpasta vira `/<pasta>:<arquivo>` (conferido em 2026-10-24 com um comando de sonda: `/spec:probe` resolvia, `/probe` não).
2. **Uma pasta por feature** em `specs/features/NN-slug/`:

   | Arquivo           | Escrito por    | Conteúdo                                                                |
   | ----------------- | -------------- | ----------------------------------------------------------------------- |
   | `spec.md`         | `/spec:create` | O quê e por quê: objetivo, escopo, fora de escopo, requisitos e CAs.    |
   | `plan.md`         | `/spec:plan`   | Como: perguntas e respostas, desenho técnico, arquivos, riscos, testes. |
   | `tasks.md`        | `/spec:tasks`  | Tarefas `TN.MM` no formato das Etapas 1 a 3, mais a seção "Notas".      |
   | `verification.md` | `/spec:verify` | O que foi executado de verdade, resultado de cada CA, pendências.       |

3. **Numeração:** `NN` é sequencial e começa em `04`, porque as Etapas 1 a 3 usaram o formato antigo. Enquanto cada etapa do roadmap for uma feature, a Etapa 4 é a feature `04` e as tarefas são `T4.01`, `T4.02`… (continuação natural de `T3.xx`). Se uma etapa for dividida, as features seguem contando, e cada `spec.md` diz a que etapa pertence.
4. **Requisitos continuam globais** em `specs/requirements.md`. O `spec.md` referencia os RF/RNF existentes e, quando a feature traz requisito novo, ele é acrescentado lá também, com ID novo.
5. **`specs/features/README.md`** é o índice: cada feature com etapa, status e link. Status possíveis: `especificada`, `planejada`, `em implementação`, `em verificação`, `concluída`.
6. **Transição:** o rascunho deste ADR (2026-10-24, como ADR-0010) ficou só numa das máquinas enquanto a Etapa 3 era feita no formato antigo na outra; o número 0010 acabou usado pelo ADR do XWayland, daí o 0012. Ao fechar a Etapa 3, o `specs/tasks.md` foi movido com `git mv` para `specs/features/03-janela-da-mascote/tasks.md` (sem `spec.md`, `plan.md` nem `verification.md`: o plano e as verificações estão no próprio `tasks.md`), e o índice ganhou a linha da feature 03. As Etapas 1 e 2 ficam no histórico do git (commits `054ecc8` e `4da55aa`).

## Consequências

- O `CLAUDE.md` passa a mandar ler o índice de features e o `tasks.md` da feature ativa no início de cada sessão.
- As regras de escopo ficam iguais: a feature precisa estar no roadmap. Itens do backlog só entram com promoção explícita em `requirements.md` e `roadmap.md`.
- `/spec:verify` executa as verificações (check, build, testes da feature, roteiro automatizado com o app construído, testes de mutação dos testes-chave) e registra a saída real. O que só pode ser conferido por uma pessoa vira roteiro manual explícito, sem ser dado como aprovado.
- Os arquivos de `.claude/commands/` são Markdown e passam pelo Prettier, como o resto.
- `.claude/settings.local.json` é pessoal de cada máquina e fica no `.gitignore`.
