/* eslint-disable */
import { test, expect, describe, beforeEach } from 'bun:test'
import {
  createRemoteKey,
  sendPayload,
  parsePayload,
  RemoteSyncManager,
} from './remote-sync'

describe('createRemoteKey', () => {
  test('uses remoteId when set', () => {
    expect(createRemoteKey('lx', 'uuid-123', 'remote-456')).toBe(
      'lx-remote-456'
    )
  })

  test('uses uuid when remoteId is empty', () => {
    expect(createRemoteKey('lx', 'uuid-123', '')).toBe('lx-uuid-123')
  })
})

describe('parsePayload', () => {
  test('returns null for null input', () => {
    expect(parsePayload(null)).toBeNull()
  })

  test('returns null for invalid JSON', () => {
    expect(parsePayload('not json')).toBeNull()
  })

  test('parses valid JSON payload', () => {
    const payload = {
      remoteKey: 'lx-test',
      sentAt: 1234,
      css: '',
      html: '<p>hi</p>',
      js: '',
    }
    expect(parsePayload(JSON.stringify(payload))).toEqual(payload)
  })
})

describe('sendPayload', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('writes to localStorage', () => {
    sendPayload('test-key', {
      remoteKey: 'lx-test',
      sentAt: 1234,
      css: '',
      html: '',
      js: 'console.log("hi")',
    })

    const stored = localStorage.getItem('test-key')
    expect(stored).toBeDefined()
    const parsed = JSON.parse(stored!)
    expect(parsed.js).toBe('console.log("hi")')
  })
})

describe('RemoteSyncManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('double start is a no-op', () => {
    let callCount = 0
    const mgr = new RemoteSyncManager('key', 'remote', () => {
      callCount++
    })
    mgr.startListening()
    mgr.startListening() // should not double-register
    mgr.stopListening()
  })

  test('double stop is a no-op', () => {
    const mgr = new RemoteSyncManager('key', 'remote', () => {})
    mgr.stopListening() // not started — should not throw
  })

  test('send writes payload to localStorage', () => {
    const mgr = new RemoteSyncManager('test-sync', 'rk-1', () => {})
    mgr.send({ css: '', html: '<p>test</p>', js: '' })

    const stored = localStorage.getItem('test-sync')
    expect(stored).toBeDefined()
    const parsed = JSON.parse(stored!)
    expect(parsed.remoteKey).toBe('rk-1')
    expect(parsed.html).toBe('<p>test</p>')
  })

  test('sendClose writes close signal', () => {
    const mgr = new RemoteSyncManager('test-sync', 'rk-1', () => {})
    mgr.sendClose()

    const stored = localStorage.getItem('test-sync')
    expect(stored).toBeDefined()
    const parsed = JSON.parse(stored!)
    expect(parsed.close).toBe(true)
  })

  test('delivers payload via BroadcastChannel', async () => {
    let received: any = null
    const receiver = new RemoteSyncManager('bc-test', 'rk-bc', (payload) => {
      received = payload
    })
    receiver.startListening()

    const sender = new RemoteSyncManager('bc-test', 'rk-bc', () => {})
    sender.startListening()
    sender.send({ css: '', html: '<b>hi</b>', js: '' })

    // BroadcastChannel delivery is async — wait a tick
    await new Promise((r) => setTimeout(r, 50))

    expect(received).not.toBeNull()
    expect(received.html).toBe('<b>hi</b>')

    sender.stopListening()
    receiver.stopListening()
  })
})
