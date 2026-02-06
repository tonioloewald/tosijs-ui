import { RemotePayload } from './types'

export const STORAGE_KEY = 'live-example-payload'

export function createRemoteKey(
  prefix: string,
  uuid: string,
  remoteId: string
): string {
  return remoteId !== '' ? `${prefix}-${remoteId}` : `${prefix}-${uuid}`
}

export function sendPayload(storageKey: string, payload: RemotePayload): void {
  localStorage.setItem(storageKey, JSON.stringify(payload))
}

export function parsePayload(data: string | null): RemotePayload | null {
  if (data === null) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function openEditorWindow(
  prefix: string,
  uuid: string,
  storageKey: string,
  remoteKey: string,
  code: { css: string; html: string; js: string; test?: string }
): void {
  const href = location.href.split('?')[0] + `?${prefix}=${uuid}`
  sendPayload(storageKey, {
    remoteKey,
    sentAt: Date.now(),
    ...code,
  })
  window.open(href)
}

export function sendCloseSignal(
  storageKey: string,
  remoteKey: string
): void {
  sendPayload(storageKey, {
    remoteKey,
    sentAt: Date.now(),
    css: '',
    html: '',
    js: '',
    close: true,
  })
}

/**
 * Manager for remote window synchronization via localStorage/StorageEvent
 */
export class RemoteSyncManager {
  private storageKey: string
  private remoteKey: string
  private lastUpdate = 0
  private interval?: ReturnType<typeof setInterval>
  private onReceive: (payload: RemotePayload) => void

  constructor(
    storageKey: string,
    remoteKey: string,
    onReceive: (payload: RemotePayload) => void
  ) {
    this.storageKey = storageKey
    this.remoteKey = remoteKey
    this.onReceive = onReceive
  }

  private handleChange = (event?: StorageEvent) => {
    if (event instanceof StorageEvent && event.key !== this.storageKey) {
      return
    }

    const payload = parsePayload(localStorage.getItem(this.storageKey))
    if (!payload) return
    if (payload.sentAt <= this.lastUpdate) return
    if (payload.remoteKey !== this.remoteKey) return

    this.lastUpdate = payload.sentAt
    this.onReceive(payload)
  }

  startListening(): void {
    addEventListener('storage', this.handleChange)
    // FIXME: Workaround for Quest 3 StorageEvent issues
    this.interval = setInterval(this.handleChange, 500)
  }

  stopListening(): void {
    removeEventListener('storage', this.handleChange)
    if (this.interval) {
      clearInterval(this.interval)
    }
  }

  send(code: { css: string; html: string; js: string; test?: string }): void {
    sendPayload(this.storageKey, {
      remoteKey: this.remoteKey,
      sentAt: Date.now(),
      ...code,
    })
  }

  sendClose(): void {
    sendCloseSignal(this.storageKey, this.remoteKey)
  }
}
