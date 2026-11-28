/*
The test checklist endpoints as one web-standard handler (#4182): a `Request` in, a `Response`
out, or `null` for a path it does not own. The dev server mounts it, and so can any server that
speaks `Request`/`Response` (Bun.serve, Hono, a Next route handler, Vite through an adapter).

`admit` is required. The endpoints show the list to whoever is admitted and write what they
send to disk, so there is no default that could leave them open by accident.
*/

import {
  checklistResults,
  MAX_ANSWER_BYTES,
  parseAnswerBody,
  saveChecklistAnswer,
} from './checklist-store.js'
import { isSameOriginRequest } from './dev-auth.js'
import { readBodyCapped } from './read-body.js'

export interface ChecklistHandlerOptions {
  /** The folder `tosijs-checklist` posts to: `checklistDirFor(projectRoot)`. */
  dir: string
  /**
   * Who may read the list and answer it. `true` admits, `false` refuses with a 403, and a
   * `Response` is sent as it is (a redirect to a login page, say).
   */
  admit: (request: Request) => boolean | Response | Promise<boolean | Response>
  /** Where the endpoints live. Default `/__checklist`, which is where the panel looks. */
  endpoint?: string
}

const NO_STORE = { 'Cache-Control': 'no-store' }

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...NO_STORE },
  })

export function checklistHandler(
  options: ChecklistHandlerOptions
): (request: Request) => Promise<Response | null> {
  const { dir, admit } = options
  if (typeof admit !== 'function') {
    throw new Error('checklistHandler needs an admit function: who may answer?')
  }
  const endpoint = (options.endpoint ?? '/__checklist').replace(/\/+$/, '')
  return async (request) => {
    const path = new URL(request.url).pathname
    if (path !== endpoint && path !== `${endpoint}/answer`) return null
    /*
    Same origin, whatever admit says: the content-type rule below stops a simple cross-site
    request, but not one that CORS middleware in front of this handler lets through, and an
    `admit` that trusts a cookie would then admit any page the reader has open.
    */
    if (!isSameOriginRequest(request)) {
      return json({ error: 'cross-origin request refused' }, 403)
    }
    const admitted = await admit(request)
    if (admitted instanceof Response) return admitted
    if (admitted !== true) return json({ error: 'not admitted' }, 403)

    if (path === endpoint) {
      if (request.method !== 'GET') return json({ error: 'GET only' }, 405)
      const { list, answers, total, pass, fail, open } = checklistResults(dir)
      // Verdicts and comments only: the schematics stay on this machine, for the agent.
      const shown = Object.fromEntries(
        Object.entries(answers).map(([id, { verdict, comment }]) => [
          id,
          { verdict, comment },
        ])
      )
      return json({ list, answers: shown, total, pass, fail, open })
    }

    if (request.method !== 'POST') return json({ error: 'POST only' }, 405)
    /*
    JSON only. A cross-site form can POST `text/plain` with the reader's cookies and no
    preflight; it cannot send `application/json` without one.
    */
    const type = request.headers.get('content-type') ?? ''
    if (!/^application\/json\b/i.test(type)) {
      return json({ error: 'expected application/json' }, 415)
    }
    // Capped while reading, not after: the body was held whole before its size check (#4379).
    const bytes = await readBodyCapped(request, MAX_ANSWER_BYTES)
    if (bytes === null) {
      return json(
        { error: `answer over ${MAX_ANSWER_BYTES} bytes as sent` },
        413
      )
    }
    const parsed = await parseAnswerBody(
      bytes,
      request.headers.get('content-encoding') === 'gzip'
    )
    if ('status' in parsed) return json({ error: parsed.reason }, parsed.status)
    const saved = saveChecklistAnswer(dir, parsed.body)
    if (!saved.ok) return json({ error: saved.reason }, saved.status)
    return json({ ok: true })
  }
}
