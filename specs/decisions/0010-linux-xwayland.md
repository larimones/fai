# ADR-0010 — Linux roda sob XWayland em desenvolvimento

- **Status:** aceito em 2026-10-23
- **Data:** 2026-10-23

## Contexto

Na verificação da Etapa 2 no Linux (Ubuntu 24.04, GNOME em Wayland, Electron 44), o app caiu com `SIGTRAP` ao mostrar o aviso de dados em quarentena. Reproduzido num app mínimo: `dialog.showMessageBox` (com ou sem janela-mãe, GTK 3 ou 4) derruba o processo quando o Electron usa o backend **Wayland nativo**, que é o padrão quando há sessão Wayland. Com `--ozone-platform=x11` (XWayland) o diálogo funciona.

O ADR-0004 já previa XWayland para a janela da mascote (o Wayland não deixa o app posicionar a janela nem mantê-la sempre no topo). O crash só antecipa essa decisão.

## Decisão

Os scripts `dev` e `preview` passam `--ozone-platform=x11` ao Electron (`electron-vite dev -- --ozone-platform=x11`).

- A escolha do backend acontece antes do script do processo principal rodar: `app.commandLine.appendSwitch('ozone-platform', 'x11')` no código **não** tem efeito (testado). Por isso a flag fica na linha de comando, e não na `DesktopIntegration`.
- No Windows o Chromium não usa Ozone e ignora a flag; o mesmo script vale para as duas máquinas, sem comandos exclusivos de shell.
- Rodar `electron .` direto exige a flag à mão: `electron --ozone-platform=x11 .`.

## Consequências

- Em sessões X11 a flag não muda nada; em Wayland, o app usa XWayland (escala fracionária pode ficar menos nítida).
- O empacotamento para Linux (fora do MVP) precisará levar a flag no lançador (`.desktop`/script).
- Se uma versão futura do Electron corrigir o diálogo no Wayland, a flag continua necessária para a janela da mascote (ADR-0004).
