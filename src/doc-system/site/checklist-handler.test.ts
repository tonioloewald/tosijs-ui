import { test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { checklistHandler } from './checklist-handler'
import {
  checklistResults,
  normalizeChecklist,
  postChecklist,
  type Checklist,
} from './checklist-store'

let dir: string
let list: Checklist
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'checklist-handler-'))
  list = normalizeChecklist({ title: 't', items: ['a'], id: 'l' }) as Checklist
  postChecklist(dir, list)
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const at = (pathname: string, init?: RequestInit) =>
  new Request(`https://example.test${pathname}`, init)

const answer = (body: object, type = 'application/json') =>
  at('/__checklist/answer', {
    method: 'POST',
    headers: { 'Content-Type': type },
    body: JSON.stringify(body),
  })

test('admit is required, so the endpoints cannot be left open by accident', () => {
  expect(() => checklistHandler({ dir } as any)).toThrow('admit')
})

test('other paths are left alone', async () => {
  const handle = checklistHandler({ dir, admit: () => true })
  expect(await handle(at('/'))).toBeNull()
  expect(await handle(at('/__checklistx'))).toBeNull()
})

test('a refused reader gets a 403, or the Response admit chose', async () => {
  expect(
    (await checklistHandler({ dir, admit: () => false })(at('/__checklist')))!
      .status
  ).toBe(403)
  const login = new Response(null, {
    status: 302,
    headers: { Location: '/login' },
  })
  expect(
    await checklistHandler({ dir, admit: async () => login })(
      at('/__checklist')
    )
  ).toBe(login)
})

test('an admitted reader reads the list and answers it; schematics stay on disk', async () => {
  const handle = checklistHandler({ dir, admit: () => true })
  const saved = await handle(
    answer({
      listId: 'l',
      itemId: 's1-1',
      verdict: 'pass',
      comment: 'ok',
      schematic: '<svg></svg>',
    })
  )
  expect(saved!.status).toBe(200)
  expect(checklistResults(dir).pass).toBe(1)
  const read = await (await handle(at('/__checklist')))!.json()
  expect(read.list.title).toBe('t')
  expect(read.answers['s1-1']).toEqual({ verdict: 'pass', comment: 'ok' })
  expect((await handle(at('/__checklist', { method: 'POST' })))!.status).toBe(
    405
  )
  expect((await handle(at('/__checklist/answer')))!.status).toBe(405)
})

test('an answer must be JSON: a cross-site form cannot send it without a preflight', async () => {
  const handle = checklistHandler({ dir, admit: () => true })
  const res = await handle(
    answer({ listId: 'l', itemId: 's1-1', verdict: 'fail' }, 'text/plain')
  )
  expect(res!.status).toBe(415)
  expect(checklistResults(dir).fail).toBe(0)
})

test('the endpoint can move', async () => {
  const handle = checklistHandler({
    dir,
    admit: () => true,
    endpoint: '/dev/checks/',
  })
  expect(await handle(at('/__checklist'))).toBeNull()
  expect((await handle(at('/dev/checks')))!.status).toBe(200)
})

test('a cross-origin request is refused before admit is asked', async () => {
  let asked = false
  const handle = checklistHandler({
    dir,
    admit: () => (asked = true),
  })
  const forged = await handle(
    at('/__checklist/answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.test',
      },
      body: JSON.stringify({ listId: 'l', itemId: 's1-1', verdict: 'pass' }),
    })
  )
  expect(forged!.status).toBe(403)
  expect(asked).toBe(false)
  expect(checklistResults(dir).pass).toBe(0)
  const sameSite = await handle(
    at('/__checklist', { headers: { 'Sec-Fetch-Site': 'cross-site' } })
  )
  expect(sameSite!.status).toBe(403)
})

test('an oversized answer is refused without being read whole (#4379)', async () => {
  const handle = checklistHandler({ dir, admit: () => true })
  let pulled = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled >= 320) return controller.close() // 20 MB in 64 KB chunks
      pulled += 1
      controller.enqueue(new Uint8Array(64 * 1024))
    },
  })
  const res = await handle(
    at('/__checklist/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      // @ts-expect-error: a streamed request body needs half-duplex
      duplex: 'half',
    })
  )
  expect(res!.status).toBe(413)
  expect(pulled).toBeLessThan(40)
})
