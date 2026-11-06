/** Every IPC channel the app uses. Nothing else may be sent or handled. */
export const IpcChannels = {
  appGetInfo: 'app:get-info',
  mascotSetInteractive: 'mascot:set-interactive',
  mascotDrag: 'mascot:drag',
  mascotOpenMenu: 'mascot:open-menu',
  /** Main → mascot window. */
  mascotReaction: 'mascot:reaction',
  /** Main → panel window. */
  panelOpened: 'panel:opened',
  tasksList: 'tasks:list',
  tasksCreate: 'tasks:create',
  tasksSetDone: 'tasks:set-done',
  tasksDelete: 'tasks:delete',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
