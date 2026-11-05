/*
Record the shipped-size baseline, `dist-sizes.json`, at a release (#3866).

The build prints each bundle's gzip size against this file, so a release that grows says so on
every build. It records the version it was taken at: a baseline nobody refreshes turns the
printed delta from release-over-release into cumulative-since-whenever, and release-doctor
warns when it is older than the last tag. Run it as part of cutting the tag, after the build.

Measured the build's way (zlib's default level), not with the `gzip` CLI: the two differ by
about 1.6%, and the delta must compare like with like.
*/

import { gzipSync } from 'zlib'
import { readFileSync, writeFileSync } from 'fs'

const FILES = ['iife.js']
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const files: Record<string, number> = {}
for (const name of FILES)
  files[name] = gzipSync(readFileSync(`dist/${name}`)).length
writeFileSync(
  'dist-sizes.json',
  JSON.stringify({ version, gzip: files }, null, 2) + '\n'
)
console.log(
  `dist-sizes.json: ${version}, ${FILES.map(
    (name) => `${name} ${(files[name] / 1024).toFixed(1)}kb gzip`
  ).join(', ')}`
)
