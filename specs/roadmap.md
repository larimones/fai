# Roadmap do MVP

Cada etapa termina com: `npm run check` passando (saída real registrada), critérios de aceitação conferidos, specs/README atualizados e `tasks.md` da etapa fechado. O `tasks.md` de cada etapa só é escrito quando a etapa anterior termina.

| Etapa | Nome                              | Entrega                                                                                                                                                                                                                     | Requisitos                          |
| ----- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1     | Fundação executável               | Projeto electron-vite + React + TS strict; janela principal segura; IPC tipado e validado (`app:get-info`); CSP; Vitest/RTL/ESLint/Prettier; testes de infraestrutura; README de instalação.                                | RF-01, RNF-01..06, RNF-14 (parcial) |
| 2     | Base do aplicativo residente      | Instância única; ícone e menu na bandeja; `DataStore` JSON (atômico, versionado, migração, quarentena); primeira implementação da `DesktopIntegration`.                                                                     | RF-02, RF-03, RF-17 (base), RNF-07  |
| 3     | Janela da mascote                 | Janela transparente, sem moldura, always-on-top, sem foco; click-through com hit-test (Windows); arrasto por IPC; posição persistida e corrigida entre monitores; sprite estático _placeholder_; roteiro `manual-tests.md`. | RF-04..07                           |
| 4     | Animação e reações                | Leitor de metadado (Aseprite JSON); máquina de estados; renderizador canvas nítido com DPR; animações `idle`, `react`, `dragged`, `celebrate`; pausa quando oculta; medição de CPU/memória.                                 | RF-08, RF-09, RNF-08                |
| 5     | Tarefas                           | Janela do painel; menu de contexto da Fai; criar/concluir/reabrir/excluir tarefas; persistência; comemoração ao concluir; acessibilidade.                                                                                   | RF-10..13, RF-17, RNF-10            |
| 6     | Lembretes e notificações          | Criar/excluir lembretes; agendador por _poll_ + `resume`; notificação nativa; lembretes perdidos; clique abre painel.                                                                                                       | RF-14..16, RF-17                    |
| 7     | Empacotamento e fechamento do MVP | electron-builder (NSIS) para Windows; AppUserModelID; ícones; Electron Fuses; revisão de segurança; README de uso e limitações; checklist da definição de pronto.                                                           | RNF-13, RNF-14                      |

## Definição de pronto do MVP

- [ ] A mascote é transparente, flutuante e arrastável.
- [ ] As animações e as reações a cliques funcionam.
- [ ] É possível criar, concluir e excluir tarefas.
- [ ] Os lembretes são persistidos e geram notificações locais.
- [ ] Os dados sobrevivem ao reinício do aplicativo.
- [ ] Os fluxos críticos têm testes automatizados.
- [ ] Não há erros críticos conhecidos de segurança ou funcionamento.
- [ ] A aplicação pode ser empacotada para Windows.
- [ ] O README documenta instalação, uso e limitações.
