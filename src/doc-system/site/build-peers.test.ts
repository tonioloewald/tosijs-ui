import { test, expect } from 'bun:test'
import { readFileSync } from 'fs'
import * as path from 'path'
import { missingBuildPeers, missingBuildPeersMessage } from './build-peers.js'

test('a missing happy-dom is named with the range tosijs-ui declares (#3600)', () => {
  const pkg = JSON.parse(
    readFileSync(path.join(import.meta.dir, '../../../package.json'), 'utf8')
  )
  const missing = missingBuildPeers(import.meta.dir, () => {
    throw new Error('not found')
  })
  expect(missing).toEqual([`happy-dom@${pkg.peerDependencies['happy-dom']}`])
  expect(missingBuildPeersMessage(missing)).toContain(
    `bun add -d 'happy-dom@${pkg.peerDependencies['happy-dom']}'`
  )
})

test('nothing is missing when it resolves', () => {
  expect(missingBuildPeers(import.meta.dir)).toEqual([])
})
