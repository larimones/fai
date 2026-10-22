# Produto — Fai ✨

## Visão

A Fai é uma pequena fada em pixel art que flutua sobre as janelas do desktop. Ela é carinhosa e acolhedora: reage quando recebe um clique, pode ser arrastada para qualquer canto e ajuda com tarefas e lembretes do dia a dia. Deve dar vontade de usar sem atrapalhar o trabalho.

## Público

Uma pessoa: eu, a desenvolvedora e usuária. Uso diário em Windows (alvo da primeira entrega) e em Linux.

## Princípios

1. **Discreta antes de tudo.** A Fai nunca rouba o foco, não aparece na barra de tarefas e deixa os cliques passarem pelas áreas vazias ao redor dela.
2. **Acolhedora.** Reações e textos gentis, em português, sem tom de cobrança.
3. **Local e privada.** Todos os dados ficam na máquina. Sem rede, sem conta, sem telemetria no MVP.
4. **Segura por padrão.** Renderer isolado, IPC mínimo e validado, sem conteúdo remoto.
5. **Simples de manter.** Domínio puro e testável; integração com o SO isolada atrás de interfaces; poucas dependências.
6. **Entregas verificáveis.** Cada etapa termina com critérios de aceitação conferidos por execução real.

## Direção visual

- Estética feérica celestial em pixel art retrô.
- Paleta: azul-noturno, roxo, púrpura, dourado e estrelas.
- Interface delicada, mas legível (contraste adequado) e discreta.
- Somente assets locais.

Paleta inicial (tokens CSS, ajustável quando o design existir):

| Token             | Cor       | Uso                   |
| ----------------- | --------- | --------------------- |
| `--fai-night`     | `#141432` | fundo principal       |
| `--fai-indigo`    | `#2a2a5e` | superfícies           |
| `--fai-violet`    | `#6b4fa3` | destaques secundários |
| `--fai-purple`    | `#9b5fc0` | ações                 |
| `--fai-gold`      | `#f2c94c` | ênfase, estrelas      |
| `--fai-starlight` | `#f5f0ff` | texto                 |

## Não objetivos (MVP)

- Versão Linux empacotada e distribuída (Linux é ambiente de desenvolvimento no MVP).
- macOS.
- Integração com IA, rede, sincronização, contas ou login.
- Personalização (skins, temas, nome da mascote).
- Qualquer item de `backlog.md`.
- Recorrência de lembretes, prioridades, prazos ou categorias de tarefas.
- Atualização automática do aplicativo.
