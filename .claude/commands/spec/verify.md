---
description: 'SDD 5/5: o Claude testa a feature de verdade, confere cada CA e fecha a feature'
argument-hint: '[NN da feature] (padrão: a feature em verificação)'
---

Você vai verificar, executando de verdade, a feature que foi implementada (ADR-0012). Feature: `$ARGUMENTS`. Se o argumento estiver vazio, use a feature `em verificação` (ou `em implementação`) em `specs/features/README.md`.

Regra central: **nada é aprovado sem ter sido executado nesta sessão, nesta máquina.** Registre a saída real. Se algo não puder ser executado, diga isso com todas as letras e explique o motivo.

## Passos

1. **Contexto.** Leia o `spec.md`, o `plan.md` (estratégia de testes) e o `tasks.md` da feature. Descubra a máquina e a versão: SO, `node --version`, `git rev-parse --short HEAD`.
2. **Verificações automáticas.**
   - `npm run check` e `npm run build`. Anote o número de arquivos e de testes.
   - Rode os testes da feature isoladamente (`npx vitest run <caminhos>`) e confirme que cada CA `[auto]` tem pelo menos um teste que o prova. Leia os testes: um teste que não pode falhar não conta.
   - Testes de mutação nos CAs centrais: quebre a regra no código, confirme que o teste falha e desfaça. Ao final, confirme com `git diff` que o código voltou ao estado original.
3. **O app rodando.** Teste a funcionalidade no app construído, não só nos testes unitários:
   - Use o build (`npm run build` e depois `npx electron .`), sem a variável `ELECTRON_RUN_AS_NODE` (no PowerShell: `Remove-Item Env:ELECTRON_RUN_AS_NODE`; no bash: `env -u ELECTRON_RUN_AS_NODE`).
   - Escreva scripts de roteiro no scratchpad, fora do repositório, para conferir o que dá para observar de fora: processos, código de saída, janelas, arquivos em `userData`, conteúdo do `fai-data.json`, logs e capturas de tela quando ajudarem.
   - Antes de mexer nos dados reais em `userData`, faça uma cópia do `fai-data.json`. No fim, restaure a cópia e confirme que ela voltou.
   - No fim, confirme que não sobrou nenhum processo `electron`.
4. **Roteiro manual.** O que só uma pessoa pode conferir (nitidez, sensação de arrasto, notificação na tela, outro SO) vira lista numerada de passos curtos, com o resultado esperado de cada um. Esses itens ficam como "pendente: manual", nunca como aprovados. Se a dona do projeto estiver presente, peça que ela execute e registre as respostas.
5. **Revisão.** Releia o diff da feature (`git diff <commit antes da feature>..HEAD`) procurando violações do `CLAUDE.md`: camadas, segurança do IPC (zod e verificação do remetente), CSP, `any`, caminhos fixos, scripts presos a um shell, textos fora de pt-BR. Confira também se o README e a `architecture.md` refletem o que foi feito.
6. **`verification.md`**, em pt-BR, na pasta da feature:

   ```markdown
   # Verificação — Feature NN: <nome>

   | Máquina | Data | Commit | Node |

   ## Resultado por critério

   | CA        | Como foi verificado      | Resultado        |
   | --------- | ------------------------ | ---------------- |
   | RF-xx CA1 | `src/…test.ts` + mutação | aprovado         |
   | RF-yy CA2 | roteiro manual, passo 3  | pendente: manual |

   ## Comandos executados

   <comando, resumo da saída real, número de testes>

   ## Roteiro automatizado com o app

   ## Roteiro manual

   ## Problemas encontrados
   ```

   Numa segunda máquina, acrescente uma seção nova; não sobrescreva a anterior.

7. **Problemas.** Defeito encontrado é corrigido com teste que o reproduza (o teste falha antes e passa depois), desde que a correção caiba no escopo da feature. Se não couber, registre em "Pendências" do `tasks.md`. Em qualquer caso, informe a dona do projeto.
8. **Fechamento.** Atualize o `tasks.md` (marque a verificação final como `[x]` ou `[~]` e anote os resultados em "Verificações executadas"). A feature só fica `concluída` quando todos os CAs estiverem aprovados nas duas máquinas, ou quando a dona do projeto aceitar explicitamente o que falta. Caso contrário, ela continua `em verificação`, com a lista do que falta para a outra máquina. Atualize a linha de status do `README.md`, o índice e, se a etapa do roadmap fechar, os itens da "Definição de pronto do MVP" que ela cumpre.
9. Rode `npm run format` e `npm run check` mais uma vez.

## Ao terminar

Responda com um quadro curto: o que foi aprovado, o que falhou e o que está pendente para uma pessoa ou para a outra máquina. Depois:

- **Próximo passo:** o que fazer em seguida, em ordem de prioridade. Por exemplo: o roteiro manual que falta, a verificação na outra máquina, `/spec:create` da próxima etapa do roadmap (diga qual é e o que ela entrega).
- **Pendências:** tudo o que ficou aberto, com o arquivo onde está registrado.
- **Melhorias possíveis:** de 3 a 5, ordenadas por valor, baseadas no que você viu ao testar (testes frágeis, dívida técnica, riscos para as próximas etapas, lacunas de documentação). Não antecipe escopo do backlog: se algo do backlog parecer urgente, sugira a promoção, não a implementação.
