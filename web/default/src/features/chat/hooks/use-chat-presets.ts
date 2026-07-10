import { useMemo } from 'react'

import type { ChatPreset } from '../lib/chat-links'

export function useChatPresets(): {
  chatPresets: ChatPreset[]
  serverAddress: string
} {
  return useMemo(
    () => ({
      chatPresets: [],
      serverAddress:
        typeof window === 'undefined' ? '' : window.location.origin,
    }),
    []
  )
}
