/*
The pixel size of a PNG, WebP, JPEG or GIF, read from its header (#3562).

For `og:image:width` / `og:image:height`: without them a link unfurler has to fetch the image
before it can lay out the card, and some render the first share of a page without it. Header
bytes only, no decoder and no dependency. An image it cannot read gets no size, and the tags are
left out rather than guessed.
*/

import { openSync, readSync, closeSync } from 'fs'

export interface ImageSize {
  width: number
  height: number
}

/** Size from the image's leading bytes; undefined when the format is not one of the four. */
export function imageSizeFromBytes(b: Uint8Array): ImageSize | undefined {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const ascii = (at: number, n: number) =>
    String.fromCharCode(...b.subarray(at, at + n))
  if (b.length >= 24 && ascii(1, 3) === 'PNG' && ascii(12, 4) === 'IHDR')
    return { width: view.getUint32(16), height: view.getUint32(20) }
  if (b.length >= 10 && ascii(0, 3) === 'GIF')
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) }
  if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4)
    if (chunk === 'VP8X')
      return {
        width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      }
    if (chunk === 'VP8 ')
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      }
    if (chunk === 'VP8L') {
      const bits = view.getUint32(21, true)
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) }
    }
    return undefined
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    // Walk the segments to the first start-of-frame, which holds the size.
    let at = 2
    while (at + 9 < b.length) {
      if (b[at] !== 0xff) return undefined
      const marker = b[at + 1]
      const length = view.getUint16(at + 2)
      const isFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      if (isFrame)
        return { height: view.getUint16(at + 5), width: view.getUint16(at + 7) }
      at += 2 + length
    }
  }
  return undefined
}

/** Size of the image file at `file`, reading at most its first 64KB. */
export function imageSize(file: string): ImageSize | undefined {
  let fd: number | undefined
  try {
    fd = openSync(file, 'r')
    const buffer = new Uint8Array(65536)
    const read = readSync(fd, buffer, 0, buffer.length, 0)
    return imageSizeFromBytes(buffer.subarray(0, read))
  } catch {
    return undefined
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}
