import { test, expect } from 'bun:test'
import { gzipSync } from 'zlib'
import { readFileSync } from 'fs'

/*
The README's iife size is a claim, so something fails when it stops being true (#3866;
practices/releasing.md "Limits move on purpose"). It said ~484KB for a bundle that had grown
to 506KB. Measured the build's way (zlib's default level).
*/
test('the README states the iife gzip size within 5%', () => {
  const readme = readFileSync('README.md', 'utf8')
  const claim = /\*\*Size \(([^)]+)\):\*\* ~(\d+)KB gzip/.exec(readme)
  expect(claim).not.toBe(null)
  const claimedKb = Number(claim![2])
  const actualKb = gzipSync(readFileSync('dist/iife.js')).length / 1024
  expect(Math.abs(actualKb - claimedKb) / actualKb).toBeLessThan(0.05)
})
