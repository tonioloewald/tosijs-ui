import { test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import {
  checklistDirFor,
  checklistResults,
  checklistVerdict,
  formatChecklistResults,
  normalizeChecklist,
  parseAnswerBody,
  postChecklist,
  saveChecklistAnswer,
  MAX_ANSWER_BYTES,
  MAX_INFLATED_BYTES,
  type Checklist,
} from './checklist-store'

let dir: string
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'checklist-test-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const posted = (input: unknown): Checklist => {
  const list = normalizeChecklist(input, new Date('2026-11-18T00:00:00Z'))
  if ('problem' in list) throw new Error(list.problem)
  postChecklist(dir, list)
  return list
}

test('the store is outside the project, per project', () => {
  const a = checklistDirFor('/work/a', undefined, '/tmp')
  const b = checklistDirFor('/work/b', undefined, '/tmp')
  expect(a.startsWith('/tmp/tosijs-checklist-')).toBe(true)
  expect(a).not.toBe(b)
  expect(checklistDirFor('/work/a', 'scratch/list')).toBe(
    '/work/a/scratch/list'
  )
})

test('a bare list of items gets a section, ids and a posting time', () => {
  const list = normalizeChecklist(
    {
      title: ' Phone checks ',
      items: ['Menu opens', { text: 'Table scrolls', id: 'scroll' }],
    },
    new Date('2026-11-18T00:00:00Z')
  ) as Checklist
  expect(list.title).toBe('Phone checks')
  expect(list.sections).toEqual([
    {
      items: [
        { id: 's1-1', text: 'Menu opens' },
        { id: 'scroll', text: 'Table scrolls' },
      ],
    },
  ])
  expect(list.postedAt).toBe('2026-11-18T00:00:00.000Z')
  expect(list.id).toMatch(/^[a-z0-9]+$/)
})

test('a list that cannot be shown safely is refused, with the reason', () => {
  const problem = (input: unknown) =>
    (normalizeChecklist(input) as { problem?: string }).problem
  expect(problem(null)).toContain('object')
  expect(problem({ items: ['x'] })).toContain('title')
  expect(problem({ title: 't' })).toContain('items')
  expect(problem({ title: 't', items: [] })).toContain('no items')
  expect(problem({ title: 't', items: [{ text: '' }] })).toContain('text')
  expect(
    problem({ title: 't', items: [{ text: 'x', id: '../etc' }] })
  ).toContain('id')
  expect(
    problem({
      title: 't',
      items: [
        { text: 'x', id: 'a' },
        { text: 'y', id: 'a' },
      ],
    })
  ).toContain('duplicate')
  expect(
    problem({ title: 't', items: [{ text: 'x', url: 'javascript:alert(1)' }] })
  ).toContain('url')
  expect(
    problem({ title: 't', items: [{ text: 'x', url: '//evil.example/' }] })
  ).toContain('url')
  expect(problem({ title: 't', items: Array(201).fill('x') })).toContain('200')
  expect(problem({ title: 't', items: [{ text: 'x', steps: [1] }] })).toContain(
    'steps'
  )
})

test('answers are saved as they come, and the counts follow', () => {
  const list = posted({ title: 't', items: ['a', 'b', 'c'] })
  expect(checklistResults(dir)).toMatchObject({
    total: 3,
    open: 3,
    pass: 0,
    fail: 0,
  })
  const saved = saveChecklistAnswer(dir, {
    listId: list.id,
    itemId: 's1-1',
    verdict: 'pass',
    comment: '',
    page: 'https://localhost:8787/menu/',
    schematic: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  })
  expect(saved.ok).toBe(true)
  saveChecklistAnswer(dir, {
    listId: list.id,
    itemId: 's1-2',
    verdict: 'fail',
    comment: 'jumps',
  })
  const results = checklistResults(dir)
  expect(results).toMatchObject({ pass: 1, fail: 1, open: 1 })
  expect(checklistVerdict(results)).toBe('open')
  expect(checklistVerdict(results, true)).toBe('fail')
  const schematic = path.join(dir, results.answers['s1-1'].schematic!)
  expect(readFileSync(schematic, 'utf8')).toStartWith('<svg')
})

test('a comment-only update keeps the schematic', () => {
  const list = posted({ title: 't', items: ['a'] })
  saveChecklistAnswer(dir, {
    listId: list.id,
    itemId: 's1-1',
    verdict: 'fail',
    comment: '',
    schematic: '<svg></svg>',
  })
  saveChecklistAnswer(dir, {
    listId: list.id,
    itemId: 's1-1',
    verdict: 'fail',
    comment: 'later',
  })
  const answer = checklistResults(dir).answers['s1-1']
  expect(answer.comment).toBe('later')
  expect(answer.schematic).toBe(path.join('schematics', 's1-1.svg'))
})

test('a bad answer is refused, and an answer to a replaced list is a conflict', () => {
  expect(saveChecklistAnswer(dir, {})).toMatchObject({ ok: false, status: 404 })
  const first = posted({ title: 't', items: ['a'], id: 'first' })
  const answer = (body: object) =>
    saveChecklistAnswer(dir, {
      listId: first.id,
      itemId: 's1-1',
      verdict: 'pass',
      ...body,
    })
  expect(answer({ itemId: 'nope' })).toMatchObject({ status: 400 })
  expect(answer({ verdict: 'maybe' })).toMatchObject({ status: 400 })
  expect(answer({ comment: 'x'.repeat(10_001) })).toMatchObject({ status: 400 })
  expect(answer({ schematic: '<script>alert(1)</script>' })).toMatchObject({
    status: 400,
  })
  expect(answer({}).ok).toBe(true)

  posted({ title: 'second', items: ['a'], id: 'second' })
  expect(answer({})).toMatchObject({ ok: false, status: 409 })
  // Posting replaced the old answers and their schematics.
  expect(checklistResults(dir)).toMatchObject({ open: 1, answers: {} })
  expect(existsSync(path.join(dir, 'schematics'))).toBe(false)
})

const gzip = async (text: string) =>
  new Uint8Array(
    await new Response(
      new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer()
  )

test('an answer body may be gzipped, and both caps hold', async () => {
  const body = { listId: 'x', itemId: 'y' }
  expect(await parseAnswerBody(await gzip(JSON.stringify(body)), true)).toEqual(
    { body }
  )
  expect(
    await parseAnswerBody(new TextEncoder().encode(JSON.stringify(body)), false)
  ).toEqual({
    body,
  })
  expect(
    await parseAnswerBody(new Uint8Array(MAX_ANSWER_BYTES + 1), false)
  ).toMatchObject({
    status: 413,
  })
  // A bomb: tiny as sent, enormous inflated. Refused without inflating all of it.
  const bomb = await gzip(' '.repeat(MAX_INFLATED_BYTES + 1024))
  expect(bomb.byteLength).toBeLessThan(MAX_ANSWER_BYTES)
  expect(await parseAnswerBody(bomb, true)).toMatchObject({ status: 413 })
  expect(await parseAnswerBody(new Uint8Array([1, 2, 3]), true)).toMatchObject({
    status: 400,
  })
  expect(
    await parseAnswerBody(new TextEncoder().encode('{nope'), false)
  ).toMatchObject({
    status: 400,
  })
})

test('the results read as a report', () => {
  const list = posted({
    title: 'Release',
    sections: [
      { title: 'Phone', items: [{ id: 'tap', text: 'Menu opens' }, 'Scrolls'] },
    ],
  })
  saveChecklistAnswer(dir, {
    listId: list.id,
    itemId: 'tap',
    verdict: 'fail',
    comment: 'needs two taps\non Safari',
    schematic: '<svg></svg>',
  })
  const report = formatChecklistResults(checklistResults(dir), dir)
  expect(report).toContain('Release')
  expect(report).toContain('0 passed, 1 failed, 1 to check')
  expect(report).toContain('FAIL  tap  Menu opens')
  expect(report).toContain('> on Safari')
  expect(report).toContain(
    `schematic: ${path.join(dir, 'schematics', 'tap.svg')}`
  )
  expect(report).toContain('----  s1-2  Scrolls')
  expect(
    formatChecklistResults(checklistResults(path.join(dir, 'none')), dir)
  ).toBe('No checklist is posted.')
})
