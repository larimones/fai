import { contextBridge, ipcRenderer } from 'electron'
import { createMainApi } from './main-api'

contextBridge.exposeInMainWorld('fai', createMainApi(ipcRenderer))
