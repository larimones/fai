import { contextBridge, ipcRenderer } from 'electron'
import { createMascotApi } from './mascot-api'

contextBridge.exposeInMainWorld('fai', createMascotApi(ipcRenderer))
