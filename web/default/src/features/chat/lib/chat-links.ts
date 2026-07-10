export type ChatPresetType = 'web' | 'fluent'

export type ChatPreset = {
  id: string
  name: string
  type: ChatPresetType
  url: string
}

export type ResolveChatUrlOptions = {
  template: string
  apiKey: string
  serverAddress: string
}

export function resolveChatUrl({
  template,
  apiKey,
  serverAddress,
}: ResolveChatUrlOptions): string {
  if (!template) return ''
  return template
    .replaceAll('{apiKey}', encodeURIComponent(apiKey))
    .replaceAll('{api_key}', encodeURIComponent(apiKey))
    .replaceAll('{serverAddress}', encodeURIComponent(serverAddress))
    .replaceAll('{server_address}', encodeURIComponent(serverAddress))
}
