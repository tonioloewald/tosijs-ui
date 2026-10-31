import { test, expect } from 'bun:test'
import { imageSize, imageSizeFromBytes } from './image-size.js'

const bytes = (...parts: Array<number[] | string>) =>
  new Uint8Array(
    parts.flatMap((p) =>
      typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p
    )
  )
const be32 = (n: number) => [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255]
const be16 = (n: number) => [n >> 8, n & 255]
const le16 = (n: number) => [n & 255, n >> 8]

test('PNG: the IHDR width and height', () => {
  const png = bytes(
    [0x89],
    'PNG\r\n\x1a\n',
    be32(13),
    'IHDR',
    be32(1200),
    be32(630)
  )
  expect(imageSizeFromBytes(png)).toEqual({ width: 1200, height: 630 })
})

test('GIF: the logical screen size', () => {
  expect(imageSizeFromBytes(bytes('GIF89a', le16(64), le16(32)))).toEqual({
    width: 64,
    height: 32,
  })
})

test('JPEG: the first start-of-frame, past the segments before it', () => {
  const jpeg = bytes(
    [0xff, 0xd8],
    [0xff, 0xe0],
    be16(16),
    new Array(14).fill(0), // APP0
    [0xff, 0xc4],
    be16(4),
    [0, 0], // a DHT, which is not a frame
    [0xff, 0xc0],
    be16(17),
    [8],
    be16(630),
    be16(1200),
    new Array(10).fill(0)
  )
  expect(imageSizeFromBytes(jpeg)).toEqual({ width: 1200, height: 630 })
})

test('WebP: the card `bun run og` writes, read from the file', () => {
  expect(imageSize('demo/static/og/index.webp')).toEqual({
    width: 1200,
    height: 630,
  })
})

test('WebP extended (VP8X) and lossless (VP8L) headers', () => {
  const vp8x = bytes(
    'RIFF',
    [0, 0, 0, 0],
    'WEBPVP8X',
    [10, 0, 0, 0, 0, 0, 0, 0],
    [0xaf, 0x04, 0],
    [0x75, 0x02, 0]
  )
  expect(imageSizeFromBytes(vp8x)).toEqual({ width: 1200, height: 630 })
  const bits = (1200 - 1) | ((630 - 1) << 14)
  const vp8l = bytes(
    'RIFF',
    [0, 0, 0, 0],
    'WEBPVP8L',
    [0, 0, 0, 0],
    [0x2f],
    [bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >>> 24) & 255],
    new Array(8).fill(0)
  )
  expect(imageSizeFromBytes(vp8l)).toEqual({ width: 1200, height: 630 })
})

test('anything else, or no file, has no size rather than a guess', () => {
  expect(
    imageSizeFromBytes(bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'))
  ).toBeUndefined()
  expect(imageSize('/no/such/file.png')).toBeUndefined()
})
