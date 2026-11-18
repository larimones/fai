# Plano — Feature 08: Empacotamento para Windows

## Perguntas e respostas

| Pergunta                      | Resposta                                                                                                              | Data       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------- |
| Instalação para quem?         | Só para o usuário atual, sem administrador (no `/spec:create`).                                                       | 2026-11-18 |
| Assinatura de código?         | Não; o aviso do SmartScreen fica explicado no README.                                                                 | 2026-11-18 |
| Ícone                         | A estrela dourada (`resources/app-icon.png`, 256×256 RGBA).                                                           | 2026-11-18 |
| Desinstalar                   | Mantém os dados.                                                                                                      | 2026-11-18 |
| Atalhos                       | Menu Iniciar e área de trabalho; abre a Fai ao terminar.                                                              | 2026-11-18 |
| Onde o instalador é gerado?   | **No Windows** (`npm run dist:win`). No Linux, um comando monta o app sem instalador e confere as Fuses e o conteúdo. | 2026-11-18 |
| Versão do primeiro instalador | **1.0.0** (fecha o MVP, com a conversa incluída): `Fai-Setup-1.0.0.exe`.                                              | 2026-11-18 |

Protótipo descartável nesta máquina (Linux, numa cópia do repositório no scratchpad, removida depois), com o electron-builder 26.18.1:

- Com as dependências do main empacotadas pelo electron-vite (`externalizeDeps: false`), o `out/main/index.js` (1,3 MB) só faz `require` de `electron` e de módulos `node:*`: o pacote não precisa de `node_modules`.
- `--win nsis` no Linux montou o app inteiro (`win-unpacked/Fai.exe`, ícone e versão gravados por `resedit`, sem wine, e Fuses aplicadas), mas o passo final do instalador NSIS parou em `spawn wine ENOENT`.
- O `app.asar` só tinha `out/`, `package.json` e os três ícones de `resources/` (sem fontes, testes, specs ou `node_modules`); o app desempacotado tem 373 MB, e o pacote compactado, 116 MB.
- Fuses lidas do próprio `Fai.exe`: as pedidas ficaram como pedidas; uma nona Fuse do Electron 44 aparece como `undefined` para a versão de `@electron/fuses` embutida no electron-builder (1.8).
- **Com `GrantFileProtocolExtraPrivileges` desligada, as três páginas falham ao carregar** (`ERR_FILE_NOT_FOUND` em `app.asar/out/renderer/index.html`); ligada, carregam sem erro. O app usa `file://` para as páginas (ADR-0007), então essa Fuse fica ligada.
- O app empacotado (de Linux, `--linux dir`) abriu com `ELECTRON_RUN_AS_NODE=1` no ambiente: com `RunAsNode` desligada, a variável é ignorada.

## Desenho

```
 npm run dist:win  (no Windows)
   └─ npm run build (electron-vite: main, preloads e renderer; dependências do main empacotadas)
   └─ electron-builder --win nsis --x64 --publish never   (configuração em electron-builder.yml)
        ├─ app.asar: out/** + resources/{app-icon,tray-icon,tray-icon@2x}.png   (nada de node_modules)
        ├─ Fai.exe: ícone da estrela, versão 1.0.0, Electron Fuses aplicadas
        └─ dist/Fai-Setup-1.0.0.exe (NSIS, pt-BR)
             instala em %LOCALAPPDATA%\Programs\Fai, sem administrador
             atalhos "Fai" no Menu Iniciar (AUMID io.github.larimones.fai) e na área de trabalho
             abre a Fai ao terminar; desinstalação fecha a Fai e mantém %APPDATA%\Fai

 npm run pack:check  (em qualquer máquina)
   └─ build + electron-builder --dir (sem instalador) + tools/package/check-package.mjs
        lê as Fuses do executável e lista o app.asar: confere o que deve e o que não pode estar lá
```

**Fuses** (ADR-0007 item 9, ajustado no ADR-0018): `RunAsNode` desligada; `EnableNodeOptionsEnvironmentVariable` desligada; `EnableNodeCliInspectArguments` desligada; `EnableEmbeddedAsarIntegrityValidation` ligada; `OnlyLoadAppFromAsar` ligada; `EnableCookieEncryption` ligada; `LoadBrowserProcessSpecificV8Snapshot` desligada (padrão); **`GrantFileProtocolExtraPrivileges` ligada** (padrão), porque as páginas são carregadas de `file://`.

**Nada muda no app em si.** O ID (`io.github.larimones.fai`) já é o do `setAppUserModelId` (ADR-0016), e o electron-builder grava o mesmo ID no atalho do Menu Iniciar, que é o que o Windows usa para o nome e o ícone das notificações. A pasta de dados (`%APPDATA%\Fai`) vem do `productName` "Fai", a mesma do desenvolvimento, então o app instalado encontra os dados de hoje.

## Mudanças por camada

- `src/**`: nenhuma mudança de comportamento. Se a verificação no Windows mostrar algo que dependa do app empacotado (caminhos dentro do `app.asar`), corrige-se com teste.
- `electron.vite.config.mts`: `main.build.externalizeDeps: false` (dependências do main dentro do `out/`).
- `package.json`: versão `1.0.0`; `description` corrigida ("ilustrada", não mais "pixel art", ADR-0011); `@anthropic-ai/sdk`, `zod`, `react` e `react-dom` passam a `devDependencies` (todos vão empacotados no `out/`; nada em `dependencies` = nenhum `node_modules` no instalador); scripts `dist:win` (`npm run build && electron-builder --win nsis --x64 --publish never`) e `pack:check` (`npm run build && electron-builder --dir --publish never && node tools/package/check-package.mjs`), sem comandos de um shell só.
- `electron-builder.yml` (novo): `appId`, `productName`, `artifactName: Fai-Setup-${version}.${ext}`, `files` (só `out/**` e os três ícones), `directories.output: dist`, `win` (NSIS x64, ícone), `nsis` (`oneClick: false`, `perMachine: false`, `allowElevation: false`, `allowToChangeInstallationDirectory: false`, atalhos na área de trabalho e no Menu Iniciar com o nome "Fai", `runAfterFinish: true`, `deleteAppDataOnUninstall: false`, idioma pt-BR), `electronFuses`.
- `tools/package/check-package.mjs` (novo): acha o executável montado (`dist/win-unpacked/Fai.exe` ou `dist/linux-unpacked/fai`), lê as Fuses com `@electron/fuses` e lista o `app.asar` com `@electron/asar`; falha se uma Fuse estiver diferente do ADR-0018, se faltar `out/main/index.js`, um preload, uma das três páginas ou os ícones, ou se aparecer `node_modules`, `src/`, `specs/`, `tests/`, arquivos `*.test.*`, `*.map`, `.env` ou `*-source.*`. Código de saída 0 ou 1, como o `tools/measure/`.
- README: seção "Instalar no Windows" (baixar ou gerar o instalador, o aviso do SmartScreen, onde fica instalado, atalhos, desinstalar, onde ficam os dados e como apagá-los), "Limitações" (sem assinatura, sem atualização automática, Linux só em desenvolvimento, notificações dependem do atalho do Menu Iniciar, conversa precisa de internet e chave), comandos `dist:win` e `pack:check`.
- `specs/features/08-empacotamento-windows/security-review.md` (novo, na verificação): revisão de segurança do app empacotado (CA8).
- `specs/roadmap.md`: "Definição de pronto do MVP" conferida item a item (CA10), na verificação.

## Segurança

- Fuses fecham três portas de execução de código pelo ambiente (`ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, `--inspect`) e garantem que só o `app.asar` íntegro é carregado.
- `GrantFileProtocolExtraPrivileges` fica ligada por necessidade (páginas em `file://`); o risco que ela cobre (uma página `file://` ler outros arquivos) continua limitado pela CSP (`default-src 'none'`, `connect-src 'self'`), pelo bloqueio de navegação e pelo `sandbox`. Trocar `file://` por um protocolo próprio fica registrado como alternativa, fora desta etapa.
- O pacote não leva fontes, testes, specs, mapas de código, segredos nem `node_modules` (conferido pelo `check-package.mjs`).
- Sem assinatura: o Windows avisa na primeira execução; o README ensina a conferir a origem do arquivo (gerado pela própria dona do projeto).
- CSP, IPC, preloads e permissões: sem mudança.

## Dependências novas

Todas só de desenvolvimento (não vão no instalador):

- **`electron-builder` 26.18.1** (publicado em 2026-10-26): o empacotador escolhido no ADR-0001; gera o NSIS, grava ícone e versão no `.exe` sem wine e aplica as Fuses.
- **`@electron/fuses` 2.1.3**: para o `check-package.mjs` ler as Fuses do executável; a versão embutida no electron-builder (1.8) não conhece a nona Fuse do Electron 44.
- **`@electron/asar` 3.4.1**: para o `check-package.mjs` listar o `app.asar` (a mesma versão que o electron-builder usa).

## ADRs

- **ADR-0018 (novo):** empacotamento para Windows: electron-builder, NSIS por usuário, configuração, dependências empacotadas no `out/`, Fuses (com `GrantFileProtocolExtraPrivileges` ligada e o porquê), instalador gerado no Windows, `pack:check`, versão 1.0.0, sem assinatura.
- **ADR-0007:** item 9 aponta para o ADR-0018 (Fuses ajustadas pelo protótipo).

## Estratégia de testes

- **Automatizados** (`npm run check`):
  - Teste de configuração: `electron-builder.yml` com o `appId` igual ao `APP_USER_MODEL_ID` do app, `productName` "Fai", NSIS por usuário sem elevação, atalhos, `runAfterFinish`, `deleteAppDataOnUninstall: false`, e as Fuses iguais à lista do ADR-0018 (a mesma lista que o `check-package.mjs` usa).
  - Teste do `check-package.mjs` com Fuses e listas falsas: aceita o pacote certo; recusa Fuse errada, arquivo proibido e arquivo faltando.
  - `package.json`: `dependencies` vazio; scripts sem comandos de um shell só.
- **Roteiro automatizado com o app construído:**
  - Linux (aqui): `npm run pack:check` com saída 0; o app desempacotado de Linux abre com `ELECTRON_RUN_AS_NODE=1`, cria as três janelas e não registra erros de carga.
  - Windows: `npm run dist:win` gera `dist/Fai-Setup-1.0.0.exe`; `npm run pack:check` passa; tamanho do instalador anotado.
- **Manual (Windows):** passar pelo SmartScreen; instalar sem administrador; atalhos e ícone; a Fai abre ao terminar; notificação de lembrete com nome "Fai" e o clique abrindo o painel; os fluxos principais (Fai, painel, lembretes, conversa); desinstalar com a Fai aberta (fecha e não sobra processo); reinstalar e encontrar os dados e a chave.

## Riscos

| Risco                                                                                                                            | Mitigação                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A verificação só pode ser feita no Windows (instalar, notificações, DPAPI).                                                      | O `pack:check` cobre no Linux o que dá (Fuses, conteúdo, app abrindo); o roteiro manual do Windows é curto e combina com as verificações pendentes das features 06 e 07. |
| `onlyLoadAppFromAsar` e a integridade do `asar` impedirem algo em tempo de execução (por exemplo, ler os ícones de `resources`). | No protótipo a Fai abriu com as três janelas e a bandeja sem erro; o roteiro do Windows confere a bandeja e as notificações.                                             |
| A nona Fuse do Electron 44 ficar com um valor inseguro sem querer.                                                               | O `check-package.mjs` lê com `@electron/fuses` 2.1.3, que a conhece pelo nome, e o ADR registra o valor esperado.                                                        |
| SmartScreen bloquear de vez ou o antivírus desconfiar do `.exe` sem assinatura.                                                  | O README explica o aviso; se o antivírus barrar, registrar e avaliar assinatura numa etapa futura.                                                                       |
| Notificações sem o nome "Fai" mesmo instalada.                                                                                   | O atalho do Menu Iniciar com o mesmo AUMID é o mecanismo do Windows; conferido no roteiro manual.                                                                        |
| A chave da IA não voltar depois de reinstalar (DPAPI).                                                                           | Conferido no roteiro manual; a cifra é por usuário do Windows, então reinstalar na mesma conta deve decifrar.                                                            |
| Instalador grande (perto de 116 MB).                                                                                             | É o tamanho do Electron; anotado no README.                                                                                                                              |
