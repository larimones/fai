# Feature 07 — Conversa com a Fai

- **Etapa:** 8 (Conversa com a Fai), depois do MVP
- **Status:** em verificação
- **Requisitos:** RF-18, RF-19, RNF-15; também RNF-03, RNF-04, RNF-10, RNF-11, RNF-12

## Objetivo

Hoje a Fai reage, guarda tarefas e avisa lembretes, mas não fala. A dona do projeto quer conversar com ela: escolher "Conversar", ver um balão de fala saindo da Fai, escrever e receber respostas com a personalidade dela (carinhosa, em português, em poucas frases), geradas por um serviço de IA. É o primeiro passo para a Fai virar uma assistente de verdade. Nesta etapa ela só conversa; agir pelo que foi dito fica para depois.

A conversa é a primeira coisa da Fai que usa a rede. Por isso a privacidade continua sendo regra: só o texto da conversa aberta sai da máquina, só quando a pessoa manda uma mensagem, e nada da conversa é gravado.

## Escopo

- Item "Conversar" no menu de contexto da Fai e no menu da bandeja, ao lado de "Abrir painel". O clique simples continua sendo a reação de sempre.
- Balão de fala, no estilo de quadrinho, saindo da Fai: as mensagens da pessoa e da Fai, rolando quando a conversa fica longa, e o campo para escrever embaixo (Enter envia).
- O balão fica perto da Fai, fecha ao clicar fora e com Esc, como o painel.
- Enquanto a resposta não chega, o balão mostra que a Fai está pensando, e não dá para enviar outra mensagem.
- Respostas pelo serviço de IA, pedidas só pelo processo principal, com instruções de personalidade da Fai: português do Brasil, carinhosa, acolhedora, poucas frases, sem tom de cobrança.
- A conversa vive só enquanto o balão está aberto: fechar descarta tudo, e reabrir começa do zero. Nada da conversa vai para o `fai-data.json` nem para outro arquivo.
- Chave da API: sem chave guardada, o balão pede para colar a chave uma vez. Ela fica cifrada pelo sistema operacional, fora do `fai-data.json` e do repositório. Dá para trocar ou apagar a chave.
- Erros com mensagem gentil em português no balão, sem travar nada: sem rede, chave inválida, limite de uso, serviço fora do ar, demora demais.
- Mudança de princípio registrada: a conversa é a única exceção ao "sem rede" (`product.md`, RNF-04, RNF-12, RNF-15).
- Documentação: como conseguir e colocar a chave, o que sai da máquina, custo por uso, limitações.

## Fora de escopo

- A Fai agir pela conversa (criar, concluir ou ler tarefas e lembretes): continua no backlog.
- Histórico de conversas salvo, memória entre conversas, onboarding conversacional (backlog).
- Voz (falar ou ouvir), imagens, anexos.
- A Fai puxar conversa sozinha, sem a pessoa abrir o balão.
- Vários serviços de IA à escolha na interface, contas, login.
- Arte definitiva de "falando" ou "pensando": se houver reação da Fai na conversa, ela usa os quadros que já existem (provisória).

## Critérios de aceitação

- CA1 [manual] RF-18 CA1: "Conversar", no menu de contexto da Fai e no da bandeja, abre o balão perto da Fai, com o campo focado; o clique simples continua sendo a reação de sempre.
- CA2 [manual] RF-18 CA2: a Fai responde em português, com a personalidade dela e em poucas frases; o balão mostra as mensagens das duas e rola quando a conversa fica longa.
- CA3 [auto] Mensagem vazia ou só com espaços não é enviada; enquanto uma resposta está a caminho, o balão mostra que a Fai está pensando e não envia outra mensagem.
- CA4 [manual] O balão fecha ao clicar fora e com Esc, e funciona pelo teclado (Tab, Enter, Esc).
- CA5 [auto] RF-18 CA3: fechar o balão descarta a conversa; reabrir começa vazio; nada da conversa é gravado no `fai-data.json` nem em outro arquivo.
- CA6 [auto] RF-18 CA4: sem rede, com chave inválida, com limite de uso ou com o serviço fora do ar, o balão mostra uma mensagem gentil em português, permite tentar de novo, e tarefas, lembretes e a Fai continuam funcionando.
- CA7 [manual] RF-19 CA1: sem chave, o balão pede a chave uma vez; depois de guardada, a conversa começa direto; dá para trocar e apagar a chave.
- CA8 [auto] RF-19 CA2: a chave é guardada cifrada pelo sistema, fora do `fai-data.json` e do repositório, e nunca volta ao renderer depois de salva.
- CA9 [auto/revisão] RNF-15 CA1 e RNF-03: só o processo principal fala com o serviço de IA; a CSP das janelas não ganha endereço remoto; os canais IPC novos validam o payload com zod e só aceitam a janela do balão.
- CA10 [revisão] RNF-15 CA2 e CA3: o que sai da máquina é só o texto da conversa aberta e as instruções de personalidade, e só depois de a pessoa enviar uma mensagem.
- CA11 [manual] RNF-10: o balão tem contraste mínimo de 4,5:1, rótulos acessíveis e foco visível, no estilo pastel da Fai.
- CA12 [manual] Tudo acima também no Windows.

## Decisões da dona do projeto

- 2026-11-18: **promover** "Conversa com IA" do backlog a requisito, aceitando que o texto da conversa saia da máquina para o serviço de IA (o resto continua local).
- 2026-11-18: a conversa entra como **Etapa 8, depois do empacotamento** (a Etapa 7 fecha o MVP primeiro).
- 2026-11-18: abre por **"Conversar" no menu** de contexto e na bandeja (não por duplo clique nem por aba do painel).
- 2026-11-18: o balão mostra uma **conversa curta rolando** (mensagens das duas e campo embaixo).
- 2026-11-18: a conversa **vale só enquanto o balão está aberto**; nada é gravado.
- 2026-11-18: nesta etapa a Fai **só conversa** (agir fica no backlog).
- 2026-11-18: a chave é colada **no próprio balão**, guardada cifrada pelo sistema.
- 2026-11-18: o balão **fecha como o painel** (clicar fora, Esc); respostas **curtas e carinhosas**.

- 2026-11-18 (plano): modelo **Claude Opus 5.5**; resposta **aos poucos**; **limite de 30 mensagens** por conversa; a Fai **pisca a cada resposta**; personalidade **aprovada**; trocar e apagar a chave **pelo menu da bandeja**.

## Perguntas em aberto

Nenhuma. As do `/spec:create` foram respondidas no `plan.md` e no ADR-0017 (serviço e modelo, janela do balão, _streaming_, limites, chave no Linux, personalidade, reação).
