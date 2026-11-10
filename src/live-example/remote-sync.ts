import { RemotePayload } from './types.js'

export const STORAGE_KEY = 'live-example-payload'

/**
 * A random v4 UUID. `crypto.randomUUID` exists only in a secure context (https or
 * localhost); over plain http it is missing, and calling it in a class field stopped every
 * live example constructing, so the doc site never hydrated (#3764). `getRandomValues` is
 * available everywhere.
 */
export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

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
  code: { css: string; html: string; js: string; test?: string },
  // Passed through so the pop-out window can offer the full menu (Save / View
  // changes): the source↔doc key rides the URL; the pristine snapshot the payload.
  meta?: {
    sourceFile?: string | null
    ordinal?: string | null
    original?: RemotePayload['original']
  }
): void {
  const params = new URLSearchParams({ [prefix]: uuid })
  if (meta?.sourceFile && meta.ordinal != null) {
    params.set('sf', meta.sourceFile)
    params.set('ord', meta.ordinal)
  }
  const href = location.href.split('?')[0] + '?' + params.toString()
  sendPayload(storageKey, {
    remoteKey,
    sentAt: Date.now(),
    ...code,
    original: meta?.original,
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
    let data: string | null
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
