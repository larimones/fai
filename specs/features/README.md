# Features

Cada feature tem uma pasta `NN-slug/` com `spec.md`, `plan.md`, `tasks.md` e `verification.md`, escritos pelos comandos `/spec:create`, `/spec:plan`, `/spec:tasks` e `/spec:verify` (o código vem de `/spec:implement`). O fluxo está descrito no [ADR-0012](../decisions/0012-feature-workflow.md).

As Etapas 1 a 3 usaram o formato antigo: as Etapas 1 e 2 estão no histórico do git (commits `054ecc8` e `4da55aa`), e o plano e as verificações da Etapa 3 estão só no `tasks.md` da pasta `03`.

Status: `especificada` → `planejada` → `em verificação` → `em verificação` → `concluída`.

| Feature | Etapa | Status         | Pasta                                                                                 |
| ------- | ----- | -------------- | ------------------------------------------------------------------------------------- |
| 03      | 3     | concluída      | [03-janela-da-mascote](03-janela-da-mascote/tasks.md) (formato antigo, só `tasks.md`) |
| 04      | 4     | concluída      | [04-animacao-e-reacoes](04-animacao-e-reacoes/spec.md)                                |
| 05      | 5     | concluída      | [05-painel-de-tarefas](05-painel-de-tarefas/spec.md)                                  |
| 06      | 6     | em verificação | [06-lembretes-e-notificacoes](06-lembretes-e-notificacoes/spec.md)                    |
