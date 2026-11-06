import { z } from 'zod'
import type { AppInfo } from '@domain/app-info'
import type { Task } from '@domain/tasks/tasks'
import type {
  CreateTaskRequest,
  DeleteTaskRequest,
  DragMessage,
  MascotReaction,
  SetInteractiveMessage,
  SetTaskDoneRequest,
} from './api'
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

/**
 * A task as the main process returns it. The full title rule (trim, 1 to 200 characters) lives
 * in the domain; this layer may only use the domain's types, so it checks the shape.
 */
export const taskSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
}) satisfies z.ZodType<Task>

/** Caps what the renderer can send; the domain then applies the real title rule. */
const MAX_TITLE_PAYLOAD = 1000

/** Request/response schemas for each `invoke` channel, validated in the main process. */
export const invokeContract = {
  [IpcChannels.appGetInfo]: {
    request: z.undefined(),
    response: appInfoSchema,
  } satisfies InvokeDefinition<undefined, AppInfo>,
  [IpcChannels.tasksList]: {
    request: z.undefined(),
    response: z.array(taskSchema),
  } satisfies InvokeDefinition<undefined, readonly Task[]>,
  [IpcChannels.tasksCreate]: {
    request: z.strictObject({ title: z.string().max(MAX_TITLE_PAYLOAD) }),
    response: taskSchema,
  } satisfies InvokeDefinition<CreateTaskRequest, Task>,
  [IpcChannels.tasksSetDone]: {
    request: z.strictObject({ id: z.uuid(), done: z.boolean() }),
    response: taskSchema,
  } satisfies InvokeDefinition<SetTaskDoneRequest, Task>,
  [IpcChannels.tasksDelete]: {
    request: z.strictObject({ id: z.uuid() }),
    response: z.null(),
  } satisfies InvokeDefinition<DeleteTaskRequest, null>,
}

/** Payload schemas for each `send` channel (renderer → main, no reply), validated in the main process. */
export const sendContract = {
  [IpcChannels.mascotSetInteractive]: z.strictObject({
    interactive: z.boolean(),
  }) satisfies z.ZodType<SetInteractiveMessage>,
  [IpcChannels.mascotDrag]: z.strictObject({
    phase: z.enum(['start', 'move', 'end']),
  }) satisfies z.ZodType<DragMessage>,
  [IpcChannels.mascotOpenMenu]: z.undefined(),
}

/** Payload schemas for each event the main process sends to a window; the preload checks them. */
export const eventContract = {
  [IpcChannels.mascotReaction]: z.strictObject({
    kind: z.literal('celebrate'),
  }) satisfies z.ZodType<MascotReaction>,
  [IpcChannels.panelOpened]: z.undefined(),
}
