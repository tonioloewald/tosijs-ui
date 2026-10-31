import { test, expect } from 'bun:test'
import { missingBuildPeers, missingBuildPeersMessage } from './build-peers.js'

test('a missing happy-dom is named with the range tosijs-ui declares (#3600)', () => {
  const pkg = require('../../../package.json')
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
