# Plano — Feature 07: Conversa com a Fai

## Perguntas e respostas

| Pergunta                          | Resposta                                                                                                                           | Data       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Modelo de IA (com custo estimado) | **Claude Opus 5.5** (`claude-opus-5-5`), ≈ US$ 0,012 por mensagem curta, ≈ US$ 1,20 por 100 mensagens.                             | 2026-11-18 |
| Resposta aos poucos ou de uma vez | **Aos poucos** (_streaming_): as palavras aparecem enquanto a Fai "fala".                                                          | 2026-11-18 |
| Limite de gasto                   | **30 mensagens por conversa**; na 30ª a Fai avisa com carinho que precisa descansar; fechar e abrir o balão começa outra conversa. | 2026-11-18 |
| A Fai reage na conversa           | **Pisca quando responde** (a reação de clique que já existe, `react`).                                                             | 2026-11-18 |
| Instruções de personalidade       | **Aprovadas** como estão no rascunho (texto abaixo).                                                                               | 2026-11-18 |
| Onde trocar e apagar a chave      | **No menu da bandeja**: "Trocar chave da IA…" e "Apagar chave da IA".                                                              | 2026-11-18 |

Instruções de personalidade aprovadas (vão como `system` em todo pedido):

> Você é a Fai, uma pequena fada celestial que mora na área de trabalho da pessoa com quem conversa e a ajuda com tarefas e lembretes do dia a dia.
>
> - Fale sempre em português do Brasil, com carinho, leveza e bom humor, como uma fadinha acolhedora.
> - Responda em poucas frases (no máximo três), em texto simples, sem listas nem formatação.
> - Nunca cobre nem dê bronca; incentive com gentileza.
> - Nesta versão você só conversa: não cria, conclui nem lê tarefas e lembretes. Se pedirem, diga com doçura que ainda não sabe e sugira o painel da Fai.
> - Não finja ter feito algo que não fez.
> - Não peça dados pessoais.

Pesquisa nesta máquina (Electron 44.9.3, Ubuntu 24.04, GNOME): protótipo descartável com `safeStorage` mostrou `getSelectedStorageBackend() === 'gnome_libsecret'`, `isEncryptionAvailable() === true` e ida e volta de `encryptString`/`decryptString`. No Windows o `safeStorage` usa DPAPI (proteção do usuário do sistema). No Linux sem cofre reconhecido o _backend_ é `basic_text`, cuja cifra usa uma senha fixa e não protege de verdade. O SDK `@anthropic-ai/sdk` (1.10.0 no npm em 2026-11-18) publica saída CommonJS (`require`), que o main usa, e tem 3 dependências.

## Desenho

```
 menu da Fai / bandeja ──"Conversar"──► chat-controller.open('chat' | 'key')
                                             │  posiciona o balão acima da Fai (ou ao lado), mostra e foca
                                             ▼
 janela do balão (chat.html, window.faiChat) ──chat:send {text}──► chat-service (main, em memória)
                                                                   │ regras do domínio: texto 1..1000, ≤ 30 mensagens
                                                                   │ histórico da conversa aberta (só em memória)
                                                                   ▼
                                                        claude-chat (SDK, só no main)
                                                        beta.messages.stream({ model: claude-opus-5-5,
                                                          system: personalidade, messages: conversa,
                                                          effort: low, fallbacks: 'default' })
                                                                   │ texto aos poucos
 balão ◄──chat:reply-delta {text}── … ◄──chat:reply-end── ◄────────┘ ── e a Fai ◄──mascot:reaction {kind:'reply'}
 balão ◄──chat:reply-error {message}──  (sem rede, chave inválida, limite, serviço fora, recusa, demora)

 blur / Esc no balão ──► esconde, aborta o pedido em andamento, apaga a conversa da memória

 sem chave: chat:opened {mode:'key'} ──chat:save-key {key}──► api-key-store
        valida a chave com models.retrieve (sem custo) → cifra com safeStorage → userData/fai-ai-key.bin
 bandeja "Trocar chave da IA…" → balão em modo 'key'; "Apagar chave da IA" → confirmação nativa → apaga o arquivo
```

- **Quem guarda a conversa:** o main, só em memória, enquanto o balão está aberto. O renderer só mostra. Assim o que vai para o serviço é decidido num lugar só (RNF-15) e nada é gravado (CA5).
- **Uma resposta por vez:** com um pedido em andamento, `chat:send` é recusado (`BUSY`) e o balão desabilita o envio (CA3).
- **Erro:** a mensagem que falhou sai do histórico e volta para o campo, pronta para reenviar; o balão mostra o texto gentil do erro (CA6).
- **Limite:** a 30ª mensagem da pessoa ainda é respondida, e o balão mostra em seguida o aviso de descanso, sem novo pedido; depois disso `chat:send` é recusado (`LIMIT`) até fechar o balão.
- **Chave:** nunca volta ao renderer; o renderer só sabe se existe chave (`hasKey`, pelo `chat:opened`). No Linux com `basic_text`, a chave vale só enquanto o app está aberto (memória), e o balão avisa isso.
- **Balão e painel:** abrir um esconde o outro (os dois já fecham ao perder o foco).

Mensagens de erro (pt-BR, gentis, definidas no main):

| Situação                                   | Mensagem                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Sem rede (`APIConnectionError`)            | "Não consegui falar com as estrelas agora. Confere a internet e tenta de novo?"                  |
| Demora (`APIConnectionTimeoutError`, 60 s) | "Me perdi nos pensamentos e demorei demais. Tenta de novo?"                                      |
| Chave inválida (401, 403)                  | "Minha chave não funcionou. Troque em \"Trocar chave da IA…\" na bandeja."                       |
| Créditos (402 `billing_error`)             | "Os créditos do serviço de IA acabaram. Dá uma olhadinha na sua conta?"                          |
| Limite de uso (429)                        | "Preciso de um respiro. Tenta daqui a pouquinho?"                                                |
| Serviço fora (≥ 500, 529)                  | "As estrelas estão cansadinhas agora. Tenta de novo daqui a pouco?"                              |
| Recusa (`stop_reason: 'refusal'`)          | "Sobre isso eu não sei conversar. Que tal outro assunto?"                                        |
| Limite de 30 mensagens                     | "Conversamos tanto! Preciso descansar as asinhas. Fecha e abre o balão para começarmos de novo." |

## Mudanças por camada

- `src/domain/chat/conversation.ts` (novo): `ChatMessage { role: 'user' | 'fai', text }`; `validateChatText` (_trim_, 1 a 1000 pontos de código); `CHAT_MESSAGE_LIMIT = 30`; `addUserMessage` (recusa `BUSY`, `LIMIT`, `INVALID_TEXT`), `appendReply`, `dropFailedMessage`, `reachedLimit`. Funções puras sobre listas imutáveis.
- `src/domain/mascot/`: nenhuma mudança na máquina de estados; a reação `reply` reaproveita o evento `click` → `react`.
- `src/shared/ipc/`: canais `chat:send` (invoke, `{ text: string ≤ 1000 }` → `null`; códigos `INVALID_TEXT`, `BUSY`, `LIMIT`, `NO_KEY`), `chat:save-key` (invoke, `{ key: string, 1..500, sem espaços }` → `null`; código `INVALID_KEY`, `KEY_NOT_SAVED`), eventos main → balão `chat:opened` (`{ mode: 'chat' | 'key', hasKey: boolean, keyPersists: boolean }`), `chat:reply-delta` (`{ text }`), `chat:reply-end` (sem payload), `chat:reply-error` (`{ message, text }`, com o texto a devolver ao campo); `mascot:reaction` aceita `'reply'`. Todos com zod estrito.
- `src/main/chat/personality.ts` (novo): o texto aprovado.
- `src/main/chat/claude-chat.ts` (novo, único lugar que importa `@anthropic-ai/sdk`): cria o cliente com a chave explícita (sem ler `ANTHROPIC_API_KEY` nem perfis do ambiente), `timeout` de 60 s, `maxRetries` 1; `stream(messages, { onText, signal })` com `client.beta.messages.stream` (`model: 'claude-opus-5-5'`, `max_tokens: 4096`, `system`, `output_config: { effort: 'low' }`, `betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'`); confere `stop_reason`; traduz as classes de erro do SDK para um `ChatFailure` do próprio app; `checkKey(key)` com `models.retrieve` (sem custo de tokens).
- `src/main/chat/chat-service.ts` (novo): a conversa em memória, as regras do domínio, um pedido por vez, `AbortController` abortado ao fechar, mensagens de erro em pt-BR, reação `reply` ao fim de cada resposta.
- `src/main/chat/api-key-store.ts` (novo, sem `electron` direto): lê e grava `userData/fai-ai-key.bin` (só bytes cifrados, gravação atômica como no `DataStore`), apaga; recebe as funções de cifra por parâmetro.
- `src/main/os/`: `DesktopIntegration` ganha `secretStorage()`: Windows usa `safeStorage` quando `isEncryptionAvailable()`; Linux só quando o _backend_ não é `basic_text` nem `unknown`; senão, devolve "só em memória".
- `src/main/chat/chat-controller.ts` e `src/main/windows/chat-window.ts` (novos): janela do balão, 300×380 px lógicos, sem moldura, transparente, `skipTaskbar`, sempre no topo, criada escondida e reaproveitada, mostrada com foco; fecha no `blur` e no Esc (`before-input-event`); acompanha o arrasto da Fai, como o painel.
- `src/domain/chat/bubble-placement.ts` (novo): posição pura do balão: acima da Fai, com a ponta para ela; se não couber, ao lado (como o painel); sempre dentro da área de trabalho; diz para que lado a ponta aponta.
- `src/main/mascot/mascot-menu.ts` e `src/main/tray/tray-menu.ts`: "Conversar"; na bandeja também "Trocar chave da IA…" e "Apagar chave da IA" (confirmação com `dialog.showMessageBox`).
- `src/main/index.ts`: liga tudo; guarda da janela do balão para `chat:*`.
- `src/main/persistence/`: nenhuma mudança (a conversa não é gravada; a chave fica em arquivo próprio, fora do documento).
- `src/preload/chat.ts` e `chat-api.ts` (novos): `window.faiChat` com `send`, `saveKey`, `onOpened`, `onReplyDelta`, `onReplyEnd`, `onReplyError`; nunca o `event`; payloads validados pelo `eventContract`.
- `src/renderer/chat.html` (nova página, mesma CSP) e `src/renderer/src/chat/`: `ChatApp.tsx` (estado da tela), `MessageList.tsx` (mensagens com rolagem, `aria-live="polite"` na resposta), `ChatForm.tsx` (campo, Enter envia, desabilitado enquanto espera, "Fai está pensando…"), `KeyForm.tsx` (campo de senha para colar a chave, link de texto para onde conseguir a chave, aviso quando a chave não fica guardada); `chat.css` no estilo pastel do painel, com a ponta do balão em CSS.
- `electron.vite.config.mts`: terceira entrada (página e preload).
- `eslint.config.mjs` e `tests/architecture/`: `@anthropic-ai/sdk` só pode ser importado em `src/main/chat/claude-chat.ts`.

## Segurança

- **CSP das janelas inalterada** (`connect-src 'self'`): o renderer continua sem rede. O pedido sai do main, pelo SDK.
- **Chave:** só no main; cifrada pelo SO; arquivo próprio em `userData`, nunca no `fai-data.json`, no repositório ou em log; nenhum canal devolve a chave ao renderer. O cliente do SDK recebe a chave explicitamente e não procura credenciais no ambiente.
- **O que sai da máquina:** só as instruções de personalidade e as mensagens da conversa aberta, e só depois de a pessoa enviar uma (RNF-15). Nada de tarefas, lembretes, posição ou caminhos.
- **IPC:** dois canais de pedido e quatro de evento, todos com schema zod estrito e guarda da janela do balão; a resposta do modelo chega ao renderer só como texto (o React escapa; nada de HTML).
- **Navegação, `window.open` e permissões** continuam bloqueados; o link "onde conseguir a chave" é só texto com o endereço (o app não abre navegador nesta etapa).
- **Fallback do lado do servidor** (`fallbacks: 'default'`, beta `server-side-fallback-2026-07-01`): se o Opus 5.5 recusar por um classificador de segurança, o próprio serviço tenta outro modelo na mesma chamada. Só muda qual modelo responde; o que é enviado é o mesmo.

## Dependências novas

- **`@anthropic-ai/sdk`** (versão exata fixada na tarefa, publicada há pelo menos uma semana): cliente oficial da API do Claude, só no main. Justificativa: tipos e classes de erro oficiais, _streaming_, novas tentativas e tempo limite prontos; escrever o protocolo à mão (eventos do _streaming_, erros, cabeçalhos de versão) seria mais código para manter e mais fácil de errar. Traz `standardwebhooks`, `json-schema-to-ts` e `@opentelemetry/api` (só a API, sem coletor). Registrada no ADR-0017.

## ADRs

- **ADR-0017 (novo):** conversa com a Fai: exceção de rede só no main, SDK oficial, modelo, _streaming_, conversa só em memória, limite de 30, chave com `safeStorage` (e o caso `basic_text`), janela do balão, reação `reply`.
- **ADR-0007:** nota: a partir da Etapa 8 o main faz pedidos de rede ao serviço de IA; a CSP das janelas não muda; o item 8 (segredos) passa a ser implementado pelo ADR-0017.

## Estratégia de testes

- **Automatizados:**
  - Domínio: texto (vazio, só espaços, 1000 e 1001 pontos de código); `BUSY` com resposta em andamento; 30ª mensagem aceita e 31ª recusada; erro devolve o texto e tira a mensagem do histórico; posição do balão (acima, ao lado, presa à área de trabalho, lado da ponta).
  - `claude-chat` com o SDK substituído por um falso: parâmetros do pedido (modelo, `system` igual ao texto aprovado, só as mensagens da conversa, `effort`, `fallbacks`); a chave passada explicitamente; texto aos poucos repassado; `refusal` vira recusa; cada classe de erro do SDK vira o `ChatFailure` certo; `abort` ao fechar.
  - `chat-service`: conversa apagada ao fechar; nada gravado (nenhuma escrita em disco além da chave); reação `reply` uma vez por resposta; mensagens de erro em pt-BR; limite.
  - `api-key-store` em diretório temporário: o arquivo não contém a chave em claro; apagar remove; arquivo ilegível tratado como "sem chave"; `basic_text` mantém só em memória.
  - `DesktopIntegration.secretStorage` com `electron` falso: Windows e Linux, cada _backend_.
  - Contrato e preload: schemas (aceita o válido; recusa extras, texto longo, chave com espaço, modo desconhecido); preload com exatamente as funções do contrato, sem `event`, sem nada que devolva a chave; guarda só da janela do balão.
  - Componentes (RTL): modo chave e modo conversa; Enter envia; vazio não envia; "Fai está pensando…" e envio desabilitado; texto chegando aos poucos; erro devolve o texto ao campo; aviso do limite; nomes acessíveis.
  - Contraste do `chat.css`; arquitetura (SDK só em `claude-chat.ts`); CSP das três páginas igual à de produção.
  - Mutações: limite de 30, texto vazio, chave em claro, conversa não apagada ao fechar, erro sem devolver o texto, chave lida do ambiente.
- **Roteiro automatizado com o app construído** (`/spec:verify`, sem teclas; só cliques conferidos quando necessário): `out/renderer` sem endereço remoto e com a CSP de produção nas três páginas; `out/main` com o endereço do serviço só no código do chat; balão de 300×380; depois da conversa feita pela dona do projeto com uma palavra marcadora, nenhum arquivo em `userData` contém a palavra, e o `fai-key` não contém a chave em claro; `fai-data.json` igual ao de antes; CPU e memória com `tools/measure/` com o balão criado.
- **Manual:** abrir pelo menu e pela bandeja; colar a chave; conversar (português, carinho, poucas frases, texto aos poucos, piscada); erro com rede desligada e com chave inválida; trocar e apagar a chave; limite de 30 (com uma conversa curta e o limite reduzido só no teste automatizado, ou na mão); aparência e contraste; tudo também no Windows.

## Riscos

| Risco                                                                     | Mitigação                                                                                                                                                   |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux sem cofre de senhas (`basic_text`): a cifra não protege.            | Não gravar nesse caso; a chave vale só enquanto o app está aberto, e o balão avisa.                                                                         |
| Custo crescendo com conversas longas (cada pedido reenvia a conversa).    | Limite de 30 mensagens; respostas curtas pela personalidade; `effort: 'low'`; `max_tokens` de 4096.                                                         |
| Tipos do SDK exigirem TypeScript mais novo que o 6.0.x fixado (ADR-0001). | Conferir `npm run typecheck` na primeira tarefa com o SDK; se quebrar, escolher a versão do SDK que funciona e registrar.                                   |
| A chave aparecer em log ou mensagem de erro.                              | O main nunca registra o objeto de erro com cabeçalhos; teste que o log não contém a chave.                                                                  |
| `ANTHROPIC_API_KEY` ou um perfil do ambiente serem usados sem querer.     | Cliente criado com a chave explícita; teste com a variável definida no ambiente do teste.                                                                   |
| Recusas do classificador em conversa comum.                               | `fallbacks: 'default'` no servidor e mensagem gentil se a recusa persistir.                                                                                 |
| A personalidade não ser seguida (respostas longas, com formatação).       | Conferência manual com a dona do projeto; texto num arquivo próprio para ajustar sem mexer no resto.                                                        |
| Testar contra o serviço de verdade gasta créditos da dona do projeto.     | Testes automatizados com o SDK falso; no app, poucas mensagens, só com a autorização dela; a validação da chave usa `models.retrieve`, sem custo de tokens. |
| A Etapa 8 vem depois da Etapa 7, que ainda não começou.                   | O `/spec:tasks 07` só depois da Etapa 7 ou com a autorização da dona do projeto, registrada nas "Notas".                                                    |
