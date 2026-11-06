#!/usr/bin/env node
// Measures the running Fai's CPU and memory against the RNF-08 targets.
//
// Usage (with Fai open and idle):
//   node tools/measure/measure-fai.mjs [--seconds 60] [--match <text>]
//
// Exit code: 0 within the targets, 1 above them, 2 when no Fai process is found.

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { parseArgs } from 'node:util'

const TARGET_CPU_PERCENT = 3
const TARGET_MEMORY_MB = 250

const { values } = parseArgs({
  options: {
    seconds: { type: 'string', default: '60' },
    match: { type: 'string' },
  },
})
const seconds = Number(values.seconds)
if (!Number.isFinite(seconds) || seconds <= 0) {
  console.error('--seconds precisa ser um número positivo.')
  process.exit(2)
}

/** Chromium process type from a command line: main, renderer, gpu-process… */
function processType(commandLine) {
  return /--type=([a-z-]+)/.exec(commandLine)?.[1] ?? 'main'
}

const linux = {
  defaultMatch: '/node_modules/electron/dist/electron',
  ticksPerSecond: Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' })) || 100,

  list(match) {
    return readdirSync('/proc')
      .filter((name) => /^\d+$/.test(name))
      .flatMap((pid) => {
        try {
          const argv = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0')
          return argv[0]?.includes(match)
            ? [{ pid: Number(pid), type: processType(argv.join(' ')) }]
            : []
        } catch {
          return []
        }
      })
  },

  /** CPU seconds used so far, per pid. */
  cpuSeconds(pids) {
    const result = new Map()
    for (const pid of pids) {
      try {
        // Fields after the command name, which may contain spaces: utime and stime are 14 and 15.
        const fields = readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')
        result.set(pid, (Number(fields[11]) + Number(fields[12])) / this.ticksPerSecond)
      } catch {
        // The process ended during the measurement.
      }
    }
    return result
  },

  /** Private memory (what only this process uses) and PSS, in MB, per pid. */
  memory(pids) {
    const result = new Map()
    for (const pid of pids) {
      try {
        const rollup = readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8')
        const kb = (name) => Number(new RegExp(`^${name}:\\s+(\\d+)`, 'm').exec(rollup)?.[1] ?? 0)
        result.set(pid, {
          privateMb: (kb('Private_Clean') + kb('Private_Dirty')) / 1024,
          pssMb: kb('Pss') / 1024,
        })
      } catch {
        // The process ended during the measurement.
      }
    }
    return result
  },
}

function powershell(script) {
  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    {
      encoding: 'utf8',
    },
  ).trim()
  if (output === '') {
    return []
  }
  const parsed = JSON.parse(output)
  // ConvertTo-Json returns a bare object, not an array, when there is a single item.
  return Array.isArray(parsed) ? parsed : [parsed]
}

const windows = {
  defaultMatch: '\\node_modules\\electron\\dist\\electron.exe',

  processes() {
    return powershell(
      'Get-CimInstance Win32_Process -Filter "Name=\'electron.exe\'" | ' +
        'Select-Object ProcessId,ExecutablePath,CommandLine,UserModeTime,KernelModeTime | ConvertTo-Json -Compress',
    )
  },

  list(match) {
    return this.processes()
      .filter((process) =>
        (process.ExecutablePath ?? '').toLowerCase().includes(match.toLowerCase()),
      )
      .map((process) => ({ pid: process.ProcessId, type: processType(process.CommandLine ?? '') }))
  },

  cpuSeconds(pids) {
    const result = new Map()
    for (const process of this.processes()) {
      if (pids.includes(process.ProcessId)) {
        // Win32_Process reports times in 100 ns units.
        result.set(
          process.ProcessId,
          (Number(process.UserModeTime) + Number(process.KernelModeTime)) / 1e7,
        )
      }
    }
    return result
  },

  /** "Working Set - Private": the Memory column of Task Manager, in MB, per pid. */
  memory(pids) {
    const rows = powershell(
      'Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | ' +
        'Select-Object IDProcess,WorkingSetPrivate | ConvertTo-Json -Compress',
    )
    const result = new Map()
    for (const row of rows) {
      if (pids.includes(row.IDProcess)) {
        result.set(row.IDProcess, {
          privateMb: Number(row.WorkingSetPrivate) / 1024 / 1024,
          pssMb: null,
        })
      }
    }
    return result
  },
}

const system = process.platform === 'win32' ? windows : process.platform === 'linux' ? linux : null
if (system === null) {
  console.error(`Plataforma não suportada: ${process.platform}.`)
  process.exit(2)
}

const found = system.list(values.match ?? system.defaultMatch)
if (found.length === 0) {
  console.error('Nenhum processo da Fai encontrado. Abra a Fai (npm run preview) e tente de novo.')
  process.exit(2)
}
const pids = found.map(({ pid }) => pid)
const cores = availableParallelism()

console.log(
  `Medindo ${String(found.length)} processos por ${String(seconds)} s (${String(cores)} núcleos)...`,
)
const before = system.cpuSeconds(pids)
await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
const after = system.cpuSeconds(pids)
const memory = system.memory(pids)

const rows = found.map(({ pid, type }) => {
  const cpuCore = ((after.get(pid) ?? 0) - (before.get(pid) ?? 0)) * (100 / seconds)
  return { pid, type, cpuCore, ...(memory.get(pid) ?? { privateMb: 0, pssMb: null }) }
})
const totalCpuCore = rows.reduce((sum, row) => sum + row.cpuCore, 0)
const totalCpuMachine = totalCpuCore / cores
const totalPrivate = rows.reduce((sum, row) => sum + row.privateMb, 0)
const totalPss = rows.every((row) => row.pssMb === null)
  ? null
  : rows.reduce((sum, row) => sum + (row.pssMb ?? 0), 0)

const fixed = (value, digits) => value.toFixed(digits).padStart(7)
console.log('\n  pid      tipo                CPU (1 núcleo)   memória privada')
for (const row of rows.sort((a, b) => b.privateMb - a.privateMb)) {
  console.log(
    `  ${String(row.pid).padEnd(8)} ${row.type.padEnd(20)} ${fixed(row.cpuCore, 2)} %       ${fixed(row.privateMb, 1)} MB`,
  )
}
const cpuOk = totalCpuMachine < TARGET_CPU_PERCENT
const memoryOk = totalPrivate < TARGET_MEMORY_MB
console.log(
  `\nCPU: ${totalCpuCore.toFixed(2)}% de um núcleo = ${totalCpuMachine.toFixed(2)}% da máquina`,
)
console.log(
  `     (meta RNF-08: < ${String(TARGET_CPU_PERCENT)}% da máquina, como no Gerenciador de Tarefas) ${cpuOk ? 'OK' : 'ACIMA'}`,
)
console.log(
  `Memória privada: ${totalPrivate.toFixed(0)} MB (meta: < ${String(TARGET_MEMORY_MB)} MB) ${memoryOk ? 'OK' : 'ACIMA'}`,
)
if (totalPss !== null) {
  console.log(`PSS (inclui a parte de cada um na memória compartilhada): ${totalPss.toFixed(0)} MB`)
}
process.exit(cpuOk && memoryOk ? 0 : 1)
