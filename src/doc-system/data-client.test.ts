import { test, expect, afterEach } from 'bun:test'
import {
  listData,
  readData,
  saveData,
  dataHistory,
  DataStoreError,
} from './data-client.js'

const realFetch = globalThis.fetch
let calls: { url: string; init?: RequestInit }[] = []
const answer = (body: string, status = 200, type = 'application/json') => {
  calls = []
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return new Response(body, { status, headers: { 'Content-Type': type } })
  }) as typeof fetch
}
afterEach(() => {
  globalThis.fetch = realFetch
})

test('saveData sends an object as formatted JSON, and a string as it is', async () => {
  answer('{"ok":true,"file":"static/levels/a.json","commit":null}')
  await saveData('static/levels/a.json', { spawn: [0, 2] })
  expect(calls.at(-1)!.url).toBe('/__docstore/data')
  expect(calls.at(-1)!.init?.method).toBe('POST')
  expect(JSON.parse(String(calls.at(-1)!.init?.body))).toEqual({
    file: 'static/levels/a.json',
    content: '{\n  "spawn": [\n    0,\n    2\n  ]\n}\n',
  })
  await saveData('static/levels/a.csv', 'a,b\n')
  expect(JSON.parse(String(calls.at(-1)!.init?.body)).content).toBe('a,b\n')
})

test('reads ask for the file, a version, the list or the history', async () => {
  answer('{"name":"ocean"}')
  expect(await readData('static/levels/o.json', { json: true })).toEqual({
    name: 'ocean',
  })
  await readData('static/levels/o.json', { at: 'abc123' })
  expect(calls.at(-1)!.url).toBe(
    '/__docstore/data?file=static%2Flevels%2Fo.json&at=abc123'
  )
  answer('{"files":[]}')
  await listData()
  expect(calls.at(-1)!.url).toBe('/__docstore/data?list')
  answer('{"versions":[{"commit":"a"}]}')
  expect(await dataHistory('x.json')).toEqual([{ commit: 'a' }] as any)
})

test('a refusal rejects with its status and the server’s reason', async () => {
  answer('{"error":"not inside an editableData folder"}', 403)
  const error = await saveData('elsewhere.json', {}).catch((e) => e)
  expect(error).toBeInstanceOf(DataStoreError)
  expect(error.status).toBe(403)
  expect(error.message).toContain('not inside an editableData folder')
  answer('editableData is not set', 501, 'text/plain')
  await expect(listData()).rejects.toMatchObject({ status: 501 })
})

test('a page answering for the endpoint is not data', async () => {
  // A static host's catch-all serves its index for every path, with a 200.
  answer('<!DOCTYPE html><html></html>', 200, 'text/html; charset=utf-8')
  await expect(listData()).rejects.toThrow('answered with a page')
  await expect(readData('static/levels/o.json')).rejects.toBeInstanceOf(
    DataStoreError
  )
})
