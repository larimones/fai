---
description: 'SDD 2/5: planeja a feature com perguntas e desenho técnico em plan.md'
argument-hint: '[NN da feature] (padrão: a feature ativa)'
---

Você vai planejar como implementar uma feature do fluxo SDD da Fai (ADR-0012). Feature: `$ARGUMENTS`. Se o argumento estiver vazio, use a feature com status `especificada` em `specs/features/README.md`. Se houver mais de uma, ou nenhuma, pergunte qual.

## Passos

1. **Contexto.** Leia o `spec.md` da feature, `specs/architecture.md`, os ADRs em `specs/decisions/` que tratam do assunto e o código existente que a feature vai tocar. Os testes ao lado do código mostram as convenções.
2. **Pesquisa.** Quando a feature depender de comportamento do Electron ou do SO (transparência, click-through, bandeja, notificações etc.), confira a documentação da versão instalada (`package.json`). Não confie só na memória. Separe o comportamento do Windows do comportamento do Linux.
3. **Perguntas.** Converse com a dona do projeto antes de fechar o plano. Use `AskUserQuestion` para as escolhas que são dela (comportamento visível, prioridades, compromissos entre opções), no máximo 4 perguntas por vez, cada uma com uma opção recomendada e o motivo. Faça várias rodadas se precisar. Decida sozinho o que tem um padrão óbvio no projeto e registre a decisão no plano.
4. **`plan.md`**, em pt-BR, na pasta da feature:

   ```markdown
   # Plano — Feature NN: <nome>

   ## Perguntas e respostas

   | Pergunta | Resposta | Data |

   ## Desenho

   <como funciona: processos envolvidos, fluxo, estados; diagrama ASCII se ajudar>

   ## Mudanças por camada

   - `src/domain/…`: …
   - `src/shared/ipc/…`: canais novos (nome, request e response em zod, quem envia)
   - `src/main/…`, `src/main/os/…` (Windows e Linux), `src/main/persistence/…` (migração do documento?)
   - `src/preload/…`, `src/renderer/…`

   ## Segurança

   <impacto em CSP, IPC, permissões, sandbox; "nenhum" se for o caso, com o motivo>

   ## Dependências novas

   <cada uma com justificativa; "nenhuma" se for o caso>

   ## ADRs

   <ADRs novos ou alterados>

   ## Estratégia de testes

   - Automatizados: <o que cada teste prova>
   - Roteiro automatizado com o app construído: <o que o /spec:verify vai executar>
   - Manual: <só o que uma pessoa precisa ver ou fazer>

   ## Riscos

   | Risco | Mitigação |
   ```

5. **ADRs.** Toda decisão técnica relevante ganha ADR curto em `specs/decisions/NNNN-titulo.md`, no formato dos existentes. Se o plano contrariar a spec ou a arquitetura, corrija o documento afetado e registre o motivo.
6. Atualize o `spec.md` (decisões e perguntas em aberto) e mude o status para `planejada`, ali e no índice.
7. Rode `npm run format` e depois `npm run format:check`.
8. **Não escreva código de produção.** Um protótipo descartável para tirar uma dúvida é aceito, no scratchpad, fora do repositório.

## Ao terminar

Responda com um resumo do plano (decisões principais e riscos) e termine com:

- **Próximo passo:** `/spec:tasks NN`.
- **Pendências:** perguntas que ficaram sem resposta e riscos não mitigados.
- **Melhorias possíveis:** no máximo 3, curtas, sem antecipar escopo do backlog.
