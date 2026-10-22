# ADR-0009 — Testes, lint e formatação

- **Status:** aceito em 2026-10-22
- **Data:** 2026-10-22

## Decisão

| Ferramenta                                                                                   | Por quê                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vitest**                                                                                   | Usa a mesma transformação do Vite (sem configurar Babel/ts-jest); rápido; API compatível com Jest. Exigido pelo projeto.                                                               |
| **@testing-library/react** + **@testing-library/jest-dom** + **@testing-library/user-event** | Testes de componente pelo comportamento visível; `jest-dom` dá _matchers_ legíveis; `user-event` simula interação real (necessário a partir da Etapa 5; na Etapa 1 só entra se usado). |
| **jsdom**                                                                                    | Ambiente DOM para os testes de componente (definido por arquivo/projeto; domínio roda em `node`).                                                                                      |
| **ESLint 10 (flat config)** + **typescript-eslint** + **eslint-plugin-react-hooks**          | Lint com regras com tipo; `no-restricted-imports` para impor a regra de dependência do domínio.                                                                                        |
| **Prettier** + **eslint-config-prettier**                                                    | Formatação automática sem discussões; desliga regras de estilo do ESLint que conflitam.                                                                                                |

Rejeitados: Jest (configuração extra para TS/ESM), Biome (substituiria ESLint+Prettier, mas sem o ecossistema de regras de React Hooks e restrição de imports com tipo no mesmo nível).

## Consequências

- `npm run check` = `typecheck` + `lint` + `format:check` + `test`, usado antes de cada commit.
- `@testing-library/user-event` ainda não foi instalado: entra na Etapa 5, junto com o primeiro formulário.
- `@testing-library/dom` é instalado explicitamente porque é _peer dependency_ obrigatória do React Testing Library 16.
- O Prettier também formata os Markdown de `specs/`, para que as duas máquinas produzam o mesmo resultado.
