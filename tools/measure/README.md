# Medição de CPU e memória da Fai

`measure-fai.mjs` mede a Fai que está aberta e compara com as metas do RNF-08 (CPU < 3% e memória < 250 MB). Usa só o Node, sem dependências.

```bash
# com a Fai aberta e parada (npm run preview), na raiz do repositório
node tools/measure/measure-fai.mjs --seconds 60
```

- **CPU:** tempo de processador de todos os processos da Fai durante o intervalo. Mostra a % de um núcleo e a % da máquina; a meta é comparada com a % da máquina, que é o que o Gerenciador de Tarefas do Windows mostra.
- **Memória privada:** a memória que só a Fai usa. No Windows é o contador "Working Set - Private", a coluna "Memória" do Gerenciador de Tarefas; no Linux, `Private_Clean + Private_Dirty` de `/proc/<pid>/smaps_rollup`. No Linux também aparece o PSS, que soma a parte de cada processo na memória compartilhada.
- **Quais processos:** os do Electron do projeto (`node_modules/electron/dist/electron`). Para outro executável, use `--match <trecho do caminho>`.
- **Código de saída:** 0 dentro das metas, 1 acima, 2 se a Fai não estiver aberta.

Para medir a Fai oculta (RNF-08 CA2), oculte-a pela bandeja e rode de novo com `--seconds 20`.
