import { contextBridge, ipcRenderer } from 'electron'
import { createChatApi } from './chat-api'

contextBridge.exposeInMainWorld('faiChat', createChatApi(ipcRenderer))
