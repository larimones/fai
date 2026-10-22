# ADR-0008 — Validação de payloads com zod

- **Status:** aceito em 2026-10-22
- **Data:** 2026-10-22

## Contexto

O renderer é tratado como não confiável: todo payload de IPC e todo dado lido do disco precisa ser validado em tempo de execução, e queremos que os tipos TypeScript venham da mesma definição.

## Alternativas

| Opção                      | Prós                                                                                                | Contras                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **zod**                    | Schema → tipo (`z.infer`), mensagens de erro claras, sem dependências transitivas, muito difundido. | Uma dependência de runtime (~dezenas de KB).                                 |
| Validadores escritos à mão | Zero dependência.                                                                                   | Duplicação tipo/validador, fácil esquecer um campo; mais código para testar. |
| valibot                    | Menor que zod.                                                                                      | Menos difundido; API menos familiar.                                         |

## Decisão

**zod** em `src/shared` (contrato IPC) e na persistência. O domínio não depende de zod.

## Consequências

- Os schemas vão para o bundle do preload (sandbox) e do main; nada é carregado em runtime por `require` dinâmico.
