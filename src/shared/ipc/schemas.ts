import { z } from 'zod'
import type { AppInfo } from '@domain/app-info'
import type { Reminder } from '@domain/reminders/reminders'
import type { Task } from '@domain/tasks/tasks'
import type {
  ChatOpened,
  ChatPlaced,
  ChatReplyDelta,
  ChatReplyError,
  ChatSaveKeyRequest,
  ChatSendRequest,
  CreateReminderRequest,
  CreateTaskRequest,
  DeleteReminderRequest,
  DeleteTaskRequest,
  DragMessage,
  MascotReaction,
  PanelOpened,
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

/** A reminder as the main process returns it (shape only; the text rule lives in the domain). */
export const reminderSchema = z.strictObject({
  id: z.uuid(),
  text: z.string().min(1),
  dueAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  notifiedAt: z.iso.datetime().nullable(),
  late: z.boolean(),
}) satisfies z.ZodType<Reminder>

/** Caps what the renderer can send; the domain then applies the real title rule. */
const MAX_TITLE_PAYLOAD = 1000

/** Caps a chat message; the domain then counts code points (1 to 1000), so emoji fit. */
const MAX_CHAT_PAYLOAD = 4000

/** Caps a reply piece or a failure message sent to the bubble. */
const MAX_CHAT_EVENT_TEXT = 20_000

/** An API key as pasted: no spaces; its real check is the AI service accepting it. */
const apiKeySchema = z.string().min(1).max(500).regex(/^\S+$/)

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
  [IpcChannels.remindersList]: {
    request: z.undefined(),
    response: z.array(reminderSchema),
  } satisfies InvokeDefinition<undefined, readonly Reminder[]>,
  [IpcChannels.remindersCreate]: {
    request: z.strictObject({ text: z.string().max(MAX_TITLE_PAYLOAD), dueAt: z.iso.datetime() }),
    response: reminderSchema,
  } satisfies InvokeDefinition<CreateReminderRequest, Reminder>,
  [IpcChannels.remindersDelete]: {
    request: z.strictObject({ id: z.uuid() }),
    response: z.null(),
  } satisfies InvokeDefinition<DeleteReminderRequest, null>,
  [IpcChannels.chatSend]: {
    request: z.strictObject({ text: z.string().max(MAX_CHAT_PAYLOAD) }),
    response: z.null(),
  } satisfies InvokeDefinition<ChatSendRequest, null>,
  [IpcChannels.chatSaveKey]: {
    request: z.strictObject({ key: apiKeySchema }),
    response: z.null(),
  } satisfies InvokeDefinition<ChatSaveKeyRequest, null>,
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
    kind: z.enum(['celebrate', 'reminder', 'reply']),
  }) satisfies z.ZodType<MascotReaction>,
  [IpcChannels.panelOpened]: z.strictObject({
    tab: z.enum(['tasks', 'reminders']),
  }) satisfies z.ZodType<PanelOpened>,
  [IpcChannels.remindersChanged]: z.undefined(),
  [IpcChannels.chatOpened]: z.strictObject({
    mode: z.enum(['chat', 'key']),
    hasKey: z.boolean(),
    keyPersists: z.boolean(),
  }) satisfies z.ZodType<ChatOpened>,
  [IpcChannels.chatPlaced]: z.strictObject({
    tail: z.enum(['down', 'left', 'right']),
    tailAt: z.int().min(0).max(1000),
  }) satisfies z.ZodType<ChatPlaced>,
  [IpcChannels.chatReplyDelta]: z.strictObject({
    text: z.string().max(MAX_CHAT_EVENT_TEXT),
  }) satisfies z.ZodType<ChatReplyDelta>,
  [IpcChannels.chatReplyEnd]: z.undefined(),
  [IpcChannels.chatReplyError]: z.strictObject({
    message: z.string().min(1).max(MAX_CHAT_EVENT_TEXT),
    text: z.string().max(MAX_CHAT_PAYLOAD),
  }) satisfies z.ZodType<ChatReplyError>,
}
