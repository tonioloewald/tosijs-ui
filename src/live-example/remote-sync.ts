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
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload))
  } catch (e) {
    console.warn('live-example: failed to write to localStorage', e)
  }
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

export function sendCloseSignal(storageKey: string, remoteKey: string): void {
  sendPayload(storageKey, {
    remoteKey,
    sentAt: Date.now(),
    css: '',
    html: '',
    js: '',
    close: true,
  })
}

const hasBroadcastChannel = typeof BroadcastChannel !== 'undefined'

/**
 * Manager for remote window synchronization.
 *
 * Primary transport: BroadcastChannel (reliable, instant, works when
 * tabs close). Falls back to localStorage polling for environments
 * that lack BroadcastChannel (e.g. older Quest 3 browser builds).
 *
 * localStorage is still used for the initial payload (persisted so the
 * new window can read it on first render).
 */
export class RemoteSyncManager {
  private storageKey: string
  private remoteKey: string
  private lastUpdate = 0
  private interval?: ReturnType<typeof setInterval>
  private channel?: BroadcastChannel
  private listening = false
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

  private handlePayload = (payload: RemotePayload) => {
    if (payload.sentAt <= this.lastUpdate) return
    if (payload.remoteKey !== this.remoteKey) return

    this.lastUpdate = payload.sentAt
    this.onReceive(payload)
  }

  /** Handle incoming BroadcastChannel messages */
  private handleMessage = (event: MessageEvent) => {
    const payload = event.data as RemotePayload
    if (payload) this.handlePayload(payload)
  }

  /** Polling fallback — reads from localStorage */
  private handlePoll = () => {
    let data: string | null = null
    try {
      data = localStorage.getItem(this.storageKey)
    } catch {
      return
    }

    const payload = parsePayload(data)
    if (payload) this.handlePayload(payload)
  }

  startListening(): void {
    if (this.listening) return
    this.listening = true

    if (hasBroadcastChannel) {
      this.channel = new BroadcastChannel(this.storageKey)
      this.channel.onmessage = this.handleMessage
    }

    // Polling fallback — covers environments without BroadcastChannel
    // and catches the initial localStorage payload written before the
    // remote window's BroadcastChannel is ready.
    this.interval = setInterval(this.handlePoll, 500)
  }

  stopListening(): void {
    if (!this.listening) return
    this.listening = false

    if (this.channel) {
      this.channel.close()
      this.channel = undefined
    }

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = undefined
    }
  }

  send(code: { css: string; html: string; js: string; test?: string }): void {
    const payload: RemotePayload = {
      remoteKey: this.remoteKey,
      sentAt: Date.now(),
      ...code,
    }

    // Write to localStorage (persistence for initial load + fallback)
    sendPayload(this.storageKey, payload)

    // Broadcast for instant delivery
    if (this.channel) {
      this.channel.postMessage(payload)
    }
  }

  sendClose(): void {
    const payload: RemotePayload = {
      remoteKey: this.remoteKey,
      sentAt: Date.now(),
      css: '',
      html: '',
      js: '',
      close: true,
    }

    sendPayload(this.storageKey, payload)

    if (this.channel) {
      this.channel.postMessage(payload)
    }
  }
}
