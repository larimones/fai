# ADR-0017 — Conversa com a Fai: serviço de IA, balão e chave

- **Status:** aceito em 2026-11-18 (implementação na Etapa 8; complementa o ADR-0007)
- **Data:** 2026-11-18

## Contexto

A dona do projeto promoveu do backlog a conversa com a Fai (RF-18, RF-19, RNF-15): um balão de fala perto dela, com respostas de um serviço de IA. É a primeira vez que o app usa a rede, contra o princípio "local e privada" do produto, que passou a ter essa única exceção. Um protótipo descartável no Linux (Electron 44.9.3, Ubuntu 24.04, GNOME) mostrou o `safeStorage` com o _backend_ `gnome_libsecret` e ida e volta de cifra funcionando.

## Decisão

1. **Rede só no main.** O pedido ao serviço sai do processo principal, pelo SDK oficial `@anthropic-ai/sdk`, importado só em `src/main/chat/claude-chat.ts` (regra de lint e teste de arquitetura). A CSP das janelas não muda (`connect-src 'self'`).
2. **Modelo `claude-opus-5-5`**, escolha da dona do projeto com o custo estimado (≈ US$ 0,012 por mensagem curta). Respostas aos poucos (`beta.messages.stream`), `output_config.effort: 'low'`, `max_tokens: 4096`, tempo limite de 60 s, uma nova tentativa. `fallbacks: 'default'` (beta `server-side-fallback-2026-07-01`): em recusa do classificador, o serviço tenta outro modelo na mesma chamada.
3. **Só sai a conversa aberta**, com as instruções de personalidade aprovadas (`src/main/chat/personality.ts`), e só depois de a pessoa enviar uma mensagem. Tarefas, lembretes e o resto dos dados nunca vão.
4. **Conversa só em memória, no main**, enquanto o balão está aberto; fechar aborta o pedido e apaga tudo. Um pedido por vez. **Limite de 30 mensagens** da pessoa por conversa (escolha da dona do projeto, para conter o custo).
5. **Chave:** colada no balão; validada com `models.retrieve` (sem custo de tokens); cifrada com `safeStorage` e gravada em `userData/fai-ai-key.bin`, fora do `fai-data.json`; nunca volta ao renderer; o cliente do SDK a recebe explicitamente e não usa credenciais do ambiente. A decisão de cifrar fica na `DesktopIntegration` (`secretStorage()`): Windows com DPAPI; Linux só com cofre reconhecido. Com `basic_text`, a chave vale só enquanto o app está aberto. Trocar e apagar pela bandeja.
6. **Balão numa janela própria** (página `chat.html`, preload `window.faiChat`), 300×380 px, sem moldura, transparente, com foco, acima da Fai (ou ao lado, se não couber), fecha ao perder o foco e no Esc, acompanha o arrasto, como o painel (ADR-0014). Abrir o balão esconde o painel, e vice-versa.
7. **A Fai pisca a cada resposta**: reação `reply` no `mascot:reaction`, que toca a animação `react` que já existe.

## Alternativas consideradas

- **`fetch` direto à API, sem SDK:** sem dependência nova, mas o protocolo de _streaming_, os erros e os cabeçalhos de versão ficariam por nossa conta.
- **Pedido feito pelo renderer:** exigiria abrir a CSP e expor a chave ao renderer; rejeitado (RNF-01, RNF-12).
- **Chave em variável de ambiente:** pouco prática no app instalado; a dona do projeto escolheu colar no balão.
- **Gravar a conversa:** a dona do projeto escolheu não guardar nada.
- **Haiku 5.5 ou Sonnet 5.5:** mais baratos; a dona do projeto escolheu o Opus 5.5 vendo os números.

## Consequências

- O app passa a ter uma dependência de rede opcional: sem rede ou sem chave, só o balão é afetado.
- A dona do projeto precisa de uma conta no serviço e paga por uso.
- No Linux sem cofre de senhas, a chave precisa ser colada a cada início do app.
- Testes automatizados nunca chamam o serviço; a conferência real gasta poucos centavos, com autorização.
- **Só a API assíncrona do `safeStorage` (2026-11-18, T7.11):** no Linux, com o Electron 44.9.3, o que `encryptString` grava não decifra na execução seguinte; `encryptStringAsync` e `decryptStringAsync` funcionam entre execuções (protótipo e app). A chave é cifrada de novo quando o sistema pede (`shouldReEncrypt`).
