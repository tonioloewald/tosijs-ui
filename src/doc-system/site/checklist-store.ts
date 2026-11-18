import path from 'path'
import { tmpdir } from 'os'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'fs'

/*
The test checklist's store (#4147): one list at a time, its answers, and each answer's page
schematic.

Outside the repo, for the debug sink's reason: a file under the project root gets swept into a
build, a `git add -A` or a tarball. Keyed by project path so two checkouts never share a list.

The agent's bin writes the list straight to these files and the dev server writes the answers,
so neither needs the other running to do its half. Every write is a temp file plus a rename, so
a reader never sees half a file.
*/

/** Item and list ids: they become file names, so nothing else gets through. */
export const CHECKLIST_ID = /^[A-Za-z0-9_-]{1,64}$/

/** A request body over this (gzipped, as sent) is refused. */
export const MAX_ANSWER_BYTES = 1024 * 1024

/** A body that inflates past this is refused: the cap on what gzip may claim. */
export const MAX_INFLATED_BYTES = 8 * 1024 * 1024

const MAX_ITEMS = 200
const MAX_TEXT = 2000
const MAX_STEPS = 20
const MAX_COMMENT = 10_000

export interface ChecklistItem {
  id: string
  text: string
  /** a page to open: a site path (`/button/`) or an http(s) URL */
  url?: string
  steps?: string[]
}

export interface ChecklistSection {
  title?: string
  items: ChecklistItem[]
}

export interface Checklist {
  id: string
  title: string
  postedAt: string
  sections: ChecklistSection[]
}

export type ChecklistVerdict = 'pass' | 'fail' | null

export interface ChecklistAnswer {
  verdict: ChecklistVerdict
  comment: string
  at: string
  /** the page the answer was given on */
  page?: string
  /** the schematic's file, relative to the store */
  schematic?: string
}

export interface ChecklistAnswers {
  listId: string
  answers: Record<string, ChecklistAnswer>
}

export interface ChecklistResults {
  list: Checklist | null
  answers: Record<string, ChecklistAnswer>
  total: number
  pass: number
  fail: number
  open: number
}

/** The store's folder: `setting` if given, else a per-project folder in the temp dir. */
export function checklistDirFor(
  root: string,
  setting?: string,
  dir: string = tmpdir()
): string {
  if (setting) return path.resolve(root, setting)
  const resolved = path.resolve(root)
  // FNV-1a, as the debug sink's file name.
  let hash = 0x811c9dc5
  for (let i = 0; i < resolved.length; i++) {
    hash ^= resolved.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return path.join(dir, `tosijs-checklist-${hash.toString(16)}`)
}

const LIST_FILE = 'list.json'
const ANSWERS_FILE = 'answers.json'
const SCHEMATICS = 'schematics'

function writeAtomic(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  writeFileSync(temp, text, 'utf8')
  renameSync(temp, file)
}

function readJson<T>(file: string): T | null {
  try {
    return existsSync(file)
      ? (JSON.parse(readFileSync(file, 'utf8')) as T)
      : null
  } catch {
    return null
  }
}

const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.length <= max

/** A site path or an http(s) URL; anything else (a `javascript:` URL) is refused. */
export function safeItemUrl(url: string): boolean {
  if (url.startsWith('/') && !url.startsWith('//')) return true
  return /^https?:\/\//i.test(url)
}

/**
 * Check a posted list and fill in what may be left out: ids, the posting time, a section for
 * a bare `items` array. Returns the list, or what is wrong with it.
 */
export function normalizeChecklist(
  input: unknown,
  now: Date = new Date()
): Checklist | { problem: string } {
  if (!input || typeof input !== 'object') {
    return { problem: 'a checklist is an object with a title and items' }
  }
  const raw = input as Record<string, unknown>
  if (!isText(raw.title, MAX_TEXT)) return { problem: 'the list needs a title' }
  const rawSections = Array.isArray(raw.sections)
    ? raw.sections
    : Array.isArray(raw.items)
      ? [{ items: raw.items }]
      : null
  if (!rawSections) return { problem: 'the list needs items or sections' }
  const seen = new Set<string>()
  const sections: ChecklistSection[] = []
  let count = 0
  for (const [s, rawSection] of rawSections.entries()) {
    const section = (rawSection ?? {}) as Record<string, unknown>
    if (section.title !== undefined && !isText(section.title, MAX_TEXT)) {
      return { problem: `section ${s + 1}: title must be text` }
    }
    if (!Array.isArray(section.items) || section.items.length === 0) {
      return { problem: `section ${s + 1} has no items` }
    }
    const items: ChecklistItem[] = []
    for (const [i, rawItem] of section.items.entries()) {
      const where = `section ${s + 1}, item ${i + 1}`
      const item = (
        typeof rawItem === 'string' ? { text: rawItem } : (rawItem ?? {})
      ) as Record<string, unknown>
      if (!isText(item.text, MAX_TEXT)) {
        return { problem: `${where}: text is required (≤${MAX_TEXT} chars)` }
      }
      const id = item.id === undefined ? `s${s + 1}-${i + 1}` : item.id
      if (typeof id !== 'string' || !CHECKLIST_ID.test(id)) {
        return { problem: `${where}: id must match ${CHECKLIST_ID}` }
      }
      if (seen.has(id)) return { problem: `${where}: duplicate id ${id}` }
      seen.add(id)
      const out: ChecklistItem = { id, text: item.text.trim() }
      if (item.url !== undefined) {
        if (typeof item.url !== 'string' || !safeItemUrl(item.url)) {
          return { problem: `${where}: url must be a site path or http(s) URL` }
        }
        out.url = item.url
      }
      if (item.steps !== undefined) {
        if (
          !Array.isArray(item.steps) ||
          item.steps.length > MAX_STEPS ||
          !item.steps.every((step) => isText(step, MAX_TEXT))
        ) {
          return { problem: `${where}: steps must be up to ${MAX_STEPS} texts` }
        }
        out.steps = item.steps as string[]
      }
      items.push(out)
      if (++count > MAX_ITEMS) {
        return { problem: `more than ${MAX_ITEMS} items` }
      }
    }
    sections.push(
      section.title === undefined
        ? { items }
        : { title: (section.title as string).trim(), items }
    )
  }
  const id =
    raw.id === undefined ? now.getTime().toString(36) : (raw.id as string)
  if (typeof id !== 'string' || !CHECKLIST_ID.test(id)) {
    return { problem: `the list id must match ${CHECKLIST_ID}` }
  }
  return {
    id,
    title: (raw.title as string).trim(),
    postedAt: now.toISOString(),
    sections,
  }
}

/** Post a list. It replaces the current one, and the old answers and schematics go with it. */
export function postChecklist(dir: string, list: Checklist): void {
  rmSync(path.join(dir, SCHEMATICS), { recursive: true, force: true })
  rmSync(path.join(dir, ANSWERS_FILE), { force: true })
  writeAtomic(path.join(dir, LIST_FILE), JSON.stringify(list, null, 2) + '\n')
}

/** Remove the list and everything answered against it. */
export function clearChecklist(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

export const readChecklist = (dir: string): Checklist | null =>
  readJson<Checklist>(path.join(dir, LIST_FILE))

function readAnswers(dir: string, list: Checklist): ChecklistAnswers {
  const stored = readJson<ChecklistAnswers>(path.join(dir, ANSWERS_FILE))
  // Answers to a list that has since been replaced are not this list's answers.
  return stored && stored.listId === list.id
    ? stored
    : { listId: list.id, answers: {} }
}

const itemIds = (list: Checklist): string[] =>
  list.sections.flatMap((section) => section.items.map((item) => item.id))

/** The list, its answers, and the count of each verdict. */
export function checklistResults(dir: string): ChecklistResults {
  const list = readChecklist(dir)
  if (!list) {
    return { list: null, answers: {}, total: 0, pass: 0, fail: 0, open: 0 }
  }
  const { answers } = readAnswers(dir, list)
  const ids = itemIds(list)
  const verdicts = ids.map((id) => answers[id]?.verdict ?? null)
  const pass = verdicts.filter((v) => v === 'pass').length
  const fail = verdicts.filter((v) => v === 'fail').length
  return {
    list,
    answers,
    total: ids.length,
    pass,
    fail,
    open: ids.length - pass - fail,
  }
}

export type AnswerResult =
  | { ok: true; answer: ChecklistAnswer }
  | { ok: false; status: 400 | 404 | 409; reason: string }

/**
 * Record one item's answer. `schematic` replaces the stored one when given; a comment-only
 * update keeps it.
 */
export function saveChecklistAnswer(
  dir: string,
  body: unknown,
  now: Date = new Date()
): AnswerResult {
  const list = readChecklist(dir)
  if (!list) return { ok: false, status: 404, reason: 'no checklist is posted' }
  const raw = (body ?? {}) as Record<string, unknown>
  if (raw.listId !== list.id) {
    return {
      ok: false,
      status: 409,
      reason: 'this checklist has been replaced: reload to see the new one',
    }
  }
  const itemId = raw.itemId
  if (typeof itemId !== 'string' || !itemIds(list).includes(itemId)) {
    return { ok: false, status: 400, reason: 'no such item' }
  }
  const verdict = raw.verdict ?? null
  if (verdict !== null && verdict !== 'pass' && verdict !== 'fail') {
    return { ok: false, status: 400, reason: 'verdict is pass, fail or null' }
  }
  const comment = raw.comment ?? ''
  if (typeof comment !== 'string' || comment.length > MAX_COMMENT) {
    return {
      ok: false,
      status: 400,
      reason: `comment must be text (≤${MAX_COMMENT} chars)`,
    }
  }
  const page = raw.page
  if (page !== undefined && (typeof page !== 'string' || page.length > 2000)) {
    return { ok: false, status: 400, reason: 'page must be a URL' }
  }
  const schematic = raw.schematic
  if (
    schematic !== undefined &&
    (typeof schematic !== 'string' || !schematic.startsWith('<svg'))
  ) {
    return { ok: false, status: 400, reason: 'schematic must be an SVG' }
  }
  const stored = readAnswers(dir, list)
  const previous = stored.answers[itemId]
  const answer: ChecklistAnswer = {
    verdict,
    comment,
    at: now.toISOString(),
  }
  if (page) answer.page = page
  if (schematic !== undefined) {
    const file = path.join(SCHEMATICS, `${itemId}.svg`)
    writeAtomic(path.join(dir, file), schematic)
    answer.schematic = file
  } else if (previous?.schematic) {
    answer.schematic = previous.schematic
  }
  stored.answers[itemId] = answer
  writeAtomic(
    path.join(dir, ANSWERS_FILE),
    JSON.stringify(stored, null, 2) + '\n'
  )
  return { ok: true, answer }
}

/** Inflate gzip, stopping at `limit`: returns null past it, so a small bomb stays small. */
async function inflateCapped(
  bytes: Uint8Array,
  limit: number
): Promise<Uint8Array | null> {
  const reader = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

/**
 * Read an answer request's body: gzipped JSON when `Content-Encoding: gzip`, plain otherwise.
 * Both caps are checked before parsing, and inflation stops at its cap rather than after it.
 */
export async function parseAnswerBody(
  bytes: Uint8Array,
  gzipped: boolean
): Promise<{ body: unknown } | { status: 400 | 413; reason: string }> {
  if (bytes.byteLength > MAX_ANSWER_BYTES) {
    return {
      status: 413,
      reason: `answer over ${MAX_ANSWER_BYTES} bytes as sent`,
    }
  }
  let inflated: Uint8Array | null = bytes
  if (gzipped) {
    try {
      inflated = await inflateCapped(bytes, MAX_INFLATED_BYTES)
    } catch {
      return { status: 400, reason: 'answer is not valid gzip' }
    }
    if (!inflated) {
      return {
        status: 413,
        reason: `answer over ${MAX_INFLATED_BYTES} bytes inflated`,
      }
    }
  }
  try {
    return { body: JSON.parse(new TextDecoder().decode(inflated)) }
  } catch {
    return { status: 400, reason: 'answer is not JSON' }
  }
}

/** `pass` when every item passed, `fail` when any failed, `open` while any is unanswered. */
export function checklistVerdict(
  results: ChecklistResults,
  failFast = false
): 'pass' | 'fail' | 'open' {
  if (failFast && results.fail > 0) return 'fail'
  if (results.open > 0) return 'open'
  return results.fail > 0 ? 'fail' : 'pass'
}

/** The results as an agent reads them: one line per item, then its comment and schematic. */
export function formatChecklistResults(
  results: ChecklistResults,
  dir: string
): string {
  const { list, answers } = results
  if (!list) return 'No checklist is posted.'
  const lines = [
    `${list.title} (${list.id}): ${results.pass} passed, ${results.fail} failed, ${results.open} to check`,
  ]
  for (const section of list.sections) {
    if (section.title) lines.push('', section.title)
    for (const item of section.items) {
      const answer = answers[item.id]
      const mark =
        answer?.verdict === 'pass'
          ? 'PASS'
          : answer?.verdict === 'fail'
            ? 'FAIL'
            : '----'
      lines.push(`  ${mark}  ${item.id}  ${item.text}`)
      if (answer?.comment) {
        for (const line of answer.comment.split('\n'))
          lines.push(`        > ${line}`)
      }
      if (answer?.page) lines.push(`        page: ${answer.page}`)
      if (answer?.schematic) {
        lines.push(`        schematic: ${path.join(dir, answer.schematic)}`)
      }
    }
  }
  return lines.join('\n')
}
