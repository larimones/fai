# Verificação — Feature 08: Empacotamento para Windows

## Linux

| Máquina                                                               | Data       | Commit    | Node     |
| --------------------------------------------------------------------- | ---------- | --------- | -------- |
| Ubuntu 24.04.5 LTS, kernel 6.8.0-40, sessão Wayland (app em XWayland) | 2026-11-18 | `2aaac5f` | v22.23.2 |

**Esta feature é sobretudo do Windows.** O instalador NSIS não é gerado no Linux (ADR-0018: precisa do wine, que esta máquina não tem). Por isso nada do que depende de instalar, de atalhos, do SmartScreen, das notificações do Windows ou de desinstalar foi executado aqui. Esses CAs ficam **pendentes: Windows**, sem exceção.

### Resultado por critério

| CA   | Como foi verificado                                                                                                                                                                               | Resultado                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| CA1  | Parte automática: `installer-config.test.ts` (`appId` = `APP_USER_MODEL_ID`, `dist:win`) + mutação. Gerar, instalar, notificações e desinstalar: não executado aqui.                              | **pendente: Windows** (roteiro da Etapa 7, passos 1, 3, 5 e 8)       |
| CA2  | Configuração testada (por usuário, sem elevação, sem pasta, atalhos, abrir ao terminar) + 3 mutações. Instalar de verdade: não executado aqui.                                                    | **pendente: Windows** (passos 3 e 4)                                 |
| CA3  | Configuração testada (ícone `resources/app-icon.png`, 256×256 RGBA) + mutação.                                                                                                                    | **pendente: Windows** (passos 4 e 5)                                 |
| CA4  | README descreve o aviso e o caminho "Mais informações" → "Executar assim mesmo".                                                                                                                  | **pendente: Windows** (passo 2)                                      |
| CA5  | Configuração testada (`deleteAppDataOnUninstall: false`) + mutação.                                                                                                                               | **pendente: Windows** (passos 8 e 9)                                 |
| CA6  | O app empacotado de Linux abriu as três janelas e a bandeja sem erro no log. O app instalado no Windows: não executado aqui.                                                                      | **pendente: Windows** (passo 6)                                      |
| CA7  | `npm run pack:check` (saída 0): as nove Fuses lidas do executável empacotado de Linux como no ADR-0018; o app empacotado abriu com `ELECTRON_RUN_AS_NODE=1` no ambiente; `fuses.json` + mutações. | aprovado no Linux; **pendente: Windows** (`pack:check` e passo 7)    |
| CA8  | `security-review.md` (13 itens) e `check-package.mjs` sobre o pacote real: 27 arquivos, nada proibido; mutação de ponta a ponta (`specs/` no pacote → 54 problemas, saída 1).                     | aprovado no Linux; itens 7, 8 e 13 da revisão **pendentes: Windows** |
| CA9  | Revisão do README ("Instalar no Windows", "Limitações", comandos).                                                                                                                                | aprovado na revisão; conferir contra a instalação real (passo 10)    |
| CA10 | Definição de pronto avaliada item a item (abaixo).                                                                                                                                                | avaliada; três itens dependem do Windows                             |
| CA11 | `npm run check`; `package-manifest.test.ts` e `installer-config.test.ts` (sem dependências de runtime, scripts sem comandos de um shell só) + mutação.                                            | aprovado                                                             |

### Comandos executados

- `npm run check`: typecheck, lint e Prettier sem erros; **62 arquivos, 481 testes**.
- `npm run build`: saída 0.
- Testes da feature (`tests/build`, `tests/architecture`, `tests/ui`): **9 arquivos, 65 testes**.
- `npm run pack:check` (do zero, sem `dist/`): saída 0; `dist/linux-unpacked` com 288 MB; 27 arquivos no `app.asar`; Fuses: `RunAsNode`, `EnableNodeOptionsEnvironmentVariable`, `EnableNodeCliInspectArguments` e `LoadBrowserProcessSpecificV8Snapshot` desligadas; `EnableCookieEncryption`, `EnableEmbeddedAsarIntegrityValidation`, `OnlyLoadAppFromAsar`, `GrantFileProtocolExtraPrivileges` e `WasmTrapHandlers` ligadas; "OK: Fuses e conteúdo como o ADR-0018 decide."
- Mutações (11, todas mortas, cada uma desfeita): `RunAsNode` ligada, `asar` sem integridade, instalação para todos, com elevação, sem abrir ao terminar, apagando os dados, ID diferente das notificações, outro ícone, `node_modules` aceito, página do balão não exigida, dependência de runtime. **De ponta a ponta:** `specs/**/*` acrescentado à configuração e o app remontado → `check-package.mjs` apontou 54 problemas e saiu com 1; restaurado e remontado → saída 0. Depois, `git diff` vazio e `git status` limpo.
- Revisão do diff `4f84749..HEAD` (19 arquivos, a maior parte o `package-lock.json`): nada em `src/` mudou; sem `any` nem `@ts-ignore`; scripts novos só com `&&`; caminhos do sistema com `node:path` (os caminhos com `/` são os de dentro do `app.asar`); textos para pessoas em pt-BR. README e `architecture.md` refletem a feature.

### Roteiro automatizado com o app

| Conferência                                                                      | Resultado                                                                                                        |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| App empacotado de Linux (`dist/linux-unpacked/fai`) com `ELECTRON_RUN_AS_NODE=1` | um processo principal; janelas "Fai" 188×160, "Tarefas da Fai" 320×520, "Conversa com a Fai" 300×380 e a bandeja |
| Log                                                                              | vazio (sem erros de carga nem de canais)                                                                         |
| Fim                                                                              | nenhum processo sobrando; `fai-ai-key.bin` intacto; `fai-data.json` restaurado (mesmo SHA-256)                   |

O instalador e o app instalado no Windows não foram executados: o instalador só é gerado lá.

### Roteiro manual

`specs/manual-tests.md`, "Etapa 7 — instalador para Windows", passos 1 a 10: **todos pendentes: Windows**. Nenhum foi executado nesta máquina.

### Definição de pronto do MVP (CA10)

| Item                                                            | Evidência                                                                                                                               | Situação                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| A mascote é transparente, flutuante e arrastável.               | Etapa 3, Windows e Linux.                                                                                                               | já marcado                                   |
| As animações e as reações a cliques funcionam.                  | Etapa 4; Windows aceito como pendência (2026-11-06).                                                                                    | já marcado                                   |
| É possível criar, concluir e excluir tarefas.                   | Etapa 5; Windows aceito como pendência (2026-11-13).                                                                                    | já marcado                                   |
| Os lembretes são persistidos e geram notificações locais.       | Feature 06 verificada no Linux (inclusive notificações vistas pela dona do projeto); Windows pendente.                                  | falta o Windows (feature 06, passo 15)       |
| Os dados sobrevivem ao reinício do aplicativo.                  | Fechar e abrir verificado no Linux (features 06 e 07); reiniciar o computador pendente.                                                 | falta reiniciar o computador e o Windows     |
| Os fluxos críticos têm testes automatizados.                    | 62 arquivos e 481 testes, com mutações nas regras centrais de cada etapa; independe da máquina.                                         | atendido (marcar ao fechar a etapa)          |
| Não há erros críticos conhecidos de segurança ou funcionamento. | Revisão de segurança sem item crítico; abertos e não críticos: a falha `unknown` não reproduzida e a linha de log ausente (feature 07). | atendido no Linux; confirmar no Windows      |
| A aplicação pode ser empacotada para Windows.                   | Configuração e conferência prontas; o `.exe` ainda não foi gerado.                                                                      | falta o Windows (Etapa 7, passo 1)           |
| O README documenta instalação, uso e limitações.                | Revisão do README (T8.04).                                                                                                              | atendido (conferir contra a instalação real) |

A etapa não fecha nesta máquina, então os itens do `roadmap.md` ficam como estão até a verificação no Windows.

### Problemas encontrados

Nenhum defeito. O `du` do `app.asar` não saiu na listagem (é arquivo, não pasta); o tamanho do pacote fica para o Windows, junto com o do instalador.
