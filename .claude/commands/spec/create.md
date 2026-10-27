---
description: 'SDD 1/5: registra uma nova feature (o quê e por quê) em specs/features/NN-slug/spec.md'
argument-hint: <descrição da feature>
---

Você vai iniciar uma nova feature no fluxo SDD da Fai (ADR-0012). Descrição dada pela dona do projeto:

<feature>
$ARGUMENTS
</feature>

Se a descrição estiver vazia, pergunte qual é a feature e pare.

## Passos

1. **Contexto.** Leia `specs/roadmap.md`, `specs/features/README.md`, `specs/requirements.md`, `specs/backlog.md`, `specs/product.md` e o `tasks.md` da feature ativa.
2. **Escopo.** Descubra a que etapa do roadmap a feature pertence e quais RF/RNF ela atende.
   - Se ela estiver no `backlog.md` ou fora do roadmap, **pare** e explique. Ela só segue se a dona do projeto aprovar explicitamente a promoção. Nesse caso, acrescente o requisito em `requirements.md` e a etapa em `roadmap.md`.
   - Se a etapa anterior não estiver concluída, avise e diga o que falta. A spec pode ser escrita assim mesmo.
3. **Perguntas.** Se o objetivo, o escopo ou os critérios de aceitação estiverem ambíguos, pergunte com `AskUserQuestion` (no máximo 4 perguntas por vez, cada uma com uma opção recomendada). Não pergunte o que dá para responder lendo as specs ou o código. As perguntas técnicas ficam para o `/spec:plan`.
4. **Pasta.** Crie `specs/features/NN-slug/`, com `NN` = próximo número livre (o primeiro é `03`) e `slug` curto em pt-BR, `kebab-case`, sem acentos.
5. **`spec.md`**, em pt-BR, com esta estrutura:

   ```markdown
   # Feature NN — <nome>

   - **Etapa:** <n> (<nome da etapa>)
   - **Status:** especificada
   - **Requisitos:** RF-xx, RNF-yy

   ## Objetivo

   <o problema e o resultado esperado, do ponto de vista de quem usa a Fai>

   ## Escopo

   - <o que entra>

   ## Fora de escopo

   - <o que não entra, inclusive o que fica para etapas seguintes>

   ## Critérios de aceitação

   - CA1 [auto|manual|script] <verificável>

   ## Decisões da dona do projeto

   - <respostas dadas nesta fase, com data>

   ## Perguntas em aberto

   - <o que ficou para o /spec:plan>
   ```

   Reaproveite os CAs que já existem em `requirements.md` (cite o ID) e só crie CAs novos quando faltar algum. Requisito novo ganha ID novo em `requirements.md`.

6. **Índice.** Acrescente a linha da feature em `specs/features/README.md` com o status `especificada`.
7. Rode `npm run format` e depois `npm run format:check`.
8. **Não escreva código nem plano técnico.**

## Ao terminar

Responda com um resumo curto da spec e termine com:

- **Próximo passo:** `/spec:plan NN`.
- **Pendências:** o que bloqueia ou atrapalha a feature (etapa anterior aberta, pergunta sem resposta, arte que falta etc.).
- **Melhorias possíveis:** no máximo 3, curtas, sem antecipar escopo do backlog.
