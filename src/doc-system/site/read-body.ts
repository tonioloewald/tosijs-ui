/*
Read a request body with a bound, BEFORE holding it.

Every body-reading endpoint used to call `request.json()` / `.text()` / `.arrayBuffer()` and then
check the size, so the whole body was in memory first: a streamed 20 MB POST to the checklist
endpoint was read in full before its 1 MB refusal, and the only real bound anywhere was Bun's
default `maxRequestBodySize` of 128 MB (#4379). This refuses on `Content-Length` when the client
declares one, and otherwise counts while streaming and cancels the stream at the cap.

Web-standard (Request, ReadableStream), so `checklistHandler` stays portable.
*/

/** The body's bytes, or `null` once it is over `maxBytes`. */
export async function readBodyCapped(
  request: Request,
  maxBytes: number
): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > maxBytes) return null
  if (!request.body) return new Uint8Array(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.byteLength
  }
  return out
}

/** The body as UTF-8 text, or `null` once it is over `maxBytes`. */
export async function readTextCapped(
  request: Request,
  maxBytes: number
): Promise<string | null> {
  const bytes = await readBodyCapped(request, maxBytes)
  return bytes === null ? null : new TextDecoder().decode(bytes)
}

/**
 * The body parsed as JSON: `{ value }`, `{ tooLarge: true }`, or `{ invalid: true }` when it is
 * not JSON.
 */
export async function readJsonCapped(
  request: Request,
  maxBytes: number
): Promise<{ value: unknown } | { tooLarge: true } | { invalid: true }> {
  const text = await readTextCapped(request, maxBytes)
  if (text === null) return { tooLarge: true }
  try {
    return { value: JSON.parse(text) }
  } catch {
    return { invalid: true }
  }
}
