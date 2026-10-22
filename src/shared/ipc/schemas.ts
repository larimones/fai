import { z } from 'zod'
import type { AppInfo } from '@domain/app-info'
import { IpcChannels } from './channels'

export interface InvokeDefinition<Request, Response> {
  readonly request: z.ZodType<Request>
  readonly response: z.ZodType<Response>
}

export const appInfoSchema = z.strictObject({
  name: z.string().min(1),
  version: z.string().min(1),
  platform: z.string().min(1),
}) satisfies z.ZodType<AppInfo>

/** Request/response schemas for each `invoke` channel, validated in the main process. */
export const invokeContract = {
  [IpcChannels.appGetInfo]: {
    request: z.undefined(),
    response: appInfoSchema,
  } satisfies InvokeDefinition<undefined, AppInfo>,
}
