// Main exports
export {
  LiveExample,
  liveExample,
  enableTests,
  disableTests,
  pageTestCount,
  testManager,
} from './component.js'

// Types
export type {
  ExampleContext,
  ExampleParts,
  RemotePayload,
  TransformFn,
} from './types.js'

// Test harness (for doc-browser integration)
export { runTests, createTestContext, expect } from './test-harness.js'
export type { TestResult, TestResults, TestContext } from './test-harness.js'

// Utilities (for advanced usage)
export {
  insertExamples,
  setExamplePolicy,
  setExampleTabs,
  setExampleView,
} from './insert-examples.js'
export type { ExamplePolicy, SiteExamplePolicy } from './insert-examples.js'
export type { ExampleTab, ExampleView } from '../doc-system/example-policy.js'

// What a host page plugs into every example (#246): sanitize, hydrate, and a chat panel
export { setExampleHooks } from './example-hooks.js'
export type {
  ExampleHooks,
  ExampleChatSession,
  ExampleSource,
} from './example-hooks.js'
export { loadTransform, rewriteImports, executeCode } from './code-transform.js'
export { executeInline, executeInIframe } from './execution.js'
export { RemoteSyncManager, STORAGE_KEY } from './remote-sync.js'

// The example console: an example's logs shown under its preview (on by default)
export { setExampleConsole } from './example-console.js'

// Dialects (#184): add a language examples can be written in, or replace a built-in one
export { registerDialect, getDialect } from './dialects.js'
export type {
  DialectSpec,
  DialectOptions,
  DialectRunContext,
} from './dialects.js'
