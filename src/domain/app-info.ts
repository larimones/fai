export interface AppInfo {
  readonly name: string
  readonly version: string
  readonly platform: string
}

const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  win32: 'Windows',
  linux: 'Linux',
  darwin: 'macOS',
}

export function describeAppInfo(info: AppInfo): string {
  const platform = PLATFORM_LABELS[info.platform] ?? info.platform
  return `${info.name} v${info.version} · ${platform}`
}
