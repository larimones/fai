# ADR-0003 — Persistência local: JSON versionado

- **Status:** proposto
- **Data:** 2026-10-22

## Contexto

Precisamos guardar tarefas, lembretes e a posição da Fai. Volume esperado: dezenas a poucas centenas de registros. Um único processo grava (o main). Primeiro alvo é o Windows, onde módulos nativos custam caro.

## Alternativas

| Opção | Prós | Contras |
|---|---|---|
| **JSON versionado (arquivo único)** | Zero dependência nativa; legível e fácil de depurar/fazer backup; testável com `fs` em diretório temporário; migrações são funções puras. | Reescreve o arquivo inteiro a cada gravação (irrelevante nesse volume); sem consultas; atomicidade é responsabilidade nossa. |
| SQLite via `better-sqlite3` | Transações, consultas, escala. | Módulo nativo: precisa ser recompilado para o ABI do Electron (`@electron/rebuild`), exige toolchain C++ (Visual Studio Build Tools) no Windows quando não há binário pronto, quebra a cada atualização de Electron, complica o empacotamento (`asarUnpack`). |
| SQLite embutido do Node (`node:sqlite`) | Sem binário extra. | Ainda experimental no Node embutido no Electron; API instável. |
| `electron-store` | Pronto para usar. | Dependência para algo pequeno que queremos controlar (migrações, quarentena, testes com caminho injetado). |

## Decisão

**Arquivo JSON único** em `userData/fai-data.json`, com:

- campo `schemaVersion` e migrações sequenciais puras (`v1 → v2 → …`) no domínio;
- validação com zod na leitura;
- escrita atômica (`*.tmp` + `rename`), serializada em fila, com *debounce*; novas tentativas curtas em `EPERM`/`EBUSY` (antivírus no Windows);
- arquivo inválido é preservado como `fai-data.corrupt-<timestamp>.json` e o app inicia vazio, avisando.

O acesso fica atrás de um `DataStore` (load/save), para que trocar por SQLite no futuro afete só a camada de persistência.

## Consequências

- Nenhum módulo nativo no MVP → instalação e empacotamento simples no Windows.
- Se o volume crescer muito (ex.: histórico longo), reavaliar SQLite em novo ADR.
