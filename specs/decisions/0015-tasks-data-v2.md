# ADR-0015 — Tarefas no documento de dados (v2)

- **Status:** aceito em 2026-11-06 (implementação na Etapa 5)
- **Data:** 2026-11-06

## Contexto

O `fai-data.json` está na v1 (`{ schemaVersion: 1, mascot: { position } }`), e a decisão de 2026-10-22 diz que as tarefas entram por migração na Etapa 5. A Etapa 2 deixou anotado que, a partir da v2, o documento deve ser validado pelo schema da **versão de origem antes** de migrar.

## Decisão

1. **Formato v2:** `{ schemaVersion: 2, mascot: { position }, tasks: Task[] }`, com `Task = { id, title, createdAt, completedAt }`. `id` é um UUID gerado no main (`crypto.randomUUID()`) e passado ao domínio; `createdAt` e `completedAt` são instantes em ISO 8601 UTC (`completedAt: null` enquanto pendente). A lista é guardada na ordem de criação; a ordem de exibição (pendentes da mais nova para a mais antiga, concluídas da concluída por último para a primeira) é calculada pelo domínio.
2. **Regras no domínio** (`src/domain/tasks/`), puras, com relógio e ID por parâmetro: título obrigatório, sem espaços nas pontas, de 1 a 200 caracteres contados por ponto de código (um emoji conta como 1); concluir grava `completedAt`, reabrir limpa; excluir ou alterar um ID inexistente devolve erro tratado, sem mudar a lista.
3. **Migração `1 → 2`:** acrescenta `tasks: []` e mantém o resto.
4. **Leitura:** envelope → schema da versão de origem (v1 ou v2, estrito) → migração → schema da v2. Documento v1 inválido continua indo para a quarentena, como antes.
5. **Gravação:** cada mudança de tarefa grava pelo `DataStore` existente (_debounce_ e fila); o main é a fonte da verdade e devolve ao painel a tarefa já validada.

## Consequências

- Um `fai-data.json` v1 vira v2 no primeiro início da versão nova e é regravado (`status: migrated`, já tratado na Etapa 2). Voltar para uma versão antiga do app com um arquivo v2 leva à quarentena (versão futura), comportamento já previsto.
- O tamanho do título é limitado também no contrato IPC, para recusar entradas enormes antes do domínio.
