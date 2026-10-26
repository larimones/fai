/** Every IPC channel the app uses. Nothing else may be sent or handled. */
export const IpcChannels = {
  appGetInfo: 'app:get-info',
  mascotSetInteractive: 'mascot:set-interactive',
  mascotDrag: 'mascot:drag',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
