export function sendToFluent(apiKey: string, serverAddress: string): boolean {
  if (typeof window === 'undefined') return false

  window.postMessage(
    {
      type: 'NEW_API_SEND_TO_FLUENT',
      payload: {
        apiKey,
        serverAddress,
      },
    },
    window.location.origin
  )

  return true
}
