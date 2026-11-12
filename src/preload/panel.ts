import { contextBridge, ipcRenderer } from 'electron'
import { createPanelApi } from './panel-api'

contextBridge.exposeInMainWorld('faiPanel', createPanelApi(ipcRenderer))
