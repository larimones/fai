# ADR-0018 — Empacotamento para Windows

- **Status:** aceito em 2026-11-18 (implementação na Etapa 7; ajusta o item 9 do ADR-0007)
- **Data:** 2026-11-18

## Contexto

A Etapa 7 entrega um instalador para Windows (RNF-13) e fecha o MVP. O ADR-0001 já escolheu o electron-builder; o ADR-0007 listou as Fuses; o ADR-0016 definiu o `AppUserModelID`. Um protótipo descartável no Linux (electron-builder 26.18.1, Electron 44.9.3) mostrou: o app do Windows é montado no Linux sem wine, mas o instalador NSIS precisa dele; com as dependências do main empacotadas, o pacote não precisa de `node_modules`; e as páginas em `file://` não carregam com a Fuse `GrantFileProtocolExtraPrivileges` desligada.

## Decisão

1. **electron-builder 26.18.1**, configurado em `electron-builder.yml`. Instalador **NSIS x64 por usuário** (`perMachine: false`, sem elevação, sem escolher pasta), assistente em pt-BR, atalhos "Fai" no Menu Iniciar e na área de trabalho, abre a Fai ao terminar, **desinstalar mantém `%APPDATA%\Fai`** (escolhas da dona do projeto). `appId` = `io.github.larimones.fai`, o mesmo do `setAppUserModelId` (ADR-0016), gravado no atalho do Menu Iniciar. Ícone: `resources/app-icon.png`. Versão **1.0.0**, arquivo `Fai-Setup-1.0.0.exe`.
2. **Sem `node_modules` no pacote:** o electron-vite empacota também as dependências do main (`externalizeDeps: false`); todas as dependências do app ficam em `devDependencies`, e o `app.asar` leva só `out/**` e os três ícones de `resources/`.
3. **Fuses:** `RunAsNode`, `EnableNodeOptionsEnvironmentVariable` e `EnableNodeCliInspectArguments` desligadas; `EnableEmbeddedAsarIntegrityValidation`, `OnlyLoadAppFromAsar` e `EnableCookieEncryption` ligadas; `LoadBrowserProcessSpecificV8Snapshot` desligada; **`GrantFileProtocolExtraPrivileges` ligada**, porque as páginas são carregadas de `file://` e, sem ela, não carregam de dentro do `app.asar` (protótipo). As outras Fuses do Electron 44 ficam no padrão.
4. **O instalador é gerado no Windows** (`npm run dist:win`); no Linux, `npm run pack:check` monta o app sem instalador e confere Fuses e conteúdo com `tools/package/check-package.mjs`.
5. **Sem assinatura de código** por enquanto; o README explica o aviso do SmartScreen.

## Alternativas consideradas

- **Protocolo próprio (`app://`) em vez de `file://`**, para poder desligar `GrantFileProtocolExtraPrivileges`: mais restrito, mas muda como as três páginas são carregadas, a CSP e o verificador de URL; fica para depois do MVP.
- **Instalar o wine no Linux** para gerar o instalador nas duas máquinas: a dona do projeto preferiu gerar no Windows, onde ele também é testado.
- **Manter as dependências do main em `node_modules`:** pacote maior, com mais arquivos fora da conferência.
- **Instalação para todos os usuários ou MSIX:** pedem administrador ou loja; fora do uso pessoal.

## Consequências

- Os dados do desenvolvimento e do app instalado são os mesmos (`%APPDATA%\Fai`): instalar não perde nada, e desinstalar não apaga nada.
- O Windows avisa na primeira execução (sem assinatura).
- Mudar a forma de carregar as páginas no futuro deve rever a Fuse `GrantFileProtocolExtraPrivileges`.
