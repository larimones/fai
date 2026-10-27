---
description: 'SDD 3/5: quebra o plano em tarefas verificáveis em tasks.md'
argument-hint: '[NN da feature] (padrão: a feature ativa)'
---

Você vai transformar o plano de uma feature da Fai em tarefas (ADR-0012). Feature: `$ARGUMENTS`. Se o argumento estiver vazio, use a feature com status `planejada` em `specs/features/README.md`. Se houver mais de uma, ou nenhuma, pergunte qual.

## Passos

1. Leia o `spec.md` e o `plan.md` da feature. Se o plano tiver perguntas em aberto que mudam as tarefas, pare e diga quais são.
2. **Etapa anterior.** O roadmap só permite escrever as tarefas de uma etapa quando a anterior termina. Se ela não terminou, pergunte à dona do projeto se pode seguir assim mesmo e registre a resposta em "Notas".
3. **`tasks.md`**, em pt-BR, na pasta da feature, no mesmo formato da Etapa 3 (veja `specs/features/03-janela-da-mascote/tasks.md`):

   ```markdown
   # Tarefas — Feature NN: <nome>

   Objetivo: <uma frase>. Marque `[x]` ao concluir (`[~]` = parcial); registre desvios na seção "Notas".

   Legenda: **Dep.** = depende de; **Atende** = requisito(s).

   | ID        | Tarefa | Dep. | Atende    | Pronto quando                                        |
   | --------- | ------ | ---- | --------- | ---------------------------------------------------- |
   | [ ] TN.01 | …      | —    | RF-xx CA1 | <critério observável: qual teste passa, o que se vê> |

   ## Fora desta feature (explicitamente)

   ## Notas

   ### Desvios em relação ao plano

   | Tarefa | Planejado | Feito | Motivo |

   ### Verificações executadas

   ### Pendências
   ```

4. **Regras das tarefas.**
   - IDs `T<N>.<MM>`, com `N` = número da feature sem zero à esquerda (feature `04` → `T4.01`).
   - Cada tarefa cabe em um commit, entrega algo testável e diz o que prova que ela está pronta.
   - A ordem segue as dependências: domínio e contrato primeiro, depois persistência e SO, depois main, preload e UI.
   - Os testes entram na própria tarefa, não numa tarefa "escrever testes" no fim.
   - Mudança na regra de dependência ganha tarefa de lint e teste de arquitetura.
   - Documentação (README, `architecture.md`) tem tarefa própria.
   - A última tarefa é sempre "Verificação final" (`/spec:verify`): `npm run check` e `npm run build` no Windows e no Linux, mais o roteiro do plano.
   - Todo CA do `spec.md` aparece na coluna "Atende" de alguma tarefa. Confira antes de terminar.
5. Atualize o `README.md` (linha de status) e o `CLAUDE.md`, se a feature ativa mudar.
6. Rode `npm run format` e depois `npm run format:check`.
7. **Não escreva código de produção.**

## Ao terminar

Mostre a lista de tarefas (ID e título) e termine com:

- **Próximo passo:** `/spec:implement NN` (ou `/spec:implement TN.01` para uma tarefa só).
- **Pendências:** o que pode bloquear a implementação.
- **Melhorias possíveis:** no máximo 3, curtas, sem antecipar escopo do backlog.
