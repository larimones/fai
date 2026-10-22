# ADR-0009 — Testes, lint e formatação

- **Status:** proposto
- **Data:** 2026-10-22

## Decisão

| Ferramenta | Por quê |
|---|---|
| **Vitest** | Usa a mesma transformação do Vite (sem configurar Babel/ts-jest); rápido; API compatível com Jest. Exigido pelo projeto. |
| **@testing-library/react** + **@testing-library/jest-dom** + **@testing-library/user-event** | Testes de componente pelo comportamento visível; `jest-dom` dá *matchers* legíveis; `user-event` simula interação real (necessário a partir da Etapa 5; na Etapa 1 só entra se usado). |
| **jsdom** | Ambiente DOM para os testes de componente (definido por arquivo/projeto; domínio roda em `node`). |
| **ESLint 9 (flat config)** + **typescript-eslint** + **eslint-plugin-react-hooks** | Lint com regras com tipo; `no-restricted-imports` para impor a regra de dependência do domínio. |
| **Prettier** + **eslint-config-prettier** | Formatação automática sem discussões; desliga regras de estilo do ESLint que conflitam. |

Rejeitados: Jest (configuração extra para TS/ESM), Biome (substituiria ESLint+Prettier, mas sem o ecossistema de regras de React Hooks e restrição de imports com tipo no mesmo nível).

## Consequências

- `npm run check` = `typecheck` + `lint` + `test`, usado antes de cada commit.
