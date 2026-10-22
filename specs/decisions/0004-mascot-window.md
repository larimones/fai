# ADR-0004 — Janela da mascote

- **Status:** aceito em 2026-10-22 (implementação na Etapa 3)
- **Data:** 2026-10-22

## Contexto

A Fai precisa parecer "solta" na tela: sem moldura, fundo transparente, acima das outras janelas, arrastável, e sem bloquear cliques ao redor do desenho dela.

## Decisão

Uma `BrowserWindow` dedicada, pequena (tamanho fixo, ex.: 192×192 px lógicos, ajustado ao sprite final), com:

```ts
{
  transparent: true, frame: false, backgroundColor: '#00000000',
  alwaysOnTop: true, skipTaskbar: true, resizable: false,
  focusable: false, hasShadow: false, show: false,
  webPreferences: secureWebPreferences('mascot')
}
// depois: win.setAlwaysOnTop(true, 'floating'); win.showInactive();
```

### Cliques atravessando as áreas vazias

1. A janela começa com `setIgnoreMouseEvents(true, { forward: true })`: cliques passam para trás, mas o renderer **continua recebendo `mousemove`** (é isso que o `forward` faz).
2. A cada `mousemove`, o renderer faz _hit-test_ por pixel: lê o alfa do pixel do canvas sob o cursor. Alfa acima do limiar → envia `mascot:set-interactive { interactive: true }`; ao sair do desenho → `false`.
3. O main alterna `setIgnoreMouseEvents(false)` / `setIgnoreMouseEvents(true, { forward: true })`, só quando o estado muda (evita IPC a cada pixel).

### Arrasto

Não usamos `-webkit-app-region: drag`: no Windows a região de arrasto engole os eventos de mouse (perderíamos clique e menu) e não combina com o click-through. Em vez disso, o renderer envia `mascot:drag` (`start`/`move`/`end`) com `screenX/screenY`; o main calcula o deslocamento e chama `win.setPosition(x, y)` com inteiros. Mantemos tamanho fixo e só mudamos posição (no Windows, `setBounds` entre monitores com DPI diferente pode alterar o tamanho da janela).

## Limitações conhecidas

**Windows**

- `transparent: true` não combina com redimensionamento pelas bordas nem com maximizar (não precisamos de nenhum dos dois).
- Abrir o DevTools acoplado quebra a transparência; usar `mode: 'detach'`.
- Escala de tela fracionária (125%, 150%) pode borrar pixel art; tratado no ADR-0005.
- Apps em tela cheia exclusiva (jogos) ficam por cima da Fai — aceitável e até desejável (discrição).
- `focusable: false` impede teclado na janela da mascote; toda entrada de texto fica no painel.

**Linux**

- A opção `forward` de `setIgnoreMouseEvents` **não existe no Linux**: com click-through ligado, a janela para de receber `mousemove` e não há como saber quando o cursor volta para a Fai. Estratégia Linux do MVP: janela do tamanho do sprite, **sem** click-through (as áreas transparentes da caixa bloqueiam cliques). Alternativa a estudar na versão Linux: `win.setShape()` com retângulos aproximando o contorno.
- Transparência exige compositor ativo (padrão em GNOME/KDE). Sem compositor, o fundo aparece preto.
- **Wayland**: o compositor não permite que apps posicionem janelas nem as mantenham sempre no topo; arrasto e `alwaysOnTop` falham. Recomendação: rodar sob XWayland (`--ozone-platform=x11`), documentado no README.
- Em X11, alguns ambientes precisam de um pequeno atraso antes de criar a janela transparente.

Esses pontos ficam encapsulados na `DesktopIntegration` (ex.: `enableClickThrough(win)` no Windows; no-op no Linux), como descrito em `architecture.md`.

## Alternativas consideradas

- **Janela em tela cheia transparente com click-through**: simplifica coordenadas, mas cobre o desktop inteiro, desperdiça GPU e piora os problemas no Linux.
- **Janela do tamanho do sprite sem click-through (também no Windows)**: mais simples, mas o retângulo transparente bloquearia cliques ao redor da Fai, contrariando o princípio "discreta".
