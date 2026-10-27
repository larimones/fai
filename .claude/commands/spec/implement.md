---
description: 'SDD 4/5: implementa as tarefas da feature, uma por vez, com testes'
argument-hint: '[NN da feature | ID da tarefa, ex.: T4.04] (padrão: próxima tarefa pendente)'
---

Você vai implementar uma feature da Fai seguindo o `tasks.md` dela (ADR-0012). Alvo: `$ARGUMENTS`.

- Vazio: a feature `planejada` ou `em implementação` em `specs/features/README.md`, a partir da primeira tarefa pendente.
- `NN`: essa feature, a partir da primeira tarefa pendente.
- ID de tarefa (`T4.04`): só essa tarefa.

## Antes de começar

1. Leia o `spec.md`, o `plan.md` e o `tasks.md` da feature (inclusive "Notas"), o `CLAUDE.md` e o código que vai mudar.
2. `git status` precisa estar limpo, ou com mudanças que você sabe explicar.
3. Pergunte uma vez, com `AskUserQuestion`, se é para commitar a cada tarefa concluída (recomendado) ou deixar tudo para a dona do projeto revisar. Ela pode ter respondido antes nesta sessão; nesse caso, siga a resposta.
4. Mude o status da feature para `em implementação` (no `spec.md` e no índice).

## Para cada tarefa, em ordem de dependência

1. Escreva primeiro o teste que prova o "Pronto quando" e veja-o falhar pelo motivo certo. Depois escreva o código.
2. Siga as regras do `CLAUDE.md`: camadas, segurança, multiplataforma, sem `any`, sem estilo inline, nomes em inglês, textos da UI em pt-BR. Toda chamada de SO fica em `src/main/os/`, com as duas implementações.
3. Implemente **só** o que a tarefa pede. Se aparecer algo fora do plano:
   - Necessário para a tarefa: faça e registre em "Desvios em relação ao plano".
   - Não necessário: anote em "Pendências" e siga em frente.
   - Muda uma decisão da spec ou do plano: pare e pergunte.
4. Rode `npm run check`. Se for preciso abrir o app, use `env -u ELECTRON_RUN_AS_NODE` (ou remova a variável no PowerShell). Nada é dado como aprovado sem ter sido executado.
5. Para os testes que protegem o comportamento central da tarefa, faça um teste de mutação rápido: quebre a regra no código e confirme que o teste falha. Depois desfaça.
6. Marque a tarefa como `[x]` no `tasks.md` e registre em "Verificações executadas" a máquina, a data, o número de arquivos e testes do `npm run check` e o que foi conferido.
7. Se a resposta foi commitar por tarefa: commit em Conventional Commits, em inglês, com `Refs: TN.MM, RF-xx` no corpo.

Pare e chame a dona do projeto quando: um teste não passar e o motivo não for claro, for preciso instalar uma dependência nova (justifique antes) ou algo só puder ser conferido por uma pessoa olhando a tela. Nesse último caso, descreva o que ela deve ver.

A tarefa "Verificação final" não é feita aqui: ela é o `/spec:verify`.

## Ao terminar

Quando todas as tarefas, menos a verificação final, estiverem `[x]`, mude o status da feature para `em verificação`. Responda com o que foi feito (tarefas, commits, desvios) e termine com:

- **Próximo passo:** `/spec:verify NN`, ou a próxima tarefa, se você parou no meio.
- **Pendências:** o que ficou em "Pendências" no `tasks.md`.
- **Melhorias possíveis:** no máximo 3 (dívida técnica que você notou, testes que valeria reforçar), sem antecipar escopo do backlog.
